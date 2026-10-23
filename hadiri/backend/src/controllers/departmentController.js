import { departmentService } from '../services/departmentService.js';
import { sendSuccess } from '../utils/responseHandler.js';

export const getAllDepartments = async (req, res, next) => {
  try {
    const list = await departmentService.getDepartments(req.tenantId);
    return sendSuccess(res, list, 'department.list_loaded');
  } catch (error) {
    next(error);
  }
};

export const getDepartmentById = async (req, res, next) => {
  try {
    const dept = await departmentService.getDepartmentById(req.tenantId, req.params.id);
    return sendSuccess(res, dept, 'department.detail_loaded');
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    const created = await departmentService.createDepartment(req.tenantId, req.body);
    return sendSuccess(res, created, 'department.created_success', 201);
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const updated = await departmentService.updateDepartment(req.tenantId, req.params.id, req.body);
    return sendSuccess(res, updated, 'department.updated_success');
  } catch (error) {
    next(error);
  }
};

export const deleteDepartment = async (req, res, next) => {
  try {
    const result = await departmentService.deleteDepartment(req.tenantId, req.params.id);
    return sendSuccess(res, result, 'department.deleted_success');
  } catch (error) {
    next(error);
  }
};

