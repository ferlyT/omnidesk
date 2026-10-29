import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDbPool } from '../../database/connection.js';
import { AuthenticatedUser } from './auth.middleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'omnichannel_super_secret_jwt_key_2026!';

export class AuthService {
  static async login(username: string, passwordPlain: string): Promise<{ token: string; user: AuthenticatedUser }> {
    const pool = await getDbPool();
    const result = await pool.request()
      .input('username', username)
      .query(`
        SELECT id, username, display_alias, password_hash, role, is_active, avatar_url
        FROM Users
        WHERE username = @username
      `);

    if (result.recordset.length === 0) {
      throw new Error('Username atau kata sandi tidak valid');
    }

    const dbUser = result.recordset[0];
    if (!dbUser.is_active) {
      throw new Error('Akun dinonaktifkan. Silakan hubungi Administrator');
    }

    const isMatch = await bcrypt.compare(passwordPlain, dbUser.password_hash);
    if (!isMatch) {
      throw new Error('Username atau kata sandi tidak valid');
    }

    // Fetch granular permissions from Roles
    let permissions: string[] = [];
    const roleRes = await pool.request()
      .input('roleCode', dbUser.role)
      .query('SELECT permissions FROM Roles WHERE role_code = @roleCode');
    if (roleRes.recordset.length > 0) {
      try {
        permissions = typeof roleRes.recordset[0].permissions === 'string'
          ? JSON.parse(roleRes.recordset[0].permissions)
          : roleRes.recordset[0].permissions;
      } catch (e) {
        permissions = [];
      }
    }

    const payload: AuthenticatedUser = {
      id: dbUser.id,
      username: dbUser.username,
      display_alias: dbUser.display_alias,
      role: dbUser.role,
      avatar_url: dbUser.avatar_url || null,
      permissions
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    return { token, user: payload };
  }

  static async getUsers(roleFilter?: string): Promise<any[]> {
    const pool = await getDbPool();
    let query = `
      SELECT id, username, display_alias, email, role, is_active, avatar_url, created_at
      FROM Users
    `;
    const req = pool.request();
    if (roleFilter) {
      req.input('role', roleFilter);
      query += ` WHERE role = @role`;
    }
    query += ` ORDER BY id ASC`;
    const result = await req.query(query);
    return result.recordset;
  }

  static async getUserById(userId: number): Promise<any> {
    const pool = await getDbPool();
    const result = await pool.request()
      .input('id', userId)
      .query(`
        SELECT id, username, display_alias, email, role, is_active, avatar_url, created_at
        FROM Users
        WHERE id = @id
      `);
    return result.recordset[0] || null;
  }

  static async createUser(data: {
    username: string;
    display_alias: string;
    email: string;
    passwordPlain: string;
    role?: string;
    avatar_url?: string;
    is_active?: boolean;
    workspace_ids?: number[];
  }): Promise<any> {
    const pool = await getDbPool();

    const username = data.username.trim().toLowerCase();
    const email = data.email.trim().toLowerCase();
    const displayAlias = data.display_alias.trim();
    const role = (data.role || 'AGENT').toUpperCase();
    const isActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1;
    const avatarUrl = data.avatar_url ? data.avatar_url.trim() : null;

    if (!username || !email || !displayAlias || !data.passwordPlain) {
      throw new Error('Username, Nama Tampilan, Email, dan Password wajib diisi');
    }

    // Check duplicate username or email
    const duplicateCheck = await pool.request()
      .input('username', username)
      .input('email', email)
      .query('SELECT id, username, email FROM Users WHERE username = @username OR email = @email');

    if (duplicateCheck.recordset.length > 0) {
      const existing = duplicateCheck.recordset[0];
      if (existing.username.toLowerCase() === username) {
        throw new Error(`Username "${username}" sudah digunakan`);
      }
      if (existing.email.toLowerCase() === email) {
        throw new Error(`Email "${email}" sudah digunakan`);
      }
    }

    const passwordHash = await bcrypt.hash(data.passwordPlain, 10);

    const roleRow = await pool.request()
      .input('rc', role)
      .query('SELECT id FROM Roles WHERE role_code = @rc');
    const roleId = roleRow.recordset.length > 0 ? roleRow.recordset[0].id : null;

    const insertResult = await pool.request()
      .input('username', username)
      .input('display_alias', displayAlias)
      .input('email', email)
      .input('password_hash', passwordHash)
      .input('role', role)
      .input('role_id', roleId)
      .input('is_active', isActive)
      .input('avatar_url', avatarUrl)
      .query(`
        INSERT INTO Users (username, display_alias, email, password_hash, role, role_id, is_active, avatar_url)
        OUTPUT INSERTED.id, INSERTED.username, INSERTED.display_alias, INSERTED.email, INSERTED.role, INSERTED.is_active, INSERTED.avatar_url, INSERTED.created_at
        VALUES (@username, @display_alias, @email, @password_hash, @role, @role_id, @is_active, @avatar_url)
      `);

    const newUser = insertResult.recordset[0];

    // Assign to workspaces if provided, default to workspace 1 (Utama)
    const targetWs = (data.workspace_ids && data.workspace_ids.length > 0) ? data.workspace_ids : [1];
    for (const wsId of targetWs) {
      await pool.request()
        .input('wsId', wsId)
        .input('uid', newUser.id)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM WorkspaceUsers WHERE workspace_id = @wsId AND user_id = @uid)
          BEGIN
            INSERT INTO WorkspaceUsers (workspace_id, user_id) VALUES (@wsId, @uid);
          END;
        `);
    }

    return newUser;
  }

  static async updateUser(
    userId: number,
    data: {
      display_alias?: string;
      email?: string;
      role?: string;
      passwordPlain?: string;
      avatar_url?: string;
      is_active?: boolean;
      workspace_ids?: number[];
    }
  ): Promise<any> {
    const pool = await getDbPool();
    const existing = await this.getUserById(userId);
    if (!existing) {
      throw new Error('Pengguna tidak ditemukan');
    }

    const displayAlias = data.display_alias !== undefined ? data.display_alias.trim() : existing.display_alias;
    const email = data.email !== undefined ? data.email.trim().toLowerCase() : existing.email;
    const role = (data.role || existing.role).toUpperCase();
    const isActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : (existing.is_active ? 1 : 0);
    const avatarUrl = data.avatar_url !== undefined ? (data.avatar_url ? data.avatar_url.trim() : null) : existing.avatar_url;

    // Check duplicate email if changed
    if (email !== existing.email) {
      const emailCheck = await pool.request()
        .input('email', email)
        .input('id', userId)
        .query('SELECT id FROM Users WHERE email = @email AND id <> @id');
      if (emailCheck.recordset.length > 0) {
        throw new Error(`Email "${email}" sudah digunakan oleh akun lain`);
      }
    }

    const roleRow = await pool.request()
      .input('rc', role)
      .query('SELECT id FROM Roles WHERE role_code = @rc');
    const roleId = roleRow.recordset.length > 0 ? roleRow.recordset[0].id : null;

    const req = pool.request()
      .input('id', userId)
      .input('display_alias', displayAlias)
      .input('email', email)
      .input('role', role)
      .input('role_id', roleId)
      .input('is_active', isActive)
      .input('avatar_url', avatarUrl);

    let query = `
      UPDATE Users
      SET display_alias = @display_alias,
          email = @email,
          role = @role,
          role_id = @role_id,
          is_active = @is_active,
          avatar_url = @avatar_url
    `;

    if (data.passwordPlain && data.passwordPlain.trim()) {
      const newHash = await bcrypt.hash(data.passwordPlain.trim(), 10);
      req.input('password_hash', newHash);
      query += `, password_hash = @password_hash`;
    }

    query += ` WHERE id = @id`;
    await req.query(query);

    if (data.workspace_ids !== undefined && Array.isArray(data.workspace_ids)) {
      await pool.request().input('uid', userId).query('DELETE FROM WorkspaceUsers WHERE user_id = @uid');
      for (const wsId of data.workspace_ids) {
        await pool.request()
          .input('wsId', wsId)
          .input('uid', userId)
          .query('INSERT INTO WorkspaceUsers (workspace_id, user_id) VALUES (@wsId, @uid)');
      }
    }

    return await this.getUserById(userId);
  }

  static async toggleUserActive(userId: number, isActive: boolean): Promise<any> {
    const pool = await getDbPool();
    const existing = await this.getUserById(userId);
    if (!existing) {
      throw new Error('Pengguna tidak ditemukan');
    }

    // Hindari menonaktifkan akun admin terakhir
    if (!isActive && existing.role === 'ADMIN') {
      const adminCountRes = await pool.request().query("SELECT COUNT(*) as count FROM Users WHERE role = 'ADMIN' AND is_active = 1");
      if (adminCountRes.recordset[0].count <= 1) {
        throw new Error('Tidak dapat menonaktifkan satu-satunya akun Administrator yang aktif');
      }
    }

    await pool.request()
      .input('id', userId)
      .input('is_active', isActive ? 1 : 0)
      .query('UPDATE Users SET is_active = @is_active WHERE id = @id');

    return await this.getUserById(userId);
  }
}
