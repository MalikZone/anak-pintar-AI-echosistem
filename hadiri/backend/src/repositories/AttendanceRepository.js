import { BaseRepository } from './BaseRepository.js';
import { getPool } from '../database/mysql.js';

function mapAttendanceRow(row) {
  if (!row) return null;
  const dateStr = row.date ? (typeof row.date === 'string' ? row.date.slice(0, 10) : new Date(row.date).toISOString().slice(0, 10)) : null;
  return {
    id: row.id,
    tenantId: row.tenant_id || row.tenantId,
    tenant_id: row.tenant_id || row.tenantId,
    userId: row.user_id || row.userId,
    user_id: row.user_id || row.userId,
    userName: row.user_name || row.userName || null,
    shiftId: row.shift_id || row.shiftId || null,
    shift_id: row.shift_id || row.shiftId || null,
    shiftName: row.shift_name || row.shiftName || null,
    date: dateStr,
    sessionDate: dateStr,
    clockInDate: dateStr,
    clockIn: row.clock_in_time || row.clockInTime || null,
    clockInTime: row.clock_in_time || row.clockInTime || null,
    clockOutDate: row.clock_out_time ? dateStr : null,
    clockOut: row.clock_out_time || row.clockOutTime || null,
    clockOutTime: row.clock_out_time || row.clockOutTime || null,
    status: row.status,
    isCrossDay: Boolean(row.is_cross_day ?? row.isCrossDay),
    location: row.location || null,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    selfieUrl: row.selfie_url || row.selfieUrl || null,
    notes: row.notes || null,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    deletedAt: row.deleted_at || row.deletedAt || null,
  };
}

class AttendanceRepository extends BaseRepository {
  constructor() {
    super('attendances');
  }

  async findByUser(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT a.*, u.name as user_name, s.name as shift_name
       FROM attendances a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN shifts s ON a.shift_id = s.id
       WHERE a.user_id = ? AND a.deleted_at IS NULL
       ORDER BY a.date DESC, a.clock_in_time DESC`,
      [userId]
    );
    return rows.map(mapAttendanceRow);
  }

  async findTodayAttendance(userId, sessionDate) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT a.*, u.name as user_name, s.name as shift_name
       FROM attendances a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN shifts s ON a.shift_id = s.id
       WHERE a.user_id = ? AND a.date = ? AND a.deleted_at IS NULL
       LIMIT 1`,
      [userId, sessionDate]
    );
    return rows.length > 0 ? mapAttendanceRow(rows[0]) : null;
  }

  async findOpenSession(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT a.*, u.name as user_name, s.name as shift_name
       FROM attendances a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN shifts s ON a.shift_id = s.id
       WHERE a.user_id = ? AND a.clock_in_time IS NOT NULL AND a.clock_out_time IS NULL AND a.deleted_at IS NULL
       ORDER BY a.created_at DESC
       LIMIT 1`,
      [userId]
    );
    return rows.length > 0 ? mapAttendanceRow(rows[0]) : null;
  }

  async findByTenant(tenantId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT a.*, u.name as user_name, s.name as shift_name
       FROM attendances a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN shifts s ON a.shift_id = s.id
       WHERE a.tenant_id = ? AND a.deleted_at IS NULL
       ORDER BY a.date DESC, a.clock_in_time DESC`,
      [tenantId]
    );
    return rows.map(mapAttendanceRow);
  }

  async findByTenantAndDate(tenantId, date, includeOpenYesterday = false) {
    const pool = getPool();
    let sql = `SELECT a.*, u.name as user_name, s.name as shift_name
       FROM attendances a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN shifts s ON a.shift_id = s.id
       WHERE a.tenant_id = ? AND a.deleted_at IS NULL`;
    const params = [tenantId];

    if (includeOpenYesterday) {
      sql += ` AND (a.date = ? OR (a.clock_out_time IS NULL AND a.date < ?))
       ORDER BY a.date DESC, a.clock_in_time DESC`;
      params.push(date, date);
    } else {
      sql += ` AND a.date = ?
       ORDER BY a.date DESC, a.clock_in_time DESC`;
      params.push(date);
    }

    const [rows] = await pool.query(sql, params);
    return rows.map(mapAttendanceRow);
  }

  async findByTenantAndDateRange(tenantId, startDate, endDate) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT a.*, u.name as user_name, s.name as shift_name
       FROM attendances a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN shifts s ON a.shift_id = s.id
       WHERE a.tenant_id = ? AND a.date >= ? AND a.date <= ? AND a.deleted_at IS NULL
       ORDER BY a.date ASC, a.clock_in_time ASC`,
      [tenantId, startDate, endDate]
    );
    return rows.map(mapAttendanceRow);
  }

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT a.*, u.name as user_name, s.name as shift_name
       FROM attendances a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN shifts s ON a.shift_id = s.id
       WHERE a.id = ? AND a.deleted_at IS NULL
       LIMIT 1`,
      [id]
    );
    return rows.length > 0 ? mapAttendanceRow(rows[0]) : null;
  }

  async create(data) {
    const pool = getPool();
    const id = data.id || `ATT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const date = data.sessionDate || data.date || data.clockInDate || new Date().toISOString().slice(0, 10);
    const sql = `
      INSERT INTO attendances (
        id, tenant_id, user_id, date, shift_id, clock_in_time, clock_out_time,
        status, is_cross_day, location, latitude, longitude, selfie_url, notes,
        created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)
    `;
    await pool.query(sql, [
      id,
      data.tenantId || data.tenant_id,
      data.userId || data.user_id,
      date,
      data.shiftId || data.shift_id || null,
      data.clockInTime || data.clock_in_time || null,
      data.clockOutTime || data.clock_out_time || null,
      data.status || 'present',
      data.isCrossDay || data.is_cross_day ? 1 : 0,
      data.location || null,
      data.latitude != null ? data.latitude : null,
      data.longitude != null ? data.longitude : null,
      data.selfieUrl || data.selfie_url || null,
      data.notes || null,
    ]);
    return this.findById(id);
  }

  async update(id, updates) {
    const pool = getPool();
    const setClauses = [];
    const values = [];

    if (updates.clockInTime !== undefined || updates.clock_in_time !== undefined) {
      setClauses.push('clock_in_time = ?');
      values.push(updates.clockInTime ?? updates.clock_in_time);
    }
    if (updates.clockOutTime !== undefined || updates.clock_out_time !== undefined) {
      setClauses.push('clock_out_time = ?');
      values.push(updates.clockOutTime ?? updates.clock_out_time);
    }
    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }
    if (updates.notes !== undefined) {
      setClauses.push('notes = ?');
      values.push(updates.notes);
    }
    if (updates.location !== undefined) {
      setClauses.push('location = ?');
      values.push(updates.location);
    }
    if (updates.shiftId !== undefined || updates.shift_id !== undefined) {
      setClauses.push('shift_id = ?');
      values.push(updates.shiftId ?? updates.shift_id);
    }
    if (updates.date !== undefined) {
      setClauses.push('date = ?');
      values.push(updates.date);
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = NOW()');
      values.push(id);
      await pool.query(`UPDATE attendances SET ${setClauses.join(', ')} WHERE id = ?`, values);
    }

    return this.findById(id);
  }
}

export const attendanceRepository = new AttendanceRepository();
