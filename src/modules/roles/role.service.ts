import { getDbPool } from '../../database/connection.js';

export interface RoleData {
  id?: number;
  role_code: string;
  role_name: string;
  description?: string;
  permissions: string[];
  is_system?: boolean;
}

export const ALL_PERMISSIONS = [
  { code: 'ticket_view', name: 'Melihat Antrian & Detail Tiket', category: 'Operasional CS' },
  { code: 'ticket_claim', name: 'Mengklaim Tiket dari Antrian', category: 'Operasional CS' },
  { code: 'ticket_reply', name: 'Membalas Pesan Pelanggan', category: 'Operasional CS' },
  { code: 'media_dispatch', name: 'Mengirim Foto / Dokumen', category: 'Operasional CS' },
  { code: 'ticket_resolve', name: 'Menyelesaikan Tiket', category: 'Operasional CS' },
  { code: 'whisper_internal', name: 'Menulis Catatan Bisikan Internal', category: 'Supervisor' },
  { code: 'spv_takeover', name: 'Mengambil Alih Tiket (Takeover)', category: 'Supervisor' },
  { code: 'spv_monitor', name: 'Monitoring Dashboard & Audit Log', category: 'Supervisor' },
  { code: 'manage_users', name: 'Kelola Staf CS & Aktivasi Akun', category: 'Administrasi' },
  { code: 'manage_roles', name: 'Kelola Role & Hak Akses Granular', category: 'Administrasi' },
  { code: 'manage_workspaces', name: 'Kelola Multi-Workspace & Anggota', category: 'Administrasi' },
  { code: 'manage_channels', name: 'Kelola Saluran & Multi-WhatsApp', category: 'Administrasi' }
];

export class RoleService {
  static async getAllRoles(): Promise<RoleData[]> {
    const pool = await getDbPool();
    const result = await pool.request().query(`
      SELECT 
        r.id, 
        r.role_code, 
        r.role_name, 
        r.description, 
        r.permissions, 
        r.is_system, 
        r.created_at,
        (SELECT COUNT(*) FROM Users u WHERE u.role = r.role_code OR u.role_id = r.id) AS user_count
      FROM Roles r
      ORDER BY r.is_system DESC, r.id ASC
    `);

    return result.recordset.map(row => {
      let perms: string[] = [];
      try {
        perms = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions;
      } catch (e) {
        perms = [];
      }
      return {
        id: row.id,
        role_code: row.role_code,
        role_name: row.role_name,
        description: row.description,
        permissions: perms,
        is_system: Boolean(row.is_system),
        user_count: row.user_count || 0,
        created_at: row.created_at
      } as any;
    });
  }

  static async getRoleByCode(roleCode: string): Promise<RoleData | null> {
    const pool = await getDbPool();
    const result = await pool.request()
      .input('code', roleCode)
      .query('SELECT * FROM Roles WHERE role_code = @code');

    if (result.recordset.length === 0) return null;
    const row = result.recordset[0];
    let perms: string[] = [];
    try {
      perms = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions;
    } catch (e) {
      perms = [];
    }
    return {
      id: row.id,
      role_code: row.role_code,
      role_name: row.role_name,
      description: row.description,
      permissions: perms,
      is_system: Boolean(row.is_system)
    };
  }

  static async createRole(data: { role_code: string; role_name: string; description?: string; permissions: string[] }): Promise<RoleData> {
    if (!data.role_code || !data.role_name) {
      throw new Error('Kode Role dan Nama Role wajib diisi');
    }

    const cleanCode = data.role_code.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const pool = await getDbPool();

    // Check duplicate code
    const existing = await pool.request()
      .input('code', cleanCode)
      .query('SELECT id FROM Roles WHERE role_code = @code');

    if (existing.recordset.length > 0) {
      throw new Error(`Role dengan kode '${cleanCode}' sudah digunakan`);
    }

    const permsJson = JSON.stringify(data.permissions || []);

    const result = await pool.request()
      .input('code', cleanCode)
      .input('name', data.role_name.trim())
      .input('desc', data.description ? data.description.trim() : null)
      .input('perms', permsJson)
      .query(`
        INSERT INTO Roles (role_code, role_name, description, permissions, is_system)
        OUTPUT INSERTED.id, INSERTED.role_code, INSERTED.role_name, INSERTED.description, INSERTED.permissions, INSERTED.is_system
        VALUES (@code, @name, @desc, @perms, 0)
      `);

    const row = result.recordset[0];
    return {
      id: row.id,
      role_code: row.role_code,
      role_name: row.role_name,
      description: row.description,
      permissions: data.permissions || [],
      is_system: false
    };
  }

  static async updateRole(id: number, data: { role_name: string; description?: string; permissions: string[] }): Promise<RoleData> {
    const pool = await getDbPool();

    const existing = await pool.request()
      .input('id', id)
      .query('SELECT * FROM Roles WHERE id = @id');

    if (existing.recordset.length === 0) {
      throw new Error('Role tidak ditemukan');
    }

    const current = existing.recordset[0];
    const permsJson = JSON.stringify(data.permissions || []);

    const result = await pool.request()
      .input('id', id)
      .input('name', data.role_name ? data.role_name.trim() : current.role_name)
      .input('desc', data.description !== undefined ? data.description.trim() : current.description)
      .input('perms', permsJson)
      .query(`
        UPDATE Roles
        SET role_name = @name,
            description = @desc,
            permissions = @perms
        OUTPUT INSERTED.id, INSERTED.role_code, INSERTED.role_name, INSERTED.description, INSERTED.permissions, INSERTED.is_system
        WHERE id = @id
      `);

    const row = result.recordset[0];
    return {
      id: row.id,
      role_code: row.role_code,
      role_name: row.role_name,
      description: row.description,
      permissions: data.permissions || [],
      is_system: Boolean(row.is_system)
    };
  }

  static async deleteRole(id: number): Promise<void> {
    const pool = await getDbPool();

    const existing = await pool.request()
      .input('id', id)
      .query('SELECT id, role_code, is_system FROM Roles WHERE id = @id');

    if (existing.recordset.length === 0) {
      throw new Error('Role tidak ditemukan');
    }

    const role = existing.recordset[0];
    if (role.is_system) {
      throw new Error('Role bawaan sistem tidak dapat dihapus');
    }

    // Check if role is used by users
    const userCount = await pool.request()
      .input('code', role.role_code)
      .input('id', role.id)
      .query('SELECT COUNT(*) AS total FROM Users WHERE role = @code OR role_id = @id');

    if (userCount.recordset[0].total > 0) {
      throw new Error(`Tidak dapat menghapus role '${role.role_code}' karena masih digunakan oleh ${userCount.recordset[0].total} staf pengguna`);
    }

    await pool.request()
      .input('id', id)
      .query('DELETE FROM Roles WHERE id = @id');
  }

  static hasPermission(userPermissions: string[], permission: string): boolean {
    if (!userPermissions || !Array.isArray(userPermissions)) return false;
    return userPermissions.includes(permission);
  }
}
