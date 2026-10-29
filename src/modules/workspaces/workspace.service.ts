import { getDbPool } from '../../database/connection.js';

export interface WorkspaceData {
  id: number;
  code: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  is_active: boolean;
  member_count?: number;
  channel_count?: number;
  ticket_count?: number;
  created_at: Date;
}

export class WorkspaceService {
  static async getAllWorkspaces(): Promise<WorkspaceData[]> {
    const pool = await getDbPool();
    const result = await pool.request().query(`
      SELECT 
        w.id,
        w.code,
        w.name,
        w.description,
        w.color,
        w.icon,
        w.is_active,
        w.created_at,
        (SELECT COUNT(*) FROM WorkspaceUsers wu WHERE wu.workspace_id = w.id) AS member_count,
        (SELECT COUNT(*) FROM WorkspaceChannels wc WHERE wc.workspace_id = w.id) AS channel_count,
        (SELECT COUNT(*) FROM Tickets t WHERE t.workspace_id = w.id AND t.status NOT IN ('RESOLVED', 'CLOSED')) AS ticket_count
      FROM Workspaces w
      ORDER BY w.id ASC
    `);

    return result.recordset.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      color: row.color,
      icon: row.icon,
      is_active: Boolean(row.is_active),
      member_count: row.member_count || 0,
      channel_count: row.channel_count || 0,
      ticket_count: row.ticket_count || 0,
      created_at: row.created_at
    }));
  }

  static async getWorkspaceById(id: number): Promise<WorkspaceData | null> {
    const pool = await getDbPool();
    const result = await pool.request()
      .input('id', id)
      .query(`
        SELECT 
          w.id, w.code, w.name, w.description, w.color, w.icon, w.is_active, w.created_at,
          (SELECT COUNT(*) FROM WorkspaceUsers wu WHERE wu.workspace_id = w.id) AS member_count,
          (SELECT COUNT(*) FROM WorkspaceChannels wc WHERE wc.workspace_id = w.id) AS channel_count,
          (SELECT COUNT(*) FROM Tickets t WHERE t.workspace_id = w.id AND t.status NOT IN ('RESOLVED', 'CLOSED')) AS ticket_count
        FROM Workspaces w
        WHERE w.id = @id
      `);

    if (result.recordset.length === 0) return null;
    const row = result.recordset[0];
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      color: row.color,
      icon: row.icon,
      is_active: Boolean(row.is_active),
      member_count: row.member_count || 0,
      channel_count: row.channel_count || 0,
      ticket_count: row.ticket_count || 0,
      created_at: row.created_at
    };
  }

  static async createWorkspace(data: {
    code: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    member_user_ids?: number[];
    channel_ids?: number[];
  }): Promise<WorkspaceData> {
    if (!data.code || !data.name) {
      throw new Error('Kode Workspace dan Nama Workspace wajib diisi');
    }

    const cleanCode = data.code.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const pool = await getDbPool();

    const existing = await pool.request()
      .input('code', cleanCode)
      .query('SELECT id FROM Workspaces WHERE code = @code');

    if (existing.recordset.length > 0) {
      throw new Error(`Workspace dengan kode '${cleanCode}' sudah digunakan`);
    }

    const result = await pool.request()
      .input('code', cleanCode)
      .input('name', data.name.trim())
      .input('desc', data.description ? data.description.trim() : null)
      .input('color', data.color || '#4F46E5')
      .input('icon', data.icon || 'briefcase')
      .query(`
        INSERT INTO Workspaces (code, name, description, color, icon, is_active)
        OUTPUT INSERTED.id, INSERTED.code, INSERTED.name, INSERTED.description, INSERTED.color, INSERTED.icon, INSERTED.is_active, INSERTED.created_at
        VALUES (@code, @name, @desc, @color, @icon, 1)
      `);

    const newWs = result.recordset[0];

    // Assign members if provided
    if (data.member_user_ids && Array.isArray(data.member_user_ids) && data.member_user_ids.length > 0) {
      await this.assignUsersToWorkspace(newWs.id, data.member_user_ids);
    }

    // Map channels if provided
    if (data.channel_ids && Array.isArray(data.channel_ids) && data.channel_ids.length > 0) {
      await this.mapChannelsToWorkspace(newWs.id, data.channel_ids);
    }

    return {
      id: newWs.id,
      code: newWs.code,
      name: newWs.name,
      description: newWs.description,
      color: newWs.color,
      icon: newWs.icon,
      is_active: Boolean(newWs.is_active),
      created_at: newWs.created_at
    };
  }

  static async updateWorkspace(id: number, data: {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
    is_active?: boolean;
    member_user_ids?: number[];
    channel_ids?: number[];
  }): Promise<WorkspaceData> {
    const pool = await getDbPool();

    const existing = await this.getWorkspaceById(id);
    if (!existing) {
      throw new Error('Workspace tidak ditemukan');
    }

    const result = await pool.request()
      .input('id', id)
      .input('name', data.name !== undefined ? data.name.trim() : existing.name)
      .input('desc', data.description !== undefined ? (data.description ? data.description.trim() : null) : existing.description)
      .input('color', data.color !== undefined ? data.color : existing.color)
      .input('icon', data.icon !== undefined ? data.icon : existing.icon)
      .input('active', data.is_active !== undefined ? (data.is_active ? 1 : 0) : (existing.is_active ? 1 : 0))
      .query(`
        UPDATE Workspaces
        SET name = @name,
            description = @desc,
            color = @color,
            icon = @icon,
            is_active = @active
        OUTPUT INSERTED.id, INSERTED.code, INSERTED.name, INSERTED.description, INSERTED.color, INSERTED.icon, INSERTED.is_active, INSERTED.created_at
        WHERE id = @id
      `);

    const updated = result.recordset[0];

    if (data.member_user_ids !== undefined && Array.isArray(data.member_user_ids)) {
      await this.assignUsersToWorkspace(id, data.member_user_ids);
    }

    if (data.channel_ids !== undefined && Array.isArray(data.channel_ids)) {
      await this.mapChannelsToWorkspace(id, data.channel_ids);
    }

    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      description: updated.description,
      color: updated.color,
      icon: updated.icon,
      is_active: Boolean(updated.is_active),
      created_at: updated.created_at
    };
  }

  static async deleteWorkspace(id: number): Promise<void> {
    if (id === 1) {
      throw new Error('Workspace Utama CS (Default) tidak dapat dihapus');
    }

    const pool = await getDbPool();

    // Reassign any open tickets from this workspace back to default workspace 1
    await pool.request()
      .input('id', id)
      .query('UPDATE Tickets SET workspace_id = 1 WHERE workspace_id = @id');

    await pool.request()
      .input('id', id)
      .query('DELETE FROM Workspaces WHERE id = @id');
  }

  static async assignUsersToWorkspace(workspaceId: number, userIds: number[]): Promise<void> {
    const pool = await getDbPool();

    // Remove existing assignments for this workspace
    await pool.request()
      .input('wsId', workspaceId)
      .query('DELETE FROM WorkspaceUsers WHERE workspace_id = @wsId');

    // Insert new assignments
    for (const uid of userIds) {
      await pool.request()
        .input('wsId', workspaceId)
        .input('uid', uid)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM WorkspaceUsers WHERE workspace_id = @wsId AND user_id = @uid)
          BEGIN
            INSERT INTO WorkspaceUsers (workspace_id, user_id) VALUES (@wsId, @uid);
          END;
        `);
    }
  }

  static async getWorkspaceMembers(workspaceId: number): Promise<any[]> {
    const pool = await getDbPool();
    const result = await pool.request()
      .input('wsId', workspaceId)
      .query(`
        SELECT u.id, u.username, u.display_alias, u.email, u.role, u.is_active, u.avatar_url
        FROM WorkspaceUsers wu
        JOIN Users u ON wu.user_id = u.id
        WHERE wu.workspace_id = @wsId
        ORDER BY u.display_alias ASC
      `);
    return result.recordset;
  }

  static async mapChannelsToWorkspace(workspaceId: number, channelIds: number[]): Promise<void> {
    const pool = await getDbPool();

    // Each channel belongs to only one workspace at a time (or can be mapped exclusively)
    for (const cid of channelIds) {
      await pool.request()
        .input('cid', cid)
        .query('DELETE FROM WorkspaceChannels WHERE channel_id = @cid');

      await pool.request()
        .input('wsId', workspaceId)
        .input('cid', cid)
        .query('INSERT INTO WorkspaceChannels (workspace_id, channel_id) VALUES (@wsId, @cid)');
    }
  }

  static async getWorkspaceChannels(workspaceId: number): Promise<any[]> {
    const pool = await getDbPool();
    const result = await pool.request()
      .input('wsId', workspaceId)
      .query(`
        SELECT c.id, c.channel_type, c.account_identifier, c.status
        FROM WorkspaceChannels wc
        JOIN Channels c ON wc.channel_id = c.id
        WHERE wc.workspace_id = @wsId
      `);
    return result.recordset;
  }

  static async getUserWorkspaces(userId: number, userRole?: string): Promise<WorkspaceData[]> {
    const pool = await getDbPool();

    // If ADMIN or SUPERVISOR, or role has spv_monitor / all_workspaces, can see all active workspaces
    if (userRole === 'ADMIN' || userRole === 'SUPERVISOR') {
      return this.getAllWorkspaces();
    }

    const result = await pool.request()
      .input('uid', userId)
      .query(`
        SELECT 
          w.id, w.code, w.name, w.description, w.color, w.icon, w.is_active, w.created_at,
          (SELECT COUNT(*) FROM WorkspaceUsers wu2 WHERE wu2.workspace_id = w.id) AS member_count,
          (SELECT COUNT(*) FROM WorkspaceChannels wc WHERE wc.workspace_id = w.id) AS channel_count,
          (SELECT COUNT(*) FROM Tickets t WHERE t.workspace_id = w.id AND t.status NOT IN ('RESOLVED', 'CLOSED')) AS ticket_count
        FROM Workspaces w
        JOIN WorkspaceUsers wu ON w.id = wu.workspace_id
        WHERE wu.user_id = @uid AND w.is_active = 1
        ORDER BY w.id ASC
      `);

    return result.recordset.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      color: row.color,
      icon: row.icon,
      is_active: Boolean(row.is_active),
      member_count: row.member_count || 0,
      channel_count: row.channel_count || 0,
      ticket_count: row.ticket_count || 0,
      created_at: row.created_at
    }));
  }

  static async getWorkspaceForChannel(channelId: number): Promise<number> {
    const pool = await getDbPool();
    const result = await pool.request()
      .input('cid', channelId)
      .query('SELECT workspace_id FROM WorkspaceChannels WHERE channel_id = @cid');

    if (result.recordset.length > 0) {
      return result.recordset[0].workspace_id;
    }
    return 1; // Fallback to Workspace Utama (id 1)
  }
}
