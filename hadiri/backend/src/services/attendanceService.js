import { attendanceRepository } from '../repositories/AttendanceRepository.js';
import { shiftRepository } from '../repositories/ShiftRepository.js';
import { userRepository } from '../repositories/UserRepository.js';
import { rosterRepository } from '../repositories/RosterRepository.js';
import { leaveRepository } from '../repositories/LeaveRepository.js';
import { overtimeRepository } from '../repositories/OvertimeRepository.js';
import { locationRepository } from '../repositories/LocationRepository.js';
import { departmentRepository } from '../repositories/DepartmentRepository.js';
import { attendanceCorrectionService } from './attendanceCorrectionService.js';
import { AppError } from '../utils/appError.js';
import { ATTENDANCE_STATUSES } from '../config/constants.js';

function isTimeInWindow(timeStr, startStr, endStr) {
  if (!startStr || !endStr) return { inWindow: true };

  const [h, m] = timeStr.split(':').map(Number);
  const cur = h * 60 + m;

  const [sH, sM] = startStr.split(':').map(Number);
  const start = sH * 60 + sM;

  let [eH, eM] = endStr.split(':').map(Number);
  let end = eH * 60 + eM;
  if (endStr === '00:00' && start > 0) {
    end = 24 * 60; // Midnight at end of day
  }

  // Normal window (e.g. 06:00 to 10:00 or 16:00 to 18:00)
  if (start <= end) {
    if (cur < start) return { inWindow: false, reason: 'too_early' };
    if (cur > end) return { inWindow: false, reason: 'too_late' };
    return { inWindow: true };
  }

  // Cross-midnight window (e.g. 23:00 to 01:30)
  if (cur >= start || cur <= end) {
    return { inWindow: true };
  }

  if (cur < start) {
    return { inWindow: false, reason: 'too_early' };
  }
  return { inWindow: false, reason: 'too_late' };
}

class AttendanceService {
  async clockIn({ userId, tenantId, shiftId, selfieUrl, notes, location, latitude, longitude }) {
    const user = await userRepository.findById(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new AppError('attendance.invalid_user', 404);
    }

    // Check if user already has an active open session
    const openSession = await attendanceRepository.findOpenSession(userId);
    if (openSession) {
      throw new AppError('attendance.already_open', 400, { time: openSession.clockInTime });
    }

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    const dateStr = now.toISOString().split('T')[0];

    // Determine official shift for user:
    // 1. Check if there is an official schedule in rosters for today
    let assignedShiftId = user.shiftId;
    let isRosterOff = false;
    try {
      const todayRosters = await rosterRepository.findByUserAndDateRange(tenantId, userId, dateStr, dateStr);
      if (Array.isArray(todayRosters) && todayRosters.length > 0) {
        const todayRoster = todayRosters[0];
        if (todayRoster.isOffDay) {
          isRosterOff = true;
        } else if (todayRoster.shiftId) {
          assignedShiftId = todayRoster.shiftId;
        }
      }
    } catch {}

    if (isRosterOff) {
      throw new AppError('attendance.roster_off_day', 400);
    }

    if (!assignedShiftId) {
      throw new AppError('attendance.no_shift_assigned', 400);
    }

    const shift = await shiftRepository.findById(assignedShiftId);
    if (!shift || shift.tenantId !== tenantId) {
      throw new AppError('attendance.invalid_shift', 400);
    }

    // Validate Check-In Attendance Window (Open - Close Hours)
    const checkInStart = shift.checkInWindow?.start || shift.check_in_window_start || shift.startTime;
    const checkInEnd = shift.checkInWindow?.end || shift.check_in_window_end;
    if (checkInStart && checkInEnd) {
      const windowCheck = isTimeInWindow(timeStr, checkInStart, checkInEnd);
      if (!windowCheck.inWindow) {
        if (windowCheck.reason === 'too_early') {
          throw new AppError('attendance.clock_in_window_too_early', 400, {
            shift: shift.name,
            start: checkInStart,
            end: checkInEnd,
          });
        } else {
          throw new AppError('attendance.clock_in_window_closed', 400, {
            shift: shift.name,
            start: checkInStart,
            end: checkInEnd,
          });
        }
      }
    }

    // Evaluate lateness
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const isLate = currentMinutes > startMinutes + (shift.gracePeriodMinutes || 15);

    const status = isLate ? ATTENDANCE_STATUSES.LATE : ATTENDANCE_STATUSES.PRESENT;

    const branchLocation = location || user.locationName || user.branch?.name || 'Kantor Pusat';
    const lat = latitude != null ? Number(latitude) : (user.branch?.latitude != null ? Number(user.branch.latitude) : null);
    const lng = longitude != null ? Number(longitude) : (user.branch?.longitude != null ? Number(user.branch.longitude) : null);

    const newAttendance = await attendanceRepository.create({
      tenantId,
      userId,
      userName: user.name,
      shiftId: shift.id,
      shiftName: shift.name,
      isCrossDay: shift.isCrossDay || false,
      sessionDate: dateStr,
      clockInTime: timeStr,
      clockInDate: dateStr,
      clockOutTime: null,
      clockOutDate: null,
      status,
      selfieUrl: selfieUrl || null,
      notes: notes || `Clock-In ${shift.name}`,
      location: branchLocation,
      latitude: lat,
      longitude: lng,
    });

    return newAttendance;
  }

  async clockOut({ userId, tenantId, notes }) {
    // Look for active open session
    const openSession = await attendanceRepository.findOpenSession(userId);
    if (!openSession) {
      throw new AppError('attendance.no_open_session', 400);
    }

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    const dateStr = now.toISOString().split('T')[0];

    // Validate Check-Out Attendance Window (Open - Close Hours)
    if (openSession.shiftId) {
      const shift = await shiftRepository.findById(openSession.shiftId);
      if (shift) {
        const checkOutStart = shift.checkOutWindow?.start || shift.check_out_window_start || shift.endTime;
        const checkOutEnd = shift.checkOutWindow?.end || shift.check_out_window_end;
        if (checkOutStart && checkOutEnd) {
          const windowCheck = isTimeInWindow(timeStr, checkOutStart, checkOutEnd);
          if (!windowCheck.inWindow) {
            if (windowCheck.reason === 'too_early') {
              throw new AppError('attendance.clock_out_window_too_early', 400, {
                shift: shift.name,
                start: checkOutStart,
                end: checkOutEnd,
              });
            } else {
              throw new AppError('attendance.clock_out_window_closed', 400, {
                shift: shift.name,
                start: checkOutStart,
                end: checkOutEnd,
              });
            }
          }
        }
      }
    }

    // Calculate approximate work duration
    const inDateStr = (openSession.clockInDate || openSession.date || dateStr).split('T')[0];
    const inDate = new Date(`${inDateStr}T${openSession.clockInTime || '00:00'}:00`);
    const outDate = new Date(`${dateStr}T${timeStr}:00`);
    let diffSeconds = Math.max(0, Math.floor((outDate - inDate) / 1000));
    if (isNaN(diffSeconds)) diffSeconds = 0;

    const updated = await attendanceRepository.update(openSession.id, {
      clockOutTime: timeStr,
      clockOutDate: dateStr,
      status: ATTENDANCE_STATUSES.CLOCKED_OUT,
      workDurationSeconds: diffSeconds,
      notes: notes
        ? (openSession.notes ? `${openSession.notes} | Out: ${notes}` : `Out: ${notes}`)
        : openSession.notes,
    });

    return updated;
  }

  async getTodayStatus(userId, tenantId) {
    if (tenantId) {
      await attendanceCorrectionService.syncApprovedCorrections(tenantId);
    }
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Check for open session first (could be from yesterday night for cross-midnight shift)
    const openSession = await attendanceRepository.findOpenSession(userId);
    if (openSession) {
      return {
        isClockedIn: true,
        isCompleted: false,
        id: openSession.id,
        clockInTime: openSession.clockInTime,
        clockOutTime: openSession.clockOutTime || null,
        status: openSession.status,
        location: openSession.location,
        selfieUrl: openSession.selfieUrl,
        shiftId: openSession.shiftId,
        isCrossDay: openSession.isCrossDay,
        date: openSession.date,
        sessionDate: openSession.date,
        workDurationSeconds: openSession.workDurationSeconds,
        attendance: openSession,
      };
    }

    // Check if finished today
    const todayRecord = await attendanceRepository.findTodayAttendance(userId, todayStr);
    if (todayRecord) {
      return {
        isClockedIn: false,
        isCompleted: true,
        id: todayRecord.id,
        clockInTime: todayRecord.clockInTime,
        clockOutTime: todayRecord.clockOutTime,
        status: todayRecord.status || ATTENDANCE_STATUSES.CLOCKED_OUT,
        location: todayRecord.location,
        selfieUrl: todayRecord.selfieUrl,
        shiftId: todayRecord.shiftId,
        isCrossDay: todayRecord.isCrossDay,
        date: todayRecord.date,
        sessionDate: todayRecord.date,
        workDurationSeconds: todayRecord.workDurationSeconds,
        attendance: todayRecord,
      };
    }

    return {
      isClockedIn: false,
      isCompleted: false,
      clockInTime: null,
      clockOutTime: null,
      status: 'not_yet',
      attendance: null,
    };
  }

  async getHistory(userId, tenantId) {
    if (tenantId) {
      await attendanceCorrectionService.syncApprovedCorrections(tenantId);
    }
    const records = await attendanceRepository.findByUser(userId);
    const shifts = await shiftRepository.findByTenant(tenantId || records[0]?.tenantId);
    const shiftMap = new Map((shifts || []).map((s) => [s.id, s]));

    return records
      .map((r) => {
        let punctualityStatus = r.status;
        if (r.status !== 'sick' && r.status !== 'leave' && r.clockInTime) {
          const shift = shiftMap.get(r.shiftId);
          if (shift && shift.startTime) {
            const [startH, startM] = shift.startTime.split(':').map(Number);
            const [inH, inM] = r.clockInTime.split(':').map(Number);
            const grace = shift.gracePeriodMinutes || 15;
            punctualityStatus = (inH * 60 + inM > startH * 60 + startM + grace) ? 'late' : 'present';
          } else {
            const [inH, inM] = r.clockInTime.split(':').map(Number);
            punctualityStatus = (inH * 60 + inM > 8 * 60 + 45) ? 'late' : 'present';
          }
        }
        return {
          ...r,
          status: punctualityStatus,
          rawStatus: r.status,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getTenantAttendanceToday(tenantId, targetDate = null) {
    if (tenantId) {
      await attendanceCorrectionService.syncApprovedCorrections(tenantId);
    }
    const todayWib = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const effectiveDate = (targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) ? targetDate : todayWib;
    const isToday = effectiveDate === todayWib;

    const all = await attendanceRepository.findByTenantAndDate(tenantId, effectiveDate, isToday);
    const shifts = await shiftRepository.findByTenant(tenantId);
    const shiftMap = new Map((shifts || []).map((s) => [s.id, s]));

    return all
      .map((r) => {
        let punctualityStatus = r.status;
        if (r.status !== 'sick' && r.status !== 'leave' && r.clockInTime) {
          const shift = shiftMap.get(r.shiftId);
          if (shift && shift.startTime) {
            const [startH, startM] = shift.startTime.split(':').map(Number);
            const [inH, inM] = r.clockInTime.split(':').map(Number);
            const grace = shift.gracePeriodMinutes || 15;
            punctualityStatus = (inH * 60 + inM > startH * 60 + startM + grace) ? 'late' : 'present';
          } else {
            const [inH, inM] = r.clockInTime.split(':').map(Number);
            punctualityStatus = (inH * 60 + inM > 8 * 60 + 45) ? 'late' : 'present';
          }
        }
        return {
          ...r,
          status: punctualityStatus,
          rawStatus: r.status,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getMonthlyReport(tenantId, { month, branchId, departmentId } = {}) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const [yearStr, monthStr] = targetMonth.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);

    const startDate = `${targetMonth}-01`;
    const lastDayOfMonth = new Date(year, m, 0).getDate();
    const endDate = `${targetMonth}-${String(lastDayOfMonth).padStart(2, '0')}`;

    let workDaysCount = 0;
    for (let day = 1; day <= lastDayOfMonth; day++) {
      const d = new Date(year, m - 1, day);
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workDaysCount++;
      }
    }
    if (workDaysCount === 0) workDaysCount = 22;

    let employees = await userRepository.findByTenant(tenantId, false);
    if (branchId) {
      let isHqBranch = false;
      try {
        const branchLoc = await locationRepository.findById(tenantId, branchId);
        if (branchLoc?.isHeadquarters) {
          isHqBranch = true;
        }
      } catch {}

      employees = employees.filter((e) => {
        const userLocId = e.locationId || e.branch?.id;
        if (userLocId === branchId) return true;
        if (e.branch?.name && e.branch.name === branchId) return true;
        if (!userLocId && isHqBranch) return true;
        return false;
      });
    }

    if (departmentId) {
      let deptName = null;
      let deptCode = null;
      try {
        const dept = await departmentRepository.findById(tenantId, departmentId);
        if (dept) {
          deptName = dept.name?.toLowerCase().trim();
          deptCode = dept.code?.toLowerCase().trim();
        }
      } catch {}

      employees = employees.filter((e) => {
        if (e.departmentId === departmentId) return true;
        if (e.department === departmentId) return true;
        const empDept = (e.department || '').toLowerCase().trim();
        if (deptName && (empDept === deptName || empDept.includes(deptName) || deptName.includes(empDept))) return true;
        if (deptCode && empDept === deptCode) return true;
        return false;
      });
    }

    const attendances = await attendanceRepository.findByTenantAndDateRange(tenantId, startDate, endDate);
    const leaves = await leaveRepository.findByTenant(tenantId);
    const overtimes = await overtimeRepository.findByTenant(tenantId);

    const monthLeaves = leaves.filter((l) => {
      if (l.status !== 'approved') return false;
      const start = l.startDate || l.start_date;
      const end = l.endDate || l.end_date || start;
      return start <= endDate && end >= startDate;
    });

    const monthOvertimes = overtimes.filter((o) => {
      if (o.status !== 'approved') return false;
      const date = o.date;
      return date >= startDate && date <= endDate;
    });

    const allShifts = await shiftRepository.findByTenant(tenantId);
    const shiftMap = new Map((allShifts || []).map((s) => [s.id, s]));

    const records = employees.map((emp) => {
      const empAttendances = attendances.filter((a) => a.userId === emp.id);

      let presentDays = 0;
      let lateDays = 0;
      let lateMinutes = 0;
      let totalWorkHours = 0;

      empAttendances.forEach((a) => {
        // Calculate work duration in hours
        if (a.workDurationSeconds && a.workDurationSeconds > 0) {
          totalWorkHours += a.workDurationSeconds / 3600;
        } else if (a.clockInTime && a.clockOutTime) {
          const [inH, inM] = a.clockInTime.split(':').map(Number);
          const [outH, outM] = a.clockOutTime.split(':').map(Number);
          let dur = (outH * 60 + outM - (inH * 60 + inM)) / 60;
          if (dur < 0) dur += 24;
          totalWorkHours += dur;
        } else {
          totalWorkHours += 8;
        }

        // Determine if late or on-time
        const shift = shiftMap.get(a.shiftId) || shiftMap.get(emp.shiftId);
        let isLate = false;
        let diffLateMins = 0;

        if (a.status === ATTENDANCE_STATUSES.LATE) {
          isLate = true;
          diffLateMins = 20;
        } else if (a.status === ATTENDANCE_STATUSES.PRESENT) {
          isLate = false;
        } else {
          // CLOCKED_OUT or other attendance record: evaluate based on shift start time
          if (shift && shift.startTime && a.clockInTime) {
            const [startH, startM] = shift.startTime.split(':').map(Number);
            const [inH, inM] = a.clockInTime.split(':').map(Number);
            const startMins = startH * 60 + startM;
            const inMins = inH * 60 + inM;
            const grace = shift.gracePeriodMinutes || 15;
            if (inMins > startMins + grace) {
              isLate = true;
              diffLateMins = Math.max(0, inMins - startMins);
            }
          } else if (a.clockInTime) {
            const [inH, inM] = a.clockInTime.split(':').map(Number);
            const inMins = inH * 60 + inM;
            if (inMins > 8 * 60 + 45) {
              isLate = true;
              diffLateMins = Math.max(0, inMins - (8 * 60 + 30));
            }
          }
        }

        if (isLate) {
          lateDays++;
          lateMinutes += diffLateMins > 0 ? diffLateMins : 20;
        } else {
          presentDays++;
        }
      });

      const totalAttended = presentDays + lateDays;

      const empLeaves = monthLeaves.filter((l) => l.userId === emp.id);
      let sickDays = 0;
      let leaveDays = 0;
      empLeaves.forEach((l) => {
        const days = Number(l.totalDays || 1);
        if (l.type === 'sick') sickDays += days;
        else leaveDays += days;
      });

      const empOvertimes = monthOvertimes.filter((o) => o.userId === emp.id);
      let overtimeHours = 0;
      let overtimeEarnings = 0;
      empOvertimes.forEach((o) => {
        overtimeHours += Number(o.durationHours || o.duration_hours || 0);
        overtimeEarnings += Number(o.compensation || o.earnings || Number(o.durationHours || 0) * 50000);
      });

      const unexcusedDays = Math.max(0, workDaysCount - (totalAttended + sickDays + leaveDays));
      const attendanceRate =
        workDaysCount > 0 ? Math.min(100, Math.round((totalAttended / workDaysCount) * 100)) : 100;

      return {
        userId: emp.id,
        name: emp.name,
        email: emp.email,
        avatar: emp.avatar,
        role: emp.role,
        department: emp.department || 'Operasional',
        departmentId: emp.departmentId || null,
        position: emp.position || 'Staf',
        positionId: emp.positionId || null,
        branch: emp.branch?.name || emp.locationName || 'Kantor Pusat',
        branchId: emp.locationId || emp.branch?.id || null,
        branchBusinessType: emp.branch?.businessType || 'Korporat',
        presentDays,
        lateDays,
        totalAttended,
        lateMinutes,
        sickDays,
        leaveDays,
        unexcusedDays,
        totalWorkHours: Number(totalWorkHours.toFixed(1)),
        overtimeHours: Number(overtimeHours.toFixed(1)),
        overtimeEarnings: Math.round(overtimeEarnings),
        attendanceRate,
      };
    });

    const totalEmployees = records.length;
    const totalPresent = records.reduce((acc, r) => acc + r.presentDays, 0);
    const totalLate = records.reduce((acc, r) => acc + r.lateDays, 0);
    const totalLateMinutes = records.reduce((acc, r) => acc + r.lateMinutes, 0);
    const totalOvertimeHours = Number(records.reduce((acc, r) => acc + r.overtimeHours, 0).toFixed(1));
    const totalOvertimeEarnings = records.reduce((acc, r) => acc + r.overtimeEarnings, 0);
    const totalLeaves = records.reduce((acc, r) => acc + (r.sickDays + r.leaveDays), 0);
    const averageAttendanceRate =
      totalEmployees > 0
        ? Math.round(records.reduce((acc, r) => acc + r.attendanceRate, 0) / totalEmployees)
        : 100;

    return {
      period: {
        month: targetMonth,
        startDate,
        endDate,
        workDaysCount,
      },
      summary: {
        totalEmployees,
        totalPresent,
        totalLate,
        totalLateMinutes,
        totalOvertimeHours,
        totalOvertimeEarnings,
        totalLeaves,
        averageAttendanceRate,
      },
      records,
    };
  }
}

export const attendanceService = new AttendanceService();

