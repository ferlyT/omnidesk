process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
  WAMessage,
  downloadMediaMessage
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { getDbPool } from '../../../database/connection.js';
import { SocketHub } from '../../../realtime/socket.hub.js';

export interface InboundHandlerCallback {
  (data: {
    channelType: 'WHATSAPP';
    channelId: number;
    senderId: string; // phone number e.g. 628123456789
    senderName: string;
    content: string;
    messageType?: 'TEXT' | 'IMAGE' | 'DOCUMENT';
    mediaUrl?: string;
    externalMessageId: string;
    timestamp: Date;
  }): Promise<void>;
}

export class WhatsAppGatewayService {
  private static instance: WhatsAppGatewayService;
  private sock: WASocket | null = null;
  private qrCodeDataUrl: string | null = null;
  private status: 'DISCONNECTED' | 'QR_READY' | 'CONNECTED' = 'DISCONNECTED';
  private sessionDir: string;
  private inboundCallback: InboundHandlerCallback | null = null;
  private channelDbId: number = 1;
  private outboundQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  private lidPhoneMap: Map<string, string> = new Map();

  private constructor() {
    this.sessionDir = process.env.WA_SESSION_DIR || path.join(process.cwd(), 'sessions', 'whatsapp');
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
    this.loadAllLidMappings();
  }

  public loadAllLidMappings(): void {
    try {
      if (!fs.existsSync(this.sessionDir)) return;
      const files = fs.readdirSync(this.sessionDir);
      for (const file of files) {
        if (file.startsWith('lid-mapping-') && file.endsWith('_reverse.json')) {
          const lidId = file.replace('lid-mapping-', '').replace('_reverse.json', '');
          try {
            const raw = fs.readFileSync(path.join(this.sessionDir, file), 'utf-8');
            const phone = JSON.parse(raw);
            if (phone && lidId) {
              const cleanPhone = phone.toString().replace(/\D/g, '');
              this.lidPhoneMap.set(lidId, cleanPhone);
            }
          } catch (e) {}
        }
      }
      console.log(`[WhatsApp Gateway] Loaded ${this.lidPhoneMap.size} LID phone number mappings.`);
    } catch (err) {
      console.error('[WhatsApp Gateway] Error loading LID mappings:', err);
    }
  }

  public saveLidMapping(lidId: string, phone: string): void {
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      this.lidPhoneMap.set(lidId, cleanPhone);
      const revFile = path.join(this.sessionDir, `lid-mapping-${lidId}_reverse.json`);
      fs.writeFileSync(revFile, JSON.stringify(cleanPhone));
      const fwdFile = path.join(this.sessionDir, `lid-mapping-${cleanPhone}.json`);
      fs.writeFileSync(fwdFile, JSON.stringify(lidId));
    } catch (e) {}
  }

  public static getInstance(): WhatsAppGatewayService {
    if (!WhatsAppGatewayService.instance) {
      WhatsAppGatewayService.instance = new WhatsAppGatewayService();
    }
    return WhatsAppGatewayService.instance;
  }

  public setInboundHandler(callback: InboundHandlerCallback): void {
    this.inboundCallback = callback;
  }

  public getStatus() {
    return {
      status: this.status,
      qrCode: this.qrCodeDataUrl
    };
  }

  public async initialize(): Promise<void> {
    try {
      // Dapatkan channel ID dari DB
      const pool = await getDbPool();
      const res = await pool.request()
        .input('type', 'WHATSAPP')
        .query('SELECT id, status FROM Channels WHERE channel_type = @type');
      if (res.recordset.length > 0) {
        this.channelDbId = res.recordset[0].id;
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        syncFullHistory: false
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr);
            this.status = 'QR_READY';
            await this.updateChannelDbStatus('QR_READY');
            console.log('[WhatsApp Gateway] QR Code is ready for scanning');
            SocketHub.getInstance().emitChannelStatus({
              channel: 'WHATSAPP',
              status: 'QR_READY',
              qrCode: this.qrCodeDataUrl
            });
          } catch (err) {
            console.error('[WhatsApp Gateway] Error generating QR code:', err);
          }
        }

        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log('[WhatsApp Gateway] Connection closed. Reconnecting:', shouldReconnect);
          this.status = 'DISCONNECTED';
          this.qrCodeDataUrl = null;
          await this.updateChannelDbStatus('DISCONNECTED');
          SocketHub.getInstance().emitChannelStatus({
            channel: 'WHATSAPP',
            status: 'DISCONNECTED',
            qrCode: null
          });

          if (shouldReconnect) {
            setTimeout(() => this.initialize(), 5000);
          }
        } else if (connection === 'open') {
          console.log('[WhatsApp Gateway] Connection established successfully!');
          this.status = 'CONNECTED';
          this.qrCodeDataUrl = null;
          await this.updateChannelDbStatus('CONNECTED');
          SocketHub.getInstance().emitChannelStatus({
            channel: 'WHATSAPP',
            status: 'CONNECTED',
            qrCode: null
          });
        }
      });

      this.sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;

        for (const msg of m.messages) {
          if (!msg.key.fromMe && msg.message && this.inboundCallback) {
            await this.handleIncomingMessage(msg);
          }
        }
      });
    } catch (err) {
      console.error('[WhatsApp Gateway] Initialization error:', err);
      this.status = 'DISCONNECTED';
      await this.updateChannelDbStatus('DISCONNECTED');
    }
  }

  /**
   * Mengubah JID (termasuk @lid) menjadi nomor telepon asli jika mapping tersedia di auth session
   */
  public resolvePhoneNumber(jid: string, msgKey?: any): { phone: string; isLid: boolean; lidId?: string } {
    // 1. Cek langsung remoteJidAlt / participantAlt jika dilampirkan oleh Baileys
    if (msgKey) {
      const alt = msgKey.remoteJidAlt || msgKey.participantAlt;
      if (alt && alt.endsWith('@s.whatsapp.net')) {
        const phone = alt.replace('@s.whatsapp.net', '').split(':')[0].replace(/\D/g, '');
        if (phone && phone.length >= 8) {
          if (jid.endsWith('@lid')) {
            const lidId = jid.replace('@lid', '').split(':')[0];
            this.saveLidMapping(lidId, phone);
          }
          return { phone, isLid: jid.endsWith('@lid'), lidId: jid.replace(/@.*$/, '') };
        }
      }
    }

    if (jid.endsWith('@s.whatsapp.net')) {
      const phone = jid.replace('@s.whatsapp.net', '').split(':')[0].replace(/\D/g, '');
      return { phone, isLid: false };
    }

    if (jid.endsWith('@lid')) {
      const lidId = jid.replace('@lid', '').split(':')[0];

      // Cek in-memory cache
      if (this.lidPhoneMap.has(lidId)) {
        return { phone: this.lidPhoneMap.get(lidId)!, isLid: true, lidId };
      }

      // Cek reverse mapping file di disk
      const reverseMappingFile = path.join(this.sessionDir, `lid-mapping-${lidId}_reverse.json`);
      if (fs.existsSync(reverseMappingFile)) {
        try {
          const raw = fs.readFileSync(reverseMappingFile, 'utf-8');
          const mappedPhone = JSON.parse(raw);
          if (mappedPhone) {
            const cleanPhone = mappedPhone.toString().replace(/\D/g, '');
            this.lidPhoneMap.set(lidId, cleanPhone);
            return { phone: cleanPhone, isLid: true, lidId };
          }
        } catch (e) {}
      }

      return { phone: lidId, isLid: true, lidId };
    }

    return { phone: jid.replace(/@.*$/, '').replace(/\D/g, ''), isLid: false };
  }

  /**
   * Helper mendapatkan JID tujuan yang tepat untuk pengiriman outbound
   */
  private getTargetJid(recipient: string): string {
    const clean = recipient.trim();
    if (clean.endsWith('@lid') || clean.endsWith('@s.whatsapp.net')) {
      return clean;
    }

    // Cek apakah recipient adalah sebuah LID numerik (misal 85036225298677)
    const reverseMappingFile = path.join(this.sessionDir, `lid-mapping-${clean}_reverse.json`);
    if (fs.existsSync(reverseMappingFile)) {
      try {
        const raw = fs.readFileSync(reverseMappingFile, 'utf-8');
        const mappedPhone = JSON.parse(raw);
        if (mappedPhone) {
          return `${mappedPhone.toString().replace(/\D/g, '')}@s.whatsapp.net`;
        }
      } catch (e) {}
      return `${clean}@lid`;
    }

    // Default ke nomor telepon WhatsApp biasa
    return `${clean.replace(/\D/g, '')}@s.whatsapp.net`;
  }

  private async handleIncomingMessage(msg: WAMessage): Promise<void> {
    try {
      const jid = msg.key.remoteJid;
      if (!jid || jid.endsWith('@g.us') || jid.includes('status@broadcast')) {
        // Abaikan group chat dan status broadcast untuk omnichannel CS 1-on-1
        return;
      }

      const { phone: senderPhone } = this.resolvePhoneNumber(jid, msg.key);
      const senderName = (msg.pushName && !msg.pushName.includes('@lid')) ? msg.pushName : senderPhone;

      // 1. Cek apakah ada lampiran Gambar atau Dokumen
      const isImage = !!msg.message?.imageMessage;
      const isDocument = !!msg.message?.documentMessage;

      if (isImage || isDocument) {
        try {
          const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            {
              logger: this.sock?.logger as any,
              reuploadRequest: this.sock?.updateMediaMessage as any
            }
          );

          const subfolder = isImage ? 'images' : 'documents';
          const ext = isImage
            ? '.jpg'
            : (path.extname(msg.message?.documentMessage?.fileName || '.pdf') || '.dat');
          const filename = `wa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}${ext}`;
          const targetDir = path.join(process.cwd(), 'public', 'uploads', subfolder);
          if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
          fs.writeFileSync(path.join(targetDir, filename), buffer);

          const mediaUrl = `/uploads/${subfolder}/${filename}`;
          const caption = isImage
            ? msg.message?.imageMessage?.caption
            : (msg.message?.documentMessage?.caption || msg.message?.documentMessage?.fileName);

          if (this.inboundCallback) {
            await this.inboundCallback({
              channelType: 'WHATSAPP',
              channelId: this.channelDbId,
              senderId: senderPhone,
              senderName,
              content: caption || (isImage ? '[Gambar WhatsApp]' : `[Dokumen: ${msg.message?.documentMessage?.fileName || 'File'}]`),
              messageType: isImage ? 'IMAGE' : 'DOCUMENT',
              mediaUrl,
              externalMessageId: msg.key.id || `wa_${Date.now()}`,
              timestamp: new Date((msg.messageTimestamp as number) * 1000 || Date.now())
            });
          }
          return;
        } catch (mediaErr) {
          console.error('[WhatsApp Gateway] Error downloading incoming media:', mediaErr);
        }
      }

      // 2. Pesan Teks Standar
      const content = msg.message?.conversation || 
        msg.message?.extendedTextMessage?.text || 
        '[Pesan Tanpa Teks]';

      if (this.inboundCallback) {
        await this.inboundCallback({
          channelType: 'WHATSAPP',
          channelId: this.channelDbId,
          senderId: senderPhone,
          senderName,
          content,
          messageType: 'TEXT',
          externalMessageId: msg.key.id || `wa_${Date.now()}`,
          timestamp: new Date((msg.messageTimestamp as number) * 1000 || Date.now())
        });
      }
    } catch (err) {
      console.error('[WhatsApp Gateway] Inbound processing error:', err);
    }
  }

  /**
   * Kirim pesan media (Gambar / Dokumen) ke WhatsApp
   */
  public async sendMediaMessage(
    phone: string,
    filePath: string,
    messageType: 'IMAGE' | 'DOCUMENT',
    caption?: string,
    fileName?: string,
    mimeType?: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.outboundQueue.push(async () => {
        try {
          if (!this.sock || this.status !== 'CONNECTED') {
            console.warn('[WhatsApp Gateway] Socket not connected. Media message queued or failed.');
            resolve(false);
            return;
          }

          const jid = this.getTargetJid(phone);
          const fileBuffer = fs.readFileSync(filePath);

          await this.sock.sendPresenceUpdate('composing', jid);
          await new Promise((r) => setTimeout(r, 1200));

          if (messageType === 'IMAGE') {
            await this.sock.sendMessage(jid, {
              image: fileBuffer,
              caption: caption || undefined
            });
          } else {
            await this.sock.sendMessage(jid, {
              document: fileBuffer,
              mimetype: mimeType || 'application/octet-stream',
              fileName: fileName || path.basename(filePath),
              caption: caption || undefined
            });
          }

          await this.sock.sendPresenceUpdate('paused', jid);
          resolve(true);
        } catch (err) {
          console.error('[WhatsApp Gateway] Error sending media message:', err);
          resolve(false);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Enqueue outbound message with anti-ban humanized simulation
   */
  public async sendTextMessage(phone: string, formattedText: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.outboundQueue.push(async () => {
        try {
          if (!this.sock || this.status !== 'CONNECTED') {
            console.warn('[WhatsApp Gateway] Socket not connected. Message queued or failed.');
            resolve(false);
            return;
          }

          const jid = this.getTargetJid(phone);

          // 1. Hitung durasi simulasi mengetik manusia (1.2 detik s.d 4 detik)
          const typingDurationMs = Math.min(4000, Math.max(1200, formattedText.length * 35));

          // 2. Kirim indikator presence composing (sedang mengetik)
          await this.sock.sendPresenceUpdate('composing', jid);
          await new Promise((r) => setTimeout(r, typingDurationMs));

          // 3. Kirim pesan sesungguhnya
          await this.sock.sendMessage(jid, { text: formattedText });

          // 4. Ubah status presence kembali paused
          await this.sock.sendPresenceUpdate('paused', jid);

          // 5. Jitter delay acak antar pesan (500ms - 2000ms) untuk mencegah burst detection
          const jitter = Math.floor(Math.random() * 1500) + 500;
          await new Promise((r) => setTimeout(r, jitter));

          resolve(true);
        } catch (err) {
          console.error('[WhatsApp Gateway] Error sending message:', err);
          resolve(false);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.outboundQueue.length > 0) {
      const task = this.outboundQueue.shift();
      if (task) {
        try {
          await task();
        } catch (err) {
          console.error('[WhatsApp Gateway] Queue task error:', err);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  private async updateChannelDbStatus(status: string): Promise<void> {
    try {
      const pool = await getDbPool();
      await pool.request()
        .input('status', status)
        .input('id', this.channelDbId)
        .query(`
          UPDATE Channels
          SET status = @status, last_connected_at = SYSDATETIMEOFFSET()
          WHERE id = @id
        `);
    } catch (err) {
      console.error('[WhatsApp Gateway] Failed to update status in DB:', err);
    }
  }
}
