import { leadsMock } from '../data/mocks/leads.js';
import { salesManagementMock } from '../data/mocks/salesManagement.js';
import { usersMock } from '../data/mocks/users.js';
import { toEsUyDateTime } from '../utils/dateFormat.js';
import { delay, maybeThrow } from './fakeApi.js';

const userById = Object.fromEntries(usersMock.map((user) => [user.id, user]));
const userIdByName = Object.fromEntries(usersMock.map((user) => [user.nombre, user.id]));
let leadsStore = leadsMock.map((item) => ({ ...item }));
let noCallStore = [];
let phoneResultsStore = [];

export const MAX_NO_CONTESTA_ATTEMPTS = 3;

export const OPERATIVE_STATUS = {
  NUEVO: 'nuevo',
  PENDIENTE_SEGUIMIENTO: 'pendiente_seguimiento',
  PENDIENTE_RELLAMADA: 'pendiente_rellamada',
  PENDIENTE_REINTENTO: 'pendiente_reintento',
  FINALIZADO_VENTA: 'finalizado_venta',
  FINALIZADO_RECHAZO: 'finalizado_rechazo',
  FINALIZADO_DATO_ERRONEO: 'finalizado_dato_erroneo',
  FINALIZADO_NO_CONTACTADO: 'finalizado_no_contactado'
};

const ACTIVE_OPERATIVE_SET = new Set([
  OPERATIVE_STATUS.NUEVO,
  OPERATIVE_STATUS.PENDIENTE_SEGUIMIENTO,
  OPERATIVE_STATUS.PENDIENTE_RELLAMADA,
  OPERATIVE_STATUS.PENDIENTE_REINTENTO
]);

const RESULT_TO_STATUS = {
  no_contesta: 'no_contesta',
  rechazo: 'rechazo',
  dato_erroneo: 'dato_erroneo',
  venta_previa: 'venta',
  venta: 'venta',
  seguimiento: 'seguimiento',
  rellamar: 'rellamar'
};

const toUiLotId = (lotId) => lotId.replace('lot-', 'LT-').toUpperCase();
const toUiLeadId = (leadId) => Number(leadId.replace('lead-', ''));
const toRawLotId = (lotId) => {
  if (!lotId) return '';
  const normalized = String(lotId).trim();
  if (normalized.startsWith('lot-')) return normalized.toLowerCase();
  if (normalized.toUpperCase().startsWith('LT-')) return 'lot-' + normalized.slice(3).toLowerCase();
  return normalized;
};

const normalizePhone = (value) => String(value || '').replace(/\D/g, '');
const normalizeDoc = (value) => String(value || '').replace(/\D/g, '');
const isBlockedByPhone = (phone) => {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  return noCallStore.some((item) => normalizePhone(item.telefono) === normalized);
};

const getLeadIndexByUiId = (id) => leadsStore.findIndex((item) => toUiLeadId(item.id) === Number(id));

const nextManagementId = () => {
  const max = salesManagementMock.reduce((acc, item) => {
    const parsed = Number(String(item.id || '').replace('mgt-', ''));
    return Number.isFinite(parsed) ? Math.max(acc, parsed) : acc;
  }, 0);
  return 'mgt-' + String(max + 1).padStart(3, '0');
};

const resolveUserId = (sellerName, fallback = 'usr-004') => userIdByName[sellerName] || fallback;

export const mapResultadoToOperativeStatus = (resultadoGestion, attempts = 0) => {
  switch (resultadoGestion) {
    case 'venta':
      return OPERATIVE_STATUS.FINALIZADO_VENTA;
    case 'rechazo':
      return OPERATIVE_STATUS.FINALIZADO_RECHAZO;
    case 'dato_erroneo':
      return OPERATIVE_STATUS.FINALIZADO_DATO_ERRONEO;
    case 'seguimiento':
      return OPERATIVE_STATUS.PENDIENTE_SEGUIMIENTO;
    case 'rellamar':
      return OPERATIVE_STATUS.PENDIENTE_RELLAMADA;
    case 'no_contesta':
      return attempts >= MAX_NO_CONTESTA_ATTEMPTS
        ? OPERATIVE_STATUS.FINALIZADO_NO_CONTACTADO
        : OPERATIVE_STATUS.PENDIENTE_REINTENTO;
    default:
      return OPERATIVE_STATUS.NUEVO;
  }
};

export const isContactBlockedForNoCall = (contact) => isBlockedByPhone(contact.phone || contact.telefono);

export const isCommercialContactActive = (contact) =>
  ACTIVE_OPERATIVE_SET.has(contact.estadoOperativo) && !isContactBlockedForNoCall(contact);

export const isCommercialContactFinalized = (contact) => !isCommercialContactActive(contact);

export const shouldAppearInSalesAgenda = (contact) =>
  !isContactBlockedForNoCall(contact)
  && [OPERATIVE_STATUS.PENDIENTE_SEGUIMIENTO, OPERATIVE_STATUS.PENDIENTE_RELLAMADA].includes(contact.estadoOperativo)
  && !!contact.nextAction;

export const shouldAppearInSalesClients = (contact) =>
  !isContactBlockedForNoCall(contact)
  && contact.estadoOperativo === OPERATIVE_STATUS.FINALIZADO_VENTA;

export const isErrorNumberContact = (contact) =>
  contact.estadoOperativo === OPERATIVE_STATUS.FINALIZADO_DATO_ERRONEO;

export const isLotFinalizableFromContacts = (contacts) => contacts.every((contact) => isCommercialContactFinalized(contact));

export const applySalesManagementToContact = (contact, payload) => {
  const resultadoGestion = payload.status;
  const attempts = resultadoGestion === 'no_contesta' ? contact.attempts + 1 : contact.attempts;
  const estadoOperativo = mapResultadoToOperativeStatus(resultadoGestion, attempts);
  const nextAction = ['seguimiento', 'rellamar'].includes(resultadoGestion) ? (payload.nextAction || '') : '';

  return {
    ...contact,
    status: resultadoGestion,
    resultadoGestion,
    estadoOperativo,
    attempts,
    nextAction
  };
};

const toUiLead = (lead) => {
  const relatedHistory = salesManagementMock
    .filter((item) => item.contactoId === lead.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const lastHistory = relatedHistory[0];
  const resultadoGestion = lead.estadoVenta || 'nuevo';
  const estadoOperativo = mapResultadoToOperativeStatus(resultadoGestion, lead.intentos || 0);
  const blocked = isBlockedByPhone(lead.telefono);

  return {
    id: toUiLeadId(lead.id),
    name: lead.nombre,
    phone: lead.telefono,
    city: lead.ubicacion,
    documento: lead.documento || '',
    email: lead.email || '',
    direccion: lead.direccion || '',
    source: lead.fuente,
    productId: lead.productoInteresId || '',
    assignedTo: userById[lead.asignadoA]?.nombre || '',
    loadedAt: lead.createdAt.slice(0, 10),
    lotId: toUiLotId(lead.loteId),
    status: resultadoGestion,
    resultadoGestion,
    estadoOperativo,
    bloqueadoNoLlamar: blocked,
    last: lastHistory ? toEsUyDateTime(lastHistory.fechaGestion) : toEsUyDateTime(lead.createdAt),
    nextAction: lead.proximaAccion ? lead.proximaAccion.slice(0, 16) : '',
    attempts: lead.intentos,
    notes: relatedHistory.map((item) => item.nota),
    history: relatedHistory.map((item) => ({
      at: toEsUyDateTime(item.fechaGestion),
      status: item.resultado,
      note: item.nota,
      by: userById[item.usuarioId]?.nombre || 'Sistema'
    }))
  };
};

export const listCommercialContacts = () => leadsStore.map(toUiLead);

export const listCommercialContactsAsync = async () => {
  await delay(160);
  return listCommercialContacts();
};

export const getCommercialContactById = async (id) => {
  await delay(120);
  const rawId = String(id).startsWith('lead-') ? String(id) : 'lead-' + String(id);
  const found = leadsStore.find((item) => item.id === rawId || toUiLeadId(item.id) === Number(id));
  maybeThrow(!found, 'Contacto no encontrado.');
  return toUiLead(found);
};

export const updateCommercialContact = async (id, patch) => {
  await delay(140);
  const idx = getLeadIndexByUiId(id);
  maybeThrow(idx < 0, 'Contacto no encontrado.');
  leadsStore[idx] = { ...leadsStore[idx], ...patch };
  return toUiLead(leadsStore[idx]);
};

export const registerCommercialManagement = async (contactId, payload, { sellerName = 'Laura Techera' } = {}) => {
  await delay(130);
  const idx = getLeadIndexByUiId(contactId);
  maybeThrow(idx < 0, 'Contacto no encontrado.');

  const current = leadsStore[idx];
  const resultadoGestion = payload.status;
  const nextAttempts = resultadoGestion === 'no_contesta' ? (current.intentos || 0) + 1 : (current.intentos || 0);
  const nextAction = ['seguimiento', 'rellamar'].includes(resultadoGestion) ? (payload.nextAction || null) : null;
  leadsStore[idx] = {
    ...current,
    estadoVenta: resultadoGestion,
    intentos: nextAttempts,
    proximaAccion: nextAction
  };

  const now = new Date().toISOString();
  salesManagementMock.unshift({
    id: nextManagementId(),
    contactoId: current.id,
    usuarioId: resolveUserId(sellerName),
    resultado: resultadoGestion,
    nota: payload.note || '-',
    fechaGestion: now,
    proximaAccion: nextAction,
    createdAt: now
  });

  return toUiLead(leadsStore[idx]);
};

export const updateCommercialContactProfile = async (contactId, patch) => {
  await delay(120);
  const idx = getLeadIndexByUiId(contactId);
  maybeThrow(idx < 0, 'Contacto no encontrado.');
  const current = leadsStore[idx];
  leadsStore[idx] = {
    ...current,
    nombre: patch.name ?? current.nombre,
    telefono: patch.phone ?? current.telefono,
    ubicacion: patch.city ?? current.ubicacion,
    documento: patch.documento ?? current.documento,
    email: patch.email ?? current.email,
    direccion: patch.direccion ?? current.direccion
  };
  return toUiLead(leadsStore[idx]);
};

export const bulkAssignCommercialContacts = async (contactIds, { lotId = '', sellerName = '' } = {}) => {
  await delay(150);
  const idSet = new Set((contactIds || []).map((item) => Number(item)));
  const rawLotId = toRawLotId(lotId);
  const sellerId = sellerName ? resolveUserId(sellerName, '') : '';

  leadsStore = leadsStore.map((lead) => {
    if (!idSet.has(toUiLeadId(lead.id))) return lead;
    if (isBlockedByPhone(lead.telefono)) return lead;
    return {
      ...lead,
      loteId: rawLotId || lead.loteId,
      asignadoA: sellerId || lead.asignadoA
    };
  });

  return listCommercialContacts();
};

export const assignSellerByLot = async (lotId, sellerName) => {
  await delay(130);
  const rawLotId = toRawLotId(lotId);
  const sellerId = resolveUserId(sellerName, '');
  maybeThrow(!rawLotId || !sellerId, 'Datos de asignación inválidos.');

  leadsStore = leadsStore.map((lead) => {
    if (lead.loteId !== rawLotId) return lead;
    if (isBlockedByPhone(lead.telefono)) return lead;
    return { ...lead, asignadoA: sellerId };
  });

  return listCommercialContacts();
};

export const reactivateErrorContact = async (contactId, { sellerName = 'Supervisor' } = {}) => {
  await delay(130);
  const idx = getLeadIndexByUiId(contactId);
  maybeThrow(idx < 0, 'Contacto no encontrado.');
  const current = leadsStore[idx];
  leadsStore[idx] = {
    ...current,
    estadoVenta: 'seguimiento',
    proximaAccion: null
  };

  const now = new Date().toISOString();
  salesManagementMock.unshift({
    id: nextManagementId(),
    contactoId: current.id,
    usuarioId: resolveUserId(sellerName, 'usr-003'),
    resultado: 'seguimiento',
    nota: 'Reactivado por Supervisor',
    fechaGestion: now,
    proximaAccion: null,
    createdAt: now
  });

  return toUiLead(leadsStore[idx]);
};

export const listNoCallEntries = async () => {
  await delay(80);
  return noCallStore
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((item) => ({ ...item }));
};

export const importNoCallEntries = async (entries, { source = 'CSV', userId = 'usr-001' } = {}) => {
  await delay(120);
  const createdAt = new Date().toISOString();
  const added = [];

  entries.forEach((entry, idx) => {
    const phone = String(entry.telefono || '').trim();
    if (!phone) return;

    const normalizedPhone = normalizePhone(phone);
    const existing = noCallStore.find((item) => normalizePhone(item.telefono) === normalizedPhone);
    const nextItem = {
      id: existing?.id || ('dncall-' + String(Date.now() + idx).slice(-8)),
      telefono: phone,
      documento: String(entry.documento || '').trim(),
      nombre: String(entry.nombre || '').trim(),
      motivo: String(entry.motivo || 'Bloqueo preventivo').trim(),
      origen: String(entry.origen || source).trim() || source,
      estado: 'Bloqueado',
      createdAt,
      usuarioId
    };

    if (existing) {
      noCallStore = noCallStore.map((item) => item.id === existing.id ? nextItem : item);
      added.push(nextItem);
    } else {
      noCallStore.unshift(nextItem);
      added.push(nextItem);
    }
  });

  return added;
};

export const listPhoneResultEntries = async () => {
  await delay(80);
  return phoneResultsStore
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((item) => ({ ...item }));
};

export const importPhoneResultsEntries = async (entries, { source = 'CSV', userId = 'usr-001' } = {}) => {
  await delay(160);
  const createdAt = new Date().toISOString();
  const results = [];

  entries.forEach((entry, idx) => {
    const normalizedPhone = normalizePhone(entry.telefono);
    const normalizedDoc = normalizeDoc(entry.documento);
    const resultRaw = String(entry.resultado || 'seguimiento').trim().toLowerCase();
    const status = RESULT_TO_STATUS[resultRaw] || 'seguimiento';

    const leadIndex = leadsStore.findIndex((lead) => {
      const byPhone = normalizedPhone && normalizePhone(lead.telefono) === normalizedPhone;
      const byDoc = normalizedDoc && normalizeDoc(lead.documento) === normalizedDoc;
      return byPhone || byDoc;
    });

    let matchedLeadId = '';
    if (leadIndex >= 0) {
      const current = leadsStore[leadIndex];
      matchedLeadId = current.id;
      const nextAttempts = status === 'no_contesta' ? (current.intentos || 0) + 1 : (current.intentos || 0);
      const nextAction = ['seguimiento', 'rellamar'].includes(status) ? (entry.seguimiento || current.proximaAccion || null) : null;

      leadsStore[leadIndex] = {
        ...current,
        estadoVenta: status,
        intentos: nextAttempts,
        proximaAccion: nextAction
      };

      salesManagementMock.unshift({
        id: nextManagementId(),
        contactoId: current.id,
        usuarioId,
        resultado: status,
        nota: String(entry.observacion || 'Resultado previo importado').trim(),
        fechaGestion: entry.fecha ? new Date(entry.fecha).toISOString() : createdAt,
        proximaAccion: nextAction,
        createdAt
      });
    }

    results.push({
      id: 'rs-' + String(Date.now() + idx).slice(-8),
      telefono: String(entry.telefono || '').trim(),
      documento: String(entry.documento || '').trim(),
      nombre: String(entry.nombre || '').trim(),
      resultado: status,
      observacion: String(entry.observacion || '').trim(),
      origen: String(entry.origen || source).trim() || source,
      leadId: matchedLeadId,
      createdAt,
      usuarioId
    });
  });

  phoneResultsStore = [...results, ...phoneResultsStore];
  return results;
};

