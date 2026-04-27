import { buildApiUrl, getApiClient, getApiBaseUrl, getAccessToken } from './apiClient.js';

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
  const url = buildApiUrl(`/organizations/${orgId}/logo`, getApiBaseUrl());

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

export async function listOrganizationUsers(orgId) {
  const api = getApiClient();
  const res = await api.get(`/organizations/${orgId}/users`);
  return res?.items || [];
}

export async function assignUserToOrganization(orgId, userId, roleInOrg) {
  const api = getApiClient();
  const res = await api.post(`/organizations/${orgId}/users`, {
    user_id: userId,
    role_in_org: roleInOrg
  });
  return res?.item;
}

export async function removeUserFromOrganization(orgId, userId) {
  const api = getApiClient();
  return api.del(`/organizations/${orgId}/users/${userId}`);
}

export async function listMyOrganizations() {
  const api = getApiClient();
  const res = await api.get('/me/organizations');
  return res?.items || [];
}
