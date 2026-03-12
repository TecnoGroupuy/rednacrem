import { listCommercialContacts } from './leadsService.js';
import {
  listTickets,
  updateRetentionTracking,
  resolveCancellationTicket
} from './ticketsService.js';
import {
  listRecoverableProducts,
  getPortfolioClientById
} from './clientsService.js';
import { listProducts } from './productsService.js';
import { delay, maybeThrow } from './fakeApi.js';

export const CONTRACTING_FLOWS = {
  ALTAS: 'altas',
  RETENCIONES: 'retenciones',
  RECUPERO: 'recupero'
};

export const CONTRACTING_STATUS = {
  altas: ['pendiente', 'en_proceso', 'completada', 'observada'],
  retenciones: ['pendiente', 'contactado', 'retenido', 'baja_confirmada', 'no_localizado'],
  recupero: ['pendiente', 'contactado', 'interesado', 'recuperado', 'no_recuperado']
};

const productById = Object.fromEntries(listProducts().map((item) => [item.id, item.nombre]));

let altasTracking = {};
let recoveroTracking = {};

const toDate = (value) => String(value || '').slice(0, 10);

const ensureAltasTracking = (contactId, defaults) => {
  if (!altasTracking[contactId]) altasTracking[contactId] = defaults;
  return altasTracking[contactId];
};

const ensureRecoveroTracking = (productContractId, defaults) => {
  if (!recoveroTracking[productContractId]) recoveroTracking[productContractId] = defaults;
  return recoveroTracking[productContractId];
};

const buildAltasRows = () => listCommercialContacts()
  .filter((contact) => contact.estadoOperativo === 'finalizado_venta')
  .sort((a, b) => String(b.last || '').localeCompare(String(a.last || '')))
  .map((contact) => {
    const tracking = ensureAltasTracking(String(contact.id), {
      estado: 'pendiente',
      asignado: 'Supervisor'
    });
    return {
      id: 'alt-' + contact.id,
      sourceRef: 'lead:' + contact.id,
      cliente: contact.name,
      producto: productById[contact.productId] || contact.productId || 'Producto por definir',
      fecha: toDate(contact.last || contact.loadedAt),
      vendedorOrigen: contact.assignedTo || 'Vendedor',
      estado: tracking.estado,
      asignado: tracking.asignado
    };
  });

const buildRetencionesRows = () => listTickets()
  .filter((ticket) =>
    ticket.tipoRaw === 'solicitud_baja'
    && !['cerrado', 'resuelto'].includes(ticket.estado)
    && ticket.productoEstado === 'alta'
  )
  .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  .map((ticket) => ({
    id: 'ret-' + ticket.id,
    ticketId: ticket.id,
    sourceRef: 'ticket:' + ticket.id,
    cliente: ticket.cliente,
    producto: ticket.productoNombre || 'Producto',
    fechaAltaProducto: toDate(ticket.productoFechaAlta),
    motivo: ticket.motivoBaja || ticket.resumen,
    fechaSolicitud: toDate(ticket.createdAt),
    asignado: ticket.asignadoRetencion || 'Supervisor',
    estadoTicket: ticket.estado,
    estado: ticket.estadoRetencion || 'pendiente',
    resultadoRetencion: ticket.resultadoRetencion || '-'
  }));

const buildRecuperoRows = () => listRecoverableProducts()
  .sort((a, b) => String(a.fechaBaja || '').localeCompare(String(b.fechaBaja || '')))
  .map((productItem) => {
    const client = getPortfolioClientById(productItem.clientId);
    const tracking = ensureRecoveroTracking(productItem.id, {
      estado: 'pendiente',
      campana: 'Recupero cartera',
      observacion: '',
      asignado: 'Equipo comercial'
    });
    return {
      id: 'rec-' + productItem.id,
      productContractId: productItem.id,
      sourceRef: 'product:' + productItem.id,
      cliente: client?.nombre || 'Cliente',
      fechaBaja: toDate(productItem.fechaBaja),
      motivo: productItem.motivoBaja || 'Sin motivo',
      productoAnterior: productItem.productoNombre,
      ultimoTicketId: productItem.ultimoTicketId || '-',
      campana: tracking.campana,
      observacion: tracking.observacion,
      asignado: tracking.asignado,
      estado: tracking.estado
    };
  });

export const listContractingCases = () => ({
  altas: buildAltasRows(),
  retenciones: buildRetencionesRows(),
  recupero: buildRecuperoRows()
});

export const listContractingCasesAsync = async () => {
  await delay(120);
  return listContractingCases();
};

export const updateContractingCase = async (flow, id, patch) => {
  await delay(120);
  maybeThrow(!CONTRACTING_STATUS[flow], 'Flujo de contrataciones inválido.');

  if (flow === CONTRACTING_FLOWS.ALTAS) {
    const key = String(id || '').replace('alt-', '');
    altasTracking[key] = {
      ...(altasTracking[key] || {}),
      ...patch
    };
    maybeThrow(!CONTRACTING_STATUS.altas.includes(altasTracking[key].estado), 'Estado no permitido para Altas.');
    return { ...altasTracking[key] };
  }

  if (flow === CONTRACTING_FLOWS.RETENCIONES) {
    const ticketId = Number(String(id || '').replace('ret-', ''));
    const status = patch.estado;
    const isClosingResult = ['retenido', 'baja_confirmada'].includes(status);

    if (isClosingResult) {
      await resolveCancellationTicket(ticketId, {
        result: status,
        comentario: patch.comentario || '',
        actorId: 'usr-003',
        actorName: 'Supervisor'
      });
      return { estado: status };
    }

    await updateRetentionTracking(ticketId, {
      estadoRetencion: status,
      asignadoRetencion: patch.asignado || 'Supervisor'
    }, { actorId: 'usr-003' });
    return { estado: status, asignado: patch.asignado || 'Supervisor' };
  }

  const productContractId = String(id || '').replace('rec-', '');
  recoveroTracking[productContractId] = {
    ...(recoveroTracking[productContractId] || {}),
    ...patch
  };
  maybeThrow(!CONTRACTING_STATUS.recupero.includes(recoveroTracking[productContractId].estado), 'Estado no permitido para Recupero.');
  return { ...recoveroTracking[productContractId] };
};

export const getContractingMetrics = () => {
  const { altas, retenciones, recupero } = listContractingCases();
  return {
    altas: {
      pendientes: altas.filter((item) => item.estado === 'pendiente' || item.estado === 'en_proceso').length,
      completadas: altas.filter((item) => item.estado === 'completada').length
    },
    retenciones: {
      abiertas: retenciones.filter((item) => ['pendiente', 'contactado'].includes(item.estado)).length,
      retenidos: listTickets().filter((ticket) => ticket.tipoRaw === 'solicitud_baja' && ticket.resultadoRetencion === 'retenido').length,
      bajasConfirmadas: listTickets().filter((ticket) => ticket.tipoRaw === 'solicitud_baja' && ticket.resultadoRetencion === 'baja_confirmada').length
    },
    recupero: {
      recuperados: recupero.filter((item) => item.estado === 'recuperado').length,
      noRecuperados: recupero.filter((item) => item.estado === 'no_recuperado').length
    }
  };
};

