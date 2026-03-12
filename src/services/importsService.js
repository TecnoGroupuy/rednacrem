import { importsMock } from '../data/mocks/imports.js';
import { usersMock } from '../data/mocks/users.js';
import { toEsUyDateTime } from '../utils/dateFormat.js';
import { delay, maybeThrow, paginateArray } from './fakeApi.js';
import { importNoCallEntries, importPhoneResultsEntries } from './leadsService.js';

const userById = Object.fromEntries(usersMock.map((item) => [item.id, item]));
let importsStore = importsMock.map((item) => ({ ...item }));

export const IMPORT_TYPES = {
  clientes: { key: 'clientes', label: 'CSV de clientes' },
  no_llamar: { key: 'no_llamar', label: 'CSV Base No llamar' },
  resultados: { key: 'resultados', label: 'CSV de resultados telefónicos' }
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
  const rows = lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line, separator);
    const row = {};
    headers.forEach((header, i) => {
      row[header] = cells[i] || '';
    });
    return { rowNumber: index + 2, ...row };
  });

  return { headers, rows, separator };
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
      if (!row.nombre) errors.push('Nombre vacío');
      if (!row.telefono) errors.push('Teléfono vacío');
      if (row.telefono && !/^[\d\s+\-()]{7,}$/.test(row.telefono)) errors.push('Teléfono inválido');
      if (!row.ubicacion) errors.push('Ubicación vacía');
      if (!row.fuente) errors.push('Fuente vacía');
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
    clientes: ['nombre', 'telefono', 'ubicacion', 'fuente'],
    no_llamar: ['telefono'],
    resultados: ['resultado']
  };

  const required = requiredByType[importType] || requiredByType.clientes;
  const missing = required.filter((key) => !headers.includes(key));
  maybeThrow(missing.length > 0, 'Faltan columnas obligatorias: ' + missing.join(', '));

  return validateRows(rows, importType);
};

export const listImports = async ({ page = 1, pageSize = 8, search = '', importType = 'todos' } = {}) => {
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

export const previewCsvText = async (csvText, { importType = 'clientes' } = {}) => {
  await delay(220);
  const normalizedType = normalizeImportType(importType);
  const parsed = parseCsv(csvText);
  const validation = validateCsvByType(parsed, normalizedType);
  return {
    ...validation,
    headers: parsed.headers,
    importType: normalizedType,
    importTypeLabel: IMPORT_TYPES[normalizedType].label
  };
};

export const createImportFromCsv = async ({ fileName, csvText, userId = 'usr-001', importType = 'clientes' }) => {
  await delay(260);
  maybeThrow(!fileName, 'Debes seleccionar un archivo CSV.');
  maybeThrow(!csvText, 'No se pudo leer el contenido del archivo.');

  const normalizedType = normalizeImportType(importType);
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

