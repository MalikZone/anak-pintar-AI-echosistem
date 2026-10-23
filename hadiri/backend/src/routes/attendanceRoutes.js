import { Router } from 'express';
import {
  clockIn,
  clockOut,
  getTodayStatus,
  getHistory,
  getTenantTodayAttendance,
  getMonthlyReport,
} from '../controllers/attendanceController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { enforceTenant } from '../middlewares/tenantMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate, enforceTenant);

router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/today', getTodayStatus);
router.get('/history', getHistory);
router.get('/tenant-today', authorize(ROLES.HR_ADMIN, ROLES.LEADER), getTenantTodayAttendance);
router.get('/report', authorize(ROLES.HR_ADMIN, ROLES.SUPER_ADMIN), getMonthlyReport);

export default router;

