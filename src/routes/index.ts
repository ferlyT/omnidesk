import { Router } from 'express';
import authRoutes from './auth.routes.js';
import ticketRoutes from './ticket.routes.js';
import workspaceRoutes from './workspace.routes.js';
import roleRoutes from './role.routes.js';
import channelRoutes from './channel.routes.js';
import supervisorRoutes from './supervisor.routes.js';
import customerRoutes from './customer.routes.js';
import billingRoutes from './billing.routes.js';
import simulatorRoutes from './simulator.routes.js';

const router = Router();

// Mount modular sub-routers
router.use(authRoutes);
router.use(ticketRoutes);
router.use(workspaceRoutes);
router.use(roleRoutes);
router.use(channelRoutes);
router.use(supervisorRoutes);
router.use(customerRoutes);
router.use(billingRoutes);
router.use(simulatorRoutes);

export default router;
