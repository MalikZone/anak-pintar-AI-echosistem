import { Router } from 'express';
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  updateRolePermissions,
  getPermissionRegistry,
} from '../controllers/roleController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { enforceTenant } from '../middlewares/tenantMiddleware.js';
import { authorizePermission } from '../middlewares/permissionMiddleware.js';

const router = Router();

// Protect all role routes with auth & tenant isolation
router.use(authenticate);
router.use(enforceTenant);

// Registry endpoint must be before /:id parameter route
router.get('/permissions/registry', authorizePermission('roles.view'), getPermissionRegistry);

router.get('/', authorizePermission('roles.view'), getAllRoles);
router.post('/', authorizePermission('roles.manage'), createRole);
router.get('/:id', authorizePermission('roles.view'), getRoleById);
router.put('/:id', authorizePermission('roles.manage'), updateRole);
router.delete('/:id', authorizePermission('roles.manage'), deleteRole);
router.put('/:id/permissions', authorizePermission('roles.manage'), updateRolePermissions);

export default router;

