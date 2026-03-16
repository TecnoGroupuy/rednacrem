import { getApiClient } from './apiClient.js';

const api = getApiClient();

const normalizeRequest = (item = {}) => ({
  id: item.id || '',
  nombre: item.nombre || '',
  apellido: item.apellido || '',
  email: item.email || '',
  telefono: item.telefono || '',
  status: item.status || 'pending',
  reviewedBy: item.reviewedBy || item.reviewed_by || null,
  reviewedAt: item.reviewedAt || item.reviewed_at || null,
  reviewNotes: item.reviewNotes || item.review_notes || null,
  userId: item.userId || item.user_id || null,
  createdAt: item.createdAt || item.created_at || null,
  updatedAt: item.updatedAt || item.updated_at || null
});

export const listPendingRegistrationRequests = async () => {
  const response = await api.get('/supervisor/vendor-requests');
  const items = Array.isArray(response?.requests)
    ? response.requests
    : (Array.isArray(response?.items) ? response.items : (Array.isArray(response) ? response : []));
  return items.map(normalizeRequest);
};

export const approveRegistrationRequest = async (id) =>
  api.post(`/supervisor/vendor-requests/${id}/approve`, {});

export const rejectRegistrationRequest = async (id, payload = {}) =>
  api.post(`/supervisor/vendor-requests/${id}/reject`, payload);
