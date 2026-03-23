import { getApiClient } from './apiClient.js';

const api = getApiClient();
const hasApiConfigured = () => Boolean(import.meta.env?.VITE_API_URL);

export const getNoCallImportJob = async () => {
  if (!hasApiConfigured()) return null;
  const response = await api.get('/imports/no-call');
  return response?.item || response?.data || response || null;
};
