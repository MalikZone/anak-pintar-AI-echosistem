import { AppError } from '../utils/appError.js';
import { ROLES } from '../config/constants.js';

/**
 * Role-Based Access Control (RBAC) middleware
 * @param  {...string} allowedRoles - Contoh: ('hr_admin') atau ('leader', 'hr_admin')
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('auth.not_authenticated', 401));
    }

    // Super Admin has full platform access to all endpoints
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('auth.role_forbidden', 403, { currentRole: req.user.role })
      );
    }

    next();
  };
};

