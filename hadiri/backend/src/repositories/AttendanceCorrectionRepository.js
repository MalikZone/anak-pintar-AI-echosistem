import { BaseRepository } from './BaseRepository.js';
import { getPool } from '../database/mysql.js';

function mapCorrectionRow(row) {
  if (!row) return null;
  const dateStr = row.date
    ? typeof row.date === 'string'
      ? row.date.slice(0, 10)
      : new Date(row.date).toISOString().slice(0, 10)
    : null;

  return {
    id: row.id,
    tenantId: row.tenant_id || row.tenantId,
    userId: row.user_id || row.userId,
    userName: row.user_name || null,
    userEmail: row.user_email || null,
    department: row.department || null,
    position: row.position || null,
    avatar: row.avatar || null,
    attendanceId: row.attendance_id || null,
    date: dateStr,
    correctionType: row.correction_type || 'both',
    proposedClockIn: row.proposed_clock_in || null,
    proposedClockOut: row.proposed_clock_out || null,
    reason: row.reason,
    attachmentUrl: row.attachment_url || null,
    status: row.status,
    approvedByLeaderId: row.approved_by_leader_id || null,
    leaderName: row.leader_name || null,
    leaderApprovedAt: row.leader_approved_at || null,
    leaderNotes: row.leader_notes || null,
    approvedByHrId: row.approved_by_hr_id || null,
    hrName: row.hr_name || null,
    hrApprovedAt: row.hr_approved_at || null,
    hrNotes: row.hr_notes || null,
    rejectionReason: row.rejection_reason || null,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    deletedAt: row.deleted_at || row.deletedAt || null,
  };
}

class AttendanceCorrectionRepository extends BaseRepository {
  constructor() {
    super('attendance_corrections');
  }

  async findByUser(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT c.*, 
              u.name as user_name, u.email as user_email, u.department, u.position, u.avatar,
              l.name as leader_name, hr.name as hr_name
       FROM attendance_corrections c
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN users l ON c.approved_by_leader_id = l.id
       LEFT JOIN users hr ON c.approved_by_hr_id = hr.id
       WHERE c.user_id = ? AND c.deleted_at IS NULL
       ORDER BY c.date DESC, c.created_at DESC`,
      [userId]
    );
    return rows.map(mapCorrectionRow);
  }

  async findByIdWithUser(id) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT c.*, 
              u.name as user_name, u.email as user_email, u.department, u.position, u.avatar,
              l.name as leader_name, hr.name as hr_name
       FROM attendance_corrections c
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN users l ON c.approved_by_leader_id = l.id
       LEFT JOIN users hr ON c.approved_by_hr_id = hr.id
       WHERE c.id = ? AND c.deleted_at IS NULL
       LIMIT 1`,
      [id]
    );
    return rows.length > 0 ? mapCorrectionRow(rows[0]) : null;
  }

  async findTeamPendingForLeader(leaderId, tenantId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT c.*, 
              u.name as user_name, u.email as user_email, u.department, u.position, u.avatar,
              l.name as leader_name, hr.name as hr_name
       FROM attendance_corrections c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN users l ON c.approved_by_leader_id = l.id
       LEFT JOIN users hr ON c.approved_by_hr_id = hr.id
       WHERE c.tenant_id = ? 
         AND (u.leader_id = ? OR c.approved_by_leader_id = ?)
         AND c.user_id != ?
         AND c.deleted_at IS NULL
       ORDER BY CASE WHEN c.status = 'pending_leader' THEN 0 ELSE 1 END, c.date DESC, c.created_at DESC`,
      [tenantId, leaderId, leaderId, leaderId]
    );
    return rows.map(mapCorrectionRow);
  }

  async findPendingForHr(tenantId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT c.*, 
              u.name as user_name, u.email as user_email, u.department, u.position, u.avatar,
              l.name as leader_name, hr.name as hr_name
       FROM attendance_corrections c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN users l ON c.approved_by_leader_id = l.id
       LEFT JOIN users hr ON c.approved_by_hr_id = hr.id
       WHERE c.tenant_id = ? 
         AND c.deleted_at IS NULL
       ORDER BY CASE 
         WHEN (c.status = 'pending_hr' OR (c.status = 'pending_leader' AND (u.leader_id IS NULL OR u.leader_id = ''))) THEN 0 
         ELSE 1 
       END, c.date DESC, c.created_at DESC`,
      [tenantId]
    );
    return rows.map(mapCorrectionRow);
  }

  async findByTenant(tenantId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT c.*, 
              u.name as user_name, u.email as user_email, u.department, u.position, u.avatar,
              l.name as leader_name, hr.name as hr_name
       FROM attendance_corrections c
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN users l ON c.approved_by_leader_id = l.id
       LEFT JOIN users hr ON c.approved_by_hr_id = hr.id
       WHERE c.tenant_id = ? AND c.deleted_at IS NULL
       ORDER BY c.date DESC, c.created_at DESC`,
      [tenantId]
    );
    return rows.map(mapCorrectionRow);
  }
}

export const attendanceCorrectionRepository = new AttendanceCorrectionRepository();
export default attendanceCorrectionRepository;

