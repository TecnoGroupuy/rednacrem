// API client base. Authorization real depende de access_token Cognito.
// Nunca enviar rol/vistaRol como fuente de autorizacion (ej: X-User-Rol).

export function createApiClient({ baseUrl, getAccessToken }) {
  const request = async (path, { method = 'GET', headers = {}, body } = {}) => {
    const token = await getAccessToken();

    const finalHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
  };

  return {
    get: (path, options) => request(path, { ...options, method: 'GET' }),
    post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
    put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
    patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
    del: (path, options) => request(path, { ...options, method: 'DELETE' })
  };
}

// Ejemplo de uso recomendado:
// const api = createApiClient({
//   baseUrl: import.meta.env.VITE_API_URL,
//   getAccessToken: async () => {
//     // TODO(Cognito): usar fetchAuthSession()/getCurrentSession() del SDK.
//     // return session.tokens?.accessToken?.toString() || null;
//     return null;
//   }
// });
