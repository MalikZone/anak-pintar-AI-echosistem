import { Router } from 'express';
import {
  getAllHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from '../controllers/holidayController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { enforceTenant } from '../middlewares/tenantMiddleware.js';
import { authorizePermission } from '../middlewares/permissionMiddleware.js';

const router = Router();

router.use(authenticate);
router.use(enforceTenant);

router.get('/', authorizePermission('holidays.view'), getAllHolidays);
router.post(
  '/',
  authorizePermission('holidays.manage_company', 'holidays.manage_global'),
  createHoliday
);
router.get('/:id', authorizePermission('holidays.view'), getHolidayById);
router.put(
  '/:id',
  authorizePermission('holidays.manage_company', 'holidays.manage_global'),
  updateHoliday
);
router.delete(
  '/:id',
  authorizePermission('holidays.manage_company', 'holidays.manage_global'),
  deleteHoliday
);

export default router;

