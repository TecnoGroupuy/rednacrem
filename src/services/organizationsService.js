import { getApiClient } from './apiClient.js';

export async function listOrganizations() {
  const api = getApiClient();
  const response = await api.get('/organizations');
  return response?.items || [];
}

export async function createOrganization(payload) {
  const api = getApiClient();
  const response = await api.post('/organizations', payload);
  return response?.item || response;
}

export async function updateOrganization(id, payload) {
  const api = getApiClient();
  const response = await api.put(`/organizations/${id}`, payload);
  return response?.item || response;
}
