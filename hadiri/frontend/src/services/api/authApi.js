import { apiClient } from './apiClient';

export const authApi = {
  login: async (email, password) => {
    return apiClient.post('/auth/login', { email, password });
  },

  getMe: async () => {
    return apiClient.get('/auth/me');
  },
};

