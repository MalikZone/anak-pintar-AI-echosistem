import { BaseRepository } from './BaseRepository.js';
import { getPool } from '../database/mysql.js';

function mapPositionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id || row.tenantId,
    departmentId: row.department_id || row.departmentId || null,
    departmentName: row.department_name || null,
    code: row.code,
    title: row.title,
    level: row.level || 'staff',
    description: row.description || '',
    employeeCount: Number(row.employee_count ?? row.employeeCount ?? 0),
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    deletedAt: row.deleted_at || row.deletedAt || null,
  };
}

class PositionRepository extends BaseRepository {
  constructor() {
    super('positions');
  }

  async findByTenant(tenantId) {
    const pool = getPool();
    const sql = `
      SELECT p.*,
             d.name as department_name,
             (SELECT COUNT(*) FROM users emp WHERE (emp.position_id = p.id OR emp.position = p.title) AND emp.deleted_at IS NULL AND emp.tenant_id = p.tenant_id) as employee_count
      FROM positions p
      LEFT JOIN departments d ON p.department_id = d.id AND d.deleted_at IS NULL
      WHERE p.tenant_id = ? AND p.deleted_at IS NULL
      ORDER BY p.title ASC
    `;
    const [rows] = await pool.query(sql, [tenantId]);
    return rows.map(mapPositionRow);
  }

  async findById(tenantId, id) {
    const pool = getPool();
    const sql = `
      SELECT p.*,
             d.name as department_name,
             (SELECT COUNT(*) FROM users emp WHERE (emp.position_id = p.id OR emp.position = p.title) AND emp.deleted_at IS NULL AND emp.tenant_id = p.tenant_id) as employee_count
      FROM positions p
      LEFT JOIN departments d ON p.department_id = d.id AND d.deleted_at IS NULL
      WHERE p.id = ? AND p.tenant_id = ? AND p.deleted_at IS NULL
    `;
    const [rows] = await pool.query(sql, [id, tenantId]);
    return rows.length > 0 ? mapPositionRow(rows[0]) : null;
  }

  async findByCode(tenantId, code) {
    const pool = getPool();
    const sql = `
      SELECT * FROM positions
      WHERE tenant_id = ? AND code = ? AND deleted_at IS NULL
    `;
    const [rows] = await pool.query(sql, [tenantId, code]);
    return rows.length > 0 ? mapPositionRow(rows[0]) : null;
  }

  async countMembers(positionId, positionTitle) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT COUNT(*) as cnt FROM users WHERE (position_id = ? OR position = ?) AND deleted_at IS NULL',
      [positionId, positionTitle]
    );
    return rows[0]?.cnt || 0;
  }

  async create(data) {
    const pool = getPool();
    const record = {
      id: data.id,
      tenant_id: data.tenantId,
      department_id: data.departmentId || null,
      code: data.code,
      title: data.title,
      level: data.level || 'staff',
      description: data.description || null,
    };

    await pool.query(
      `INSERT INTO positions (id, tenant_id, department_id, code, title, level, description, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)`,
      [record.id, record.tenant_id, record.department_id, record.code, record.title, record.level, record.description]
    );

    return this.findById(data.tenantId, data.id);
  }

  async update(tenantId, id, data) {
    const pool = getPool();
    const setClauses = [];
    const values = [];

    if (data.title !== undefined) {
      setClauses.push('title = ?');
      values.push(data.title);
    }
    if (data.departmentId !== undefined) {
      setClauses.push('department_id = ?');
      values.push(data.departmentId || null);
    }
    if (data.level !== undefined) {
      setClauses.push('level = ?');
      values.push(data.level);
    }
    if (data.description !== undefined) {
      setClauses.push('description = ?');
      values.push(data.description);
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = NOW()');
      values.push(id, tenantId);
      await pool.query(
        `UPDATE positions SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
        values
      );
    }

    return this.findById(tenantId, id);
  }

  async delete(tenantId, id) {
    const pool = getPool();
    await pool.query(
      `UPDATE positions SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
      [id, tenantId]
    );
    return true;
  }
}

export const positionRepository = new PositionRepository();
