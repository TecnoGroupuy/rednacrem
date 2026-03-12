import { ticketsMock } from '../data/mocks/tickets.js';
import { usersMock } from '../data/mocks/users.js';
import { activitiesMock } from '../data/mocks/activities.js';
import { ticketTypeLabel } from '../utils/labels.js';
import { toEsUyTime } from '../utils/dateFormat.js';
import { delay, maybeThrow } from './fakeApi.js';
import { createOperationFromTicket } from './operationsService.js';
import {
  getPortfolioClientById,
  getActiveContactProduct,
  listActiveContactProducts,
  getContactProductById,
  markContactProductAsBaja,
  keepContactProductAlta
} from './clientsService.js';

const userById = Object.fromEntries(usersMock.map((item) => [item.id, item]));
let ticketsStore = ticketsMock.map((item) => ({
  ...item,
  notas: item.notas || [],
  productoContratoId: item.productoContratoId || '',
  productoId: item.productoId || '',
  estadoRetencion: item.estadoRetencion || (item.tipoSolicitud === 'solicitud_baja' ? 'pendiente' : ''),
  resultadoRetencion: item.resultadoRetencion || '',
  motivoBaja: item.motivoBaja || '',
  asignadoRetencion: item.asignadoRetencion || ''
}));

const DEFAULT_AGENT_ID = 'usr-006';

const SERVICE_STATUS = {
  INICIADO: 'iniciado',
  EN_GESTION: 'en_gestion',
  FINALIZADO: 'finalizado'
};

const RETENTION_RESULT = {
  RETENIDO: 'retenido',
  BAJA_CONFIRMADA: 'baja_confirmada'
};

const toUiTicketId = (ticketId) => Number(String(ticketId || '').replace('tkt-', ''));
const mapTicketStatusToUi = (status) => (status === 'en_gestion' ? 'gestion' : status);
const mapTicketStatusToRaw = (status) => (status === 'gestion' ? 'en_gestion' : status);
const isServiceRequest = (ticket) => ticket.tipoSolicitud === 'solicitud_servicio';
const isCancellationRequest = (ticket) => ticket.tipoSolicitud === 'solicitud_baja';

const serviceStatusBadgeKey = (serviceStatus) => {
  if (serviceStatus === SERVICE_STATUS.EN_GESTION) return 'servicio_en_gestion';
  if (serviceStatus === SERVICE_STATUS.FINALIZADO) return 'servicio_finalizado';
  return 'servicio_iniciado';
};

const normalizeServiceStatus = (ticket) => {
  if (!isServiceRequest(ticket)) return '';
  if (ticket.estadoServicio) return ticket.estadoServicio;
  if (ticket.estado === 'resuelto' || ticket.estado === 'cerrado') return SERVICE_STATUS.FINALIZADO;
  if (ticket.estado === 'en_gestion') return SERVICE_STATUS.EN_GESTION;
  return SERVICE_STATUS.INICIADO;
};

const mapServiceStatusToTicketStatus = (serviceStatus) => {
  if (serviceStatus === SERVICE_STATUS.EN_GESTION) return 'en_gestion';
  if (serviceStatus === SERVICE_STATUS.FINALIZADO) return 'resuelto';
  return 'nuevo';
};

const nextTicketRawId = () => {
  const max = ticketsStore.reduce((acc, ticket) => Math.max(acc, toUiTicketId(ticket.id)), 0);
  return 'tkt-' + String(max + 1);
};

const nextActivityId = () => {
  const max = activitiesMock.reduce((acc, item) => {
    const parsed = Number(String(item.id || '').replace('act-', ''));
    return Number.isFinite(parsed) ? Math.max(acc, parsed) : acc;
  }, 0);
  return 'act-' + String(max + 1).padStart(3, '0');
};

const appendActivity = ({ ticketRawId, tipo, descripcion, usuarioId = DEFAULT_AGENT_ID, createdAt = new Date().toISOString() }) => {
  activitiesMock.unshift({
    id: nextActivityId(),
    entidad: 'ticket',
    entidadId: ticketRawId,
    tipo,
    descripcion,
    usuarioId,
    createdAt
  });
};

const ticketStatusLabel = (status) => {
  const map = {
    nuevo: 'Nuevo',
    en_gestion: 'En gestión',
    derivado: 'Derivado',
    resuelto: 'Resuelto',
    cerrado: 'Cerrado'
  };
  return map[status] || status;
};

const serviceStatusLabel = (status) => {
  const map = {
    iniciado: 'Iniciado',
    en_gestion: 'En gestión',
    finalizado: 'Finalizado'
  };
  return map[status] || status;
};

const toUiTicket = (ticket) => {
  const history = activitiesMock
    .filter((item) => item.entidad === 'ticket' && item.entidadId === ticket.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const timelineFromHistory = history.map((item) => ({ at: toEsUyTime(item.createdAt), event: item.descripcion }));
  const createdByIa = ticket.origen === 'IA' ? 'Ticket creado por IA' : 'Ticket creado manualmente';
  const hasCreatedEvent = timelineFromHistory.some((item) => item.event.toLowerCase().includes('creado'));
  const timeline = hasCreatedEvent
    ? timelineFromHistory
    : [...timelineFromHistory, { at: toEsUyTime(ticket.createdAt), event: createdByIa }];

  const estadoServicio = normalizeServiceStatus(ticket);
  const esSolicitudServicio = isServiceRequest(ticket);
  const esSolicitudBaja = isCancellationRequest(ticket);
  const client = getPortfolioClientById(ticket.clienteId);
  const contractProduct = ticket.productoContratoId ? getContactProductById(ticket.productoContratoId) : null;

  const notas = (ticket.notas || [])
    .slice()
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .map((item) => ({
      autor: item.autor,
      hora: item.hora || toEsUyTime(item.createdAt),
      texto: item.texto
    }));

  return {
    id: toUiTicketId(ticket.id),
    rawId: ticket.id,
    clienteId: ticket.clienteId,
    cliente: client?.nombre || 'Cliente',
    telefono: ticket.telefono || client?.telefono || '',
    tipo: ticketTypeLabel(ticket.tipoSolicitud),
    tipoRaw: ticket.tipoSolicitud,
    tipoOtro: ticket.tipoSolicitudManual || '',
    resumen: ticket.resumenIA,
    estado: mapTicketStatusToUi(ticket.estado),
    estadoBandeja: esSolicitudServicio ? serviceStatusBadgeKey(estadoServicio) : mapTicketStatusToUi(ticket.estado),
    estadoServicio,
    esSolicitudServicio,
    esSolicitudBaja,
    estadoRetencion: ticket.estadoRetencion || '',
    resultadoRetencion: ticket.resultadoRetencion || '',
    motivoBaja: ticket.motivoBaja || '',
    asignadoRetencion: ticket.asignadoRetencion || '',
    productoContratoId: ticket.productoContratoId || '',
    productoId: ticket.productoId || '',
    productoNombre: contractProduct?.productoNombre || client?.productoActualNombre || 'Sin producto',
    productoEstado: contractProduct?.estadoProducto || '',
    productoFechaAlta: contractProduct?.fechaAlta || '',
    productoFechaBaja: contractProduct?.fechaBaja || '',
    hora: toEsUyTime(ticket.createdAt),
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    derivadoA: ticket.derivadoA,
    transcripcion: ticket.transcripcion || '',
    agente: userById[ticket.asignadoA]?.nombre?.split(' ')[0] || 'IA',
    notas,
    timeline
  };
};

const resolveTicketIndex = (id) => ticketsStore.findIndex((item) => toUiTicketId(item.id) === Number(id) || item.id === id);

export const listTickets = () => ticketsStore.map(toUiTicket);

export const listTicketsAsync = async () => {
  await delay(160);
  return listTickets();
};

export const getTicketById = async (id) => {
  await delay(120);
  const idx = resolveTicketIndex(id);
  maybeThrow(idx < 0, 'Ticket no encontrado.');
  return toUiTicket(ticketsStore[idx]);
};

export const createManualTicket = async ({
  clienteId,
  tipoSolicitud,
  tipoSolicitudManual = '',
  resumen,
  canal = 'telefono',
  prioridad = 'media',
  asignadoA = DEFAULT_AGENT_ID,
  origen = 'manual',
  productoContratoId = ''
}) => {
  await delay(160);
  const client = getPortfolioClientById(clienteId);
  maybeThrow(!client, 'Cliente no encontrado.');
  maybeThrow(!tipoSolicitud, 'Tipo de solicitud requerido.');
  maybeThrow(!resumen || !resumen.trim(), 'Resumen requerido.');

  let associatedProduct = null;
  if (tipoSolicitud === 'solicitud_baja') {
    const activeProducts = listActiveContactProducts(clienteId);
    const hasManyActive = activeProducts.length > 1;
    maybeThrow(hasManyActive && !productoContratoId, 'Debes seleccionar el producto para la solicitud de baja.');
    associatedProduct = productoContratoId ? getContactProductById(productoContratoId) : getActiveContactProduct(clienteId);
    maybeThrow(!associatedProduct, 'La solicitud de baja requiere un producto activo del contacto.');
    maybeThrow(associatedProduct.estadoProducto !== 'alta', 'El producto seleccionado no está en alta.');
  } else if (productoContratoId) {
    associatedProduct = getContactProductById(productoContratoId);
  } else {
    associatedProduct = getActiveContactProduct(clienteId);
  }

  const createdAt = new Date().toISOString();
  const rawId = nextTicketRawId();
  const isService = tipoSolicitud === 'solicitud_servicio';
  const isCancellation = tipoSolicitud === 'solicitud_baja';

  const newTicket = {
    id: rawId,
    clienteId,
    telefono: client.telefono,
    tipoSolicitud,
    tipoSolicitudManual: tipoSolicitud === 'otro' ? tipoSolicitudManual : '',
    canal,
    resumenIA: resumen.trim(),
    transcripcion: '',
    estado: 'nuevo',
    estadoServicio: isService ? SERVICE_STATUS.INICIADO : undefined,
    prioridad,
    asignadoA,
    origen,
    derivadoA: null,
    notas: [],
    createdAt,
    updatedAt: createdAt,
    productoContratoId: associatedProduct?.id || '',
    productoId: associatedProduct?.productoId || '',
    estadoRetencion: isCancellation ? 'pendiente' : '',
    resultadoRetencion: '',
    motivoBaja: isCancellation ? resumen.trim() : '',
    asignadoRetencion: isCancellation ? 'Supervisor' : ''
  };

  ticketsStore = [newTicket, ...ticketsStore];
  appendActivity({
    ticketRawId: rawId,
    tipo: 'creacion',
    descripcion: isService
      ? 'Solicitud de servicio iniciada'
      : isCancellation
        ? 'Solicitud de baja creada y asociada a producto'
        : 'Ticket creado manualmente',
    usuarioId: asignadoA,
    createdAt
  });

  return toUiTicket(newTicket);
};

export const updateTicket = async (id, patch) => {
  await delay(140);
  const idx = resolveTicketIndex(id);
  maybeThrow(idx < 0, 'Ticket no encontrado.');

  const current = ticketsStore[idx];
  let nextStatus = current.estado;
  if (patch.estadoServicio && isServiceRequest(current)) {
    nextStatus = mapServiceStatusToTicketStatus(patch.estadoServicio);
  } else if (patch.estado) {
    nextStatus = mapTicketStatusToRaw(patch.estado);
  }

  ticketsStore[idx] = {
    ...current,
    ...patch,
    estado: nextStatus,
    estadoServicio: patch.estadoServicio || current.estadoServicio,
    updatedAt: new Date().toISOString()
  };

  return toUiTicket(ticketsStore[idx]);
};

export const updateRetentionTracking = async (id, patch, { actorId = DEFAULT_AGENT_ID } = {}) => {
  const uiTicket = await updateTicket(id, patch);
  appendActivity({
    ticketRawId: uiTicket.rawId,
    tipo: 'retencion',
    descripcion: 'Seguimiento de retención actualizado',
    usuarioId: actorId
  });
  return getTicketById(uiTicket.rawId);
};

export const updateTicketStatus = async (id, status, { actorId = DEFAULT_AGENT_ID } = {}) => {
  const uiTicket = await updateTicket(id, { estado: status });
  appendActivity({
    ticketRawId: uiTicket.rawId,
    tipo: 'estado',
    descripcion: 'Estado cambiado a ' + ticketStatusLabel(mapTicketStatusToRaw(status)),
    usuarioId: actorId
  });
  return getTicketById(uiTicket.rawId);
};

export const updateServiceRequestStatus = async (id, serviceStatus, { actorId = DEFAULT_AGENT_ID } = {}) => {
  const uiTicket = await updateTicket(id, { estadoServicio: serviceStatus });
  appendActivity({
    ticketRawId: uiTicket.rawId,
    tipo: 'estado_servicio',
    descripcion: 'Estado de servicio cambiado a ' + serviceStatusLabel(serviceStatus),
    usuarioId: actorId
  });
  return getTicketById(uiTicket.rawId);
};

export const addTicketNote = async (id, text, { actorId = DEFAULT_AGENT_ID, authorName = 'Usuario' } = {}) => {
  await delay(120);
  maybeThrow(!text || !text.trim(), 'La nota no puede quedar vacía.');

  const idx = resolveTicketIndex(id);
  maybeThrow(idx < 0, 'Ticket no encontrado.');

  const createdAt = new Date().toISOString();
  const note = {
    autor: authorName,
    texto: text.trim(),
    hora: toEsUyTime(createdAt),
    userId: actorId,
    createdAt
  };

  const current = ticketsStore[idx];
  ticketsStore[idx] = {
    ...current,
    notas: [note, ...(current.notas || [])],
    updatedAt: createdAt
  };

  appendActivity({
    ticketRawId: current.id,
    tipo: 'nota',
    descripcion: 'Nota agregada',
    usuarioId: actorId,
    createdAt
  });

  return toUiTicket(ticketsStore[idx]);
};

export const deriveTicketToOperations = async (id, { actorId = DEFAULT_AGENT_ID } = {}) => {
  const uiTicket = await updateTicket(id, { estado: 'derivado', derivadoA: 'operaciones' });

  appendActivity({
    ticketRawId: uiTicket.rawId,
    tipo: 'derivacion',
    descripcion: 'Derivado a operaciones',
    usuarioId: actorId
  });

  await createOperationFromTicket(uiTicket, { actorId });
  return getTicketById(uiTicket.rawId);
};

export const resolveCancellationTicket = async (
  id,
  { result = RETENTION_RESULT.RETENIDO, comentario = '', actorId = DEFAULT_AGENT_ID, actorName = 'Supervisor' } = {}
) => {
  await delay(120);
  const idx = resolveTicketIndex(id);
  maybeThrow(idx < 0, 'Ticket no encontrado.');
  const ticket = ticketsStore[idx];
  maybeThrow(!isCancellationRequest(ticket), 'El ticket no corresponde a solicitud de baja.');

  const closeAt = new Date().toISOString();
  if (result === RETENTION_RESULT.BAJA_CONFIRMADA) {
    await markContactProductAsBaja(ticket.productoContratoId, {
      fechaBaja: closeAt,
      motivoBaja: ticket.motivoBaja || ticket.resumenIA,
      ticketId: ticket.id
    });
  } else {
    await keepContactProductAlta(ticket.productoContratoId, { ticketId: ticket.id });
  }

  ticketsStore[idx] = {
    ...ticket,
    estado: 'cerrado',
    estadoRetencion: result,
    resultadoRetencion: result,
    updatedAt: closeAt
  };

  if (comentario && comentario.trim()) {
    ticketsStore[idx].notas = [
      {
        autor: actorName,
        texto: comentario.trim(),
        hora: toEsUyTime(closeAt),
        userId: actorId,
        createdAt: closeAt
      },
      ...(ticketsStore[idx].notas || [])
    ];
  }

  appendActivity({
    ticketRawId: ticket.id,
    tipo: 'cierre',
    descripcion: result === RETENTION_RESULT.BAJA_CONFIRMADA
      ? 'Baja confirmada y producto pasado a baja'
      : 'Solicitud de baja retenida, producto permanece en alta',
    usuarioId: actorId,
    createdAt: closeAt
  });

  return toUiTicket(ticketsStore[idx]);
};

export const closeTicketCase = async (id, { actorId = DEFAULT_AGENT_ID, actorName = 'Agente', outcome = '', note = '' } = {}) => {
  const idx = resolveTicketIndex(id);
  maybeThrow(idx < 0, 'Ticket no encontrado.');
  const ticket = ticketsStore[idx];

  if (isServiceRequest(ticket)) {
    const uiTicket = await updateTicket(ticket.id, { estadoServicio: SERVICE_STATUS.FINALIZADO });
    appendActivity({
      ticketRawId: uiTicket.rawId,
      tipo: 'cierre',
      descripcion: 'Solicitud de servicio finalizada',
      usuarioId: actorId
    });
    return getTicketById(uiTicket.rawId);
  }

  if (isCancellationRequest(ticket)) {
    maybeThrow(
      ![RETENTION_RESULT.RETENIDO, RETENTION_RESULT.BAJA_CONFIRMADA].includes(outcome),
      'Debes seleccionar explícitamente el resultado de cierre: retenido o baja_confirmada.'
    );
    const result = outcome;
    const updated = await resolveCancellationTicket(ticket.id, {
      result,
      comentario: note,
      actorId,
      actorName
    });
    return getTicketById(updated.rawId);
  }

  const uiTicket = await updateTicket(ticket.id, { estado: 'cerrado' });
  appendActivity({
    ticketRawId: uiTicket.rawId,
    tipo: 'cierre',
    descripcion: 'Ticket cerrado',
    usuarioId: actorId
  });
  return getTicketById(uiTicket.rawId);
};
