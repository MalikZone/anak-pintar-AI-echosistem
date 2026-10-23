import { roleService } from '../services/roleService.js';
import { sendSuccess } from '../utils/responseHandler.js';

export const getAllRoles = async (req, res, next) => {
  try {
    const roles = await roleService.getRoles(req.tenantId);
    return sendSuccess(res, roles, 'role.list_loaded');
  } catch (error) {
    next(error);
  }
};

export const getRoleById = async (req, res, next) => {
  try {
    const role = await roleService.getRoleById(req.tenantId, req.params.id);
    return sendSuccess(res, role, 'role.detail_loaded');
  } catch (error) {
    next(error);
  }
};

export const createRole = async (req, res, next) => {
  try {
    const created = await roleService.createRole(req.tenantId, req.body);
    return sendSuccess(res, created, 'role.created_success', 201);
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (req, res, next) => {
  try {
    const updated = await roleService.updateRole(req.tenantId, req.params.id, req.body);
    return sendSuccess(res, updated, 'role.updated_success');
  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (req, res, next) => {
  try {
    const result = await roleService.deleteRole(req.tenantId, req.params.id);
    return sendSuccess(res, result, 'role.deleted_success');
  } catch (error) {
    next(error);
  }
};

export const updateRolePermissions = async (req, res, next) => {
  try {
    const { permissions } = req.body;
    const updated = await roleService.updateRolePermissions(req.tenantId, req.params.id, permissions || []);
    return sendSuccess(res, updated, 'role.permissions_synced');
  } catch (error) {
    next(error);
  }
};

export const getPermissionRegistry = async (req, res, next) => {
  try {
    const registry = await roleService.getPermissionRegistry();
    return sendSuccess(res, registry, 'role.permissions_registry_loaded');
  } catch (error) {
    next(error);
  }
};

