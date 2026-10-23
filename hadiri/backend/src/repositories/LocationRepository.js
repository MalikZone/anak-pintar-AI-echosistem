import { BaseRepository } from './BaseRepository.js';
import { getPool } from '../database/mysql.js';

function mapLocationRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id || row.tenantId,
    code: row.code,
    name: row.name,
    businessType: row.business_type || row.businessType || 'Kantor Pusat / Korporat',
    phone: row.phone || '',
    address: row.address || '',
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    radiusMeters: Number(row.radius_meters ?? row.radiusMeters ?? 100),
    isHeadquarters: !!(row.is_headquarters ?? row.isHeadquarters),
    isActive: row.is_active !== undefined ? !!row.is_active : (row.isActive !== undefined ? !!row.isActive : true),
    employeeCount: Number(row.employee_count ?? row.employeeCount ?? 0),
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    deletedAt: row.deleted_at || row.deletedAt || null,
  };
}

class LocationRepository extends BaseRepository {
  constructor() {
    super('locations');
  }

  async findAllActive() {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM locations WHERE deleted_at IS NULL');
    return rows.map(mapLocationRow);
  }

  async findByTenant(tenantId) {
    const pool = getPool();
    const sql = `
      SELECT l.*,
             (SELECT COUNT(*) FROM users emp WHERE emp.location_id = l.id AND emp.deleted_at IS NULL AND emp.tenant_id = l.tenant_id) as employee_count
      FROM locations l
      WHERE l.tenant_id = ? AND l.deleted_at IS NULL
      ORDER BY l.is_headquarters DESC, l.name ASC
    `;
    const [rows] = await pool.query(sql, [tenantId]);
    return rows.map(mapLocationRow);
  }

  async findById(tenantId, id) {
    const pool = getPool();
    const sql = `
      SELECT l.*,
             (SELECT COUNT(*) FROM users emp WHERE emp.location_id = l.id AND emp.deleted_at IS NULL AND emp.tenant_id = l.tenant_id) as employee_count
      FROM locations l
      WHERE l.id = ? AND l.tenant_id = ? AND l.deleted_at IS NULL
    `;
    const [rows] = await pool.query(sql, [id, tenantId]);
    return rows.length > 0 ? mapLocationRow(rows[0]) : null;
  }

  async findByCode(tenantId, code) {
    const pool = getPool();
    const sql = `
      SELECT * FROM locations
      WHERE tenant_id = ? AND code = ? AND deleted_at IS NULL
    `;
    const [rows] = await pool.query(sql, [tenantId, code]);
    return rows.length > 0 ? mapLocationRow(rows[0]) : null;
  }

  async findHeadquarters(tenantId) {
    const pool = getPool();
    const sql = `
      SELECT * FROM locations
      WHERE tenant_id = ? AND is_headquarters = 1 AND deleted_at IS NULL
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [tenantId]);
    return rows.length > 0 ? mapLocationRow(rows[0]) : null;
  }

  async clearOtherHeadquarters(tenantId, excludeId = null) {
    const pool = getPool();
    let sql = `UPDATE locations SET is_headquarters = 0, updated_at = NOW() WHERE tenant_id = ? AND is_headquarters = 1 AND deleted_at IS NULL`;
    const params = [tenantId];
    if (excludeId) {
      sql += ` AND id != ?`;
      params.push(excludeId);
    }
    await pool.query(sql, params);
  }

  async clearHeadquarters(tenantId) {
    return this.clearOtherHeadquarters(tenantId);
  }

  async countMembers(locationId) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT COUNT(*) as cnt FROM users WHERE location_id = ? AND deleted_at IS NULL',
      [locationId]
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
      business_type: data.businessType || 'Kantor Pusat / Korporat',
      phone: data.phone || null,
      address: data.address || '',
      latitude: data.latitude,
      longitude: data.longitude,
      radius_meters: data.radiusMeters || 100,
      is_headquarters: data.isHeadquarters ? 1 : 0,
      is_active: data.isActive !== false ? 1 : 0,
    };

    await pool.query(
      `INSERT INTO locations (id, tenant_id, code, name, business_type, phone, address, latitude, longitude, radius_meters, is_headquarters, is_active, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)`,
      [
        record.id,
        record.tenant_id,
        record.code,
        record.name,
        record.business_type,
        record.phone,
        record.address,
        record.latitude,
        record.longitude,
        record.radius_meters,
        record.is_headquarters,
        record.is_active,
      ]
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
    if (data.businessType !== undefined) {
      setClauses.push('business_type = ?');
      values.push(data.businessType);
    }
    if (data.phone !== undefined) {
      setClauses.push('phone = ?');
      values.push(data.phone || null);
    }
    if (data.address !== undefined) {
      setClauses.push('address = ?');
      values.push(data.address);
    }
    if (data.latitude !== undefined) {
      setClauses.push('latitude = ?');
      values.push(data.latitude);
    }
    if (data.longitude !== undefined) {
      setClauses.push('longitude = ?');
      values.push(data.longitude);
    }
    if (data.radiusMeters !== undefined) {
      setClauses.push('radius_meters = ?');
      values.push(data.radiusMeters);
    }
    if (data.isHeadquarters !== undefined) {
      setClauses.push('is_headquarters = ?');
      values.push(data.isHeadquarters ? 1 : 0);
    }
    if (data.isActive !== undefined) {
      setClauses.push('is_active = ?');
      values.push(data.isActive ? 1 : 0);
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = NOW()');
      values.push(id, tenantId);
      await pool.query(
        `UPDATE locations SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
        values
      );
    }

    return this.findById(tenantId, id);
  }

  async delete(tenantId, id) {
    const pool = getPool();
    await pool.query(
      `UPDATE locations SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
      [id, tenantId]
    );
    return true;
  }
}

export const locationRepository = new LocationRepository();
