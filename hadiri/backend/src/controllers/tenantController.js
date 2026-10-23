import { tenantService } from '../services/tenantService.js';
import { auditLogService } from '../services/auditLogService.js';
import { authService } from '../services/authService.js';
import { sendSuccess } from '../utils/responseHandler.js';

export const getAllTenants = async (req, res, next) => {
  try {
    const includeDeleted = req.query.includeDeleted === 'true';
    const tenants = await tenantService.getAllTenants({ includeDeleted });
    return sendSuccess(res, tenants, 'tenant.list_loaded');
  } catch (error) {
    next(error);
  }
};

export const getSaasOverview = async (req, res, next) => {
  try {
    const overview = await tenantService.getPlatformOverview();
    return sendSuccess(res, overview, 'tenant.saas_overview_loaded');
  } catch (error) {
    next(error);
  }
};

export const getSubscriptionPlans = async (req, res, next) => {
  try {
    const plans = await tenantService.getSubscriptionPlans();
    return sendSuccess(res, plans, 'tenant.saas_overview_loaded');
  } catch (error) {
    next(error);
  }
};

export const updateSubscriptionPlanCatalog = async (req, res, next) => {
  try {
    const updated = await tenantService.updateSubscriptionPlanCatalog(
      req.params.code,
      req.body,
      req.user
    );
    return sendSuccess(res, updated, 'tenant.subscription_updated', 200, null, {
      name: updated.nameId || updated.name,
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await auditLogService.getAuditLogs({
      tenantId: req.query.tenantId,
      category: req.query.category,
      search: req.query.search,
      limit: req.query.limit ? Number(req.query.limit) : 100,
    });
    return sendSuccess(res, logs, 'tenant.audit_logs_loaded');
  } catch (error) {
    next(error);
  }
};

export const getTenantById = async (req, res, next) => {
  try {
    const tenant = await tenantService.getTenantById(req.params.id);
    return sendSuccess(res, tenant, 'tenant.detail_loaded');
  } catch (error) {
    next(error);
  }
};

export const createTenant = async (req, res, next) => {
  try {
    const newTenant = await tenantService.createTenant(req.body, req.user);
    return sendSuccess(res, newTenant, 'tenant.created_success', 201, null, {
      name: newTenant.name,
      id: newTenant.id,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTenant = async (req, res, next) => {
  try {
    const updated = await tenantService.updateTenant(req.params.id, req.body, req.user);
    return sendSuccess(res, updated, 'tenant.updated_success', 200, null, {
      name: updated.name,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTenantSubscription = async (req, res, next) => {
  try {
    const updated = await tenantService.updateTenantSubscription(req.params.id, req.body, req.user);
    return sendSuccess(res, updated, 'tenant.subscription_updated', 200, null, {
      name: updated.name,
    });
  } catch (error) {
    next(error);
  }
};

export const impersonateTenant = async (req, res, next) => {
  try {
    const result = await authService.impersonateTenant(req.params.id, req.user);
    return sendSuccess(res, result, 'tenant.impersonate_success', 200, null, {
      name: result.tenant?.name || req.params.id,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTenant = async (req, res, next) => {
  try {
    const deleted = await tenantService.softDeleteTenant(req.params.id, req.user);
    return sendSuccess(res, { id: deleted.id }, 'tenant.deleted_success', 200, null, {
      name: deleted.name,
      id: deleted.id,
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentTenant = async (req, res, next) => {
  try {
    const tenantId =
      req.user?.role === 'super_admin'
        ? req.query.tenantId || req.tenantId || req.user?.tenantId || 'TNT-ROOT-000001'
        : req.tenantId || req.user?.tenantId;
    const tenant = await tenantService.getTenantById(tenantId);
    return sendSuccess(res, tenant, 'tenant.detail_loaded');
  } catch (error) {
    next(error);
  }
};

export const updateCurrentTenant = async (req, res, next) => {
  try {
    const tenantId =
      req.user?.role === 'super_admin'
        ? req.body.tenantId || req.query.tenantId || req.tenantId || req.user?.tenantId || 'TNT-ROOT-000001'
        : req.tenantId || req.user?.tenantId;
    const updated = await tenantService.updateTenant(tenantId, req.body);
    return sendSuccess(res, updated, 'tenant.updated_success', 200, {
      name: updated.name,
    });
  } catch (error) {
    next(error);
  }
};

