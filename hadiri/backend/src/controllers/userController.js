import { userService } from '../services/userService.js';
import { sendSuccess } from '../utils/responseHandler.js';

export const getDirectory = async (req, res, next) => {
  try {
    const { date } = req.query;
    const users = await userService.getTenantDirectory(req.tenantId, { date });
    return sendSuccess(res, users, 'user.directory_loaded');
  } catch (error) {
    next(error);
  }
};

export const getEmployeeDetail = async (req, res, next) => {
  try {
    const user = await userService.getEmployeeById(req.params.id, req.tenantId);
    return sendSuccess(res, user, 'user.detail_loaded');
  } catch (error) {
    next(error);
  }
};

export const getEmployeeByTelegramId = async (req, res, next) => {
  try {
    const tenantScope = req.user?.role === 'super_admin' ? (req.query.tenantId || null) : req.tenantId;
    const user = await userService.getEmployeeByTelegramId(req.params.telegramId, tenantScope);
    return sendSuccess(res, user, 'user.detail_loaded');
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (req, res, next) => {
  try {
    const targetTenantId = (req.user?.role === 'super_admin' && req.body.tenantId)
      ? req.body.tenantId
      : req.tenantId;
    const newUser = await userService.createEmployee(req.body, targetTenantId, req.user);
    return sendSuccess(res, newUser, 'user.created_success', 201, null, {
      name: newUser.name,
      id: newUser.id,
    });
  } catch (error) {
    next(error);
  }
};

export const bulkImportEmployees = async (req, res, next) => {
  try {
    const { employees } = req.body;
    const targetTenantId =
      req.user?.role === 'super_admin' && req.body.tenantId ? req.body.tenantId : req.tenantId;
    const result = await userService.bulkImportEmployees(employees, targetTenantId);
    return sendSuccess(res, result, 'user.bulk_imported_success', 201, {
      count: result.importedCount,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const updated = await userService.updateEmployee(req.params.id, req.body, req.tenantId);
    return sendSuccess(res, updated, 'user.updated_success', 200, {
      name: updated.name,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const result = await userService.deleteEmployee(req.params.id, req.tenantId, req.user);
    return sendSuccess(res, result, 'user.deleted_success', 200, null, {
      name: result.name,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyProfile = async (req, res, next) => {
  try {
    const user = await userService.getEmployeeById(req.user.id, req.tenantId);
    return sendSuccess(res, user, 'user.profile_loaded');
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (req, res, next) => {
  try {
    const updated = await userService.updateMyProfile(req.user.id, req.tenantId, req.body);
    return sendSuccess(res, updated, 'user.profile_updated');
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    await userService.changeMyPassword(req.user.id, req.tenantId, req.body);
    return sendSuccess(res, { success: true }, 'user.password_changed');
  } catch (error) {
    next(error);
  }
};

export const resetEmployeePassword = async (req, res, next) => {
  try {
    const result = await userService.resetEmployeePassword(
      req.params.id,
      req.tenantId,
      req.body.newPassword
    );
    return sendSuccess(res, result, 'user.password_reset_success');
  } catch (error) {
    next(error);
  }
};

export const getMyTeam = async (req, res, next) => {
  try {
    const subordinates = await userService.getMyTeam(req.user.id, req.tenantId);
    return sendSuccess(res, subordinates, 'user.team_loaded');
  } catch (error) {
    next(error);
  }
};

export const getUserHierarchy = async (req, res, next) => {
  try {
    const targetUserId = req.params.id || req.user.id;
    const hierarchy = await userService.getUserHierarchy(targetUserId, req.tenantId);
    return sendSuccess(res, hierarchy, 'user.hierarchy_loaded');
  } catch (error) {
    next(error);
  }
};
