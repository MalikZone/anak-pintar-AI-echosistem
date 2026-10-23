import { Router } from 'express';
import authRoutes from './authRoutes.js';
import shiftRoutes from './shiftRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import leaveRoutes from './leaveRoutes.js';
import overtimeRoutes from './overtimeRoutes.js';
import userRoutes from './userRoutes.js';
import tenantRoutes from './tenantRoutes.js';
import rosterRoutes from './rosterRoutes.js';
import roleRoutes from './roleRoutes.js';
import departmentRoutes from './departmentRoutes.js';
import positionRoutes from './positionRoutes.js';
import locationRoutes from './locationRoutes.js';
import holidayRoutes from './holidayRoutes.js';
import leaveTypeRoutes from './leaveTypeRoutes.js';
import attendanceCorrectionRoutes from './attendanceCorrectionRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import assistantRoutes from './assistantRoutes.js';
import telegramWebhookRoutes from '../interfaces/telegram/telegramWebhookRoutes.js';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: req.t ? req.t('system.healthy') : 'Hadirin Backend API is operational & healthy 🚀',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Mount domain routes
router.use('/auth', authRoutes);
router.use('/shifts', shiftRoutes);
router.use('/rosters', rosterRoutes);
router.use('/attendances', attendanceRoutes);
router.use('/leaves', leaveRoutes);
router.use('/overtimes', overtimeRoutes);
router.use('/users', userRoutes);
router.use('/tenants', tenantRoutes);
router.use('/roles', roleRoutes);
router.use('/departments', departmentRoutes);
router.use('/positions', positionRoutes);
router.use('/locations', locationRoutes);
router.use('/holidays', holidayRoutes);
router.use('/leave-types', leaveTypeRoutes);
router.use('/attendance-corrections', attendanceCorrectionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/assistant', assistantRoutes);
router.use('/telegram', telegramWebhookRoutes);

export default router;

