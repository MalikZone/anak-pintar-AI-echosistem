import { overtimeRepository } from '../repositories/OvertimeRepository.js';
import { userRepository } from '../repositories/UserRepository.js';
import { notificationService } from './notificationService.js';
import { AppError } from '../utils/appError.js';
import { OVERTIME_STATUSES, ROLES } from '../config/constants.js';

class OvertimeService {
  async createOvertimeRequest({ userId, tenantId, type, date, startTime, endTime, durationHours, reason }) {
    if (!date || !startTime || !endTime || !reason) {
      throw new AppError('overtime.required_fields', 400);
    }

    const user = await userRepository.findById(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new AppError('auth.user_not_found', 404);
    }

    const duration = Number(durationHours) || 2.0;
    const estimatedRate = Math.round(duration * 95000);

    // Initial status: if user has a leader, must be approved by leader first!
    let initialStatus = OVERTIME_STATUSES.PENDING_LEADER;
    if (!user.leaderId) {
      initialStatus = OVERTIME_STATUSES.PENDING_HR;
    }

    const newRequest = await overtimeRepository.create({
      tenantId,
      userId: user.id,
      userName: user.name,
      department: user.department,
      position: user.position,
      type: type || 'post_shift',
      date,
      startTime,
      endTime,
      durationHours: duration,
      estimatedRateIDR: estimatedRate,
      reason,
      status: initialStatus,
      splNumber: `SPL/${user.department?.slice(0, 4).toUpperCase() || 'SPL'}/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`,
      approvedById: null,
      approvedAt: null,
      rejectionReason: null,
    });

    // Notify Leader if exists
    if (user.leaderId) {
      notificationService.notifyLeader(user.leaderId, {
        tenantId,
        type: 'overtime',
        title: 'Pengajuan Lembur (SPL)',
        message: `${user.name} mengajukan lembur untuk tanggal ${date} (${duration} jam).`,
        link: '/leader/approvals?tab=overtimes',
      }).catch(console.error);
    }

    // Notify HR Admin
    notificationService.notifyAdmins(tenantId, {
      type: 'overtime',
      title: 'Pengajuan Lembur (SPL) Baru',
      message: `${user.name} mengajukan lembur untuk tanggal ${date} (${duration} jam).`,
      link: '/admin/approvals?tab=overtimes',
      excludeUserId: userId,
    }).catch(console.error);

    return newRequest;
  }

  /**
   * Tahap 1: Leader / Atasan Langsung melakukan review lembur bawahan
   */
  async leaderApproval({ overtimeId, leaderUser, action, notes, rejectReason }) {
    const ot = await overtimeRepository.findById(overtimeId);
    if (!ot || ot.tenantId !== leaderUser.tenantId) {
      throw new AppError('overtime.not_found', 404);
    }

    // Anti Self-Approval: Pemohon dilarang keras menyetujui request miliknya sendiri!
    if (ot.userId === leaderUser.id) {
      throw new AppError('overtime.cannot_approve_self', 403);
    }

    // Verifikasi bahwa status masih pending_leader
    if (ot.status !== OVERTIME_STATUSES.PENDING_LEADER && ot.status !== OVERTIME_STATUSES.PENDING) {
      throw new AppError('overtime.not_pending_leader', 400, { status: ot.status });
    }

    // Verifikasi bahwa pemohon adalah bawahan langsung leader ini atau leader memiliki otorisasi (Manager / HR Admin / Super Admin)
    const applicant = await userRepository.findById(ot.userId);
    const isDirectLeader = applicant?.leaderId === leaderUser.id;
    const isManager = Boolean(applicant?.managerId && applicant.managerId === leaderUser.id);
    if (!isDirectLeader && !isManager && leaderUser.role !== ROLES.SUPER_ADMIN && leaderUser.role !== ROLES.HR_ADMIN) {
      throw new AppError('overtime.not_subordinate', 403);
    }

    if (action === 'approve') {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const updated = await overtimeRepository.update(overtimeId, {
        status: OVERTIME_STATUSES.PENDING_HR, // Dioper ke HR untuk persetujuan final
        approvedById: leaderUser.id,
        approvedAt: now,
      });

      // Mark leader's notification as read
      await notificationService.markActionNotificationsAsRead({
        userId: leaderUser.id,
        tenantId: ot.tenantId,
        link: 'tab=overtimes',
        keyword: applicant?.name,
      });

      // Notify employee
      notificationService.notifyUser(ot.userId, {
        tenantId: ot.tenantId,
        type: 'overtime',
        title: 'Lembur Disetujui Leader',
        message: `Pengajuan lembur tanggal ${ot.date} disetujui Leader dan diteruskan ke HR untuk pengesahan final.`,
        link: '/employee/overtime',
      }).catch(console.error);

      // Notify HR Admin
      notificationService.notifyAdmins(ot.tenantId, {
        type: 'overtime',
        title: 'Lembur Menunggu Pengesahan HR',
        message: `Pengajuan lembur ${applicant?.name || 'karyawan'} (${ot.date}) telah disetujui Leader dan siap disahkan HR.`,
        link: '/admin/approvals?tab=overtimes',
      }).catch(console.error);

      return updated;
    } else if (action === 'reject') {
      const updated = await overtimeRepository.update(overtimeId, {
        status: OVERTIME_STATUSES.REJECTED, // Ditolak, tidak bisa diproses lagi
        rejectionReason: rejectReason || 'Ditolak oleh Leader terkait operasional tim.',
      });

      // Mark leader's notification as read
      await notificationService.markActionNotificationsAsRead({
        userId: leaderUser.id,
        tenantId: ot.tenantId,
        link: 'tab=overtimes',
        keyword: applicant?.name,
      });

      // Notify employee
      notificationService.notifyUser(ot.userId, {
        tenantId: ot.tenantId,
        type: 'overtime',
        title: 'Lembur Ditolak Leader',
        message: `Pengajuan lembur tanggal ${ot.date} ditolak oleh Leader: ${rejectReason || notes || '-'}`,
        link: '/employee/overtime',
      }).catch(console.error);

      return updated;
    } else {
      throw new AppError('overtime.invalid_action', 400);
    }
  }

  /**
   * Tahap 2: HR Admin melakukan persetujuan final lembur
   */
  async hrApproval({ overtimeId, hrUser, action, rejectReason }) {
    const ot = await overtimeRepository.findById(overtimeId);
    if (!ot || ot.tenantId !== hrUser.tenantId) {
      throw new AppError('overtime.not_found', 404);
    }

    // Anti Self-Approval: HR tidak boleh menyetujui lembur miliknya sendiri
    if (ot.userId === hrUser.id && hrUser.role !== ROLES.SUPER_ADMIN) {
      throw new AppError('overtime.cannot_approve_self', 403);
    }

    // PENTING: HR belum bisa setujui/tolak jika status masih pending_leader!
    if (ot.status === OVERTIME_STATUSES.PENDING_LEADER) {
      throw new AppError('overtime.leader_approval_required', 400);
    }

    if (ot.status !== OVERTIME_STATUSES.PENDING_HR && ot.status !== OVERTIME_STATUSES.PENDING) {
      throw new AppError('overtime.not_pending_hr', 400, { status: ot.status });
    }

    const applicant = await userRepository.findById(ot.userId);

    if (action === 'approve') {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const updated = await overtimeRepository.update(overtimeId, {
        status: OVERTIME_STATUSES.APPROVED,
        approvedById: hrUser.id,
        approvedAt: now,
      });

      // Mark HR notification as read
      await notificationService.markActionNotificationsAsRead({
        tenantId: hrUser.tenantId,
        link: 'tab=overtimes',
        keyword: applicant?.name,
      });

      // Notify employee
      notificationService.notifyUser(ot.userId, {
        tenantId: ot.tenantId,
        type: 'overtime',
        title: 'Lembur Resmi Disahkan HR',
        message: `Pengajuan lembur tanggal ${ot.date} (${ot.durationHours || 0} jam) resmi disahkan oleh HR Admin.`,
        link: '/employee/overtime',
      }).catch(console.error);

      return updated;
    } else if (action === 'reject') {
      const updated = await overtimeRepository.update(overtimeId, {
        status: OVERTIME_STATUSES.REJECTED,
        rejectionReason: rejectReason || 'Ditolak oleh HR.',
      });

      // Mark HR notification as read
      await notificationService.markActionNotificationsAsRead({
        tenantId: hrUser.tenantId,
        link: 'tab=overtimes',
        keyword: applicant?.name,
      });

      // Notify employee
      notificationService.notifyUser(ot.userId, {
        tenantId: ot.tenantId,
        type: 'overtime',
        title: 'Lembur Ditolak HR',
        message: `Pengajuan lembur tanggal ${ot.date} ditolak oleh HR Admin: ${rejectReason || '-'}`,
        link: '/employee/overtime',
      }).catch(console.error);

      return updated;
    } else {
      throw new AppError('overtime.invalid_action', 400);
    }
  }

  async getMyOvertimes(userId) {
    const list = await overtimeRepository.findByUser(userId);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getTeamOvertimesForLeader(leaderId, tenantId) {
    const subordinates = await userRepository.findSubordinates(leaderId);
    const subIds = subordinates.map((s) => s.id).filter((id) => id !== leaderId);
    if (subIds.length === 0) return [];
    const list = await overtimeRepository.findPendingForLeader(subIds, leaderId);
    return list.sort((a, b) => {
      const aPending = a.status === 'pending_leader' || a.status === 'pending' ? 0 : 1;
      const bPending = b.status === 'pending_leader' || b.status === 'pending' ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  async getTenantOvertimes(tenantId, user = null) {
    if (user && user.role === ROLES.LEADER) {
      return this.getTeamOvertimesForLeader(user.id, tenantId);
    }
    const list = await overtimeRepository.findByTenant(tenantId);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getHrPendingOvertimes(tenantId) {
    const list = await overtimeRepository.findPendingForHr(tenantId);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

export const overtimeService = new OvertimeService();
