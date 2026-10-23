import { Router } from 'express';
import {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
} from '../controllers/locationController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { enforceTenant } from '../middlewares/tenantMiddleware.js';
import { authorizePermission } from '../middlewares/permissionMiddleware.js';

const router = Router();

router.use(authenticate);
router.use(enforceTenant);

router.get('/', authorizePermission('locations.view'), getAllLocations);
router.post('/', authorizePermission('locations.manage'), createLocation);
router.get('/:id', authorizePermission('locations.view'), getLocationById);
router.put('/:id', authorizePermission('locations.manage'), updateLocation);
router.delete('/:id', authorizePermission('locations.manage'), deleteLocation);

export default router;

