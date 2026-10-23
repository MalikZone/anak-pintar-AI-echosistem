import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';
import { ROLES } from '../config/constants.js';
import {
  submitCorrection,
  getMyCorrections,
  getTeamPending,
  getHrPending,
  leaderAction,
  hrAction,
} from '../controllers/attendanceCorrectionController.js';

const router = Router();

router.use(authenticate);

// Employee routes
router.post('/', submitCorrection);
router.get('/my', getMyCorrections);

// Leader routes
router.get('/team-pending', authorize(ROLES.LEADER, ROLES.HR_ADMIN, ROLES.SUPER_ADMIN), getTeamPending);
router.patch('/:id/leader-action', authorize(ROLES.LEADER, ROLES.HR_ADMIN, ROLES.SUPER_ADMIN), leaderAction);

// HR Admin routes
router.get('/hr-pending', authorize(ROLES.HR_ADMIN, ROLES.SUPER_ADMIN), getHrPending);
router.patch('/:id/hr-action', authorize(ROLES.HR_ADMIN, ROLES.SUPER_ADMIN), hrAction);

export default router;

