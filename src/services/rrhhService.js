import { getApiClient } from './apiClient.js';

// Mismo patron que flotasService.js: getApiClient(), sin enviar organization_id
// (lo resuelve el backend via el contexto de sesion/org activa).
//
// Nota sobre rutas confirmadas contra index.mjs (no contra el prompt que las
// pidio): las rutas PATCH de habilitaciones/capacitaciones/carnet-salud SI
// requieren personal_id en el path -- los regex reales son
// /operaciones/personal/:id/habilitaciones/:habId,
// /operaciones/personal/:id/capacitaciones/:capId y
// /operaciones/personal/:id/carnet-salud/:carnetId (operacionesPersonalHabMatch
// / CapMatch / CarnetMatch en index.mjs), no las rutas "planas" sin
// personal_id que se habian asumido antes.

const api = getApiClient();

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

export async function listPersonal({ baseId, estado, rol } = {}) {
  const query = buildQuery({ base_id: baseId, estado, rol });
  const response = await api.get(`/operaciones/personal${query}`);
  return response?.items || [];
}

export async function getPersonalDetail(personalId) {
  const response = await api.get(`/operaciones/personal/${personalId}`);
  return response?.item || null;
}

export async function createPersonal(payload) {
  const response = await api.post('/operaciones/personal', payload);
  return response?.item || null;
}

export async function updatePersonal(personalId, payload) {
  const response = await api.patch(`/operaciones/personal/${personalId}`, payload);
  return response?.item || null;
}

export async function deletePersonal(personalId) {
  // Soft-delete en el backend (estado='baja'), no elimina la fila.
  const response = await api.del(`/operaciones/personal/${personalId}`);
  return response?.item || null;
}

export async function listPersonalVencimientos({ days = 30 } = {}) {
  const query = buildQuery({ days });
  const response = await api.get(`/operaciones/personal/vencimientos${query}`);
  return response?.items || [];
}

export async function addPersonalRole(personalId, payload) {
  const response = await api.post(`/operaciones/personal/${personalId}/roles`, payload);
  return response?.item || null;
}

export async function deletePersonalRole(personalId, roleId) {
  const response = await api.del(`/operaciones/personal/${personalId}/roles/${roleId}`);
  return Boolean(response?.ok);
}

export async function addHabilitacion(personalId, payload) {
  const response = await api.post(`/operaciones/personal/${personalId}/habilitaciones`, payload);
  return response?.item || null;
}

export async function updateHabilitacion(personalId, habilitacionId, payload) {
  const response = await api.patch(`/operaciones/personal/${personalId}/habilitaciones/${habilitacionId}`, payload);
  return response?.item || null;
}

export async function addCapacitacion(personalId, payload) {
  const response = await api.post(`/operaciones/personal/${personalId}/capacitaciones`, payload);
  return response?.item || null;
}

export async function updateCapacitacion(personalId, capacitacionId, payload) {
  const response = await api.patch(`/operaciones/personal/${personalId}/capacitaciones/${capacitacionId}`, payload);
  return response?.item || null;
}

export async function addCarnetSalud(personalId, payload) {
  const response = await api.post(`/operaciones/personal/${personalId}/carnet-salud`, payload);
  return response?.item || null;
}

export async function updateCarnetSalud(personalId, carnetId, payload) {
  const response = await api.patch(`/operaciones/personal/${personalId}/carnet-salud/${carnetId}`, payload);
  return response?.item || null;
}
