import { Router, Request, Response } from 'express';
import { BillingService } from '../modules/billing/billing.service.js';
import { authMiddleware } from '../modules/auth/auth.middleware.js';

const router = Router();

router.get('/billing/lookup', authMiddleware, async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    if (!query) {
      res.status(400).json({ success: false, message: 'Query pencarian pelanggan wajib diisi' });
      return;
    }
    const result = await BillingService.lookupCustomerBilling(query);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
