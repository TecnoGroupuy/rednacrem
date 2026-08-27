import React from 'react';
import { Database, Layers, Trash2, Users, X } from 'lucide-react';
import { formatDate } from '../utils/dateFormat.js';

const IMPORT_TABS = [
  { key: 'datasets', label: 'Por dataset', icon: Database },
  { key: 'sellers', label: 'Por vendedor', icon: Users },
  { key: 'pool', label: 'Total de bajas', icon: Layers }
];

const asText = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeKey = (value) => asText(value)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const normalizeSearch = (value) => normalizeKey(value).replace(/_/g, ' ');

const extractPayload = (response) => response?.data?.data || response?.data || response || {};
const extractList = (payload, keys = []) => {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return Array.isArray(payload) ? payload : [];
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('es-UY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatCount = (value) => asNumber(value).toLocaleString('es-UY');
const safeValue = (value, fallback = '-') => asText(value) || fallback;
const formatPercent = (value) => (value === null || value === undefined || value === '' ? '—' : `${value}%`);

const calcRate = (part, total) => {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((asNumber(part) / asNumber(total)) * 100)));
};

const getSummaryValue = (summary, keys, fallback = 0) => {
  for (const key of keys) {
    const value = summary?.[key];
    if (value !== undefined && value !== null && value !== '') return asNumber(value, fallback);
  }
  return fallback;
};

const getEffectivenessValue = (source) => {
  const direct = source?.efectividad ?? source?.effectiveness;
  if (direct !== undefined && direct !== null && direct !== '') {
    return asNumber(direct, 0);
  }
  const recuperado = getSummaryValue(source, ['recuperado', 'recuperados', 'recovered']);
  const rechazado = getSummaryValue(source, ['rechazado', 'rechazados', 'rejected']);
  const denominator = recuperado + rechazado;
  if (!denominator) return null;
  return calcRate(recuperado, denominator);
};

const normalizeSummary = (response) => {
  const payload = extractPayload(response);
  const summary = payload?.summary && typeof payload.summary === 'object' ? payload.summary : payload;
  const totalImportadas = getSummaryValue(summary, ['total_importadas', 'filas_importadas', 'total_rows', 'total', 'total_bajas']);
  const depuradas = getSummaryValue(summary, ['depuradas', 'total_depuradas', 'excluded_rows']);
  const baseUtil = getSummaryValue(summary, ['base_util', 'baseUtil', 'usable_base'], Math.max(totalImportadas - depuradas, 0));
  const pendiente = getSummaryValue(summary, ['pendiente', 'pendientes', 'pending']);
  const enGestion = getSummaryValue(summary, ['en_gestion', 'gestionados_abiertos', 'in_progress']);
  const recuperado = getSummaryValue(summary, ['recuperado', 'recuperados', 'recovered']);
  const rechazado = getSummaryValue(summary, ['rechazado', 'rechazados', 'rejected']);
  const datoErroneo = getSummaryValue(summary, ['dato_erroneo', 'datoErroneo', 'invalid_data']);
  const efectividad = getEffectivenessValue(summary);
  return {
    totalImportadas,
    depuradas,
    baseUtil,
    pendiente,
    enGestion,
    recuperado,
    rechazado,
    datoErroneo,
    efectividad,
    datasetsActivos: getSummaryValue(summary, ['datasets_activos', 'datasets', 'total_datasets']),
    ultimaImportacion: asText(summary?.ultima_importacion, summary?.latest_import_name),
    duplicadosUltima: getSummaryValue(summary, ['duplicados_ultima', 'last_duplicates']),
    activosUltima: getSummaryValue(summary, ['activos_ultima', 'last_active_excluded']),
    scope: asText(summary?.scope, summary?.organization_scope, 'organization_id')
  };
};

const normalizeDataset = (item, index) => {
  const filas = getSummaryValue(item, ['filas', 'total', 'total_candidates', 'rows_count', 'candidatos']);
  const excluidos = getSummaryValue(item, ['excluidos', 'excluded', 'excluded_count']);
  const pendiente = getSummaryValue(item, ['pendiente', 'pendientes', 'pending']);
  const enGestion = getSummaryValue(item, ['en_gestion', 'gestion', 'in_progress']);
  const recuperado = getSummaryValue(item, ['recuperado', 'recuperados', 'recovered']);
  const rechazado = getSummaryValue(item, ['rechazado', 'rechazados', 'rejected']);
  const datoErroneo = getSummaryValue(item, ['dato_erroneo', 'datoErroneo', 'invalid_data']);
  const cerrados = recuperado + rechazado + datoErroneo;
  return {
    id: asText(item?.id, item?.dataset_id, item?.datasetId, `dataset-${index + 1}`),
    nombre: asText(item?.nombre, item?.name, item?.dataset_name, `Dataset ${index + 1}`),
    archivo: asText(item?.archivo, item?.file_name, item?.filename),
    scope: asText(item?.scope, item?.organization_scope),
    estado: normalizeKey(item?.estado, item?.status) || 'activo',
    filas,
    excluidos,
    pendiente,
    enGestion,
    recuperado,
    rechazado,
    datoErroneo,
    avance: getSummaryValue(item, ['avance', 'progress', 'progress_pct'], calcRate(cerrados, Math.max(filas - excluidos, 1))),
    efectividad: getEffectivenessValue(item),
    gruposFamiliares: getSummaryValue(item, ['grupos_familiares', 'family_groups']),
    duplicados: getSummaryValue(item, ['duplicados', 'duplicates']),
    activosExcluidos: getSummaryValue(item, ['activos', 'clientes_activos', 'active_clients']),
    motivoPrincipal: asText(item?.motivo_baja_principal, item?.main_reason),
    motivoPct: getSummaryValue(item, ['motivo_baja_pct', 'main_reason_pct']),
    updatedAt: item?.updated_at || item?.updatedAt || item?.created_at || item?.createdAt || null
  };
};

const normalizeDatasetList = (response) => extractList(extractPayload(response), ['items', 'datasets', 'rows', 'data']).map(normalizeDataset);

const normalizeSellerList = (response) => extractList(extractPayload(response), ['items', 'sellers', 'rows', 'data']).map((item, index) => ({
  id: asText(item?.id, item?.seller_id, item?.sellerId, item?.user_id, `seller-${index + 1}`),
  vendedor: asText(
    item?.vendedor,
    item?.seller,
    item?.seller_name,
    item?.label,
    `${asText(item?.nombre, item?.name)} ${asText(item?.apellido, item?.last_name)}`.trim(),
    item?.email,
    `Vendedor ${index + 1}`
  ),
  datasets: getSummaryValue(item, ['datasets', 'dataset_count']),
  pendiente: getSummaryValue(item, ['pendiente', 'pendientes', 'pending']),
  enGestion: getSummaryValue(item, ['en_gestion', 'gestion', 'in_progress']),
  recuperado: getSummaryValue(item, ['recuperado', 'recuperados', 'recovered']),
  rechazado: getSummaryValue(item, ['rechazado', 'rechazados', 'rejected']),
  datoErroneo: getSummaryValue(item, ['dato_erroneo', 'datoErroneo', 'invalid_data']),
  avance: getSummaryValue(item, ['avance', 'progress', 'progress_pct']),
  efectividad: getSummaryValue(item, ['efectividad', 'effectiveness'])
}));

const normalizeCandidate = (item, index, datasetName = '') => ({
  id: asText(item?.id, item?.candidate_id, item?.candidateId, item?.contact_id, item?.contactId, `cand-${index + 1}`),
  candidateId: asText(item?.candidate_id, item?.candidateId, item?.id, item?.contact_id, item?.contactId, `cand-${index + 1}`),
  rowNumber: getSummaryValue(item, ['row_number', 'rowNumber', 'row', 'index'], index + 1),
  datasetId: asText(item?.dataset_id, item?.datasetId),
  datasetName: asText(item?.dataset_name, item?.datasetName, datasetName),
  documento: asText(item?.documento, item?.cedula, item?.ci),
  contacto: asText(item?.contacto, item?.contact_name, [asText(item?.nombre), asText(item?.apellido)].filter(Boolean).join(' '), 'Sin nombre'),
  telefono: asText(item?.telefono, item?.celular, item?.phone),
  plan: asText(item?.plan, item?.producto, item?.nombre_producto, item?.product_name),
  precio: asText(item?.precio, item?.precio_anterior, item?.amount),
  motivoBaja: asText(item?.motivo_baja, item?.motivoBaja, item?.main_reason),
  fechaBaja: item?.fecha_baja || item?.fechaBaja || null,
  estado: normalizeKey(item?.estado, item?.status, item?.classification, item?.resultado) || 'pendiente'
});

const normalizeDetail = (response, datasetId = '') => {
  const payload = extractPayload(response);
  const datasetRaw = payload?.dataset && typeof payload.dataset === 'object' ? payload.dataset : payload;
  return {
    dataset: normalizeDataset({ ...datasetRaw, id: datasetId }, 0),
    rows: extractList(payload, ['rows', 'items', 'candidates']).map((item, index) => normalizeCandidate(item, index, asText(datasetRaw?.nombre, datasetRaw?.name)))
  };
};

const normalizePool = (response) => extractList(extractPayload(response), ['items', 'rows', 'candidates']).map((item, index) => normalizeCandidate(item, index));

const datasetStatusMeta = (status) => {
  if (status === 'pausado') return { label: 'Pausado', bg: '#FAEEDA', color: '#854F0B' };
  if (status === 'cerrado') return { label: 'Cerrado', bg: '#E5E7EB', color: '#475569' };
  return { label: 'Activo', bg: '#E1F5EE', color: '#0F6E56' };
};

const poolStatusVariant = (status) => {
  if (status === 'requiere_revision') return 'danger';
  if (status === 'grupo_familiar') return 'info';
  if (status === 'cliente_activo' || status === 'duplicado_real') return 'warning';
  return 'success';
};

const poolStatusLabel = (status) => {
  if (status === 'requiere_revision') return 'Requiere revision';
  if (status === 'grupo_familiar') return 'Grupo familiar';
  if (status === 'cliente_activo') return 'Cliente activo';
  if (status === 'duplicado_real') return 'Duplicado real';
  if (status === 'sin_documento') return 'Sin documento';
  if (status === 'ok') return 'OK';
  return safeValue(status, 'Pendiente');
};

const rowStateMeta = (row, assignments, selectedIndividualIds, draftRange) => {
  const existingRange = assignments.find((assignment) => (
    assignment.type === 'range'
    && row.rowNumber >= assignment.startRow
    && row.rowNumber <= assignment.endRow
  ));
  const existingIndividual = assignments.find((assignment) => (
    assignment.type === 'individual'
    && String(assignment.candidateId || '') === String(row.candidateId || '')
  ));
  const inDraftRange = Boolean(draftRange && row.rowNumber >= draftRange.startRow && row.rowNumber <= draftRange.endRow);
  const selectedIndividual = selectedIndividualIds.includes(String(row.candidateId || row.id));

  if (existingRange) return { label: `Bloqueado por rango ${existingRange.startRow}-${existingRange.endRow}`, variant: 'warning', disableIndividual: true, disableRange: false };
  if (existingIndividual) return { label: 'Bloqueado por seleccion individual', variant: 'info', disableIndividual: false, disableRange: true };
  if (inDraftRange) return { label: 'Incluido en rango borrador', variant: 'danger', disableIndividual: true, disableRange: false };
  if (selectedIndividual) return { label: 'Seleccionado individual', variant: 'success', disableIndividual: false, disableRange: true };
  return { label: 'Libre', variant: 'success', disableIndividual: false, disableRange: false };
};

const normalizeAssignment = (item, index) => ({
  id: asText(item?.id, item?.assignment_id, item?.assignmentId, `assignment-${index + 1}`),
  type: normalizeKey(item?.type, item?.assignment_type, item?.modo) === 'individual' ? 'individual' : 'range',
  sellerLabel: asText(item?.seller_name, item?.sellerName, item?.vendedor, 'Sin vendedor'),
  sellerId: asText(item?.seller_id, item?.sellerId),
  startRow: getSummaryValue(item, ['start_row', 'startRow', 'desde_fila']),
  endRow: getSummaryValue(item, ['end_row', 'endRow', 'hasta_fila']),
  candidateId: asText(item?.candidate_id, item?.candidateId, item?.row_id),
  createdAt: item?.created_at || item?.createdAt || null
});

const downloadCsv = (rows, fileName) => {
  if (!Array.isArray(rows) || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map((row) => headers.map((key) => escape(row[key])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export default function RecuperoDatasetsView({
  Panel,
  Button,
  Tag,
  api,
  active = false,
  sellers = [],
  loadAssignableSellers = async () => {},
  onSync = () => {},
  onExportStateChange = () => {}
}) {
  const [subtab, setSubtab] = React.useState('datasets');
  const [summary, setSummary] = React.useState({
    totalImportadas: 0,
    depuradas: 0,
    baseUtil: 0,
    pendiente: 0,
    enGestion: 0,
    recuperado: 0,
    rechazado: 0,
    datoErroneo: 0,
    efectividad: 0,
    datasetsActivos: 0,
    ultimaImportacion: '',
    duplicadosUltima: 0,
    activosUltima: 0,
    scope: 'organization_id'
  });
  const [summaryError, setSummaryError] = React.useState('');
  const [summaryLoading, setSummaryLoading] = React.useState(false);
  const [datasets, setDatasets] = React.useState([]);
  const [datasetsLoading, setDatasetsLoading] = React.useState(false);
  const [datasetsError, setDatasetsError] = React.useState('');
  const [selectedDatasetId, setSelectedDatasetId] = React.useState('');
  const [detailsById, setDetailsById] = React.useState({});
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState('');
  const [sellerRows, setSellerRows] = React.useState([]);
  const [sellerRowsLoading, setSellerRowsLoading] = React.useState(false);
  const [sellerRowsError, setSellerRowsError] = React.useState('');
  const [poolRows, setPoolRows] = React.useState([]);
  const [poolLoading, setPoolLoading] = React.useState(false);
  const [poolError, setPoolError] = React.useState('');
  const [poolNotice, setPoolNotice] = React.useState('');
  const [selectedPoolIds, setSelectedPoolIds] = React.useState([]);
  const [poolAssignOpen, setPoolAssignOpen] = React.useState(false);
  const [poolAssignSellerId, setPoolAssignSellerId] = React.useState('');
  const [poolAssigning, setPoolAssigning] = React.useState(false);
  const [datasetSearch, setDatasetSearch] = React.useState('');
  const [poolSearch, setPoolSearch] = React.useState('');
  const [rangeDraft, setRangeDraft] = React.useState({ startRow: '', endRow: '', sellerId: '' });
  const [individualSellerId, setIndividualSellerId] = React.useState('');
  const [selectedIndividualIds, setSelectedIndividualIds] = React.useState([]);
  const [configSaving, setConfigSaving] = React.useState(false);
  const [configError, setConfigError] = React.useState('');
  const [configNotice, setConfigNotice] = React.useState('');

  const selectedDetail = selectedDatasetId ? detailsById[selectedDatasetId] || null : null;
  const assignments = extractList(selectedDetail || {}, ['assignments']).map(normalizeAssignment);
  const configRows = selectedDetail?.rows || [];

  const rangeBounds = React.useMemo(() => {
    const startRow = asNumber(rangeDraft.startRow, 0);
    const endRow = asNumber(rangeDraft.endRow, 0);
    if (!startRow || !endRow || endRow < startRow) return null;
    return { startRow, endRow };
  }, [rangeDraft.endRow, rangeDraft.startRow]);

  const loadOverview = React.useCallback(async () => {
    setSummaryLoading(true);
    setDatasetsLoading(true);
    setSummaryError('');
    setDatasetsError('');
    const [summaryResult, datasetsResult] = await Promise.allSettled([
      api.get('/recovery/summary'),
      api.get('/recovery/datasets')
    ]);
    if (summaryResult.status === 'fulfilled') {
      setSummary(normalizeSummary(summaryResult.value));
      onSync();
    } else {
      setSummaryError(summaryResult.reason?.message || 'No se pudo cargar el resumen de importaciones.');
    }
    if (datasetsResult.status === 'fulfilled') {
      try {
        const rows = normalizeDatasetList(datasetsResult.value);
        setDatasets(rows);
        setSelectedDatasetId((prev) => (prev && rows.some((row) => row.id === prev) ? prev : (rows[0]?.id || '')));
        onSync();
      } catch (err) {
        setDatasetsError(err?.message || 'El listado de datasets devolvio un formato inesperado.');
        setDatasets([]);
      }
    } else {
      setDatasetsError(datasetsResult.reason?.message || 'No se pudo cargar la lista de datasets.');
      setDatasets([]);
    }
    setSummaryLoading(false);
    setDatasetsLoading(false);
  }, [api, onSync]);

  const loadDetail = React.useCallback(async (datasetId) => {
    if (!datasetId) return;
    setDetailLoading(true);
    setDetailError('');
    try {
      const response = await api.get(`/recovery/datasets/${encodeURIComponent(datasetId)}`);
      const payload = extractPayload(response);
      const detail = normalizeDetail(response, datasetId);
      detail.assignments = extractList(payload, ['assignments', 'rules']).map(normalizeAssignment);
      setDetailsById((prev) => ({ ...prev, [datasetId]: detail }));
      onSync();
    } catch (err) {
      setDetailError(err?.message || 'No se pudo cargar el detalle del dataset.');
    } finally {
      setDetailLoading(false);
    }
  }, [api, onSync]);

  const loadSellers = React.useCallback(async () => {
    setSellerRowsLoading(true);
    setSellerRowsError('');
    try {
      const response = await api.get('/recovery/sellers');
      setSellerRows(normalizeSellerList(response));
      onSync();
    } catch (err) {
      setSellerRowsError(err?.message || 'No se pudo cargar la vista por vendedor.');
      setSellerRows([]);
    } finally {
      setSellerRowsLoading(false);
    }
  }, [api, onSync]);

  const loadPool = React.useCallback(async () => {
    setPoolLoading(true);
    setPoolError('');
    setPoolNotice('');
    try {
      const response = await api.get('/api/recupero/contactos?estado=disponible');
      const rows = normalizePool(response);
      setPoolRows(rows);
      if (rows.length && rows.every((row) => !row.datasetId && !row.datasetName)) {
        setPoolNotice('El endpoint real del pool no expone dataset_id ni nombre de dataset por candidato. La columna de origen queda pendiente hasta ajustar ese contrato.');
      }
      onSync();
    } catch (err) {
      setPoolError(err?.message || 'No se pudo cargar el pool total de bajas.');
      setPoolRows([]);
    } finally {
      setPoolLoading(false);
    }
  }, [api, onSync]);

  React.useEffect(() => {
    if (!active) return;
    loadOverview();
  }, [active, loadOverview]);

  React.useEffect(() => {
    if (!active) return;
    if (subtab === 'sellers') {
      loadSellers();
      return;
    }
    if (subtab === 'pool') {
      loadPool();
      loadAssignableSellers();
    }
  }, [active, loadAssignableSellers, loadPool, loadSellers, subtab]);

  React.useEffect(() => {
    if (!active || !selectedDatasetId) return;
    if (subtab !== 'datasets') return;
    loadDetail(selectedDatasetId);
    loadAssignableSellers();
  }, [active, loadAssignableSellers, loadDetail, selectedDatasetId, subtab]);

  const filteredDetailRows = React.useMemo(() => {
    const query = normalizeSearch(datasetSearch);
    if (!query) return configRows;
    return configRows.filter((row) => (
      normalizeSearch([row.contacto, row.documento, row.telefono, row.plan, row.motivoBaja].join(' ')).includes(query)
    ));
  }, [configRows, datasetSearch]);

  const filteredPoolRows = React.useMemo(() => {
    const query = normalizeSearch(poolSearch);
    if (!query) return poolRows;
    return poolRows.filter((row) => (
      normalizeSearch([row.datasetName, row.contacto, row.documento, row.telefono, row.plan, row.motivoBaja].join(' ')).includes(query)
    ));
  }, [poolRows, poolSearch]);

  React.useEffect(() => {
    if (!active) return;
    if (subtab === 'datasets') {
      onExportStateChange({
        fileName: 'recupero-importaciones-datasets.csv',
        rows: datasets.map((row) => ({
          dataset: row.nombre,
          archivo: row.archivo,
          estado: row.estado,
          filas: row.filas,
          excluidos: row.excluidos,
          pendiente: row.pendiente,
          en_gestion: row.enGestion,
          recuperado: row.recuperado,
          rechazado: row.rechazado,
          dato_erroneo: row.datoErroneo,
          avance: `${row.avance}%`,
          efectividad: formatPercent(row.efectividad)
        }))
      });
      return;
    }
    if (subtab === 'sellers') {
      onExportStateChange({
        fileName: 'recupero-importaciones-vendedores.csv',
        rows: sellerRows.map((row) => ({
          vendedor: row.vendedor,
          datasets: row.datasets,
          pendiente: row.pendiente,
          en_gestion: row.enGestion,
          recuperado: row.recuperado,
          rechazado: row.rechazado,
          dato_erroneo: row.datoErroneo,
          avance: `${row.avance}%`,
          efectividad: formatPercent(row.efectividad)
        }))
      });
      return;
    }
    onExportStateChange({
      fileName: 'recupero-total-bajas.csv',
      rows: filteredPoolRows.map((row) => ({
        dataset: row.datasetName,
        fila: row.rowNumber,
        documento: row.documento,
        contacto: row.contacto,
        telefono: row.telefono,
        plan: row.plan,
        precio: row.precio,
        motivo_baja: row.motivoBaja,
        fecha_baja: row.fechaBaja,
        estado: row.estado
      }))
    });
  }, [active, datasets, filteredPoolRows, onExportStateChange, sellerRows, subtab]);

  const selectedDataset = datasets.find((dataset) => dataset.id === selectedDatasetId) || null;
  const detailAssignments = selectedDetail?.assignments || [];

  const handleCreateRangeAssignment = async () => {
    if (!selectedDatasetId || !rangeBounds || !rangeDraft.sellerId) {
      setConfigError('Completa un rango valido y un vendedor antes de guardar.');
      return;
    }
    const blocked = configRows.some((row) => (
      row.rowNumber >= rangeBounds.startRow
      && row.rowNumber <= rangeBounds.endRow
      && rowStateMeta(row, detailAssignments, selectedIndividualIds, rangeBounds).disableRange
    ));
    if (blocked) {
      setConfigError('El rango incluye filas bloqueadas por una seleccion individual.');
      return;
    }
    setConfigSaving(true);
    setConfigError('');
    setConfigNotice('');
    try {
      await api.post(`/recovery/datasets/${encodeURIComponent(selectedDatasetId)}/assignments`, {
        type: 'range',
        seller_id: rangeDraft.sellerId,
        start_row: rangeBounds.startRow,
        end_row: rangeBounds.endRow
      });
      setRangeDraft({ startRow: '', endRow: '', sellerId: '' });
      setConfigNotice('Rango guardado.');
      loadDetail(selectedDatasetId);
      loadOverview();
    } catch (err) {
      setConfigError(err?.message || 'No se pudo guardar la asignacion por rango.');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleCreateIndividualAssignment = async () => {
    if (!selectedDatasetId || !individualSellerId || !selectedIndividualIds.length) {
      setConfigError('Selecciona filas y vendedor antes de guardar la asignacion individual.');
      return;
    }
    const blocked = configRows.some((row) => (
      selectedIndividualIds.includes(String(row.candidateId || row.id))
      && rowStateMeta(row, detailAssignments, selectedIndividualIds, rangeBounds).disableIndividual
    ));
    if (blocked) {
      setConfigError('Hay filas bloqueadas por rango. Ajusta la seleccion individual.');
      return;
    }
    setConfigSaving(true);
    setConfigError('');
    setConfigNotice('');
    try {
      await api.post(`/recovery/datasets/${encodeURIComponent(selectedDatasetId)}/assignments`, {
        type: 'individual',
        seller_id: individualSellerId,
        candidate_ids: selectedIndividualIds
      });
      setSelectedIndividualIds([]);
      setIndividualSellerId('');
      setConfigNotice('Asignacion individual guardada.');
      loadDetail(selectedDatasetId);
      loadOverview();
    } catch (err) {
      setConfigError(err?.message || 'No se pudo guardar la asignacion individual. Si el contrato todavia no coincide, hay que ajustarlo antes de seguir.');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!assignmentId) return;
    setConfigSaving(true);
    setConfigError('');
    setConfigNotice('');
    try {
      await api.del(`/recovery/assignments/${encodeURIComponent(assignmentId)}`);
      setConfigNotice('Asignacion eliminada.');
      loadDetail(selectedDatasetId);
      loadOverview();
    } catch (err) {
      setConfigError(err?.message || 'No se pudo eliminar la asignacion.');
    } finally {
      setConfigSaving(false);
    }
  };

  const handlePoolAssign = async () => {
    if (!poolAssignSellerId || !selectedPoolIds.length) return;
    setPoolAssigning(true);
    try {
      await api.post('/api/recupero/lotes', {
        nombre: `Asignacion recupero ${new Date().toLocaleDateString('en-CA')}`,
        seller_ids: [poolAssignSellerId],
        candidate_ids: selectedPoolIds,
        contact_ids: selectedPoolIds
      });
      setPoolAssignOpen(false);
      setPoolAssignSellerId('');
      setSelectedPoolIds([]);
      loadPool();
      loadOverview();
    } catch (err) {
      setPoolError(err?.message || 'No se pudo asignar la seleccion.');
    } finally {
      setPoolAssigning(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)' }}>Importaciones y datasets</div>
        <div style={{ marginTop: 4, fontSize: 14, color: 'var(--color-text-secondary)' }}>
          {summaryLoading
            ? 'Cargando resumen...'
            : `${formatCount(summary.datasetsActivos || datasets.length)} datasets activos · ${formatCount(summary.totalImportadas)} filas importadas desde bajas de Clientes`}
        </div>
      </div>

      {(summaryError || datasetsError) && (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FEF2F2', color: '#B91C1C', fontWeight: 700 }}>
          {summaryError || datasetsError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Base util', value: formatCount(summary.baseUtil), color: 'var(--color-text-primary)', sub: `de ${formatCount(summary.totalImportadas)} filas · ${formatCount(summary.depuradas)} depuradas` },
          { label: 'Pendiente', value: formatCount(summary.pendiente), color: '#64748B', sub: 'nunca gestionado' },
          { label: 'En gestion', value: formatCount(summary.enGestion), color: '#A16207', sub: 'con intento, sin cierre' },
          { label: 'Recuperado', value: formatCount(summary.recuperado), color: '#15803D', sub: `${calcRate(summary.recuperado, summary.baseUtil)}% de la base util` },
          { label: 'Rechazado', value: formatCount(summary.rechazado), color: '#B91C1C', sub: `${calcRate(summary.rechazado, summary.baseUtil)}% de la base util` },
          { label: 'Efectividad', value: formatPercent(summary.efectividad), color: '#0F766E', sub: 'excluye dato erroneo' }
        ].map((card) => (
          <div key={card.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: card.label === 'Efectividad' ? '1px solid rgba(15,118,110,0.45)' : '0.5px solid var(--color-border-tertiary)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: card.color, marginTop: 10 }}>{summaryLoading ? '...' : card.value}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {IMPORT_TABS.map((tab) => {
            const isActive = subtab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSubtab(tab.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: isActive ? '1px solid rgba(15,118,110,0.45)' : '1px solid rgba(148,163,184,0.45)',
                  background: isActive ? '#fff' : 'var(--color-background-secondary)',
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {subtab === 'datasets' && (
        <>
          <Panel title="Datasets importados" subtitle={`${datasets.length} cargas · scope ${summary.scope || 'organization_id'}`}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Dataset</th>
                    <th>Filas</th>
                    <th>Excluidos</th>
                    <th>Motivo de baja principal</th>
                    <th>Pend.</th>
                    <th>Gest.</th>
                    <th>Recup.</th>
                    <th>Rech.</th>
                    <th>Dato err.</th>
                    <th>Avance</th>
                  </tr>
                </thead>
                <tbody>
                  {datasetsLoading ? (
                    <tr><td colSpan={10} style={{ padding: 16, color: 'var(--color-text-secondary)' }}>Cargando datasets...</td></tr>
                  ) : datasets.map((dataset) => {
                    const statusMeta = datasetStatusMeta(dataset.estado);
                    return (
                      <tr
                        key={dataset.id}
                        onClick={() => setSelectedDatasetId(dataset.id)}
                        style={{ cursor: 'pointer', background: selectedDatasetId === dataset.id ? 'rgba(15,118,110,0.06)' : 'transparent' }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <div style={{ fontWeight: 900 }}>{dataset.nombre}</div>
                            <span style={{ padding: '3px 8px', borderRadius: 999, background: statusMeta.bg, color: statusMeta.color, fontSize: 12, fontWeight: 800 }}>
                              {statusMeta.label}
                            </span>
                          </div>
                          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                            {safeValue(dataset.archivo)} · {formatCount(dataset.gruposFamiliares)} grupos fam. · {formatCount(dataset.duplicados)} dup · {formatCount(dataset.activosExcluidos)} activos
                          </div>
                        </td>
                        <td style={{ fontWeight: 800 }}>{formatCount(dataset.filas)}</td>
                        <td>{formatCount(dataset.excluidos)}</td>
                        <td>
                          <div>{safeValue(dataset.motivoPrincipal, 'Sin datos')}</div>
                          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-secondary)' }}>{dataset.motivoPct ? `${dataset.motivoPct}% de las bajas` : 'Sin datos'}</div>
                        </td>
                        <td>{formatCount(dataset.pendiente)}</td>
                        <td style={{ color: '#A16207', fontWeight: 800 }}>{formatCount(dataset.enGestion)}</td>
                        <td style={{ color: '#15803D', fontWeight: 800 }}>{formatCount(dataset.recuperado)}</td>
                        <td style={{ color: '#B91C1C', fontWeight: 800 }}>{formatCount(dataset.rechazado)}</td>
                        <td>{formatCount(dataset.datoErroneo)}</td>
                        <td>
                          <div style={{ minWidth: 140 }}>
                            <div style={{ height: 8, background: '#E5E7EB', borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
                              <div style={{ width: `${calcRate(dataset.enGestion, dataset.filas)}%`, background: '#CA8A04' }} />
                              <div style={{ width: `${calcRate(dataset.recuperado, dataset.filas)}%`, background: '#15803D' }} />
                              <div style={{ width: `${calcRate(dataset.rechazado, dataset.filas)}%`, background: '#B91C1C' }} />
                              <div style={{ width: `${calcRate(dataset.datoErroneo, dataset.filas)}%`, background: '#9CA3AF' }} />
                            </div>
                            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>{dataset.avance}% cerrado · efect. {formatPercent(dataset.efectividad)}</div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!datasetsLoading && datasets.length === 0 ? (
                    <tr><td colSpan={10} style={{ padding: 16, color: 'var(--color-text-secondary)' }}>No hay datasets para mostrar.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Ultima importacion: {summary.ultimaImportacion || '-'} · {formatCount(summary.duplicadosUltima)} duplicados y {formatCount(summary.activosUltima)} activos excluidos en el ingest · scope: {summary.scope || 'organization_id'}
            </div>
          </Panel>

          <Panel title={selectedDataset?.nombre || 'Detalle del dataset'} subtitle="Busqueda insensible a acentos y configuracion de asignacion">
            {detailError ? <div style={{ marginBottom: 12, color: '#B91C1C', fontWeight: 700 }}>{detailError}</div> : null}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <input className="input" placeholder="Buscar fila, documento, telefono o plan..." value={datasetSearch} onChange={(event) => setDatasetSearch(event.target.value)} style={{ minWidth: 260, flex: '1 1 260px' }} />
              <select className="input" value={selectedDatasetId} onChange={(event) => setSelectedDatasetId(event.target.value)} style={{ minWidth: 240 }}>
                <option value="">Seleccionar dataset...</option>
                {datasets.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>{dataset.nombre}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)', gap: 16 }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ background: 'var(--color-background-secondary)', borderRadius: 12, padding: 14, border: '0.5px solid var(--color-border-tertiary)' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Asignacion por rango</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <input className="input" placeholder="Fila desde" value={rangeDraft.startRow} onChange={(event) => setRangeDraft((prev) => ({ ...prev, startRow: event.target.value }))} />
                    <input className="input" placeholder="Fila hasta" value={rangeDraft.endRow} onChange={(event) => setRangeDraft((prev) => ({ ...prev, endRow: event.target.value }))} />
                    <select className="input" value={rangeDraft.sellerId} onChange={(event) => setRangeDraft((prev) => ({ ...prev, sellerId: event.target.value }))}>
                      <option value="">Seleccionar vendedor...</option>
                      {sellers.map((seller) => <option key={seller.id || seller.email} value={seller.id}>{seller.label || seller.email || 'Vendedor'}</option>)}
                    </select>
                    <Button onClick={handleCreateRangeAssignment} disabled={configSaving || !selectedDatasetId}>Guardar rango</Button>
                  </div>
                </div>

                <div style={{ background: 'var(--color-background-secondary)', borderRadius: 12, padding: 14, border: '0.5px solid var(--color-border-tertiary)' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Asignacion individual</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Filas seleccionadas: <strong>{selectedIndividualIds.length}</strong></div>
                  <select className="input" value={individualSellerId} onChange={(event) => setIndividualSellerId(event.target.value)}>
                    <option value="">Seleccionar vendedor...</option>
                    {sellers.map((seller) => <option key={seller.id || seller.email} value={seller.id}>{seller.label || seller.email || 'Vendedor'}</option>)}
                  </select>
                  <div style={{ marginTop: 10 }}>
                    <Button onClick={handleCreateIndividualAssignment} disabled={configSaving || !selectedDatasetId}>Guardar individual</Button>
                  </div>
                </div>

                {configError ? <div style={{ color: '#B91C1C', fontWeight: 700 }}>{configError}</div> : null}
                {configNotice ? <div style={{ color: '#0F6E56', fontWeight: 700 }}>{configNotice}</div> : null}
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Cobertura</th>
                        <th>Vendedor</th>
                        <th>Creada</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailAssignments.map((assignment) => (
                        <tr key={assignment.id}>
                          <td><Tag variant={assignment.type === 'individual' ? 'info' : 'warning'}>{assignment.type === 'individual' ? 'Individual' : 'Rango'}</Tag></td>
                          <td>{assignment.type === 'range' ? `${assignment.startRow}-${assignment.endRow}` : safeValue(assignment.candidateId)}</td>
                          <td>{assignment.sellerLabel}</td>
                          <td>{assignment.createdAt ? formatDateTime(assignment.createdAt) : '-'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button type="button" onClick={() => handleDeleteAssignment(assignment.id)} disabled={configSaving} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#B91C1C' }}>
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!detailAssignments.length ? (
                        <tr><td colSpan={5} style={{ padding: 16, color: 'var(--color-text-secondary)' }}>Sin asignaciones configuradas.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th></th>
                        <th>Fila</th>
                        <th>Documento</th>
                        <th>Contacto</th>
                        <th>Plan</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailLoading ? (
                        <tr><td colSpan={6} style={{ padding: 16, color: 'var(--color-text-secondary)' }}>Cargando detalle...</td></tr>
                      ) : filteredDetailRows.map((row) => {
                        const state = rowStateMeta(row, detailAssignments, selectedIndividualIds, rangeBounds);
                        const key = String(row.candidateId || row.id);
                        return (
                          <tr key={`${key}-${row.rowNumber}`}>
                            <td>
                              <input type="checkbox" checked={selectedIndividualIds.includes(key)} disabled={state.disableIndividual} onChange={() => setSelectedIndividualIds((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]))} />
                            </td>
                            <td>{row.rowNumber}</td>
                            <td>{safeValue(row.documento)}</td>
                            <td>{row.contacto}</td>
                            <td>{safeValue(row.plan)}</td>
                            <td><Tag variant={state.variant}>{state.label}</Tag></td>
                          </tr>
                        );
                      })}
                      {!detailLoading && filteredDetailRows.length === 0 ? (
                        <tr><td colSpan={6} style={{ padding: 16, color: 'var(--color-text-secondary)' }}>No hay filas para el dataset seleccionado.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Panel>
        </>
      )}

      {subtab === 'sellers' && (
        <Panel title="Rendimiento por vendedor" subtitle="Agrupado sobre todos los datasets importados">
          {sellerRowsError ? <div style={{ marginBottom: 12, color: '#B91C1C', fontWeight: 700 }}>{sellerRowsError}</div> : null}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Datasets</th>
                  <th>Pend.</th>
                  <th>Gest.</th>
                  <th>Recup.</th>
                  <th>Rech.</th>
                  <th>Dato err.</th>
                  <th>Avance</th>
                  <th>Efect.</th>
                </tr>
              </thead>
              <tbody>
                {sellerRowsLoading ? (
                  <tr><td colSpan={9} style={{ padding: 16, color: 'var(--color-text-secondary)' }}>Cargando vendedores...</td></tr>
                ) : sellerRows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 800 }}>{row.vendedor}</td>
                    <td>{formatCount(row.datasets)}</td>
                    <td>{formatCount(row.pendiente)}</td>
                    <td style={{ color: '#A16207', fontWeight: 800 }}>{formatCount(row.enGestion)}</td>
                    <td style={{ color: '#15803D', fontWeight: 800 }}>{formatCount(row.recuperado)}</td>
                    <td style={{ color: '#B91C1C', fontWeight: 800 }}>{formatCount(row.rechazado)}</td>
                    <td>{formatCount(row.datoErroneo)}</td>
                    <td>{row.avance}%</td>
                    <td>{formatPercent(row.efectividad)}</td>
                  </tr>
                ))}
                {!sellerRowsLoading && sellerRows.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: 16, color: 'var(--color-text-secondary)' }}>No hay metricas por vendedor para mostrar.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {subtab === 'pool' && (
        <Panel
          title="Total de bajas"
          subtitle="Pool unico cruzando todos los datasets"
          action={(
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Seleccionados: {selectedPoolIds.length}</span>
              <Button onClick={() => setPoolAssignOpen(true)} disabled={!selectedPoolIds.length}>Asignar a vendedor</Button>
            </div>
          )}
        >
          {poolError ? <div style={{ marginBottom: 12, color: '#B91C1C', fontWeight: 700 }}>{poolError}</div> : null}
          {poolNotice ? <div style={{ marginBottom: 12, color: '#92400E', fontWeight: 700 }}>{poolNotice}</div> : null}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <input className="input" placeholder="Buscar por dataset, documento, contacto o plan..." value={poolSearch} onChange={(event) => setPoolSearch(event.target.value)} style={{ minWidth: 260, flex: '1 1 260px' }} />
            <Button variant="ghost" onClick={() => downloadCsv(filteredPoolRows.map((row) => ({
              dataset: row.datasetName,
              fila: row.rowNumber,
              documento: row.documento,
              contacto: row.contacto,
              telefono: row.telefono,
              plan: row.plan,
              precio: row.precio,
              motivo_baja: row.motivoBaja,
              fecha_baja: row.fechaBaja,
              estado: row.estado
            })), 'recupero-total-bajas.csv')}>Descargar seleccion visible</Button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Dataset</th>
                  <th>Fila</th>
                  <th>Documento</th>
                  <th>Contacto</th>
                  <th>Telefono</th>
                  <th>Plan</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {poolLoading ? (
                  <tr><td colSpan={8} style={{ padding: 16, color: 'var(--color-text-secondary)' }}>Cargando total de bajas...</td></tr>
                ) : filteredPoolRows.map((row) => (
                  <tr key={`${row.datasetId}-${row.candidateId}-${row.rowNumber}`}>
                    <td>
                      <input type="checkbox" checked={selectedPoolIds.includes(String(row.candidateId))} onChange={() => setSelectedPoolIds((prev) => (prev.includes(String(row.candidateId)) ? prev.filter((item) => item !== String(row.candidateId)) : [...prev, String(row.candidateId)]))} />
                    </td>
                    <td>{safeValue(row.datasetName)}</td>
                    <td>{row.rowNumber}</td>
                    <td>{safeValue(row.documento)}</td>
                    <td>{row.contacto}</td>
                    <td>{safeValue(row.telefono)}</td>
                    <td>{safeValue(row.plan)}</td>
                    <td><Tag variant={poolStatusVariant(row.estado)}>{poolStatusLabel(row.estado)}</Tag></td>
                  </tr>
                ))}
                {!poolLoading && filteredPoolRows.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 16, color: 'var(--color-text-secondary)' }}>No hay bajas pendientes para mostrar.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {poolAssignOpen && (
        <div className="lot-wizard-overlay" onClick={() => setPoolAssignOpen(false)}>
          <div className="lot-wizard" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="lot-wizard-header">
              <div style={{ fontWeight: 700 }}>Asignar total de bajas</div>
              <button className="close-btn" onClick={() => setPoolAssignOpen(false)}><X size={16} /></button>
            </div>
            <div className="lot-wizard-content">
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                Seleccionados: <strong>{selectedPoolIds.length}</strong>
              </div>
              <label style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Vendedor</span>
                <select className="input" value={poolAssignSellerId} onChange={(event) => setPoolAssignSellerId(event.target.value)}>
                  <option value="">Seleccionar...</option>
                  {sellers.map((seller) => (
                    <option key={seller.id || seller.email} value={seller.id}>{seller.label || seller.email || 'Vendedor'}</option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button variant="ghost" onClick={() => setPoolAssignOpen(false)} disabled={poolAssigning}>Cancelar</Button>
                <Button onClick={handlePoolAssign} disabled={!poolAssignSellerId || poolAssigning}>
                  {poolAssigning ? 'Asignando...' : 'Confirmar asignacion'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
