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

export const deleteContactProduct = async (contactProductId, organizationId) => {
  if (!contactProductId) return null;
  if (!hasApiConfigured()) {
    return { id: contactProductId, deleted: true };
  }
  const orgQuery = organizationId ? `?organization_id=${encodeURIComponent(organizationId)}` : '';
  const response = await api.del(`/contact-products/${contactProductId}${orgQuery}`);
  return response?.item || response || null;
};
