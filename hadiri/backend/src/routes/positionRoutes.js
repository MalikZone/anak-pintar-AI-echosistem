import { Router } from 'express';
import {
  getAllPositions,
  getPositionById,
  createPosition,
  updatePosition,
  deletePosition,
} from '../controllers/positionController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { enforceTenant } from '../middlewares/tenantMiddleware.js';
import { authorizePermission } from '../middlewares/permissionMiddleware.js';

const router = Router();

router.use(authenticate);
router.use(enforceTenant);

router.get('/', authorizePermission('positions.view'), getAllPositions);
router.post('/', authorizePermission('positions.manage'), createPosition);
router.get('/:id', authorizePermission('positions.view'), getPositionById);
router.put('/:id', authorizePermission('positions.manage'), updatePosition);
router.delete('/:id', authorizePermission('positions.manage'), deletePosition);

export default router;

