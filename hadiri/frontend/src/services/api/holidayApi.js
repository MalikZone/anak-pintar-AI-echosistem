import { apiClient } from './apiClient';

export const holidayApi = {
  getHolidays: async (year = null) => {
    const query = year ? `?year=${year}` : '';
    return apiClient.get(`/holidays${query}`);
  },

  getHolidayById: async (id) => {
    return apiClient.get(`/holidays/${id}`);
  },

  createHoliday: async (data) => {
    return apiClient.post('/holidays', data);
  },

  updateHoliday: async (id, data) => {
    return apiClient.put(`/holidays/${id}`, data);
  },

  deleteHoliday: async (id) => {
    return apiClient.delete(`/holidays/${id}`);
  },
};

