import apiClient from './apiClient.js';

const ME_ENDPOINT = import.meta.env.VITE_AUTH_ME_ENDPOINT || '/me';

function normalizeSessionPayload(payload) {
  if (!payload) return null;

  // caso backend actual
  if (payload.user) {
    return {
      ...payload.user,
      claims: payload.claims || null
    };
  }

  // caso payload plano
  if (payload.id || payload.role) {
    return payload;
  }

  return null;
}

export async function getBusinessSession() {
  const response = await apiClient.get(ME_ENDPOINT);
  const payload = response?.data ?? response;
  const session = normalizeSessionPayload(payload);

  if (!session) {
    throw new Error('Invalid /me response format');
  }

  return session;
}
