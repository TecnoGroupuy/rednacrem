import { getApiClient } from './apiClient.js';

const api = getApiClient();

export const listPendingRegistrationRequests = async () => {
  const response = await api.get('/supervisor/vendor-requests');
  return Array.isArray(response?.items) ? response.items : (Array.isArray(response) ? response : []);
};

export const approveRegistrationRequest = async (id) =>
  api.post(`/supervisor/vendor-requests/${id}/approve`, {});

export const rejectRegistrationRequest = async (id, payload = {}) =>
  api.post(`/supervisor/vendor-requests/${id}/reject`, payload);
