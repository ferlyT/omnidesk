import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage, NewMessageEvent } from 'telegram/events/index.js';
import fs from 'fs';
import path from 'path';
import { getDbPool } from '../../../database/connection.js';
import { SocketHub } from '../../../realtime/socket.hub.js';

export interface TelegramInboundCallback {
  (data: {
    channelType: 'TELEGRAM';
    channelId: number;
    senderId: string; // telegram user ID
    senderName: string;
    content: string;
    messageType?: 'TEXT' | 'IMAGE' | 'DOCUMENT';
    mediaUrl?: string;
    externalMessageId: string;
    timestamp: Date;
  }): Promise<void>;
}

export class TelegramGatewayService {
  private static instance: TelegramGatewayService;
  private client: TelegramClient | null = null;
  private sessionString: string = '';
  private status: 'DISCONNECTED' | 'WAITING_OTP' | 'CONNECTED' = 'DISCONNECTED';
  private apiId: number;
  private apiHash: string;
  private channelDbId: number = 2;
  private inboundCallback: TelegramInboundCallback | null = null;
  private phoneCodeHash: string | null = null;
  private pendingPhoneNumber: string | null = null;
  private isWaiting2FA: boolean = false;

  private constructor() {
    this.apiId = parseInt(process.env.TG_API_ID || '2040', 10);
    this.apiHash = process.env.TG_API_HASH || 'b18441a1ff607e10a989891a5462e627';
  }

  public static getInstance(): TelegramGatewayService {
    if (!TelegramGatewayService.instance) {
      TelegramGatewayService.instance = new TelegramGatewayService();
    }
    return TelegramGatewayService.instance;
  }

  public setInboundHandler(callback: TelegramInboundCallback): void {
    this.inboundCallback = callback;
  }

  public getStatus() {
    return {
      status: this.status,
      pendingPhoneNumber: this.pendingPhoneNumber,
      isWaiting2FA: this.isWaiting2FA
    };
  }

  public async initialize(): Promise<void> {
    try {
      const pool = await getDbPool();
      const res = await pool.request()
        .input('type', 'TELEGRAM')
        .query('SELECT id, status, session_data FROM Channels WHERE channel_type = @type');

      if (res.recordset.length > 0) {
        this.channelDbId = res.recordset[0].id;
        this.sessionString = res.recordset[0].session_data || '';
      }

      if (this.sessionString) {
        await this.connectWithExistingSession(this.sessionString);
      } else {
        this.status = 'DISCONNECTED';
      }
    } catch (err) {
      console.error('[Telegram Gateway] Initialization error:', err);
      this.status = 'DISCONNECTED';
    }
  }

  private async connectWithExistingSession(sessionStr: string): Promise<void> {
    try {
      const stringSession = new StringSession(sessionStr);
      this.client = new TelegramClient(stringSession, this.apiId, this.apiHash, {
        connectionRetries: 5
      });

      await this.client.connect();
      const isAuth = await this.client.checkAuthorization();

      if (isAuth) {
        this.status = 'CONNECTED';
        await this.updateChannelDbStatus('CONNECTED', sessionStr);
        this.attachEventListeners();
        console.log('[Telegram Gateway] Client connected successfully with stored session');
      } else {
        this.status = 'DISCONNECTED';
        await this.updateChannelDbStatus('DISCONNECTED');
      }
    } catch (err) {
      console.error('[Telegram Gateway] Session connect error:', err);
      this.status = 'DISCONNECTED';
    }
  }

  /**
   * Langkah 1 Login: Minta Kode OTP ke nomor Telegram
   */
  public async requestLoginCode(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      this.pendingPhoneNumber = phoneNumber;
      const stringSession = new StringSession('');
      this.client = new TelegramClient(stringSession, this.apiId, this.apiHash, {
        connectionRetries: 3
      });

      await this.client.connect();

      const sendCodeResult = await this.client.sendCode(
        {
          apiId: this.apiId,
          apiHash: this.apiHash
        },
        phoneNumber
      );

      this.phoneCodeHash = sendCodeResult.phoneCodeHash;
      this.status = 'WAITING_OTP';
      await this.updateChannelDbStatus('WAITING_OTP');

      return {
        success: true,
        message: 'Kode verifikasi telah dikirimkan ke aplikasi Telegram Anda'
      };
    } catch (err: any) {
      console.error('[Telegram Gateway] Send code error:', err);
      return { success: false, message: err.message || 'Gagal mengirim kode verifikasi' };
    }
  }

  /**
   * Langkah 2 Login: Verifikasi Kode OTP & Simpan Sesi
   */
  public async submitLoginCode(code?: string, password?: string): Promise<{ success: boolean; message: string; requires2FA?: boolean }> {
    try {
      if (!this.client || !this.pendingPhoneNumber || !this.phoneCodeHash) {
        throw new Error('Sesi login tidak ditemukan. Silakan minta kode verifikasi kembali');
      }

      if (this.isWaiting2FA) {
        if (!password) {
          return {
            success: false,
            requires2FA: true,
            message: 'Silakan masukkan password Two-Step Verification (2FA) Anda'
          };
        }
        await this.client.signInWithPassword(
          { apiId: this.apiId, apiHash: this.apiHash },
          { password: async () => password }
        );
        this.isWaiting2FA = false;
      } else {
        if (!code) {
          throw new Error('Kode OTP verifikasi wajib diisi');
        }

        try {
          await this.client.invoke(
            new Api.auth.SignIn({
              phoneNumber: this.pendingPhoneNumber,
              phoneCodeHash: this.phoneCodeHash,
              phoneCode: code.trim()
            })
          );
        } catch (err: any) {
          if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
            this.isWaiting2FA = true;
            if (!password) {
              return {
                success: false,
                requires2FA: true,
                message: 'Akun Anda mengaktifkan Two-Step Verification (2FA). Silakan masukkan password 2FA Anda lalu coba lagi.'
              };
            }
            await this.client.signInWithPassword(
              { apiId: this.apiId, apiHash: this.apiHash },
              { password: async () => password }
            );
            this.isWaiting2FA = false;
          } else {
            throw err;
          }
        }
      }

      const sessionStr = (this.client.session as StringSession).save();
      this.status = 'CONNECTED';
      this.isWaiting2FA = false;
      await this.updateChannelDbStatus('CONNECTED', sessionStr);
      this.attachEventListeners();

      return { success: true, message: 'Berhasil login ke akun Telegram' };
    } catch (err: any) {
      console.error('[Telegram Gateway] Sign in error:', err);
      return { success: false, message: err.message || 'Kode verifikasi salah' };
    }
  }

  private attachEventListeners(): void {
    if (!this.client) return;

    this.client.addEventHandler(async (event: NewMessageEvent) => {
      try {
        const message = event.message;
        // Hanya proses private message dari user luar, bukan chat dari diri sendiri atau channel grup
        if (message.isPrivate && !message.out && this.inboundCallback) {
          const sender = await message.getSender() as Api.User;
          if (sender) {
            const senderId = sender.id.toString();
            const senderName = [sender.firstName, sender.lastName].filter(Boolean).join(' ') || sender.username || senderId;

            // 1. Cek jika pesan memiliki lampiran media (Foto / Dokumen)
            if (message.media) {
              try {
                const buffer = await this.client!.downloadMedia(message, {});
                if (buffer && buffer instanceof Buffer) {
                  const isPhoto = message.media.className === 'MessageMediaPhoto';
                  const subfolder = isPhoto ? 'images' : 'documents';
                  let ext = isPhoto ? '.jpg' : '.pdf';
                  let originalName = 'telegram_file';
                  if ((message as any).file && (message as any).file.name) {
                    originalName = (message as any).file.name;
                    ext = path.extname(originalName) || ext;
                  }
                  const filename = `tg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}${ext}`;
                  const targetDir = path.join(process.cwd(), 'public', 'uploads', subfolder);
                  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                  fs.writeFileSync(path.join(targetDir, filename), buffer);

                  const mediaUrl = `/uploads/${subfolder}/${filename}`;
                  const content = message.text || (isPhoto ? '[Gambar Telegram]' : `[Dokumen: ${originalName}]`);

                  await this.inboundCallback({
                    channelType: 'TELEGRAM',
                    channelId: this.channelDbId,
                    senderId,
                    senderName,
                    content,
                    messageType: isPhoto ? 'IMAGE' : 'DOCUMENT',
                    mediaUrl,
                    externalMessageId: message.id.toString(),
                    timestamp: new Date(message.date * 1000)
                  });
                  return;
                }
              } catch (mediaErr) {
                console.error('[Telegram Gateway] Error downloading media:', mediaErr);
              }
            }

            // 2. Pesan teks biasa
            const content = message.text || '[Pesan Telegram]';

            await this.inboundCallback({
              channelType: 'TELEGRAM',
              channelId: this.channelDbId,
              senderId,
              senderName,
              content,
              messageType: 'TEXT',
              externalMessageId: message.id.toString(),
              timestamp: new Date(message.date * 1000)
            });
          }
        }
      } catch (err) {
        console.error('[Telegram Gateway] Incoming message event error:', err);
      }
    }, new NewMessage({ incoming: true }));
  }

  /**
   * Kirim pesan media (Gambar / Dokumen) ke akun Telegram pengguna
   */
  public async sendMediaMessage(
    telegramUserId: string,
    filePath: string,
    messageType: 'IMAGE' | 'DOCUMENT',
    caption?: string,
    fileName?: string
  ): Promise<boolean> {
    try {
      if (!this.client || this.status !== 'CONNECTED') {
        console.warn('[Telegram Gateway] Client not connected. Cannot send media.');
        return false;
      }

      const entity = await this.client.getEntity(telegramUserId);
      await this.client.sendFile(entity, {
        file: filePath,
        caption: caption || undefined,
        forceDocument: messageType === 'DOCUMENT'
      });
      return true;
    } catch (err) {
      console.error('[Telegram Gateway] Error sending media message:', err);
      return false;
    }
  }

  /**
   * Outbound message dispatch with Anti-Flood & typing emulation
   */
  public async sendTextMessage(telegramUserId: string, formattedText: string): Promise<boolean> {
    try {
      if (!this.client || this.status !== 'CONNECTED') {
        console.warn('[Telegram Gateway] Client not connected.');
        return false;
      }

      const entity = await this.client.getEntity(telegramUserId);

      // 1. Emulate typing action
      try {
        await this.client.invoke(
          new Api.messages.SetTyping({
            peer: entity,
            action: new Api.SendMessageTypingAction()
          })
        );
        const typingDuration = Math.min(3000, Math.max(1000, formattedText.length * 30));
        await new Promise((r) => setTimeout(r, typingDuration));
      } catch (err) {
        // Typing action failure is non-fatal
      }

      // 2. Send message with FloodWait recovery
      await this.sendMessageWithFloodRecovery(entity, formattedText);
      return true;
    } catch (err) {
      console.error('[Telegram Gateway] Send message error:', err);
      return false;
    }
  }

  private async sendMessageWithFloodRecovery(entity: any, text: string, retryCount = 0): Promise<void> {
    try {
      await this.client!.sendMessage(entity, { message: text });
    } catch (err: any) {
      if (err.errorMessage && err.errorMessage.startsWith('FLOOD_WAIT_') && retryCount < 3) {
        const seconds = parseInt(err.errorMessage.replace('FLOOD_WAIT_', ''), 10) || 5;
        console.warn(`[Telegram Gateway] Rate limit reached. Backing off for ${seconds} seconds...`);
        await new Promise((r) => setTimeout(r, seconds * 1000));
        return this.sendMessageWithFloodRecovery(entity, text, retryCount + 1);
      }
      throw err;
    }
  }

  private async updateChannelDbStatus(status: string, sessionData?: string): Promise<void> {
    try {
      const pool = await getDbPool();
      const req = pool.request()
        .input('status', status)
        .input('id', this.channelDbId);

      let query = `
        UPDATE Channels
        SET status = @status, last_connected_at = SYSDATETIMEOFFSET()
      `;

      if (sessionData !== undefined) {
        req.input('session_data', sessionData);
        query += `, session_data = @session_data`;
      }

      query += ` WHERE id = @id`;
      await req.query(query);

      try {
        SocketHub.getInstance().emitChannelStatus({
          channel: 'TELEGRAM',
          status
        });
      } catch (e) {}
    } catch (err) {
      console.error('[Telegram Gateway] Failed to update status in DB:', err);
    }
  }
}
