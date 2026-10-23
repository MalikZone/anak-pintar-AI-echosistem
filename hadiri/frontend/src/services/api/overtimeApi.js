import { apiClient } from './apiClient';

export const overtimeApi = {
  submitOvertime: async (payload) => {
    return apiClient.post('/overtimes', payload);
  },

  getMyOvertimes: async () => {
    return apiClient.get('/overtimes/my');
  },

  getTenantOvertimes: async () => {
    return apiClient.get('/overtimes/tenant');
  },

  getTeamPendingOvertimes: async () => {
    return apiClient.get('/overtimes/team-pending');
  },

  getHrPendingOvertimes: async () => {
    return apiClient.get('/overtimes/hr-pending');
  },

  leaderAction: async (id, { action, notes, rejectReason }) => {
    return apiClient.patch(`/overtimes/${id}/leader-action`, { action, notes, rejectReason });
  },

  hrAction: async (id, { action, rejectReason }) => {
    return apiClient.patch(`/overtimes/${id}/hr-action`, { action, rejectReason });
  },
};

