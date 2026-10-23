import { attendanceService } from '../services/attendanceService.js';
import { sendSuccess } from '../utils/responseHandler.js';

export const clockIn = async (req, res, next) => {
  try {
    const { shiftId, selfieUrl, notes, location, locationName, latitude, longitude } = req.body;
    const record = await attendanceService.clockIn({
      userId: req.user.id,
      tenantId: req.tenantId,
      shiftId,
      selfieUrl,
      notes,
      location: location || locationName,
      latitude,
      longitude,
    });
    return sendSuccess(res, record, 'attendance.clock_in_success', 201, null, { time: record.clockInTime });
  } catch (error) {
    next(error);
  }
};

export const clockOut = async (req, res, next) => {
  try {
    const rawNotes = req.body?.notes;
    const notes = typeof rawNotes === 'string' && rawNotes.trim() ? rawNotes.trim() : 'Selesai bertugas';
    const record = await attendanceService.clockOut({
      userId: req.user.id,
      tenantId: req.tenantId || req.user?.tenantId,
      notes,
    });

    const hours = Math.floor((record.workDurationSeconds || 0) / 3600);
    const mins = Math.floor(((record.workDurationSeconds || 0) % 3600) / 60);
    const durationStr = `${hours}j ${mins}m`;

    return sendSuccess(res, record, 'attendance.clock_out_success', 200, null, {
      time: record.clockOutTime,
      duration: durationStr,
    });
  } catch (error) {
    next(error);
  }
};

export const getTodayStatus = async (req, res, next) => {
  try {
    const status = await attendanceService.getTodayStatus(req.user.id, req.tenantId);
    return sendSuccess(res, status, 'attendance.today_status_loaded');
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const history = await attendanceService.getHistory(req.user.id, req.tenantId);
    return sendSuccess(res, history, 'attendance.history_loaded');
  } catch (error) {
    next(error);
  }
};

export const getTenantTodayAttendance = async (req, res, next) => {
  try {
    const { date } = req.query;
    const records = await attendanceService.getTenantAttendanceToday(req.tenantId, date);
    return sendSuccess(res, records, 'attendance.tenant_today_loaded');
  } catch (error) {
    next(error);
  }
};

export const getMonthlyReport = async (req, res, next) => {
  try {
    const { month, branchId, departmentId } = req.query;
    const report = await attendanceService.getMonthlyReport(req.tenantId, {
      month,
      branchId,
      departmentId,
    });
    return sendSuccess(res, report, 'attendance.report_loaded');
  } catch (error) {
    next(error);
  }
};

