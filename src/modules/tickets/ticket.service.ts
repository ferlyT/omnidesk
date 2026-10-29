import { getDbPool } from '../../database/connection.js';
import { PrefixInjectorService } from '../messages/prefix-injector.service.js';
import { WhatsAppGatewayService } from '../channels/whatsapp/whatsapp.service.js';
import { TelegramGatewayService } from '../channels/telegram/telegram.service.js';
import { SocketHub } from '../../realtime/socket.hub.js';
import { AuthenticatedUser } from '../auth/auth.middleware.js';

export class TicketService {
  /**
   * Handle incoming message from WhatsApp or Telegram
   */
  static async handleInboundMessage(data: {
    channelType: 'WHATSAPP' | 'TELEGRAM';
    channelId: number;
    senderId: string;
    senderName: string;
    content: string;
    externalMessageId: string;
    timestamp: Date;
    messageType?: 'TEXT' | 'IMAGE' | 'DOCUMENT';
    mediaUrl?: string;
  }): Promise<void> {
    const pool = await getDbPool();

    // 1. Dapatkan atau buat Customer
    let customerId: number;
    const phoneCol = data.channelType === 'WHATSAPP' ? data.senderId : null;
    const tgCol = data.channelType === 'TELEGRAM' ? data.senderId : null;

    let customerRes;
    if (data.channelType === 'WHATSAPP') {
      customerRes = await pool.request()
        .input('phone', phoneCol)
        .query('SELECT id, full_name FROM Customers WHERE phone_number = @phone');
    } else {
      customerRes = await pool.request()
        .input('tgId', tgCol)
        .query('SELECT id, full_name FROM Customers WHERE telegram_user_id = @tgId');
    }

    if (customerRes.recordset.length > 0) {
      customerId = customerRes.recordset[0].id;
    } else {
      const insertCustomer = await pool.request()
        .input('phone', phoneCol)
        .input('tgId', tgCol)
        .input('name', data.senderName || 'Pelanggan')
        .input('source', data.channelType)
        .query(`
          INSERT INTO Customers (phone_number, telegram_user_id, full_name, channel_source)
          OUTPUT INSERTED.id
          VALUES (@phone, @tgId, @name, @source)
        `);
      customerId = insertCustomer.recordset[0].id;
    }

    // 2. Cari Tiket Aktif untuk Customer ini
    const activeTicketRes = await pool.request()
      .input('customerId', customerId)
      .query(`
        SELECT TOP 1 id, ticket_number, channel_id, assigned_to_user_id, status
        FROM Tickets
        WHERE customer_id = @customerId AND status IN ('UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER')
        ORDER BY id DESC
      `);

    let ticketId: number;
    let ticketNumber: string;
    let isNewTicket = false;

    if (activeTicketRes.recordset.length > 0) {
      ticketId = activeTicketRes.recordset[0].id;
      ticketNumber = activeTicketRes.recordset[0].ticket_number;

      // Update waktu pesan pelanggan terakhir & perpanjang auto-close deadline (24 jam)
      await pool.request()
        .input('id', ticketId)
        .query(`
          UPDATE Tickets
          SET last_customer_message_at = SYSDATETIMEOFFSET(),
              auto_close_deadline = DATEADD(HOUR, 24, SYSDATETIMEOFFSET()),
              status = CASE WHEN status = 'WAITING_CUSTOMER' THEN 'IN_PROGRESS' ELSE status END
          WHERE id = @id
        `);
    } else {
      // 3. Buat Tiket Baru (Status: UNASSIGNED) dengan Workspace Inbound Routing
      isNewTicket = true;
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const countRes = await pool.request().query(`
        SELECT COUNT(*) as count FROM Tickets WHERE CAST(created_at AS DATE) = CAST(SYSDATETIMEOFFSET() AS DATE)
      `);
      const seq = (countRes.recordset[0].count + 1).toString().padStart(4, '0');
      ticketNumber = `TKT-${today}-${seq}`;

      // Deteksi mapping workspace saluran
      const wsMap = await pool.request()
        .input('cid', data.channelId)
        .query('SELECT workspace_id FROM WorkspaceChannels WHERE channel_id = @cid');
      const targetWorkspaceId = wsMap.recordset.length > 0 ? wsMap.recordset[0].workspace_id : 1;

      const insertTicket = await pool.request()
        .input('ticket_number', ticketNumber)
        .input('customer_id', customerId)
        .input('channel_id', data.channelId)
        .input('workspace_id', targetWorkspaceId)
        .query(`
          INSERT INTO Tickets (ticket_number, customer_id, channel_id, workspace_id, status, last_customer_message_at, auto_close_deadline)
          OUTPUT INSERTED.id
          VALUES (@ticket_number, @customer_id, @channel_id, @workspace_id, 'UNASSIGNED', SYSDATETIMEOFFSET(), DATEADD(HOUR, 24, SYSDATETIMEOFFSET()))
        `);
      ticketId = insertTicket.recordset[0].id;

      // Catat log audit inisiasi tiket
      await pool.request()
        .input('ticket_id', ticketId)
        .input('action', 'CREATED')
        .input('details', `Tiket baru dibuat dari pesan ${data.channelType}`)
        .query(`
          INSERT INTO TicketAuditLogs (ticket_id, action, details)
          VALUES (@ticket_id, @action, @details)
        `);
    }

    // 4. Masukkan Pesan Inbound ke Messages
    const messageType = data.messageType || 'TEXT';
    const mediaUrl = data.mediaUrl || null;

    const insertMsg = await pool.request()
      .input('ticket_id', ticketId)
      .input('sender_type', 'CUSTOMER')
      .input('message_type', messageType)
      .input('content', data.content)
      .input('media_url', mediaUrl)
      .input('external_id', data.externalMessageId)
      .query(`
        INSERT INTO Messages (ticket_id, sender_type, message_type, content, media_url, external_message_id, delivery_status)
        OUTPUT INSERTED.id, INSERTED.timestamp, INSERTED.message_type, INSERTED.media_url
        VALUES (@ticket_id, @sender_type, @message_type, @content, @media_url, @external_id, 'DELIVERED')
      `);

    const msgRecord = {
      id: insertMsg.recordset[0].id,
      ticket_id: ticketId,
      sender_type: 'CUSTOMER',
      message_type: insertMsg.recordset[0].message_type || 'TEXT',
      content: data.content,
      media_url: insertMsg.recordset[0].media_url || null,
      timestamp: insertMsg.recordset[0].timestamp
    };

    // 5. Broadcast Socket.io Event
    const socketHub = SocketHub.getInstance();
    if (isNewTicket) {
      const fullTicket = await this.getTicketById(ticketId);
      socketHub.emitNewTicket(fullTicket);
    }
    socketHub.emitNewMessage(ticketId, msgRecord);
  }

  /**
   * Mengambil daftar tiket di Pool Antrean (Status: UNASSIGNED) dengan filter Workspace
   */
  static async getClaimPoolTickets(workspaceId?: number): Promise<any[]> {
    const pool = await getDbPool();
    let query = `
      SELECT 
        t.id, t.ticket_number, t.channel_id, t.workspace_id, t.status, t.created_at, t.last_customer_message_at,
        c.id as customer_id, c.full_name as customer_name, c.phone_number, c.telegram_user_id, c.channel_source,
        c.email, c.company_name, c.customer_category, c.address, c.notes, c.contact_type, c.division, c.employee_id,
        ch.channel_type,
        w.code as workspace_code, w.name as workspace_name, w.color as workspace_color, w.icon as workspace_icon,
        (SELECT TOP 1 content FROM Messages WHERE ticket_id = t.id ORDER BY id DESC) as latest_message
      FROM Tickets t
      JOIN Customers c ON t.customer_id = c.id
      JOIN Channels ch ON t.channel_id = ch.id
      LEFT JOIN Workspaces w ON t.workspace_id = w.id
      WHERE t.status = 'UNASSIGNED'
    `;
    const req = pool.request();
    if (workspaceId && workspaceId > 0) {
      req.input('wsId', workspaceId);
      query += ` AND t.workspace_id = @wsId`;
    }
    query += ` ORDER BY t.created_at ASC`;
    const result = await req.query(query);
    return result.recordset;
  }

  /**
   * Mengambil tiket aktif milik agen tertentu dengan filter Workspace
   */
  static async getMyTickets(agentId: number, workspaceId?: number): Promise<any[]> {
    const pool = await getDbPool();
    let query = `
      SELECT 
        t.id, t.ticket_number, t.channel_id, t.workspace_id, t.status, t.created_at, t.last_customer_message_at, t.is_sla_breached,
        c.id as customer_id, c.full_name as customer_name, c.phone_number, c.telegram_user_id, c.channel_source, c.billing_account_id,
        c.email, c.company_name, c.customer_category, c.address, c.notes, c.contact_type, c.division, c.employee_id,
        ch.channel_type,
        w.code as workspace_code, w.name as workspace_name, w.color as workspace_color, w.icon as workspace_icon,
        (SELECT TOP 1 content FROM Messages WHERE ticket_id = t.id ORDER BY id DESC) as latest_message
      FROM Tickets t
      JOIN Customers c ON t.customer_id = c.id
      JOIN Channels ch ON t.channel_id = ch.id
      LEFT JOIN Workspaces w ON t.workspace_id = w.id
      WHERE t.assigned_to_user_id = @agentId AND t.status IN ('ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER')
    `;
    const req = pool.request().input('agentId', agentId);
    if (workspaceId && workspaceId > 0) {
      req.input('wsId', workspaceId);
      query += ` AND t.workspace_id = @wsId`;
    }
    query += ` ORDER BY t.last_customer_message_at DESC`;
    const result = await req.query(query);
    return result.recordset;
  }

  /**
   * Mengambil seluruh tiket untuk Supervisor (Live Monitoring) dengan filter Workspace
   */
  static async getAllTickets(statusFilter?: string, workspaceId?: number): Promise<any[]> {
    const pool = await getDbPool();
    let query = `
      SELECT 
        t.id, t.ticket_number, t.channel_id, t.workspace_id, t.status, t.created_at, t.first_response_at, t.resolved_at, t.last_customer_message_at, t.is_sla_breached,
        c.id as customer_id, c.full_name as customer_name, c.phone_number, c.telegram_user_id, c.channel_source, c.billing_account_id,
        c.email, c.company_name, c.customer_category, c.address, c.notes, c.contact_type, c.division, c.employee_id,
        u.id as agent_id, u.username as agent_username, u.display_alias as agent_alias,
        ch.channel_type,
        w.code as workspace_code, w.name as workspace_name, w.color as workspace_color, w.icon as workspace_icon,
        (SELECT TOP 1 content FROM Messages WHERE ticket_id = t.id ORDER BY id DESC) as latest_message
      FROM Tickets t
      JOIN Customers c ON t.customer_id = c.id
      JOIN Channels ch ON t.channel_id = ch.id
      LEFT JOIN Workspaces w ON t.workspace_id = w.id
      LEFT JOIN Users u ON t.assigned_to_user_id = u.id
      WHERE 1=1
    `;
    const req = pool.request();
    if (statusFilter && statusFilter !== 'ALL') {
      req.input('status', statusFilter);
      query += ` AND t.status = @status`;
    }
    if (workspaceId && workspaceId > 0) {
      req.input('wsId', workspaceId);
      query += ` AND t.workspace_id = @wsId`;
    }
    query += ` ORDER BY t.id DESC`;

    const result = await req.query(query);
    return result.recordset;
  }

  /**
   * Agen mengklaim tiket dari Pool Antrean
   */
  static async claimTicket(ticketId: number, agent: AuthenticatedUser): Promise<any> {
    const pool = await getDbPool();

    // Verifikasi tiket berstatus UNASSIGNED
    const checkRes = await pool.request()
      .input('id', ticketId)
      .query('SELECT status FROM Tickets WHERE id = @id');

    if (checkRes.recordset.length === 0) {
      throw new Error('Tiket tidak ditemukan');
    }
    if (checkRes.recordset[0].status !== 'UNASSIGNED') {
      throw new Error('Tiket sudah diambil oleh agen lain');
    }

    // Update kepemilikan tiket
    await pool.request()
      .input('id', ticketId)
      .input('agentId', agent.id)
      .query(`
        UPDATE Tickets
        SET assigned_to_user_id = @agentId, status = 'ASSIGNED'
        WHERE id = @id
      `);

    // Catat log audit
    await pool.request()
      .input('ticket_id', ticketId)
      .input('user_id', agent.id)
      .input('action', 'CLAIMED')
      .input('details', `Tiket diklaim oleh ${agent.display_alias} (${agent.username})`)
      .query(`
        INSERT INTO TicketAuditLogs (ticket_id, user_id, action, details)
        VALUES (@ticket_id, @user_id, @action, @details)
      `);

    const updated = await this.getTicketById(ticketId);
    SocketHub.getInstance().emitTicketClaimed(updated);
    SocketHub.getInstance().emitAuditLog({ ticket_id: ticketId, action: 'CLAIMED', details: `Tiket diklaim oleh ${agent.display_alias}`, timestamp: new Date() });
    return updated;
  }

  /**
   * Mengirim balasan pesan ke pelanggan dengan Dynamic Agent Prefix Injection
   */
  static async replyToTicket(ticketId: number, content: string, agent: AuthenticatedUser): Promise<any> {
    const pool = await getDbPool();
    const ticket = await this.getTicketById(ticketId);

    if (!ticket) {
      throw new Error('Tiket tidak ditemukan');
    }

    // Hanya agen yang ditugaskan atau Supervisor yang boleh membalas
    if (ticket.assigned_to_user_id !== agent.id && agent.role !== 'SUPERVISOR' && agent.role !== 'ADMIN') {
      throw new Error('Anda tidak memiliki izin membalas tiket milik agen lain');
    }

    // 1. Format pesan keluar dengan Dynamic Agent Prefix Injection
    const { formattedContent, prefixUsed } = await PrefixInjectorService.formatOutbound(
      content,
      'AGENT',
      agent,
      { id: ticket.id, ticket_number: ticket.ticket_number, channel_id: ticket.channel_id }
    );

    // 2. Simpan pesan murni ke Database MS SQL (tanpa prefix statis agar UI rapi)
    const insertMsg = await pool.request()
      .input('ticket_id', ticketId)
      .input('sender_type', 'AGENT')
      .input('sender_user_id', agent.id)
      .input('content', content)
      .input('injected_prefix', prefixUsed)
      .query(`
        INSERT INTO Messages (ticket_id, sender_type, sender_user_id, content, injected_prefix, delivery_status)
        OUTPUT INSERTED.id, INSERTED.timestamp
        VALUES (@ticket_id, @sender_type, @sender_user_id, @content, @injected_prefix, 'SENT')
      `);

    const msgId = insertMsg.recordset[0].id;
    const timestamp = insertMsg.recordset[0].timestamp;

    // 3. Update Status Tiket & Catat First Response Time jika balasan pertama
    await pool.request()
      .input('id', ticketId)
      .query(`
        UPDATE Tickets
        SET status = 'WAITING_CUSTOMER',
            first_response_at = COALESCE(first_response_at, SYSDATETIMEOFFSET())
        WHERE id = @id
      `);

    // 4. Kirim ke WhatsApp atau Telegram Gateway
    if (ticket.channel_type === 'WHATSAPP' && ticket.phone_number) {
      await WhatsAppGatewayService.getInstance().sendTextMessage(ticket.phone_number, formattedContent);
    } else if (ticket.channel_type === 'TELEGRAM' && ticket.telegram_user_id) {
      await TelegramGatewayService.getInstance().sendTextMessage(ticket.telegram_user_id, formattedContent);
    }

    const newMsgObj = {
      id: msgId,
      ticket_id: ticketId,
      sender_type: 'AGENT',
      sender_user_id: agent.id,
      sender_alias: agent.display_alias,
      content,
      injected_prefix: prefixUsed,
      timestamp
    };

    SocketHub.getInstance().emitNewMessage(ticketId, newMsgObj);
    return newMsgObj;
  }

  /**
   * Mengirim balasan media (Gambar atau Dokumen) ke pelanggan
   */
  static async replyMediaToTicket(
    ticketId: number,
    file: Express.Multer.File,
    caption: string,
    agent: AuthenticatedUser
  ): Promise<any> {
    const pool = await getDbPool();
    const ticket = await this.getTicketById(ticketId);

    if (!ticket) {
      throw new Error('Tiket tidak ditemukan');
    }

    if (ticket.assigned_to_user_id !== agent.id && agent.role !== 'SUPERVISOR' && agent.role !== 'ADMIN') {
      throw new Error('Anda tidak memiliki izin membalas tiket milik agen lain');
    }

    const isImage = file.mimetype.startsWith('image/');
    const messageType = isImage ? 'IMAGE' : 'DOCUMENT';
    const subfolder = isImage ? 'images' : 'documents';
    
    // Relative URL for browser & absolute path for local disk
    const mediaUrl = `/uploads/${subfolder}/${file.filename}`;
    const fullLocalPath = file.path;

    // 1. Format caption dengan Dynamic Agent Prefix Injection
    const rawCaption = (caption || '').trim();
    const { formattedContent: formattedCaption, prefixUsed } = await PrefixInjectorService.formatOutbound(
      rawCaption,
      'AGENT',
      agent,
      { id: ticket.id, ticket_number: ticket.ticket_number, channel_id: ticket.channel_id }
    );

    // 2. Simpan pesan ke database MS SQL
    const insertMsg = await pool.request()
      .input('ticket_id', ticketId)
      .input('sender_type', 'AGENT')
      .input('sender_user_id', agent.id)
      .input('message_type', messageType)
      .input('content', rawCaption || file.originalname)
      .input('media_url', mediaUrl)
      .input('injected_prefix', prefixUsed)
      .query(`
        INSERT INTO Messages (ticket_id, sender_type, sender_user_id, message_type, content, media_url, injected_prefix, delivery_status)
        OUTPUT INSERTED.id, INSERTED.timestamp
        VALUES (@ticket_id, @sender_type, @sender_user_id, @message_type, @content, @media_url, @injected_prefix, 'SENT')
      `);

    const msgId = insertMsg.recordset[0].id;
    const timestamp = insertMsg.recordset[0].timestamp;

    // 3. Update Status Tiket & First Response Time
    await pool.request()
      .input('id', ticketId)
      .query(`
        UPDATE Tickets
        SET status = 'WAITING_CUSTOMER',
            first_response_at = COALESCE(first_response_at, SYSDATETIMEOFFSET())
        WHERE id = @id
      `);

    // 4. Dispatch ke Gateway WhatsApp / Telegram
    if (ticket.channel_type === 'WHATSAPP' && ticket.phone_number) {
      await WhatsAppGatewayService.getInstance().sendMediaMessage(
        ticket.phone_number,
        fullLocalPath,
        messageType,
        formattedCaption,
        file.originalname,
        file.mimetype
      );
    } else if (ticket.channel_type === 'TELEGRAM' && ticket.telegram_user_id) {
      await TelegramGatewayService.getInstance().sendMediaMessage(
        ticket.telegram_user_id,
        fullLocalPath,
        messageType,
        formattedCaption,
        file.originalname
      );
    }

    const newMsgObj = {
      id: msgId,
      ticket_id: ticketId,
      sender_type: 'AGENT',
      sender_user_id: agent.id,
      sender_alias: agent.display_alias,
      message_type: messageType,
      content: rawCaption || file.originalname,
      media_url: mediaUrl,
      injected_prefix: prefixUsed,
      timestamp
    };

    SocketHub.getInstance().emitNewMessage(ticketId, newMsgObj);
    return newMsgObj;
  }

  /**
   * Menambahkan Catatan Internal (Whisper Mode)
   */
  static async addInternalNote(ticketId: number, noteText: string, author: AuthenticatedUser): Promise<any> {
    const pool = await getDbPool();

    const insertRes = await pool.request()
      .input('ticket_id', ticketId)
      .input('author_id', author.id)
      .input('note_text', noteText)
      .query(`
        INSERT INTO InternalNotes (ticket_id, author_user_id, note_text)
        OUTPUT INSERTED.id, INSERTED.created_at
        VALUES (@ticket_id, @author_id, @note_text)
      `);

    // Catat log audit
    await pool.request()
      .input('ticket_id', ticketId)
      .input('user_id', author.id)
      .input('action', 'NOTE_ADDED')
      .input('details', `Catatan internal ditambahkan oleh ${author.display_alias}`)
      .query(`
        INSERT INTO TicketAuditLogs (ticket_id, user_id, action, details)
        VALUES (@ticket_id, @user_id, @action, @details)
      `);

    const noteObj = {
      id: insertRes.recordset[0].id,
      ticket_id: ticketId,
      author_id: author.id,
      author_name: author.display_alias || author.username,
      author_role: author.role,
      note_text: noteText,
      created_at: insertRes.recordset[0].created_at
    };

    SocketHub.getInstance().emitInternalNote(ticketId, noteObj);
    return noteObj;
  }

  /**
   * Supervisor Takeover atau Reassign Tiket ke Agen Lain
   */
  static async takeoverTicket(ticketId: number, spvUser: AuthenticatedUser, targetAgentId?: number, reason?: string): Promise<any> {
    const pool = await getDbPool();
    const newAssigneeId = targetAgentId || spvUser.id;

    // Dapatkan info user baru
    const userRes = await pool.request()
      .input('id', newAssigneeId)
      .query('SELECT username, display_alias, role FROM Users WHERE id = @id');

    if (userRes.recordset.length === 0) {
      throw new Error('User tujuan tidak ditemukan');
    }
    const targetUser = userRes.recordset[0];

    const action = targetAgentId && targetAgentId !== spvUser.id ? 'TRANSFERRED' : 'TAKEOVER';
    const details = `${action} oleh ${spvUser.display_alias} dialihkan ke ${targetUser.display_alias}. Alasan: ${reason || 'Intervensi operasional'}`;

    await pool.request()
      .input('id', ticketId)
      .input('agentId', newAssigneeId)
      .query(`
        UPDATE Tickets
        SET assigned_to_user_id = @agentId, status = 'IN_PROGRESS'
        WHERE id = @id
      `);

    await pool.request()
      .input('ticket_id', ticketId)
      .input('user_id', spvUser.id)
      .input('action', action)
      .input('details', details)
      .query(`
        INSERT INTO TicketAuditLogs (ticket_id, user_id, action, details)
        VALUES (@ticket_id, @user_id, @action, @details)
      `);

    const updated = await this.getTicketById(ticketId);
    SocketHub.getInstance().emitTicketUpdated(updated);
    SocketHub.getInstance().emitAuditLog({ ticket_id: ticketId, action, details, timestamp: new Date() });
    return updated;
  }

  /**
   * Menyelesaikan Tiket (Resolve)
   */
  static async resolveTicket(ticketId: number, user: AuthenticatedUser): Promise<any> {
    const pool = await getDbPool();

    await pool.request()
      .input('id', ticketId)
      .query(`
        UPDATE Tickets
        SET status = 'RESOLVED', resolved_at = SYSDATETIMEOFFSET()
        WHERE id = @id
      `);

    await pool.request()
      .input('ticket_id', ticketId)
      .input('user_id', user.id)
      .input('action', 'RESOLVED')
      .input('details', `Tiket diselesaikan oleh ${user.display_alias}`)
      .query(`
        INSERT INTO TicketAuditLogs (ticket_id, user_id, action, details)
        VALUES (@ticket_id, @user_id, @action, @details)
      `);

    const updated = await this.getTicketById(ticketId);
    SocketHub.getInstance().emitTicketUpdated(updated);
    SocketHub.getInstance().emitAuditLog({ ticket_id: ticketId, action: 'RESOLVED', details: `Tiket diselesaikan oleh ${user.display_alias}`, timestamp: new Date() });
    return updated;
  }

  /**
   * Ambil Detail Lengkap 1 Tiket beserta Pesan, Catatan Internal, dan Audit Log
   */
  static async getTicketDetails(ticketId: number): Promise<any> {
    const pool = await getDbPool();
    const ticket = await this.getTicketById(ticketId);
    if (!ticket) return null;

    // Ambil percakapan
    const messagesRes = await pool.request()
      .input('ticket_id', ticketId)
      .query(`
        SELECT 
          m.id, m.ticket_id, m.sender_type, m.sender_user_id, m.message_type, m.content, m.media_url, m.injected_prefix, m.delivery_status, m.timestamp,
          u.display_alias as sender_alias, u.username as sender_username
        FROM Messages m
        LEFT JOIN Users u ON m.sender_user_id = u.id
        WHERE m.ticket_id = @ticket_id
        ORDER BY m.id ASC
      `);

    // Ambil Catatan Internal (Whisper)
    const notesRes = await pool.request()
      .input('ticket_id', ticketId)
      .query(`
        SELECT 
          n.id, n.ticket_id, n.author_user_id, n.note_text, n.created_at,
          u.display_alias as author_name, u.role as author_role
        FROM InternalNotes n
        JOIN Users u ON n.author_user_id = u.id
        WHERE n.ticket_id = @ticket_id
        ORDER BY n.id ASC
      `);

    // Ambil Audit Logs
    const auditsRes = await pool.request()
      .input('ticket_id', ticketId)
      .query(`
        SELECT 
          a.id, a.ticket_id, a.action, a.details, a.created_at,
          u.display_alias as user_name
        FROM TicketAuditLogs a
        LEFT JOIN Users u ON a.user_id = u.id
        WHERE a.ticket_id = @ticket_id
        ORDER BY a.id ASC
      `);

    return {
      ...ticket,
      messages: messagesRes.recordset,
      internalNotes: notesRes.recordset,
      auditLogs: auditsRes.recordset
    };
  }

  /**
   * Helper ambil baris tiket
   */
  static async getTicketById(ticketId: number): Promise<any> {
    const pool = await getDbPool();
    const res = await pool.request()
      .input('id', ticketId)
      .query(`
        SELECT 
          t.id, t.ticket_number, t.channel_id, t.workspace_id, t.status, t.created_at, t.first_response_at, t.resolved_at, t.last_customer_message_at, t.is_sla_breached,
          c.id as customer_id, c.full_name as customer_name, c.phone_number, c.telegram_user_id, c.channel_source, c.billing_account_id,
          c.email, c.company_name, c.customer_category, c.address, c.notes, c.contact_type, c.division, c.employee_id,
          ch.channel_type,
          w.code as workspace_code, w.name as workspace_name, w.color as workspace_color, w.icon as workspace_icon,
          u.id as assigned_to_user_id, u.username as assigned_username, u.display_alias as assigned_alias, u.role as assigned_role
        FROM Tickets t
        JOIN Customers c ON t.customer_id = c.id
        JOIN Channels ch ON t.channel_id = ch.id
        LEFT JOIN Workspaces w ON t.workspace_id = w.id
        LEFT JOIN Users u ON t.assigned_to_user_id = u.id
        WHERE t.id = @id
      `);
    return res.recordset[0] || null;
  }

  /**
   * Background Task: Menutup tiket yang inaktif 24 jam
   */
  static async autoCloseInactiveTickets(): Promise<number> {
    try {
      const pool = await getDbPool();
      const res = await pool.request().query(`
        UPDATE Tickets
        SET status = 'CLOSED'
        OUTPUT INSERTED.id, INSERTED.ticket_number
        WHERE status IN ('WAITING_CUSTOMER', 'RESOLVED')
          AND auto_close_deadline <= SYSDATETIMEOFFSET()
      `);

      for (const row of res.recordset) {
        await pool.request()
          .input('ticket_id', row.id)
          .input('action', 'AUTO_CLOSED')
          .input('details', 'Tiket ditutup otomatis oleh sistem setelah 24 jam inaktif')
          .query(`
            INSERT INTO TicketAuditLogs (ticket_id, action, details)
            VALUES (@ticket_id, @action, @details)
          `);
      }
      return res.recordset.length;
    } catch (err) {
      console.error('Error auto-closing inactive tickets:', err);
      return 0;
    }
  }
}
