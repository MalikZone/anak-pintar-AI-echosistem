import { Router } from 'express';
import {
  submitLeave,
  getMyLeaves,
  getTeamPendingLeaves,
  leaderAction,
  getHrPendingLeaves,
  hrAction,
  getAllLeaves,
} from '../controllers/leaveController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { enforceTenant } from '../middlewares/tenantMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate, enforceTenant);

// Karyawan endpoints
router.post('/', submitLeave);
router.get('/my', getMyLeaves);

// Leader endpoints (Tahap 1 Persetujuan)
router.get('/team-pending', authorize(ROLES.LEADER, ROLES.HR_ADMIN), getTeamPendingLeaves);
router.patch('/:id/leader-action', authorize(ROLES.LEADER, ROLES.HR_ADMIN), leaderAction);

// HR Admin endpoints (Tahap 2 Persetujuan Final)
router.get('/hr-pending', authorize(ROLES.HR_ADMIN), getHrPendingLeaves);
router.patch('/:id/hr-action', authorize(ROLES.HR_ADMIN), hrAction);
router.get('/', authorize(ROLES.HR_ADMIN), getAllLeaves);

export default router;

