import { BaseRepository } from './BaseRepository.js';
import { getPool } from '../database/mysql.js';

function mapSwitchRow(row) {
  if (!row) return null;
  const targetDate = row.target_date ? (typeof row.target_date === 'string' ? row.target_date.slice(0, 10) : new Date(row.target_date).toISOString().slice(0, 10)) : (row.targetDate || null);

  return {
    id: row.id,
    tenantId: row.tenant_id || row.tenantId,
    tenant_id: row.tenant_id || row.tenantId,
    userId: row.user_id || row.userId,
    user_id: row.user_id || row.userId,
    userName: row.user_name || row.userName || null,
    userEmail: row.user_email || row.userEmail || null,
    userDepartment: row.user_department || row.userDepartment || '',
    userPosition: row.user_position || row.userPosition || '',
    userLeaderId: row.user_leader_id || row.userLeaderId || null,
    targetDate,
    target_date: targetDate,
    originalShiftId: row.original_shift_id || row.originalShiftId || null,
    original_shift_id: row.original_shift_id || row.originalShiftId || null,
    originalShiftName: row.orig_shift_name || row.originalShiftName || 'Default Regular',
    originalShiftCode: row.orig_shift_code || row.originalShiftCode || null,
    originalStartTime: row.orig_start_time || row.originalStartTime || null,
    originalEndTime: row.orig_end_time || row.originalEndTime || null,
    requestedShiftId: row.requested_shift_id || row.requestedShiftId,
    requested_shift_id: row.requested_shift_id || row.requestedShiftId,
    requestedShiftName: row.req_shift_name || row.requestedShiftName || 'Selected Shift',
    requestedShiftCode: row.req_shift_code || row.requestedShiftCode || null,
    requestedStartTime: row.req_start_time || row.requestedStartTime || null,
    requestedEndTime: row.req_end_time || row.requestedEndTime || null,
    reason: row.reason || '',
    originalShift: row.original_shift_id ? {
      id: row.original_shift_id,
      name: row.orig_shift_name || row.originalShiftName || 'Regular Shift',
      code: row.orig_shift_code || row.originalShiftCode || null,
      startTime: row.orig_start_time || row.originalStartTime || null,
      endTime: row.orig_end_time || row.originalEndTime || null,
    } : null,
    requestedShift: {
      id: row.requested_shift_id,
      name: row.req_shift_name || row.requestedShiftName || 'Selected Shift',
      code: row.req_shift_code || row.requestedShiftCode || null,
      startTime: row.req_start_time || row.requestedStartTime || null,
      endTime: row.req_end_time || row.requestedEndTime || null,
    },
    status: row.status || 'pending_leader',
    approvedById: row.approved_by_id || row.approvedById || null,
    approved_by_id: row.approved_by_id || row.approvedById || null,
    approvedAt: row.approved_at || row.approvedAt || null,
    approved_at: row.approved_at || row.approvedAt || null,
    rejectionReason: row.rejection_reason || row.rejectionReason || null,
    rejection_reason: row.rejection_reason || row.rejectionReason || null,
    created_at: row.created_at || row.createdAt,
    updated_at: row.updated_at || row.updatedAt,
    deleted_at: row.deleted_at || row.deletedAt || null,
  };
}

class ShiftSwitchRepository extends BaseRepository {
  constructor() {
    super('shift_switches');
  }

  async findById(id) {
    const pool = getPool();
    const sql = `
      SELECT sw.*, u.name as user_name, u.email as user_email, u.department as user_department, u.position as user_position, u.leader_id as user_leader_id,
             s1.name as orig_shift_name, s1.code as orig_shift_code, s1.start_time as orig_start_time, s1.end_time as orig_end_time,
             s2.name as req_shift_name, s2.code as req_shift_code, s2.start_time as req_start_time, s2.end_time as req_end_time
      FROM shift_switches sw
      JOIN users u ON sw.user_id = u.id
      LEFT JOIN shifts s1 ON sw.original_shift_id = s1.id
      JOIN shifts s2 ON sw.requested_shift_id = s2.id
      WHERE sw.id = ? AND sw.deleted_at IS NULL
    `;
    const [rows] = await pool.query(sql, [id]);
    return rows[0] ? mapSwitchRow(rows[0]) : null;
  }

  async findByTenant(tenantId, includeResolved = false, status = null) {
    const pool = getPool();
    let sql = `
      SELECT sw.*, u.name as user_name, u.email as user_email, u.department as user_department, u.position as user_position, u.leader_id as user_leader_id,
             s1.name as orig_shift_name, s1.code as orig_shift_code, s1.start_time as orig_start_time, s1.end_time as orig_end_time,
             s2.name as req_shift_name, s2.code as req_shift_code, s2.start_time as req_start_time, s2.end_time as req_end_time
      FROM shift_switches sw
      JOIN users u ON sw.user_id = u.id
      LEFT JOIN shifts s1 ON sw.original_shift_id = s1.id
      JOIN shifts s2 ON sw.requested_shift_id = s2.id
      WHERE sw.tenant_id = ? AND sw.deleted_at IS NULL
    `;
    const params = [tenantId];
    if (status) {
      sql += ` AND sw.status = ?`;
      params.push(status);
    } else if (!includeResolved) {
      sql += ` AND sw.status IN ('pending_leader', 'pending_hr')`;
    }
    sql += ` ORDER BY sw.created_at DESC`;
    const [rows] = await pool.query(sql, params);
    return rows.map(mapSwitchRow);
  }

  async findPendingForLeader(subordinateIds = [], excludeUserId = null) {
    if (!subordinateIds || subordinateIds.length === 0) return [];
    const pool = getPool();
    const filteredSubs = excludeUserId ? subordinateIds.filter(id => id !== excludeUserId) : subordinateIds;
    if (filteredSubs.length === 0) return [];

    const placeholders = filteredSubs.map(() => '?').join(', ');
    const sql = `
      SELECT sw.*, u.name as user_name, u.email as user_email, u.department as user_department, u.position as user_position, u.leader_id as user_leader_id,
             s1.name as orig_shift_name, s1.code as orig_shift_code, s1.start_time as orig_start_time, s1.end_time as orig_end_time,
             s2.name as req_shift_name, s2.code as req_shift_code, s2.start_time as req_start_time, s2.end_time as req_end_time
      FROM shift_switches sw
      JOIN users u ON sw.user_id = u.id
      LEFT JOIN shifts s1 ON sw.original_shift_id = s1.id
      JOIN shifts s2 ON sw.requested_shift_id = s2.id
      WHERE sw.user_id IN (${placeholders}) 
        ${excludeUserId ? 'AND sw.user_id != ?' : ''}
        AND sw.deleted_at IS NULL
      ORDER BY CASE WHEN sw.status = 'pending_leader' THEN 0 ELSE 1 END, sw.created_at DESC
    `;
    const [rows] = await pool.query(sql, excludeUserId ? [...filteredSubs, excludeUserId] : filteredSubs);
    return rows.map(mapSwitchRow);
  }

  async findPendingForHr(tenantId) {
    const pool = getPool();
    const sql = `
      SELECT sw.*, u.name as user_name, u.email as user_email, u.department as user_department, u.position as user_position, u.leader_id as user_leader_id,
             s1.name as orig_shift_name, s1.code as orig_shift_code, s1.start_time as orig_start_time, s1.end_time as orig_end_time,
             s2.name as req_shift_name, s2.code as req_shift_code, s2.start_time as req_start_time, s2.end_time as req_end_time
      FROM shift_switches sw
      JOIN users u ON sw.user_id = u.id
      LEFT JOIN shifts s1 ON sw.original_shift_id = s1.id
      JOIN shifts s2 ON sw.requested_shift_id = s2.id
      WHERE sw.tenant_id = ? AND sw.status = 'pending_hr' AND sw.deleted_at IS NULL
      ORDER BY sw.created_at DESC
    `;
    const [rows] = await pool.query(sql, [tenantId]);
    return rows.map(mapSwitchRow);
  }

  async findByUser(userId, includeResolved = true) {
    const pool = getPool();
    let sql = `
      SELECT sw.*, u.name as user_name, u.email as user_email, u.department as user_department, u.position as user_position, u.leader_id as user_leader_id,
             s1.name as orig_shift_name, s1.code as orig_shift_code, s1.start_time as orig_start_time, s1.end_time as orig_end_time,
             s2.name as req_shift_name, s2.code as req_shift_code, s2.start_time as req_start_time, s2.end_time as req_end_time
      FROM shift_switches sw
      JOIN users u ON sw.user_id = u.id
      LEFT JOIN shifts s1 ON sw.original_shift_id = s1.id
      JOIN shifts s2 ON sw.requested_shift_id = s2.id
      WHERE sw.user_id = ? AND sw.deleted_at IS NULL
    `;
    if (!includeResolved) {
      sql += ` AND sw.status IN ('pending_leader', 'pending_hr')`;
    }
    sql += ` ORDER BY sw.created_at DESC`;
    const [rows] = await pool.query(sql, [userId]);
    return rows.map(mapSwitchRow);
  }

  async create(data) {
    const pool = getPool();
    const id = data.id || `SWS-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const targetDate = data.targetDate ? (typeof data.targetDate === 'string' ? data.targetDate.slice(0, 10) : new Date(data.targetDate).toISOString().slice(0, 10)) : (data.target_date || null);

    await pool.query(
      `INSERT INTO shift_switches (
        id, tenant_id, user_id, target_date, original_shift_id,
        requested_shift_id, reason, status, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)`,
      [
        id,
        data.tenantId || data.tenant_id,
        data.userId || data.user_id,
        targetDate,
        data.originalShiftId || data.original_shift_id || null,
        data.requestedShiftId || data.requested_shift_id,
        data.reason,
        data.status || 'pending_leader',
      ]
    );

    return this.findById(id);
  }

  async review(id, { status, approvedById, rejectionReason = null }) {
    const pool = getPool();
    await pool.query(
      `UPDATE shift_switches SET
        status = ?, approved_by_id = ?, approved_at = NOW(), rejection_reason = ?, updated_at = NOW()
      WHERE id = ?`,
      [status, approvedById, rejectionReason, id]
    );
    return this.findById(id);
  }
}

export const shiftSwitchRepository = new ShiftSwitchRepository();
