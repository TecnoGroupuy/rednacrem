import { lotsMock } from '../data/mocks/lots.js';
import { usersMock } from '../data/mocks/users.js';
import { delay, maybeThrow } from './fakeApi.js';
import { getApiClient } from './apiClient.js';

const userById = Object.fromEntries(usersMock.map((u) => [u.id, u]));
let lotsStore = lotsMock.map((item) => ({ ...item }));
const api = getApiClient();
const hasApiConfigured = () => {
  const baseUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_URL : '';
  return Boolean(String(baseUrl || '').trim());
};

const toUiLot = (lot) => ({
  id: lot.id.replace('lot-', 'LT-').toUpperCase(),
  name: lot.nombre,
  seller: lot.asignadoA ? (userById[lot.asignadoA]?.nombre || '') : '',
  createdAt: lot.createdAt.slice(0, 10),
  status: lot.estado
});

export const listLots = () => lotsStore.map(toUiLot);

export const listLotsAsync = async () => {
  if (hasApiConfigured()) {
    const response = await api.get('/lead-batches');
    return (response?.items || []).map((item) => ({
      id: String(item.id || ''),
      name: item.nombre,
      seller: item.assigned_to_name || (item.vendedores?.[0] ? `${item.vendedores[0].nombre || ''} ${item.vendedores[0].apellido || ''}`.trim() : ''),
      vendedores: item.vendedores || [],
      count: item.cantidad_contactos || 0,
      createdAt: (item.created_at || '').slice(0, 10),
      status: item.estado || 'sin_asignar'
    }));
  }
  await delay(140);
  return listLots();
};

export const createLot = async ({ nombre, asignadoA = '', estado = 'sin_asignar' }) => {
  if (hasApiConfigured()) {
    maybeThrow(!nombre, 'El nombre del lote es obligatorio.');
    const response = await api.post('/lead-batches', { nombre, estado, asignadoA });
    const item = response?.item || {};
    return {
      id: String(item.id || ''),
      name: item.nombre,
      seller: '',
      createdAt: (item.created_at || '').slice(0, 10),
      status: item.estado || estado
    };
  }
  await delay(170);
  maybeThrow(!nombre, 'El nombre del lote es obligatorio.');
  const id = 'lot-' + String(Date.now()).slice(-6);
  const now = new Date().toISOString();
  const lot = {
    id,
    nombre,
    descripcion: '',
    estado,
    asignadoA,
    cantidadContactos: 0,
    createdBy: 'usr-003',
    createdAt: now
  };
  lotsStore = [lot, ...lotsStore];
  return toUiLot(lot);
};

export const updateLot = async (lotId, patch) => {
  if (hasApiConfigured()) {
    await api.put(`/lead-batches/${lotId}`, patch);
    return { id: lotId, name: patch.nombre, status: patch.estado };
  }
  await delay(150);
  const rawId = String(lotId).toLowerCase().startsWith('lt-') ? 'lot-' + String(lotId).slice(3).toLowerCase() : String(lotId);
  const idx = lotsStore.findIndex((item) => item.id === rawId);
  maybeThrow(idx < 0, 'Lote no encontrado.');
  lotsStore[idx] = { ...lotsStore[idx], ...patch };
  return toUiLot(lotsStore[idx]);
};
