import { BaseRepository } from './BaseRepository.js';
import { getPool } from '../database/mysql.js';

function mapLeaveTypeRow(row) {
  if (!row) return null;
  const isGlobal = (row.tenant_id || row.tenantId) === 'GLOBAL';
  return {
    id: row.id,
    tenantId: row.tenant_id || row.tenantId,
    code: row.code,
    name: row.name,
    defaultQuota: Number(row.default_quota ?? row.defaultQuota ?? 0),
    deductAnnual: !!(row.deduct_annual ?? row.deductAnnual),
    requiresAttachment: !!(row.requires_attachment ?? row.requiresAttachment),
    isPaid: row.is_paid !== undefined ? !!row.is_paid : (row.isPaid !== undefined ? !!row.isPaid : true),
    isSystem: !!(row.is_system ?? row.isSystem),
    isGlobal,
    description: row.description || '',
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    deletedAt: row.deleted_at || row.deletedAt || null,
  };
}

class LeaveTypeRepository extends BaseRepository {
  constructor() {
    super('leave_types');
  }

  async findByTenant(tenantId) {
    const pool = getPool();
    const sql = `
      SELECT * FROM leave_types
      WHERE (tenant_id = ? OR tenant_id = 'GLOBAL') AND deleted_at IS NULL
      ORDER BY is_system DESC, name ASC
    `;
    const [rows] = await pool.query(sql, [tenantId]);
    return rows.map(mapLeaveTypeRow);
  }

  async findById(id) {
    const pool = getPool();
    const sql = `SELECT * FROM leave_types WHERE id = ? AND deleted_at IS NULL`;
    const [rows] = await pool.query(sql, [id]);
    return rows.length > 0 ? mapLeaveTypeRow(rows[0]) : null;
  }

  async findByCode(tenantId, code) {
    const pool = getPool();
    const sql = `
      SELECT * FROM leave_types
      WHERE (tenant_id = ? OR tenant_id = 'GLOBAL') AND code = ? AND deleted_at IS NULL
    `;
    const [rows] = await pool.query(sql, [tenantId, code]);
    return rows.length > 0 ? mapLeaveTypeRow(rows[0]) : null;
  }

  async create(data) {
    const pool = getPool();
    const record = {
      id: data.id,
      tenant_id: data.tenantId,
      code: data.code,
      name: data.name,
      default_quota: data.defaultQuota || 0,
      deduct_annual: data.deductAnnual ? 1 : 0,
      requires_attachment: data.requiresAttachment ? 1 : 0,
      is_paid: data.isPaid !== false ? 1 : 0,
      is_system: data.isSystem ? 1 : 0,
      description: data.description || null,
    };

    await pool.query(
      `INSERT INTO leave_types (id, tenant_id, code, name, default_quota, deduct_annual, requires_attachment, is_paid, is_system, description, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)`,
      [
        record.id,
        record.tenant_id,
        record.code,
        record.name,
        record.default_quota,
        record.deduct_annual,
        record.requires_attachment,
        record.is_paid,
        record.is_system,
        record.description,
      ]
    );

    return this.findById(data.id);
  }

  async update(id, data) {
    const pool = getPool();
    const setClauses = [];
    const values = [];

    if (data.name !== undefined) {
      setClauses.push('name = ?');
      values.push(data.name);
    }
    if (data.defaultQuota !== undefined) {
      setClauses.push('default_quota = ?');
      values.push(data.defaultQuota);
    }
    if (data.deductAnnual !== undefined) {
      setClauses.push('deduct_annual = ?');
      values.push(data.deductAnnual ? 1 : 0);
    }
    if (data.requiresAttachment !== undefined) {
      setClauses.push('requires_attachment = ?');
      values.push(data.requiresAttachment ? 1 : 0);
    }
    if (data.isPaid !== undefined) {
      setClauses.push('is_paid = ?');
      values.push(data.isPaid ? 1 : 0);
    }
    if (data.description !== undefined) {
      setClauses.push('description = ?');
      values.push(data.description);
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = NOW()');
      values.push(id);
      await pool.query(
        `UPDATE leave_types SET ${setClauses.join(', ')} WHERE id = ?`,
        values
      );
    }

    return this.findById(id);
  }

  async delete(id) {
    const pool = getPool();
    await pool.query(`UPDATE leave_types SET deleted_at = NOW(), updated_at = NOW() WHERE id = ?`, [id]);
    return true;
  }
}

export const leaveTypeRepository = new LeaveTypeRepository();
