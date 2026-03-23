import { getApiClient } from './apiClient.js';
import { getPortfolioClientById } from './clientsService.js';

const api = getApiClient();
const hasApiConfigured = () => Boolean(import.meta.env?.VITE_API_URL);

export const fetchClientDetail = async (clientId) => {
  if (!hasApiConfigured()) {
    return getPortfolioClientById(clientId);
  }
  const response = await api.get(`/clients/${clientId}`);
  return response?.item || response?.data || response || null;
};
