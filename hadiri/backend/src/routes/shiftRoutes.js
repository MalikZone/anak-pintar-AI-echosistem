import { Router } from 'express';
import {
  getShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
} from '../controllers/shiftController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { enforceTenant } from '../middlewares/tenantMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate, enforceTenant);

// Public to tenant members
router.get('/', getShifts);
router.get('/:id', getShiftById);

// HR Admin & Super Admin restricted
router.post('/', authorize(ROLES.HR_ADMIN, ROLES.SUPER_ADMIN), createShift);
router.put('/:id', authorize(ROLES.HR_ADMIN, ROLES.SUPER_ADMIN), updateShift);
router.delete('/:id', authorize(ROLES.HR_ADMIN, ROLES.SUPER_ADMIN), deleteShift);

export default router;
