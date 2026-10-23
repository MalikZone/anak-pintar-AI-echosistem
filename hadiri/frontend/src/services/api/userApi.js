import { apiClient } from './apiClient';

export const userApi = {
  // Directory & Hierarchy
  getDirectory: async (params = {}) => {
    return apiClient.get('/users/directory', { params });
  },

  getEmployeeById: async (id) => {
    return apiClient.get(`/users/${id}`);
  },

  getEmployeeByTelegramId: async (telegramId) => {
    return apiClient.get(`/users/by-telegram/${encodeURIComponent(telegramId)}`);
  },

  getMyTeam: async () => {
    return apiClient.get('/users/team');
  },

  getHierarchy: async (userId = '') => {
    const path = userId ? `/users/hierarchy/${userId}` : '/users/hierarchy';
    return apiClient.get(path);
  },

  // Employee Management (HR Admin)
  createEmployee: async (data) => {
    return apiClient.post('/users', data);
  },

  bulkImport: async (employees = []) => {
    return apiClient.post('/users/bulk-import', { employees });
  },

  updateEmployee: async (id, data) => {
    return apiClient.put(`/users/${id}`, data);
  },

  deleteEmployee: async (id) => {
    return apiClient.delete(`/users/${id}`);
  },

  resetPassword: async (id, newPassword = 'password123') => {
    return apiClient.post(`/users/${id}/reset-password`, { newPassword });
  },

  // Personal Profile & Security (All Users)
  getMyProfile: async () => {
    return apiClient.get('/users/me/profile');
  },

  updateMyProfile: async (data) => {
    return apiClient.put('/users/me/profile', data);
  },

  changePassword: async (data) => {
    return apiClient.put('/users/me/change-password', data);
  },
};
