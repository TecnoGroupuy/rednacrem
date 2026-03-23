import { getApiClient } from './apiClient.js';

const api = getApiClient();
const hasApiConfigured = () => Boolean(import.meta.env?.VITE_API_URL);

export const deleteClient = async (clientId) => {
  if (!clientId) return null;
  if (!hasApiConfigured()) {
    return { id: clientId, deleted: true };
  }
  const response = await api.del(`/clients/${clientId}`);
  return response?.item || response || null;
};
