import { positionService } from '../services/positionService.js';
import { sendSuccess } from '../utils/responseHandler.js';

export const getAllPositions = async (req, res, next) => {
  try {
    const list = await positionService.getPositions(req.tenantId);
    return sendSuccess(res, list, 'position.list_loaded');
  } catch (error) {
    next(error);
  }
};

export const getPositionById = async (req, res, next) => {
  try {
    const pos = await positionService.getPositionById(req.tenantId, req.params.id);
    return sendSuccess(res, pos, 'position.detail_loaded');
  } catch (error) {
    next(error);
  }
};

export const createPosition = async (req, res, next) => {
  try {
    const created = await positionService.createPosition(req.tenantId, req.body);
    return sendSuccess(res, created, 'position.created_success', 201);
  } catch (error) {
    next(error);
  }
};

export const updatePosition = async (req, res, next) => {
  try {
    const updated = await positionService.updatePosition(req.tenantId, req.params.id, req.body);
    return sendSuccess(res, updated, 'position.updated_success');
  } catch (error) {
    next(error);
  }
};

export const deletePosition = async (req, res, next) => {
  try {
    const result = await positionService.deletePosition(req.tenantId, req.params.id);
    return sendSuccess(res, result, 'position.deleted_success');
  } catch (error) {
    next(error);
  }
};

