import { getApiClient } from './apiClient.js';

const api = getApiClient();

export const getBusinessSession = async () => {
  const payload = await api.get('/me');
  return {
    id: payload?.id || '',
    nombre: payload?.nombre || payload?.name || 'Usuario',
    email: payload?.email || '',
    role: payload?.role || null,
    status: payload?.status || null,
    permissions: Array.isArray(payload?.permissions) ? payload.permissions : [],
    claims: payload?.claims && typeof payload.claims === 'object' ? payload.claims : {}
  };
};
