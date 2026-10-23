import { apiClient } from './apiClient';

export const attendanceCorrectionApi = {
  submitCorrection: async (data) => {
    return apiClient.post('/attendance-corrections', data);
  },

  getMyCorrections: async () => {
    return apiClient.get('/attendance-corrections/my');
  },

  getTeamPending: async () => {
    return apiClient.get('/attendance-corrections/team-pending');
  },

  getHrPending: async () => {
    return apiClient.get('/attendance-corrections/hr-pending');
  },

  leaderAction: async (id, data) => {
    return apiClient.patch(`/attendance-corrections/${id}/leader-action`, data);
  },

  hrAction: async (id, data) => {
    return apiClient.patch(`/attendance-corrections/${id}/hr-action`, data);
  },
};

