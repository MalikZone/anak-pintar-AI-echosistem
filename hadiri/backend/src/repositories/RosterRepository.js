import { BaseRepository } from './BaseRepository.js';
import { getPool } from '../database/mysql.js';

function mapRosterRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id || row.tenantId,
    tenant_id: row.tenant_id || row.tenantId,
    userId: row.user_id || row.userId,
    user_id: row.user_id || row.userId,
    shiftId: row.shift_id || row.shiftId || null,
    shift_id: row.shift_id || row.shiftId || null,
    date: row.date ? (typeof row.date === 'string' ? row.date.slice(0, 10) : new Date(row.date).toISOString().slice(0, 10)) : null,
    isOffDay: Boolean(row.is_off_day ?? row.isOffDay),
    is_off_day: Boolean(row.is_off_day ?? row.isOffDay),
    notes: row.notes || null,
    shiftName: row.shift_name || row.shiftName || (row.is_off_day || row.isOffDay ? 'Hari Libur / OFF' : 'Shift Kerja'),
    shiftCode: row.shift_code || row.shiftCode || (row.is_off_day || row.isOffDay ? 'OFF' : 'SHIFT'),
    startTime: row.start_time || row.startTime || null,
    endTime: row.end_time || row.endTime || null,
    isCrossDay: Boolean(row.is_cross_day ?? row.isCrossDay),
    userName: row.user_name || row.userName || null,
    department: row.department || null,
    position: row.position || null,
    avatar: row.avatar || null,
    created_at: row.created_at || row.createdAt,
    updated_at: row.updated_at || row.updatedAt,
    deleted_at: row.deleted_at || row.deletedAt || null,
  };
}

class RosterRepository extends BaseRepository {
  constructor() {
    super('rosters');
  }

  async findByUserAndDateRange(tenantId, userId, startDate, endDate) {
    const pool = getPool();
    const sql = `
      SELECT r.*, s.name as shift_name, s.code as shift_code, s.start_time, s.end_time, s.is_cross_day
      FROM rosters r
      LEFT JOIN shifts s ON r.shift_id = s.id
      WHERE r.tenant_id = ? AND r.user_id = ? AND r.date >= ? AND r.date <= ? AND r.deleted_at IS NULL
      ORDER BY r.date ASC
    `;
    const [rows] = await pool.query(sql, [tenantId, userId, startDate, endDate]);
    return rows.map(mapRosterRow);
  }

  async findTeamRosters(tenantId, { startDate, endDate, department = null, userId = null }) {
    const pool = getPool();
    let sql = `
      SELECT r.*, u.name as user_name, u.email as user_email, u.department, u.position, u.avatar,
             s.name as shift_name, s.code as shift_code, s.start_time, s.end_time, s.is_cross_day
      FROM rosters r
      JOIN users u ON r.user_id = u.id AND u.deleted_at IS NULL
      LEFT JOIN shifts s ON r.shift_id = s.id
      WHERE r.tenant_id = ? AND r.date >= ? AND r.date <= ? AND r.deleted_at IS NULL
    `;
    const params = [tenantId, startDate, endDate];

    if (department && department !== 'all') {
      sql += ' AND u.department = ?';
      params.push(department);
    }
    if (userId) {
      sql += ' AND r.user_id = ?';
      params.push(userId);
    }

    sql += ' ORDER BY u.name ASC, r.date ASC';
    const [rows] = await pool.query(sql, params);
    return rows.map(mapRosterRow);
  }

  async upsert(data) {
    const mapped = mapRosterRow(data);
    const pool = getPool();
    const sql = `
      INSERT INTO rosters (id, tenant_id, user_id, shift_id, date, is_off_day, notes, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)
      ON DUPLICATE KEY UPDATE
        shift_id = VALUES(shift_id),
        is_off_day = VALUES(is_off_day),
        notes = VALUES(notes),
        updated_at = NOW(),
        deleted_at = NULL
    `;
    await pool.query(sql, [
      mapped.id || `RST-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      mapped.tenantId,
      mapped.userId,
      mapped.shiftId,
      mapped.date,
      mapped.isOffDay ? 1 : 0,
      mapped.notes,
    ]);
    return mapped;
  }

  async bulkUpsert(tenantId, rosterList) {
    const results = [];
    for (const item of rosterList) {
      const res = await this.upsert({ ...item, tenantId });
      results.push(res);
    }
    return results;
  }
}

export const rosterRepository = new RosterRepository();
