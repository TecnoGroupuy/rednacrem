import { getApiClient, getApiBaseUrl, getAccessToken } from './apiClient.js';

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

export async function uploadOrganizationLogo(orgId, file) {
  const token = await getAccessToken();
  const url = `${getApiBaseUrl()}/organizations/${orgId}/logo`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'image/png',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: file
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.message || `HTTP ${response.status}`);
  }

  return response.json();
}
