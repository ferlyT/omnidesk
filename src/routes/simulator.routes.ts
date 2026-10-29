import { Router, Request, Response } from 'express';
import { TicketService } from '../modules/tickets/ticket.service.js';
import { authMiddleware, roleMiddleware, AuthenticatedRequest } from '../modules/auth/auth.middleware.js';

const router = Router();

// ========================
// SIMULATOR INBOUND (SECURED FOR INTERNAL TESTING & DEMO)
// ========================
// Strict guard: Only authenticated ADMIN and SUPERVISOR users can inject simulation messages
router.post(
  '/simulator/inbound',
  authMiddleware,
  roleMiddleware(['ADMIN', 'SUPERVISOR']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { channelType, senderId, senderName, content, messageType, mediaUrl } = req.body;
      if (!channelType || !senderId || !content) {
        res.status(400).json({ success: false, message: 'channelType, senderId, dan content wajib diisi' });
        return;
      }

      const channelId = channelType === 'WHATSAPP' ? 1 : 2;
      await TicketService.handleInboundMessage({
        channelType,
        channelId,
        senderId,
        senderName: senderName || 'Customer Simulator',
        content,
        messageType: messageType || 'TEXT',
        mediaUrl: mediaUrl || undefined,
        externalMessageId: `sim_${Date.now()}`,
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: `Pesan simulasi dari ${senderName} (${channelType}) berhasil diterima ke antrean tiket`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;
