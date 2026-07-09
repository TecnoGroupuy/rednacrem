import { getApiClient } from './apiClient.js';

const api = getApiClient();
const hasApiConfigured = () => Boolean(import.meta.env?.VITE_API_URL);

export const createNoCallImportJob = async (csvText, { fileName = '' } = {}) => {
  if (!hasApiConfigured()) return null;
  const response = await api.post('/imports/no-llamar/jobs', csvText, {
    headers: {
      'Content-Type': 'text/plain',
      ...(fileName ? { 'x-file-name': fileName } : {})
    }
  });
  return response?.job || response || null;
};

export const getNoCallImportJob = async (jobId) => {
  if (!hasApiConfigured() || !jobId) return null;
  const response = await api.get(`/imports/no-llamar/jobs/${jobId}`);
  return response?.job || response?.item || response?.data || response || null;
};
