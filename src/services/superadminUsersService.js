import { getApiClient } from './apiClient.js';

const api = getApiClient();

const normalizeUser = (item = {}) => ({
  id: item.id || '',
  nombre: item.nombre || '',
  email: item.email || '',
  telefono: item.telefono || '',
  rol: item.rol || item.role || 'vendedor',
  activo: item.activo ?? (item.status ? item.status === 'approved' : true),
  status: item.status || (item.activo === false ? 'inactive' : 'approved'),
  ultimoAcceso: item.ultimoAcceso || item.last_login_at || null,
  createdAt: item.createdAt || item.created_at || null
});

export const listSuperadminUsers = async () => {
  const response = await api.get('/superadmin/users');
  const items = Array.isArray(response?.items) ? response.items : (Array.isArray(response) ? response : []);
  return items.map(normalizeUser);
};

export const createSuperadminUser = async (payload) => {
  const created = await api.post('/superadmin/users', payload);
  return normalizeUser(created);
};

export const updateSuperadminUser = async (id, payload) => {
  const updated = await api.put(`/superadmin/users/${id}`, payload);
  return normalizeUser(updated);
};
