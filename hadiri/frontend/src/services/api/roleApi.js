import { apiClient } from './apiClient';

export const roleApi = {
  getRoles: async () => {
    const response = await apiClient.get('/roles');
    return response.data;
  },

  getRoleById: async (id) => {
    const response = await apiClient.get(`/roles/${id}`);
    return response.data;
  },

  createRole: async (data) => {
    const response = await apiClient.post('/roles', data);
    return response.data;
  },

  updateRole: async (id, data) => {
    const response = await apiClient.put(`/roles/${id}`, data);
    return response.data;
  },

  deleteRole: async (id) => {
    const response = await apiClient.delete(`/roles/${id}`);
    return response.data;
  },

  updatePermissions: async (id, permissions) => {
    const response = await apiClient.put(`/roles/${id}/permissions`, { permissions });
    return response.data;
  },

  getPermissionRegistry: async () => {
    const response = await apiClient.get('/roles/permissions/registry');
    return response.data;
  },
};

