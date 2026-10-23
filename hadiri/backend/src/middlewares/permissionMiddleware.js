import { AppError } from '../utils/appError.js';
import { ROLES } from '../config/constants.js';

/**
 * Granular Permission-Based Access Control Middleware
 * Checks if authenticated user has any of the required permissions
 * @param  {...string} requiredPermissions - e.g. ('shifts.create') or ('roster.view_team', 'roster.assign')
 */
export const authorizePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('auth.not_authenticated', 401));
    }

    // Super Admin has universal platform access
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    const userPerms = Array.isArray(req.user.permissions) ? req.user.permissions : [];

    // Check if user has wildcard or any of the required permissions
    const hasAccess =
      userPerms.includes('*') ||
      requiredPermissions.some((perm) => userPerms.includes(perm));

    if (!hasAccess) {
      return next(
        new AppError('auth.permission_forbidden', 403, {
          required: requiredPermissions,
          userRole: req.user.role,
        })
      );
    }

    next();
  };
};

/**
 * Requires ALL specified permissions
 */
export const authorizeAllPermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('auth.not_authenticated', 401));
    }

    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    const userPerms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    const hasAll =
      userPerms.includes('*') ||
      requiredPermissions.every((perm) => userPerms.includes(perm));

    if (!hasAll) {
      return next(
        new AppError('auth.permission_forbidden', 403, {
          required: requiredPermissions,
          userRole: req.user.role,
        })
      );
    }

    next();
  };
};

