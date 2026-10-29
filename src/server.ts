import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';
import router from './routes.js';
import { SocketHub } from './realtime/socket.hub.js';
import { getDbPool } from './database/connection.js';
import { WhatsAppGatewayService } from './modules/channels/whatsapp/whatsapp.service.js';
import { TelegramGatewayService } from './modules/channels/telegram/telegram.service.js';
import { TicketService } from './modules/tickets/ticket.service.js';
import { apiLimiter } from './middleware/rate-limiter.js';
import { errorHandler } from './middleware/error.middleware.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// 1. Security Headers (Helmet with CDN-safe CSP)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdn.tailwindcss.com",
          "https://unpkg.com"
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        upgradeInsecureRequests: null
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// 2. CORS Security
const allowedOrigin = process.env.CORS_ORIGIN || '*';
app.use(
  cors({
    origin: allowedOrigin === '*' ? '*' : allowedOrigin.split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// 3. Body Parsers with payload limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 4. Rate Limiting on API routes
app.use('/api', apiLimiter);

// 5. Serve Static Frontend & Safe Uploads
const publicDir = path.join(process.cwd(), 'public');
app.use(express.static(publicDir));

// 6. Mount API routes
app.use('/api', router);

// Health check with database readiness probe
app.get('/api/health', async (req, res) => {
  let dbStatus = 'connected';
  try {
    const pool = await getDbPool();
    await pool.request().query('SELECT 1 AS alive');
  } catch (err: any) {
    dbStatus = `unreachable: ${err.message}`;
  }

  res.json({
    status: dbStatus === 'connected' ? 'online' : 'degraded',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    service: 'OmniDesk Multi-Channel Platform'
  });
});

// Fallback to single page app index.html
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads/')) {
    return res.sendFile(path.join(publicDir, 'index.html'));
  }
  next();
});

// 7. Centralized Error Handling Middleware
app.use(errorHandler);

// Setup Gateway Inbound Handlers
const waGateway = WhatsAppGatewayService.getInstance();
waGateway.setInboundHandler(async (inboundData) => {
  console.log(`[Inbound WA] from ${inboundData.senderName} (${inboundData.senderId}): ${inboundData.content}`);
  await TicketService.handleInboundMessage(inboundData);
});

const tgGateway = TelegramGatewayService.getInstance();
tgGateway.setInboundHandler(async (inboundData) => {
  console.log(`[Inbound TG] from ${inboundData.senderName} (${inboundData.senderId}): ${inboundData.content}`);
  await TicketService.handleInboundMessage(inboundData);
});

// Initialize Socket.io Hub
SocketHub.getInstance().init(server);

// SLA Breach Checker (Setiap 1 menit)
setInterval(async () => {
  try {
    const pool = await getDbPool();
    // Cari tiket yang sudah lebih dari 5 menit belum direspons
    const breachRes = await pool.request().query(`
      UPDATE Tickets
      SET is_sla_breached = 1
      OUTPUT INSERTED.id, INSERTED.ticket_number
      WHERE is_sla_breached = 0
        AND status IN ('UNASSIGNED', 'ASSIGNED')
        AND DATEDIFF(MINUTE, created_at, SYSDATETIMEOFFSET()) >= 5
    `);

    if (breachRes.recordset.length > 0) {
      console.warn(`[SLA Watcher] ${breachRes.recordset.length} tiket melanggar SLA batas respon!`);
    }
  } catch (err) {
    // Ignore periodic check errors
  }
}, 60 * 1000);

// Auto-Close Inactive Tickets (Setiap 15 menit)
setInterval(async () => {
  try {
    const closedCount = await TicketService.autoCloseInactiveTickets();
    if (closedCount > 0) {
      console.log(`[Auto-Close Cron] ${closedCount} tiket inaktif berhasil ditutup otomatis`);
    }
  } catch (err) {
    console.error('[Auto-Close Cron] Error:', err);
  }
}, 15 * 60 * 1000);

const PORT = parseInt(process.env.PORT || '3001', 10);

// Graceful Shutdown Handler
let isShuttingDown = false;
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[Server] Diterima sinyal ${signal}. Memulai proses graceful shutdown...`);

  server.close(async () => {
    console.log('[Server] Server HTTP telah ditutup.');
    try {
      const pool = await getDbPool();
      await pool.close();
      console.log('[Database] Koneksi MS SQL database pool ditutup dengan aman.');
    } catch (err) {
      console.error('[Database] Kesalahan saat menutup pool:', err);
    }
    process.exit(0);
  });

  // Force exit if hanging beyond 10s
  setTimeout(() => {
    console.error('[Server] Penghentian paksa karena melebihi batas waktu 10 detik.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export async function startServer() {
  try {
    console.log('Connecting to MS SQL Database...');
    await getDbPool();
    console.log('MS SQL Database connection established successfully!');

    // Inisialisasi WhatsApp Gateway background process
    waGateway.initialize().catch((err) => {
      console.warn('[WhatsApp Gateway] Background init note:', err.message);
    });

    // Inisialisasi Telegram Gateway background process
    tgGateway.initialize().catch((err) => {
      console.warn('[Telegram Gateway] Background init note:', err.message);
    });

    server.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 OmniDesk Multi-Agent Platform is RUNNING!`);
      console.log(`🌐 Server Port : http://localhost:${PORT}`);
      console.log(`🗄️  Database    : Database Terpusat (BillingOmnichannel)`);
      console.log(`📱 WhatsApp    : Self-Hosted QR Multi-Device`);
      console.log(`✈️  Telegram    : User Account Session`);
      console.log(`👥 Multi-Agent : Manual Claim Pool & Dynamic Prefix`);
      console.log(`👁️  Supervisor  : Live Monitoring, Whispering & Takeover`);
      console.log(`🛡️  Security    : Helmet CSP, Rate Limiting & Strict Uploads`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Fatal Server Startup Error:', err);
    process.exit(1);
  }
}

import { fileURLToPath } from 'url';

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  startServer();
}

export { app, server };
