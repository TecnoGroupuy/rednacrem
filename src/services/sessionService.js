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
    console.info('[sessionService] using local dev session', {
      role: session.role,
      email: session.email,
      organization_id: session.organization_id || null
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
