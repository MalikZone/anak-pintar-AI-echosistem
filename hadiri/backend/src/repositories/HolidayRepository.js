import { BaseRepository } from './BaseRepository.js';
import { getPool } from '../database/mysql.js';

function mapHolidayRow(row) {
  if (!row) return null;
  const isGlobal = (row.tenant_id || row.tenantId) === 'GLOBAL';
  return {
    id: row.id,
    tenantId: row.tenant_id || row.tenantId,
    name: row.name,
    date: typeof row.date === 'string' ? row.date.slice(0, 10) : (row.date ? new Date(row.date).toISOString().slice(0, 10) : null),
    type: row.type || (isGlobal ? 'national' : 'company'),
    description: row.description || '',
    isGlobal,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    deletedAt: row.deleted_at || row.deletedAt || null,
  };
}

class HolidayRepository extends BaseRepository {
  constructor() {
    super('holidays');
  }

  async findByTenant(tenantId, year = null) {
    const pool = getPool();
    let sql = `
      SELECT * FROM holidays
      WHERE (tenant_id = ? OR tenant_id = 'GLOBAL') AND deleted_at IS NULL
    `;
    const params = [tenantId];
    if (year) {
      sql += ' AND YEAR(date) = ?';
      params.push(year);
    }
    sql += ' ORDER BY date ASC';
    const [rows] = await pool.query(sql, params);
    return rows.map(mapHolidayRow);
  }

  async findById(id) {
    const pool = getPool();
    const sql = `SELECT * FROM holidays WHERE id = ? AND deleted_at IS NULL`;
    const [rows] = await pool.query(sql, [id]);
    return rows.length > 0 ? mapHolidayRow(rows[0]) : null;
  }

  async findByTenantAndDate(tenantId, date) {
    const pool = getPool();
    const sql = `
      SELECT * FROM holidays
      WHERE (tenant_id = ? OR tenant_id = 'GLOBAL') AND date = ? AND deleted_at IS NULL
    `;
    const [rows] = await pool.query(sql, [tenantId, date]);
    return rows.length > 0 ? mapHolidayRow(rows[0]) : null;
  }

  async create(data) {
    const pool = getPool();
    const record = {
      id: data.id,
      tenant_id: data.tenantId,
      name: data.name,
      date: data.date,
      type: data.type || 'national',
      description: data.description || null,
    };

    await pool.query(
      `INSERT INTO holidays (id, tenant_id, name, date, type, description, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)`,
      [record.id, record.tenant_id, record.name, record.date, record.type, record.description]
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
    if (data.date !== undefined) {
      setClauses.push('date = ?');
      values.push(data.date);
    }
    if (data.type !== undefined) {
      setClauses.push('type = ?');
      values.push(data.type);
    }
    if (data.description !== undefined) {
      setClauses.push('description = ?');
      values.push(data.description);
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = NOW()');
      values.push(id);
      await pool.query(
        `UPDATE holidays SET ${setClauses.join(', ')} WHERE id = ?`,
        values
      );
    }

    return this.findById(id);
  }

  async delete(id) {
    const pool = getPool();
    await pool.query(`UPDATE holidays SET deleted_at = NOW(), updated_at = NOW() WHERE id = ?`, [id]);
    return true;
  }
}

export const holidayRepository = new HolidayRepository();
