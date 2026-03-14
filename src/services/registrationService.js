import { getApiClient } from './apiClient.js';

const api = getApiClient();

export const submitVendorRegistrationRequest = async (payload) =>
  api.post('/auth/vendor-registration-request', payload);
