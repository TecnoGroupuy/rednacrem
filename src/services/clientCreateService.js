import { getApiClient } from './apiClient.js';

const api = getApiClient();
const hasApiConfigured = () => Boolean(import.meta.env?.VITE_API_URL);

export const createContactWithProducts = async (payload) => {
  if (!hasApiConfigured()) {
    return { ...(payload || {}), id: `tmp-${Date.now()}` };
  }
  const response = await api.post('/contacts', payload);
  return response?.data || response?.item || response;
};
