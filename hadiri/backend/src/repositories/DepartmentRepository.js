import { BaseRepository } from './BaseRepository.js';
import { getPool } from '../database/mysql.js';

function mapDepartmentRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id || row.tenantId,
    code: row.code,
    name: row.name,
    description: row.description || '',
    parentId: row.parent_id || row.parentId || null,
    parentName: row.parent_name || null,
    managerId: row.manager_id || row.managerId || null,
    managerName: row.manager_name || null,
    employeeCount: Number(row.employee_count ?? row.employeeCount ?? 0),
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    deletedAt: row.deleted_at || row.deletedAt || null,
  };
}

class DepartmentRepository extends BaseRepository {
  constructor() {
    super('departments');
  }

  async findByTenant(tenantId) {
    const pool = getPool();
    const sql = `
      SELECT d.*, 
             p.name as parent_name,
             u.name as manager_name,
             (SELECT COUNT(*) FROM users emp WHERE (emp.department_id = d.id OR emp.department = d.name) AND emp.deleted_at IS NULL AND emp.tenant_id = d.tenant_id) as employee_count
      FROM departments d
      LEFT JOIN departments p ON d.parent_id = p.id AND p.deleted_at IS NULL
      LEFT JOIN users u ON d.manager_id = u.id AND u.deleted_at IS NULL
      WHERE d.tenant_id = ? AND d.deleted_at IS NULL
      ORDER BY d.name ASC
    `;
    const [rows] = await pool.query(sql, [tenantId]);
    return rows.map(mapDepartmentRow);
  }

  async findById(tenantId, id) {
    const pool = getPool();
    const sql = `
      SELECT d.*, 
             p.name as parent_name,
             u.name as manager_name,
             (SELECT COUNT(*) FROM users emp WHERE (emp.department_id = d.id OR emp.department = d.name) AND emp.deleted_at IS NULL AND emp.tenant_id = d.tenant_id) as employee_count
      FROM departments d
      LEFT JOIN departments p ON d.parent_id = p.id AND p.deleted_at IS NULL
      LEFT JOIN users u ON d.manager_id = u.id AND u.deleted_at IS NULL
      WHERE d.id = ? AND d.tenant_id = ? AND d.deleted_at IS NULL
    `;
    const [rows] = await pool.query(sql, [id, tenantId]);
    return rows.length > 0 ? mapDepartmentRow(rows[0]) : null;
  }

  async findByCode(tenantId, code) {
    const pool = getPool();
    const sql = `
      SELECT * FROM departments
      WHERE tenant_id = ? AND code = ? AND deleted_at IS NULL
    `;
    const [rows] = await pool.query(sql, [tenantId, code]);
    return rows.length > 0 ? mapDepartmentRow(rows[0]) : null;
  }

  async countSubDepartments(parentId) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT COUNT(*) as cnt FROM departments WHERE parent_id = ? AND deleted_at IS NULL',
      [parentId]
    );
    return rows[0]?.cnt || 0;
  }

  async countMembers(departmentId, departmentName) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT COUNT(*) as cnt FROM users WHERE (department_id = ? OR department = ?) AND deleted_at IS NULL',
      [departmentId, departmentName]
    );
    return rows[0]?.cnt || 0;
  }

  async create(data) {
    const pool = getPool();
    const record = {
      id: data.id,
      tenant_id: data.tenantId,
      code: data.code,
      name: data.name,
      description: data.description || null,
      parent_id: data.parentId || null,
      manager_id: data.managerId || null,
    };

    await pool.query(
      `INSERT INTO departments (id, tenant_id, code, name, description, parent_id, manager_id, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)`,
      [record.id, record.tenant_id, record.code, record.name, record.description, record.parent_id, record.manager_id]
    );

    return this.findById(data.tenantId, data.id);
  }

  async update(tenantId, id, data) {
    const pool = getPool();
    const setClauses = [];
    const values = [];

    if (data.name !== undefined) {
      setClauses.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      setClauses.push('description = ?');
      values.push(data.description);
    }
    if (data.parentId !== undefined) {
      setClauses.push('parent_id = ?');
      values.push(data.parentId || null);
    }
    if (data.managerId !== undefined) {
      setClauses.push('manager_id = ?');
      values.push(data.managerId || null);
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = NOW()');
      values.push(id, tenantId);
      await pool.query(
        `UPDATE departments SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
        values
      );
    }

    return this.findById(tenantId, id);
  }

  async delete(tenantId, id) {
    const pool = getPool();
    await pool.query(
      `UPDATE departments SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
      [id, tenantId]
    );
    return true;
  }
}

export const departmentRepository = new DepartmentRepository();
