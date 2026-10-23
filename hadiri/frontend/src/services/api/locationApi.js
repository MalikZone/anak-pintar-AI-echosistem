import { apiClient } from './apiClient';

export const locationApi = {
  getLocations: async (tenantId) => {
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    return apiClient.get(`/locations${query}`);
  },

  getLocationById: async (id) => {
    return apiClient.get(`/locations/${id}`);
  },

  createLocation: async (data) => {
    return apiClient.post('/locations', data);
  },

  updateLocation: async (id, data) => {
    return apiClient.put(`/locations/${id}`, data);
  },

  deleteLocation: async (id) => {
    return apiClient.delete(`/locations/${id}`);
  },
};

