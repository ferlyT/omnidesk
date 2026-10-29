import { Router, Request, Response } from 'express';
import { CustomerService } from '../modules/customers/customer.service.js';
import { authMiddleware, AuthenticatedRequest } from '../modules/auth/auth.middleware.js';

const router = Router();

router.get('/customers/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const customerId = parseInt(req.params.id as string, 10);
    if (isNaN(customerId)) {
      res.status(400).json({ success: false, message: 'ID pelanggan tidak valid' });
      return;
    }
    const customer = await CustomerService.getCustomerById(customerId);
    if (!customer) {
      res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan' });
      return;
    }
    res.json({ success: true, data: customer });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/customers/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = parseInt(req.params.id as string, 10);
    if (isNaN(customerId)) {
      res.status(400).json({ success: false, message: 'ID pelanggan tidak valid' });
      return;
    }
    const updated = await CustomerService.updateCustomer(customerId, req.body, req.user);
    res.json({ success: true, message: 'Data pelanggan berhasil diperbarui', data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
