import { BaseRepository } from './BaseRepository.js';
import { getPool } from '../database/mysql.js';
import { SYSTEM_ROLE_IDS, SYSTEM_ROLE_PERMISSIONS, PERMISSIONS } from '../config/permissions.js';

const USER_JOIN_SELECT = `
  SELECT u.*,
         r.name as role_name, r.code as role_code,
         loc.name as location_name, loc.code as location_code, loc.business_type as location_business_type,
         loc.phone as location_phone, loc.address as location_address, loc.latitude as location_lat,
         loc.longitude as location_lng, loc.radius_meters as location_radius, loc.is_headquarters as location_is_hq
  FROM users u
  LEFT JOIN roles r ON u.role_id = r.id
  LEFT JOIN locations loc ON u.location_id = loc.id AND loc.deleted_at IS NULL
`;

function mapUserRow(row, permissions = null) {
  if (!row) return null;
  const leaveAnnual = Number(row.leave_annual ?? row.leaveAnnual ?? row.leaveBalance?.annual ?? row.leaveBalance?.annualTotal ?? 12);
  const leaveSick = Number(row.leave_sick ?? row.leaveSick ?? row.leaveBalance?.sick ?? row.leaveBalance?.sickTotal ?? 14);
  const leaveRemaining = Number(row.leave_remaining_annual ?? row.leaveRemainingAnnual ?? row.leaveBalance?.remainingAnnual ?? leaveAnnual);

  const locId = row.location_id || row.locationId || null;
  const branch = (locId || row.location_name) ? {
    id: locId,
    name: row.location_name || null,
    code: row.location_code || null,
    businessType: row.location_business_type || 'Kantor Pusat / Korporat',
    phone: row.location_phone || null,
    address: row.location_address || null,
    latitude: row.location_lat != null ? Number(row.location_lat) : null,
    longitude: row.location_lng != null ? Number(row.location_lng) : null,
    radiusMeters: row.location_radius != null ? Number(row.location_radius) : 100,
    isHeadquarters: !!row.location_is_hq,
  } : null;

  return {
    id: row.id,
    tenantId: row.tenant_id || row.tenantId,
    name: row.name,
    email: row.email,
    telegramId: row.telegram_id || row.telegramId || null,
    telegram_id: row.telegram_id || row.telegramId || null,
    password: row.password,
    role: row.role || 'employee',
    roleId: row.role_id || row.roleId || null,
    roleName: row.role_name || null,
    roleCode: row.role_code || null,
    position: row.position || '',
    department: row.department || '',
    departmentId: row.department_id || row.departmentId || null,
    positionId: row.position_id || row.positionId || null,
    locationId: locId,
    locationName: row.location_name || null,
    branch,
    leaderId: row.leader_id || row.leaderId || null,
    managerId: row.manager_id || row.managerId || null,
    shiftId: row.shift_id || row.shiftId || null,
    avatar: row.avatar || null,
    isActive: !!(row.is_active ?? row.isActive ?? true),
    leaveBalance: {
      annualTotal: leaveAnnual,
      sickTotal: leaveSick,
      remainingAnnual: leaveRemaining,
      annualUsed: Math.max(0, leaveAnnual - leaveRemaining),
      annual: leaveAnnual,
      sick: leaveSick,
    },
    permissions: permissions || row.permissions || [],
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    deletedAt: row.deleted_at || row.deletedAt || null,
  };
}

class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async loadPermissionsForUser(roleId, role) {
    if (role === 'super_admin') {
      return PERMISSIONS.map((p) => p.code);
    }

    if (roleId) {
      try {
        const pool = getPool();
        const [rows] = await pool.query(
          `SELECT p.code
           FROM permissions p
           JOIN role_permissions rp ON p.id = rp.permission_id
           WHERE rp.role_id = ? AND p.deleted_at IS NULL AND rp.deleted_at IS NULL`,
          [roleId]
        );
        if (rows.length > 0) {
          return rows.map((r) => r.code);
        }
      } catch (err) {
        console.warn('[UserRepository] Error loading user permissions from MySQL:', err.message);
      }
    }

    // Fallback to system role permissions
    const systemRoleId = SYSTEM_ROLE_IDS[role?.toUpperCase()];
    if (systemRoleId && SYSTEM_ROLE_PERMISSIONS[systemRoleId]) {
      return SYSTEM_ROLE_PERMISSIONS[systemRoleId];
    }

    return [];
  }

  async findById(id, includeDeleted = false) {
    const pool = getPool();
    let sql = `${USER_JOIN_SELECT} WHERE u.id = ?`;
    if (!includeDeleted) {
      sql += ` AND u.deleted_at IS NULL`;
    }
    const [rows] = await pool.query(sql, [id]);
    if (rows.length === 0) return null;

    const row = rows[0];
    const perms = await this.loadPermissionsForUser(row.role_id, row.role);
    return mapUserRow(row, perms);
  }

  async findByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();

    const pool = getPool();
    const sql = `${USER_JOIN_SELECT} WHERE LOWER(u.email) = ? AND u.deleted_at IS NULL`;
    const [rows] = await pool.query(sql, [cleanEmail]);
    if (rows.length === 0) return null;

    const row = rows[0];
    const perms = await this.loadPermissionsForUser(row.role_id, row.role);
    return mapUserRow(row, perms);
  }

  async findByEmailAndTenant(email, tenantId) {
    if (!email || !tenantId) return null;
    const cleanEmail = email.toLowerCase().trim();

    const pool = getPool();
    const sql = `${USER_JOIN_SELECT} WHERE LOWER(u.email) = ? AND u.tenant_id = ? AND u.deleted_at IS NULL`;
    const [rows] = await pool.query(sql, [cleanEmail, tenantId]);
    if (rows.length === 0) return null;

    const row = rows[0];
    const perms = await this.loadPermissionsForUser(row.role_id, row.role);
    return mapUserRow(row, perms);
  }

  async findByTelegramId(telegramId, tenantId = null) {
    if (!telegramId) return null;
    const cleanTg = String(telegramId).trim();
    if (!cleanTg) return null;
    const withoutAt = cleanTg.replace(/^@/, '');
    const withAt = `@${withoutAt}`;

    const pool = getPool();
    let sql = `${USER_JOIN_SELECT} WHERE (LOWER(TRIM(u.telegram_id)) = LOWER(?) OR LOWER(TRIM(u.telegram_id)) = LOWER(?) OR LOWER(TRIM(u.telegram_id)) = LOWER(?)) AND u.deleted_at IS NULL AND u.is_active = TRUE`;
    const params = [cleanTg, withoutAt, withAt];

    if (tenantId) {
      sql += ` AND u.tenant_id = ?`;
      params.push(tenantId);
    }

    const [rows] = await pool.query(sql, params);
    if (rows.length === 0) return null;

    const row = rows[0];
    const perms = await this.loadPermissionsForUser(row.role_id, row.role);
    return mapUserRow(row, perms);
  }

  async findByTenant(tenantId, includeInactive = false) {
    const pool = getPool();
    let sql = `${USER_JOIN_SELECT} WHERE u.tenant_id = ? AND u.deleted_at IS NULL`;
    if (!includeInactive) {
      sql += ` AND u.is_active = TRUE`;
    }
    sql += ` ORDER BY u.name ASC`;
    const [rows] = await pool.query(sql, [tenantId]);
    return rows.map((r) => mapUserRow(r));
  }

  async findSubordinates(leaderId) {
    if (!leaderId) return [];
    const pool = getPool();
    const sql = `${USER_JOIN_SELECT} WHERE u.leader_id = ? AND u.is_active = TRUE AND u.deleted_at IS NULL ORDER BY u.name ASC`;
    const [rows] = await pool.query(sql, [leaderId]);
    return rows.map((r) => mapUserRow(r));
  }

  async findLeader(leaderId) {
    if (!leaderId) return null;
    return this.findById(leaderId);
  }

  async create(data) {
    const pool = getPool();
    const roleId = data.roleId || data.role_id || SYSTEM_ROLE_IDS[data.role?.toUpperCase()] || null;
    const leaveAnnual = Number(data.leaveBalance?.annual || data.leaveBalance?.annualTotal || 12);
    const leaveSick = Number(data.leaveBalance?.sick || data.leaveBalance?.sickTotal || 14);
    const leaveRemaining = Number(data.leaveBalance?.remainingAnnual ?? leaveAnnual);

    const rawTelegramId = data.telegramId ?? data.telegram_id ?? null;
    const cleanTelegramId = rawTelegramId && String(rawTelegramId).trim() ? String(rawTelegramId).trim() : null;

    await pool.query(
      `INSERT INTO users (
        id, tenant_id, name, email, telegram_id, password, role, role_id, position, department,
        department_id, position_id, location_id,
        leader_id, manager_id, shift_id, leave_annual, leave_sick, leave_remaining_annual,
        avatar, is_active, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)`,
      [
        data.id,
        data.tenantId || data.tenant_id,
        data.name,
        data.email.toLowerCase().trim(),
        cleanTelegramId,
        data.password,
        data.role || 'employee',
        roleId,
        data.position || null,
        data.department || null,
        data.departmentId || data.department_id || null,
        data.positionId || data.position_id || null,
        data.locationId || data.location_id || null,
        data.leaderId || data.leader_id || null,
        data.managerId || data.manager_id || null,
        data.shiftId || data.shift_id || null,
        leaveAnnual,
        leaveSick,
        leaveRemaining,
        data.avatar || null,
        data.isActive ?? data.is_active ?? true,
      ]
    );

    return this.findById(data.id);
  }

  async update(id, updates) {
    const pool = getPool();
    const setClauses = [];
    const values = [];

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      values.push(updates.name);
    }
    if (updates.email !== undefined) {
      setClauses.push('email = ?');
      values.push(updates.email.toLowerCase().trim());
    }
    if (updates.telegramId !== undefined || updates.telegram_id !== undefined) {
      const rawTg = updates.telegramId ?? updates.telegram_id;
      const cleanTg = rawTg && String(rawTg).trim() ? String(rawTg).trim() : null;
      setClauses.push('telegram_id = ?');
      values.push(cleanTg);
    }
    if (updates.password !== undefined) {
      setClauses.push('password = ?');
      values.push(updates.password);
    }
    if (updates.role !== undefined) {
      setClauses.push('role = ?');
      values.push(updates.role);
    }
    if (updates.roleId !== undefined || updates.role_id !== undefined) {
      setClauses.push('role_id = ?');
      values.push(updates.roleId ?? updates.role_id);
    }
    if (updates.position !== undefined) {
      setClauses.push('position = ?');
      values.push(updates.position);
    }
    if (updates.department !== undefined) {
      setClauses.push('department = ?');
      values.push(updates.department);
    }
    if (updates.departmentId !== undefined || updates.department_id !== undefined) {
      setClauses.push('department_id = ?');
      values.push(updates.departmentId ?? updates.department_id);
    }
    if (updates.positionId !== undefined || updates.position_id !== undefined) {
      setClauses.push('position_id = ?');
      values.push(updates.positionId ?? updates.position_id);
    }
    if (updates.locationId !== undefined || updates.location_id !== undefined) {
      setClauses.push('location_id = ?');
      values.push(updates.locationId ?? updates.location_id);
    }
    if (updates.leaderId !== undefined || updates.leader_id !== undefined) {
      setClauses.push('leader_id = ?');
      values.push(updates.leaderId ?? updates.leader_id);
    }
    if (updates.shiftId !== undefined || updates.shift_id !== undefined) {
      setClauses.push('shift_id = ?');
      values.push(updates.shiftId ?? updates.shift_id);
    }
    if (updates.avatar !== undefined) {
      setClauses.push('avatar = ?');
      values.push(updates.avatar);
    }
    if (updates.isActive !== undefined || updates.is_active !== undefined) {
      setClauses.push('is_active = ?');
      values.push(updates.isActive ?? updates.is_active);
    }
    const remainingAnnual = updates.leave_remaining_annual ?? updates.leaveBalance?.remainingAnnual;
    if (remainingAnnual !== undefined) {
      setClauses.push('leave_remaining_annual = ?');
      values.push(Number(remainingAnnual));
    }
    const annualTotal = updates.leave_annual ?? updates.leaveBalance?.annualTotal ?? updates.leaveBalance?.annual;
    if (annualTotal !== undefined) {
      setClauses.push('leave_annual = ?');
      values.push(Number(annualTotal));
    }
    const sickTotal = updates.leave_sick ?? updates.leaveBalance?.sickTotal ?? updates.leaveBalance?.sick;
    if (sickTotal !== undefined) {
      setClauses.push('leave_sick = ?');
      values.push(Number(sickTotal));
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = NOW()');
      values.push(id);
      await pool.query(
        `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
        values
      );
    }

    return this.findById(id);
  }

  async delete(id) {
    const pool = getPool();
    await pool.query(
      `UPDATE users SET deleted_at = NOW(), updated_at = NOW(), is_active = FALSE WHERE id = ?`,
      [id]
    );
    return true;
  }

  async softDelete(id) {
    return this.delete(id);
  }
}

export const userRepository = new UserRepository();
