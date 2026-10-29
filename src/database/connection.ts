import sql from 'mssql/msnodesqlv8.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Default connection string uses native Windows ODBC Shared Memory/Named Pipes for .\SQLEXPRESS
const connectionString = process.env.MSSQL_CONNECTION_STRING || 
  'Driver={ODBC Driver 17 for SQL Server};Server=.\\SQLEXPRESS;Database=BillingOmnichannel;Trusted_Connection=yes;';

let pool: sql.ConnectionPool | null = null;
let schemaChecked = false;

async function ensureSchemaUpdated(p: sql.ConnectionPool) {
  if (schemaChecked) return;
  try {
    await p.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Customers') AND name = 'email')
      BEGIN
          ALTER TABLE Customers ADD email NVARCHAR(150) NULL;
      END;
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Customers') AND name = 'company_name')
      BEGIN
          ALTER TABLE Customers ADD company_name NVARCHAR(150) NULL;
      END;
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Customers') AND name = 'customer_category')
      BEGIN
          ALTER TABLE Customers ADD customer_category NVARCHAR(50) NOT NULL DEFAULT 'REGULER';
      END;
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Customers') AND name = 'address')
      BEGIN
          ALTER TABLE Customers ADD address NVARCHAR(MAX) NULL;
      END;
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Customers') AND name = 'notes')
      BEGIN
          ALTER TABLE Customers ADD notes NVARCHAR(MAX) NULL;
      END;
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Customers') AND name = 'contact_type')
      BEGIN
          ALTER TABLE Customers ADD contact_type NVARCHAR(50) NOT NULL DEFAULT 'CUSTOMER';
      END;
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Customers') AND name = 'division')
      BEGIN
          ALTER TABLE Customers ADD division NVARCHAR(100) NULL;
      END;
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Customers') AND name = 'employee_id')
      BEGIN
          ALTER TABLE Customers ADD employee_id NVARCHAR(50) NULL;
      END;

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'avatar_url')
      BEGIN
          ALTER TABLE Users ADD avatar_url NVARCHAR(500) NULL;
      END;

      -- 1. Roles Table
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Roles')
      BEGIN
          CREATE TABLE Roles (
              id INT IDENTITY(1,1) PRIMARY KEY,
              role_code NVARCHAR(50) NOT NULL UNIQUE,
              role_name NVARCHAR(100) NOT NULL,
              description NVARCHAR(255) NULL,
              permissions NVARCHAR(MAX) NOT NULL,
              is_system BIT NOT NULL DEFAULT 0,
              created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
          );

          INSERT INTO Roles (role_code, role_name, description, permissions, is_system) VALUES
          ('ADMIN', 'Administrator Sistem', 'Akses penuh ke seluruh operasional, pengaturan pengguna, role, dan konfigurasi saluran', '["ticket_view","ticket_claim","ticket_reply","media_dispatch","ticket_resolve","whisper_internal","spv_takeover","spv_monitor","manage_users","manage_roles","manage_workspaces","manage_channels"]', 1),
          ('SUPERVISOR', 'Supervisor CS', 'Monitoring operasional, whisper note internal, dan pengambilalihan tiket', '["ticket_view","ticket_claim","ticket_reply","media_dispatch","ticket_resolve","whisper_internal","spv_takeover","spv_monitor"]', 1),
          ('AGENT', 'Customer Service Agent', 'Pelayanan tiket pelanggan, klaim antrian, balasan chat & media', '["ticket_view","ticket_claim","ticket_reply","media_dispatch","ticket_resolve"]', 1);
      END;

      -- 2. Relax Users.role check constraint & add role_id
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'role_id')
      BEGIN
          ALTER TABLE Users ADD role_id INT NULL;
      END;

      DECLARE @ConstraintName NVARCHAR(200);
      SELECT @ConstraintName = name FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('Users') AND definition LIKE '%role%';
      IF @ConstraintName IS NOT NULL
      BEGIN
          EXEC('ALTER TABLE Users DROP CONSTRAINT ' + @ConstraintName);
      END;

      UPDATE u
      SET u.role_id = r.id
      FROM Users u
      JOIN Roles r ON u.role = r.role_code
      WHERE u.role_id IS NULL;

      -- 3. Workspaces Table
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Workspaces')
      BEGIN
          CREATE TABLE Workspaces (
              id INT IDENTITY(1,1) PRIMARY KEY,
              code NVARCHAR(50) NOT NULL UNIQUE,
              name NVARCHAR(100) NOT NULL,
              description NVARCHAR(255) NULL,
              color NVARCHAR(20) NOT NULL DEFAULT '#4F46E5',
              icon NVARCHAR(50) NOT NULL DEFAULT 'briefcase',
              is_active BIT NOT NULL DEFAULT 1,
              created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
          );

          INSERT INTO Workspaces (code, name, description, color, icon, is_active) VALUES
          ('DEFAULT', 'Workspace Utama CS', 'Antrian tiket terpusat seluruh saluran', '#4F46E5', 'briefcase', 1),
          ('BILLING', 'Billing & Tagihan', 'Penanganan konfirmasi pembayaran, tagihan, dan kendala invoice', '#10B981', 'receipt', 1),
          ('SUPPORT', 'Technical Support', 'Bantuan teknis kendala jaringan dan perbaikan layanan', '#F59E0B', 'headphones', 1);
      END;

      -- 4. WorkspaceUsers Table (Multi-to-Multi)
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WorkspaceUsers')
      BEGIN
          CREATE TABLE WorkspaceUsers (
              id INT IDENTITY(1,1) PRIMARY KEY,
              workspace_id INT NOT NULL REFERENCES Workspaces(id) ON DELETE CASCADE,
              user_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
              created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
              CONSTRAINT UQ_Workspace_User UNIQUE (workspace_id, user_id)
          );

          INSERT INTO WorkspaceUsers (workspace_id, user_id)
          SELECT 1, id FROM Users
          WHERE id NOT IN (SELECT user_id FROM WorkspaceUsers WHERE workspace_id = 1);
      END;

      -- 5. WorkspaceChannels Table
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WorkspaceChannels')
      BEGIN
          CREATE TABLE WorkspaceChannels (
              id INT IDENTITY(1,1) PRIMARY KEY,
              workspace_id INT NOT NULL REFERENCES Workspaces(id) ON DELETE CASCADE,
              channel_id INT NOT NULL REFERENCES Channels(id) ON DELETE CASCADE,
              created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
              CONSTRAINT UQ_Workspace_Channel UNIQUE (workspace_id, channel_id)
          );

          INSERT INTO WorkspaceChannels (workspace_id, channel_id)
          SELECT 1, id FROM Channels
          WHERE id NOT IN (SELECT channel_id FROM WorkspaceChannels WHERE workspace_id = 1);
      END;

      -- 6. Tickets.workspace_id
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tickets') AND name = 'workspace_id')
      BEGIN
          ALTER TABLE Tickets ADD workspace_id INT NULL REFERENCES Workspaces(id);
          EXEC('CREATE INDEX IX_Tickets_Workspace ON Tickets(workspace_id)');
          EXEC('UPDATE Tickets SET workspace_id = 1 WHERE workspace_id IS NULL');
      END;

      -- Pastikan akun default inti selalu aktif
      UPDATE Users SET is_active = 1 WHERE username IN ('agent_budi', 'agent_siti', 'spv_dimas', 'admin');

      -- Normalisasi nomor LID WhatsApp jika pernah tersimpan kode acak @lid
      UPDATE Customers 
      SET phone_number = '628978136344',
          full_name = CASE WHEN full_name LIKE '%85036225298677%' THEN '628978136344' ELSE full_name END
      WHERE phone_number LIKE '%85036225298677%';

      UPDATE Customers 
      SET phone_number = '6282316853387',
          full_name = CASE WHEN full_name LIKE '%152226676867087%' THEN '6282316853387' ELSE full_name END
      WHERE phone_number LIKE '%152226676867087%';
    `);

    // Normalisasi cepat untuk Customers yang mungkin masih tersimpan kode LID
    const lidCustomers = await p.request().query(`
      SELECT id, phone_number, full_name 
      FROM Customers 
      WHERE phone_number LIKE '%@lid%' OR (channel_source = 'WHATSAPP' AND LEN(phone_number) >= 14 AND phone_number NOT LIKE '62%')
    `);

    if (lidCustomers.recordset.length > 0) {
      const sessionDir = process.env.WA_SESSION_DIR || path.join(process.cwd(), 'sessions', 'whatsapp');
      for (const row of lidCustomers.recordset) {
        const rawLid = (row.phone_number || '').replace('@lid', '').split(':')[0].trim();
        const revFile = path.join(sessionDir, `lid-mapping-${rawLid}_reverse.json`);
        if (fs.existsSync(revFile)) {
          try {
            const raw = fs.readFileSync(revFile, 'utf-8');
            const phone = JSON.parse(raw);
            if (phone) {
              const cleanPhone = phone.toString().replace(/\D/g, '');
              await p.request()
                .input('id', row.id)
                .input('phone', cleanPhone)
                .query(`
                  UPDATE Customers
                  SET phone_number = @phone,
                      full_name = CASE WHEN full_name LIKE '%${rawLid}%' THEN @phone ELSE full_name END
                  WHERE id = @id
                `);
            }
          } catch (e) {}
        }
      }
    }
    schemaChecked = true;
  } catch (err) {
    console.warn('[DB Migration] Warning verifying columns:', err);
  }
}

export async function getDbPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    await ensureSchemaUpdated(pool);
    return pool;
  }

  try {
    pool = await new sql.ConnectionPool({
      connectionString
    }).connect();
    await ensureSchemaUpdated(pool);
    return pool;
  } catch (err: any) {
    console.error('Failed to connect to MS SQL database:', err.message);
    throw err;
  }
}

export { sql };
