import { apiClient } from './apiClient';

export const positionApi = {
  getPositions: async () => {
    return apiClient.get('/positions');
  },

  getPositionById: async (id) => {
    return apiClient.get(`/positions/${id}`);
  },

  createPosition: async (data) => {
    return apiClient.post('/positions', data);
  },

  updatePosition: async (id, data) => {
    return apiClient.put(`/positions/${id}`, data);
  },

  deletePosition: async (id) => {
    return apiClient.delete(`/positions/${id}`);
  },
};

