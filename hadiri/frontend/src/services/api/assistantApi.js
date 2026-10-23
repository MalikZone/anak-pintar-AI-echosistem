import { apiClient } from './apiClient';

export const assistantApi = {
  chat: async (message) => {
    return apiClient.post('/assistant/chat', { message });
  },

  confirmDraft: async (draftId) => {
    return apiClient.post(`/assistant/drafts/${draftId}/confirm`, {});
  },

  cancelDraft: async (draftId) => {
    return apiClient.delete(`/assistant/drafts/${draftId}`);
  },

  getHealth: async () => {
    return apiClient.get('/assistant/health');
  },
};

export default assistantApi;

