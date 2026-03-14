import apiClient, { buildApiUrl, getApiBaseUrl } from './apiClient.js';

const normalizePath = (path) => {
  const raw = String(path || '').trim();
  if (!raw) return '/me';
  return raw.startsWith('/') ? raw : `/${raw}`;
};

const ME_ENDPOINT = normalizePath(import.meta.env.VITE_AUTH_ME_ENDPOINT || '/me');

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
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error('VITE_API_URL is required to resolve business session endpoint.');
  }

  const meUrl = buildApiUrl(ME_ENDPOINT, apiBaseUrl);
  // Debug temporal: confirmar URL final de sesion de negocio.
  console.info('[sessionService] GET', meUrl);

  const response = await apiClient.get(meUrl);
  const payload = response?.data ?? response;
  const session = normalizeSessionPayload(payload);

  if (!session) {
    throw new Error('Invalid /me response format');
  }

  return session;
}
