import apiClient, { buildApiUrl, getAccessToken, getApiBaseUrl } from './apiClient.js';

const normalizePath = (path) => {
  const raw = String(path || '').trim();
  if (!raw) return '/me';
  return raw.startsWith('/') ? raw : `/${raw}`;
};

const ME_ENDPOINT = normalizePath(import.meta.env.VITE_AUTH_ME_ENDPOINT || '/me');
const DEV_LOCAL_STORAGE_KEYS = {
  role: 'local_dev_user_role',
  email: 'local_dev_user_email',
  sub: 'local_dev_user_sub',
  name: 'local_dev_user_name',
  orgId: 'local_dev_org_id',
  orgName: 'local_dev_org_name'
};

const ensureApiPrefix = (endpoint, baseUrl) => {
  const base = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (endpoint.startsWith('/api/')) return endpoint;
  if (base.endsWith('/api')) return endpoint;
  return `/api${endpoint}`;
};

function normalizeSessionPayload(payload) {
  if (!payload) return null;

  // caso backend actual
  if (payload.user) {
    return {
      ...payload.user,
      claims: payload.claims || null
    };
  }

  // caso payload plano
  if (payload.id || payload.role) {
    return payload;
  }

  return null;
}

const readDevOverride = (key) => {
  try {
    if (typeof localStorage === 'undefined') return '';
    return String(localStorage.getItem(key) || '').trim();
  } catch {
    return '';
  }
};

function buildLocalDevSession() {
  const role = readDevOverride(DEV_LOCAL_STORAGE_KEYS.role) || import.meta.env?.VITE_LOCAL_DEV_USER_ROLE || 'superadministrador';
  const email = readDevOverride(DEV_LOCAL_STORAGE_KEYS.email) || import.meta.env?.VITE_LOCAL_DEV_USER_EMAIL || 'admin@local.test';
  const sub = readDevOverride(DEV_LOCAL_STORAGE_KEYS.sub) || import.meta.env?.VITE_LOCAL_DEV_USER_SUB || 'dev-local-user';
  const nombre = readDevOverride(DEV_LOCAL_STORAGE_KEYS.name) || 'Dev User';
  const organization_id = readDevOverride(DEV_LOCAL_STORAGE_KEYS.orgId) || '';
  const organization_name = readDevOverride(DEV_LOCAL_STORAGE_KEYS.orgName) || '';

  return {
    id: sub,
    nombre,
    apellido: '',
    email,
    role,
    status: 'approved',
    permissions: [],
    organization_id,
    organization_name,
    claims: {
      email,
      sub,
      'cognito:groups': [role]
    }
  };
}

const isLocalDevToken = (token) => import.meta.env.DEV && (token === 'dev-token' || token === 'dev-id');

export async function getBusinessSession() {
  const token = await getAccessToken();
  if (isLocalDevToken(token)) {
    const session = buildLocalDevSession();
    // La sesión dev es sintética (no pasa por /me), pero `permissions` ahora
    // gatea menú/rutas reales (ver src/navCapabilities.js) -- sin esto,
    // cualquier preset "Entrar como X" quedaría con permissions:[] y un menú
    // vacío. local-server.mjs ya sirve /me con los mismos headers X-Dev-*
    // que apiClient.js adjunta automáticamente para tokens dev, así que lo
    // pedimos como mejor esfuerzo y nos quedamos con [] si el backend local
    // no está levantado (no debe romper el login dev sin backend).
    try {
      const apiBaseUrl = getApiBaseUrl();
      if (apiBaseUrl) {
        const meEndpoint = ensureApiPrefix(ME_ENDPOINT, apiBaseUrl);
        const meUrl = buildApiUrl(meEndpoint, apiBaseUrl);
        const response = await apiClient.get(meUrl);
        const payload = response?.data ?? response;
        const real = normalizeSessionPayload(payload);
        if (real && Array.isArray(real.permissions)) {
          session.permissions = real.permissions;
        }
        // La sesión sintética pone `id: sub` (el cognito sub, un string),
        // no el uuid real de `users.id` -- rompe cualquier código que use
        // authUser.id para filtrar por uuid contra el backend (ej. "mis
        // tickets de Retención" en main.jsx, listMyRetentionTicketsAsync).
        // El id real sí viene en /me.
        if (real?.id) {
          session.id = real.id;
        }
      }
    } catch (err) {
      console.info('[sessionService] no se pudo enriquecer la sesión dev con /me real, permissions queda []', err?.message);
    }
    console.info('[sessionService] using local dev session', {
      role: session.role,
      email: session.email,
      organization_id: session.organization_id || null,
      permissions: session.permissions
    });
    return session;
  }

  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error('VITE_API_URL is required to resolve business session endpoint.');
  }

  const meEndpoint = ensureApiPrefix(ME_ENDPOINT, apiBaseUrl);
  const meUrl = buildApiUrl(meEndpoint, apiBaseUrl);
  // Debug temporal: confirmar URL final de sesion de negocio.
  console.info('[sessionService] GET', meUrl);

  const response = await apiClient.get(meUrl);
  const payload = response?.data ?? response;
  const session = normalizeSessionPayload(payload);

  if (!session) {
    throw new Error('Invalid /me response format');
  }

  return session;
}
