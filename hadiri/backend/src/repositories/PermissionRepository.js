import { BaseRepository } from './BaseRepository.js';
import { getPool } from '../database/mysql.js';
import { PERMISSIONS } from '../config/permissions.js';

function mapPermissionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    module: row.module,
    action: row.action,
    code: row.code,
    nameId: row.name_id || row.nameId,
    nameEn: row.name_en || row.nameEn,
    description: row.description,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    deletedAt: row.deleted_at || row.deletedAt || null,
  };
}

class PermissionRepository extends BaseRepository {
  constructor() {
    super('permissions');
  }

  async getAll() {
    try {
      const pool = getPool();
      const [rows] = await pool.query('SELECT * FROM permissions WHERE deleted_at IS NULL ORDER BY module, action');
      return rows.map(mapPermissionRow);
    } catch (err) {
      console.warn('[PermissionRepository] MySQL query failed, using static permissions:', err.message);
      return PERMISSIONS.map((p) => ({
        ...p,
        nameId: p.name_id,
        nameEn: p.name_en,
      }));
    }
  }

  async getAllGrouped() {
    const list = await this.getAll();
    const grouped = {};
    for (const p of list) {
      if (!grouped[p.module]) {
        grouped[p.module] = [];
      }
      grouped[p.module].push(p);
    }
    return grouped;
  }

  async findCodesByRoleId(roleId) {
    try {
      const pool = getPool();
      const [rows] = await pool.query(
        `SELECT p.code
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = ? AND p.deleted_at IS NULL AND rp.deleted_at IS NULL`,
        [roleId]
      );
      return rows.map((r) => r.code);
    } catch (err) {
      console.warn('[PermissionRepository] MySQL join query failed:', err.message);
      return [];
    }
  }
}

export const permissionRepository = new PermissionRepository();
