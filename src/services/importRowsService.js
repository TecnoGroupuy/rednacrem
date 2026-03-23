import { getApiClient } from './apiClient.js';

const api = getApiClient();
const hasApiConfigured = () => Boolean(import.meta.env?.VITE_API_URL);

export const getImportRows = async (importId) => {
  if (!importId) return [];
  if (!hasApiConfigured()) return [];
  const response = await api.get(`/imports/${importId}/rows`);
  const items = response?.items || response?.data || response || [];
  return Array.isArray(items) ? items : [];
};
