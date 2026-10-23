import { Router } from 'express';
import {
  submitOvertime,
  getMyOvertimes,
  getTenantOvertimes,
  getTeamPendingOvertimes,
  getHrPendingOvertimes,
  leaderApproval,
  hrApproval,
} from '../controllers/overtimeController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { enforceTenant } from '../middlewares/tenantMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate, enforceTenant);

router.post('/', submitOvertime);
router.get('/my', getMyOvertimes);
router.get('/tenant', authorize(ROLES.HR_ADMIN, ROLES.LEADER), getTenantOvertimes);
router.get('/team-pending', authorize(ROLES.LEADER, ROLES.HR_ADMIN), getTeamPendingOvertimes);
router.get('/hr-pending', authorize(ROLES.HR_ADMIN), getHrPendingOvertimes);
router.patch('/:id/leader-action', authorize(ROLES.LEADER, ROLES.HR_ADMIN, ROLES.SUPER_ADMIN), leaderApproval);
router.patch('/:id/hr-action', authorize(ROLES.HR_ADMIN, ROLES.SUPER_ADMIN), hrApproval);

export default router;

