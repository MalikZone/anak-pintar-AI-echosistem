import { apiClient } from './apiClient';

export const attendanceApi = {
  clockIn: async (payload) => {
    return apiClient.post('/attendances/clock-in', payload);
  },

  clockOut: async (payload = {}) => {
    let safePayload = {};
    if (typeof payload === 'string') {
      safePayload = { notes: payload };
    } else if (payload && typeof payload === 'object' && !payload.nativeEvent && !payload.target) {
      safePayload = {
        notes: typeof payload.notes === 'string' ? payload.notes : 'Selesai bertugas',
      };
    } else {
      safePayload = { notes: 'Selesai bertugas' };
    }
    return apiClient.post('/attendances/clock-out', safePayload);
  },

  getTodayStatus: async () => {
    return apiClient.get('/attendances/today');
  },

  getHistory: async () => {
    return apiClient.get('/attendances/history');
  },

  getTenantToday: async (params = {}) => {
    return apiClient.get('/attendances/tenant-today', { params });
  },

  getMonthlyReport: async (params = {}) => {
    return apiClient.get('/attendances/report', { params });
  },
};

