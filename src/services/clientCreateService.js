import { getApiClient } from './apiClient.js';

const api = getApiClient();
const hasApiConfigured = () => Boolean(import.meta.env?.VITE_API_URL);

export const createContactWithProducts = async (payload) => {
  if (!hasApiConfigured()) {
    return { ...(payload || {}), id: `tmp-${Date.now()}` };
  }
  const response = await api.post('/contacts', payload);
  const data = response?.data || response?.item || response;
  // warnings viaja en el nivel superior de la respuesta (junto a ok/data),
  // no dentro de data -- sin este merge, el aviso no bloqueante del
  // backend (ej. email de un familiar omitido por colision) se perdía acá.
  return { ...data, warnings: response?.warnings || [] };
};
