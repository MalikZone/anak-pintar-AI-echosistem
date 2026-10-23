import { leaveService } from '../services/leaveService.js';
import { sendSuccess } from '../utils/responseHandler.js';

export const submitLeave = async (req, res, next) => {
  try {
    const { type, typeLabel, startDate, endDate, totalDays, reason, attachmentUrl } = req.body;
    const leave = await leaveService.createLeaveRequest({
      userId: req.user.id,
      tenantId: req.tenantId,
      type,
      typeLabel,
      startDate,
      endDate,
      totalDays,
      reason,
      attachmentUrl,
    });
    return sendSuccess(res, leave, 'leave.created_success', 201);
  } catch (error) {
    next(error);
  }
};

export const getMyLeaves = async (req, res, next) => {
  try {
    const leaves = await leaveService.getMyLeaves(req.user.id);
    return sendSuccess(res, leaves, 'leave.my_loaded');
  } catch (error) {
    next(error);
  }
};

export const getTeamPendingLeaves = async (req, res, next) => {
  try {
    const leaves = await leaveService.getTeamLeavesForLeader(req.user.id, req.tenantId);
    return sendSuccess(res, leaves, 'leave.team_pending_loaded');
  } catch (error) {
    next(error);
  }
};

export const leaderAction = async (req, res, next) => {
  try {
    const { action, notes, rejectReason } = req.body;
    const updated = await leaveService.leaderApproval({
      leaveId: req.params.id,
      leaderUser: req.user,
      action,
      notes,
      rejectReason,
    });
    const messageKey = action === 'approve' ? 'leave.leader_approved' : 'leave.leader_rejected';
    return sendSuccess(res, updated, messageKey);
  } catch (error) {
    next(error);
  }
};

export const getHrPendingLeaves = async (req, res, next) => {
  try {
    const leaves = await leaveService.getPendingLeavesForHr(req.tenantId);
    return sendSuccess(res, leaves, 'leave.hr_pending_loaded');
  } catch (error) {
    next(error);
  }
};

export const hrAction = async (req, res, next) => {
  try {
    const { action, rejectReason } = req.body;
    const updated = await leaveService.hrApproval({
      leaveId: req.params.id,
      hrUser: req.user,
      action,
      rejectReason,
    });
    const messageKey = action === 'approve' ? 'leave.hr_approved' : 'leave.hr_rejected';
    return sendSuccess(res, updated, messageKey);
  } catch (error) {
    next(error);
  }
};

export const getAllLeaves = async (req, res, next) => {
  try {
    const leaves = await leaveService.getAllTenantLeaves(req.tenantId);
    return sendSuccess(res, leaves, 'leave.all_loaded');
  } catch (error) {
    next(error);
  }
};

