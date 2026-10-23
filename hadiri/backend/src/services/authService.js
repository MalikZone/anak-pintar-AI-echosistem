import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { AppError } from '../utils/appError.js';
import { comparePassword } from '../utils/passwordHelper.js';
import { userRepository } from '../repositories/UserRepository.js';
import { tenantRepository } from '../repositories/TenantRepository.js';
import { auditLogService } from './auditLogService.js';
import { getPlanConfig } from '../config/subscriptionPlans.js';

class AuthService {
  formatTenantPayload(tenant) {
    if (!tenant) return null;
    const planDetails = getPlanConfig(tenant.subscriptionPlan);
    return {
      id: tenant.id,
      name: tenant.name,
      code: tenant.code,
      workModel: tenant.workModel,
      timezone: tenant.timezoneLabel,
      headquarters: tenant.headquarters,
      subscriptionPlan: tenant.subscriptionPlan || 'starter',
      subscriptionStatus: tenant.subscriptionStatus || 'active',
      maxEmployees: tenant.maxEmployees || planDetails.maxEmployees,
      maxLocations: tenant.maxLocations || planDetails.maxLocations,
      billingCycle: tenant.billingCycle || 'monthly',
      subscriptionExpiresAt: tenant.subscriptionExpiresAt || null,
      planDetails,
    };
  }

  async login({ email, password }) {
    if (!email || !password) {
      throw new AppError('auth.missing_fields', 400);
    }

    // Find user
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('auth.invalid_credentials', 401);
    }

    // Compare password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      throw new AppError('auth.invalid_credentials', 401);
    }

    // Get tenant info
    const tenant = await tenantRepository.findById(user.tenantId);
    if (!tenant) {
      throw new AppError('auth.tenant_not_found', 404);
    }

    // Get leader info if exists
    let leader = null;
    if (user.leaderId) {
      const leaderUser = await userRepository.findById(user.leaderId);
      if (leaderUser) {
        leader = {
          id: leaderUser.id,
          name: leaderUser.name,
          email: leaderUser.email,
          position: leaderUser.position,
        };
      }
    }

    // Generate JWT
    const payload = {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      name: user.name,
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN,
    });

    await auditLogService.log({
      tenantId: user.tenantId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'AUTH_LOGIN',
      category: 'authentication',
      targetType: 'user',
      targetId: user.id,
      targetName: user.email,
      description: `Pengguna '${user.name}' (${user.role}) berhasil masuk ke sistem.`,
    });

    const userProfile = {
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      role: user.role,
      roleId: user.roleId,
      roleName: user.roleName,
      permissions: user.permissions || [],
      position: user.position,
      department: user.department,
      avatar: user.avatar,
      shiftId: user.shiftId,
      leaveBalance: user.leaveBalance,
      leader,
      impersonatedBy: null,
    };

    return {
      token,
      user: userProfile,
      tenant: this.formatTenantPayload(tenant),
    };
  }

  async impersonateTenant(tenantId, superAdminUser) {
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new AppError('auth.tenant_not_found', 404);
    }

    const tenantUsers = await userRepository.findByTenant(tenantId, false);
    const hrAdmin =
      tenantUsers.find((u) => u.role === 'hr_admin') ||
      tenantUsers[0] ||
      null;

    const targetUser = hrAdmin || {
      id: superAdminUser.id,
      tenantId: tenant.id,
      name: `${superAdminUser.name} (${tenant.code} Admin)`,
      email: superAdminUser.email,
      role: 'hr_admin',
      roleId: null,
      roleName: 'HR Admin (Impersonated)',
      permissions: [],
      position: 'Super Admin Impersonation',
      department: 'Executive Governance',
      avatar: superAdminUser.avatar || null,
      shiftId: null,
      leaveBalance: { annual: 12, sick: 14, remainingAnnual: 12 },
    };

    const impersonatedBy = {
      id: superAdminUser.id,
      name: superAdminUser.name,
      email: superAdminUser.email,
    };

    const payload = {
      id: targetUser.id,
      email: targetUser.email,
      tenantId: tenant.id,
      role: 'hr_admin',
      name: targetUser.name,
      impersonatedBy,
      impersonatedTenantId: tenant.id,
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, {
      expiresIn: '4h',
    });

    await auditLogService.log({
      tenantId: tenant.id,
      actorId: superAdminUser.id,
      actorName: superAdminUser.name,
      actorRole: 'super_admin',
      action: 'TENANT_IMPERSONATE',
      category: 'security',
      targetType: 'tenant',
      targetId: tenant.id,
      targetName: tenant.name,
      description: `Super Admin '${superAdminUser.name}' masuk ke sesi HR Admin pada tenant '${tenant.name}' (${tenant.code}) sebagai '${targetUser.name}'.`,
      metadata: {
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
      },
    });

    return {
      token,
      user: {
        id: targetUser.id,
        tenantId: tenant.id,
        name: targetUser.name,
        email: targetUser.email,
        role: 'hr_admin',
        roleId: targetUser.roleId || null,
        roleName: targetUser.roleName || 'HR Admin',
        permissions: targetUser.permissions || [],
        position: targetUser.position || 'HR & People Operations Lead',
        department: targetUser.department || 'Human Resources',
        avatar: targetUser.avatar || null,
        shiftId: targetUser.shiftId || null,
        leaveBalance: targetUser.leaveBalance || { annual: 12, sick: 14, remainingAnnual: 12 },
        leader: null,
        impersonatedBy,
      },
      tenant: this.formatTenantPayload(tenant),
    };
  }

  async getProfile(userId, reqUser = null) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('auth.user_not_found', 404);
    }

    const effectiveTenantId = reqUser?.impersonatedTenantId || user.tenantId;
    const effectiveRole = reqUser?.impersonatedTenantId ? (reqUser.role || 'hr_admin') : user.role;

    const tenant = await tenantRepository.findById(effectiveTenantId);
    let leader = null;
    if (user.leaderId && !reqUser?.impersonatedTenantId) {
      const leaderUser = await userRepository.findById(user.leaderId);
      if (leaderUser) {
        leader = {
          id: leaderUser.id,
          name: leaderUser.name,
          email: leaderUser.email,
          position: leaderUser.position,
        };
      }
    }

    return {
      user: {
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
        avatar: user.avatar,
        shiftId: user.shiftId,
        leaveBalance: user.leaveBalance,
        leader,
        impersonatedBy: reqUser?.impersonatedBy || null,
      },
      tenant: this.formatTenantPayload(tenant),
    };
  }
}

export const authService = new AuthService();

