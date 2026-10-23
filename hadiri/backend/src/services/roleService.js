import { roleRepository } from '../repositories/RoleRepository.js';
import { permissionRepository } from '../repositories/PermissionRepository.js';
import { tenantRepository } from '../repositories/TenantRepository.js';
import { getPool, isMySQLActive } from '../database/mysql.js';
import { ENV } from '../config/env.js';
import { AppError } from '../utils/appError.js';
import { generateRoleId } from '../utils/idGenerator.js';

class RoleService {
  async getRoles(tenantId) {
    return roleRepository.findByTenant(tenantId);
  }

  async getRoleById(tenantId, roleId) {
    const role = await roleRepository.findById(roleId);
    if (!role) {
      throw new AppError('role.not_found', 404);
    }
    if (role.tenantId !== tenantId && role.tenantId !== 'GLOBAL') {
      throw new AppError('role.not_found', 404);
    }
    return role;
  }

  async createRole(tenantId, data) {
    const { name, code, description, permissions = [] } = data;

    if (!name || !code) {
      throw new AppError('role.required_fields', 400);
    }

    const cleanCode = code.toUpperCase().trim().replace(/[^A-Z0-9_]/g, '');
    if (!cleanCode) {
      throw new AppError('role.invalid_code', 400);
    }

    // Check duplicate code in this tenant
    const existing = await roleRepository.findByCode(tenantId, cleanCode);
    if (existing) {
      throw new AppError('role.code_already_exists', 400);
    }

    const tenant = await tenantRepository.findById(tenantId);
    const tenantCode = tenant?.code || 'ROLE';
    const roleId = generateRoleId(tenantCode, cleanCode);

    const created = await roleRepository.create({
      id: roleId,
      tenantId,
      name: name.trim(),
      code: cleanCode,
      description: description?.trim() || null,
      isSystem: false,
    });

    if (Array.isArray(permissions) && permissions.length > 0) {
      await roleRepository.syncPermissions(roleId, permissions);
    }

    return roleRepository.findById(roleId);
  }

  async updateRole(tenantId, roleId, data) {
    const role = await roleRepository.findById(roleId);
    if (!role) {
      throw new AppError('role.not_found', 404);
    }
    if (role.tenantId !== tenantId && role.tenantId !== 'GLOBAL') {
      throw new AppError('role.not_found', 404);
    }

    const { name, description, permissions } = data;
    const updates = {};
    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;

    if (Object.keys(updates).length > 0) {
      await roleRepository.update(roleId, updates);
    }

    if (Array.isArray(permissions)) {
      if (role.id === 'ROL-SYS-SUPERADMIN') {
        throw new AppError('role.cannot_modify_superadmin_perms', 400);
      }
      await roleRepository.syncPermissions(roleId, permissions);
    }

    return roleRepository.findById(roleId);
  }

  async deleteRole(tenantId, roleId) {
    const role = await roleRepository.findById(roleId);
    if (!role) {
      throw new AppError('role.not_found', 404);
    }
    if (role.tenantId !== tenantId && role.tenantId !== 'GLOBAL') {
      throw new AppError('role.not_found', 404);
    }

    if (role.isSystem) {
      throw new AppError('role.cannot_delete_system_role', 400);
    }

    // Check if role is actively assigned to any user
    if (ENV.DB_CONNECTION === 'mysql' && isMySQLActive()) {
      try {
        const pool = getPool();
        const [rows] = await pool.query(
          'SELECT COUNT(*) as count FROM users WHERE role_id = ? AND deleted_at IS NULL',
          [roleId]
        );
        if (rows[0].count > 0) {
          throw new AppError('role.cannot_delete_assigned_role', 400, {
            assignedCount: rows[0].count,
          });
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
        console.warn('[RoleService] MySQL error checking assigned users:', err.message);
      }
    }

    await roleRepository.delete(roleId);
    return { success: true };
  }

  async updateRolePermissions(tenantId, roleId, permissions) {
    const role = await roleRepository.findById(roleId);
    if (!role) {
      throw new AppError('role.not_found', 404);
    }
    if (role.tenantId !== tenantId && role.tenantId !== 'GLOBAL') {
      throw new AppError('role.not_found', 404);
    }

    if (role.id === 'ROL-SYS-SUPERADMIN') {
      throw new AppError('role.cannot_modify_superadmin_perms', 400);
    }

    await roleRepository.syncPermissions(roleId, permissions);
    return roleRepository.findById(roleId);
  }

  async getPermissionRegistry() {
    const grouped = await permissionRepository.getAllGrouped();
    const flat = await permissionRepository.getAll();
    return {
      grouped,
      flat,
    };
  }
}

export const roleService = new RoleService();

