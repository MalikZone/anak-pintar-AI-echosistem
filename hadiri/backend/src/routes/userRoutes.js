import { Router } from 'express';
import {
  getDirectory,
  getMyTeam,
  getUserHierarchy,
  getEmployeeDetail,
  getEmployeeByTelegramId,
  createEmployee,
  bulkImportEmployees,
  updateEmployee,
  deleteEmployee,
  getMyProfile,
  updateMyProfile,
  changePassword,
  resetEmployeePassword,
} from '../controllers/userController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { enforceTenant } from '../middlewares/tenantMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = Router();

// All user routes require authentication & tenant context
router.use(authenticate, enforceTenant);

// 1. Self Profile & Security Routes (All Authenticated Users)
router.get('/me/profile', getMyProfile);
router.put('/me/profile', updateMyProfile);
router.put('/me/change-password', changePassword);

// 2. Directory, Team & Hierarchy
router.get('/directory', getDirectory);
router.get('/by-telegram/:telegramId', getEmployeeByTelegramId);
router.get('/team', authorize(ROLES.LEADER, ROLES.HR_ADMIN), getMyTeam);
router.get('/hierarchy', getUserHierarchy);
router.get('/hierarchy/:id', getUserHierarchy);

// 3. Employee Management CRUD & Admin Operations (HR Admin)
router.post('/bulk-import', authorize(ROLES.HR_ADMIN, ROLES.SUPER_ADMIN), bulkImportEmployees);
router.post('/', authorize(ROLES.HR_ADMIN), createEmployee);
router.get('/:id', authorize(ROLES.HR_ADMIN, ROLES.LEADER), getEmployeeDetail);
router.put('/:id', authorize(ROLES.HR_ADMIN), updateEmployee);
router.delete('/:id', authorize(ROLES.HR_ADMIN), deleteEmployee);
router.post('/:id/reset-password', authorize(ROLES.HR_ADMIN), resetEmployeePassword);

export default router;
