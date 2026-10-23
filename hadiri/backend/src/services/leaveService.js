import { leaveRepository } from '../repositories/LeaveRepository.js';
import { leaveTypeRepository } from '../repositories/LeaveTypeRepository.js';
import { userRepository } from '../repositories/UserRepository.js';
import { notificationService } from './notificationService.js';
import { AppError } from '../utils/appError.js';
import { LEAVE_STATUSES, ROLES } from '../config/constants.js';

class LeaveService {
  /**
   * Karyawan mengajukan cuti.
   * Cuti dimulai dengan status 'pending_leader' jika memiliki atasan.
   */
  async createLeaveRequest({ userId, tenantId, type, typeLabel, startDate, endDate, totalDays, reason, attachmentUrl }) {
    if (!startDate || !endDate || !reason) {
      throw new AppError('leave.required_fields', 400);
    }

    const user = await userRepository.findById(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new AppError('auth.user_not_found', 404);
    }

    const durationDays = Number(totalDays) || 1;

    // Look up dynamic leave type from master data if available
    let matchedType = null;
    try {
      matchedType = await leaveTypeRepository.findByCode(tenantId, type);
    } catch (err) {}

    // Check quota for annual leave or if leave type deducts from annual
    const shouldDeductAnnual = type === 'annual' || Boolean(matchedType?.deductAnnual);
    if (shouldDeductAnnual) {
      const remaining = user.leaveBalance?.remainingAnnual ?? 0;
      if (remaining < durationDays) {
        throw new AppError('leave.quota_insufficient', 400, {
          remaining,
          requested: durationDays,
        });
      }
    }

    // Determine initial status based on hierarchy
    let initialStatus = LEAVE_STATUSES.PENDING_LEADER;
    if (!user.leaderId) {
      // If user is a top manager without a direct leader, escalate directly to HR
      initialStatus = LEAVE_STATUSES.PENDING_HR;
    }

    const resolvedTypeLabel =
      typeLabel ||
      matchedType?.name ||
      (type === 'sick' ? 'Izin Sakit' : type === 'special' ? 'Izin Khusus' : 'Cuti Tahunan');

    const newLeave = await leaveRepository.create({
      tenantId,
      userId: user.id,
      userName: user.name,
      department: user.department,
      position: user.position,
      type: type || 'annual',
      typeLabel: resolvedTypeLabel,
      startDate,
      endDate,
      totalDays: durationDays,
      reason,
      attachmentUrl: attachmentUrl || null,
      status: initialStatus,
      leaderId: user.leaderId || null,
      approvedByLeader: null,
      approvedByHr: null,
      rejectedBy: null,
      rejectedReason: null,
    });

    // Notify Leader if user has one
    if (user.leaderId) {
      notificationService.notifyLeader(user.leaderId, {
        tenantId,
        type: 'leave',
        title: 'Pengajuan Cuti / Izin',
        message: `${user.name} mengajukan ${resolvedTypeLabel} (${startDate} s/d ${endDate}).`,
        link: '/leader/approvals?tab=leaves',
      }).catch(console.error);
    }

    // Notify HR Admin
    notificationService.notifyAdmins(tenantId, {
      type: 'leave',
      title: 'Pengajuan Cuti / Izin Baru',
      message: `${user.name} mengajukan ${resolvedTypeLabel} (${startDate} s/d ${endDate}).`,
      link: '/admin/approvals?tab=leaves',
      excludeUserId: userId,
    }).catch(console.error);

    return newLeave;
  }

  /**
   * Tahap 1: Leader / Atasan Langsung melakukan review & approval
   */
  async leaderApproval({ leaveId, leaderUser, action, notes, rejectReason }) {
    const leave = await leaveRepository.findById(leaveId);
    if (!leave || leave.tenantId !== leaderUser.tenantId) {
      throw new AppError('leave.not_found', 404);
    }

    // Verifikasi bahwa status masih pending_leader
    if (leave.status !== LEAVE_STATUSES.PENDING_LEADER) {
      throw new AppError('leave.not_pending_leader', 400, { status: leave.status });
    }

    // Anti Self-Approval: Pemohon dilarang keras menyetujui atau menolak request miliknya sendiri!
    if (leave.userId === leaderUser.id) {
      throw new AppError('leave.cannot_approve_self', 403);
    }

    // Verifikasi kewenangan: user harus merupakan leader dari pemohon atau seorang manager
    const applicant = await userRepository.findById(leave.userId);
    const isDirectLeader = applicant?.leaderId === leaderUser.id;
    const isManager = leaderUser.role === ROLES.LEADER && Boolean(applicant?.managerId && applicant.managerId === leaderUser.id);

    if (!isDirectLeader && !isManager && leaderUser.role !== ROLES.SUPER_ADMIN) {
      throw new AppError('leave.not_subordinate', 403);
    }

    if (action === 'approve') {
      const updated = await leaveRepository.update(leaveId, {
        status: LEAVE_STATUSES.PENDING_HR, // Naik ke tahap berikutnya: Menunggu HR
        approvedByLeader: {
          leaderId: leaderUser.id,
          leaderName: leaderUser.name,
          leaderPosition: leaderUser.position,
          approvedAt: new Date().toISOString(),
          notes: notes || 'Disetujui oleh Leader/Atasan Langsung',
        },
      });

      // Mark leader's pending notification as read
      await notificationService.markActionNotificationsAsRead({
        userId: leaderUser.id,
        tenantId: leave.tenantId,
        link: 'tab=leaves',
        keyword: applicant?.name,
      });

      // Notify employee
      notificationService.notifyUser(leave.userId, {
        tenantId: leave.tenantId,
        type: 'leave',
        title: 'Cuti Disetujui Leader',
        message: 'Pengajuan cuti Anda telah disetujui Leader dan diteruskan ke HR untuk pengesahan final.',
        link: '/employee/requests?tab=leaves',
      }).catch(console.error);

      // Notify HR Admin
      notificationService.notifyAdmins(leave.tenantId, {
        type: 'leave',
        title: 'Cuti Menunggu Pengesahan HR',
        message: `Pengajuan cuti ${applicant?.name || 'karyawan'} telah disetujui Leader dan siap disahkan HR.`,
        link: '/admin/approvals?tab=leaves',
      }).catch(console.error);

      return updated;
    } else if (action === 'reject') {
      const updated = await leaveRepository.update(leaveId, {
        status: LEAVE_STATUSES.REJECTED,
        rejectedBy: `${leaderUser.name} (Leader)`,
        rejectedReason: rejectReason || 'Tidak disetujui oleh Leader terkait kebutuhan operasional tim.',
        rejectedAt: new Date().toISOString(),
      });

      // Mark leader's pending notification as read
      await notificationService.markActionNotificationsAsRead({
        userId: leaderUser.id,
        tenantId: leave.tenantId,
        link: 'tab=leaves',
        keyword: applicant?.name,
      });

      // Notify employee
      notificationService.notifyUser(leave.userId, {
        tenantId: leave.tenantId,
        type: 'leave',
        title: 'Cuti Ditolak Leader',
        message: `Pengajuan cuti Anda ditolak oleh Leader: ${rejectReason || notes || '-'}`,
        link: '/employee/requests?tab=leaves',
      }).catch(console.error);

      return updated;
    } else {
      throw new AppError('leave.invalid_action', 400);
    }
  }

  /**
   * Tahap 2: HR Admin melakukan persetujuan final (Final Approval)
   */
  async hrApproval({ leaveId, hrUser, action, rejectReason }) {
    const leave = await leaveRepository.findById(leaveId);
    if (!leave || leave.tenantId !== hrUser.tenantId) {
      throw new AppError('leave.not_found', 404);
    }

    // Anti Self-Approval: HR dilarang keras menyetujui request cutinya sendiri
    if (leave.userId === hrUser.id && hrUser.role !== ROLES.SUPER_ADMIN) {
      throw new AppError('leave.cannot_approve_self', 403);
    }

    // PENTING: HR hanya boleh menyetujui jika cuti sudah berstatus 'pending_hr' (telah di-approve Leader!)
    if (leave.status === LEAVE_STATUSES.PENDING_LEADER) {
      throw new AppError('leave.leader_approval_required', 400);
    }

    if (leave.status !== LEAVE_STATUSES.PENDING_HR) {
      throw new AppError('leave.not_pending_hr', 400, { status: leave.status });
    }

    if (action === 'approve') {
      // 1. Update status leave menjadi approved
      const updated = await leaveRepository.update(leaveId, {
        status: LEAVE_STATUSES.APPROVED,
        approvedByHr: {
          hrId: hrUser.id,
          hrName: hrUser.name,
          approvedAt: new Date().toISOString(),
        },
      });

      // 2. Potong kuota cuti karyawan secara resmi jika tipe adalah tahunan atau memotong kuota tahunan
      const normalizedType = String(leave.type || '').trim().toLowerCase();
      let deductFromAnnual =
        normalizedType === 'annual' ||
        normalizedType === 'cuti_tahunan' ||
        normalizedType.includes('annual') ||
        normalizedType.includes('tahunan');

      try {
        const matchedType = await leaveTypeRepository.findByCode(hrUser.tenantId, leave.type);
        if (matchedType) {
          const matchedCode = String(matchedType.code || '').trim().toLowerCase();
          if (
            matchedCode === 'annual' ||
            matchedCode.includes('annual') ||
            matchedCode.includes('tahunan') ||
            Boolean(matchedType.deductAnnual)
          ) {
            deductFromAnnual = true;
          }
        }
      } catch (err) {
        console.warn('[leaveService] Error checking leave type deductAnnual:', err.message);
      }

      if (deductFromAnnual) {
        const applicant = await userRepository.findById(leave.userId);
        if (applicant) {
          const currentRemaining = Number(
            applicant.leaveBalance?.remainingAnnual ?? applicant.leave_remaining_annual ?? 12
          );
          const currentAnnualTotal = Number(
            applicant.leaveBalance?.annualTotal ?? applicant.leave_annual ?? 12
          );
          const daysToDeduct = Number(leave.totalDays || 1);
          const newRemaining = Math.max(0, currentRemaining - daysToDeduct);
          const newUsed = Math.max(0, currentAnnualTotal - newRemaining);

          await userRepository.update(applicant.id, {
            leave_remaining_annual: newRemaining,
            leaveBalance: {
              ...(applicant.leaveBalance || {}),
              annualTotal: currentAnnualTotal,
              remainingAnnual: newRemaining,
              annualUsed: newUsed,
            },
          });
        }
      }

      // Mark HR pending notification as read
      const applicant = await userRepository.findById(leave.userId);
      await notificationService.markActionNotificationsAsRead({
        tenantId: hrUser.tenantId,
        link: 'tab=leaves',
        keyword: applicant?.name,
      });

      // Notify employee
      notificationService.notifyUser(leave.userId, {
        tenantId: leave.tenantId,
        type: 'leave',
        title: 'Cuti Resmi Disahkan HR',
        message: 'Pengajuan cuti Anda telah resmi disahkan oleh HR Admin. Sisa kuota cuti telah diperbarui.',
        link: '/employee/requests?tab=leaves',
      }).catch(console.error);

      return updated;
    } else if (action === 'reject') {
      const updated = await leaveRepository.update(leaveId, {
        status: LEAVE_STATUSES.REJECTED,
        rejectedBy: `${hrUser.name} (HR Admin)`,
        rejectedReason: rejectReason || 'Tidak memenuhi kebijakan HR perusahaan.',
        rejectedAt: new Date().toISOString(),
      });

      // Mark HR pending notification as read
      const applicant = await userRepository.findById(leave.userId);
      await notificationService.markActionNotificationsAsRead({
        tenantId: hrUser.tenantId,
        link: 'tab=leaves',
        keyword: applicant?.name,
      });

      // Notify employee
      notificationService.notifyUser(leave.userId, {
        tenantId: leave.tenantId,
        type: 'leave',
        title: 'Cuti Ditolak HR',
        message: `Pengajuan cuti Anda ditolak oleh HR Admin: ${rejectReason || '-'}`,
        link: '/employee/requests?tab=leaves',
      }).catch(console.error);

      return updated;
    } else {
      throw new AppError('leave.invalid_action', 400);
    }
  }

  async getMyLeaves(userId) {
    const list = await leaveRepository.findByUser(userId);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getTeamLeavesForLeader(leaderId, tenantId) {
    // Cari semua user yang merupakan bawahan langsung dari leader ini
    const subordinates = await userRepository.findSubordinates(leaderId);
    const subIds = subordinates.map((s) => s.id).filter((id) => id !== leaderId);

    if (subIds.length === 0) return [];

    // Ambil permohonan cuti bawahan (baik yang pending maupun riwayat yang telah diproses)
    const list = await leaveRepository.findPendingForLeader(subIds, leaderId);
    return list
      .filter((l) => l.userId !== leaderId)
      .sort((a, b) => {
        const aPending = a.status === LEAVE_STATUSES.PENDING_LEADER ? 0 : 1;
        const bPending = b.status === LEAVE_STATUSES.PENDING_LEADER ? 0 : 1;
        if (aPending !== bPending) return aPending - bPending;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }

  async getPendingLeavesForHr(tenantId) {
    // Ambil permohonan cuti yang sudah di-approve Leader dan menunggu HR
    const list = await leaveRepository.findPendingForHr(tenantId);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getAllTenantLeaves(tenantId) {
    const list = await leaveRepository.findByTenant(tenantId);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

export const leaveService = new LeaveService();

