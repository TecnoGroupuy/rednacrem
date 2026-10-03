import { getApiClient } from './apiClient.js';

// Mismo patron que flotasService.js: getApiClient(), sin enviar organization_id
// (lo resuelve el backend via el contexto de sesion/org activa).

const api = getApiClient();

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

export async function listPersonal({ baseId, estado, rol } = {}) {
  const query = buildQuery({ base_id: baseId, estado, rol });
  const response = await api.get(`/operaciones/personal${query}`);
  return response?.items || [];
}

export async function getPersonalDetail(personalId) {
  const response = await api.get(`/operaciones/personal/${personalId}`);
  return response?.item || null;
}

export async function createPersonal(payload) {
  const response = await api.post('/operaciones/personal', payload);
  return response?.item || null;
}

export async function updatePersonal(personalId, payload) {
  const response = await api.patch(`/operaciones/personal/${personalId}`, payload);
  return response?.item || null;
}

export async function deletePersonal(personalId) {
  // Soft-delete en el backend (estado='baja'), no elimina la fila.
  const response = await api.del(`/operaciones/personal/${personalId}`);
  return response?.item || null;
}

export async function listPersonalVencimientos({ days = 30 } = {}) {
  const query = buildQuery({ days });
  const response = await api.get(`/operaciones/personal/vencimientos${query}`);
  return response?.items || [];
}

export async function listPersonalConDocumentosPendientes() {
  const response = await api.get('/operaciones/personal/documentos-pendientes');
  return response?.personal_ids || [];
}

export async function generateFichaLink() {
  // Devuelve { ok, codigo, expiresAt, url } -- url ya viene armada por el
  // backend (link corto /f/<codigo>, migracion 084) con el origin del
  // propio request (ver index.mjs).
  return api.post('/operaciones/personal/link-autocompletado');
}

export async function listFichaLinks() {
  const response = await api.get('/operaciones/personal/links-autocompletado');
  return response?.items || [];
}

export async function revokeFichaLink(linkId) {
  const response = await api.post(`/operaciones/personal/links-autocompletado/${linkId}/revocar`);
  return Boolean(response?.ok);
}

export async function uploadPersonalFoto(personalId, blob) {
  // blob: JPEG ya recortado/redimensionado por PersonFotoCapture. api.post
  // detecta que el body es un Blob y no lo serializa como JSON (ver
  // apiClient.js) -- el Content-Type explicito es necesario igual, el
  // helper generico no lo infiere de un Blob sin tipo seteado por fetch.
  const response = await api.post(`/operaciones/personal/${personalId}/foto`, blob, {
    headers: { 'Content-Type': 'image/jpeg' }
  });
  return response?.foto_url || null;
}

export async function deletePersonalFoto(personalId) {
  const response = await api.del(`/operaciones/personal/${personalId}/foto`);
  return Boolean(response?.ok);
}

export async function getCambiosPublicos(personalId) {
  const response = await api.get(`/operaciones/personal/${personalId}/cambios-publicos`);
  return response?.items || [];
}

export async function getDocumentosPersonal(personalId) {
  const response = await api.get(`/operaciones/personal/${personalId}/documentos`);
  return {
    checklist: response?.checklist || [],
    cursos: response?.cursos || [],
    // Habilitaciones/carnet de salud/capacitaciones cargados por las
    // pestañas viejas (antes de Documentación), sin ningun archivo
    // vinculado -- ver getRegistrosDocumentalesAnteriores en el backend.
    registrosAnteriores: response?.registros_anteriores || { habilitaciones: [], carnet_salud: [], capacitaciones: [] }
  };
}

// blob: JPEG (DocumentoCapture, sin recorte) o el PDF original tal cual.
// Origen interno: el backend lo guarda ya validado (RRHH lo esta subiendo
// a mano, no hace falta revisión aparte).
export async function uploadDocumentoPersonal(personalId, { categoria, nombreArchivo, contentType, blob, numero, fechaVencimiento, fechaEmision, cursoNombre, cursoInstitucion }) {
  const headers = {
    'Content-Type': contentType,
    'X-Doc-Categoria': categoria,
    'X-Doc-Nombre-Archivo': encodeURIComponent(nombreArchivo)
  };
  if (numero) headers['X-Doc-Numero'] = encodeURIComponent(numero);
  if (fechaVencimiento) headers['X-Doc-Fecha-Vencimiento'] = fechaVencimiento;
  if (fechaEmision) headers['X-Doc-Fecha-Emision'] = fechaEmision;
  if (cursoNombre) headers['X-Doc-Curso-Nombre'] = encodeURIComponent(cursoNombre);
  if (cursoInstitucion) headers['X-Doc-Curso-Institucion'] = encodeURIComponent(cursoInstitucion);

  const response = await api.post(`/operaciones/personal/${personalId}/documentos`, blob, { headers });
  return { checklist: response?.checklist || [], cursos: response?.cursos || [] };
}

// -> { blob, filename } -- nunca una URL, el archivo viaja en la respuesta.
export async function getDocumentoContenido(personalId, archivoId) {
  const result = await api.getBlob(`/operaciones/personal/${personalId}/documentos/${archivoId}/contenido`);
  return { blob: result.blob, filename: result.filename };
}

export async function revisarDocumentoPersonal(personalId, archivoId, { estado_revision, motivo_rechazo }) {
  const response = await api.patch(`/operaciones/personal/${personalId}/documentos/${archivoId}`, { estado_revision, motivo_rechazo });
  return response?.item || null;
}

export async function updatePersonalBases(personalId, bases) {
  // Reemplaza el conjunto completo de bases de la persona (migracion 081) --
  // PUT, no PATCH: la unica via de escritura de bases desde el form, ver
  // savePersonal en RrhhScreen.jsx.
  const response = await api.put(`/operaciones/personal/${personalId}/bases`, { bases });
  return response?.bases || [];
}

export async function addPersonalRole(personalId, payload) {
  const response = await api.post(`/operaciones/personal/${personalId}/roles`, payload);
  return response?.item || null;
}

export async function deletePersonalRole(personalId, roleId) {
  const response = await api.del(`/operaciones/personal/${personalId}/roles/${roleId}`);
  return Boolean(response?.ok);
}

// Unico campo que acepta el PATCH: rol_principal=true -- lo desmarca de
// cualquier otro rol de la misma persona en el mismo request (ver el
// endpoint en el backend). No existe forma de "desmarcar sin marcar otro".
export async function setPersonalRolePrincipal(personalId, roleId) {
  const response = await api.patch(`/operaciones/personal/${personalId}/roles/${roleId}`, { rol_principal: true });
  return response?.item || null;
}

// Clasificación por especialidad/formación (RRHH SU Emergencia, 2026-10).
export async function listEspecialidadesCatalogo() {
  const response = await api.get('/operaciones/personal/especialidades-catalogo');
  return response?.items || [];
}

export async function addPersonalEspecialidad(personalId, catalogoId) {
  const response = await api.post(`/operaciones/personal/${personalId}/especialidades`, { catalogo_id: catalogoId });
  return response?.item || null;
}

export async function deletePersonalEspecialidad(personalId, especialidadId) {
  const response = await api.del(`/operaciones/personal/${personalId}/especialidades/${especialidadId}`);
  return Boolean(response?.ok);
}

export async function listLicencias(personalId) {
  const response = await api.get(`/operaciones/personal/${personalId}/licencias`);
  return response?.items || [];
}

export async function addLicencia(personalId, payload) {
  const response = await api.post(`/operaciones/personal/${personalId}/licencias`, payload);
  return response?.item || null;
}

export async function updateLicencia(personalId, licenciaId, payload) {
  const response = await api.patch(`/operaciones/personal/${personalId}/licencias/${licenciaId}`, payload);
  return response?.item || null;
}
