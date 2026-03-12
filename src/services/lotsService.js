import { lotsMock } from '../data/mocks/lots.js';
import { usersMock } from '../data/mocks/users.js';
import { delay, maybeThrow } from './fakeApi.js';

const userById = Object.fromEntries(usersMock.map((u) => [u.id, u]));
let lotsStore = lotsMock.map((item) => ({ ...item }));

const toUiLot = (lot) => ({
  id: lot.id.replace('lot-', 'LT-').toUpperCase(),
  name: lot.nombre,
  seller: lot.asignadoA ? (userById[lot.asignadoA]?.nombre || '') : '',
  createdAt: lot.createdAt.slice(0, 10),
  status: lot.estado
});

export const listLots = () => lotsStore.map(toUiLot);

export const listLotsAsync = async () => {
  await delay(140);
  return listLots();
};

export const createLot = async ({ nombre, asignadoA = '', estado = 'sin_asignar' }) => {
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
  await delay(150);
  const rawId = String(lotId).toLowerCase().startsWith('lt-') ? 'lot-' + String(lotId).slice(3).toLowerCase() : String(lotId);
  const idx = lotsStore.findIndex((item) => item.id === rawId);
  maybeThrow(idx < 0, 'Lote no encontrado.');
  lotsStore[idx] = { ...lotsStore[idx], ...patch };
  return toUiLot(lotsStore[idx]);
};
