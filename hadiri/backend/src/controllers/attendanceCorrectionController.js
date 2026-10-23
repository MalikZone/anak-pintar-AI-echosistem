import { attendanceCorrectionService } from '../services/attendanceCorrectionService.js';
import { sendSuccess } from '../utils/responseHandler.js';

export const submitCorrection = async (req, res, next) => {
  try {
    const {
      date,
      correctionType,
      proposedClockIn,
      proposedClockOut,
      reason,
      attachmentUrl,
    } = req.body;

    const correction = await attendanceCorrectionService.createCorrectionRequest({
      userId: req.user.id,
      tenantId: req.tenantId || req.user.tenantId,
      date,
      correctionType,
      proposedClockIn,
      proposedClockOut,
      reason,
      attachmentUrl,
    });

    return sendSuccess(res, correction, 'attendance_correction.created_success', 201);
  } catch (error) {
    next(error);
  }
};

export const getMyCorrections = async (req, res, next) => {
  try {
    const list = await attendanceCorrectionService.getMyCorrections(req.user.id);
    return sendSuccess(res, list, 'attendance_correction.my_loaded');
  } catch (error) {
    next(error);
  }
};

export const getTeamPending = async (req, res, next) => {
  try {
    const list = await attendanceCorrectionService.getTeamCorrectionsForLeader(
      req.user.id,
      req.tenantId || req.user.tenantId
    );
    return sendSuccess(res, list, 'attendance_correction.team_pending_loaded');
  } catch (error) {
    next(error);
  }
};

export const getHrPending = async (req, res, next) => {
  try {
    const list = await attendanceCorrectionService.getHrPendingCorrections(
      req.tenantId || req.user.tenantId
    );
    return sendSuccess(res, list, 'attendance_correction.hr_pending_loaded');
  } catch (error) {
    next(error);
  }
};

export const leaderAction = async (req, res, next) => {
  try {
    const { action, notes, rejectReason } = req.body;
    const updated = await attendanceCorrectionService.leaderAction({
      correctionId: req.params.id,
      leaderUser: req.user,
      action,
      notes,
      rejectReason,
    });
    const messageKey =
      action === 'approve'
        ? 'attendance_correction.leader_approved'
        : 'attendance_correction.leader_rejected';
    return sendSuccess(res, updated, messageKey);
  } catch (error) {
    next(error);
  }
};

export const hrAction = async (req, res, next) => {
  try {
    const { action, notes, rejectReason } = req.body;
    const updated = await attendanceCorrectionService.hrAction({
      correctionId: req.params.id,
      hrUser: req.user,
      action,
      notes,
      rejectReason,
    });
    const messageKey =
      action === 'approve'
        ? 'attendance_correction.hr_approved'
        : 'attendance_correction.hr_rejected';
    return sendSuccess(res, updated, messageKey);
  } catch (error) {
    next(error);
  }
};

