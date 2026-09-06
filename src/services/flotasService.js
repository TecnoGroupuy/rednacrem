import { getApiClient } from './apiClient.js';

// Nombres de columna asumidos desde flotasMockData.js (numero_interno, matricula,
// marca, modelo, anio, categoria, modalidad, es_backup, base_id, altura_cm,
// capacidad_camilla_articulada, estado_operativo, kilometraje, proximo_service_km).
// El backend descubre las columnas de su_vehiculos en runtime vía information_schema,
// así que estos nombres pueden no coincidir exactamente con producción.
// TODO: confirmar nombres de columna reales contra RDS antes de dar el módulo por cerrado.

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

export async function listVehiculos({ baseId, estadoOperativo, categoria } = {}) {
  const query = buildQuery({ base_id: baseId, estado_operativo: estadoOperativo, categoria });
  const response = await api.get(`/operaciones/vehiculos${query}`);
  return response?.items || [];
}

export async function getVehiculoDetail(vehiculoId) {
  const response = await api.get(`/operaciones/vehiculos/${vehiculoId}`);
  return response?.item || null;
}

export async function createVehiculo(payload) {
  const response = await api.post('/operaciones/vehiculos', payload);
  return response?.item || null;
}

export async function updateVehiculo(vehiculoId, payload) {
  const response = await api.patch(`/operaciones/vehiculos/${vehiculoId}`, payload);
  return response?.item || null;
}

export async function deleteVehiculo(vehiculoId) {
  const response = await api.del(`/operaciones/vehiculos/${vehiculoId}`);
  return response?.item || null;
}

export async function listVehiculoDocumentosVencimientos({ days = 30 } = {}) {
  const query = buildQuery({ days });
  const response = await api.get(`/operaciones/vehiculos/documentos/vencimientos${query}`);
  return response?.items || [];
}

export async function addVehiculoDocumento(vehiculoId, payload) {
  const response = await api.post(`/operaciones/vehiculos/${vehiculoId}/documentos`, payload);
  return response?.item || null;
}

export async function updateVehiculoDocumento(vehiculoId, documentoId, payload) {
  const response = await api.patch(`/operaciones/vehiculos/${vehiculoId}/documentos/${documentoId}`, payload);
  return response?.item || null;
}

export async function addVehiculoMantenimiento(vehiculoId, payload) {
  const response = await api.post(`/operaciones/vehiculos/${vehiculoId}/mantenimiento`, payload);
  return response?.item || null;
}

export async function listVehiculoMantenimiento(vehiculoId) {
  const response = await api.get(`/operaciones/vehiculos/${vehiculoId}/mantenimiento`);
  return response?.items || [];
}

export async function addVehiculoChecklist(vehiculoId, payload) {
  const response = await api.post(`/operaciones/vehiculos/${vehiculoId}/checklist`, payload);
  return response?.item || null;
}

export async function listVehiculoChecklist(vehiculoId) {
  const response = await api.get(`/operaciones/vehiculos/${vehiculoId}/checklist`);
  return response?.items || [];
}

// No es un endpoint de vehículos, pero FlotasScreen lo necesita para el selector
// de base (reemplaza el mock FLOTAS_BASES).
export async function listBases() {
  const response = await api.get('/operaciones/bases');
  return response?.items || [];
}
