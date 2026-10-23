import { leaveTypeService } from '../services/leaveTypeService.js';
import { sendSuccess } from '../utils/responseHandler.js';

export const getAllLeaveTypes = async (req, res, next) => {
  try {
    const list = await leaveTypeService.getLeaveTypes(req.tenantId);
    return sendSuccess(res, list, 'leave_type.list_loaded');
  } catch (error) {
    next(error);
  }
};

export const getLeaveTypeById = async (req, res, next) => {
  try {
    const item = await leaveTypeService.getLeaveTypeById(req.params.id);
    return sendSuccess(res, item, 'leave_type.detail_loaded');
  } catch (error) {
    next(error);
  }
};

export const createLeaveType = async (req, res, next) => {
  try {
    const created = await leaveTypeService.createLeaveType(req.user, req.tenantId, req.body);
    return sendSuccess(res, created, 'leave_type.created_success', 201);
  } catch (error) {
    next(error);
  }
};

export const updateLeaveType = async (req, res, next) => {
  try {
    const updated = await leaveTypeService.updateLeaveType(req.user, req.tenantId, req.params.id, req.body);
    return sendSuccess(res, updated, 'leave_type.updated_success');
  } catch (error) {
    next(error);
  }
};

export const deleteLeaveType = async (req, res, next) => {
  try {
    const result = await leaveTypeService.deleteLeaveType(req.user, req.tenantId, req.params.id);
    return sendSuccess(res, result, 'leave_type.deleted_success');
  } catch (error) {
    next(error);
  }
};

