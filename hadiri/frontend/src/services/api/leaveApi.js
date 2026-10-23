import { apiClient } from './apiClient';

export const leaveApi = {
  submitLeave: async (payload) => {
    return apiClient.post('/leaves', payload);
  },

  getMyLeaves: async () => {
    return apiClient.get('/leaves/my');
  },

  getTeamPendingLeaves: async () => {
    return apiClient.get('/leaves/team-pending');
  },

  leaderAction: async (id, { action, notes, rejectReason }) => {
    return apiClient.patch(`/leaves/${id}/leader-action`, { action, notes, rejectReason });
  },

  getHrPendingLeaves: async () => {
    return apiClient.get('/leaves/hr-pending');
  },

  hrAction: async (id, { action, rejectReason }) => {
    return apiClient.patch(`/leaves/${id}/hr-action`, { action, rejectReason });
  },

  getAllLeaves: async () => {
    return apiClient.get('/leaves');
  },
};

