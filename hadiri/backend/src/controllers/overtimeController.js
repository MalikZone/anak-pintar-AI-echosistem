import { overtimeService } from '../services/overtimeService.js';
import { sendSuccess } from '../utils/responseHandler.js';

export const submitOvertime = async (req, res, next) => {
  try {
    const { type, date, startTime, endTime, durationHours, reason } = req.body;
    const ot = await overtimeService.createOvertimeRequest({
      userId: req.user.id,
      tenantId: req.tenantId,
      type,
      date,
      startTime,
      endTime,
      durationHours,
      reason,
    });
    return sendSuccess(res, ot, 'overtime.created_success', 201);
  } catch (error) {
    next(error);
  }
};

export const getMyOvertimes = async (req, res, next) => {
  try {
    const list = await overtimeService.getMyOvertimes(req.user.id);
    return sendSuccess(res, list, 'overtime.my_loaded');
  } catch (error) {
    next(error);
  }
};

export const getTenantOvertimes = async (req, res, next) => {
  try {
    const list = await overtimeService.getTenantOvertimes(req.tenantId, req.user);
    return sendSuccess(res, list, 'overtime.tenant_loaded');
  } catch (error) {
    next(error);
  }
};

export const getTeamPendingOvertimes = async (req, res, next) => {
  try {
    const list = await overtimeService.getTeamOvertimesForLeader(req.user.id, req.tenantId);
    return sendSuccess(res, list, 'overtime.team_pending_loaded');
  } catch (error) {
    next(error);
  }
};

export const getHrPendingOvertimes = async (req, res, next) => {
  try {
    const list = await overtimeService.getHrPendingOvertimes(req.tenantId);
    return sendSuccess(res, list, 'overtime.hr_pending_loaded');
  } catch (error) {
    next(error);
  }
};

export const leaderApproval = async (req, res, next) => {
  try {
    const { action, notes, rejectReason } = req.body;
    const updated = await overtimeService.leaderApproval({
      overtimeId: req.params.id,
      leaderUser: req.user,
      action,
      notes,
      rejectReason,
    });
    const messageKey = action === 'approve' ? 'overtime.leader_approved' : 'overtime.leader_rejected';
    return sendSuccess(res, updated, messageKey);
  } catch (error) {
    next(error);
  }
};

export const hrApproval = async (req, res, next) => {
  try {
    const { action, rejectReason } = req.body;
    const updated = await overtimeService.hrApproval({
      overtimeId: req.params.id,
      hrUser: req.user,
      action,
      rejectReason,
    });
    const messageKey = action === 'approve' ? 'overtime.hr_approved' : 'overtime.hr_rejected';
    return sendSuccess(res, updated, messageKey);
  } catch (error) {
    next(error);
  }
};

