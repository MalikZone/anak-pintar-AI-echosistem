import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { AppError } from '../utils/appError.js';
import { userRepository } from '../repositories/UserRepository.js';

export const authenticate = async (req, res, next) => {
  try {
    // Pass preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
      return next();
    }

    let token = null;
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (authHeader && typeof authHeader === 'string') {
      const match = authHeader.match(/^bearer\s+(.+)$/i);
      if (match) {
        token = match[1].trim();
      } else if (!authHeader.includes(' ')) {
        token = authHeader.trim();
      }
    } else if (req.headers['x-access-token']) {
      token = String(req.headers['x-access-token']).trim();
    } else if (req.headers['x-auth-token']) {
      token = String(req.headers['x-auth-token']).trim();
    } else if (req.query?.token) {
      token = String(req.query.token).trim();
    } else if (req.body?.token) {
      token = String(req.body.token).trim();
    }

    if (!token || token === 'null' || token === 'undefined') {
      return next(new AppError('auth.unauthorized', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, ENV.JWT_SECRET);

    // Fetch user
    const user = await userRepository.findById(decoded.id);
    if (!user) {
      return next(new AppError('auth.user_inactive', 401));
    }

    // Attach to request
    const effectiveTenantId = decoded.impersonatedTenantId || user.tenantId;
    const effectiveRole = decoded.impersonatedTenantId ? (decoded.role || user.role) : user.role;

    req.user = {
      id: user.id,
      tenantId: effectiveTenantId,
      name: user.name,
      email: user.email,
      role: effectiveRole,
      roleId: user.roleId,
      roleName: user.roleName,
      permissions: user.permissions || [],
      position: user.position,
      department: user.department,
      leaderId: user.leaderId,
      managerId: user.managerId,
      shiftId: user.shiftId,
      leaveBalance: user.leaveBalance,
      impersonatedBy: decoded.impersonatedBy || null,
      impersonatedTenantId: decoded.impersonatedTenantId || null,
    };
    req.tenantId = effectiveTenantId;
    req.tenant = user.branch || null;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('auth.token_invalid', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('auth.token_expired', 401));
    }
    next(error);
  }
};

