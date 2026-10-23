import { apiClient } from './apiClient';

export const rosterApi = {
  getMyRoster: async (params = {}) => {
    return apiClient.get('/rosters/my', { params });
  },

  getTeamMatrix: async (params = {}) => {
    return apiClient.get('/rosters/team', { params });
  },

  assignRoster: async (data) => {
    return apiClient.post('/rosters/assign', data);
  },

  bulkGenerate: async (data) => {
    return apiClient.post('/rosters/bulk-generate', data);
  },

  getMyShiftSwitches: async (params = {}) => {
    return apiClient.get('/rosters/switch-requests/my', { params });
  },

  getShiftSwitches: async (params = {}) => {
    return apiClient.get('/rosters/switch-requests', { params });
  },

  requestShiftSwitch: async (data) => {
    return apiClient.post('/rosters/switch-request', data);
  },

  reviewShiftSwitch: async (id, data) => {
    return apiClient.put(`/rosters/switch-requests/${id}/review`, data);
  },
};

