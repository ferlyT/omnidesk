import { getDbPool } from '../../database/connection.js';

export interface PrefixConfig {
  enable_agent_prefix: boolean;
  prefix_template: string;
  prefix_mode: 'ALWAYS' | 'ONCE_PER_HANDOFF' | 'FIRST_RESPONSE_ONLY';
}

export interface AgentInfo {
  id: number;
  username: string;
  display_alias: string;
  role: string;
}

export interface TicketContext {
  id: number;
  ticket_number: string;
  channel_id: number;
}

export class PrefixInjectorService {
  /**
   * Process outbound message and dynamically inject agent identification prefix
   */
  static async formatOutbound(
    content: string,
    senderType: 'AGENT' | 'SYSTEM' | 'CUSTOMER',
    agent: AgentInfo,
    ticket: TicketContext,
    channelConfig?: PrefixConfig
  ): Promise<{ formattedContent: string; prefixUsed: string | null }> {
    // 1. Pelanggan atau Pesan Sistem tidak memerlukan prefix agen
    if (senderType !== 'AGENT') {
      return { formattedContent: content, prefixUsed: null };
    }

    // 2. Ambil konfigurasi channel jika tidak disediakan
    let config = channelConfig;
    if (!config) {
      config = await this.getChannelConfig(ticket.channel_id);
    }

    if (!config.enable_agent_prefix) {
      return { formattedContent: content, prefixUsed: null };
    }

    const alias = agent.display_alias || agent.username;

    // 3. Evaluasi Mode Injeksi
    if (config.prefix_mode === 'ONCE_PER_HANDOFF') {
      const isContinuous = await this.isContinuousAgentMessage(ticket.id, agent.id);
      if (isContinuous) {
        // Agen yang sama melanjutkan obrolan berurutan: jangan tambahkan prefix agar percakapan natural
        return { formattedContent: content, prefixUsed: null };
      }
    } else if (config.prefix_mode === 'FIRST_RESPONSE_ONLY') {
      const hasPreviousAgentMessages = await this.hasAnyAgentMessage(ticket.id);
      if (hasPreviousAgentMessages) {
        return { formattedContent: content, prefixUsed: null };
      }
    }

    // 4. Render template prefix
    // Template default: "*[{display_alias}]*:"
    const template = config.prefix_template || '*[{display_alias}]*:';
    const prefix = template
      .replace('{display_alias}', alias)
      .replace('{username}', agent.username)
      .replace('{role}', agent.role)
      .replace('{ticket_number}', ticket.ticket_number);

    const formattedContent = `${prefix} ${content}`.trim();

    return {
      formattedContent,
      prefixUsed: prefix
    };
  }

  private static async getChannelConfig(channelId: number): Promise<PrefixConfig> {
    try {
      const pool = await getDbPool();
      const res = await pool.request()
        .input('id', channelId)
        .query(`
          SELECT enable_agent_prefix, prefix_template, prefix_mode
          FROM Channels
          WHERE id = @id
        `);

      if (res.recordset.length > 0) {
        const row = res.recordset[0];
        return {
          enable_agent_prefix: Boolean(row.enable_agent_prefix),
          prefix_template: row.prefix_template || '*[{display_alias}]*:',
          prefix_mode: row.prefix_mode || 'ALWAYS'
        };
      }
    } catch (err) {
      console.error('Error fetching channel prefix config:', err);
    }

    return {
      enable_agent_prefix: true,
      prefix_template: '*[{display_alias}]*:',
      prefix_mode: 'ALWAYS'
    };
  }

  /**
   * Cek apakah pesan agen terakhir sebelum pesan ini dikirim oleh agen yang SAMA
   */
  private static async isContinuousAgentMessage(ticketId: number, currentAgentId: number): Promise<boolean> {
    try {
      const pool = await getDbPool();
      const res = await pool.request()
        .input('ticket_id', ticketId)
        .query(`
          SELECT TOP 1 sender_type, sender_user_id
          FROM Messages
          WHERE ticket_id = @ticket_id AND sender_type = 'AGENT'
          ORDER BY id DESC
        `);

      if (res.recordset.length > 0) {
        const lastMsg = res.recordset[0];
        return lastMsg.sender_user_id === currentAgentId;
      }
    } catch (err) {
      console.error('Error checking continuous message:', err);
    }
    return false;
  }

  /**
   * Cek apakah tiket sudah pernah memiliki balasan agen sebelumnya
   */
  private static async hasAnyAgentMessage(ticketId: number): Promise<boolean> {
    try {
      const pool = await getDbPool();
      const res = await pool.request()
        .input('ticket_id', ticketId)
        .query(`
          SELECT TOP 1 id
          FROM Messages
          WHERE ticket_id = @ticket_id AND sender_type = 'AGENT'
        `);

      return res.recordset.length > 0;
    } catch (err) {
      console.error('Error checking previous agent message:', err);
    }
    return false;
  }
}
