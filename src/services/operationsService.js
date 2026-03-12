import { operationsMock } from '../data/mocks/operations.js';
import { clientsMock } from '../data/mocks/clients.js';
import { ticketsMock } from '../data/mocks/tickets.js';
import { toEsUyDate } from '../utils/dateFormat.js';
import { delay, maybeThrow } from './fakeApi.js';

const clientById = Object.fromEntries(clientsMock.map((item) => [item.id, item]));
let operationsStore = operationsMock.map((item) => ({ ...item }));

const toUiOperation = (item) => ({
  id: '#SRV-' + item.id.replace('op-', ''),
  client: clientById[item.clienteId]?.nombre || 'Cliente',
  type: item.tipo,
  date: toEsUyDate(item.createdAt),
  provider: item.asignadoA,
  status: item.estado
});

const nextOperationId = () => {
  const max = operationsStore.reduce((acc, item) => {
    const parsed = Number(String(item.id || '').replace('op-', ''));
    return Number.isFinite(parsed) ? Math.max(acc, parsed) : acc;
  }, 0);
  return 'op-' + String(max + 1);
};

const resolveTicketRef = (ticketRef) => {
  if (!ticketRef) return null;
  if (typeof ticketRef === 'string') {
    return ticketsMock.find((item) => item.id === ticketRef) || null;
  }
  return ticketRef;
};

const operationTypeFromTicket = (ticket) => {
  const tipo = ticket?.tipoRaw || ticket?.tipoSolicitud;
  if (tipo === 'solicitud_servicio') return 'Coordinación de servicio';
  if (tipo === 'reclamo') return 'Reclamo operativo';
  return 'Gestión derivada';
};

export const listOperationsRows = () => operationsStore.map(toUiOperation);

export const listOperationsRowsAsync = async () => {
  await delay(140);
  return listOperationsRows();
};

export const createOperationFromTicket = async (ticketRef, { actorId = 'usr-006' } = {}) => {
  await delay(120);
  const ticket = resolveTicketRef(ticketRef);
  maybeThrow(!ticket, 'Ticket de origen no encontrado para derivación.');

  const rawTicketId = ticket.rawId || ticket.id;
  const clienteId = ticket.clienteId;
  const existing = operationsStore.find((item) => item.ticketId === rawTicketId);
  if (existing) return toUiOperation(existing);

  const now = new Date().toISOString();
  const newOperation = {
    id: nextOperationId(),
    ticketId: rawTicketId,
    clienteId,
    tipo: operationTypeFromTicket(ticket),
    estado: 'Abierto',
    asignadoA: actorId === 'usr-006' ? 'Equipo Operaciones' : actorId,
    detalle: 'Creada desde derivación de Atención al cliente',
    createdAt: now,
    updatedAt: now
  };

  operationsStore = [newOperation, ...operationsStore];
  return toUiOperation(newOperation);
};

export const updateOperation = async (id, patch) => {
  await delay(140);
  const rawId = String(id).startsWith('#SRV-') ? 'op-' + String(id).replace('#SRV-', '') : String(id);
  const idx = operationsStore.findIndex((item) => item.id === rawId);
  maybeThrow(idx < 0, 'Operación no encontrada.');
  operationsStore[idx] = { ...operationsStore[idx], ...patch, updatedAt: new Date().toISOString() };
  return toUiOperation(operationsStore[idx]);
};
