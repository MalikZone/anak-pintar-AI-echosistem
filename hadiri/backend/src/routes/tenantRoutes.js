import { Router } from 'express';
import {
  getAllTenants,
  getSaasOverview,
  getSubscriptionPlans,
  updateSubscriptionPlanCatalog,
  getAuditLogs,
  getTenantById,
  createTenant,
  updateTenant,
  updateTenantSubscription,
  impersonateTenant,
  deleteTenant,
  getCurrentTenant,
  updateCurrentTenant,
} from '../controllers/tenantController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticate);

// Current Tenant Settings (HR Admin & Super Admin)
router.get('/current', authorize(ROLES.HR_ADMIN, ROLES.SUPER_ADMIN), getCurrentTenant);
router.put('/current', authorize(ROLES.HR_ADMIN, ROLES.SUPER_ADMIN), updateCurrentTenant);

// SaaS Executive Overview, Master Plans & Security Audit Logs (Super Admin only)
router.get('/saas/overview', authorize(ROLES.SUPER_ADMIN), getSaasOverview);
router.get('/saas/plans', authorize(ROLES.SUPER_ADMIN), getSubscriptionPlans);
router.put('/saas/plans/:code', authorize(ROLES.SUPER_ADMIN), updateSubscriptionPlanCatalog);
router.get('/saas/audit-logs', authorize(ROLES.SUPER_ADMIN), getAuditLogs);

// SaaS Governance (Super Admin only)
router.get('/', authorize(ROLES.SUPER_ADMIN), getAllTenants);
router.post('/', authorize(ROLES.SUPER_ADMIN), createTenant);
router.get('/:id', authorize(ROLES.SUPER_ADMIN), getTenantById);
router.put('/:id', authorize(ROLES.SUPER_ADMIN), updateTenant);
router.put('/:id/subscription', authorize(ROLES.SUPER_ADMIN), updateTenantSubscription);
router.post('/:id/impersonate', authorize(ROLES.SUPER_ADMIN), impersonateTenant);
router.delete('/:id', authorize(ROLES.SUPER_ADMIN), deleteTenant);

export default router;

