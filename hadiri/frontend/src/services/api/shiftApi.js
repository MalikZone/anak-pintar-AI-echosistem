import { apiClient } from './apiClient';

export const shiftApi = {
  getShifts: async () => {
    return apiClient.get('/shifts');
  },

  getShiftById: async (id) => {
    return apiClient.get(`/shifts/${id}`);
  },

  createShift: async (data) => {
    return apiClient.post('/shifts', data);
  },

  updateShift: async (id, data) => {
    return apiClient.put(`/shifts/${id}`, data);
  },

  deleteShift: async (id) => {
    return apiClient.delete(`/shifts/${id}`);
  },
};
