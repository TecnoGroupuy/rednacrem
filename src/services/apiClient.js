// API client base. Authorization real depende de access_token Cognito.
// Nunca enviar rol/vistaRol como fuente de autorizacion (ej: X-User-Rol).

export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');
const DEFAULT_BASE_URL = normalizeBaseUrl(
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
);
let accessTokenGetter = async () => null;
const DEV_LOCAL_STORAGE_KEYS = {
  role: 'local_dev_user_role',
  email: 'local_dev_user_email',
  sub: 'local_dev_user_sub'
};

const readDevOverride = (key) => {
  try {
    if (typeof localStorage === 'undefined') return null;
    const value = localStorage.getItem(key);
    return value && String(value).trim() ? value : null;
  } catch {
    return null;
  }
};

const isAbsoluteUrl = (path) => /^https?:\/\//i.test(String(path || ''));
const normalizePath = (path) => {
  const raw = String(path || '').trim();
  if (!raw) return '/';
  if (isAbsoluteUrl(raw)) return raw;
  return raw.startsWith('/') ? raw : `/${raw}`;
};

export function buildApiUrl(path, baseUrl = DEFAULT_BASE_URL) {
  const normalizedPath = normalizePath(path);
  if (isAbsoluteUrl(normalizedPath)) return normalizedPath;
  return `${normalizeBaseUrl(baseUrl)}${normalizedPath}`;
}

export function getApiBaseUrl() {
  return DEFAULT_BASE_URL;
}

export function setApiAccessTokenGetter(getter) {
  accessTokenGetter = typeof getter === 'function' ? getter : async () => null;
}

export function createApiClient({ baseUrl, getAccessToken }) {
  const request = async (path, { method = 'GET', headers = {}, body } = {}) => {
    const finalUrl = buildApiUrl(path, baseUrl);
    const token = await getAccessToken();
    const hasBody = body !== undefined && body !== null;
    const isDevToken = import.meta?.env?.DEV && token === 'dev-token';

    const finalHeaders = {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    };

    if (isDevToken) {
      const devRoleOverride = readDevOverride(DEV_LOCAL_STORAGE_KEYS.role);
      const devEmailOverride = readDevOverride(DEV_LOCAL_STORAGE_KEYS.email);
      const devSubOverride = readDevOverride(DEV_LOCAL_STORAGE_KEYS.sub);
      finalHeaders['X-Dev-Auth'] = 'true';
      finalHeaders['X-Dev-User-Email'] = devEmailOverride || import.meta.env?.VITE_LOCAL_DEV_USER_EMAIL || 'admin@local.test';
      finalHeaders['X-Dev-User-Role'] = devRoleOverride || import.meta.env?.VITE_LOCAL_DEV_USER_ROLE || 'superadministrador';
      const devSub = devSubOverride || import.meta.env?.VITE_LOCAL_DEV_USER_SUB;
      if (devSub) {
        finalHeaders['X-Dev-User-Sub'] = devSub;
      }
    } else if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(finalUrl, {
      method,
      headers: finalHeaders,
      body: hasBody ? JSON.stringify(body) : undefined
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const parsed = response.status === 204
      ? null
      : (isJson ? await response.json().catch(() => null) : await response.text().catch(() => ''));

    if (!response.ok) {
      const message = (parsed && typeof parsed === 'object' && parsed.message)
        ? parsed.message
        : (typeof parsed === 'string' && parsed.trim() ? parsed : `HTTP ${response.status}`);
      throw new ApiError(message, response.status, parsed);
    }

    return parsed;
  };

  const requestBlob = async (path, { method = 'GET', headers = {} } = {}) => {
    const finalUrl = buildApiUrl(path, baseUrl);
    const token = await getAccessToken();
    const isDevToken = import.meta?.env?.DEV && token === 'dev-token';

    const finalHeaders = { ...headers };
    if (isDevToken) {
      const devRoleOverride = readDevOverride(DEV_LOCAL_STORAGE_KEYS.role);
      const devEmailOverride = readDevOverride(DEV_LOCAL_STORAGE_KEYS.email);
      const devSubOverride = readDevOverride(DEV_LOCAL_STORAGE_KEYS.sub);
      finalHeaders['X-Dev-Auth'] = 'true';
      finalHeaders['X-Dev-User-Email'] = devEmailOverride || import.meta.env?.VITE_LOCAL_DEV_USER_EMAIL || 'admin@local.test';
      finalHeaders['X-Dev-User-Role'] = devRoleOverride || import.meta.env?.VITE_LOCAL_DEV_USER_ROLE || 'superadministrador';
      const devSub = devSubOverride || import.meta.env?.VITE_LOCAL_DEV_USER_SUB;
      if (devSub) {
        finalHeaders['X-Dev-User-Sub'] = devSub;
      }
    } else if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(finalUrl, {
      method,
      headers: finalHeaders
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const parsed = response.status === 204
        ? null
        : (isJson ? await response.json().catch(() => null) : await response.text().catch(() => ''));
      const message = (parsed && typeof parsed === 'object' && parsed.message)
        ? parsed.message
        : (typeof parsed === 'string' && parsed.trim() ? parsed : `HTTP ${response.status}`);
      throw new ApiError(message, response.status, parsed);
    }

    const buffer = await response.arrayBuffer();
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const contentDisposition = response.headers.get('content-disposition') || '';
    const filenameMatch = /filename\\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i.exec(contentDisposition);
    const filename = filenameMatch ? decodeURIComponent(filenameMatch[1] || filenameMatch[2] || '') : '';
    return { blob, filename, headers: response.headers };
  };

  return {
    get: (path, options) => request(path, { ...options, method: 'GET' }),
    getBlob: (path, options) => requestBlob(path, { ...options, method: 'GET' }),
    post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
    put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
    patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
    del: (path, options) => request(path, { ...options, method: 'DELETE' })
  };
}

const sharedApiClient = createApiClient({
  baseUrl: DEFAULT_BASE_URL,
  getAccessToken: async () => accessTokenGetter()
});

export function getApiClient() {
  return sharedApiClient;
}

export default sharedApiClient;
