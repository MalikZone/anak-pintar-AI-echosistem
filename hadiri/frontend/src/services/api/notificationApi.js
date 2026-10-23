import { apiClient } from './apiClient';

export const notificationApi = {
  getNotifications: async (params = {}) => {
    return apiClient.get('/notifications', { params });
  },

  markAsRead: async (id) => {
    return apiClient.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async () => {
    return apiClient.patch('/notifications/read-all');
  },
};

