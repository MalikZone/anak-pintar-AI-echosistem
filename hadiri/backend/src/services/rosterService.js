import { rosterRepository } from '../repositories/RosterRepository.js';
import { shiftRepository } from '../repositories/ShiftRepository.js';
import { userRepository } from '../repositories/UserRepository.js';
import { tenantRepository } from '../repositories/TenantRepository.js';
import { shiftSwitchRepository } from '../repositories/ShiftSwitchRepository.js';
import { notificationService } from './notificationService.js';
import { AppError } from '../utils/appError.js';
import { generateRosterId, generateSwitchId } from '../utils/idGenerator.js';

const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function getDatesInRange(startStr, endStr) {
  const dates = [];
  const current = new Date(startStr);
  const end = new Date(endStr);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

class RosterService {
  async getMyRoster(tenantId, userId, query = {}) {
    const user = await userRepository.findById(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new AppError('user.not_found', 404);
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const startDate = query.startDate || new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const endDate = query.endDate || new Date(Date.now() + 13 * 86400000).toISOString().slice(0, 10);

    const shifts = await shiftRepository.findByTenant(tenantId);
    const shiftMap = new Map(shifts.map((s) => [s.id, s]));

    const defaultShift = shiftMap.get(user.shiftId) || shifts[0] || null;
    const dbRosters = await rosterRepository.findByUserAndDateRange(tenantId, userId, startDate, endDate);
    const dbMap = new Map(dbRosters.map((r) => [r.date, r]));

    const dates = getDatesInRange(startDate, endDate);
    const tenant = await tenantRepository.findById(tenantId);
    const isCorporate = tenant?.workModel?.toLowerCase().includes('non-shift') || false;

    return dates.map((dateStr) => {
      const dayDate = new Date(dateStr);
      const dayOfWeek = dayDate.getDay();
      const dayName = DAY_NAMES_ID[dayOfWeek];
      const isToday = dateStr === todayStr;

      if (dbMap.has(dateStr)) {
        const item = dbMap.get(dateStr);
        const assignedShift = item.shiftId ? shiftMap.get(item.shiftId) : null;
        return {
          id: item.id,
          date: dateStr,
          dayName,
          shiftId: item.shiftId,
          shiftCode: assignedShift?.code || (item.isOffDay ? 'OFF' : 'SHIFT'),
          shiftName: item.isOffDay ? 'Hari Libur / OFF' : (assignedShift?.name || 'Shift Kerja'),
          startTime: assignedShift?.startTime || '-',
          endTime: assignedShift?.endTime || '-',
          isCrossDay: assignedShift?.isCrossDay || false,
          isOffDay: item.isOffDay,
          isToday,
          notes: item.notes,
        };
      }

      // Default fallback if no custom roster set
      const isWeekendOff = isCorporate && (dayOfWeek === 0 || dayOfWeek === 6);
      return {
        id: null,
        date: dateStr,
        dayName,
        shiftId: isWeekendOff ? null : defaultShift?.id || null,
        shiftCode: isWeekendOff ? 'OFF' : defaultShift?.code || 'REG',
        shiftName: isWeekendOff ? 'Hari Libur Akhir Pekan' : defaultShift?.name || 'Shift Reguler',
        startTime: isWeekendOff ? '-' : defaultShift?.startTime || '08:30',
        endTime: isWeekendOff ? '-' : defaultShift?.endTime || '17:30',
        isCrossDay: isWeekendOff ? false : defaultShift?.isCrossDay || false,
        isOffDay: isWeekendOff,
        isToday,
        notes: null,
      };
    });
  }

  async getTeamRosterMatrix(tenantId, query = {}) {
    const today = new Date();
    const startDate = query.startDate || today.toISOString().slice(0, 10);
    const endDate = query.endDate || new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);
    const department = query.department || 'all';

    // 1. Get all active users
    let users = await userRepository.findByTenant(tenantId, false);
    if (department !== 'all') {
      users = users.filter((u) => u.department === department);
    }
    if (query.userId) {
      users = users.filter((u) => u.id === query.userId);
    }

    // 2. Get Shifts
    const shifts = await shiftRepository.findByTenant(tenantId);
    const shiftMap = new Map(shifts.map((s) => [s.id, s]));

    // 3. Get DB Rosters
    const dbRosters = await rosterRepository.findTeamRosters(tenantId, {
      startDate,
      endDate,
      department,
      userId: query.userId,
    });

    const userDateMap = new Map();
    for (const r of dbRosters) {
      userDateMap.set(`${r.userId}_${r.date}`, r);
    }

    const dates = getDatesInRange(startDate, endDate);
    const tenant = await tenantRepository.findById(tenantId);
    const isCorporate = tenant?.workModel?.toLowerCase().includes('non-shift') || false;

    const matrix = users.map((u) => {
      const defaultShift = shiftMap.get(u.shiftId) || shifts[0] || null;

      const schedule = dates.map((dateStr) => {
        const key = `${u.id}_${dateStr}`;
        const dayDate = new Date(dateStr);
        const dayOfWeek = dayDate.getDay();
        const dayName = DAY_NAMES_ID[dayOfWeek];

        if (userDateMap.has(key)) {
          const item = userDateMap.get(key);
          const assignedShift = item.shiftId ? shiftMap.get(item.shiftId) : null;
          return {
            rosterId: item.id,
            date: dateStr,
            dayName,
            shiftId: item.shiftId,
            shiftCode: assignedShift?.code || (item.isOffDay ? 'OFF' : 'SHIFT'),
            shiftName: item.isOffDay ? 'Hari Libur / OFF' : (assignedShift?.name || 'Shift Kerja'),
            startTime: assignedShift?.startTime || '-',
            endTime: assignedShift?.endTime || '-',
            isCrossDay: assignedShift?.isCrossDay || false,
            isOffDay: item.isOffDay,
            notes: item.notes,
            shift: assignedShift ? {
              id: assignedShift.id,
              name: assignedShift.name,
              code: assignedShift.code,
              startTime: assignedShift.startTime,
              endTime: assignedShift.endTime,
              isCrossDay: Boolean(assignedShift.isCrossDay),
            } : null,
          };
        }

        const isWeekendOff = isCorporate && (dayOfWeek === 0 || dayOfWeek === 6);
        return {
          rosterId: null,
          date: dateStr,
          dayName,
          shiftId: isWeekendOff ? null : defaultShift?.id || null,
          shiftCode: isWeekendOff ? 'OFF' : defaultShift?.code || 'REG',
          shiftName: isWeekendOff ? 'Hari Libur Akhir Pekan' : defaultShift?.name || 'Shift Reguler',
          startTime: isWeekendOff ? '-' : defaultShift?.startTime || '-',
          endTime: isWeekendOff ? '-' : defaultShift?.endTime || '-',
          isCrossDay: isWeekendOff ? false : defaultShift?.isCrossDay || false,
          isOffDay: isWeekendOff,
          notes: null,
          shift: (!isWeekendOff && defaultShift) ? {
            id: defaultShift.id,
            name: defaultShift.name,
            code: defaultShift.code,
            startTime: defaultShift.startTime,
            endTime: defaultShift.endTime,
            isCrossDay: Boolean(defaultShift.isCrossDay),
          } : null,
        };
      });

      return {
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          department: u.department,
          position: u.position,
          avatar: u.avatar,
        },
        userId: u.id,
        userName: u.name,
        email: u.email,
        department: u.department,
        position: u.position,
        avatar: u.avatar,
        defaultShiftId: u.shiftId,
        defaultShiftName: defaultShift?.name || 'Standard',
        schedule,
      };
    });

    return {
      period: { startDate, endDate, dates },
      availableShifts: shifts,
      teamMembersCount: users.length,
      matrix,
    };
  }

  async assignRoster(tenantId, data) {
    const { userId, date, shiftId, isOffDay = false, notes = null } = data;

    if (!userId || !date) {
      throw new AppError('roster.required_fields', 400);
    }

    const user = await userRepository.findById(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new AppError('user.not_found', 404);
    }

    if (shiftId && !isOffDay) {
      const shift = await shiftRepository.findById(shiftId);
      if (!shift || shift.tenantId !== tenantId) {
        throw new AppError('shift.not_found', 404);
      }
    }

    const tenant = await tenantRepository.findById(tenantId);
    const tenantCode = tenant?.code || 'RST';
    const newId = generateRosterId(tenantCode);

    const saved = await rosterRepository.upsert({
      id: newId,
      tenantId,
      userId,
      shiftId: isOffDay ? null : shiftId,
      date,
      isOffDay: Boolean(isOffDay),
      notes: notes || null,
    });

    return saved;
  }

  async bulkGenerateRoster(tenantId, data) {
    const {
      department = 'all',
      userIds = [],
      startDate,
      endDate,
      pattern = '5-2',
      defaultShiftId = null,
    } = data;

    if (!startDate || !endDate) {
      throw new AppError('roster.required_dates', 400);
    }

    let targetUsers = [];
    if (userIds && userIds.length > 0) {
      const allUsers = await userRepository.findByTenant(tenantId, false);
      targetUsers = allUsers.filter((u) => userIds.includes(u.id));
    } else {
      targetUsers = await userRepository.findByTenant(tenantId, false);
      if (department !== 'all') {
        targetUsers = targetUsers.filter((u) => u.department === department);
      }
    }

    if (targetUsers.length === 0) {
      throw new AppError('roster.no_users_targeted', 400);
    }

    const shifts = await shiftRepository.findByTenant(tenantId);
    const tenant = await tenantRepository.findById(tenantId);
    const tenantCode = tenant?.code || 'RST';
    const dates = getDatesInRange(startDate, endDate);

    const batchEntries = [];
    for (const u of targetUsers) {
      const assignedShiftId = defaultShiftId || u.shiftId || shifts[0]?.id || null;

      dates.forEach((dateStr, idx) => {
        const dayDate = new Date(dateStr);
        const dayOfWeek = dayDate.getDay();
        let isOff = false;

        if (pattern === '5-2') {
          // Weekend off
          isOff = dayOfWeek === 0 || dayOfWeek === 6;
        } else if (pattern === '4-2') {
          // 4 days on, 2 days off based on index
          isOff = (idx % 6) >= 4;
        } else if (pattern === '6-1') {
          // 6 days on, Sunday off
          isOff = dayOfWeek === 0;
        }

        batchEntries.push({
          id: generateRosterId(tenantCode),
          tenantId,
          userId: u.id,
          shiftId: isOff ? null : assignedShiftId,
          date: dateStr,
          isOffDay: isOff,
          notes: `Auto-generated pattern: ${pattern}`,
        });
      });
    }

    const inserted = await rosterRepository.bulkUpsert(tenantId, batchEntries);
    return {
      message: 'roster.bulk_generated_success',
      totalAssigned: inserted.length,
      employeesCount: targetUsers.length,
      daysCount: dates.length,
    };
  }

  async requestShiftSwitch(tenantId, userId, data) {
    const { targetDate, requestedShiftId, reason } = data;

    if (!targetDate || !requestedShiftId || !reason) {
      throw new AppError('roster.switch_required_fields', 400);
    }

    const user = await userRepository.findById(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new AppError('user.not_found', 404);
    }

    const reqShift = await shiftRepository.findById(requestedShiftId);
    if (!reqShift || reqShift.tenantId !== tenantId) {
      throw new AppError('shift.not_found', 404);
    }

    // Determine current shift for that date
    const myRoster = await this.getMyRoster(tenantId, userId, { startDate: targetDate, endDate: targetDate });
    const currentShiftId = myRoster[0]?.shiftId || user.shiftId || null;

    const tenant = await tenantRepository.findById(tenantId);
    const tenantCode = tenant?.code || 'SWT';
    const switchId = generateSwitchId(tenantCode);

    // Initial status: if user has a leader, must be approved by leader first!
    let initialStatus = 'pending_leader';
    if (!user.leaderId) {
      initialStatus = 'pending_hr';
    }

    const switchRequest = await shiftSwitchRepository.create({
      id: switchId,
      tenantId,
      userId,
      targetDate,
      originalShiftId: currentShiftId,
      requestedShiftId,
      reason: reason.trim(),
      status: initialStatus,
    });

    if (user.leaderId) {
      notificationService.notifyLeader(user.leaderId, {
        tenantId,
        type: 'shift_switch',
        title: 'Pengajuan Tukar Shift',
        message: `${user.name} mengajukan tukar shift untuk tanggal ${targetDate}.`,
        link: '/leader/approvals?tab=switches',
      }).catch(console.error);
    }

    notificationService.notifyAdmins(tenantId, {
      type: 'shift_switch',
      title: 'Pengajuan Tukar Shift Baru',
      message: `${user.name} mengajukan tukar shift untuk tanggal ${targetDate}.`,
      link: '/admin/approvals?tab=switches',
      excludeUserId: userId,
    }).catch(console.error);

    return switchRequest;
  }

  async getMyShiftSwitches(tenantId, userId, query = {}) {
    return shiftSwitchRepository.findByUser(userId, query.includeResolved !== 'false');
  }

  async getShiftSwitches(tenantId, query = {}, user = null) {
    if (user && user.role === 'employee') {
      return shiftSwitchRepository.findByUser(user.id, query.includeResolved !== 'false');
    }
    if (query.userId) {
      return shiftSwitchRepository.findByUser(query.userId, query.includeResolved !== 'false');
    }
    if (query.my === 'true' && user?.id) {
      return shiftSwitchRepository.findByUser(user.id, query.includeResolved !== 'false');
    }
    // If the requesting user is a Leader, return ONLY their subordinates' requests!
    if (user && user.role === 'leader') {
      const subordinates = await userRepository.findSubordinates(user.id);
      const subIds = subordinates.map((s) => s.id).filter((id) => id !== user.id);
      if (subIds.length === 0) return [];
      return shiftSwitchRepository.findPendingForLeader(subIds, user.id);
    }
    // If the requesting user is HR Admin or Super Admin and requesting pending for HR
    if (user && (user.role === 'hr_admin' || user.role === 'super_admin') && (query.pending === 'true' || query.status === 'pending_hr')) {
      return shiftSwitchRepository.findPendingForHr(tenantId);
    }
    if (query.status) {
      return shiftSwitchRepository.findByTenant(tenantId, true, query.status);
    }
    return shiftSwitchRepository.findByTenant(tenantId, query.includeResolved !== 'false');
  }

  async reviewShiftSwitch(tenantId, switchId, reviewerId, action, rejectionReason = null) {
    const sw = await shiftSwitchRepository.findById(switchId);
    if (!sw || sw.tenantId !== tenantId) {
      throw new AppError('roster.switch_not_found', 404);
    }

    // Anti Self-Approval: Pemohon dilarang keras mereview request miliknya sendiri!
    if (sw.userId === reviewerId) {
      throw new AppError('roster.cannot_approve_self', 403);
    }

    if (sw.status === 'approved' || sw.status === 'rejected') {
      throw new AppError('roster.switch_already_resolved', 400);
    }

    const reviewer = await userRepository.findById(reviewerId);
    const applicant = await userRepository.findById(sw.userId);

    // TAHAP 1: Menunggu Persetujuan Leader
    if (sw.status === 'pending_leader') {
      // HR belum bisa mereview jika status masih pending_leader
      if (reviewer?.role === 'hr_admin' && reviewer?.id !== applicant?.leaderId) {
        throw new AppError('roster.leader_approval_required', 400);
      }

      const isDirectLeader = applicant?.leaderId === reviewerId;
      if (!isDirectLeader && reviewer?.role !== 'super_admin') {
        throw new AppError('roster.not_subordinate', 403);
      }

      if (action === 'approved') {
        // Oper ke HR untuk persetujuan final (status menjadi pending_hr)
        const reviewed = await shiftSwitchRepository.review(switchId, {
          status: 'pending_hr',
          approvedById: reviewerId,
        });

        // Mark leader's notification as read
        await notificationService.markActionNotificationsAsRead({
          userId: reviewerId,
          tenantId,
          link: 'tab=switches',
          keyword: applicant?.name,
        });

        // Notify employee
        notificationService.notifyUser(sw.userId, {
          tenantId,
          type: 'shift_switch',
          title: 'Tukar Shift Disetujui Leader',
          message: `Permohonan tukar shift tanggal ${sw.targetDate} disetujui Leader dan diteruskan ke HR.`,
          link: '/employee/requests?tab=switches',
        }).catch(console.error);

        // Notify HR Admin
        notificationService.notifyAdmins(tenantId, {
          type: 'shift_switch',
          title: 'Tukar Shift Menunggu HR',
          message: `Permohonan tukar shift ${applicant?.name || 'karyawan'} disetujui Leader dan siap disahkan HR.`,
          link: '/admin/approvals?tab=switches',
        }).catch(console.error);

        return reviewed;
      } else {
        // Ditolak leader, tidak bisa diproses lagi
        const reviewed = await shiftSwitchRepository.review(switchId, {
          status: 'rejected',
          approvedById: reviewerId,
          rejectionReason: rejectionReason || 'Permohonan ganti shift ditolak atasan.',
        });

        // Mark leader's notification as read
        await notificationService.markActionNotificationsAsRead({
          userId: reviewerId,
          tenantId,
          link: 'tab=switches',
          keyword: applicant?.name,
        });

        // Notify employee
        notificationService.notifyUser(sw.userId, {
          tenantId,
          type: 'shift_switch',
          title: 'Tukar Shift Ditolak Leader',
          message: `Permohonan tukar shift tanggal ${sw.targetDate} ditolak oleh Leader: ${rejectionReason || '-'}`,
          link: '/employee/requests?tab=switches',
        }).catch(console.error);

        return reviewed;
      }
    }

    // TAHAP 2: Menunggu Persetujuan Final HR (status === 'pending_hr')
    if (sw.status === 'pending_hr') {
      if (reviewer?.role !== 'hr_admin' && reviewer?.role !== 'super_admin') {
        throw new AppError('auth.unauthorized', 403);
      }

      if (action === 'approved') {
        // Setujui secara final & terapkan jadwal ke tabel roster
        await this.assignRoster(tenantId, {
          userId: sw.userId,
          date: sw.targetDate,
          shiftId: sw.requestedShiftId,
          isOffDay: false,
          notes: `Approved shift switch (Request #${switchId})`,
        });

        const reviewed = await shiftSwitchRepository.review(switchId, {
          status: 'approved',
          approvedById: reviewerId,
        });

        // Mark HR notification as read
        await notificationService.markActionNotificationsAsRead({
          tenantId,
          link: 'tab=switches',
          keyword: applicant?.name,
        });

        // Notify employee
        notificationService.notifyUser(sw.userId, {
          tenantId,
          type: 'shift_switch',
          title: 'Tukar Shift Resmi Disahkan HR',
          message: `Permohonan tukar shift tanggal ${sw.targetDate} telah disahkan HR dan jadwal baru telah diterapkan.`,
          link: '/employee/schedule',
        }).catch(console.error);

        return reviewed;
      } else {
        // Ditolak HR, tidak bisa diproses lagi
        const reviewed = await shiftSwitchRepository.review(switchId, {
          status: 'rejected',
          approvedById: reviewerId,
          rejectionReason: rejectionReason || 'Permohonan ganti shift ditolak oleh HR.',
        });

        // Mark HR notification as read
        await notificationService.markActionNotificationsAsRead({
          tenantId,
          link: 'tab=switches',
          keyword: applicant?.name,
        });

        // Notify employee
        notificationService.notifyUser(sw.userId, {
          tenantId,
          type: 'shift_switch',
          title: 'Tukar Shift Ditolak HR',
          message: `Permohonan tukar shift tanggal ${sw.targetDate} ditolak oleh HR: ${rejectionReason || '-'}`,
          link: '/employee/requests?tab=switches',
        }).catch(console.error);

        return reviewed;
      }
    }

    throw new AppError('roster.invalid_action', 400);
  }
}

export const rosterService = new RosterService();
