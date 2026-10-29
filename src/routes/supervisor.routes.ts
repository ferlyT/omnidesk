import { Router, Request, Response } from 'express';
import { SupervisorService } from '../modules/supervisor/supervisor.service.js';
import { authMiddleware, roleMiddleware } from '../modules/auth/auth.middleware.js';

const router = Router();

router.get('/supervisor/overview', authMiddleware, roleMiddleware(['ADMIN', 'SUPERVISOR']), async (req: Request, res: Response) => {
  try {
    const overview = await SupervisorService.getOverviewMetrics();
    res.json({ success: true, data: overview });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/supervisor/audit-logs', authMiddleware, roleMiddleware(['ADMIN', 'SUPERVISOR']), async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const logs = await SupervisorService.getAuditLogs(limit);
    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
