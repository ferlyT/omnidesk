import { Router, Request, Response } from 'express';
import { AuthService } from '../modules/auth/auth.service.js';
import { authMiddleware, roleMiddleware, AuthenticatedRequest } from '../modules/auth/auth.middleware.js';
import { authLimiter, uploadLimiter } from '../middleware/rate-limiter.js';
import { avatarUpload } from '../middleware/upload.js';

const router = Router();

// ========================
// AUTHENTICATION ROUTES
// ========================
router.post('/auth/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
      return;
    }
    const result = await AuthService.login(username, password);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(401).json({ success: false, message: err.message });
  }
});

router.get('/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, user: req.user });
});

router.get('/auth/users', authMiddleware, roleMiddleware(['ADMIN', 'SUPERVISOR']), async (req: Request, res: Response) => {
  try {
    const roleFilter = req.query.role as string;
    const users = await AuthService.getUsers(roleFilter);
    res.json({ success: true, data: users, users });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================
// ADMIN USER MANAGEMENT
// ========================
router.post('/admin/users', authMiddleware, roleMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { username, display_alias, email, password, role, avatar_url, is_active } = req.body;
    const newUser = await AuthService.createUser({
      username,
      display_alias,
      email,
      passwordPlain: password,
      role,
      avatar_url,
      is_active
    });
    res.status(201).json({ success: true, message: 'Pengguna baru berhasil dibuat', data: newUser });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/admin/users/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string, 10);
    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: 'ID pengguna tidak valid' });
      return;
    }
    const { display_alias, email, role, password, avatar_url, is_active } = req.body;
    const updated = await AuthService.updateUser(userId, {
      display_alias,
      email,
      role,
      passwordPlain: password,
      avatar_url,
      is_active
    });
    res.json({ success: true, message: 'Data pengguna berhasil diperbarui', data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/admin/users/:id/status', authMiddleware, roleMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string, 10);
    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: 'ID pengguna tidak valid' });
      return;
    }
    const { is_active } = req.body;
    const updated = await AuthService.toggleUserActive(userId, Boolean(is_active));
    res.json({ success: true, message: `Status akun berhasil ${is_active ? 'diaktifkan' : 'dinonaktifkan'}`, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post(
  '/admin/users/:id/avatar',
  authMiddleware,
  roleMiddleware(['ADMIN']),
  uploadLimiter,
  avatarUpload.single('avatar'),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id as string, 10);
      if (isNaN(userId)) {
        res.status(400).json({ success: false, message: 'ID pengguna tidak valid' });
        return;
      }
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Berkas avatar wajib diunggah' });
        return;
      }
      const avatarUrl = `/uploads/images/${req.file.filename}`;
      const updated = await AuthService.updateUser(userId, { avatar_url: avatarUrl });
      res.json({ success: true, message: 'Avatar berhasil diunggah', data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;
