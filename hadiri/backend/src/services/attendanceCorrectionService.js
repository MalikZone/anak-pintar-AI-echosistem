import { attendanceCorrectionRepository } from '../repositories/AttendanceCorrectionRepository.js';
import { attendanceRepository } from '../repositories/AttendanceRepository.js';
import { userRepository } from '../repositories/UserRepository.js';
import { shiftRepository } from '../repositories/ShiftRepository.js';
import { ATTENDANCE_STATUSES } from '../config/constants.js';
import { notificationService } from './notificationService.js';
import { AppError } from '../utils/appError.js';

class AttendanceCorrectionService {
  /**
   * Submit an attendance correction request
   */
  async createCorrectionRequest({
    userId,
    tenantId,
    date,
    correctionType = 'both',
    proposedClockIn,
    proposedClockOut,
    reason,
    attachmentUrl = null,
  }) {
    if (!date || !reason) {
      throw new AppError('attendance_correction.required_fields', 400);
    }

    if (!proposedClockIn && !proposedClockOut) {
      throw new AppError('attendance_correction.time_required', 400);
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('auth.user_not_found', 404);
    }

    // Check if existing attendance record exists for this date
    const existingAttendance = await attendanceRepository.findTodayAttendance(userId, date);

    const hasLeader = Boolean(user.leaderId);
    const initialStatus = hasLeader ? 'pending_leader' : 'pending_hr';

    const id = `CORR-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newCorrection = await attendanceCorrectionRepository.create({
      id,
      tenantId,
      userId,
      attendanceId: existingAttendance?.id || null,
      date,
      correctionType,
      proposedClockIn: proposedClockIn || null,
      proposedClockOut: proposedClockOut || null,
      reason,
      attachmentUrl,
      status: initialStatus,
    });

    // Notify Leader if available
    if (hasLeader) {
      await notificationService.notifyLeader(user.leaderId, {
        tenantId,
        type: 'correction',
        title: 'Pengajuan Koreksi Presensi',
        message: `${user.name} mengajukan koreksi presensi untuk tanggal ${date}.`,
        link: '/leader/approvals?tab=corrections',
      });
    }

    // Notify HR Admin
    await notificationService.notifyAdmins(tenantId, {
      type: 'correction',
      title: 'Pengajuan Koreksi Presensi',
      message: `${user.name} mengajukan koreksi presensi untuk tanggal ${date}.`,
      link: '/admin/approvals?tab=corrections',
      excludeUserId: userId,
    });

    return attendanceCorrectionRepository.findByIdWithUser(id);
  }

  /**
   * Get employee's own correction requests
   */
  async getMyCorrections(userId) {
    return attendanceCorrectionRepository.findByUser(userId);
  }

  /**
   * Get team pending corrections for Leader
   */
  async getTeamCorrectionsForLeader(leaderId, tenantId) {
    return attendanceCorrectionRepository.findTeamPendingForLeader(leaderId, tenantId);
  }

  /**
   * Get pending corrections for HR Admin
   */
  async getHrPendingCorrections(tenantId) {
    await this.syncApprovedCorrections(tenantId);
    return attendanceCorrectionRepository.findPendingForHr(tenantId);
  }

  /**
   * Leader Action: Approve or Reject
   */
  async leaderAction({ correctionId, leaderUser, action, notes, rejectReason }) {
    const correction = await attendanceCorrectionRepository.findByIdWithUser(correctionId);
    if (!correction) {
      throw new AppError('attendance_correction.not_found', 404);
    }

    // Anti self-approval
    if (correction.userId === leaderUser.id) {
      throw new AppError('attendance_correction.self_approval_forbidden', 403);
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    if (action === 'approve') {
      await attendanceCorrectionRepository.update(correctionId, {
        status: 'pending_hr',
        approved_by_leader_id: leaderUser.id,
        leader_approved_at: now,
        leader_notes: notes || null,
      });

      // Mark leader's pending notification as read
      await notificationService.markActionNotificationsAsRead({
        userId: leaderUser.id,
        tenantId: correction.tenantId,
        link: 'tab=corrections',
        keyword: correction.userName,
      });

      // Notify employee
      await notificationService.notifyUser(correction.userId, {
        tenantId: correction.tenantId,
        type: 'correction',
        title: 'Koreksi Presensi Disetujui Leader',
        message: `Koreksi presensi tanggal ${correction.date} disetujui Leader dan diteruskan ke HR.`,
        link: '/employee/requests?tab=corrections',
      });

      // Notify HR Admin
      await notificationService.notifyAdmins(correction.tenantId, {
        type: 'correction',
        title: 'Koreksi Presensi Menunggu Pengesahan HR',
        message: `Koreksi presensi ${correction.userName} (${correction.date}) telah disetujui Leader dan menunggu pengesahan Anda.`,
        link: '/admin/approvals?tab=corrections',
      });
    } else if (action === 'reject') {
      await attendanceCorrectionRepository.update(correctionId, {
        status: 'rejected',
        approved_by_leader_id: leaderUser.id,
        leader_approved_at: now,
        rejection_reason: rejectReason || notes || 'Ditolak oleh Leader',
      });

      // Mark leader's pending notification as read
      await notificationService.markActionNotificationsAsRead({
        userId: leaderUser.id,
        tenantId: correction.tenantId,
        link: 'tab=corrections',
        keyword: correction.userName,
      });

      // Notify employee
      await notificationService.notifyUser(correction.userId, {
        tenantId: correction.tenantId,
        type: 'correction',
        title: 'Koreksi Presensi Ditolak',
        message: `Koreksi presensi tanggal ${correction.date} ditolak oleh Leader: ${rejectReason || notes || '-'}`,
        link: '/employee/requests?tab=corrections',
      });
    } else {
      throw new AppError('attendance_correction.invalid_action', 400);
    }

    return attendanceCorrectionRepository.findByIdWithUser(correctionId);
  }

  /**
   * Apply an approved correction directly to the attendances table
   */
  async applyCorrectionToAttendance(correction) {
    if (!correction || !correction.userId || !correction.date) return null;

    let existingAtt = null;
    if (correction.attendanceId) {
      existingAtt = await attendanceRepository.findById(correction.attendanceId);
    }
    if (!existingAtt) {
      existingAtt = await attendanceRepository.findTodayAttendance(correction.userId, correction.date);
    }

    const user = await userRepository.findById(correction.userId);
    const shiftId = existingAtt?.shiftId || user?.shiftId || null;
    let shift = null;
    if (shiftId) {
      shift = await shiftRepository.findById(shiftId);
    }

    // Determine effective clock in & out times
    let effectiveClockIn = existingAtt?.clockInTime || null;
    let effectiveClockOut = existingAtt?.clockOutTime || null;

    if (correction.correctionType === 'clock_in' || correction.correctionType === 'both') {
      if (correction.proposedClockIn) effectiveClockIn = correction.proposedClockIn;
    }
    if (correction.correctionType === 'clock_out' || correction.correctionType === 'both') {
      if (correction.proposedClockOut) effectiveClockOut = correction.proposedClockOut;
    }

    // Evaluate punctuality status based on effective clock in
    let isLate = false;
    if (effectiveClockIn) {
      if (shift && shift.startTime) {
        const [startH, startM] = shift.startTime.split(':').map(Number);
        const [inH, inM] = effectiveClockIn.split(':').map(Number);
        const grace = shift.gracePeriodMinutes || 15;
        isLate = inH * 60 + inM > startH * 60 + startM + grace;
      } else {
        const [inH, inM] = effectiveClockIn.split(':').map(Number);
        isLate = inH * 60 + inM > 8 * 60 + 45;
      }
    }
    const punctualityStatus = isLate ? ATTENDANCE_STATUSES.LATE : ATTENDANCE_STATUSES.PRESENT;

    // Database record status:
    // If clocked out -> 'clocked_out'
    // If still open session -> punctualityStatus ('present' or 'late')
    const targetStatus = effectiveClockOut ? ATTENDANCE_STATUSES.CLOCKED_OUT : punctualityStatus;
    const syncNote = `Koreksi disahkan HR: ${correction.reason || 'Koreksi Kehadiran'}`;

    if (existingAtt) {
      const updateData = {
        status: targetStatus,
        notes: existingAtt.notes
          ? (existingAtt.notes.includes('Koreksi disahkan HR') ? existingAtt.notes : `${existingAtt.notes} | ${syncNote}`)
          : syncNote,
      };

      if (effectiveClockIn) updateData.clock_in_time = effectiveClockIn;
      if (effectiveClockOut) updateData.clock_out_time = effectiveClockOut;

      return attendanceRepository.update(existingAtt.id, updateData);
    } else {
      const attId = `ATT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      return attendanceRepository.create({
        id: attId,
        tenant_id: correction.tenantId,
        user_id: correction.userId,
        date: correction.date,
        shift_id: shiftId,
        clock_in_time: effectiveClockIn || shift?.startTime || '08:00',
        clock_out_time: effectiveClockOut || null,
        status: targetStatus,
        location: 'Kantor (Koreksi Disahkan)',
        notes: syncNote,
      });
    }
  }

  /**
   * Auto-sync past approved corrections to ensure all attendance records
   * are in exact synchronization with approved requests.
   */
  async syncApprovedCorrections(tenantId) {
    try {
      const pool = (await import('../database/mysql.js')).getPool();
      let sql = `SELECT * FROM attendance_corrections WHERE status = 'approved' AND deleted_at IS NULL`;
      const params = [];
      if (tenantId) {
        sql += ` AND tenant_id = ?`;
        params.push(tenantId);
      }
      const [rows] = await pool.query(sql, params);
      for (const row of rows) {
        const dateStr = row.date
          ? (typeof row.date === 'string' ? row.date.slice(0, 10) : new Date(row.date).toISOString().slice(0, 10))
          : null;
        await this.applyCorrectionToAttendance({
          id: row.id,
          tenantId: row.tenant_id,
          userId: row.user_id,
          attendanceId: row.attendance_id,
          date: dateStr,
          correctionType: row.correction_type || 'both',
          proposedClockIn: row.proposed_clock_in || null,
          proposedClockOut: row.proposed_clock_out || null,
          reason: row.reason,
        });
      }
    } catch (err) {
      console.warn('syncApprovedCorrections warning:', err.message);
    }
  }

  /**
   * HR Action: Approve or Reject & apply to Attendances table
   */
  async hrAction({ correctionId, hrUser, action, notes, rejectReason }) {
    const correction = await attendanceCorrectionRepository.findByIdWithUser(correctionId);
    if (!correction) {
      throw new AppError('attendance_correction.not_found', 404);
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    if (action === 'approve') {
      await attendanceCorrectionRepository.update(correctionId, {
        status: 'approved',
        approved_by_hr_id: hrUser.id,
        hr_approved_at: now,
        hr_notes: notes || null,
      });

      // Apply to attendances table with complete sync
      await this.applyCorrectionToAttendance(correction);

      // Mark HR pending notification as read
      await notificationService.markActionNotificationsAsRead({
        tenantId: hrUser.tenantId,
        link: 'tab=corrections',
        keyword: correction.userName,
      });

      // Notify employee
      await notificationService.notifyUser(correction.userId, {
        tenantId: correction.tenantId,
        type: 'correction',
        title: 'Koreksi Presensi Disahkan',
        message: `Koreksi presensi tanggal ${correction.date} resmi disahkan oleh HR Admin. Presensi Anda telah diperbarui.`,
        link: '/employee/attendance/history',
      });
    } else if (action === 'reject') {
      await attendanceCorrectionRepository.update(correctionId, {
        status: 'rejected',
        rejection_reason: rejectReason || notes || 'Ditolak oleh HR Admin',
      });

      // Mark HR pending notification as read
      await notificationService.markActionNotificationsAsRead({
        tenantId: hrUser.tenantId,
        link: 'tab=corrections',
        keyword: correction.userName,
      });

      // Notify employee
      await notificationService.notifyUser(correction.userId, {
        tenantId: correction.tenantId,
        type: 'correction',
        title: 'Koreksi Presensi Ditolak HR',
        message: `Koreksi presensi tanggal ${correction.date} ditolak oleh HR Admin: ${rejectReason || notes || '-'}`,
        link: '/employee/requests?tab=corrections',
      });
    } else {
      throw new AppError('attendance_correction.invalid_action', 400);
    }

    return attendanceCorrectionRepository.findByIdWithUser(correctionId);
  }
}

export const attendanceCorrectionService = new AttendanceCorrectionService();
export default attendanceCorrectionService;

