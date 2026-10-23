import { apiClient } from './apiClient';

export const departmentApi = {
  getDepartments: async () => {
    return apiClient.get('/departments');
  },

  getDepartmentById: async (id) => {
    return apiClient.get(`/departments/${id}`);
  },

  createDepartment: async (data) => {
    return apiClient.post('/departments', data);
  },

  updateDepartment: async (id, data) => {
    return apiClient.put(`/departments/${id}`, data);
  },

  deleteDepartment: async (id) => {
    return apiClient.delete(`/departments/${id}`);
  },
};

