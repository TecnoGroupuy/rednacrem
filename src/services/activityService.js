import { ROLE_META } from '../domain/roles.js';

let activitiesStore = [];
const NOTIFICATIONS_READ_KEY = 'rednacrem_notifications_read_v1';
let notificationsReadStore = {};

const userById = {};

const safeReadStorage = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(NOTIFICATIONS_READ_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const persistReadStorage = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NOTIFICATIONS_READ_KEY, JSON.stringify(notificationsReadStore));
  } catch {
    // no-op
  }
};

notificationsReadStore = safeReadStorage();

const nextActivityId = () => {
  const max = activitiesStore.reduce((acc, item) => {
    const parsed = Number(String(item.id || '').replace('act-', ''));
    return Number.isFinite(parsed) ? Math.max(acc, parsed) : acc;
  }, 0);
  return 'act-' + String(max + 1).padStart(3, '0');
};

const toUiActivity = (item) => {
  const user = userById[item.usuarioId] || null;
  return {
    id: item.id,
    at: new Date(item.createdAt).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }),
    createdAt: item.createdAt,
    tipo: item.tipo,
    detalle: item.descripcion,
    modulo: item.entidad || 'sistema',
    usuario: user?.nombre || 'Sistema',
    rolUsado: ROLE_META[user?.rol]?.label || '-'
  };
};

const toNotificationType = (item) => {
  const tipo = String(item.tipo || '').toLowerCase();
  const entidad = String(item.entidad || '').toLowerCase();
  if (tipo.includes('error') || tipo.includes('rechazo') || tipo.includes('bloqueo')) return 'error';
  if (tipo.includes('cierre') || tipo.includes('complet') || tipo.includes('venta')) return 'success';
  if (tipo.includes('deriv') || tipo.includes('alert') || tipo.includes('observ')) return 'warning';
  if (entidad === 'ticket' || entidad === 'lote' || entidad === 'importacion') return 'info';
  return 'info';
};

const toNotificationTitle = (item) => {
  const entidad = String(item.entidad || 'sistema');
  const tipo = String(item.tipo || 'actualizacion');
  const tipoLabel = tipo.replaceAll('_', ' ');
  return entidad.charAt(0).toUpperCase() + entidad.slice(1) + ' · ' + tipoLabel;
};

const toNotificationLink = (item) => {
  const entidad = String(item.entidad || '').toLowerCase();
  if (entidad === 'ticket') return 'soporte';
  if (entidad === 'lote') return 'lotes';
  if (entidad === 'venta') return 'clientes';
  if (entidad === 'importacion') return 'sa_importaciones';
  if (entidad === 'producto') return 'sa_productos';
  if (entidad === 'usuario') return 'sa_usuarios';
  return 'sa_logs_actividad';
};

const getUserReadMap = (userId = 'anon') => {
  const safeUserId = String(userId || 'anon');
  const existing = notificationsReadStore[safeUserId];
  if (existing && typeof existing === 'object') return existing;
  notificationsReadStore[safeUserId] = {};
  return notificationsReadStore[safeUserId];
};

const toNotification = (item, userId = 'anon') => {
  const readMap = getUserReadMap(userId);
  return {
    id: item.id,
    type: toNotificationType(item),
    title: toNotificationTitle(item),
    description: item.descripcion || 'Actualización del sistema',
    timestamp: item.createdAt,
    read: !!readMap[item.id],
    link: toNotificationLink(item),
    action: 'Ver detalle'
  };
};

export const listRecentActivity = (limit = 12) => activitiesStore
  .slice()
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  .slice(0, limit)
  .map(toUiActivity);

export const listActivityLog = () => activitiesStore
  .slice()
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  .map(toUiActivity);

export const listNotifications = ({ userId = 'anon', limit = 12 } = {}) => activitiesStore
  .slice()
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  .slice(0, limit)
  .map((item) => toNotification(item, userId));

export const markAsRead = ({ userId = 'anon', notificationId }) => {
  if (!notificationId) return false;
  const readMap = getUserReadMap(userId);
  readMap[notificationId] = true;
  persistReadStorage();
  return true;
};

export const markAllAsRead = ({ userId = 'anon', limit = 15 } = {}) => {
  const readMap = getUserReadMap(userId);
  activitiesStore
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .forEach((item) => {
      readMap[item.id] = true;
    });
  persistReadStorage();
  return true;
};

export const getUnreadCount = ({ userId = 'anon', limit = 15 } = {}) =>
  listNotifications({ userId, limit }).filter((item) => !item.read).length;

export const logActivityEvent = (payload) => {
  const now = new Date().toISOString();
  const record = {
    id: nextActivityId(),
    entidad: payload.entidad || 'sistema',
    entidadId: payload.entidadId || '',
    tipo: payload.tipo || 'actualizacion',
    descripcion: payload.descripcion || 'Evento registrado',
    usuarioId: payload.usuarioId || 'usr-001',
    createdAt: now
  };
  activitiesStore = [record, ...activitiesStore];
  return toUiActivity(record);
};



