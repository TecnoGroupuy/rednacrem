import { importsMock } from '../data/mocks/imports.js';
import { usersMock } from '../data/mocks/users.js';
import { toEsUyDateTime } from '../utils/dateFormat.js';
import { delay, maybeThrow, paginateArray } from './fakeApi.js';
import { importNoCallEntries, importPhoneResultsEntries } from './leadsService.js';
import { getApiClient } from './apiClient.js';

const userById = Object.fromEntries(usersMock.map((item) => [item.id, item]));
let importsStore = importsMock.map((item) => ({ ...item }));
const api = getApiClient();
const hasApiConfigured = () => {
  const baseUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_URL : '';
  return Boolean(String(baseUrl || '').trim());
};

export const IMPORT_TYPES = {
  clientes: { key: 'clientes', label: 'CSV de clientes' },
  no_llamar: { key: 'no_llamar', label: 'CSV Base No llamar' },
  resultados: { key: 'resultados', label: 'CSV de resultados telefónicos' },
  datos_para_trabajar: { key: 'datos_para_trabajar', label: 'CSV Datos para trabajar' }
};

const normalizeImportType = (value) => {
  const key = String(value || 'clientes').toLowerCase();
  return IMPORT_TYPES[key] ? key : 'clientes';
};

const normalizeImport = (item) => {
  const type = normalizeImportType(item.tipo || 'clientes');
  return {
    id: item.id.toUpperCase(),
    archivo: item.nombreArchivo,
    fecha: toEsUyDateTime(item.fecha),
    total: item.totalRegistros,
    importados: item.importados,
    rechazados: item.rechazados,
    estado: item.estado,
    usuario: userById[item.usuarioId]?.nombre || 'Sistema',
    tipo: type,
    tipoLabel: IMPORT_TYPES[type].label,
    rowErrors: item.rowErrors || []
  };
};

const stripBom = (text) => String(text || '').replace(/^\uFEFF/, '');

const countSeparatorOutsideQuotes = (line, separator) => {
  let inQuotes = false;
  let count = 0;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && char === separator) count += 1;
  }
  return count;
};

const detectSeparator = (headerLine) => {
  const candidates = [',', ';', '\t'];
  const best = candidates
    .map((separator) => ({ separator, count: countSeparatorOutsideQuotes(headerLine, separator) }))
    .sort((a, b) => b.count - a.count)[0];
  return best?.count > 0 ? best.separator : ',';
};

const parseCsvLine = (line, separator) => {
  const cells = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && char === separator) {
      cells.push(value.trim());
      value = '';
      continue;
    }
    value += char;
  }

  cells.push(value.trim());
  return cells;
};

const parseCsv = (csvText) => {
  const lines = stripBom(csvText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  maybeThrow(!lines.length, 'El archivo CSV está vacío.');

  const separator = detectSeparator(lines[0]);
  const headers = parseCsvLine(lines[0], separator).map((h) => h.trim().toLowerCase());
  const rows = [];
  let skippedEmptyRows = 0;
  lines.slice(1).forEach((line, index) => {
    const cells = parseCsvLine(line, separator);
    const hasValues = cells.some((cell) => String(cell || '').trim() !== '');
    if (!hasValues) {
      skippedEmptyRows += 1;
      return;
    }
    const row = {};
    headers.forEach((header, i) => {
      row[header] = cells[i] || '';
    });
    rows.push({ rowNumber: index + 2, ...row });
  });

  return { headers, rows, separator, skippedEmptyRows };
};

const normalizeResult = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized.includes('venta')) return 'venta_previa';
  if (normalized.includes('no contesta')) return 'no_contesta';
  if (normalized.includes('rech')) return 'rechazo';
  if (normalized.includes('dato')) return 'dato_erroneo';
  if (normalized.includes('segui')) return 'seguimiento';
  if (normalized.includes('rellam')) return 'rellamar';
  return normalized.replace(/\s+/g, '_');
};

const validateRows = (rows, importType) => {
  const rowErrors = [];
  const validRows = [];

  rows.forEach((row) => {
    const errors = [];

    if (importType === 'clientes') {
      if (!row.documento) errors.push('Documento vacío');
    }

    if (importType === 'no_llamar') {
      if (!row.telefono) errors.push('Teléfono vacío');
      if (row.telefono && !/^[\d\s+\-()]{7,}$/.test(row.telefono)) errors.push('Teléfono inválido');
    }

    if (importType === 'resultados') {
      if (!row.telefono && !row.documento) errors.push('Debe incluir teléfono o documento');
      const normalizedResult = normalizeResult(row.resultado || row.estado || row.gestion);
      if (!normalizedResult) errors.push('Resultado vacío');
      row.resultado = normalizedResult;
    }

    if (errors.length) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        values: { ...row },
        errors
      });
    } else {
      validRows.push(row);
    }
  });

  return {
    validRows,
    rowErrors,
    summary: {
      total: rows.length,
      importados: validRows.length,
      rechazados: rowErrors.length
    }
  };
};

const validateCsvByType = ({ headers, rows }, importType) => {
  const requiredByType = {
    clientes: ['documento'],
    no_llamar: ['telefono'],
    resultados: ['resultado'],
    datos_para_trabajar: []
  };

  const required = requiredByType[importType] || requiredByType.clientes;
  if (required.length) {
    const missing = required.filter((key) => !headers.includes(key));
    maybeThrow(missing.length > 0, 'Faltan columnas obligatorias: ' + missing.join(', '));
  }

  return validateRows(rows, importType);
};

export const listImports = async ({ page = 1, pageSize = 8, search = '', importType = 'todos', status = '' } = {}) => {
  if (hasApiConfigured()) {
    const params = new URLSearchParams({
      page: String(page || 1),
      pageSize: String(pageSize || 8),
      search: String(search || ''),
      importType: String(importType || 'todos')
    });
    if (status) params.set('status', String(status));
    const response = await api.get(`/imports?${params.toString()}`);
    return response;
  }
  await delay(180);
  const normalizedType = normalizeImportType(importType);
  const filtered = importsStore
    .filter((item) => {
      const bySearch = item.nombreArchivo.toLowerCase().includes(search.toLowerCase());
      const itemType = normalizeImportType(item.tipo || 'clientes');
      const byType = importType === 'todos' || itemType === normalizedType;
      return bySearch && byType;
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map(normalizeImport);
  return paginateArray(filtered, page, pageSize);
};

export const getImportRows = async (batchId) => {
  if (!batchId) return [];
  if (hasApiConfigured()) {
    const response = await api.get(`/imports/${batchId}/rows`);
    return response?.items || [];
  }
  await delay(120);
  const batch = importsStore.find((item) => item.id === batchId) || null;
  return batch?.rowErrors || [];
};

export const getNoCallImportJob = async (jobId) => {
  if (!jobId) return null;
  if (hasApiConfigured()) {
    const response = await api.get(`/imports/no-llamar/jobs/${jobId}`);
    return response?.job || null;
  }
  return null;
};

export const previewCsvText = async (csvText, { importType = 'clientes', fileName = '' } = {}) => {
  const normalizedType = normalizeImportType(importType);
  if (normalizedType === 'no_llamar') {
    // Validación liviana local: solo conteo y teléfono obligatorio.
    const parsed = parseCsv(csvText);
    const validation = validateCsvByType(parsed, normalizedType);
    return {
      ...validation,
      headers: parsed.headers,
      importType: normalizedType,
      importTypeLabel: IMPORT_TYPES[normalizedType].label,
      skippedEmptyRows: parsed.skippedEmptyRows || 0,
      usesBackend: false
    };
  }
  if (normalizedType === 'datos_para_trabajar') {
    const parsed = parseCsv(csvText);
    const validation = validateCsvByType(parsed, normalizedType);
    return {
      ...validation,
      headers: parsed.headers,
      importType: normalizedType,
      importTypeLabel: IMPORT_TYPES[normalizedType].label,
      skippedEmptyRows: parsed.skippedEmptyRows || 0,
      usesBackend: false
    };
  }
  // Para clientes usamos preview local para evitar doble POST (el backend auto-procesa).
  await delay(220);
  const parsed = parseCsv(csvText);
  const validation = validateCsvByType(parsed, normalizedType);
  return {
    ...validation,
    headers: parsed.headers,
    importType: normalizedType,
    importTypeLabel: IMPORT_TYPES[normalizedType].label,
    skippedEmptyRows: parsed.skippedEmptyRows || 0,
    usesBackend: false
  };
};

export const createImportFromCsv = async ({
  fileName,
  csvText,
  userId = 'usr-001',
  importType = 'clientes',
  batchId = null,
  createProducts = false
} = {}) => {
  const normalizedType = normalizeImportType(importType);

  if (hasApiConfigured() && normalizedType === 'clientes') {
    let effectiveBatchId = batchId;
    if (!effectiveBatchId) {
      const headers = fileName ? { 'X-File-Name': fileName } : {};
      const response = await api.post('/imports/clients', { csv: csvText }, { headers });
      effectiveBatchId = response?.batchId || response?.batch_id || null;
      return {
        id: String(effectiveBatchId || ''),
        nombreArchivo: fileName || `import_${effectiveBatchId || Date.now()}.csv`,
        fecha: new Date().toISOString(),
        tipo: normalizedType,
        totalRegistros: Number(response?.total || response?.imported || 0) + Number(response?.failed || 0),
        importados: Number(response?.imported || response?.inserted || 0),
        rechazados: Number(response?.failed || response?.errors || 0),
        estado: Number(response?.failed || response?.errors || 0)
          ? (Number(response?.imported || response?.inserted || 0) ? 'Con observaciones' : 'Fallida')
          : 'Completada',
        usuarioId: userId,
        rowErrors: [],
        report: response?.report || null
      };
    }
    maybeThrow(!effectiveBatchId, 'No se pudo generar el lote de importación.');
    // Backend auto-procesa al subir el CSV, no llamar /process para evitar duplicados.
    return {
      id: String(effectiveBatchId),
      nombreArchivo: fileName || `import_${effectiveBatchId}.csv`,
      fecha: new Date().toISOString(),
      tipo: normalizedType,
      totalRegistros: 0,
      importados: 0,
      rechazados: 0,
      estado: 'En proceso',
      usuarioId: userId,
      rowErrors: [],
      report: null
    };
  }

  if (hasApiConfigured() && normalizedType === 'no_llamar') {
    const headers = fileName ? { 'X-File-Name': fileName } : {};
    const response = await api.post('/imports/no-llamar/jobs', { csv: csvText }, { headers });
    const job = response?.job || null;
    const jobId = job?.id || response?.jobId || response?.job_id || null;
    return {
      asyncJob: true,
      jobId,
      job,
      nombreArchivo: fileName || 'import_no_llamar.csv',
      tipo: normalizedType,
      usuarioId: userId
    };
  }

  if (hasApiConfigured() && normalizedType === 'datos_para_trabajar') {
    const headers = fileName ? { 'X-File-Name': fileName } : {};
    const response = await api.post('/imports/datos-para-trabajar', { csv: csvText }, { headers });
    return {
      id: String(response?.batchId || response?.batch_id || Date.now()),
      nombreArchivo: fileName || 'import_datos_para_trabajar.csv',
      fecha: new Date().toISOString(),
      tipo: normalizedType,
      totalRegistros: Number(response?.total || 0),
      importados: Number(response?.inserted || 0),
      rechazados: Number(response?.errors || 0),
      estado: Number(response?.errors || 0)
        ? (Number(response?.inserted || 0) ? 'Con observaciones' : 'Fallida')
        : 'Completada',
      usuarioId: userId,
      rowErrors: []
    };
  }

  await delay(260);
  maybeThrow(!fileName, 'Debes seleccionar un archivo CSV.');
  maybeThrow(!csvText, 'No se pudo leer el contenido del archivo.');

  const parsed = parseCsv(csvText);
  const validation = validateCsvByType(parsed, normalizedType);

  if (normalizedType === 'no_llamar' && validation.validRows.length) {
    await importNoCallEntries(validation.validRows, { source: 'CSV', userId });
  }

  if (normalizedType === 'resultados' && validation.validRows.length) {
    await importPhoneResultsEntries(validation.validRows, { source: 'CSV', userId });
  }

  const nextId = 'imp-' + (Math.max(3301, ...importsStore.map((item) => Number(item.id.replace('imp-', '')))) + 1);
  const newImport = {
    id: nextId,
    nombreArchivo: fileName,
    fecha: new Date().toISOString(),
    tipo: normalizedType,
    totalRegistros: validation.summary.total,
    importados: validation.summary.importados,
    rechazados: validation.summary.rechazados,
    estado: validation.summary.rechazados ? (validation.summary.importados ? 'Con observaciones' : 'Fallida') : 'Completada',
    usuarioId: userId,
    rowErrors: validation.rowErrors
  };

  importsStore = [newImport, ...importsStore];
  return normalizeImport(newImport);
};

const resolveDeleteEndpoint = ({ id, importType }) => {
  const normalizedType = normalizeImportType(importType);
  if (!id) return null;
  if (normalizedType === 'no_llamar') {
    return `/imports/no-llamar/jobs/${id}`;
  }
  if (normalizedType === 'clientes' || normalizedType === 'datos_para_trabajar') {
    return `/imports/clients/${id}`;
  }
  return null;
};

export const deleteImportById = async ({ id, importType }) => {
  const endpoint = resolveDeleteEndpoint({ id, importType });
  if (!endpoint) {
    throw new Error('Esta importación no puede eliminarse.');
  }

  if (hasApiConfigured()) {
    try {
      // TODO: confirmar que el backend expone este DELETE para importaciones.
      await api.del(endpoint);
      return { ok: true };
    } catch (error) {
      const status = error?.status;
      if (status === 404 || status === 501) {
        // TODO: cuando no exista el endpoint, eliminar solo en UI.
        return { ok: true, simulated: true, reason: 'endpoint_missing' };
      }
      throw error;
    }
  }

  const normalizedId = String(id || '').toLowerCase();
  importsStore = importsStore.filter((item) => String(item.id || '').toLowerCase() !== normalizedId);
  return { ok: true, simulated: true, reason: 'mock' };
};

