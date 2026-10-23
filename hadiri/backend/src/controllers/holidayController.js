import { holidayService } from '../services/holidayService.js';
import { sendSuccess } from '../utils/responseHandler.js';

export const getAllHolidays = async (req, res, next) => {
  try {
    const year = req.query.year ? Number(req.query.year) : null;
    const list = await holidayService.getHolidays(req.tenantId, year);
    return sendSuccess(res, list, 'holiday.list_loaded');
  } catch (error) {
    next(error);
  }
};

export const getHolidayById = async (req, res, next) => {
  try {
    const item = await holidayService.getHolidayById(req.params.id);
    return sendSuccess(res, item, 'holiday.detail_loaded');
  } catch (error) {
    next(error);
  }
};

export const createHoliday = async (req, res, next) => {
  try {
    const created = await holidayService.createHoliday(req.user, req.tenantId, req.body);
    return sendSuccess(res, created, 'holiday.created_success', 201);
  } catch (error) {
    next(error);
  }
};

export const updateHoliday = async (req, res, next) => {
  try {
    const updated = await holidayService.updateHoliday(req.user, req.tenantId, req.params.id, req.body);
    return sendSuccess(res, updated, 'holiday.updated_success');
  } catch (error) {
    next(error);
  }
};

export const deleteHoliday = async (req, res, next) => {
  try {
    const result = await holidayService.deleteHoliday(req.user, req.tenantId, req.params.id);
    return sendSuccess(res, result, 'holiday.deleted_success');
  } catch (error) {
    next(error);
  }
};

