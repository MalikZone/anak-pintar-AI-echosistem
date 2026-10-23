import { apiClient } from './apiClient';

export const tenantApi = {
  getTenants: async (params = {}) => {
    return apiClient.get('/tenants', params);
  },

  getTenantById: async (id) => {
    return apiClient.get(`/tenants/${id}`);
  },

  createTenant: async (data) => {
    return apiClient.post('/tenants', data);
  },

  updateTenant: async (id, data) => {
    return apiClient.put(`/tenants/${id}`, data);
  },

  deleteTenant: async (id) => {
    return apiClient.delete(`/tenants/${id}`);
  },

  getCurrentTenant: async () => {
    return apiClient.get('/tenants/current');
  },

  updateCurrentTenant: async (data) => {
    return apiClient.put('/tenants/current', data);
  },

  getSaasOverview: async () => {
    return apiClient.get('/tenants/saas/overview');
  },

  getSubscriptionPlans: async () => {
    return apiClient.get('/tenants/saas/plans');
  },

  updateSubscriptionPlanCatalog: async (code, data) => {
    return apiClient.put(`/tenants/saas/plans/${code}`, data);
  },

  getAuditLogs: async (params = {}) => {
    return apiClient.get('/tenants/saas/audit-logs', params);
  },

  updateSubscription: async (id, data) => {
    return apiClient.put(`/tenants/${id}/subscription`, data);
  },

  impersonateTenant: async (id) => {
    return apiClient.post(`/tenants/${id}/impersonate`);
  },
};

