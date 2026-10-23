import { Router } from 'express';
import {
  getMyRoster,
  getTeamRosterMatrix,
  assignRoster,
  bulkGenerateRoster,
  requestShiftSwitch,
  getMyShiftSwitches,
  getShiftSwitches,
  reviewShiftSwitch,
} from '../controllers/rosterController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { enforceTenant } from '../middlewares/tenantMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate, enforceTenant);

// Personal Roster
router.get('/my', getMyRoster);
router.get('/my-roster', getMyRoster);

// Team Roster Matrix (Leader, HR Admin, Super Admin)
router.get(
  '/team',
  authorize(ROLES.LEADER, ROLES.HR_ADMIN, ROLES.SUPER_ADMIN),
  getTeamRosterMatrix
);

// Assign Roster to Individual (Leader, HR Admin, Super Admin)
router.post(
  '/assign',
  authorize(ROLES.LEADER, ROLES.HR_ADMIN, ROLES.SUPER_ADMIN),
  assignRoster
);

// Bulk Generate Roster (HR Admin, Super Admin)
router.post(
  '/bulk-generate',
  authorize(ROLES.HR_ADMIN, ROLES.SUPER_ADMIN),
  bulkGenerateRoster
);

// Personal Shift Switch Requests (Staff/Employee)
router.get('/switch-requests/my', getMyShiftSwitches);

// Shift Switch Requests (Employees submit & view theirs, Leaders/HR review)
router.post('/switch-request', requestShiftSwitch);
router.get(
  '/switch-requests',
  authorize(ROLES.EMPLOYEE, ROLES.LEADER, ROLES.HR_ADMIN, ROLES.SUPER_ADMIN),
  getShiftSwitches
);
router.put(
  '/switch-requests/:id/review',
  authorize(ROLES.LEADER, ROLES.HR_ADMIN, ROLES.SUPER_ADMIN),
  reviewShiftSwitch
);

export default router;

