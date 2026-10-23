import { BaseRepository } from './BaseRepository.js';
import { getPool } from '../database/mysql.js';

function mapRoleRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id || row.tenantId,
    name: row.name,
    code: row.code,
    description: row.description,
    isSystem: !!(row.is_system ?? row.isSystem),
    memberCount: Number(row.member_count ?? row.memberCount ?? 0),
    permissionCount: Number(row.permission_count ?? row.permissionCount ?? 0),
    permissions: row.permissions || [],
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    deletedAt: row.deleted_at || row.deletedAt || null,
  };
}

class RoleRepository extends BaseRepository {
  constructor() {
    super('roles');
  }

  async findByTenant(tenantId) {
    const pool = getPool();
    const sql = `
      SELECT r.*,
        (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id AND u.deleted_at IS NULL AND (u.tenant_id = ? OR r.tenant_id = 'GLOBAL')) as member_count,
        (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id AND rp.deleted_at IS NULL) as permission_count
      FROM roles r
      WHERE (r.tenant_id = ? OR r.tenant_id = 'GLOBAL') AND r.deleted_at IS NULL
      ORDER BY r.is_system DESC, r.name ASC
    `;
    const [rows] = await pool.query(sql, [tenantId, tenantId]);
    return rows.map(mapRoleRow);
  }

  async findById(id) {
    const pool = getPool();
    const sql = `
      SELECT r.*,
        (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id AND u.deleted_at IS NULL) as member_count,
        (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id AND rp.deleted_at IS NULL) as permission_count
      FROM roles r
      WHERE r.id = ? AND r.deleted_at IS NULL
    `;
    const [rows] = await pool.query(sql, [id]);
    if (rows.length === 0) return null;

    const role = mapRoleRow(rows[0]);
    // Load associated permissions
    const [perms] = await pool.query(
      `SELECT p.code
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ? AND p.deleted_at IS NULL AND rp.deleted_at IS NULL`,
      [id]
    );
    role.permissions = perms.map((p) => p.code);
    return role;
  }

  async findByCode(tenantId, code) {
    const pool = getPool();
    const sql = `
      SELECT r.*,
        (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id AND u.deleted_at IS NULL) as member_count,
        (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id AND rp.deleted_at IS NULL) as permission_count
      FROM roles r
      WHERE (r.tenant_id = ? OR r.tenant_id = 'GLOBAL') AND r.code = ? AND r.deleted_at IS NULL
    `;
    const [rows] = await pool.query(sql, [tenantId, code]);
    return rows.length > 0 ? mapRoleRow(rows[0]) : null;
  }

  async create(data) {
    const pool = getPool();
    const mapped = {
      id: data.id,
      tenant_id: data.tenantId,
      name: data.name,
      code: data.code,
      description: data.description || null,
      is_system: data.isSystem ? 1 : 0,
    };

    await pool.query(
      `INSERT INTO roles (id, tenant_id, name, code, description, is_system, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)`,
      [mapped.id, mapped.tenant_id, mapped.name, mapped.code, mapped.description, mapped.is_system]
    );

    return this.findById(data.id);
  }

  async update(id, data) {
    const pool = getPool();
    await pool.query(
      `UPDATE roles SET name = ?, description = ?, updated_at = NOW() WHERE id = ?`,
      [data.name, data.description, id]
    );
    return this.findById(id);
  }

  async delete(id) {
    const pool = getPool();
    await pool.query(`UPDATE roles SET deleted_at = NOW(), updated_at = NOW() WHERE id = ?`, [id]);
    return true;
  }

  async syncPermissions(roleId, permissionCodes = []) {
    const pool = getPool();

    // 1. Delete existing role_permissions
    await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

    if (permissionCodes.length > 0) {
      // 2. Fetch permission IDs for these codes
      const [perms] = await pool.query(
        'SELECT id, code FROM permissions WHERE code IN (?) AND deleted_at IS NULL',
        [permissionCodes]
      );

      if (perms.length > 0) {
        const values = perms.map((p) => [
          `RP-${roleId}-${p.id}`,
          roleId,
          p.id,
          new Date(),
          new Date(),
          null,
        ]);
        await pool.query(
          `INSERT INTO role_permissions (id, role_id, permission_id, created_at, updated_at, deleted_at) VALUES ?`,
          [values]
        );
      }
    }
    return true;
  }
}

export const roleRepository = new RoleRepository();
