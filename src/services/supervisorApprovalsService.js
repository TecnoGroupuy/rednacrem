import { getApiClient } from './apiClient.js';

const api = getApiClient();

export const listPendingRegistrationRequests = async () => {
  const response = await api.get('/supervisor/registration-requests?status=pending');
  return Array.isArray(response?.items) ? response.items : (Array.isArray(response) ? response : []);
};

export const approveRegistrationRequest = async (id) =>
  api.post(`/supervisor/registration-requests/${id}/approve`, {});

export const rejectRegistrationRequest = async (id, payload = {}) =>
  api.post(`/supervisor/registration-requests/${id}/reject`, payload);
