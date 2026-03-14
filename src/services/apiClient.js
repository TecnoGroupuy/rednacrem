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

const DEFAULT_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '';
let accessTokenGetter = async () => null;

export function setApiAccessTokenGetter(getter) {
  accessTokenGetter = typeof getter === 'function' ? getter : async () => null;
}

export function createApiClient({ baseUrl, getAccessToken }) {
  const request = async (path, { method = 'GET', headers = {}, body } = {}) => {
    const token = await getAccessToken();
    const hasBody = body !== undefined && body !== null;

    const finalHeaders = {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    };

    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${path}`, {
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

  return {
    get: (path, options) => request(path, { ...options, method: 'GET' }),
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
