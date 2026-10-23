import { AppError } from '../utils/appError.js';
import { tenantRepository } from '../repositories/TenantRepository.js';
import { ROLES } from '../config/constants.js';

/**
 * Middleware untuk mengunci dan mengisolasi data per tenant.
 * Memastikan request hanya mengakses data milik perusahaan/tenant user saat ini.
 * Super Admin dapat mengakses data tenant apa pun secara fleksibel.
 */
export const enforceTenant = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('auth.not_authenticated', 401));
    }

    // Super Admin cross-tenant flexibility
    if (req.user.role === ROLES.SUPER_ADMIN) {
      const targetTenantId =
        req.headers['x-tenant-id'] ||
        req.query.tenantId ||
        req.body?.tenantId ||
        req.user.tenantId;

      if (targetTenantId) {
        const tenant = await tenantRepository.findById(targetTenantId);
        if (tenant) {
          req.tenant = tenant;
          req.tenantId = tenant.id;
        } else {
          req.tenantId = targetTenantId;
        }
      }
      return next();
    }

    if (!req.user.tenantId) {
      return next(new AppError('tenant.missing_context', 403));
    }

    // Verify tenant exists
    const tenant = await tenantRepository.findById(req.user.tenantId);
    if (!tenant) {
      return next(new AppError('tenant.not_found_or_inactive', 404));
    }

    req.tenant = tenant;
    req.tenantId = tenant.id;

    // If client passes tenantId query/body, ensure it strictly matches user tenant
    const requestedTenantId = req.query.tenantId || req.body?.tenantId;
    if (requestedTenantId && requestedTenantId !== req.tenantId) {
      return next(new AppError('tenant.isolation_violation', 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};

