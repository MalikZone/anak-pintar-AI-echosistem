import { rosterService } from '../services/rosterService.js';
import { sendSuccess } from '../utils/responseHandler.js';

export const getMyRoster = async (req, res, next) => {
  try {
    const roster = await rosterService.getMyRoster(req.tenantId, req.user.id, req.query);
    return sendSuccess(res, roster, 'roster.my_roster_loaded');
  } catch (error) {
    next(error);
  }
};

export const getTeamRosterMatrix = async (req, res, next) => {
  try {
    const matrix = await rosterService.getTeamRosterMatrix(req.tenantId, req.query);
    return sendSuccess(res, matrix, 'roster.team_matrix_loaded');
  } catch (error) {
    next(error);
  }
};

export const assignRoster = async (req, res, next) => {
  try {
    const assigned = await rosterService.assignRoster(req.tenantId, req.body);
    return sendSuccess(res, assigned, 'roster.assigned_success', 201);
  } catch (error) {
    next(error);
  }
};

export const bulkGenerateRoster = async (req, res, next) => {
  try {
    const result = await rosterService.bulkGenerateRoster(req.tenantId, req.body);
    return sendSuccess(res, result, 'roster.bulk_generated_success', 201);
  } catch (error) {
    next(error);
  }
};

export const requestShiftSwitch = async (req, res, next) => {
  try {
    const switchReq = await rosterService.requestShiftSwitch(req.tenantId, req.user.id, req.body);
    return sendSuccess(res, switchReq, 'roster.switch_submitted_success', 201);
  } catch (error) {
    next(error);
  }
};

export const getMyShiftSwitches = async (req, res, next) => {
  try {
    const switches = await rosterService.getMyShiftSwitches(req.tenantId, req.user.id, req.query);
    return sendSuccess(res, switches, 'roster.my_switches_loaded');
  } catch (error) {
    next(error);
  }
};

export const getShiftSwitches = async (req, res, next) => {
  try {
    const switches = await rosterService.getShiftSwitches(req.tenantId, req.query, req.user);
    return sendSuccess(res, switches, 'roster.switches_loaded');
  } catch (error) {
    next(error);
  }
};

export const reviewShiftSwitch = async (req, res, next) => {
  try {
    const { action, rejectionReason } = req.body;
    const reviewed = await rosterService.reviewShiftSwitch(
      req.tenantId,
      req.params.id,
      req.user.id,
      action,
      rejectionReason
    );
    return sendSuccess(res, reviewed, action === 'approved' ? 'roster.switch_approved' : 'roster.switch_rejected');
  } catch (error) {
    next(error);
  }
};

