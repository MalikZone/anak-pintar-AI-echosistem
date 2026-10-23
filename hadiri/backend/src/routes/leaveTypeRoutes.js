import { Router } from 'express';
import {
  getAllLeaveTypes,
  getLeaveTypeById,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
} from '../controllers/leaveTypeController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { enforceTenant } from '../middlewares/tenantMiddleware.js';
import { authorizePermission } from '../middlewares/permissionMiddleware.js';

const router = Router();

router.use(authenticate);
router.use(enforceTenant);

router.get('/', authorizePermission('leaves.view_policies'), getAllLeaveTypes);
router.post(
  '/',
  authorizePermission('leaves.manage_policies', 'leaves.manage_global_policies'),
  createLeaveType
);
router.get('/:id', authorizePermission('leaves.view_policies'), getLeaveTypeById);
router.put(
  '/:id',
  authorizePermission('leaves.manage_policies', 'leaves.manage_global_policies'),
  updateLeaveType
);
router.delete(
  '/:id',
  authorizePermission('leaves.manage_policies', 'leaves.manage_global_policies'),
  deleteLeaveType
);

export default router;

