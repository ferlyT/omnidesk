import { Router, Request, Response } from 'express';
import { RoleService, ALL_PERMISSIONS } from '../modules/roles/role.service.js';
import { authMiddleware, roleMiddleware } from '../modules/auth/auth.middleware.js';

const router = Router();

router.get('/admin/roles/permissions-list', authMiddleware, (req: Request, res: Response) => {
  res.json({ success: true, data: ALL_PERMISSIONS });
});

router.get('/admin/roles', authMiddleware, roleMiddleware(['ADMIN', 'SUPERVISOR']), async (req: Request, res: Response) => {
  try {
    const roles = await RoleService.getAllRoles();
    res.json({ success: true, data: roles });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/admin/roles', authMiddleware, roleMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { role_code, role_name, description, permissions } = req.body;
    const newRole = await RoleService.createRole({ role_code, role_name, description, permissions });
    res.status(201).json({ success: true, message: 'Role baru berhasil dibuat', data: newRole });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/admin/roles/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const roleId = parseInt(req.params.id as string, 10);
    if (isNaN(roleId)) {
      res.status(400).json({ success: false, message: 'ID role tidak valid' });
      return;
    }
    const { role_name, description, permissions } = req.body;
    const updated = await RoleService.updateRole(roleId, { role_name, description, permissions });
    res.json({ success: true, message: 'Role berhasil diperbarui', data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/admin/roles/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const roleId = parseInt(req.params.id as string, 10);
    if (isNaN(roleId)) {
      res.status(400).json({ success: false, message: 'ID role tidak valid' });
      return;
    }
    await RoleService.deleteRole(roleId);
    res.json({ success: true, message: 'Role berhasil dihapus' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
