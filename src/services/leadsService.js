import { leadsMock } from '../data/mocks/leads.js';
import { salesManagementMock } from '../data/mocks/salesManagement.js';
import { usersMock } from '../data/mocks/users.js';
import { toEsUyDateTime } from '../utils/dateFormat.js';
import { delay, maybeThrow } from './fakeApi.js';
import { getApiClient } from './apiClient.js';

const userById = Object.fromEntries(usersMock.map((user) => [user.id, user]));
const userIdByName = Object.fromEntries(usersMock.map((user) => [user.nombre, user.id]));
let leadsStore = leadsMock.map((item) => ({ ...item }));
let noCallStore = [];
let phoneResultsStore = [];
const api = getApiClient();
const hasApiConfigured = () => {
  const baseUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_URL : '';
  return Boolean(String(baseUrl || '').trim());
};

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
  if (hasApiConfigured()) {
    const response = await api.get('/leads?segment=mixto');
    const items = response?.items || [];
    return items.map((item) => {
      const fullName = [item.nombre, item.apellido].filter(Boolean).join(' ').trim();
      const status = item.estado_venta || 'nuevo';
      const attempts = Number(item.intentos || 0);
      const estadoOperativo = mapResultadoToOperativeStatus(status, attempts);
      const lastAt = item.last_gestion_at || null;
      const history = item.last_gestion_at
        ? [{
          at: toEsUyDateTime(item.last_gestion_at),
          status: item.last_resultado || status,
          note: item.last_nota || '-',
          by: item.last_by || 'Sistema'
        }]
        : [];
      return {
        id: item.id,
        name: fullName || item.nombre || '',
        phone: item.celular || item.telefono || '',
        city: item.departamento || '',
        documento: item.documento || '',
        email: item.email || '',
        direccion: item.direccion || '',
        source: 'import',
        productId: '',
        assignedTo: item.assigned_to_name || item.vendedor_nombre || '',
        assignedToId: item.assigned_to_id || item.assigned_to || item.vendedor_id || item.seller_id || '',
        loadedAt: (item.created_at || '').slice(0, 10),
        lotId: item.batch_id || '',
        status,
        resultadoGestion: status,
        estadoOperativo,
        bloqueadoNoLlamar: !!item.bloqueado_no_llamar,
        last: lastAt ? toEsUyDateTime(lastAt) : '',
        nextAction: item.proxima_accion ? String(item.proxima_accion).slice(0, 16) : '',
        attempts,
        notes: history.map((h) => h.note),
        history
      };
    });
  }
  await delay(160);
  return listCommercialContacts();
};

export const getCommercialContactById = async (id) => {
  if (hasApiConfigured()) {
    const response = await api.get(`/leads/${id}`);
    const lead = response?.lead || null;
    maybeThrow(!lead, 'Contacto no encontrado.');
    const fullName = [lead.nombre, lead.apellido].filter(Boolean).join(' ').trim();
    const status = lead.estado_venta || 'nuevo';
    const attempts = Number(lead.intentos || 0);
    const estadoOperativo = mapResultadoToOperativeStatus(status, attempts);
    const history = (lead.history || []).map((item) => ({
      at: toEsUyDateTime(item.at),
      status: item.status,
      note: item.note,
      by: item.by || 'Sistema'
    }));
    const lastAt = history[0]?.at || toEsUyDateTime(lead.created_at);
    return {
      id: lead.id,
      name: fullName || lead.nombre || '',
      phone: lead.celular || lead.telefono || '',
      city: lead.departamento || '',
      documento: lead.documento || '',
      email: lead.email || '',
      direccion: lead.direccion || '',
      source: 'import',
      productId: '',
      assignedTo: lead.assigned_to_name || '',
      loadedAt: (lead.created_at || '').slice(0, 10),
      lotId: lead.batch_id || '',
      status,
      resultadoGestion: status,
      estadoOperativo,
      bloqueadoNoLlamar: false,
      last: lastAt || '',
      nextAction: lead.proxima_accion ? String(lead.proxima_accion).slice(0, 16) : '',
      attempts,
      notes: history.map((h) => h.note),
      history
    };
  }
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
  if (hasApiConfigured()) {
    await api.post(`/leads/${contactId}/management`, {
      status: payload.status,
      note: payload.note,
      nextAction: payload.nextAction,
      fecha_agenda: payload.fecha_agenda
    });
    return getCommercialContactById(contactId);
  }
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
  if (hasApiConfigured()) {
    await api.put(`/leads/${contactId}`, {
      nombre: patch.name,
      telefono: patch.phone,
      departamento: patch.city,
      documento: patch.documento,
      email: patch.email,
      direccion: patch.direccion
    });
    return getCommercialContactById(contactId);
  }
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
  if (hasApiConfigured()) {
    await api.post('/lead-batches/assign', {
      contactIds,
      batchId: lotId,
      sellerName
    });
    return listCommercialContactsAsync();
  }
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
  if (hasApiConfigured()) {
    await api.post(`/lead-batches/${lotId}/assign`, { sellerName });
    return listCommercialContactsAsync();
  }
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
  if (hasApiConfigured()) {
    await api.post(`/leads/${contactId}/management`, {
      status: 'seguimiento',
      note: 'Reactivado por Supervisor'
    });
    return getCommercialContactById(contactId);
  }
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

export const listNoCallEntries = async ({ page = 1, pageSize = 20, search = '', fuente = '', departamento = '', localidad = '' } = {}) => {
  if (hasApiConfigured()) {
    const params = new URLSearchParams({
      page: String(page || 1),
      pageSize: String(pageSize || 20),
      search: String(search || ''),
      fuente: String(fuente || ''),
      departamento: String(departamento || ''),
      localidad: String(localidad || '')
    });
    const response = await api.get(`/no-llamar?${params.toString()}`);
    return response;
  }
  await delay(80);
  const normalizedSearch = String(search || '').trim().toLowerCase();
  const normalizedFuente = String(fuente || '').trim().toLowerCase();
  const normalizedDepartamento = String(departamento || '').trim().toLowerCase();
  const normalizedLocalidad = String(localidad || '').trim().toLowerCase();
  const filtered = noCallStore
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((item) => {
      if (!normalizedSearch) return true;
      const values = [
        item.telefono,
        item.documento,
        item.nombre,
        item.motivo,
        item.origen,
        item.estado
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return values.some((value) => value.includes(normalizedSearch));
    })
    .filter((item) => {
      if (normalizedFuente && String(item.origen || item.fuente || '').toLowerCase() !== normalizedFuente) return false;
      if (normalizedDepartamento && !String(item.departamento || item.departamento_residencia || '').toLowerCase().includes(normalizedDepartamento)) return false;
      if (normalizedLocalidad && !String(item.localidad || item.ciudad || '').toLowerCase().includes(normalizedLocalidad)) return false;
      return true;
    })
    .map((item) => ({ ...item }));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);
  return { items, page, pageSize, total, totalPages };
};

export const listDatosParaTrabajar = async ({ page = 1, pageSize = 20, search = '', estado, departamento, origen_dato } = {}) => {
  if (hasApiConfigured()) {
    const params = new URLSearchParams({
      page: String(page || 1),
      pageSize: String(pageSize || 20),
      search: String(search || '')
    });
    if (estado) {
      params.set('estado', String(estado));
    }
    if (departamento) {
      params.set('departamento', String(departamento));
    }
    if (origen_dato) {
      params.set('origen_dato', String(origen_dato));
    }
    const response = await api.get(`/datos-para-trabajar?${params.toString()}`);
    return response;
  }
  await delay(80);
  return { items: [], page, pageSize, total: 0, totalPages: 1 };
};

export const getNoCallStats = async () => {
  if (hasApiConfigured()) {
    const response = await api.get('/no-llamar/stats');
    return response || { total: 0, celulares: 0, montevideo: 0, interior: 0 };
  }
  return { total: 0, celulares: 0, montevideo: 0, interior: 0 };
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

export const listAssignedLeadsAsync = async () => {
  if (hasApiConfigured()) {
    const response = await api.get('/leads/assigned');
    return response?.data || { contactos: [], total: 0 };
  }
  return { contactos: [], total: 0 };
};

export const fetchNextLeadAsync = async () => {
  if (hasApiConfigured()) {
    return await api.get('/leads/next');
  }
  return { data: null, message: 'API no configurada' };
};
