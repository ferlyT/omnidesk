import { Router, Request, Response } from 'express';
import { TicketService } from '../modules/tickets/ticket.service.js';
import { authMiddleware, roleMiddleware, AuthenticatedRequest } from '../modules/auth/auth.middleware.js';
import { uploadLimiter } from '../middleware/rate-limiter.js';
import { mediaUpload } from '../middleware/upload.js';

const router = Router();

router.get('/tickets/pool', authMiddleware, async (req: Request, res: Response) => {
  try {
    const wsId = req.query.workspace_id ? parseInt(req.query.workspace_id as string, 10) : undefined;
    const tickets = await TicketService.getClaimPoolTickets(wsId);
    res.json({ success: true, data: tickets });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/tickets/my', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const wsId = req.query.workspace_id ? parseInt(req.query.workspace_id as string, 10) : undefined;
    const tickets = await TicketService.getMyTickets(req.user!.id, wsId);
    res.json({ success: true, data: tickets });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/tickets/all', authMiddleware, roleMiddleware(['ADMIN', 'SUPERVISOR']), async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const wsId = req.query.workspace_id ? parseInt(req.query.workspace_id as string, 10) : undefined;
    const tickets = await TicketService.getAllTickets(status, wsId);
    res.json({ success: true, data: tickets });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/tickets/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id as string, 10);
    const details = await TicketService.getTicketDetails(ticketId);
    if (!details) {
      res.status(404).json({ success: false, message: 'Tiket tidak ditemukan' });
      return;
    }
    res.json({ success: true, data: details });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/tickets/:id/claim', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id as string, 10);
    const updated = await TicketService.claimTicket(ticketId, req.user!);
    res.json({ success: true, message: 'Tiket berhasil diklaim', data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/tickets/:id/reply', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id as string, 10);
    const { content } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ success: false, message: 'Isi pesan tidak boleh kosong' });
      return;
    }
    const message = await TicketService.replyToTicket(ticketId, content.trim(), req.user!);
    res.json({ success: true, message: 'Pesan berhasil dikirim', data: message });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post(
  '/tickets/:id/reply-media',
  authMiddleware,
  uploadLimiter,
  mediaUpload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ticketId = parseInt(req.params.id as string, 10);
      const file = req.file;
      const caption = req.body.caption || '';

      if (!file) {
        res.status(400).json({ success: false, message: 'File media (gambar atau dokumen) wajib dipilih' });
        return;
      }

      const message = await TicketService.replyMediaToTicket(ticketId, file, caption, req.user!);
      res.json({ success: true, message: 'Media berhasil dikirim ke pelanggan', data: message });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.post('/tickets/:id/note', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id as string, 10);
    const { note } = req.body;
    if (!note || !note.trim()) {
      res.status(400).json({ success: false, message: 'Catatan internal tidak boleh kosong' });
      return;
    }
    const internalNote = await TicketService.addInternalNote(ticketId, note.trim(), req.user!);
    res.json({ success: true, message: 'Catatan internal berhasil disimpan', data: internalNote });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/tickets/:id/takeover', authMiddleware, roleMiddleware(['ADMIN', 'SUPERVISOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id as string, 10);
    const { targetAgentId, reason } = req.body;
    const updated = await TicketService.takeoverTicket(ticketId, req.user!, targetAgentId, reason);
    res.json({ success: true, message: 'Tiket berhasil diambil alih / dialihkan', data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/tickets/:id/resolve', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id as string, 10);
    const updated = await TicketService.resolveTicket(ticketId, req.user!);
    res.json({ success: true, message: 'Tiket berhasil diselesaikan', data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
