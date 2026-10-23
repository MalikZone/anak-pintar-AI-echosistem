import { BaseRepository } from './BaseRepository.js';
import { getPool } from '../database/mysql.js';
import { LEAVE_STATUSES } from '../config/constants.js';

const LEAVE_JOIN_SELECT = `
  SELECT l.*,
         u.name as user_name, u.department, u.position, u.avatar,
         u.leave_annual as user_leave_annual, u.leave_sick as user_leave_sick, u.leave_remaining_annual as user_leave_remaining_annual,
         ldr.name as leader_name, ldr.position as leader_position,
         hr.name as hr_name, hr.position as hr_position
  FROM leaves l
  LEFT JOIN users u ON l.user_id = u.id
  LEFT JOIN users ldr ON l.approved_by_leader_id = ldr.id
  LEFT JOIN users hr ON l.approved_by_hr_id = hr.id
`;

function mapLeaveRow(row) {
  if (!row) return null;
  const startDate = row.start_date ? (typeof row.start_date === 'string' ? row.start_date.slice(0, 10) : new Date(row.start_date).toISOString().slice(0, 10)) : null;
  const endDate = row.end_date ? (typeof row.end_date === 'string' ? row.end_date.slice(0, 10) : new Date(row.end_date).toISOString().slice(0, 10)) : null;

  const userLeaveAnnual = row.user_leave_annual != null ? Number(row.user_leave_annual) : 12;
  const userLeaveSick = row.user_leave_sick != null ? Number(row.user_leave_sick) : 14;
  const userLeaveRemaining = row.user_leave_remaining_annual != null ? Number(row.user_leave_remaining_annual) : userLeaveAnnual;

  const isLeaderApproved = Boolean(
    row.approved_by_leader_id ||
    row.leader_approved_at ||
    row.status === 'pending_hr' ||
    row.status === 'approved'
  );

  const leaderApprovedAt = row.leader_approved_at
    ? (typeof row.leader_approved_at === 'string' ? row.leader_approved_at.slice(0, 19).replace('T', ' ') : new Date(row.leader_approved_at).toISOString().slice(0, 19).replace('T', ' '))
    : (isLeaderApproved ? (row.updated_at ? new Date(row.updated_at).toISOString().slice(0, 10) : 'Disetujui') : null);

  const approvedByLeader = isLeaderApproved ? {
    leaderId: row.approved_by_leader_id || null,
    leaderName: row.leader_name || (row.approved_by_leader_id ? 'Leader / Atasan' : 'Leader / Atasan Langsung'),
    leaderPosition: row.leader_position || 'Atasan Langsung',
    approvedAt: leaderApprovedAt,
    notes: row.leader_notes || 'Disetujui oleh Leader/Atasan Langsung',
  } : null;

  const isHrApproved = Boolean(
    row.approved_by_hr_id ||
    row.hr_approved_at ||
    row.status === 'approved'
  );

  const hrApprovedAt = row.hr_approved_at
    ? (typeof row.hr_approved_at === 'string' ? row.hr_approved_at.slice(0, 19).replace('T', ' ') : new Date(row.hr_approved_at).toISOString().slice(0, 19).replace('T', ' '))
    : (isHrApproved ? (row.updated_at ? new Date(row.updated_at).toISOString().slice(0, 10) : 'Disahkan') : null);

  const approvedByHr = isHrApproved ? {
    hrId: row.approved_by_hr_id || null,
    hrName: row.hr_name || (row.approved_by_hr_id ? 'HR Administrator' : 'HR Administrator'),
    hrPosition: row.hr_position || 'HR Admin',
    approvedAt: hrApprovedAt,
    notes: row.hr_notes || 'Disahkan oleh HR Administrator',
  } : null;

  const submittedAt = row.created_at
    ? (typeof row.created_at === 'string' ? row.created_at.slice(0, 10) : new Date(row.created_at).toISOString().slice(0, 10))
    : null;

  return {
    id: row.id,
    tenantId: row.tenant_id || row.tenantId,
    tenant_id: row.tenant_id || row.tenantId,
    userId: row.user_id || row.userId,
    user_id: row.user_id || row.userId,
    userName: row.user_name || row.userName || null,
    employeeName: row.user_name || row.userName || null,
    department: row.department || null,
    position: row.position || null,
    avatar: row.avatar || null,
    userRemainingLeave: userLeaveRemaining,
    userLeaveBalance: {
      annualTotal: userLeaveAnnual,
      sickTotal: userLeaveSick,
      remainingAnnual: userLeaveRemaining,
      annualUsed: Math.max(0, userLeaveAnnual - userLeaveRemaining),
      annual: userLeaveAnnual,
      sick: userLeaveSick,
    },
    type: row.type,
    typeLabel: row.type_label || (row.type === 'sick' ? 'Izin Sakit' : row.type === 'special' ? 'Izin Khusus' : 'Cuti Tahunan'),
    startDate,
    endDate,
    totalDays: Number(row.total_days ?? row.totalDays ?? 1),
    reason: row.reason,
    status: row.status,
    attachmentUrl: row.medical_doc_url || row.attachmentUrl || null,
    medicalDocUrl: row.medical_doc_url || null,
    approvedByLeaderId: row.approved_by_leader_id || row.approvedByLeaderId || null,
    leaderApprovedAt: row.leader_approved_at || null,
    leaderNotes: row.leader_notes || null,
    approvedByLeader,
    approvedByHrId: row.approved_by_hr_id || row.approvedByHrId || null,
    hrApprovedAt: row.hr_approved_at || null,
    hrNotes: row.hr_notes || null,
    approvedByHr,
    submittedAt,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    deletedAt: row.deleted_at || row.deletedAt || null,
  };
}

class LeaveRepository extends BaseRepository {
  constructor() {
    super('leaves');
  }

  async findByUser(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `${LEAVE_JOIN_SELECT}
       WHERE l.user_id = ? AND l.deleted_at IS NULL
       ORDER BY l.created_at DESC`,
      [userId]
    );
    return rows.map(mapLeaveRow);
  }

  async findByTenant(tenantId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `${LEAVE_JOIN_SELECT}
       WHERE l.tenant_id = ? AND l.deleted_at IS NULL
       ORDER BY l.created_at DESC`,
      [tenantId]
    );
    return rows.map(mapLeaveRow);
  }

  async findPendingForLeader(subordinateIds = [], excludeUserId = null) {
    if (!subordinateIds || subordinateIds.length === 0) return [];
    const pool = getPool();
    const filteredSubs = excludeUserId ? subordinateIds.filter((id) => id !== excludeUserId) : subordinateIds;
    if (filteredSubs.length === 0) return [];
    const placeholders = filteredSubs.map(() => '?').join(', ');
    const [rows] = await pool.query(
      `${LEAVE_JOIN_SELECT}
       WHERE l.user_id IN (${placeholders})
         ${excludeUserId ? 'AND l.user_id != ?' : ''}
         AND l.deleted_at IS NULL
       ORDER BY CASE WHEN l.status = ? THEN 0 ELSE 1 END, l.created_at DESC`,
      excludeUserId
        ? [...filteredSubs, excludeUserId, LEAVE_STATUSES.PENDING_LEADER]
        : [...filteredSubs, LEAVE_STATUSES.PENDING_LEADER]
    );
    return rows.map(mapLeaveRow);
  }

  async findPendingForHr(tenantId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `${LEAVE_JOIN_SELECT}
       WHERE l.tenant_id = ? AND l.status = ? AND l.deleted_at IS NULL
       ORDER BY l.created_at DESC`,
      [tenantId, LEAVE_STATUSES.PENDING_HR]
    );
    return rows.map(mapLeaveRow);
  }

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query(
      `${LEAVE_JOIN_SELECT}
       WHERE l.id = ? AND l.deleted_at IS NULL
       LIMIT 1`,
      [id]
    );
    return rows.length > 0 ? mapLeaveRow(rows[0]) : null;
  }

  async create(data) {
    const pool = getPool();
    const id = data.id || `LEV-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const sql = `
      INSERT INTO leaves (
        id, tenant_id, user_id, type, start_date, end_date, total_days, reason,
        status, medical_doc_url, approved_by_leader_id, leader_approved_at, leader_notes,
        approved_by_hr_id, hr_approved_at, hr_notes, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)
    `;
    await pool.query(sql, [
      id,
      data.tenantId || data.tenant_id,
      data.userId || data.user_id,
      data.type || 'annual',
      data.startDate || data.start_date,
      data.endDate || data.end_date,
      data.totalDays ?? data.total_days ?? 1,
      data.reason,
      data.status || 'pending_leader',
      data.attachmentUrl || data.medicalDocUrl || data.medical_doc_url || null,
      data.approvedByLeaderId || data.approved_by_leader_id || null,
      data.leaderApprovedAt || data.leader_approved_at || null,
      data.leaderNotes || data.leader_notes || null,
      data.approvedByHrId || data.approved_by_hr_id || null,
      data.hrApprovedAt || data.hr_approved_at || null,
      data.hrNotes || data.hr_notes || null,
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

    const leaderId = updates.approvedByLeaderId ?? updates.approved_by_leader_id ?? updates.approvedByLeader?.leaderId;
    if (leaderId !== undefined) {
      setClauses.push('approved_by_leader_id = ?');
      values.push(leaderId);
    }

    const leaderAt = updates.leaderApprovedAt ?? updates.leader_approved_at ?? updates.approvedByLeader?.approvedAt;
    if (leaderAt !== undefined) {
      setClauses.push('leader_approved_at = ?');
      values.push(leaderAt ? new Date(leaderAt).toISOString().slice(0, 19).replace('T', ' ') : null);
    }

    const leaderNotes = updates.leaderNotes ?? updates.leader_notes ?? updates.approvedByLeader?.notes ?? (updates.rejectedReason ? `[Ditolak Leader]: ${updates.rejectedReason}` : undefined);
    if (leaderNotes !== undefined) {
      setClauses.push('leader_notes = ?');
      values.push(leaderNotes);
    }

    const hrId = updates.approvedByHrId ?? updates.approved_by_hr_id ?? updates.approvedByHr?.hrId;
    if (hrId !== undefined) {
      setClauses.push('approved_by_hr_id = ?');
      values.push(hrId);
    }

    const hrAt = updates.hrApprovedAt ?? updates.hr_approved_at ?? updates.approvedByHr?.approvedAt;
    if (hrAt !== undefined) {
      setClauses.push('hr_approved_at = ?');
      values.push(hrAt ? new Date(hrAt).toISOString().slice(0, 19).replace('T', ' ') : null);
    }

    const hrNotes = updates.hrNotes ?? updates.hr_notes ?? updates.approvedByHr?.notes ?? (updates.status === 'rejected' && updates.rejectedReason ? `[Ditolak HR]: ${updates.rejectedReason}` : undefined);
    if (hrNotes !== undefined) {
      setClauses.push('hr_notes = ?');
      values.push(hrNotes);
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = NOW()');
      values.push(id);
      await pool.query(`UPDATE leaves SET ${setClauses.join(', ')} WHERE id = ?`, values);
    }

    return this.findById(id);
  }
}

export const leaveRepository = new LeaveRepository();
