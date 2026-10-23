import { BaseRepository } from './BaseRepository.js';
import { getPool } from '../database/mysql.js';

function formatDateTimeForSql(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function mapOvertimeRow(row) {
  if (!row) return null;
  const dateStr = row.date ? (typeof row.date === 'string' ? row.date.slice(0, 10) : new Date(row.date).toISOString().slice(0, 10)) : null;
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dayName = dateStr ? dayNames[new Date(dateStr).getDay()] || 'Hari' : 'Hari';
  const duration = Number(row.duration_hours ?? row.durationHours ?? 0);

  return {
    id: row.id,
    tenantId: row.tenant_id || row.tenantId,
    tenant_id: row.tenant_id || row.tenantId,
    userId: row.user_id || row.userId,
    user_id: row.user_id || row.userId,
    employeeId: row.user_id || row.userId,
    userName: row.user_name || row.userName || 'Karyawan',
    employeeName: row.user_name || row.userName || 'Karyawan',
    department: row.department || '-',
    position: row.position || '-',
    avatar: row.avatar || null,
    type: row.type || 'post_shift',
    typeLabel: row.type === 'holiday' ? 'Lembur Hari Libur' : row.type === 'pre_shift' ? 'Lembur Pra-Shift' : 'Lembur Reguler',
    splNumber: row.spl_number || row.splNumber || `SPL-${row.id?.slice(-4) || 'REQ'}`,
    date: dateStr,
    dayName,
    startTime: row.start_time || row.startTime || null,
    endTime: row.end_time || row.endTime || null,
    durationHours: duration,
    estimatedRateIDR: Math.round(duration * 95000),
    reason: row.reason || '',
    status: row.status || 'pending',
    approvedById: row.approved_by_id || row.approvedById || null,
    approvedAt: row.approved_at || null,
    rejectionReason: row.rejection_reason || null,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    deletedAt: row.deleted_at || row.deletedAt || null,
  };
}

class OvertimeRepository extends BaseRepository {
  constructor() {
    super('overtimes');
  }

  async findByUser(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT o.*, u.name as user_name, u.department, u.position, u.avatar
       FROM overtimes o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.user_id = ? AND o.deleted_at IS NULL
       ORDER BY o.created_at DESC`,
      [userId]
    );
    return rows.map(mapOvertimeRow);
  }

  async findByTenant(tenantId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT o.*, u.name as user_name, u.department, u.position, u.avatar
       FROM overtimes o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.tenant_id = ? AND o.deleted_at IS NULL
       ORDER BY o.created_at DESC`,
      [tenantId]
    );
    return rows.map(mapOvertimeRow);
  }

  async findBySubordinates(subordinateIds = []) {
    if (!subordinateIds || subordinateIds.length === 0) return [];
    const pool = getPool();
    const placeholders = subordinateIds.map(() => '?').join(', ');
    const [rows] = await pool.query(
      `SELECT o.*, u.name as user_name, u.department, u.position, u.avatar
       FROM overtimes o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.user_id IN (${placeholders}) AND o.deleted_at IS NULL
       ORDER BY o.created_at DESC`,
      subordinateIds
    );
    return rows.map(mapOvertimeRow);
  }

  async findPendingForLeader(subordinateIds = [], excludeUserId = null) {
    if (!subordinateIds || subordinateIds.length === 0) return [];
    const pool = getPool();
    const filteredSubs = excludeUserId ? subordinateIds.filter(id => id !== excludeUserId) : subordinateIds;
    if (filteredSubs.length === 0) return [];

    const placeholders = filteredSubs.map(() => '?').join(', ');
    const [rows] = await pool.query(
      `SELECT o.*, u.name as user_name, u.department, u.position, u.avatar
       FROM overtimes o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.user_id IN (${placeholders})
         ${excludeUserId ? 'AND o.user_id != ?' : ''}
         AND o.deleted_at IS NULL
       ORDER BY CASE WHEN (o.status = 'pending_leader' OR o.status = 'pending') THEN 0 ELSE 1 END, o.created_at DESC`,
      excludeUserId ? [...filteredSubs, excludeUserId] : filteredSubs
    );
    return rows.map(mapOvertimeRow);
  }

  async findPendingForHr(tenantId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT o.*, u.name as user_name, u.department, u.position, u.avatar
       FROM overtimes o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.tenant_id = ? 
         AND (o.status = 'pending_hr' OR (o.status = 'pending' AND u.leader_id IS NULL))
         AND o.deleted_at IS NULL
       ORDER BY o.created_at DESC`,
      [tenantId]
    );
    return rows.map(mapOvertimeRow);
  }

  async findPendingByTenant(tenantId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT o.*, u.name as user_name, u.department, u.position, u.avatar
       FROM overtimes o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.tenant_id = ? AND o.status IN ('pending', 'pending_hr') AND o.deleted_at IS NULL
       ORDER BY o.created_at DESC`,
      [tenantId]
    );
    return rows.map(mapOvertimeRow);
  }

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT o.*, u.name as user_name, u.department, u.position, u.avatar
       FROM overtimes o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = ? AND o.deleted_at IS NULL
       LIMIT 1`,
      [id]
    );
    return rows.length > 0 ? mapOvertimeRow(rows[0]) : null;
  }

  async create(data) {
    const pool = getPool();
    const id = data.id || `OT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const sql = `
      INSERT INTO overtimes (
        id, tenant_id, user_id, type, spl_number, date, start_time, end_time,
        duration_hours, reason, status, approved_by_id, approved_at, rejection_reason,
        created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)
    `;
    const cleanDate = data.date ? (typeof data.date === 'string' ? data.date.slice(0, 10) : new Date(data.date).toISOString().slice(0, 10)) : null;
    await pool.query(sql, [
      id,
      data.tenantId || data.tenant_id,
      data.userId || data.user_id,
      data.type || 'regular',
      data.splNumber || data.spl_number || `SPL-${Date.now()}`,
      cleanDate,
      data.startTime || data.start_time,
      data.endTime || data.end_time,
      data.durationHours ?? data.duration_hours ?? 0,
      data.reason || '',
      data.status || 'pending',
      data.approvedById || data.approved_by_id || null,
      formatDateTimeForSql(data.approvedAt || data.approved_at),
      data.rejectionReason || data.rejection_reason || null,
    ]);
    return this.findById(id);
  }

  async update(id, updates) {
    const pool = getPool();
    const setClauses = [];
    const values = [];

    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }
    if (updates.approvedById !== undefined || updates.approved_by_id !== undefined) {
      setClauses.push('approved_by_id = ?');
      values.push(updates.approvedById ?? updates.approved_by_id);
    }
    if (updates.approvedAt !== undefined || updates.approved_at !== undefined) {
      setClauses.push('approved_at = ?');
      values.push(formatDateTimeForSql(updates.approvedAt ?? updates.approved_at));
    }
    if (updates.rejectionReason !== undefined || updates.rejection_reason !== undefined) {
      setClauses.push('rejection_reason = ?');
      values.push(updates.rejectionReason ?? updates.rejection_reason);
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = NOW()');
      values.push(id);
      await pool.query(`UPDATE overtimes SET ${setClauses.join(', ')} WHERE id = ?`, values);
    }

    return this.findById(id);
  }
}

export const overtimeRepository = new OvertimeRepository();
