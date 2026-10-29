import { Router, Request, Response } from 'express';
import { authMiddleware, roleMiddleware } from '../modules/auth/auth.middleware.js';
import { WhatsAppGatewayService } from '../modules/channels/whatsapp/whatsapp.service.js';
import { TelegramGatewayService } from '../modules/channels/telegram/telegram.service.js';
import { WorkspaceService } from '../modules/workspaces/workspace.service.js';
import { getDbPool } from '../database/connection.js';

const router = Router();

router.post('/admin/channels/whatsapp', authMiddleware, roleMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { account_identifier, workspace_id } = req.body;
    const pool = await getDbPool();
    const result = await pool.request()
      .input('type', 'WHATSAPP')
      .input('ident', account_identifier || 'WA CS Baru')
      .query(`
        INSERT INTO Channels (channel_type, account_identifier, status, enable_agent_prefix, prefix_template, prefix_mode)
        OUTPUT INSERTED.id, INSERTED.channel_type, INSERTED.account_identifier, INSERTED.status
        VALUES (@type, @ident, 'DISCONNECTED', 1, '*[{display_alias}]*:', 'ALWAYS')
      `);

    const newChannel = result.recordset[0];
    if (workspace_id) {
      await WorkspaceService.mapChannelsToWorkspace(parseInt(workspace_id, 10), [newChannel.id]);
    }
    res.status(201).json({ success: true, message: 'Saluran WhatsApp baru berhasil dibuat', data: newChannel });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/channels', authMiddleware, async (req: Request, res: Response) => {
  try {
    const pool = await getDbPool();
    const result = await pool.request().query(`
      SELECT id, channel_type, account_identifier, status, enable_agent_prefix, prefix_template, prefix_mode, last_connected_at
      FROM Channels
    `);
    res.json({ success: true, data: result.recordset });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/channels/:id/prefix-config', authMiddleware, roleMiddleware(['ADMIN', 'SUPERVISOR']), async (req: Request, res: Response) => {
  try {
    const channelId = parseInt(req.params.id as string, 10);
    if (isNaN(channelId)) {
      res.status(400).json({ success: false, message: 'ID saluran tidak valid' });
      return;
    }
    const { enable_agent_prefix, prefix_template, prefix_mode } = req.body;
    const pool = await getDbPool();
    await pool.request()
      .input('id', channelId)
      .input('enable', enable_agent_prefix ? 1 : 0)
      .input('template', prefix_template || '*[{display_alias}]*:')
      .input('mode', prefix_mode || 'ALWAYS')
      .query(`
        UPDATE Channels
        SET enable_agent_prefix = @enable,
            prefix_template = @template,
            prefix_mode = @mode
        WHERE id = @id
      `);
    res.json({ success: true, message: 'Konfigurasi prefix agen berhasil diperbarui' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/channels/whatsapp/status', authMiddleware, (req: Request, res: Response) => {
  res.json({ success: true, data: WhatsAppGatewayService.getInstance().getStatus() });
});

router.post('/channels/whatsapp/reconnect', authMiddleware, roleMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    await WhatsAppGatewayService.getInstance().initialize();
    res.json({ success: true, message: 'Menginisialisasi ulang koneksi WhatsApp...' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/channels/telegram/status', authMiddleware, (req: Request, res: Response) => {
  res.json({ success: true, data: TelegramGatewayService.getInstance().getStatus() });
});

router.post('/channels/telegram/send-code', authMiddleware, roleMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      res.status(400).json({ success: false, message: 'Nomor telepon Telegram wajib diisi' });
      return;
    }
    const result = await TelegramGatewayService.getInstance().requestLoginCode(phoneNumber);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/channels/telegram/verify-code', authMiddleware, roleMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { code, password } = req.body;
    if (!code && !password) {
      res.status(400).json({ success: false, message: 'Kode OTP atau Password 2FA wajib diisi' });
      return;
    }
    const result = await TelegramGatewayService.getInstance().submitLoginCode(code, password);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
