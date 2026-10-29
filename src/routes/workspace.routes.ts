import { Router, Request, Response } from 'express';
import { WorkspaceService } from '../modules/workspaces/workspace.service.js';
import { authMiddleware, roleMiddleware, AuthenticatedRequest } from '../modules/auth/auth.middleware.js';

const router = Router();

router.get('/workspaces/my', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaces = await WorkspaceService.getUserWorkspaces(req.user!.id, req.user!.role);
    res.json({ success: true, data: workspaces });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/admin/workspaces', authMiddleware, roleMiddleware(['ADMIN', 'SUPERVISOR']), async (req: Request, res: Response) => {
  try {
    const workspaces = await WorkspaceService.getAllWorkspaces();
    res.json({ success: true, data: workspaces });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/admin/workspaces', authMiddleware, roleMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { code, name, description, color, icon, member_user_ids, channel_ids } = req.body;
    const newWs = await WorkspaceService.createWorkspace({ code, name, description, color, icon, member_user_ids, channel_ids });
    res.status(201).json({ success: true, message: 'Workspace baru berhasil dibuat', data: newWs });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/admin/workspaces/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const wsId = parseInt(req.params.id as string, 10);
    if (isNaN(wsId)) {
      res.status(400).json({ success: false, message: 'ID workspace tidak valid' });
      return;
    }
    const { name, description, color, icon, is_active, member_user_ids, channel_ids } = req.body;
    const updated = await WorkspaceService.updateWorkspace(wsId, { name, description, color, icon, is_active, member_user_ids, channel_ids });
    res.json({ success: true, message: 'Workspace berhasil diperbarui', data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/admin/workspaces/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const wsId = parseInt(req.params.id as string, 10);
    if (isNaN(wsId)) {
      res.status(400).json({ success: false, message: 'ID workspace tidak valid' });
      return;
    }
    await WorkspaceService.deleteWorkspace(wsId);
    res.json({ success: true, message: 'Workspace berhasil dihapus' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/admin/workspaces/:id/members', authMiddleware, roleMiddleware(['ADMIN', 'SUPERVISOR']), async (req: Request, res: Response) => {
  try {
    const wsId = parseInt(req.params.id as string, 10);
    if (isNaN(wsId)) {
      res.status(400).json({ success: false, message: 'ID workspace tidak valid' });
      return;
    }
    const members = await WorkspaceService.getWorkspaceMembers(wsId);
    res.json({ success: true, data: members });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/admin/workspaces/:id/members', authMiddleware, roleMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const wsId = parseInt(req.params.id as string, 10);
    if (isNaN(wsId)) {
      res.status(400).json({ success: false, message: 'ID workspace tidak valid' });
      return;
    }
    const { user_ids } = req.body;
    await WorkspaceService.assignUsersToWorkspace(wsId, user_ids || []);
    res.json({ success: true, message: 'Anggota staf workspace berhasil diperbarui' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/admin/workspaces/:id/channels', authMiddleware, roleMiddleware(['ADMIN', 'SUPERVISOR']), async (req: Request, res: Response) => {
  try {
    const wsId = parseInt(req.params.id as string, 10);
    if (isNaN(wsId)) {
      res.status(400).json({ success: false, message: 'ID workspace tidak valid' });
      return;
    }
    const channels = await WorkspaceService.getWorkspaceChannels(wsId);
    res.json({ success: true, data: channels });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/admin/workspaces/:id/channels', authMiddleware, roleMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const wsId = parseInt(req.params.id as string, 10);
    if (isNaN(wsId)) {
      res.status(400).json({ success: false, message: 'ID workspace tidak valid' });
      return;
    }
    const { channel_ids } = req.body;
    await WorkspaceService.mapChannelsToWorkspace(wsId, channel_ids || []);
    res.json({ success: true, message: 'Pemetaan saluran workspace berhasil diperbarui' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
