import { apiClient } from './apiClient';

export const leaveTypeApi = {
  getLeaveTypes: async () => {
    return apiClient.get('/leave-types');
  },

  getLeaveTypeById: async (id) => {
    return apiClient.get(`/leave-types/${id}`);
  },

  createLeaveType: async (data) => {
    return apiClient.post('/leave-types', data);
  },

  updateLeaveType: async (id, data) => {
    return apiClient.put(`/leave-types/${id}`, data);
  },

  deleteLeaveType: async (id) => {
    return apiClient.delete(`/leave-types/${id}`);
  },
};

