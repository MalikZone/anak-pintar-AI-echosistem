import { shiftService } from '../services/shiftService.js';
import { sendSuccess } from '../utils/responseHandler.js';

export const getShifts = async (req, res, next) => {
  try {
    const shifts = await shiftService.getTenantShifts(req.tenantId);
    return sendSuccess(res, shifts, 'shift.tenant_loaded');
  } catch (error) {
    next(error);
  }
};

export const getShiftById = async (req, res, next) => {
  try {
    const shift = await shiftService.getShiftById(req.params.id, req.tenantId);
    return sendSuccess(res, shift, 'shift.detail_loaded');
  } catch (error) {
    next(error);
  }
};

export const createShift = async (req, res, next) => {
  try {
    const shift = await shiftService.createShift(req.body, req.tenantId);
    return sendSuccess(res, shift, 'shift.created_success', 201);
  } catch (error) {
    next(error);
  }
};

export const updateShift = async (req, res, next) => {
  try {
    const shift = await shiftService.updateShift(req.params.id, req.body, req.tenantId);
    return sendSuccess(res, shift, 'shift.updated_success');
  } catch (error) {
    next(error);
  }
};

export const deleteShift = async (req, res, next) => {
  try {
    await shiftService.deleteShift(req.params.id, req.tenantId);
    return sendSuccess(res, { id: req.params.id }, 'shift.deleted_success');
  } catch (error) {
    next(error);
  }
};
