import bcrypt from 'bcryptjs';
import { getDbPool } from './connection.js';

async function seed() {
  console.log('Seeding MS SQL database...');
  const pool = await getDbPool();

  // 1. Seed Users
  const users = [
    {
      username: 'admin',
      display_alias: 'System Admin',
      email: 'admin@omnichannel.local',
      password: 'Admin123!',
      role: 'ADMIN'
    },
    {
      username: 'spv_dimas',
      display_alias: 'SPV Dimas',
      email: 'dimas.spv@omnichannel.local',
      password: 'Spv123!',
      role: 'SUPERVISOR'
    },
    {
      username: 'agent_budi',
      display_alias: 'CS Budi',
      email: 'budi.cs@omnichannel.local',
      password: 'Agent123!',
      role: 'AGENT'
    },
    {
      username: 'agent_siti',
      display_alias: 'CS Siti',
      email: 'siti.cs@omnichannel.local',
      password: 'Agent123!',
      role: 'AGENT'
    }
  ];

  for (const user of users) {
    const existing = await pool.request()
      .input('username', user.username)
      .query('SELECT id FROM Users WHERE username = @username');

    if (existing.recordset.length === 0) {
      const hash = await bcrypt.hash(user.password, 10);
      await pool.request()
        .input('username', user.username)
        .input('display_alias', user.display_alias)
        .input('email', user.email)
        .input('password_hash', hash)
        .input('role', user.role)
        .query(`
          INSERT INTO Users (username, display_alias, email, password_hash, role)
          VALUES (@username, @display_alias, @email, @password_hash, @role)
        `);
      console.log(`Created user: ${user.username} (${user.role}) with alias "${user.display_alias}"`);
    } else {
      console.log(`User already exists: ${user.username}`);
    }
  }

  // 2. Seed Channels
  const channels = [
    {
      channel_type: 'WHATSAPP',
      account_identifier: '+6281234567890 (Main CS WA)',
      prefix_template: '*[{display_alias}]*:',
      prefix_mode: 'ALWAYS'
    },
    {
      channel_type: 'TELEGRAM',
      account_identifier: '@OmniSupportAccount (Main CS Tele)',
      prefix_template: '`[{display_alias}]`:',
      prefix_mode: 'ALWAYS'
    }
  ];

  for (const ch of channels) {
    const existing = await pool.request()
      .input('channel_type', ch.channel_type)
      .query('SELECT id FROM Channels WHERE channel_type = @channel_type');

    if (existing.recordset.length === 0) {
      await pool.request()
        .input('channel_type', ch.channel_type)
        .input('account_identifier', ch.account_identifier)
        .input('prefix_template', ch.prefix_template)
        .input('prefix_mode', ch.prefix_mode)
        .query(`
          INSERT INTO Channels (channel_type, account_identifier, prefix_template, prefix_mode, status)
          VALUES (@channel_type, @account_identifier, @prefix_template, @prefix_mode, 'DISCONNECTED')
        `);
      console.log(`Created channel: ${ch.channel_type}`);
    } else {
      console.log(`Channel already exists: ${ch.channel_type}`);
    }
  }

  // 3. Seed SLA Policy
  const existingSLA = await pool.request().query('SELECT id FROM SLAPolicies WHERE name = \'Default CS SLA\'');
  if (existingSLA.recordset.length === 0) {
    await pool.request().query(`
      INSERT INTO SLAPolicies (name, max_first_response_minutes, max_resolution_hours, is_active)
      VALUES ('Default CS SLA', 5, 24, 1)
    `);
    console.log('Created default SLA policy (5 min FRT, 24h Resolution)');
  }

  console.log('Database seeding complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
