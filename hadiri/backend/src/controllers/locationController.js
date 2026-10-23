import { locationService } from '../services/locationService.js';
import { sendSuccess } from '../utils/responseHandler.js';

export const getAllLocations = async (req, res, next) => {
  try {
    const list = await locationService.getLocations(req.tenantId);
    return sendSuccess(res, list, 'location.list_loaded');
  } catch (error) {
    next(error);
  }
};

export const getLocationById = async (req, res, next) => {
  try {
    const loc = await locationService.getLocationById(req.tenantId, req.params.id);
    return sendSuccess(res, loc, 'location.detail_loaded');
  } catch (error) {
    next(error);
  }
};

export const createLocation = async (req, res, next) => {
  try {
    const created = await locationService.createLocation(req.tenantId, req.body, req.user);
    return sendSuccess(res, created, 'location.created_success', 201);
  } catch (error) {
    next(error);
  }
};

export const updateLocation = async (req, res, next) => {
  try {
    const updated = await locationService.updateLocation(req.tenantId, req.params.id, req.body);
    return sendSuccess(res, updated, 'location.updated_success');
  } catch (error) {
    next(error);
  }
};

export const deleteLocation = async (req, res, next) => {
  try {
    const result = await locationService.deleteLocation(req.tenantId, req.params.id);
    return sendSuccess(res, result, 'location.deleted_success');
  } catch (error) {
    next(error);
  }
};

