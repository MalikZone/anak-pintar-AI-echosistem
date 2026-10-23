import { Router } from 'express';
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/departmentController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { enforceTenant } from '../middlewares/tenantMiddleware.js';
import { authorizePermission } from '../middlewares/permissionMiddleware.js';

const router = Router();

router.use(authenticate);
router.use(enforceTenant);

router.get('/', authorizePermission('departments.view'), getAllDepartments);
router.post('/', authorizePermission('departments.manage'), createDepartment);
router.get('/:id', authorizePermission('departments.view'), getDepartmentById);
router.put('/:id', authorizePermission('departments.manage'), updateDepartment);
router.delete('/:id', authorizePermission('departments.manage'), deleteDepartment);

export default router;

