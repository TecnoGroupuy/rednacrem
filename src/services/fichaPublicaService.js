import { buildApiUrl } from './apiClient.js';

// Servicio aparte del apiClient autenticado a proposito: la ficha publica de
// autocompletado (/publico/ficha-personal/*) no pasa por Cognito ni por
// organization_id del usuario logueado -- no hay usuario logueado, el unico
// contexto de la request es el token de link (en el body de /verificar) o
// el session_token (header X-Ficha-Session) que devuelve /verificar.
// Reutiliza buildApiUrl() para resolver la misma base URL (VITE_API_URL +
// prefijo /api si corresponde) que ya usa el resto de la app.

export class FichaPublicaError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'FichaPublicaError';
    this.status = status;
  }
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function assertOk(response, fallbackMessage) {
  const data = await parseJsonSafe(response);
  if (!response.ok || !data?.ok) {
    throw new FichaPublicaError(data?.message || fallbackMessage, response.status);
  }
  return data;
}

// { token, documento, fechaNacimiento } -> { ok, persona, session_token, expires_at }
export async function verificarFicha({ token, documento, fechaNacimiento }) {
  const response = await fetch(buildApiUrl('/publico/ficha-personal/verificar'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, documento, fecha_nacimiento: fechaNacimiento })
  });
  return assertOk(response, 'No se pudo verificar la ficha.');
}

// updates: { telefono?, email?, domicilio?, fecha_nacimiento? } -> { ok, persona }
export async function actualizarFichaPublica(sessionToken, updates) {
  const response = await fetch(buildApiUrl('/publico/ficha-personal'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Ficha-Session': sessionToken },
    body: JSON.stringify(updates)
  });
  return assertOk(response, 'No se pudieron guardar los cambios.');
}

// blob: JPEG ya recortado/redimensionado (ver PersonFotoCapture) -> { ok, foto_url, persona }
export async function subirFotoFichaPublica(sessionToken, blob) {
  const response = await fetch(buildApiUrl('/publico/ficha-personal/foto'), {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg', 'X-Ficha-Session': sessionToken },
    body: blob
  });
  return assertOk(response, 'No se pudo subir la foto.');
}
