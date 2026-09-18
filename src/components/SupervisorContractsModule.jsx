import React from 'react';
import { Filter, RefreshCw, X, Upload, Columns, ChevronDown, Clock, Archive, MoreHorizontal, Menu } from 'lucide-react';
import { buildApiUrl, getApiBaseUrl, getAccessToken, getApiClient } from '../services/apiClient.js';
import { formatDate } from '../utils/dateFormat.js';
import { useRolEfectivo } from '../hooks/useRolEfectivo.js';
import RecuperoProduccionView from './RecuperoProduccionView.jsx';
import RecuperoResultadosView from './RecuperoResultadosView.jsx';

const PAGE_SIZE = 50;
// Los 7 valores posibles de recupero_candidatos.resultado_gestion — usados
// como fallback del filtro cuando el backend todavía no devolvió
// `filters.resultado_gestion` (ej. mientras carga la primera página).
const RECUPERO_RESULTADO_GESTION_OPTIONS = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'no_contesta', label: 'No contesta' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'rellamar', label: 'Rellamar' },
  { value: 'rechazo', label: 'Rechazo' },
  { value: 'dato_erroneo', label: 'Dato erróneo' },
  { value: 'venta', label: 'Venta' }
];
const RECUPERO_RESULTADO_GESTION_LABELS = RECUPERO_RESULTADO_GESTION_OPTIONS.reduce((acc, o) => {
  acc[o.value] = o.label;
  return acc;
}, {});
const RECUPERO_TOP_TABS = [
  { key: 'recupero', label: 'Recupero' },
  { key: 'lotes', label: 'Lotes' },
  { key: 'produccion', label: 'En producción' },
  { key: 'resultados', label: 'Resultados' }
];
const RECUPERO_PRIORITARIO_MESES = 3;

const COLUMN_FILTERS_INITIAL = {
  contacto: '',
  documento: '',
  telefono: '',
  edad_min: '',
  edad_max: '',
  precio_min: '',
  precio_max: '',
  fecha_baja_desde: '',
  fecha_baja_hasta: '',
  departamento: [],
  producto: [],
  motivo_baja: [],
  ultimo_estado: [],
  lote: [],
  vendedor_asignado: []
};

const FILTER_COLUMN_CONFIG = {
  contacto: { type: 'text' },
  documento: { type: 'text' },
  telefono: { type: 'text' },
  edad: { type: 'rangeNumber' },
  precio: { type: 'rangeNumber' },
  fecha_baja: { type: 'dateRange' },
  departamento: { type: 'select', key: 'departamento' },
  producto: { type: 'select', key: 'producto' },
  motivo_baja: { type: 'select', key: 'motivo_baja' },
  ultimo_estado: { type: 'select', key: 'ultimo_estado' },
  lote: { type: 'select', key: 'lote' },
  vendedor_asignado: { type: 'select', key: 'vendedor_asignado' }
};

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

const isLocalDevToken = (token) => import.meta?.env?.DEV && (token === 'dev-token' || token === 'dev-id');

export default function SupervisorContractsModule({ Panel, Button, Tag, roleMeta, estadoUsuario, onOpenMobileMenu }) {
  // Esta vista excluye el <header className="topbar"> global (ver
  // condición en main.jsx) para ganar espacio vertical — junto con el
  // breadcrumb/fecha (puramente decorativos, sin otros consumidores) esa
  // barra traía el único botón que abre el menú lateral en pantallas
  // angostas (<1024px), así que se reubica acá. También se preserva el
  // indicador de "modo vista" (superadmin viendo Recupero como otro rol,
  // vía useRolEfectivo — el único lugar que hoy expone esto en vivo,
  // BotonVistaRol.jsx existe pero no está montado en ningún lado) y el tag
  // de "Inactivo", que si no se reubicaban quedaban invisibles en esta
  // ruta sin que nadie lo hubiera decidido explícitamente.
  const { rolReal, rolEfectivo, esVistaSimulada } = useRolEfectivo();
  const api = React.useMemo(() => getApiClient(), []);
  const [vistaActual, setVistaActual] = React.useState('recupero'); // 'recupero' | 'lotes' | 'detalle-lote' | 'produccion' | 'resultados'
  const [metrics, setMetrics] = React.useState({ total: 0, disponibles: 0, enLote: 0, recuperados: 0, rechazados: 0 });
  const [items, setItems] = React.useState([]);
  const [columnFiltersDraft, setColumnFiltersDraft] = React.useState({ ...COLUMN_FILTERS_INITIAL });
  const [columnFiltersApplied, setColumnFiltersApplied] = React.useState({ ...COLUMN_FILTERS_INITIAL });
  const [filterErrors, setFilterErrors] = React.useState({});
  const [openFilterColumn, setOpenFilterColumn] = React.useState('');
  const [orden, setOrden] = React.useState({ campo: '', direccion: 'asc' });
  const [sortDir, setSortDir] = React.useState('desc');
  const [filterOptions, setFilterOptions] = React.useState({ productos: [], departamentos: [], motivos: [], estados: [], vendedores: [], lotes: [] });
  const [filtersLoading, setFiltersLoading] = React.useState(false);
  const [filtersError, setFiltersError] = React.useState('');
  const defaultUltimoEstadoOptions = React.useMemo(() => ([
    'Nuevo',
    'Seguimiento',
    'Rellamar',
    'Rechazo',
    'Recuperado'
  ]), []);
  const ultimoEstadoOptions = React.useMemo(() => (
    filterOptions.estados?.length ? filterOptions.estados : defaultUltimoEstadoOptions
  ), [defaultUltimoEstadoOptions, filterOptions.estados]);
  const [columnsPanelOpen, setColumnsPanelOpen] = React.useState(false);
  const [visibleColumns, setVisibleColumns] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [showAssignModal, setShowAssignModal] = React.useState(false);
  const [assignContactIds, setAssignContactIds] = React.useState([]);
  const [assignSellerId, setAssignSellerId] = React.useState('');
  const [assignNotes, setAssignNotes] = React.useState('');
  const [assignLoteId, setAssignLoteId] = React.useState('');
  const [assignHasActiveProduct, setAssignHasActiveProduct] = React.useState(false);
  const [sellers, setSellers] = React.useState([]);
  const [creatingLot, setCreatingLot] = React.useState(false);
  const [loteSeleccionado, setLoteSeleccionado] = React.useState(null);
  const [lotesCreados, setLotesCreados] = React.useState([]);
  const [lotesLoading, setLotesLoading] = React.useState(false);
  const [lotesError, setLotesError] = React.useState('');
  const [showCreateLoteModal, setShowCreateLoteModal] = React.useState(false);
  const [createLoteNombre, setCreateLoteNombre] = React.useState('');
  const [createLoteSaving, setCreateLoteSaving] = React.useState(false);
  const [createLoteError, setCreateLoteError] = React.useState('');
  const [addDataOpen, setAddDataOpen] = React.useState(false);
  const [addDataContacts, setAddDataContacts] = React.useState([]);
  const [addDataLoading, setAddDataLoading] = React.useState(false);
  const [addDataError, setAddDataError] = React.useState('');
  const [addDataSelectedIds, setAddDataSelectedIds] = React.useState([]);
  const [addDataSaving, setAddDataSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('disponibles');
  const [segmentoRecupero, setSegmentoRecupero] = React.useState('prioritario'); // 'prioritario' | 'resto'
  const [segmentoCounts, setSegmentoCounts] = React.useState({ prioritario: null, resto: null });
  const [segmentoCountsError, setSegmentoCountsError] = React.useState({ prioritario: false, resto: false });
  const prioritarioCutoffDate = React.useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - RECUPERO_PRIORITARIO_MESES);
    return cutoff.toISOString().slice(0, 10);
  }, []);
  const restoCutoffDate = React.useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - RECUPERO_PRIORITARIO_MESES);
    cutoff.setDate(cutoff.getDate() - 1);
    return cutoff.toISOString().slice(0, 10);
  }, []);
  const [tabCounts, setTabCounts] = React.useState({
    disponibles: 0,
    nuevo: 0,
    no_contesta: 0,
    rellamar: 0,
    seguimiento: 0,
    recuperados: 0,
    rechazos: 0,
    dato_erroneo: 0
  });
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importFile, setImportFile] = React.useState(null);
  const [importRows, setImportRows] = React.useState([]);
  const [importErrors, setImportErrors] = React.useState([]);
  const [importSummary, setImportSummary] = React.useState(null);
  const [importPreviewLoading, setImportPreviewLoading] = React.useState(false);
  const [importPreviewNotice, setImportPreviewNotice] = React.useState('');
  const [importLoading, setImportLoading] = React.useState(false);
  const [importResult, setImportResult] = React.useState(null);
  const [importStep, setImportStep] = React.useState(1);
  const [importStats, setImportStats] = React.useState(null);
  const importPreviewRequestRef = React.useRef('');
  const lastPayloadRef = React.useRef('');
  const requestIdRef = React.useRef('');
  const lastInputAtRef = React.useRef(0);
  const selectAllRef = React.useRef(null);
  const [expandedRowId, setExpandedRowId] = React.useState(null);
  const [openRowMenuId, setOpenRowMenuId] = React.useState(null);
  const [openLoteMenuId, setOpenLoteMenuId] = React.useState(null);
  const [openVendorMenuId, setOpenVendorMenuId] = React.useState(null);
  const [cerradosExpanded, setCerradosExpanded] = React.useState(false);
  const [finalizeLoteTarget, setFinalizeLoteTarget] = React.useState(null);
  const [finalizeLoteLoading, setFinalizeLoteLoading] = React.useState(false);
  const [finalizeLoteError, setFinalizeLoteError] = React.useState('');
  const [detalleMetrics, setDetalleMetrics] = React.useState(null);
  const [detalleContacts, setDetalleContacts] = React.useState([]);
  const [detalleLoading, setDetalleLoading] = React.useState(false);
  const [detalleError, setDetalleError] = React.useState('');
  // Respuesta cruda de GET /recovery/datasets/:id — fuente correcta del
  // detalle de un lote de Recupero (dataset). detalleMetrics/detalleContacts
  // se derivan de acá (ver el efecto de carga) para no tener que tocar el
  // resto del componente que ya los consume.
  const [datasetDetail, setDatasetDetail] = React.useState(null);
  const [detalleSearch, setDetalleSearch] = React.useState('');
  const [detalleSearchDebounced, setDetalleSearchDebounced] = React.useState('');
  const [showDetalleSearch, setShowDetalleSearch] = React.useState(false);
  // Listado paginado/filtrable de candidatos del lote — GET
  // /recovery/datasets/:id/candidates (separado de datasetDetail, que solo
  // trae métricas + un `sample` de 5 filas).
  const [detalleContactsPage, setDetalleContactsPage] = React.useState(1);
  const [detalleContactsTotal, setDetalleContactsTotal] = React.useState(0);
  const [detalleContactsLoading, setDetalleContactsLoading] = React.useState(false);
  const [detalleContactsError, setDetalleContactsError] = React.useState('');
  const [detalleMotivoBajaFilter, setDetalleMotivoBajaFilter] = React.useState('');
  const [detalleResultadoFilter, setDetalleResultadoFilter] = React.useState('');
  const [detalleFilterOptions, setDetalleFilterOptions] = React.useState({ motivo_baja: [], resultado_gestion: [] });
  const [lastSyncAt, setLastSyncAt] = React.useState(null);
  const [syncNow, setSyncNow] = React.useState(Date.now());
  const [addSellerOpen, setAddSellerOpen] = React.useState(false);
  const [addSellerTarget, setAddSellerTarget] = React.useState('');
  const [addSellerError, setAddSellerError] = React.useState('');
  const [removeModal, setRemoveModal] = React.useState(null);
  const [removeStep, setRemoveStep] = React.useState(1);
  const [removeMode, setRemoveMode] = React.useState('specific');
  const [reassignTarget, setReassignTarget] = React.useState('');
  const [reassignError, setReassignError] = React.useState('');
  const [sellerMutationLoading, setSellerMutationLoading] = React.useState(false);
  const [sellerMutationFeedback, setSellerMutationFeedback] = React.useState({ type: '', message: '' });

  const isImportSuccess = (result) => {
    if (!result) return false;
    if (result.ok === true || result.success === true) return true;
    return result.data?.ok === true || result.data?.success === true;
  };

  const getImportMessage = (result) => (
    result?.message
    || result?.data?.message
    || (isImportSuccess(result) ? 'Importación completada.' : 'No se pudo importar.')
  );

  const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));

  const normalizeRecuperoRow = React.useCallback((row) => {
    if (!row || typeof row !== 'object') return row;
    return {
      ...row,
      vendedor_asignado:
        row.vendedor_asignado
        || row.vendedor_asignado_nombre
        || row.seller_name
        || null,
      ultima_gestion:
        row.ultima_gestion
        || row.fecha_ultima_gestion
        || row.ultima_gestion_real
        || null,
      ultimo_estado_gestion:
        row.ultimo_estado_gestion
        || row.ultimo_estado
        || row.estado_ultima_gestion
        || row.ultima_gestion_estado
        || row.estado
        || null
    };
  }, []);

  const visibleItems = React.useMemo(() => (
    Array.isArray(items) ? items.map(normalizeRecuperoRow) : []
  ), [items, normalizeRecuperoRow]);

  const allColumns = React.useMemo(() => ([
    { id: 'contacto', label: 'Contacto', required: true },
    { id: 'documento', label: 'Documento' },
    { id: 'edad', label: 'Edad' },
    { id: 'telefono', label: 'Teléfono' },
    { id: 'departamento', label: 'Departamento' },
    { id: 'producto', label: 'Producto' },
    { id: 'precio', label: 'Precio' },
    { id: 'fecha_baja', label: 'Fecha de baja' },
    { id: 'motivo_baja', label: 'Motivo de baja' },
    { id: 'lote', label: 'Lote' },
    { id: 'vendedor_asignado', label: 'Vendedor asignado' },
    { id: 'ultimo_estado', label: 'Último estado' },
    { id: 'ultima_gestion', label: 'Última gestión' }
  ]), []);

  const isColumnVisible = React.useCallback((id) => {
    if (!visibleColumns.length) return true;
    return visibleColumns.includes(id);
  }, [visibleColumns]);

  const ensureDefaultColumns = React.useCallback(() => {
    if (visibleColumns.length) return;
    setVisibleColumns(allColumns.map((col) => col.id));
  }, [allColumns, visibleColumns.length]);

  const loadFilters = React.useCallback(async () => {
    setFiltersLoading(true);
    setFiltersError('');
    try {
      const response = await api.get('/api/recupero/filtros');
      const productos = response?.productos
        || response?.data?.productos
        || response?.producto
        || response?.data?.producto
        || [];
      const departamentos = response?.departamentos
        || response?.data?.departamentos
        || response?.departamento
        || response?.data?.departamento
        || [];
      const motivos = response?.motivos
        || response?.data?.motivos
        || response?.motivo_baja
        || response?.data?.motivo_baja
        || [];
      const estados = response?.estados
        || response?.data?.estados
        || response?.ultimo_estado
        || response?.data?.ultimo_estado
        || [];
      const vendedores = response?.vendedores
        || response?.data?.vendedores
        || response?.vendedor_asignado
        || response?.data?.vendedor_asignado
        || [];
      const lotes = response?.lotes
        || response?.data?.lotes
        || response?.lote
        || response?.data?.lote
        || [];
      setFilterOptions({
        productos: Array.isArray(productos) ? productos : [],
        departamentos: Array.isArray(departamentos) ? departamentos : [],
        motivos: Array.isArray(motivos) ? motivos : [],
        estados: Array.isArray(estados) ? estados : [],
        vendedores: Array.isArray(vendedores) ? vendedores : [],
        lotes: Array.isArray(lotes) ? lotes : []
      });
    } catch {
      setFilterOptions({ productos: [], departamentos: [], motivos: [], estados: [], vendedores: [], lotes: [] });
      setFiltersError('No se pudieron cargar los catálogos.');
    } finally {
      setFiltersLoading(false);
    }
  }, [api]);

  const loadSellers = React.useCallback(async () => {
    try {
      const response = await api.get('/api/supervisor/agents');
      const itemsList = response?.agents
        || response?.items
        || response?.data?.agents
        || response?.data?.items
        || response?.data
        || [];
      const normalized = (Array.isArray(itemsList) ? itemsList : []).map((seller) => ({
        id: String(seller?.id || seller?.agent_id || seller?.agente_id || seller?.user_id || ''),
        nombre: seller?.nombre || seller?.name || seller?.first_name || '',
        apellido: seller?.apellido || seller?.last_name || '',
        email: seller?.email || '',
        label: `${seller?.nombre || seller?.name || ''} ${seller?.apellido || seller?.last_name || ''}`.trim() || seller?.email || seller?.username || ''
      }));
      setSellers(normalized);
    } catch {
      setSellers([]);
    }
  }, [api]);

  const loadLotesCreados = React.useCallback(async () => {
    setLotesLoading(true);
    setLotesError('');
    try {
      // GET /recovery/datasets devuelve un array plano (no {items:[...]}),
      // cada elemento ya viene como {id, name, status, counts, ...} —
      // reemplaza a GET /api/recupero/lotes (leía lead_batches, tabla que
      // POST /api/recupero/lotes nunca escribe).
      const response = await api.get('/recovery/datasets');
      const itemsList = Array.isArray(response) ? response : (response?.items || response?.data || []);
      const nextItems = Array.isArray(itemsList) ? itemsList : [];
      setLotesCreados(nextItems);
      setLastSyncAt(Date.now());
      return nextItems;
    } catch (err) {
      setLotesError(err?.message || 'No se pudieron cargar los lotes.');
      setLotesCreados([]);
      return [];
    } finally {
      setLotesLoading(false);
    }
  }, [api]);


  const formatDateTime = (value) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString('es-UY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const markSync = React.useCallback(() => {
    setLastSyncAt(Date.now());
  }, []);

  React.useEffect(() => {
    const timer = setInterval(() => setSyncNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const syncLabel = React.useMemo(() => {
    if (!lastSyncAt) return 'Sincronizado con Clientes · pendiente';
    const diffMinutes = Math.max(0, Math.floor((syncNow - lastSyncAt) / 60000));
    if (diffMinutes < 1) return 'Sincronizado con Clientes · hace instantes';
    if (diffMinutes === 1) return 'Sincronizado con Clientes · hace 1 min';
    return `Sincronizado con Clientes · hace ${diffMinutes} min`;
  }, [lastSyncAt, syncNow]);

  const downloadRowsAsCsv = React.useCallback((rows, fileName) => {
    if (!Array.isArray(rows) || !rows.length) return;
    const headers = Object.keys(rows[0]);
    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [headers.join(','), ...rows.map((row) => headers.map((key) => escape(row[key])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'recupero-export.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, []);

  const formatLoteSeller = (lote) => {
    const assigneesCount = Number(lote?.assignees_count || 0);
    if (assigneesCount > 1) return `${assigneesCount} vendedores`;
    return (
      lote?.assignee_name
      || lote?.vendedor_asignado
      || lote?.seller
      || lote?.seller_name
      || lote?.vendedor_nombre
      || (Array.isArray(lote?.vendedores) ? lote.vendedores.map((v) => `${v.nombre || ''} ${v.apellido || ''}`.trim()).join(', ') : '')
      || 'Sin asignar'
    );
  };

  const formatLoteCount = (lote) => (
    lote?.counts?.total
    ?? lote?.cantidad_datos
    ?? lote?.cantidad
    ?? lote?.count
    ?? lote?.total
    ?? lote?.contactos
    ?? 0
  );

  // Único criterio de "lote cerrado" para toda la vista de Recupero (badge
  // de estado, agrupado Abiertos/Cerrados del listado, y bloqueo de
  // acciones de edición en el detalle) — el campo real dataset_status
  // (expuesto como status/estado según el objeto), nunca un heurístico como
  // "100% gestionado": un lote con todo gestionado pero sin finalizar sigue
  // técnicamente abierto, solo que no le queda nada por trabajar.
  const isLoteDatasetCerrado = (lote) => String(lote?.status || lote?.estado || '').toLowerCase() === 'cerrado';

  const getFilterOptionsForKey = React.useCallback((key) => {
    if (key === 'departamento') return filterOptions.departamentos;
    if (key === 'producto') return filterOptions.productos;
    if (key === 'motivo_baja') return filterOptions.motivos;
    if (key === 'ultimo_estado') return ultimoEstadoOptions;
    if (key === 'lote') return filterOptions.lotes;
    if (key === 'vendedor_asignado') return filterOptions.vendedores.length ? filterOptions.vendedores : sellers;
    return [];
  }, [filterOptions, sellers, ultimoEstadoOptions]);

  const MOTIVO_LABELS = {
    fallecimiento: { label: 'Fallecimiento', color: '#DC2626' },
    voluntaria: { label: 'Baja voluntaria', color: '#92400E' },
    falta_de_pago: { label: 'Falta de pago', color: '#854F0B' },
    sin_liquidez: { label: 'Sin liquidez', color: '#854F0B' },
    baja_antel: { label: 'Baja desde Antel', color: '#185FA5' },
    baja_bps: { label: 'Baja desde BPS', color: '#185FA5' },
    sin_pago_bps: { label: 'Sin pago BPS', color: '#854F0B' },
    administrativa: { label: 'Administrativa', color: '#5F5E5A' },
    auditoria: { label: 'Auditoría', color: '#5F5E5A' },
    error_activacion: { label: 'Error de activación', color: '#5F5E5A' },
    no_llamar: { label: 'No llamar', color: '#DC2626' },
    sin_detalle: { label: 'Sin detalle', color: 'var(--color-text-secondary)' },
    otro_servicio: { label: 'Cuenta con otro servicio', color: 'var(--color-text-secondary)' },
    otro: { label: 'Otro', color: 'var(--color-text-secondary)' }
  };

  const getMotivoInfo = (contact) => {
    const key = String(
      contact?.motivo_normalizado
      ?? contact?.motivoNormalizado
      ?? contact?.motivo_normalized
      ?? ''
    ).trim().toLowerCase();
    return MOTIVO_LABELS[key] || { label: 'Sin especificar', color: 'var(--color-text-secondary)' };
  };

  const asLotId = (lote) => String(lote?.id || lote?.batch_id || lote?.lote_id || lote?.lead_batch_id || '');
  const asLotName = (lote) => lote?.nombre || lote?.name || lote?.lote_nombre || '—';
  const asLotCreatedAt = (lote) => lote?.created_at || lote?.fecha_creacion || lote?.createdAt || null;
  const asLotCount = (lote) => Number(formatLoteCount(lote) || 0);
  const asLotSellerName = (lote) => formatLoteSeller(lote);
  const asLotSellers = (lote) => (Array.isArray(lote?.vendedores) ? lote.vendedores : []);
  const formatSellerListLabel = (sellerList = []) => (
    (Array.isArray(sellerList) ? sellerList : [])
      .map((seller) => `${seller?.nombre || ''} ${seller?.apellido || ''}`.trim())
      .filter(Boolean)
      .join(', ')
  );

  const buildSelectedLot = React.useCallback((lote) => {
    if (!lote) return null;
    return {
      ...lote,
      id: asLotId(lote),
      nombre: asLotName(lote),
      createdAt: asLotCreatedAt(lote),
      sellerName: asLotSellerName(lote),
      total_contactos: Number(lote?.total_contactos || lote?.contactos || formatLoteCount(lote) || 0),
      vendedores: asLotSellers(lote)
    };
  }, []);

  const buildAuthHeaders = React.useCallback(async () => {
    const token = await getAccessToken();
    const headers = { 'Content-Type': 'application/json' };
    if (isLocalDevToken(token)) {
      const devRoleOverride = readDevOverride(DEV_LOCAL_STORAGE_KEYS.role);
      const devEmailOverride = readDevOverride(DEV_LOCAL_STORAGE_KEYS.email);
      const devSubOverride = readDevOverride(DEV_LOCAL_STORAGE_KEYS.sub);
      headers['X-Dev-Auth'] = 'true';
      headers['X-Dev-User-Email'] = devEmailOverride || import.meta.env?.VITE_LOCAL_DEV_USER_EMAIL || 'admin@local.test';
      headers['X-Dev-User-Role'] = devRoleOverride || import.meta.env?.VITE_LOCAL_DEV_USER_ROLE || 'superadministrador';
      const devSub = devSubOverride || import.meta.env?.VITE_LOCAL_DEV_USER_SUB;
      if (devSub) {
        headers['X-Dev-User-Sub'] = devSub;
      }
    } else if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }, []);

  React.useEffect(() => {
    if (vistaActual !== 'lotes') return;
    loadLotesCreados();
  }, [loadLotesCreados, vistaActual]);

  React.useEffect(() => {
    loadLotesCreados();
  }, [loadLotesCreados]);

  React.useEffect(() => {
    if (vistaActual !== 'detalle-lote') return;
    if (!loteSeleccionado?.id) return;
    let active = true;
    setDetalleLoading(true);
    setDetalleError('');
    setDetalleMetrics(null);
    setDetalleContacts([]);
    setDatasetDetail(null);
    setDetalleContactsPage(1);
    setDetalleSearch('');
    setDetalleSearchDebounced('');
    setDetalleMotivoBajaFilter('');
    setDetalleResultadoFilter('');
    setDetalleFilterOptions({ motivo_baja: [], resultado_gestion: [] });
    // GET /recovery/datasets/:id es la fuente correcta para el detalle de un
    // lote de Recupero (dataset de recupero_import_jobs) — reemplaza a los 3
    // fallbacks anteriores (/lead-batches/:id/metrics, /leads/assigned?batch_id=,
    // /api/recupero/contactos?lote_id=/lote=), que apuntaban a lead_batches /
    // batch_id, un concepto que recupero_candidatos no usa en la práctica
    // (la auditoría de esta sesión confirmó que batch_id nunca se escribe
    // en esa tabla — quedó siempre en NULL).
    api.get(`/recovery/datasets/${encodeURIComponent(loteSeleccionado.id)}`)
      .then((res) => {
        if (!active) return;
        setDatasetDetail(res || null);
        const counts = res?.counts || {};
        setDetalleMetrics({
          informe: {
            total_contactos: counts.total || 0,
            total_vendidos: counts.recovered || 0,
            total_rechazos: counts.rejected || 0,
            total_no_contesta: 0,
            total_dato_erroneo: 0,
            total_en_proceso: counts.in_progress || 0,
            total_incontactables: 0
          }
        });
        // El listado de candidatos (antes `res.sample`, capado a 5 filas) se
        // carga por separado desde GET /recovery/datasets/:id/candidates —
        // ver el efecto de más abajo, que además maneja paginación real,
        // búsqueda por teléfono y filtros.
        setLastSyncAt(Date.now());
      })
      .catch((err) => {
        if (!active) return;
        // 401 acá casi siempre es el token de sesión vencido (Cognito) — el
        // backend nunca compone el mensaje "Unauthorized" a secas (ver
        // index.mjs), ese es el body por default de API Gateway cuando su
        // JWT authorizer rechaza la request antes de que llegue al Lambda.
        // apiClient.js ya dispara un redirect automático al login en este
        // caso (ver setUnauthorizedHandler en AuthGate); este mensaje es
        // solo el texto que se alcanza a ver antes de que eso ocurra. 403 sí
        // es un problema real de permisos (autenticado, pero sin acceso a
        // este lote puntual) y no dispara ningún redirect.
        if (err?.status === 401) {
          setDetalleError('Tu sesión venció — te vamos a redirigir para iniciar sesión de nuevo.');
        } else if (err?.status === 403) {
          setDetalleError('No tenés permisos para ver el detalle de este lote.');
        } else {
          setDetalleError(err?.message || 'No se pudo cargar el detalle del lote.');
        }
      })
      .finally(() => {
        if (!active) return;
        setDetalleLoading(false);
      });
    return () => { active = false; };
  }, [api, loteSeleccionado?.id, vistaActual]);

  // Debounce de la búsqueda por teléfono/celular — evita disparar una
  // consulta al backend en cada tecla. Al cambiar el término, vuelve a la
  // página 1 (si no, se podría quedar en una página que ya no existe para
  // el nuevo resultado filtrado).
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDetalleSearchDebounced(detalleSearch.trim());
      setDetalleContactsPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [detalleSearch]);

  // Listado paginado/filtrable de candidatos del lote — GET
  // /recovery/datasets/:id/candidates (con búsqueda por teléfono y filtros
  // por motivo de baja / resultado de gestión).
  React.useEffect(() => {
    if (vistaActual !== 'detalle-lote') return;
    if (!loteSeleccionado?.id) return;
    let active = true;
    setDetalleContactsLoading(true);
    setDetalleContactsError('');
    const params = new URLSearchParams();
    params.set('page', String(detalleContactsPage));
    params.set('limit', String(PAGE_SIZE));
    if (detalleSearchDebounced) params.set('search', detalleSearchDebounced);
    if (detalleMotivoBajaFilter) params.set('motivo_baja', detalleMotivoBajaFilter);
    if (detalleResultadoFilter) params.set('resultado_gestion', detalleResultadoFilter);
    api.get(`/recovery/datasets/${encodeURIComponent(loteSeleccionado.id)}/candidates?${params.toString()}`)
      .then((res) => {
        if (!active) return;
        setDetalleContacts((res?.items || []).map((row) => ({
          id: row.id ?? row.row_number,
          nombre: row.client_name,
          documento: row.document,
          telefono: row.phone,
          motivo_baja: row.churn_reason,
          producto: row.previous_plan,
          estado: row.status,
          estado_venta: row.resultado_gestion,
          fecha_baja: row.fecha_baja || null,
          seller_name: row.seller_name || null
        })));
        setDetalleContactsTotal(Number(res?.total || 0));
        setDetalleFilterOptions({
          motivo_baja: Array.isArray(res?.filters?.motivo_baja) ? res.filters.motivo_baja : [],
          resultado_gestion: Array.isArray(res?.filters?.resultado_gestion) ? res.filters.resultado_gestion : []
        });
      })
      .catch((err) => {
        if (!active) return;
        setDetalleContactsError(err?.message || 'No se pudo cargar el listado de candidatos.');
      })
      .finally(() => {
        if (!active) return;
        setDetalleContactsLoading(false);
      });
    return () => { active = false; };
  }, [
    api,
    loteSeleccionado?.id,
    vistaActual,
    detalleContactsPage,
    detalleSearchDebounced,
    detalleMotivoBajaFilter,
    detalleResultadoFilter
  ]);

  // Desglose por vendedor: hoy viene de recupero_asignaciones_rango (rangos),
  // que no ve las asignaciones hechas por /direct-assignments o /distribute
  // (no escriben ahí) — TODO(backend): corregir para que cuente por
  // recupero_candidatos.seller_id directo, que sí refleja los 3 mecanismos.
  React.useEffect(() => {
    if (!datasetDetail?.assignments) return;
    setLoteSeleccionado((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        vendedores: datasetDetail.assignments.map((a) => ({
          id: a.seller_id,
          nombre: a.seller_name || 'Vendedor',
          apellido: '',
          total_contactos: a.counts?.assigned || 0,
          gestionados: Math.max(0, (a.counts?.assigned || 0) - (a.counts?.pending || 0)),
          ventas: a.counts?.recovered || 0,
          pendientes_gestion: a.counts?.pendientes_gestion || 0
        }))
      };
    });
  }, [datasetDetail]);

  React.useEffect(() => {
    if (vistaActual !== 'detalle-lote') return;
    if (!loteSeleccionado?.id) return;
    const refreshedLot = lotesCreados.find((lot) => asLotId(lot) === String(loteSeleccionado.id));
    if (!refreshedLot) return;
    let nextSelected = buildSelectedLot(refreshedLot);
    if (!nextSelected) return;
    setLoteSeleccionado((prev) => {
      if (
        prev
        && Array.isArray(prev.vendedores)
        && prev.vendedores.length
        && (
          !Array.isArray(refreshedLot?.vendedores)
          || refreshedLot.vendedores.length === 0
        )
      ) {
        nextSelected = {
          ...nextSelected,
          vendedores: prev.vendedores,
          sellerName: formatSellerListLabel(prev.vendedores) || nextSelected.sellerName
        };
      }
      const prevSnapshot = JSON.stringify({
        id: prev?.id,
        sellerName: prev?.sellerName,
        total_contactos: prev?.total_contactos,
        vendedores: prev?.vendedores
      });
      const nextSnapshot = JSON.stringify({
        id: nextSelected.id,
        sellerName: nextSelected.sellerName,
        total_contactos: nextSelected.total_contactos,
        vendedores: nextSelected.vendedores
      });
      return prevSnapshot === nextSnapshot ? prev : nextSelected;
    });
  }, [buildSelectedLot, formatSellerListLabel, lotesCreados, loteSeleccionado?.id, vistaActual]);

  const getMotivoColor = (value) => {
    const raw = (value ?? '').toString().trim().toUpperCase();
    if (!raw || raw === 'SIN ESPECIFICAR') return 'var(--color-text-secondary)';
    if (raw.includes('FALLECIMIENTO')) return '#DC2626';
    if (raw.includes('FALTA DE PAGO') || raw.includes('SIN PAGO') || raw.includes('MOROSIDAD')) return '#92400E';
    return 'var(--color-text-secondary)';
  };
  const getVendedorAsignado = (row) => (
    row?.vendedor_asignado
    || row?.vendedor_asignado_nombre
    || row?.seller_name
    || null
  );
  const getFechaUltimaGestion = (row) => (
    row?.ultima_gestion
    || row?.fecha_ultima_gestion
    || row?.ultima_gestion_real
    || null
  );

  const formatTelefono = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 9) return digits.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
    if (digits.length === 8) return digits.replace(/(\d{4})(\d{4})/, '$1 $2');
    return String(value || '');
  };

  const getContactoNombre = React.useCallback((row) => (
    [row?.nombre, row?.apellido].filter(Boolean).join(' ')
    || [row?.contacto_nombre, row?.contacto_apellido].filter(Boolean).join(' ')
    || row?.contacto
    || '—'
  ), []);

  const detectActiveProduct = (row) => Boolean(
    row?.producto_activo
    || row?.productoActivo
    || row?.tiene_producto_activo
    || row?.tieneProductoActivo
    || row?.cliente_activo
    || row?.estado_cliente === 'activo'
  );

  // Nombres de los lotes fijos por segmento — para preseleccionar el lote
  // destino del modal "Asignar contacto" según el segmento activo
  // (Prioritario/Resto). Comparación por substring en minúsculas, no exige
  // un flag dedicado del backend (que todavía no existe — ver tarea de
  // backend pendiente). Si no hay match (p. ej. los lotes fijos todavía no
  // se crearon), simplemente no preselecciona nada, sin romper el flujo.
  const FIXED_LOTE_MATCH_BY_SEGMENTO = { prioritario: 'prioritario', resto: 'general de recupero' };

  const openAssign = React.useCallback(async (contactIds = [], row = null) => {
    const ids = Array.isArray(contactIds) ? contactIds.filter(Boolean) : [];
    if (!ids.length) return;
    setAssignContactIds(ids);
    setAssignSellerId('');
    setAssignNotes('');
    setAssignLoteId('');
    const rows = Array.isArray(visibleItems) ? visibleItems : [];
    const hasActive = row ? detectActiveProduct(row) : ids.some((id) => detectActiveProduct(rows.find((it) => String(it?.id) === String(id))));
    setAssignHasActiveProduct(Boolean(hasActive));
    setShowAssignModal(true);
    loadSellers();
    const freshLotes = await loadLotesCreados();
    // El supervisor puede seguir cambiando el lote a mano — por ejemplo para
    // reasignar a un vendedor original específico, independiente del segmento.
    const matchKey = FIXED_LOTE_MATCH_BY_SEGMENTO[segmentoRecupero];
    if (matchKey) {
      const match = (Array.isArray(freshLotes) ? freshLotes : []).find((lote) => (
        String(asLotName(lote) || '').toLowerCase().includes(matchKey)
      ));
      if (match) {
        setAssignLoteId(asLotId(match));
      }
    }
  }, [loadLotesCreados, loadSellers, segmentoRecupero, visibleItems]);

  const closeAssign = React.useCallback(() => {
    setShowAssignModal(false);
    setAssignContactIds([]);
    setAssignSellerId('');
    setAssignNotes('');
    setAssignHasActiveProduct(false);
    setAssignLoteId('');
  }, []);

  const openLotDetail = React.useCallback((lote) => {
    const nextLot = buildSelectedLot(lote);
    if (!nextLot?.id) return;
    setSellerMutationFeedback({ type: '', message: '' });
    setLoteSeleccionado(nextLot);
    setVistaActual('detalle-lote');
  }, [buildSelectedLot]);

  const refreshSelectedLot = React.useCallback(async (lotId, options = {}) => {
    if (!lotId) return null;
    const nextLotes = await loadLotesCreados();
    const refreshedLot = (Array.isArray(nextLotes) ? nextLotes : []).find((lot) => asLotId(lot) === String(lotId));
    let nextSelected = buildSelectedLot(refreshedLot);
    if (
      nextSelected
      && Array.isArray(options.preserveVendedores)
      && (
        !Array.isArray(refreshedLot?.vendedores)
        || refreshedLot.vendedores.length === 0
      )
    ) {
      nextSelected = {
        ...nextSelected,
        vendedores: options.preserveVendedores,
        sellerName: formatSellerListLabel(options.preserveVendedores) || nextSelected.sellerName
      };
    }
    if (nextSelected) {
      setLoteSeleccionado(nextSelected);
    }
    return nextSelected;
  }, [buildSelectedLot, formatSellerListLabel, loadLotesCreados]);

  const openAddSellerModal = React.useCallback(() => {
    if (!loteSeleccionado?.id) return;
    setAddSellerTarget('');
    setAddSellerError('');
    setSellerMutationFeedback({ type: '', message: '' });
    setAddSellerOpen(true);
    loadSellers();
  }, [loadSellers, loteSeleccionado?.id]);

  const closeAddSellerModal = React.useCallback(() => {
    setAddSellerOpen(false);
    setAddSellerTarget('');
    setAddSellerError('');
  }, []);

  const closeCreateLoteModal = React.useCallback(() => {
    setShowCreateLoteModal(false);
    setCreateLoteNombre('');
    setCreateLoteError('');
  }, []);

  const handleCreateLoteVacio = React.useCallback(async () => {
    const nombre = createLoteNombre.trim();
    if (!nombre) return;
    setCreateLoteSaving(true);
    setCreateLoteError('');
    try {
      await api.post('/recovery/datasets', { dataset_name: nombre });
      closeCreateLoteModal();
      loadLotesCreados();
    } catch (err) {
      setCreateLoteError(err?.message || 'No se pudo crear el lote.');
    } finally {
      setCreateLoteSaving(false);
    }
  }, [api, closeCreateLoteModal, createLoteNombre, loadLotesCreados]);

  const openAddDataModal = React.useCallback(async () => {
    if (!loteSeleccionado?.id) return;
    setAddDataOpen(true);
    setAddDataError('');
    setAddDataSelectedIds([]);
    setAddDataLoading(true);
    try {
      const response = await api.post('/api/recupero/contactos/search', {
        tab: 'disponibles',
        filters: {},
        page: 1,
        limit: 100
      });
      const rows = response?.items || response?.data?.items || [];
      setAddDataContacts(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setAddDataError(err?.message || 'No se pudieron cargar los contactos disponibles.');
      setAddDataContacts([]);
    } finally {
      setAddDataLoading(false);
    }
  }, [api, loteSeleccionado?.id]);

  const closeAddDataModal = React.useCallback(() => {
    setAddDataOpen(false);
    setAddDataContacts([]);
    setAddDataSelectedIds([]);
    setAddDataError('');
  }, []);

  const toggleAddDataSelection = React.useCallback((id) => {
    setAddDataSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  const handleConfirmAddData = React.useCallback(async () => {
    if (!loteSeleccionado?.id || !addDataSelectedIds.length) return;
    setAddDataSaving(true);
    setAddDataError('');
    try {
      const sellerIds = (loteSeleccionado?.vendedores || []).map((seller) => seller?.id).filter(Boolean);
      // TODO: no existe hoy un endpoint que vincule contactos a un lote de Recupero
      // ya creado (batch_id). Como mejor esfuerzo, se asignan al mismo vendedor del
      // lote — falta la vinculación formal cuando el backend la soporte.
      await api.post('/api/recupero/lotes', {
        nombre: loteSeleccionado?.nombre || getAssignmentLotName(),
        contact_ids: addDataSelectedIds,
        seller_ids: sellerIds
      });
      closeAddDataModal();
      await refreshSelectedLot(loteSeleccionado.id);
      await loadLotesCreados();
    } catch (err) {
      setAddDataError(err?.message || 'No se pudo agregar los datos al lote.');
    } finally {
      setAddDataSaving(false);
    }
  }, [addDataSelectedIds, api, closeAddDataModal, loadLotesCreados, loteSeleccionado, refreshSelectedLot]);

  const openFinalizeLoteModal = React.useCallback((lote) => {
    setFinalizeLoteError('');
    setFinalizeLoteTarget(lote);
  }, []);

  const closeFinalizeLoteModal = React.useCallback(() => {
    if (finalizeLoteLoading) return;
    setFinalizeLoteTarget(null);
    setFinalizeLoteError('');
  }, [finalizeLoteLoading]);

  const handleConfirmFinalizeLote = React.useCallback(async () => {
    const lotId = asLotId(finalizeLoteTarget);
    if (!lotId) return;
    setFinalizeLoteLoading(true);
    setFinalizeLoteError('');
    try {
      // Depende de POST /recovery/datasets/:id/finalize (tarea-finalizar-lote-backend.md).
      await api.post(`/recovery/datasets/${encodeURIComponent(lotId)}/finalize`);
      setFinalizeLoteTarget(null);
      if (loteSeleccionado?.id === lotId) {
        // Se puede disparar desde el propio detalle de lote (botón "Cerrar
        // lote") — refrescar loteSeleccionado para que el badge y los
        // botones reflejen el cierre sin tener que salir y volver a entrar.
        await refreshSelectedLot(lotId);
      } else {
        await loadLotesCreados();
      }
    } catch (err) {
      setFinalizeLoteError(err?.message || 'No se pudo finalizar el lote.');
    } finally {
      setFinalizeLoteLoading(false);
    }
  }, [api, finalizeLoteTarget, loadLotesCreados, loteSeleccionado?.id, refreshSelectedLot]);

  const openRemoveSellerModal = React.useCallback((payload, options = {}) => {
    setRemoveModal(payload);
    setRemoveStep(options.step || 1);
    setRemoveMode(options.mode || 'specific');
    setReassignTarget('');
    setReassignError('');
    setSellerMutationFeedback({ type: '', message: '' });
  }, []);

  const closeRemoveSellerModal = React.useCallback(() => {
    setRemoveModal(null);
    setRemoveStep(1);
    setRemoveMode('specific');
    setReassignTarget('');
    setReassignError('');
  }, []);

  const handleAddSeller = React.useCallback(async () => {
    if (!loteSeleccionado?.id) return;
    if (!addSellerTarget) {
      setAddSellerError('Selecciona un vendedor.');
      return;
    }
    setSellerMutationLoading(true);
    setAddSellerError('');
    try {
      const headers = await buildAuthHeaders();
      const response = await fetch(buildApiUrl(`/lead-batches/${loteSeleccionado.id}/add-seller`, getApiBaseUrl()), {
        method: 'POST',
        headers,
        body: JSON.stringify({ seller_id: addSellerTarget })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'No se pudo agregar el vendedor.');
      }
      const optimisticVendedores = Array.isArray(data?.distribution)
        ? data.distribution.map((item) => ({
            id: String(item?.seller_id || ''),
            nombre: item?.nombre || '',
            apellido: '',
            total_contactos: Number(item?.cantidad || 0),
            gestionados: Number(item?.gestionados || 0)
          }))
        : null;
      if (optimisticVendedores?.length) {
        setLoteSeleccionado((prev) => (
          prev ? {
            ...prev,
            vendedores: optimisticVendedores,
            sellerName: formatSellerListLabel(optimisticVendedores) || prev.sellerName
          } : prev
        ));
      }
      closeAddSellerModal();
      setSellerMutationFeedback({ type: 'success', message: 'Vendedor agregado al lote correctamente.' });
      void refreshSelectedLot(loteSeleccionado.id, {
        preserveVendedores: optimisticVendedores
      });
    } catch (err) {
      setAddSellerError(err?.message || 'No se pudo agregar el vendedor.');
    } finally {
      setSellerMutationLoading(false);
    }
  }, [addSellerTarget, buildAuthHeaders, closeAddSellerModal, formatSellerListLabel, loteSeleccionado?.id, refreshSelectedLot]);

  const handleRemoveSeller = React.useCallback(async () => {
    if (!loteSeleccionado?.id || !removeModal?.sellerId) return;
    if (!removeMode) {
      setReassignError('Selecciona una opcion.');
      return;
    }
    if (removeMode === 'specific' && !reassignTarget) {
      setReassignError('Selecciona un vendedor destino.');
      return;
    }
    setSellerMutationLoading(true);
    setReassignError('');
    try {
      const headers = await buildAuthHeaders();
      const response = await fetch(buildApiUrl(`/lead-batches/${loteSeleccionado.id}/remove-seller`, getApiBaseUrl()), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          seller_id: removeModal.sellerId,
          mode: removeMode,
          new_seller_id: reassignTarget || undefined
        })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'No se pudo quitar el vendedor.');
      }
      await refreshSelectedLot(loteSeleccionado.id);
      closeRemoveSellerModal();
      setSellerMutationFeedback({
        type: 'success',
        message: removeMode === 'specific'
          ? 'Contactos reasignados y vendedor quitado correctamente.'
          : removeMode === 'roundrobin'
            ? 'Contactos redistribuidos y vendedor quitado correctamente.'
            : 'Vendedor quitado; los contactos quedaron sin asignar dentro del lote.'
      });
    } catch (err) {
      setReassignError(err?.message || 'No se pudo completar la operacion.');
    } finally {
      setSellerMutationLoading(false);
    }
  }, [buildAuthHeaders, closeRemoveSellerModal, loteSeleccionado?.id, reassignTarget, refreshSelectedLot, removeModal?.sellerId, removeMode]);

  const getAssignmentLotName = () => {
    const now = new Date();
    const ymd = now.toLocaleDateString('en-CA');
    const hm = now.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' });
    return `Asignación recupero ${ymd} ${hm}`;
  };

  const toNumberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  };

  const validateColumnFilters = (filters) => {
    const errors = {};
    const edadMin = toNumberOrNull(filters.edad_min);
    const edadMax = toNumberOrNull(filters.edad_max);
    if (edadMin !== null && edadMax !== null && edadMin > edadMax) {
      errors.edad = 'Rango de edad inválido.';
    }
    const precioMin = toNumberOrNull(filters.precio_min);
    const precioMax = toNumberOrNull(filters.precio_max);
    if (precioMin !== null && precioMax !== null && precioMin > precioMax) {
      errors.precio = 'Rango de precio inválido.';
    }
    if (filters.fecha_baja_desde && filters.fecha_baja_hasta && filters.fecha_baja_desde > filters.fecha_baja_hasta) {
      errors.fecha_baja = 'Fecha desde mayor que fecha hasta.';
    }
    return errors;
  };

  const buildFiltersPayload = React.useCallback((segmentoOverride) => {
    const segmentoEfectivo = segmentoOverride || segmentoRecupero;
    const manualDesde = columnFiltersApplied.fecha_baja_desde || '';
    const manualHasta = columnFiltersApplied.fecha_baja_hasta || '';
    // Segmentación Prioritario (bajas <= 3 meses) / Resto de la cartera: se combina
    // con el filtro manual de fecha_baja tomando el corte más restrictivo de cada lado.
    const fechaBajaDesde = vistaActual === 'recupero' && segmentoEfectivo === 'prioritario'
      ? [manualDesde, prioritarioCutoffDate].filter(Boolean).sort().pop()
      : manualDesde;
    const fechaBajaHasta = vistaActual === 'recupero' && segmentoEfectivo === 'resto'
      ? [manualHasta, restoCutoffDate].filter(Boolean).sort()[0]
      : manualHasta;
    const payload = {
      contacto: columnFiltersApplied.contacto?.trim() || '',
      documento: columnFiltersApplied.documento?.trim() || '',
      telefono: columnFiltersApplied.telefono?.trim() || '',
      edad_min: toNumberOrNull(columnFiltersApplied.edad_min),
      edad_max: toNumberOrNull(columnFiltersApplied.edad_max),
      precio_min: toNumberOrNull(columnFiltersApplied.precio_min),
      precio_max: toNumberOrNull(columnFiltersApplied.precio_max),
      fecha_baja_desde: fechaBajaDesde || '',
      fecha_baja_hasta: fechaBajaHasta || '',
      motivo_baja: Array.isArray(columnFiltersApplied.motivo_baja) ? columnFiltersApplied.motivo_baja : [],
      ultimo_estado: Array.isArray(columnFiltersApplied.ultimo_estado) ? columnFiltersApplied.ultimo_estado : [],
      producto: Array.isArray(columnFiltersApplied.producto) ? columnFiltersApplied.producto : [],
      departamento: Array.isArray(columnFiltersApplied.departamento) ? columnFiltersApplied.departamento : [],
      lote: Array.isArray(columnFiltersApplied.lote) ? columnFiltersApplied.lote : [],
      vendedor_asignado: Array.isArray(columnFiltersApplied.vendedor_asignado) ? columnFiltersApplied.vendedor_asignado : []
    };
    Object.keys(payload).forEach((key) => {
      const value = payload[key];
      if (value === '' || value === null || value === undefined) delete payload[key];
      if (Array.isArray(value) && !value.length) delete payload[key];
    });
    return payload;
  }, [columnFiltersApplied, prioritarioCutoffDate, restoCutoffDate, segmentoRecupero, vistaActual]);

  const buildSearchPayload = React.useCallback(() => {
    const filters = buildFiltersPayload();
    return {
      tab: activeTab,
      filters,
      sort: vistaActual === 'recupero'
        ? { field: 'fecha_baja', dir: sortDir }
        : (orden.campo ? { field: orden.campo, dir: orden.direccion } : null),
      columns: visibleColumns.length ? visibleColumns : allColumns.map((col) => col.id),
      page,
      limit: PAGE_SIZE
    };
  }, [activeTab, allColumns, buildFiltersPayload, orden, page, sortDir, vistaActual, visibleColumns]);

  const buildSegmentoCountPayload = React.useCallback((segmento) => ({
    tab: 'disponibles',
    filters: buildFiltersPayload(segmento),
    sort: { field: 'fecha_baja', dir: sortDir },
    columns: visibleColumns.length ? visibleColumns : allColumns.map((col) => col.id),
    page: 1,
    limit: 1
  }), [allColumns, buildFiltersPayload, sortDir, visibleColumns]);

  const loadSegmentoCounts = React.useCallback(async () => {
    const extractTotal = (result) => {
      if (result.status !== 'fulfilled') return { total: null, error: true };
      const value = result.value;
      const total = Number(value?.total ?? value?.data?.total);
      return Number.isFinite(total) ? { total, error: false } : { total: null, error: true };
    };
    try {
      const [prioritarioRes, restoRes] = await Promise.allSettled([
        api.post('/api/recupero/contactos/search', buildSegmentoCountPayload('prioritario')),
        api.post('/api/recupero/contactos/search', buildSegmentoCountPayload('resto'))
      ]);
      const prioritario = extractTotal(prioritarioRes);
      const resto = extractTotal(restoRes);
      setSegmentoCounts({ prioritario: prioritario.total, resto: resto.total });
      setSegmentoCountsError({ prioritario: prioritario.error, resto: resto.error });
    } catch {
      setSegmentoCounts({ prioritario: null, resto: null });
      setSegmentoCountsError({ prioritario: true, resto: true });
    }
  }, [api, buildSegmentoCountPayload]);

  React.useEffect(() => {
    if (vistaActual !== 'recupero') return;
    loadSegmentoCounts();
  }, [vistaActual, loadSegmentoCounts]);

  const loadRecupero = React.useCallback(async (options = {}) => {
    const { force = false } = options;
    const payload = buildSearchPayload();
    const payloadKey = JSON.stringify(payload);
    if (!force && payloadKey === lastPayloadRef.current) {
      return;
    }
    setLoading(true);
    setError('');
    lastPayloadRef.current = payloadKey;
    const requestId = `recupero_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    requestIdRef.current = requestId;
    const startedAt = Date.now();
    console.debug('[recupero][request]', { requestId, payload });
    try {
      let response = null;
      try {
        response = await api.post('/api/recupero/contactos/search', payload);
      } catch (err) {
        const status = err?.status || err?.response?.status;
        if (status === 404 || status === 405 || status === 503) {
          const fallbackUrl = `/api/recupero/contactos?page=${payload.page}&limit=${payload.limit}`
            + (payload.tab ? `&tab=${encodeURIComponent(payload.tab)}` : '')
            + (payload.sort?.field ? `&sort=${payload.sort.field}&dir=${payload.sort.dir}` : '');
          response = await api.get(fallbackUrl);
        } else {
          throw err;
        }
      }
      if (requestIdRef.current !== requestId) return;
      console.debug('[recupero][response]', { requestId, ms: Date.now() - startedAt });
      const rows = response?.items || response?.data?.items || [];
      const totalCount = Number(response?.total ?? response?.data?.total ?? rows.length);
      setItems(Array.isArray(rows) ? rows : []);
      setTotal(Number.isFinite(totalCount) ? totalCount : 0);

      const incomingTabCounts = response?.data?.tab_counts || response?.tab_counts || null;
      if (incomingTabCounts && typeof incomingTabCounts === 'object') {
        setTabCounts({
          disponibles: Number(incomingTabCounts.disponibles || 0),
          nuevo: Number(incomingTabCounts.nuevo || 0),
          no_contesta: Number(incomingTabCounts.no_contesta || 0),
          rellamar: Number(incomingTabCounts.rellamar || 0),
          seguimiento: Number(incomingTabCounts.seguimiento || 0),
          recuperados: Number(incomingTabCounts.recuperados || 0),
          rechazos: Number(incomingTabCounts.rechazos ?? incomingTabCounts.rechazados ?? 0),
          dato_erroneo: Number(incomingTabCounts.dato_erroneo || 0)
        });
      }

      const backendMetrics = response?.metrics || response?.data?.metrics || null;
      if (backendMetrics) {
        setMetrics((prev) => ({
          ...prev,
          ...backendMetrics,
          total: Number.isFinite(backendMetrics?.total) ? backendMetrics.total : prev.total
        }));
      } else {
        setMetrics((prev) => ({
          ...prev,
          total: Number.isFinite(totalCount) ? totalCount : prev.total
        }));
      }
      setLastSyncAt(Date.now());
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      console.debug('[recupero][error]', { requestId, ms: Date.now() - startedAt, message: err?.message || err });
      setError(err?.message || 'No se pudo cargar Recupero de clientes.');
      setItems([]);
      setTotal(0);
    } finally {
      if (requestIdRef.current !== requestId) return;
      setLoading(false);
    }
  }, [api, buildSearchPayload]);

  React.useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  React.useEffect(() => {
    try {
      const storedColumns = JSON.parse(localStorage.getItem('recupero_columns') || '[]');
      if (Array.isArray(storedColumns) && storedColumns.length) {
        setVisibleColumns(storedColumns);
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    ensureDefaultColumns();
  }, [ensureDefaultColumns]);

  React.useEffect(() => {
    try {
      localStorage.setItem('recupero_columns', JSON.stringify(visibleColumns));
    } catch {}
  }, [visibleColumns]);

  const payloadKey = React.useMemo(() => JSON.stringify(buildSearchPayload()), [buildSearchPayload]);

  React.useEffect(() => {
    if (vistaActual !== 'recupero') return;
    loadRecupero();
  }, [payloadKey, loadRecupero, vistaActual]);

  React.useEffect(() => {
    if (vistaActual !== 'recupero') return;
    // Periodic refetch to keep Recupero in sync (skip while user is typing).
    const intervalMs = 45000;
    const timer = setInterval(() => {
      if (Date.now() - lastInputAtRef.current < 900) return;
      loadRecupero({ force: true });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [loadRecupero, payloadKey, vistaActual]);

  React.useEffect(() => {
    setPage(1);
  }, [orden, activeTab, sortDir, visibleColumns, segmentoRecupero]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (activeTab !== 'disponibles' && selectedIds.length) {
      setSelectedIds([]);
    }
  }, [activeTab, selectedIds.length]);

  const toggleSelection = (id) => {
    if (activeTab !== 'disponibles') return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const visibleSelectableIds = React.useMemo(
    () => (Array.isArray(visibleItems) ? visibleItems.map((row) => row.id).filter(Boolean) : []),
    [visibleItems]
  );
  const allVisibleSelected = visibleSelectableIds.length > 0
    && visibleSelectableIds.every((id) => selectedIds.includes(id));
  const someVisibleSelected = visibleSelectableIds.some((id) => selectedIds.includes(id));

  React.useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = !allVisibleSelected && someVisibleSelected;
  }, [allVisibleSelected, someVisibleSelected]);

  const toggleSelectAllVisible = () => {
    if (activeTab !== 'disponibles') return;
    setSelectedIds((prev) => {
      if (!visibleSelectableIds.length) return prev;
      if (allVisibleSelected) {
        return prev.filter((id) => !visibleSelectableIds.includes(id));
      }
      const next = new Set(prev);
      visibleSelectableIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const resetImportState = () => {
    setImportFile(null);
    setImportRows([]);
    setImportErrors([]);
    setImportSummary(null);
    setImportPreviewLoading(false);
    setImportPreviewNotice('');
    setImportLoading(false);
    setImportResult(null);
    setImportStep(1);
    setImportStats(null);
    importPreviewRequestRef.current = '';
  };

  const applyColumnFilters = () => {
    const errors = validateColumnFilters(columnFiltersDraft);
    setFilterErrors(errors);
    if (Object.keys(errors).length) return;
    setColumnFiltersApplied(columnFiltersDraft);
    setOpenFilterColumn('');
    setPage(1);
  };

  const clearColumnFilters = () => {
    setColumnFiltersDraft({ ...COLUMN_FILTERS_INITIAL });
    setColumnFiltersApplied({ ...COLUMN_FILTERS_INITIAL });
    setFilterErrors({});
    setOpenFilterColumn('');
    setPage(1);
  };

  const updateColumnField = (field, value) => {
    lastInputAtRef.current = Date.now();
    setColumnFiltersDraft((prev) => ({ ...prev, [field]: value }));
    if (field === 'edad_min' || field === 'edad_max') {
      setFilterErrors((prev) => ({ ...prev, edad: '' }));
    }
    if (field === 'precio_min' || field === 'precio_max') {
      setFilterErrors((prev) => ({ ...prev, precio: '' }));
    }
    if (field === 'fecha_baja_desde' || field === 'fecha_baja_hasta') {
      setFilterErrors((prev) => ({ ...prev, fecha_baja: '' }));
    }
  };

  const handleMultiSelect = (event, field) => {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value);
    updateColumnField(field, values);
  };

  const clearAllFilters = () => {
    clearColumnFilters();
  };

  const clearColumnField = (fieldId) => {
    const resetField = (prev) => {
      const next = { ...prev };
      if (fieldId === 'fecha_baja') {
        next.fecha_baja_desde = '';
        next.fecha_baja_hasta = '';
      }
      if (fieldId === 'edad') {
        next.edad_min = '';
        next.edad_max = '';
      }
      if (fieldId === 'precio') {
        next.precio_min = '';
        next.precio_max = '';
      }
      if (fieldId === 'motivo_baja') next.motivo_baja = [];
      if (fieldId === 'ultimo_estado') next.ultimo_estado = [];
      if (fieldId === 'producto') next.producto = [];
      if (fieldId === 'departamento') next.departamento = [];
      if (fieldId === 'contacto') next.contacto = '';
      if (fieldId === 'documento') next.documento = '';
      if (fieldId === 'telefono') next.telefono = '';
      if (fieldId === 'lote') next.lote = [];
      if (fieldId === 'vendedor_asignado') next.vendedor_asignado = [];
      return next;
    };
    setColumnFiltersApplied((prev) => resetField(prev));
    setColumnFiltersDraft((prev) => resetField(prev));
    if (openFilterColumn === fieldId) {
      setOpenFilterColumn('');
    }
    if (fieldId === 'edad') {
      setFilterErrors((prev) => ({ ...prev, edad: '' }));
    }
    if (fieldId === 'precio') {
      setFilterErrors((prev) => ({ ...prev, precio: '' }));
    }
    if (fieldId === 'fecha_baja') {
      setFilterErrors((prev) => ({ ...prev, fecha_baja: '' }));
    }
    setPage(1);
  };

  // Saved views removed for simplified filtering UX

  const getOptionLabel = (options, value) => {
    if (!options || value === undefined || value === null || value === '') return '';
    if (Array.isArray(options)) {
      const found = options.find((opt) => {
        if (opt && typeof opt === 'object') {
          return opt.value === value || opt.id === value || opt.label === value;
        }
        return opt === value;
      });
      if (found && typeof found === 'object') return found.label || found.name || found.value || String(value);
      if (found) return String(found);
    }
    return String(value);
  };

  const sortFieldByColumn = React.useMemo(() => ({
    contacto: 'contacto',
    documento: 'documento',
    edad: 'edad',
    telefono: 'telefono',
    departamento: 'departamento',
    producto: 'nombre_producto',
    precio: 'precio',
    fecha_baja: 'fecha_baja',
    motivo_baja: 'motivo_baja',
    lote: 'lote',
    vendedor_asignado: 'vendedor',
    ultimo_estado: 'ultimo_estado',
    ultima_gestion: 'ultima_gestion_fecha'
  }), []);

  const toggleSort = React.useCallback((columnId) => {
    const campo = sortFieldByColumn[columnId] || columnId;
    setOrden((prev) => ({
      campo,
      direccion: prev.campo === campo && prev.direccion === 'asc' ? 'desc' : 'asc'
    }));
  }, [sortFieldByColumn]);

  const sortIconFor = React.useCallback((columnId) => {
    const campo = sortFieldByColumn[columnId] || columnId;
    if (orden.campo !== campo) return '↕';
    return orden.direccion === 'asc' ? '↑' : '↓';
  }, [orden, sortFieldByColumn]);

  const isColumnFilterActive = React.useCallback((columnId) => {
    if (columnId === 'edad') return !!(columnFiltersApplied.edad_min || columnFiltersApplied.edad_max);
    if (columnId === 'precio') return !!(columnFiltersApplied.precio_min || columnFiltersApplied.precio_max);
    if (columnId === 'fecha_baja') return !!(columnFiltersApplied.fecha_baja_desde || columnFiltersApplied.fecha_baja_hasta);
    if (columnId === 'contacto') return !!columnFiltersApplied.contacto;
    if (columnId === 'documento') return !!columnFiltersApplied.documento;
    if (columnId === 'telefono') return !!columnFiltersApplied.telefono;
    if (columnId === 'departamento') return Array.isArray(columnFiltersApplied.departamento) && columnFiltersApplied.departamento.length > 0;
    if (columnId === 'producto') return Array.isArray(columnFiltersApplied.producto) && columnFiltersApplied.producto.length > 0;
    if (columnId === 'motivo_baja') return Array.isArray(columnFiltersApplied.motivo_baja) && columnFiltersApplied.motivo_baja.length > 0;
    if (columnId === 'ultimo_estado') return Array.isArray(columnFiltersApplied.ultimo_estado) && columnFiltersApplied.ultimo_estado.length > 0;
    if (columnId === 'lote') return Array.isArray(columnFiltersApplied.lote) && columnFiltersApplied.lote.length > 0;
    if (columnId === 'vendedor_asignado') return Array.isArray(columnFiltersApplied.vendedor_asignado) && columnFiltersApplied.vendedor_asignado.length > 0;
    return false;
  }, [columnFiltersApplied]);

  const openFilterPopover = React.useCallback((columnId) => {
    setColumnFiltersDraft((prev) => ({ ...prev, ...columnFiltersApplied }));
    setFilterErrors({});
    setOpenFilterColumn((prev) => (prev === columnId ? '' : columnId));
  }, [columnFiltersApplied]);

  React.useEffect(() => {
    if (!openFilterColumn) return;
    const handleClick = (event) => {
      if (event.target.closest('[data-filter-popover]')) return;
      setOpenFilterColumn('');
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openFilterColumn]);

  React.useEffect(() => {
    if (!openRowMenuId) return;
    const handleClick = (event) => {
      if (event.target.closest('[data-row-menu]')) return;
      setOpenRowMenuId(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openRowMenuId]);

  React.useEffect(() => {
    if (!openLoteMenuId) return;
    const handleClick = (event) => {
      if (event.target.closest('[data-lote-menu]')) return;
      setOpenLoteMenuId(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openLoteMenuId]);

  React.useEffect(() => {
    if (!openVendorMenuId) return;
    const handleClick = (event) => {
      if (event.target.closest('[data-vendor-menu]')) return;
      setOpenVendorMenuId(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openVendorMenuId]);

  const renderColumnFilterPopover = React.useCallback((columnId) => {
    if (openFilterColumn !== columnId) return null;
    const config = FILTER_COLUMN_CONFIG[columnId];
    if (!config) return null;
    const errorKey = columnId === 'edad'
      ? 'edad'
      : columnId === 'precio'
        ? 'precio'
        : columnId === 'fecha_baja'
          ? 'fecha_baja'
          : '';
    const options = config.type === 'select' ? getFilterOptionsForKey(config.key || columnId) : [];
    const normalizedOptions = (Array.isArray(options) ? options : []).map((option) => {
      if (option && typeof option === 'object') {
        const value = option.value ?? option.id ?? option.label ?? option.nombre ?? option.name ?? '';
        const label = option.label ?? option.nombre ?? option.name ?? option.value ?? option.id ?? '';
        return { value: String(value), label: String(label) };
      }
      return { value: String(option), label: String(option) };
    });

    const popoverStyle = {
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: 6,
      padding: 12,
      minWidth: 220,
      background: '#fff',
      border: '1px solid rgba(148,163,184,0.35)',
      borderRadius: 10,
      boxShadow: '0 12px 24px rgba(15,23,42,0.15)',
      zIndex: 40
    };

    const renderActions = () => (
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
        <Button variant="ghost" onClick={() => { clearColumnField(columnId); setOpenFilterColumn(''); }}>
          Limpiar
        </Button>
        <Button onClick={applyColumnFilters}>Aplicar</Button>
      </div>
    );

    if (config.type === 'text') {
      const fieldKey = columnId;
      return (
        <div data-filter-popover style={popoverStyle}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Buscar</span>
            <input
              className="input"
              value={columnFiltersDraft[fieldKey]}
              onChange={(event) => updateColumnField(fieldKey, event.target.value)}
              placeholder="Escribí un valor"
            />
          </label>
          {renderActions()}
        </div>
      );
    }

    if (config.type === 'rangeNumber') {
      const minKey = columnId === 'edad' ? 'edad_min' : 'precio_min';
      const maxKey = columnId === 'edad' ? 'edad_max' : 'precio_max';
      return (
        <div data-filter-popover style={popoverStyle}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Rango</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              type="number"
              placeholder="Desde"
              value={columnFiltersDraft[minKey]}
              onChange={(event) => updateColumnField(minKey, event.target.value)}
              style={{ flex: 1 }}
            />
            <input
              className="input"
              type="number"
              placeholder="Hasta"
              value={columnFiltersDraft[maxKey]}
              onChange={(event) => updateColumnField(maxKey, event.target.value)}
              style={{ flex: 1 }}
            />
          </div>
          {errorKey && filterErrors[errorKey] ? (
            <div style={{ marginTop: 6, fontSize: 12, color: '#b91c1c' }}>{filterErrors[errorKey]}</div>
          ) : null}
          {renderActions()}
        </div>
      );
    }

    if (config.type === 'dateRange') {
      return (
        <div data-filter-popover style={popoverStyle}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Rango de fechas</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              type="date"
              value={columnFiltersDraft.fecha_baja_desde}
              onChange={(event) => updateColumnField('fecha_baja_desde', event.target.value)}
              style={{ flex: 1 }}
            />
            <input
              className="input"
              type="date"
              value={columnFiltersDraft.fecha_baja_hasta}
              onChange={(event) => updateColumnField('fecha_baja_hasta', event.target.value)}
              style={{ flex: 1 }}
            />
          </div>
          {errorKey && filterErrors[errorKey] ? (
            <div style={{ marginTop: 6, fontSize: 12, color: '#b91c1c' }}>{filterErrors[errorKey]}</div>
          ) : null}
          {renderActions()}
        </div>
      );
    }

    if (config.type === 'select') {
      const fieldKey = config.key || columnId;
      const isDisabled = filtersLoading || !normalizedOptions.length;
      return (
        <div data-filter-popover style={popoverStyle}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Seleccionar valores</div>
          {filtersError ? (
            <div style={{ marginBottom: 6, fontSize: 12, color: '#b91c1c' }}>{filtersError}</div>
          ) : null}
          <select
            className="input"
            multiple
            value={columnFiltersDraft[fieldKey]}
            onChange={(event) => handleMultiSelect(event, fieldKey)}
            style={{ minHeight: 110 }}
            disabled={isDisabled}
          >
            {!filtersLoading && !normalizedOptions.length ? (
              <option value="" disabled>Sin opciones disponibles</option>
            ) : null}
            {normalizedOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {filtersLoading ? (
            <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>Cargando...</div>
          ) : null}
          {renderActions()}
        </div>
      );
    }

    return null;
  }, [
    applyColumnFilters,
    clearColumnField,
    columnFiltersDraft,
    filterErrors,
    filtersError,
    filtersLoading,
    getFilterOptionsForKey,
    handleMultiSelect,
    openFilterColumn,
    updateColumnField
  ]);

  const renderHeaderCell = React.useCallback((columnId, label, sortable = true) => {
    const isFilterable = Boolean(FILTER_COLUMN_CONFIG[columnId]);
    const isActive = isFilterable ? isColumnFilterActive(columnId) : false;
    return (
      <th style={{ position: 'relative', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={() => sortable && toggleSort(columnId)}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: sortable ? 'pointer' : 'default',
              fontWeight: 600,
              color: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span>{label}</span>
            {sortable ? (
              <span style={{ fontSize: 11, opacity: 0.5 }}>{sortIconFor(columnId)}</span>
            ) : null}
          </button>
          {isFilterable ? (
            <button
              type="button"
              data-filter-popover
              onClick={() => openFilterPopover(columnId)}
              style={{
                border: 'none',
                background: isActive ? 'rgba(15,118,110,0.12)' : 'transparent',
                color: isActive ? '#0f766e' : 'rgba(100,116,139,0.9)',
                borderRadius: 6,
                padding: 4,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label={`Filtrar ${label}`}
            >
              <Filter size={14} />
            </button>
          ) : null}
        </div>
        {isFilterable ? renderColumnFilterPopover(columnId) : null}
      </th>
    );
  }, [isColumnFilterActive, openFilterPopover, renderColumnFilterPopover, sortIconFor, toggleSort]);

  const activeFilters = React.useMemo(() => {
    const filters = [];
    if (columnFiltersApplied.contacto) {
      filters.push({ id: 'contacto', label: `Contacto: ${columnFiltersApplied.contacto}` });
    }
    if (columnFiltersApplied.documento) {
      filters.push({ id: 'documento', label: `Documento: ${columnFiltersApplied.documento}` });
    }
    if (columnFiltersApplied.telefono) {
      filters.push({ id: 'telefono', label: `Teléfono: ${columnFiltersApplied.telefono}` });
    }
    if (columnFiltersApplied.edad_min || columnFiltersApplied.edad_max) {
      filters.push({ id: 'edad', label: `Edad: ${columnFiltersApplied.edad_min || '—'} - ${columnFiltersApplied.edad_max || '—'}` });
    }
    if (columnFiltersApplied.precio_min || columnFiltersApplied.precio_max) {
      filters.push({ id: 'precio', label: `Precio: ${columnFiltersApplied.precio_min || '—'} - ${columnFiltersApplied.precio_max || '—'}` });
    }
    if (columnFiltersApplied.fecha_baja_desde || columnFiltersApplied.fecha_baja_hasta) {
      filters.push({ id: 'fecha_baja', label: `Fecha de baja: ${columnFiltersApplied.fecha_baja_desde || '—'} - ${columnFiltersApplied.fecha_baja_hasta || '—'}` });
    }
    if (Array.isArray(columnFiltersApplied.motivo_baja) && columnFiltersApplied.motivo_baja.length) {
      filters.push({ id: 'motivo_baja', label: `Motivo: ${columnFiltersApplied.motivo_baja.map((val) => getOptionLabel(filterOptions.motivos, val)).join(', ')}` });
    }
    if (Array.isArray(columnFiltersApplied.ultimo_estado) && columnFiltersApplied.ultimo_estado.length) {
      filters.push({ id: 'ultimo_estado', label: `Último estado: ${columnFiltersApplied.ultimo_estado.map((val) => getOptionLabel(ultimoEstadoOptions, val)).join(', ')}` });
    }
    if (Array.isArray(columnFiltersApplied.producto) && columnFiltersApplied.producto.length) {
      filters.push({ id: 'producto', label: `Producto: ${columnFiltersApplied.producto.map((val) => getOptionLabel(filterOptions.productos, val)).join(', ')}` });
    }
    if (Array.isArray(columnFiltersApplied.departamento) && columnFiltersApplied.departamento.length) {
      filters.push({ id: 'departamento', label: `Departamento: ${columnFiltersApplied.departamento.map((val) => getOptionLabel(filterOptions.departamentos, val)).join(', ')}` });
    }
    if (Array.isArray(columnFiltersApplied.lote) && columnFiltersApplied.lote.length) {
      filters.push({ id: 'lote', label: `Lote: ${columnFiltersApplied.lote.map((val) => getOptionLabel(getFilterOptionsForKey('lote'), val)).join(', ')}` });
    }
    if (Array.isArray(columnFiltersApplied.vendedor_asignado) && columnFiltersApplied.vendedor_asignado.length) {
      filters.push({ id: 'vendedor_asignado', label: `Vendedor: ${columnFiltersApplied.vendedor_asignado.map((val) => getOptionLabel(getFilterOptionsForKey('vendedor_asignado'), val)).join(', ')}` });
    }
    return filters;
  }, [columnFiltersApplied, filterOptions.departamentos, filterOptions.motivos, filterOptions.productos, getFilterOptionsForKey, getOptionLabel, ultimoEstadoOptions]);

  const activeFilterCount = React.useMemo(() => activeFilters.length, [activeFilters.length]);

  const activeChips = React.useMemo(() => (
    activeFilters.map((item) => ({ id: item.id, label: item.label }))
  ), [activeFilters]);

  const detectDelimiter = (line) => {
    if (line.includes(';') && !line.includes(',')) return ';';
    if (line.includes(',') && !line.includes(';')) return ',';
    const commas = (line.match(/,/g) || []).length;
    const semis = (line.match(/;/g) || []).length;
    return semis > commas ? ';' : ',';
  };

  const normalizeHeader = (value) => String(value || '').trim().toLowerCase();
  const normalizeImportHeader = (value) => normalizeHeader(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const PREVIEW_ROW_STATUS_META = {
    ok: { label: 'Listo', background: '#E1F5EE', color: '#0F6E56' },
    sin_documento: { label: 'Sin documento', background: '#FEF2F2', color: '#B91C1C' },
    duplicado_real: { label: 'Duplicado real', background: '#FAEEDA', color: '#854F0B' },
    grupo_familiar: { label: 'Grupo familiar', background: '#E6F1FB', color: '#185FA5' },
    requiere_revision: { label: 'Requiere revisión', background: '#FCE7F3', color: '#9D174D' },
    cliente_activo: { label: 'Cliente activo', background: '#EEF2FF', color: '#4338CA' }
  };
  const PREVIEW_TIMEOUT_MS = 8000;

  const isPriceHeader = (header) => {
    const normalized = normalizeImportHeader(header);
    return normalized === 'precio'
      || normalized === 'precio del producto'
      || normalized === 'precio producto'
      || normalized === 'precio anterior'
      || normalized === 'precio de venta (mensual)'
      || normalized.includes('precio');
  };

  const getPreviewRowStatus = (row) => {
    const code = !row.documento ? 'sin_documento' : 'ok';
    return {
      code,
      label: PREVIEW_ROW_STATUS_META[code]?.label || 'Listo'
    };
  };

  const getRowStatusBadgeStyle = (statusCode) => {
    const meta = PREVIEW_ROW_STATUS_META[statusCode] || PREVIEW_ROW_STATUS_META.ok;
    return {
      background: meta.background,
      color: meta.color
    };
  };

  const normalizePreviewStatusCode = (value) => {
    const normalized = normalizeImportHeader(value).replace(/\s+/g, '_');
    const allowed = ['ok', 'duplicado_real', 'grupo_familiar', 'requiere_revision', 'cliente_activo', 'sin_documento'];
    return allowed.includes(normalized) ? normalized : '';
  };

  const normalizeRecuperoPreviewResponse = (payload) => {
    const rowsRaw = Array.isArray(payload?.rows) ? payload.rows : null;
    const summaryRaw = payload?.summary && typeof payload.summary === 'object' ? payload.summary : null;
    if (!rowsRaw || !summaryRaw) {
      throw new Error('El preview devolvió un formato inesperado.');
    }
    const rows = rowsRaw.map((row) => {
      const rowNumber = Number(row?.rowNumber ?? row?.row_number ?? row?.row ?? row?.lineNumber ?? row?.line_number);
      const code = normalizePreviewStatusCode(row?.status ?? row?.classification ?? row?.resultado ?? row?.result);
      if (!Number.isFinite(rowNumber) || !code) {
        throw new Error('El preview devolvió filas con un formato inesperado.');
      }
      return {
        rowNumber,
        rowStatus: {
          code,
          label: PREVIEW_ROW_STATUS_META[code]?.label || code
        }
      };
    });
    const pickSummaryCount = (key) => Number(
      summaryRaw?.[key]
      ?? summaryRaw?.[key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())]
      ?? 0
    ) || 0;
    return {
      rows,
      summary: {
        ok: pickSummaryCount('ok'),
        duplicado_real: pickSummaryCount('duplicado_real'),
        grupo_familiar: pickSummaryCount('grupo_familiar'),
        requiere_revision: pickSummaryCount('requiere_revision'),
        cliente_activo: pickSummaryCount('cliente_activo'),
        sin_documento: pickSummaryCount('sin_documento')
      }
    };
  };

  const buildLocalImportSummary = (rows) => {
    const missingDocumentCount = rows.filter((row) => row.rowStatus?.code === 'sin_documento').length;
    return {
      total: rows.length,
      missingDocument: missingDocumentCount,
      previewSource: 'local',
      previewAvailable: false,
      backendSummary: null,
      // Este neto solo descuenta filas sin documento. Duplicados/clientes activos
      // seguirán dependiendo del preview backend cuando exista ese endpoint.
      readyToImport: Math.max(0, rows.length - missingDocumentCount)
    };
  };

  const applyPreviewRowsToImportRows = (baseRows, previewRows) => {
    const rowsByNumber = new Map(previewRows.map((row) => [row.rowNumber, row.rowStatus]));
    return baseRows.map((row) => {
      const previewStatus = rowsByNumber.get(row.rowNumber);
      if (!previewStatus) return row;
      return { ...row, rowStatus: previewStatus };
    });
  };

  const fetchRecuperoImportPreview = async (file, baseRows) => {
    const requestId = `preview_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    importPreviewRequestRef.current = requestId;
    setImportPreviewLoading(true);
    setImportPreviewNotice('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await Promise.race([
        api.post('/api/recupero/importaciones/preview', formData),
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error('PREVIEW_TIMEOUT')), PREVIEW_TIMEOUT_MS);
        })
      ]);
      if (importPreviewRequestRef.current !== requestId) return;
      const normalized = normalizeRecuperoPreviewResponse(response);
      setImportRows((prev) => applyPreviewRowsToImportRows(prev, normalized.rows));
      setImportSummary((prev) => ({
        ...(prev || buildLocalImportSummary(baseRows)),
        previewSource: 'backend',
        previewAvailable: true,
        backendSummary: normalized.summary,
        readyToImport: normalized.summary.ok + normalized.summary.grupo_familiar + normalized.summary.requiere_revision
      }));
    } catch (err) {
      if (importPreviewRequestRef.current !== requestId) return;
      console.warn('RECUPERO_PREVIEW_ERROR', err);
      setImportSummary((prev) => prev || buildLocalImportSummary(baseRows));
      setImportPreviewNotice(
        err?.message === 'PREVIEW_TIMEOUT'
          ? 'El resumen real todavía no respondió. Mostramos un conteo local provisorio.'
          : 'No pudimos verificar todavía duplicados y clientes activos. Mostramos un conteo local provisorio.'
      );
    } finally {
      if (importPreviewRequestRef.current === requestId) {
        setImportPreviewLoading(false);
      }
    }
  };

  const parseCsvPreview = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
    if (!lines.length) return { rows: [], errors: ['El archivo está vacío.'] };
    const delimiter = detectDelimiter(lines[0]);
    const headers = lines[0].split(delimiter).map((h) => h.trim());
    const normalized = headers.map(normalizeHeader);
    const expected = ['documento', 'motivo de la baja', 'ultimo estado'];
    const missing = expected.filter((h) => !normalized.includes(h));
    if (missing.length) {
      return { rows: [], errors: [`Faltan columnas: ${missing.join(', ')}`] };
    }
    const idxDocumento = normalized.indexOf('documento');
    const idxMotivo = normalized.indexOf('motivo de la baja');
    const idxEstado = normalized.indexOf('ultimo estado');
    const rows = lines.slice(1).map((line) => {
      const cols = line.split(delimiter).map((c) => c.trim());
      return {
        documento: cols[idxDocumento] || '',
        motivo_baja: cols[idxMotivo] || '',
        ultimo_estado: cols[idxEstado] || ''
      };
    });
    const errors = [];
    const seen = new Set();
    rows.forEach((row, index) => {
      if (!row.documento) errors.push(`Fila ${index + 2}: Documento vacío`);
      const key = row.documento.trim();
      if (key) seen.add(key);
    });
    const map = new Map();
    rows.forEach((row) => {
      if (!row.documento) return;
      map.set(row.documento, row);
    });
    const rowsPreview = Array.from(map.values());
    const duplicados = rows.length - rowsPreview.length;
    return {
      rows: rowsPreview,
      errors,
      summary: {
        total: rows.length,
        duplicates: duplicados
      }
    };
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setImportResult(null);
    setImportStats(null);
    setImportStep(1);
    importPreviewRequestRef.current = '';
    setImportPreviewLoading(false);
    setImportPreviewNotice('');
    if (!file) { resetImportState(); return; }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setImportErrors(['El archivo debe ser .csv']);
      setImportFile(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImportErrors(['El archivo supera el tamaño máximo de 5MB.']);
      setImportFile(null);
      return;
    }
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result;
      let text = new TextDecoder('utf-8').decode(buffer);
      if (text.includes('\ufffd') || /\u00c3[\u00a9\u00b1\u00b3\u00a1\u00ad\u009a\u00ba]/.test(text)) {
        text = new TextDecoder('windows-1252').decode(buffer);
      }
      text = text.replace(/^\uFEFF/, '');
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) {
        setImportErrors(['El archivo está vacío o no tiene filas de datos.']);
        setImportRows([]);
        setImportSummary(null);
        return;
      }
      const delimiter = text.includes(';') ? ';' : ',';
      const headers = lines[0].split(delimiter).map((h) => normalizeImportHeader(h));
      const idxNombre = headers.findIndex((h) => h === 'nombres' || h === 'nombre');
      const idxApellido = headers.findIndex((h) => h === 'apellidos' || h === 'apellido');
      const idxDoc = headers.findIndex((h) => h === 'documento');
      const idxTel = headers.findIndex((h) => h === 'telefono' || h.includes('tel'));
      const idxCelular = headers.findIndex((h) => h === 'celular' || h.includes('celular'));
      const idxEstado = headers.findIndex((h) => h === 'estado' || h === 'ultimo estado');
      const idxFechaBaja = headers.findIndex((h) => h === 'fecha de baja');
      const idxPlan = headers.findIndex((h) => h === 'plan contratado' || h === 'plan');
      const idxPrecio = headers.findIndex((h) => isPriceHeader(h));
      if (idxNombre === -1 || idxApellido === -1 || (idxDoc === -1 && idxTel === -1)) {
        setImportErrors(['El CSV debe tener columnas: Nombres, Apellidos y al menos Documento o Teléfono.']);
        setImportRows([]);
        setImportSummary(null);
        return;
      }
      const get = (cells, idx) => idx >= 0 ? (cells[idx] || '').trim() : '';
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(delimiter);
        const nombre = get(cells, idxNombre);
        const apellido = get(cells, idxApellido);
        if (!nombre && !apellido) continue;
        const row = {
          nombre,
          apellido,
          documento: get(cells, idxDoc),
          telefono: get(cells, idxTel) || get(cells, idxCelular),
          estado: get(cells, idxEstado),
          fecha_baja: get(cells, idxFechaBaja),
          plan: get(cells, idxPlan),
          precio: get(cells, idxPrecio),
          rowNumber: i + 1,
        };
        row.rowStatus = getPreviewRowStatus(row);
        rows.push(row);
      }
      setImportRows(rows);
      setImportErrors([]);
      setImportSummary(buildLocalImportSummary(rows));
      void fetchRecuperoImportPreview(file, rows);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportCsv = async () => {
    if (!importFile || importErrors.length) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const response = await api.post('/api/recupero/importaciones', formData);
      setImportResult(response);
      const jobId = response?.job_id;
      if (jobId) {
        let attempts = 0;
        const poll = async () => {
          attempts += 1;
          try {
            const status = await api.get(`/api/recupero/importaciones/${jobId}`);
            const s = status?.status || status?.data?.status;
            if (s === 'done' || s === 'failed') {
              const errores = status?.errores || status?.data?.errores || [];
              const activosExcluidos = errores.filter((e) => e.code === 'CLIENTE_ACTIVO');
              setImportStats({
                total: status?.summary?.total || status?.data?.summary?.total || 0,
                nuevos: status?.summary?.actualizadas || status?.data?.summary?.actualizadas || 0,
                yaEnRecupero: status?.summary?.duplicadas || status?.data?.summary?.duplicadas || 0,
                activos: activosExcluidos.length,
                errores: status?.summary?.invalidas || status?.data?.summary?.invalidas || 0,
                activosDetalle: activosExcluidos,
              });
              setImportStep(3);
              loadRecupero({ force: true });
            } else if (attempts < 30) {
              setTimeout(poll, 2000);
            }
          } catch {}
        };
        setTimeout(poll, 1500);
      } else {
        setImportStep(3);
        loadRecupero({ force: true });
      }
    } catch (err) {
      setImportResult({ ok: false, message: err?.message || 'No se pudo importar el archivo.' });
    } finally {
      setImportLoading(false);
    }
  };

  const assignLotesAbiertos = (lotesCreados || []).filter((lote) => {
    // /recovery/datasets manda `status` (activo|pausado|cerrado) — solo los
    // datasets activos aceptan asignaciones (mismo chequeo que ya hace el
    // backend en direct-assignments / assignments).
    const status = String(lote?.status ?? lote?.estado ?? '').toLowerCase();
    return status === 'activo';
  });
  const assignSelectedLote = (lotesCreados || []).find((l) => String(asLotId(l)) === String(assignLoteId)) || null;
  const assignSelectedLoteSellers = assignSelectedLote ? asLotSellers(assignSelectedLote) : [];
  const assignNeedsSellerPicker = !assignSelectedLoteSellers.length;

  const handleConfirmAssign = async () => {
    if (!assignContactIds.length) return;
    if (!assignLoteId) return;
    const loteSellerIds = assignSelectedLoteSellers.map((v) => v?.id).filter(Boolean);
    const sellerIds = loteSellerIds.length ? loteSellerIds : (assignSellerId ? [assignSellerId] : []);
    if (!sellerIds.length) return;
    setCreatingLot(true);
    try {
      const response = await api.post(`/recovery/datasets/${assignLoteId}/direct-assignments`, {
        candidato_ids: assignContactIds,
        seller_ids: sellerIds
      });
      if (response?.unassigned?.length) {
        setError(response.message || `${response.unassigned.length} contacto(s) no se pudieron asignar.`);
      }
      closeAssign();
      setSelectedIds([]);
      loadRecupero({ force: true });
      loadSegmentoCounts();
    } catch (err) {
      setError(err?.message || 'No se pudo asignar el contacto.');
    } finally {
      setCreatingLot(false);
    }
  };

  const recuperoIconButtonStyle = { width: 40, height: 40, borderRadius: 10, border: '1px solid rgba(15,23,42,0.16)', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-secondary)' };
  const recuperoThStyle = { textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid rgba(15,23,42,0.16)', position: 'sticky', top: 0, background: '#fff', zIndex: 1 };
  const recuperoTdStyle = { padding: '10px 12px', borderBottom: '0.5px solid rgba(15,23,42,0.16)' };
  const recuperoFilterSelectStyle = { height: 36, background: '#fff', border: '1px solid rgba(148,163,184,0.55)', borderRadius: 8, padding: '0 12px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' };

  return (
    <div className="view">
      <section className="content-grid">
        <Panel
          className="span-12"
          title={null}
          subtitle={null}
          action={null}
        >
          <div className="recupero-module-scope" style={{ display: 'grid', gap: 18 }}>
            <style>{`
              .recupero-module-scope :focus-visible {
                outline: 2px solid #0F766E;
                outline-offset: 2px;
              }
              .recupero-module-scope .button:disabled {
                opacity: 1;
                background: #E5E7EB !important;
                color: #6B7280 !important;
                box-shadow: none !important;
              }
            `}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="icon-button mobile-toggle"
                onClick={() => onOpenMobileMenu?.(true)}
                aria-label="Abrir menú"
              >
                <Menu size={20} color="#152235" />
              </button>
              {esVistaSimulada && Tag ? (
                <>
                  <Tag variant="warning">Modo vista: {roleMeta?.[rolEfectivo]?.label || rolEfectivo}</Tag>
                  <Tag variant="info">Usuario real: {roleMeta?.[rolReal]?.label || rolReal}</Tag>
                </>
              ) : null}
              {estadoUsuario === 'inactivo' && Tag ? (
                <Tag variant="warning">Inactivo (sin actividad)</Tag>
              ) : null}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: lastSyncAt ? 'var(--color-text-secondary)' : '#B45309', fontSize: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: lastSyncAt ? '#16A34A' : '#D97706', display: 'inline-block' }} />
                {syncLabel}
              </div>
              {vistaActual === 'detalle-lote' && (
                <button
                  type="button"
                  onClick={() => { setVistaActual('lotes'); setLoteSeleccionado(null); }}
                  style={{
                    background: '#fff',
                    border: '1px solid rgba(148,163,184,0.45)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  ← Volver
                </button>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {RECUPERO_TOP_TABS.map((tab) => {
                  const activeTopTab = tab.key === 'lotes'
                    ? (vistaActual === 'lotes' || vistaActual === 'detalle-lote')
                    : vistaActual === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        setVistaActual(tab.key);
                        if (tab.key !== 'lotes') setLoteSeleccionado(null);
                      }}
                      style={{
                        padding: '9px 14px',
                        borderRadius: 9,
                        border: activeTopTab ? 'none' : '0.5px solid rgba(15,23,42,0.16)',
                        background: activeTopTab ? '#E1F5EE' : '#fff',
                        color: activeTopTab ? '#0F6E56' : 'var(--color-text-secondary)',
                        fontWeight: activeTopTab ? 700 : 600,
                        fontSize: 14,
                        cursor: 'pointer'
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {vistaActual === 'recupero' && (
                  <Button onClick={() => { resetImportState(); setShowImportModal(true); }} icon={<Upload size={16} />} style={{ background: '#0F766E', color: '#fff', height: 44, padding: '0 24px', borderRadius: 10, fontSize: 14 }}>
                    Importar CSV
                  </Button>
                )}
              </div>
            </div>
          </div>

          {vistaActual === 'lotes' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <Button onClick={() => setShowCreateLoteModal(true)}>+ Crear lote</Button>
              </div>
              {lotesLoading ? <div style={{ marginBottom: 12, color: 'var(--muted)' }}>Cargando lotes...</div> : null}
              {lotesError ? <div style={{ marginBottom: 12, color: '#b91c1c', fontWeight: 700 }}>{lotesError}</div> : null}
              {!lotesLoading && !lotesCreados.length ? (
                <div style={{ padding: 16, color: 'var(--muted)' }}>No hay lotes creados.</div>
              ) : null}

              {(() => {
                const lotesAbiertos = lotesCreados.filter((lote) => !isLoteDatasetCerrado(lote));
                const lotesCerrados = lotesCreados.filter((lote) => isLoteDatasetCerrado(lote));

                const renderLoteCard = (lote, idx) => {
                  const lotId = asLotId(lote);
                  const name = asLotName(lote);
                  const count = asLotCount(lote);
                  const sellerName = asLotSellerName(lote);
                  const counts = lote?.counts || {};
                  const totalContactos = Number(counts.total ?? count ?? 0);
                  const isCerrado = isLoteDatasetCerrado(lote);
                  const estadoBadge = isCerrado
                    ? { label: 'Cerrado', bg: 'rgba(148,163,184,0.22)', color: 'var(--color-text-secondary)' }
                    : { label: 'Abierto', bg: '#E1F5EE', color: '#0F6E56' };
                  const canFinalizeLote = !lote?.is_system_dataset && !isCerrado;
                  // Descripción: no existe ningún campo de descripción/notas
                  // en recupero_import_jobs — se omite la línea a propósito
                  // en vez de inventar un texto, pendiente de una decisión
                  // de backend si se necesita en el futuro.
                  const lastActivityLabel = lote?.last_activity_at
                    ? formatDateTime(lote.last_activity_at)
                    : 'Sin gestiones todavía';

                  const openDetalle = () => {
                    openLotDetail(lote);
                  };

                  return (
                    <div
                      key={lotId || idx}
                      role="button"
                      tabIndex={0}
                      onClick={openDetalle}
                      onKeyDown={(e) => { if (e.key === 'Enter') openDetalle(); }}
                      style={{
                        border: '1px solid rgba(148,163,184,0.35)',
                        borderRadius: 14,
                        padding: 14,
                        background: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
                          <div style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: 14 }}>
                            {name}
                          </div>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 10px',
                            borderRadius: 999,
                            background: estadoBadge.bg,
                            color: estadoBadge.color,
                            fontSize: 12,
                            fontWeight: 800
                          }}>
                            {estadoBadge.label}
                          </span>
                        </div>
                        <div data-lote-menu style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setOpenLoteMenuId((prev) => (String(prev) === String(lotId) ? null : lotId)); }}
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              border: '1px solid rgba(148,163,184,0.45)',
                              background: '#fff',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--color-text-secondary)'
                            }}
                            aria-label="Más acciones"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {String(openLoteMenuId) === String(lotId) && (
                            <div style={{
                              position: 'absolute',
                              top: 'calc(100% + 4px)',
                              right: 0,
                              zIndex: 50,
                              background: '#fff',
                              border: '0.5px solid rgba(15,23,42,0.16)',
                              borderRadius: 10,
                              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                              minWidth: 160,
                              padding: '6px 0'
                            }}>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setOpenLoteMenuId(null); openDetalle(); }}
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}
                              >
                                Ver detalle
                              </button>
                              {canFinalizeLote && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setOpenLoteMenuId(null); openFinalizeLoteModal(lote); }}
                                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#DC2626' }}
                                >
                                  Finalizar
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: 10, display: 'grid', gap: 4, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        <div>Vendedores: <strong style={{ color: 'var(--color-text-primary)' }}>{sellerName || 'Sin asignar'}</strong></div>
                        <div>Última actualización: <strong style={{ color: 'var(--color-text-primary)' }}>{lastActivityLabel}</strong></div>
                        <div>Cantidad de datos: <strong style={{ color: 'var(--color-text-primary)' }}>{totalContactos}</strong></div>
                      </div>
                    </div>
                  );
                };

                return (
                  <div>
                    {lotesAbiertos.length > 0 && (
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                        Abiertos ({lotesAbiertos.length})
                      </div>
                    )}
                    <div style={{ display: 'grid', gap: 10 }}>
                      {lotesAbiertos.map((lote, idx) => renderLoteCard(lote, idx))}
                    </div>

                    {lotesCerrados.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <button
                          type="button"
                          onClick={() => setCerradosExpanded((prev) => !prev)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: 0,
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 800,
                            color: 'var(--color-text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                          }}
                        >
                          <ChevronDown size={14} style={{ transform: cerradosExpanded ? 'none' : 'rotate(-90deg)' }} />
                          Cerrados ({lotesCerrados.length})
                        </button>
                        {cerradosExpanded && (
                          <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                            {lotesCerrados.map((lote, idx) => renderLoteCard(lote, idx))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {vistaActual === 'detalle-lote' && (() => {
            // isLoteDatasetCerrado (dataset_status real) también decide el
            // badge de esta vista más abajo — un lote solo queda de solo
            // lectura, y solo muestra badge "Cerrado", cuando el backend lo
            // cerró de verdad vía "Finalizar", no antes.
            const isLoteCerradoReal = isLoteDatasetCerrado(loteSeleccionado);
            // Mismo criterio que canFinalizeLote en las tarjetas del listado
            // de lotes: nunca se puede finalizar/cerrar uno de los datasets
            // fijos del sistema (ej. "General de recupero"), ni uno que ya
            // esté cerrado.
            const canFinalizeLoteDetalle = !loteSeleccionado?.is_system_dataset && !isLoteCerradoReal;
            // Caja común para el botón de la barra de acciones (Cerrar lote)
            // — mismo alto/padding/radio que ya usaban los otros botones que
            // vivían acá.
            const detalleLoteActionButtonStyle = {
              height: 36,
              padding: '0 16px',
              borderRadius: 8,
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box'
            };
            return (
            <div>
              {(() => {
                const informe = detalleMetrics?.informe || null;
                const totalContactos = Number(informe?.total_contactos || 0);
                // assigned/unassigned salen del mismo counts que ya devuelve
                // GET /recovery/datasets/:id (mapRecuperoCounts) — se leen
                // acá en vez de sumar loteSeleccionado.vendedores para
                // garantizar que Sin asignar = Total - Asignados siempre
                // (misma fila de SQL, no dos cálculos independientes que
                // podrían desalinearse).
                const counts = datasetDetail?.counts || {};
                const asignados = Number(counts.assigned || 0);
                const sinAsignar = Number(counts.unassigned || 0);
                const statusBadge = isLoteCerradoReal
                  ? { label: 'Cerrado', bg: 'rgba(148,163,184,0.22)', color: 'var(--color-text-secondary)' }
                  : { label: 'Abierto', bg: '#E1F5EE', color: '#0F6E56' };
                return (
                  <div style={{
                    border: '1px solid rgba(148,163,184,0.35)',
                    background: '#fff',
                    borderRadius: 14,
                    padding: 14
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                        {loteSeleccionado?.nombre || 'Detalle de lote'}
                      </div>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '3px 10px',
                        borderRadius: 999,
                        background: statusBadge.bg,
                        color: statusBadge.color,
                        fontSize: 12,
                        fontWeight: 900
                      }}>
                        {statusBadge.label}
                      </span>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span>Total: <strong style={{ color: 'var(--color-text-primary)' }}>{totalContactos || 0}</strong></span>
                      <span>·</span>
                      <span>Asignados: <strong style={{ color: 'var(--color-text-primary)' }}>{asignados}</strong></span>
                      <span>·</span>
                      <span>Sin asignar: <strong style={{ color: 'var(--color-text-primary)' }}>{sinAsignar}</strong></span>
                    </div>
                    {datasetDetail && (
                      <div style={{
                        display: 'flex',
                        gap: 16,
                        flexWrap: 'wrap',
                        marginTop: 10,
                        paddingTop: 10,
                        borderTop: '0.5px solid rgba(15,23,42,0.16)'
                      }}>
                        {datasetDetail?.management_range?.first_at ? (
                          <>
                            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                              Primera gestión:{' '}
                              <strong style={{ color: 'var(--color-text-primary)' }}>
                                {new Date(datasetDetail.management_range.first_at).toLocaleDateString('es-UY')}
                              </strong>
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                              Última gestión:{' '}
                              <strong style={{ color: 'var(--color-text-primary)' }}>
                                {new Date(datasetDetail.management_range.last_at).toLocaleDateString('es-UY')}
                              </strong>
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                              Días transcurridos:{' '}
                              <strong style={{ color: 'var(--color-text-primary)' }}>
                                {datasetDetail.management_range.days}
                              </strong>
                            </span>
                          </>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Sin gestiones todavía.</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {detalleError ? (
                <div style={{ marginTop: 12, color: '#b91c1c', fontWeight: 800 }}>{detalleError}</div>
              ) : null}
              {detalleLoading ? (
                <div style={{ marginTop: 12, color: 'var(--muted)' }}>Cargando detalle…</div>
              ) : null}

              {detalleMetrics?.informe && (() => {
                const dCounts = datasetDetail?.counts || {};
                const pctAvance = (() => {
                  const informe = detalleMetrics?.informe || {};
                  const totalContactos = Number(informe.total_contactos || 0);
                  const totalGestionados = Number(informe.total_vendidos || 0)
                    + Number(informe.total_no_contesta || 0)
                    + Number(informe.total_rechazos || 0)
                    + Number(informe.total_dato_erroneo || 0)
                    + Number(informe.total_en_proceso || 0)
                    + Number(informe.total_incontactables || 0);
                  return totalContactos > 0 ? Math.round((totalGestionados / totalContactos) * 100) : 0;
                })();
                // Una sola fila, 3 grupos agrupados por significado (en vez
                // de 3 filas separadas) — cada grupo es el contenedor visual
                // (fondo + borde), las métricas adentro solo tienen
                // label/valor, sin tarjeta ni borde propio. Los 3 grupos
                // comparten el ancho de la fila en partes iguales
                // (flex: 1 en cada uno); si no entran cómodos en pantallas
                // angostas, el grupo entero pasa a la línea de abajo
                // (flexWrap en el contenedor exterior), nunca se parte a
                // mitad de grupo porque cada grupo es un único ítem flex.
                const groups = [
                  {
                    key: 'totales',
                    background: 'var(--color-background-secondary)',
                    items: [
                      { label: 'Total', value: detalleMetrics.informe.total_contactos, color: 'var(--color-text-primary)' },
                      { label: 'Ventas', value: detalleMetrics.informe.total_vendidos, color: '#15803D' },
                      { label: 'Rechazos', value: detalleMetrics.informe.total_rechazos, color: '#DC2626' }
                    ]
                  },
                  {
                    key: 'pendientes',
                    // Tinte de advertencia — mismo criterio que ya usa el
                    // badge "No contesta"/"En proceso" en este archivo
                    // (fondo #FAEEDA), con el color #92400E ya usado en
                    // este mismo componente para estas etiquetas.
                    background: '#FAEEDA',
                    // Fuente más chica que el resto de los grupos — este es
                    // el único con 4 etiquetas en vez de 3, y con el
                    // tamaño estándar (12px) "No contesta"/"Seguimiento"/
                    // "Dato erróneo" se cortaban con "..." al no entrar en
                    // el ancho disponible por ítem.
                    labelFontSize: 10.5,
                    items: [
                      // No estaban expuestos a nivel de dataset hasta ahora —
                      // mezclados dentro de in_progress (bug ya conocido).
                      // Backend: commit 811b999.
                      { label: 'No contesta', value: Number(dCounts.no_contesta || 0), color: '#92400E' },
                      { label: 'Rellamar', value: Number(dCounts.rellamar || 0), color: '#92400E' },
                      { label: 'Seguimiento', value: Number(dCounts.seguimiento || 0), color: '#185FA5' },
                      { label: 'Dato erróneo', value: Number(dCounts.dato_erroneo || 0), color: 'var(--color-text-secondary)' }
                    ]
                  },
                  {
                    key: 'indicadores',
                    // Tinte de éxito — mismo fondo/color que ya usa el badge
                    // "Abierto" de la tarjeta de lote (#E1F5EE / #0F6E56).
                    background: '#E1F5EE',
                    items: [
                      { label: '% Avance', value: `${pctAvance}%`, color: '#0F766E' },
                      // % Contacto y Efectividad ya vienen calculados por el
                      // backend (GET /recovery/datasets/:id ->
                      // counts.contact_pct / counts.effectiveness_pct) — no
                      // se recalculan acá.
                      { label: '% Contacto', value: `${Number(dCounts.contact_pct || 0)}%`, color: '#185FA5' },
                      { label: 'Efectividad', value: `${Number(dCounts.effectiveness_pct || 0)}%`, color: '#0F6E56' }
                    ]
                  }
                ];
                return (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                    {groups.map((group) => (
                      <div
                        key={group.key}
                        style={{
                          display: 'flex',
                          flex: '1 1 0',
                          minWidth: 220,
                          gap: 14,
                          background: group.background,
                          borderRadius: 12,
                          border: '0.5px solid rgba(15,23,42,0.16)',
                          padding: '14px 16px'
                        }}
                      >
                        {group.items.map((m) => (
                          <div key={m.label} style={{ flex: '1 1 0', minWidth: 0 }}>
                            <div style={{ fontSize: group.labelFontSize || 12, color: 'var(--color-text-secondary)', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</div>
                            <div style={{ fontSize: 'clamp(16px, 2.4vw, 24px)', fontWeight: 900, color: m.color, marginTop: 2, wordBreak: 'break-word' }}>{m.value ?? '—'}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div style={{ marginTop: 14, border: '1px solid rgba(148,163,184,0.35)', borderRadius: 14, padding: 14, background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-text-primary)' }}>Vendedores asignados</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      Cantidad de contactos asignados por vendedor.
                    </div>
                  </div>
                  {!isLoteCerradoReal && (
                    <button
                      type="button"
                      onClick={openAddSellerModal}
                      disabled={!loteSeleccionado?.id}
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: '#0F6E56',
                        background: '#E1F5EE',
                        border: '1px solid #5DCAA5',
                        borderRadius: 8,
                        padding: '7px 12px',
                        cursor: loteSeleccionado?.id ? 'pointer' : 'not-allowed',
                        opacity: loteSeleccionado?.id ? 1 : 0.7
                      }}
                    >
                      + Agregar vendedor
                    </button>
                  )}
                </div>

                {sellerMutationFeedback.message ? (
                  <div style={{
                    marginBottom: 12,
                    borderRadius: 10,
                    padding: '10px 12px',
                    border: sellerMutationFeedback.type === 'error' ? '1px solid #F09595' : '1px solid #5DCAA5',
                    background: sellerMutationFeedback.type === 'error' ? '#FCEBEB' : '#E1F5EE',
                    color: sellerMutationFeedback.type === 'error' ? '#A32D2D' : '#0F6E56',
                    fontSize: 12,
                    fontWeight: 700
                  }}>
                    {sellerMutationFeedback.message}
                  </div>
                ) : null}

                {(loteSeleccionado?.vendedores || []).length ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                    {(loteSeleccionado?.vendedores || []).map((vendedor) => {
                      const nombre = `${vendedor?.nombre || ''} ${vendedor?.apellido || ''}`.trim() || vendedor?.email || 'Vendedor';
                      const total = Number(vendedor?.total_contactos || vendedor?.cantidad || 0);
                      const gestionados = Number(vendedor?.gestionados || vendedor?.total_gestionado || 0);
                      const ventas = Number(vendedor?.ventas || 0);
                      const pendientesGestion = Number(vendedor?.pendientes_gestion || 0);
                      return (
                        <div
                          key={vendedor?.id || nombre}
                          style={{
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-start',
                            gap: 10,
                            padding: 14,
                            borderRadius: 14,
                            background: '#fff',
                            border: '1px solid rgba(148,163,184,0.28)',
                            // Relieve/highlight verde decorativo — da sensación
                            // de "activo", no depende de ningún estado real de
                            // conexión del vendedor.
                            boxShadow: 'inset 0 0 0 3px rgba(29,158,117,0.45)'
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)', paddingRight: isLoteCerradoReal ? 0 : 30, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {nombre}
                          </div>
                          <div style={{ display: 'grid', gap: 4 }}>
                            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                              Asignados: <strong style={{ color: 'var(--color-text-primary)' }}>{total}</strong>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                              Ventas: <strong style={{ color: '#15803D' }}>{ventas}</strong>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                              Pendientes: <strong style={{ color: '#92400E' }}>{pendientesGestion}</strong>
                            </div>
                          </div>
                          {!isLoteCerradoReal && (
                            <div data-vendor-menu style={{ position: 'absolute', top: 10, right: 10 }}>
                              <button
                                type="button"
                                onClick={() => setOpenVendorMenuId((prev) => (String(prev) === String(vendedor?.id) ? null : vendedor?.id))}
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: 8,
                                  border: '1px solid rgba(148,163,184,0.45)',
                                  background: '#fff',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--color-text-secondary)'
                                }}
                                aria-label="Más acciones"
                              >
                                <MoreHorizontal size={16} />
                              </button>
                              {String(openVendorMenuId) === String(vendedor?.id) && (
                                <div style={{
                                  position: 'absolute',
                                  top: 'calc(100% + 4px)',
                                  right: 0,
                                  zIndex: 50,
                                  background: '#fff',
                                  border: '0.5px solid rgba(15,23,42,0.16)',
                                  borderRadius: 10,
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                  minWidth: 160,
                                  padding: '6px 0'
                                }}>
                                  <button
                                    type="button"
                                    onClick={() => { setOpenVendorMenuId(null); openRemoveSellerModal({ sellerId: vendedor?.id, sellerName: nombre, contactCount: total, gestionados }, { step: 2, mode: 'specific' }); }}
                                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}
                                  >
                                    Reasignar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setOpenVendorMenuId(null); openRemoveSellerModal({ sellerId: vendedor?.id, sellerName: nombre, contactCount: total, gestionados }, { step: 1, mode: 'specific' }); }}
                                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#993C1D' }}
                                  >
                                    Quitar
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    Sin vendedores asignados.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 800 }}>
                  {detalleContactsTotal.toLocaleString('es-UY')} contactos
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <select
                    value={detalleMotivoBajaFilter}
                    onChange={(event) => { setDetalleMotivoBajaFilter(event.target.value); setDetalleContactsPage(1); }}
                    style={recuperoFilterSelectStyle}
                  >
                    <option value="">Motivo de baja: todos</option>
                    {detalleFilterOptions.motivo_baja.map((motivo) => (
                      <option key={motivo} value={motivo}>{motivo}</option>
                    ))}
                  </select>
                  <select
                    value={detalleResultadoFilter}
                    onChange={(event) => { setDetalleResultadoFilter(event.target.value); setDetalleContactsPage(1); }}
                    style={recuperoFilterSelectStyle}
                  >
                    <option value="">Estado: todos</option>
                    {(detalleFilterOptions.resultado_gestion.length
                      ? detalleFilterOptions.resultado_gestion
                      : RECUPERO_RESULTADO_GESTION_OPTIONS.map((o) => o.value)
                    ).map((value) => (
                      <option key={value} value={value}>
                        {RECUPERO_RESULTADO_GESTION_LABELS[value] || value}
                      </option>
                    ))}
                  </select>
                  {showDetalleSearch ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        className="input"
                        value={detalleSearch}
                        onChange={(event) => setDetalleSearch(event.target.value)}
                        placeholder="Buscar por teléfono o celular..."
                        style={{ height: 36, width: 240 }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => { setDetalleSearch(''); setShowDetalleSearch(false); }}
                        style={{
                          background: '#fff',
                          border: '1px solid rgba(148,163,184,0.55)',
                          borderRadius: 8,
                          padding: '7px 12px',
                          fontSize: 13,
                          fontWeight: 900,
                          cursor: 'pointer',
                          color: 'var(--color-text-primary)'
                        }}
                      >
                        Cerrar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDetalleSearch(true)}
                      style={{
                        background: '#fff',
                        border: '1px solid rgba(148,163,184,0.55)',
                        borderRadius: 8,
                        padding: '7px 14px',
                        fontSize: 13,
                        fontWeight: 900,
                        cursor: 'pointer',
                        color: 'var(--color-text-primary)'
                      }}
                    >
                      Buscar
                    </button>
                  )}
                  {!isLoteCerradoReal && (
                    <button
                      type="button"
                      onClick={openAddDataModal}
                      disabled={!loteSeleccionado?.id}
                      style={{
                        background: '#E1F5EE',
                        border: '1px solid #5DCAA5',
                        borderRadius: 8,
                        padding: '7px 14px',
                        fontSize: 13,
                        fontWeight: 900,
                        cursor: loteSeleccionado?.id ? 'pointer' : 'not-allowed',
                        color: '#0F6E56',
                        opacity: loteSeleccionado?.id ? 1 : 0.7
                      }}
                    >
                      Agregar datos
                    </button>
                  )}
                </div>
              </div>

              {detalleContactsError ? (
                <div style={{ fontSize: 12, color: '#b91c1c', fontWeight: 800, marginTop: 10 }}>{detalleContactsError}</div>
              ) : null}
              <div className="table-wrap" style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto', marginTop: 10 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={recuperoThStyle}>Contacto</th>
                      <th style={recuperoThStyle}>Teléfono</th>
                      <th style={recuperoThStyle}>Motivo de baja</th>
                      <th style={recuperoThStyle}>Fecha de baja</th>
                      <th style={recuperoThStyle}>Vendedor asignado</th>
                      <th style={recuperoThStyle}>Estado / resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detalleContacts || [])
                      .map((row, idx) => (
                      (() => {
                        const fullName = [row.nombre, row.apellido].filter(Boolean).join(' ')
                          || row.name
                          || row.contacto
                          || '—';
                        const telefono = row.telefono || row.celular || row.phone || '—';
                        const motivoBaja = row.motivo_baja || row.motivo_baja_detalle || '—';
                        const estadoRaw = row.estado_venta || row.ultimo_estado_gestion || row.estado || row.status || '—';
                        const estadoNorm = String(estadoRaw || '').toLowerCase();
                        const estadoMeta = (() => {
                          if (estadoNorm === 'venta' || estadoNorm === 'alta') return { bg: '#EAF3DE', color: '#3B6D11', label: 'Venta' };
                          if (estadoNorm === 'rechazo' || estadoNorm === 'rechazado') return { bg: '#FCEBEB', color: '#A32D2D', label: 'Rechazo' };
                          if (estadoNorm === 'no_contesta') return { bg: '#FAEEDA', color: '#854F0B', label: 'No contesta' };
                          if (estadoNorm === 'dato_erroneo') return { bg: '#F1EFE8', color: '#5F5E5A', label: 'Dato erróneo' };
                          if (estadoNorm === 'incontactable') return { bg: '#FCEBEB', color: '#791F1F', label: 'Incontactable' };
                          if (estadoNorm === 'nuevo' || estadoNorm === 'nuevos') return { bg: '#E1F5EE', color: '#0F6E56', label: 'Nuevo' };
                          return { bg: 'rgba(148,163,184,0.18)', color: 'var(--color-text-secondary)', label: estadoRaw || '—' };
                        })();
                        return (
                          <tr key={row.id ?? idx}>
                            <td style={recuperoTdStyle}>
                              <div style={{ fontWeight: 900, color: 'var(--color-text-primary)' }}>{fullName}</div>
                            </td>
                            <td style={recuperoTdStyle}>{telefono}</td>
                            <td style={recuperoTdStyle}>{motivoBaja}</td>
                            <td style={recuperoTdStyle}>{row.fecha_baja ? formatDateTime(row.fecha_baja) : '—'}</td>
                            <td style={recuperoTdStyle}>{row.seller_name || '—'}</td>
                            <td style={recuperoTdStyle}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '4px 10px',
                                borderRadius: 999,
                                background: estadoMeta.bg,
                                color: estadoMeta.color,
                                fontSize: 12,
                                fontWeight: 800,
                                whiteSpace: 'nowrap'
                              }}>
                                {estadoMeta.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })()
                    ))}
                    {detalleContactsLoading ? (
                      <tr><td colSpan={6} style={{ padding: 14, color: 'var(--muted)' }}>Cargando candidatos...</td></tr>
                    ) : (!detalleContacts || !detalleContacts.length) ? (
                      <tr><td colSpan={6} style={{ padding: 14, color: 'var(--muted)' }}>Sin contactos para este lote.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Página {detalleContactsPage} de {Math.max(1, Math.ceil(detalleContactsTotal / PAGE_SIZE))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setDetalleContactsPage((prev) => Math.max(1, prev - 1))}
                    disabled={detalleContactsPage <= 1 || detalleContactsLoading}
                    style={{
                      ...recuperoFilterSelectStyle,
                      cursor: (detalleContactsPage <= 1 || detalleContactsLoading) ? 'not-allowed' : 'pointer',
                      opacity: (detalleContactsPage <= 1 || detalleContactsLoading) ? 0.55 : 1
                    }}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetalleContactsPage((prev) => Math.min(Math.max(1, Math.ceil(detalleContactsTotal / PAGE_SIZE)), prev + 1))}
                    disabled={detalleContactsPage >= Math.max(1, Math.ceil(detalleContactsTotal / PAGE_SIZE)) || detalleContactsLoading}
                    style={{
                      ...recuperoFilterSelectStyle,
                      cursor: (detalleContactsPage >= Math.max(1, Math.ceil(detalleContactsTotal / PAGE_SIZE)) || detalleContactsLoading) ? 'not-allowed' : 'pointer',
                      opacity: (detalleContactsPage >= Math.max(1, Math.ceil(detalleContactsTotal / PAGE_SIZE)) || detalleContactsLoading) ? 0.55 : 1
                    }}
                  >
                    Siguiente
                  </button>
                </div>
              </div>

              {canFinalizeLoteDetalle && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => openFinalizeLoteModal(loteSeleccionado)}
                    disabled={!loteSeleccionado?.id || finalizeLoteLoading}
                    style={{
                      ...detalleLoteActionButtonStyle,
                      background: '#fff',
                      border: '1px solid rgba(148,163,184,0.55)',
                      fontWeight: 800,
                      cursor: loteSeleccionado?.id ? 'pointer' : 'not-allowed',
                      color: 'var(--color-text-primary)',
                      opacity: loteSeleccionado?.id ? 1 : 0.7
                    }}
                  >
                    Cerrar lote
                  </button>
                </div>
              )}
            </div>
            );
          })()}

          {vistaActual === 'produccion' && (
            <RecuperoProduccionView
              Panel={Panel}
              api={api}
              active={vistaActual === 'produccion'}
              onSync={markSync}
            />
          )}

          {vistaActual === 'resultados' && (
            <RecuperoResultadosView Panel={Panel} />
          )}

          {vistaActual === 'recupero' && (
            <>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {Number(total || 0).toLocaleString('es-UY')} contactos disponibles
            </span>
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
            {[
              { key: 'prioritario', label: `Prioritario · 0-${RECUPERO_PRIORITARIO_MESES} meses`, Icon: Clock, count: segmentoCounts.prioritario, error: segmentoCountsError.prioritario },
              { key: 'resto', label: 'Resto de la cartera', Icon: Archive, count: segmentoCounts.resto, error: segmentoCountsError.resto }
            ].map((segmento) => {
              const isActive = segmentoRecupero === segmento.key;
              const countText = segmento.count !== null
                ? Number(segmento.count).toLocaleString('es-UY')
                : (segmento.error ? '—' : '');
              return (
                <button
                  key={segmento.key}
                  type="button"
                  onClick={() => setSegmentoRecupero(segmento.key)}
                  style={{
                    flex: '1 1 0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: 10,
                    borderRadius: 8,
                    border: isActive ? 'none' : '0.5px solid rgba(15,23,42,0.16)',
                    background: isActive ? '#E1F5EE' : '#fff',
                    color: isActive ? '#0F6E56' : 'var(--color-text-secondary)',
                    fontWeight: isActive ? 700 : 600,
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  <segmento.Icon size={16} />
                  {segmento.label}{countText ? ` (${countText})` : ''}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: 12, flexWrap: 'wrap' }}>
            <div className="toolbar" style={{ gap: 8, marginBottom: 0, alignItems: 'center', flexWrap: 'wrap' }}>
              {activeFilterCount > 0 && (
                <Button variant="ghost" icon={<Filter size={16} />} onClick={clearAllFilters} style={{ height: 40, borderRadius: 10 }}>
                  Limpiar filtros
                </Button>
              )}
              <button
                type="button"
                title="Columnas"
                aria-label="Columnas"
                onClick={() => setColumnsPanelOpen((prev) => !prev)}
                style={recuperoIconButtonStyle}
              >
                <Columns size={16} />
              </button>
              <button
                type="button"
                title="Actualizar"
                aria-label="Actualizar"
                onClick={() => loadRecupero({ force: true })}
                style={recuperoIconButtonStyle}
              >
                <RefreshCw size={16} />
              </button>
            </div>
            </div>

          <div style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            marginBottom: 12,
            padding: '12px 16px',
            background: '#F8F7F4',
            borderRadius: 10,
            border: '0.5px solid rgba(15,23,42,0.16)'
          }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '2 1 200px', minWidth: 180 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Nombre o teléfono
              </label>
              <input
                type="text"
                value={columnFiltersDraft.contacto || ''}
                onChange={(e) => setColumnFiltersDraft((prev) => ({ ...prev, contacto: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const errors = validateColumnFilters(columnFiltersDraft);
                    setFilterErrors(errors);
                    if (!Object.keys(errors).length) {
                      setColumnFiltersApplied({ ...columnFiltersDraft });
                      setPage(1);
                    }
                  }
                }}
                placeholder="Buscar..."
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '0.5px solid rgba(15,23,42,0.16)',
                  fontSize: 13,
                  background: '#fff',
                  outline: 'none'
                }}
              />
            </div>

            <div
              data-filter-popover
              style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 180px', minWidth: 180, position: 'relative' }}
            >
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Motivo de baja
              </label>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setOpenFilterColumn((prev) => (prev === 'motivo_baja' ? '' : 'motivo_baja'))}
                  style={{
                    width: '100%',
                    padding: '8px 32px 8px 12px',
                    borderRadius: 8,
                    border: '0.5px solid rgba(15,23,42,0.16)',
                    background: '#fff',
                    fontSize: 13,
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: columnFiltersDraft.motivo_baja?.length ? '#0F766E' : 'var(--color-text-secondary)',
                    fontWeight: columnFiltersDraft.motivo_baja?.length ? 600 : 400,
                    position: 'relative'
                  }}
                >
                  {columnFiltersDraft.motivo_baja?.length
                    ? `${columnFiltersDraft.motivo_baja.length} seleccionado${columnFiltersDraft.motivo_baja.length > 1 ? 's' : ''}`
                    : 'Todos los motivos'}
                  <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                </button>

                {openFilterColumn === 'motivo_baja' && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    zIndex: 100,
                    background: '#fff',
                    border: '0.5px solid rgba(15,23,42,0.16)',
                    borderRadius: 10,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                    minWidth: 220,
                    maxHeight: 260,
                    overflowY: 'auto',
                    padding: '6px 0'
                  }}>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 14px', cursor: 'pointer', fontSize: 13,
                      borderBottom: '0.5px solid rgba(15,23,42,0.16)',
                      fontWeight: 600
                    }}>
                      <input
                        type="checkbox"
                        checked={!columnFiltersDraft.motivo_baja?.length}
                        onChange={() => setColumnFiltersDraft((prev) => ({ ...prev, motivo_baja: [] }))}
                      />
                      Todos los motivos
                    </label>
                    {(filterOptions.motivos?.length
                      ? filterOptions.motivos
                      : Object.entries(MOTIVO_LABELS).map(([k, v]) => ({ value: k, label: v.label }))
                    ).map((m) => {
                      const val = typeof m === 'string' ? m : (m.value ?? m);
                      const lbl = typeof m === 'string' ? m : (m.label ?? val);
                      const checked = (columnFiltersDraft.motivo_baja || []).includes(val);
                      return (
                        <label key={val} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 14px', cursor: 'pointer', fontSize: 13,
                          background: checked ? 'rgba(15,118,110,0.06)' : 'transparent'
                        }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setColumnFiltersDraft((prev) => {
                                const current = prev.motivo_baja || [];
                                return {
                                  ...prev,
                                  motivo_baja: checked
                                    ? current.filter((v) => v !== val)
                                    : [...current, val]
                                };
                              });
                            }}
                          />
                          {lbl}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div
              data-filter-popover
              style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 180px', minWidth: 180, position: 'relative' }}
            >
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Producto anterior
              </label>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setOpenFilterColumn((prev) => (prev === 'producto' ? '' : 'producto'))}
                  style={{
                    width: '100%',
                    padding: '8px 32px 8px 12px',
                    borderRadius: 8,
                    border: '0.5px solid rgba(15,23,42,0.16)',
                    background: '#fff',
                    fontSize: 13,
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: columnFiltersDraft.producto?.length ? '#0F766E' : 'var(--color-text-secondary)',
                    fontWeight: columnFiltersDraft.producto?.length ? 600 : 400,
                    position: 'relative'
                  }}
                >
                  {columnFiltersDraft.producto?.length
                    ? `${columnFiltersDraft.producto.length} seleccionado${columnFiltersDraft.producto.length > 1 ? 's' : ''}`
                    : 'Todos los productos'}
                  <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                </button>

                {openFilterColumn === 'producto' && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    zIndex: 100,
                    background: '#fff',
                    border: '0.5px solid rgba(15,23,42,0.16)',
                    borderRadius: 10,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                    minWidth: 220,
                    maxHeight: 260,
                    overflowY: 'auto',
                    padding: '6px 0'
                  }}>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 14px', cursor: 'pointer', fontSize: 13,
                      borderBottom: '0.5px solid rgba(15,23,42,0.16)',
                      fontWeight: 600
                    }}>
                      <input
                        type="checkbox"
                        checked={!columnFiltersDraft.producto?.length}
                        onChange={() => setColumnFiltersDraft((prev) => ({ ...prev, producto: [] }))}
                      />
                      Todos los productos
                    </label>
                    {(filterOptions.productos || []).map((p) => {
                      const val = typeof p === 'string' ? p : (p.value ?? p);
                      const lbl = typeof p === 'string' ? p : (p.label ?? val);
                      const checked = (columnFiltersDraft.producto || []).includes(val);
                      return (
                        <label key={val} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 14px', cursor: 'pointer', fontSize: 13,
                          background: checked ? 'rgba(15,118,110,0.06)' : 'transparent'
                        }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setColumnFiltersDraft((prev) => {
                                const current = prev.producto || [];
                                return {
                                  ...prev,
                                  producto: checked
                                    ? current.filter((v) => v !== val)
                                    : [...current, val]
                                };
                              });
                            }}
                          />
                          {lbl}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 150px', minWidth: 150 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Fecha baja desde
              </label>
              <input
                type="date"
                value={columnFiltersDraft.fecha_baja_desde || ''}
                onChange={(e) => setColumnFiltersDraft((prev) => ({ ...prev, fecha_baja_desde: e.target.value }))}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '0.5px solid rgba(15,23,42,0.16)',
                  fontSize: 13,
                  background: '#fff'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 150px', minWidth: 150 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Fecha baja hasta
              </label>
              <input
                type="date"
                value={columnFiltersDraft.fecha_baja_hasta || ''}
                onChange={(e) => setColumnFiltersDraft((prev) => ({ ...prev, fecha_baja_hasta: e.target.value }))}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '0.5px solid rgba(15,23,42,0.16)',
                  fontSize: 13,
                  background: '#fff'
                }}
              />
              {filterErrors.fecha_baja && (
                <span style={{ fontSize: 11, color: '#b91c1c' }}>{filterErrors.fecha_baja}</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingBottom: 0 }}>
              <button
                type="button"
                onClick={() => {
                  if (openFilterColumn === 'motivo_baja' || openFilterColumn === 'producto') setOpenFilterColumn('');
                  const errors = validateColumnFilters(columnFiltersDraft);
                  setFilterErrors(errors);
                  if (!Object.keys(errors).length) {
                    setColumnFiltersApplied({ ...columnFiltersDraft });
                    setPage(1);
                  }
                }}
                style={{
                  padding: '8px 20px',
                  height: 40,
                  borderRadius: 10,
                  border: 'none',
                  background: '#0F766E',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Aplicar
              </button>
            </div>

          </div>

          {activeChips.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {activeChips.map((chip) => (
                <span key={chip.id} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(15, 118, 110, 0.08)',
                  color: '#0f766e',
                  fontSize: 12,
                  fontWeight: 600
                }}>
                  {chip.label}
                  <button
                    type="button"
                    onClick={() => clearColumnField(chip.id)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#0f766e', fontWeight: 700 }}
                    aria-label="Eliminar filtro"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearAllFilters}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#9f1239',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Limpiar todo
              </button>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              <span>{activeFilterCount} filtros · {total.toLocaleString('es-UY')} resultados</span>
              <button
                type="button"
                onClick={() => setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                style={{
                  marginLeft: 10,
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '0.5px solid rgba(15,23,42,0.16)',
                  background: '#fff',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 12
                }}
              >
                {sortDir === 'desc'
                  ? '↑ Más antiguo primero'
                  : '↓ Más reciente primero'}
              </button>
            </div>
          </div>
        ) : (
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span>{total.toLocaleString('es-UY')} resultados</span>
                <button
                  type="button"
                  onClick={() => setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '0.5px solid rgba(15,23,42,0.16)',
                    background: '#fff',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 12
                  }}
                >
                  {sortDir === 'desc'
                    ? '↑ Más antiguo primero'
                    : '↓ Más reciente primero'}
                </button>
              </div>
            </div>
          )}

          {columnsPanelOpen && (
            <div style={{
              border: '1px solid rgba(148,163,184,0.3)',
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
              background: '#fff'
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Columnas visibles</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 6 }}>
                {allColumns.map((col) => (
                  <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={isColumnVisible(col.id)}
                      disabled={col.required}
                      onChange={() => {
                        if (col.required) return;
                        setVisibleColumns((prev) => {
                          const current = prev.length ? prev : allColumns.map((c) => c.id);
                          return current.includes(col.id)
                            ? current.filter((id) => id !== col.id)
                            : [...current, col.id];
                        });
                      }}
                    />
                    <span>{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error ? (
            <div style={{ marginBottom: 12, color: '#b91c1c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span>{error}</span>
              <Button variant="ghost" onClick={() => loadRecupero({ force: true })}>Reintentar</Button>
            </div>
          ) : null}
          {loading ? <div style={{ marginBottom: 12, color: 'var(--muted)' }}>Cargando recupero...</div> : null}

          <div className="table-wrap" style={{ overflowX: 'auto', overflowY: 'visible' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ ...recuperoThStyle, width: 36, textAlign: 'center' }}>
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allVisibleSelected && visibleSelectableIds.length > 0}
                      onChange={toggleSelectAllVisible}
                      disabled={activeTab !== 'disponibles' || !visibleSelectableIds.length}
                      aria-label="Seleccionar todos los contactos visibles"
                    />
                  </th>
                  <th style={recuperoThStyle}>Contacto</th>
                  <th style={recuperoThStyle}>Producto</th>
                  <th style={recuperoThStyle}>Motivo de baja</th>
                  <th style={recuperoThStyle}>Fecha de baja</th>
                  <th style={{ ...recuperoThStyle, width: 56, whiteSpace: 'nowrap' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((row) => {
                  const nombre = getContactoNombre(row);
                  const initials = nombre.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
                  const motivoInfo = getMotivoInfo(row);
                  const fechaBaja = row.fecha_baja || row.fechaBaja || null;
                  const isExpanded = String(expandedRowId) === String(row.id);
                  const toggleExpand = () => setExpandedRowId((prev) => (String(prev) === String(row.id) ? null : row.id));
                  return (
                    <React.Fragment key={row.id}>
                      <tr style={{ background: isExpanded ? 'rgba(148,163,184,0.12)' : undefined }}>
                        <td style={{ ...recuperoTdStyle, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(row.id)}
                            onChange={() => toggleSelection(row.id)}
                            disabled={activeTab !== 'disponibles'}
                            aria-label="Seleccionar contacto"
                          />
                        </td>
                        <td style={recuperoTdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 34,
                              height: 34,
                              borderRadius: 999,
                              background: 'rgba(249,115,22,0.14)',
                              color: '#9a3412',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 13,
                              flexShrink: 0
                            }}>
                              {initials || '—'}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <button
                                type="button"
                                onClick={toggleExpand}
                                style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                              >
                                <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{nombre}</div>
                              </button>
                            </div>
                          </div>
                        </td>
                        <td style={recuperoTdStyle}>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 13 }}>
                            {row.nombre_producto || row.producto_anterior || '—'}
                          </div>
                          {row.precio && (
                            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                              ${Number(row.precio).toLocaleString('es-UY')}
                            </div>
                          )}
                        </td>
                        <td style={recuperoTdStyle}>
                          <span style={{ color: motivoInfo.color, fontSize: 12, fontWeight: 500 }}>
                            {motivoInfo.label}
                          </span>
                        </td>
                        <td style={{ ...recuperoTdStyle, fontSize: 13, color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                          {row.fecha_baja ? formatDate(row.fecha_baja) : '—'}
                        </td>
                        <td style={{ ...recuperoTdStyle, width: 56, whiteSpace: 'nowrap' }}>
                          <div data-row-menu style={{ position: 'relative', display: 'inline-block' }}>
                            <button
                              type="button"
                              onClick={() => setOpenRowMenuId((prev) => (String(prev) === String(row.id) ? null : row.id))}
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                border: '0.5px solid rgba(15,23,42,0.16)',
                                background: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              aria-label="Más acciones"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                            {String(openRowMenuId) === String(row.id) && (
                              <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 4px)',
                                right: 0,
                                zIndex: 50,
                                background: '#fff',
                                border: '0.5px solid rgba(15,23,42,0.16)',
                                borderRadius: 10,
                                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                minWidth: 160,
                                padding: '6px 0'
                              }}>
                                <button
                                  type="button"
                                  onClick={() => { setOpenRowMenuId(null); openAssign([row.id], row); }}
                                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}
                                >
                                  {getVendedorAsignado(row) ? 'Reasignar' : 'Asignar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setOpenRowMenuId(null); toggleExpand(); }}
                                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}
                                >
                                  {isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={6} style={{ background: 'rgba(148,163,184,0.12)', padding: '12px 14px', borderTop: '0.5px solid rgba(15,23,42,0.16)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                                  Datos del contacto
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                  <div>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Documento</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{row.documento || row.cedula || row.ci || '—'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Teléfono</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatTelefono(row.telefono) || formatTelefono(row.celular) || row.phone || '—'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Producto</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{row.nombre_producto || row.producto_anterior || '—'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Precio</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{row.precio || row.monto || row.precio_producto || '—'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Departamento</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{row.departamento || row.depto || '—'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Último pago</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{row.ultimo_pago || row.ultimoPago || '—'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Forma de pago</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{row.forma_pago || row.medio_pago || row.medioPago || '—'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Vendedor origen</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{row.vendedor_origen || '—'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Fecha de alta original</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{row.fecha_alta_original ? formatDate(row.fecha_alta_original) : (row.fecha_alta ? formatDate(row.fecha_alta) : '—')}</div>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                                  Historial
                                </div>
                                {Array.isArray(row.historial) && row.historial.length ? (
                                  <div style={{ display: 'grid', gap: 10 }}>
                                    {row.historial.map((h, idx) => (
                                      <div key={idx} style={{ borderLeft: '2px solid rgba(148,163,184,0.6)', paddingLeft: 10 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                          {h.estado || h.resultado || h.label || 'Gestión'}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                                          {h.fecha ? formatDateTime(h.fecha) : '—'}
                                        </div>
                                        {h.nota && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{h.nota}</div>}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                                    Sin gestiones registradas
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            {!loading && !visibleItems.length ? (
              <div style={{ padding: 16, color: 'var(--muted)' }}>No hay clientes para recuperar.</div>
            ) : null}
          </div>

          <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 12 }}>
            <div style={{ color: 'var(--muted)' }}>
              Mostrando {visibleItems.length} de {total}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>Anterior</Button>
              <div style={{ fontWeight: 600 }}>Página {page} de {totalPages}</div>
              <Button variant="ghost" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>Siguiente</Button>
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div style={{
              position: 'fixed',
              left: '50%',
              bottom: 24,
              transform: 'translateX(-50%)',
              zIndex: 200,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '10px 14px',
              borderRadius: 12,
              background: '#fff',
              border: '0.5px solid rgba(15,23,42,0.16)',
              boxShadow: '0 12px 32px rgba(15,23,42,0.18)'
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                {selectedIds.length} seleccionado{selectedIds.length > 1 ? 's' : ''}
              </span>
              <Button onClick={() => openAssign(selectedIds)} style={{ height: 40, borderRadius: 10 }}>
                Asignar
              </Button>
              <Button
                variant="ghost"
                style={{ height: 40, borderRadius: 10 }}
                onClick={() => downloadRowsAsCsv(
                  visibleItems.filter((row) => selectedIds.includes(row.id)),
                  'recupero-seleccion.csv'
                )}
              >
                Exportar selección
              </Button>
              <Button variant="ghost" style={{ height: 40, borderRadius: 10 }} onClick={() => setSelectedIds([])}>
                Limpiar
              </Button>
            </div>
          )}
            </>
          )}

        </Panel>
      </section>

      {finalizeLoteTarget && (
        <div className="lot-wizard-overlay" onClick={closeFinalizeLoteModal}>
          <div className="lot-wizard" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="lot-wizard-header">
              <div style={{ fontWeight: 700 }}>Finalizar lote</div>
              <button className="close-btn" onClick={closeFinalizeLoteModal}><X size={16} /></button>
            </div>
            <div className="lot-wizard-content">
              <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-primary)' }}>
                Al finalizar el lote los datos útiles van a lote principal.
              </p>
              {finalizeLoteError ? (
                <div style={{ marginTop: 12, fontSize: 12, color: '#b91c1c', fontWeight: 700 }}>
                  {finalizeLoteError}
                </div>
              ) : null}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '0 24px 24px' }}>
              <Button variant="ghost" onClick={closeFinalizeLoteModal} disabled={finalizeLoteLoading}>Cancelar</Button>
              <Button
                onClick={handleConfirmFinalizeLote}
                disabled={finalizeLoteLoading}
                style={{ background: '#DC2626', color: '#fff' }}
              >
                {finalizeLoteLoading ? 'Finalizando...' : 'Finalizar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCreateLoteModal && (
        <div className="lot-wizard-overlay" onClick={closeCreateLoteModal}>
          <div className="lot-wizard" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="lot-wizard-header">
              <div style={{ fontWeight: 700 }}>Crear lote</div>
              <button className="close-btn" onClick={closeCreateLoteModal}><X size={16} /></button>
            </div>
            <div className="lot-wizard-content">
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Nombre del lote</span>
                <input
                  className="input"
                  autoFocus
                  value={createLoteNombre}
                  onChange={(event) => { setCreateLoteNombre(event.target.value); setCreateLoteError(''); }}
                  placeholder="Ej: Sin liquidez"
                />
              </label>
              {createLoteError ? (
                <div style={{ marginTop: 12, fontSize: 12, color: '#b91c1c', fontWeight: 700 }}>
                  {createLoteError}
                </div>
              ) : null}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '0 24px 24px' }}>
              <Button variant="ghost" onClick={closeCreateLoteModal}>Cancelar</Button>
              <Button onClick={handleCreateLoteVacio} disabled={!createLoteNombre.trim() || createLoteSaving}>
                {createLoteSaving ? 'Creando...' : 'Crear lote'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {addDataOpen && (
        <div className="lot-wizard-overlay" onClick={closeAddDataModal}>
          <div className="lot-wizard" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="lot-wizard-header">
              <div style={{ fontWeight: 700 }}>Agregar datos al lote</div>
              <button className="close-btn" onClick={closeAddDataModal}><X size={16} /></button>
            </div>
            <div className="lot-wizard-content">
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                Lote: <strong>{loteSeleccionado?.nombre || '-'}</strong> · Seleccionados: <strong>{addDataSelectedIds.length}</strong>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12, background: 'var(--color-background-secondary)', borderRadius: 8, padding: '8px 10px' }}>
                Estos contactos se asignan al mismo vendedor del lote. La vinculación formal al lote
                como entidad está pendiente de una migración de backend.
              </div>
              {addDataError ? (
                <div style={{ marginBottom: 12, fontSize: 12, color: '#b91c1c', fontWeight: 700 }}>
                  {addDataError}
                </div>
              ) : null}
              <div style={{ maxHeight: 320, overflowY: 'auto', border: '0.5px solid rgba(15,23,42,0.16)', borderRadius: 10 }}>
                {addDataLoading ? (
                  <div style={{ padding: 16, color: 'var(--color-text-secondary)' }}>Cargando contactos disponibles...</div>
                ) : addDataContacts.length === 0 ? (
                  <div style={{ padding: 16, color: 'var(--color-text-secondary)' }}>No hay contactos disponibles.</div>
                ) : (
                  addDataContacts.map((contact) => (
                    <label
                      key={contact.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '0.5px solid rgba(15,23,42,0.16)', cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={addDataSelectedIds.includes(contact.id)}
                        onChange={() => toggleAddDataSelection(contact.id)}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{getContactoNombre(contact)}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          {contact.producto_anterior || contact.nombre_producto || '—'} · {contact.fecha_baja ? formatDate(contact.fecha_baja) : '—'}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '0 24px 24px' }}>
              <Button variant="ghost" onClick={closeAddDataModal}>Cancelar</Button>
              <Button onClick={handleConfirmAddData} disabled={!addDataSelectedIds.length || addDataSaving}>
                {addDataSaving ? 'Agregando...' : `Agregar (${addDataSelectedIds.length})`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {addSellerOpen && (
        <div className="lot-wizard-overlay" onClick={closeAddSellerModal}>
          <div className="lot-wizard" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="lot-wizard-header">
              <div style={{ fontWeight: 700 }}>Agregar vendedor al lote</div>
              <button className="close-btn" onClick={closeAddSellerModal}><X size={16} /></button>
            </div>
            <div className="lot-wizard-content">
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                Lote: <strong>{loteSeleccionado?.nombre || '-'}</strong>
              </div>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Vendedor</span>
                <select className="input" value={addSellerTarget} onChange={(event) => { setAddSellerTarget(event.target.value); setAddSellerError(''); }}>
                  <option value="">Seleccionar...</option>
                  {sellers
                    .filter((seller) => !(loteSeleccionado?.vendedores || []).some((assigned) => String(assigned?.id) === String(seller?.id)))
                    .map((seller) => (
                      <option key={seller.id || seller.email} value={seller.id}>
                        {seller.label}
                      </option>
                    ))}
                </select>
              </label>
              {addSellerError ? (
                <div style={{ marginTop: 12, fontSize: 12, color: '#b91c1c', fontWeight: 700 }}>
                  {addSellerError}
                </div>
              ) : null}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '0 24px 24px' }}>
              <Button variant="ghost" onClick={closeAddSellerModal}>Cancelar</Button>
              <Button onClick={handleAddSeller} disabled={sellerMutationLoading}>
                {sellerMutationLoading ? 'Agregando...' : 'Agregar vendedor'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {removeModal && (
        <div className="lot-wizard-overlay" onClick={closeRemoveSellerModal}>
          <div className="lot-wizard" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="lot-wizard-header">
              <div style={{ fontWeight: 700 }}>
                {removeStep === 1 ? 'Quitar vendedor del lote' : 'Redistribuir contactos del vendedor'}
              </div>
              <button className="close-btn" onClick={closeRemoveSellerModal}><X size={16} /></button>
            </div>
            <div className="lot-wizard-content">
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
                Lote: <strong>{loteSeleccionado?.nombre || '-'}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(20,34,53,0.04)', border: '1px solid rgba(20,34,53,0.1)', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FAECE7', color: '#993C1D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {String(removeModal?.sellerName || '').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '--'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{removeModal?.sellerName || 'Vendedor'}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    {Number(removeModal?.contactCount || 0)} contactos · {Number(removeModal?.gestionados || 0)} gestionados
                  </div>
                </div>
              </div>

              {removeStep === 1 ? (
                <>
                  <div style={{ fontSize: 12, color: '#A32D2D', background: '#FCEBEB', border: '1px solid #F09595', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                    Sus <strong>{Number(removeModal?.contactCount || 0)} contactos</strong> deben reasignarse antes de quitar al vendedor.
                    {Number(removeModal?.gestionados || 0) > 0 ? ` Las ${Number(removeModal?.gestionados || 0)} gestiones realizadas quedan en su historial.` : ''}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button variant="ghost" onClick={closeRemoveSellerModal}>Cancelar</Button>
                    <Button onClick={() => setRemoveStep(2)}>Siguiente</Button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
                    {['specific', 'roundrobin', 'pool'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => { setRemoveMode(mode); setReassignError(''); }}
                        style={{
                          textAlign: 'left',
                          borderRadius: 10,
                          border: `1px solid ${removeMode === mode ? '#1D9E75' : 'rgba(20,34,53,0.14)'}`,
                          background: removeMode === mode ? '#E1F5EE' : '#fff',
                          padding: '11px 12px',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                          {mode === 'specific' ? 'Asignar a un vendedor especifico' : mode === 'roundrobin' ? 'Distribuir entre vendedores del lote' : 'Dejar sin asignar (pool)'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                          {mode === 'specific' ? 'Todos los contactos del vendedor salen hacia un unico destino.' : mode === 'roundrobin' ? 'Los contactos se reparten entre los vendedores restantes del lote.' : 'El lote queda activo y los contactos pasan a quedar sin vendedor asignado.'}
                        </div>
                      </button>
                    ))}
                  </div>

                  {removeMode === 'pool' && (loteSeleccionado?.vendedores || []).length <= 1 ? (
                    <div style={{ fontSize: 12, background: '#E6F1FB', color: '#185FA5', border: '1px solid #85B7EB', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
                      Este lote quedara activo y sin vendedor asignado.
                    </div>
                  ) : null}

                  {removeMode === 'specific' ? (
                    <label style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Nuevo vendedor</span>
                      <select className="input" value={reassignTarget} onChange={(event) => { setReassignTarget(event.target.value); setReassignError(''); }}>
                        <option value="">Seleccionar...</option>
                        {(loteSeleccionado?.vendedores || [])
                          .filter((seller) => String(seller?.id) !== String(removeModal?.sellerId))
                          .map((seller) => {
                            const sellerName = `${seller?.nombre || ''} ${seller?.apellido || ''}`.trim() || seller?.email || 'Vendedor';
                            return (
                              <option key={seller.id || sellerName} value={seller.id}>
                                {sellerName} ({Number(seller?.total_contactos || seller?.cantidad || 0)} contactos)
                              </option>
                            );
                          })}
                      </select>
                    </label>
                  ) : null}

                  {reassignError ? (
                    <div style={{ marginBottom: 12, fontSize: 12, color: '#b91c1c', fontWeight: 700 }}>
                      {reassignError}
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <Button variant="ghost" onClick={() => setRemoveStep(1)}>Volver</Button>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button variant="ghost" onClick={closeRemoveSellerModal}>Cancelar</Button>
                      <Button onClick={handleRemoveSeller} disabled={sellerMutationLoading}>
                        {sellerMutationLoading ? 'Procesando...' : removeMode === 'specific' ? 'Confirmar reasignacion' : 'Confirmar y quitar'}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="lot-wizard-overlay" onClick={closeAssign}>
          <div className="lot-wizard" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="lot-wizard-header">
              <div style={{ fontWeight: 700 }}>Asignar contacto</div>
              <button className="close-btn" onClick={closeAssign}><X size={16} /></button>
            </div>
            <div className="lot-wizard-content">
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                Seleccionados: <strong>{assignContactIds.length}</strong>
              </div>
              {assignHasActiveProduct && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  marginBottom: 12,
                  color: '#92400e',
                  fontSize: 12,
                  fontWeight: 600
                }}>
                  ⚠ Este contacto tiene producto activo. Verificá antes de asignar.
                </div>
              )}
              <label style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>¿A qué lote?</span>
                <select className="input" value={assignLoteId} onChange={(event) => { setAssignLoteId(event.target.value); setAssignSellerId(''); }}>
                  <option value="">Seleccionar lote...</option>
                  {assignLotesAbiertos.map((lote) => (
                    <option key={asLotId(lote)} value={asLotId(lote)}>
                      {asLotName(lote)}
                    </option>
                  ))}
                </select>
              </label>
              {assignNeedsSellerPicker ? (
                <label style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Vendedor</span>
                  <select className="input" value={assignSellerId} onChange={(event) => setAssignSellerId(event.target.value)}>
                    <option value="">Seleccionar...</option>
                    {sellers.map((seller) => (
                      <option key={seller.id || seller.email} value={seller.id}>
                        {seller.label || seller.nombre || seller.email || 'Vendedor'}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div style={{ marginBottom: 12, fontSize: 13 }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Vendedor: </span>
                  <strong style={{ color: 'var(--color-text-primary)' }}>{asLotSellerName(assignSelectedLote)}</strong>
                </div>
              )}
              <label style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Notas para el vendedor (opcional)</span>
                <textarea
                  className="input"
                  rows={3}
                  value={assignNotes}
                  onChange={(event) => setAssignNotes(event.target.value)}
                  placeholder="Ej: Prioridad alta, motivo de baja..."
                  style={{ resize: 'vertical' }}
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button variant="ghost" onClick={closeAssign} disabled={creatingLot}>Cancelar</Button>
                <Button
                  onClick={handleConfirmAssign}
                  disabled={
                    creatingLot
                    || !assignLoteId
                    || (assignNeedsSellerPicker && !assignSellerId)
                  }
                >
                  {creatingLot ? 'Asignando...' : 'Confirmar asignación'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="lot-wizard-overlay" onClick={() => { resetImportState(); setShowImportModal(false); }}>
          <div className="lot-wizard" onClick={(e) => e.stopPropagation()} style={{
            maxWidth: 960,
            width: '95vw',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>

            <div className="lot-wizard-header">
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Importar candidatos a recupero</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {importStep === 1 && 'Paso 1 de 3 — Cargar archivo'}
                  {importStep === 2 && 'Paso 2 de 3 — Validación y vista previa'}
                  {importStep === 3 && 'Paso 3 de 3 — Resultado'}
                </div>
              </div>
              <button className="close-btn" onClick={() => { resetImportState(); setShowImportModal(false); }}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', gap: 6, padding: '0 24px', marginBottom: 24 }}>
              {[1, 2, 3].map((s) => (
                <div key={s} style={{
                  flex: 1, height: 5, borderRadius: 3,
                  background: s < importStep ? '#5DCAA5' : s === importStep ? '#0F766E' : 'rgba(15,23,42,0.16)',
                  transition: 'background 0.2s'
                }} />
              ))}
            </div>

            <div className="lot-wizard-content" style={{ overflowY: 'auto', flex: 1 }}>

              {importStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <label
                    htmlFor="import-file-input"
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', gap: 12, padding: '2.5rem 1.5rem',
                      borderRadius: 12,
                      border: importFile
                        ? '2px solid #0F766E'
                        : '2px dashed rgba(148,163,184,0.5)',
                      background: importFile ? '#E1F5EE' : 'var(--color-background-secondary)',
                      cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s'
                    }}
                  >
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: importFile ? '#9FE1CB' : 'var(--color-background-primary)',
                      border: '0.5px solid var(--color-border-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Upload size={24} color={importFile ? '#0F6E56' : '#0F766E'} />
                    </div>
                    {importFile ? (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#0F6E56' }}>
                          {importFile.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#0F6E56' }}>
                          {importRows.length} filas detectadas · {(importFile.size / 1024).toFixed(0)} KB
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                          Arrastrá tu archivo CSV aquí
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          o hacé clic para seleccionar desde tu carpeta
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                          Formato CSV con separador ; o , · Máx. 5 MB
                        </div>
                      </>
                    )}
                    <input
                      id="import-file-input"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {importErrors.length > 0 && (
                    <div style={{
                      padding: '10px 12px', borderRadius: 8,
                      background: '#FEF2F2', color: '#B91C1C', fontSize: 13
                    }}>
                      {importErrors.map((err, i) => <div key={i}>{err}</div>)}
                    </div>
                  )}

                  <div style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: 'var(--color-background-secondary)',
                    border: '0.5px solid rgba(15,23,42,0.16)'
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                      Columnas requeridas
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {['Nombres', 'Apellidos', 'Documento', 'Teléfono', 'ESTADO', 'FECHA DE BAJA', 'Plan contratado', 'Precio'].map((c) => (
                        <span key={c} style={{
                          padding: '3px 10px', borderRadius: 999,
                          background: '#E6F1FB', color: '#185FA5',
                          fontSize: 11, fontWeight: 600
                        }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {importStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {(() => {
                    const backendSummary = importSummary?.backendSummary || {};
                    const summaryItems = importSummary?.previewAvailable ? [
                      { label: 'OK', value: backendSummary.ok ?? 0, color: '#0F6E56' },
                      { label: 'Duplicado real', value: backendSummary.duplicado_real ?? 0, color: '#854F0B' },
                      { label: 'Grupo familiar', value: backendSummary.grupo_familiar ?? 0, color: '#185FA5' },
                      { label: 'Requiere revisión', value: backendSummary.requiere_revision ?? 0, color: '#9D174D' },
                      { label: 'Cliente activo', value: backendSummary.cliente_activo ?? 0, color: '#4338CA' },
                      { label: 'Sin documento', value: backendSummary.sin_documento ?? 0, color: '#B91C1C' }
                    ] : [];
                    return (
                      <>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{importFile?.name}</div>
                    <span style={{ padding: '2px 8px', borderRadius: 999, background: '#E1F5EE', color: '#0F6E56', fontSize: 11, fontWeight: 500 }}>
                      {importRows.length} filas leídas
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    {[
                      { label: 'Total filas', value: importSummary?.total ?? importRows.length, color: 'var(--color-text-primary)' },
                      { label: 'Listos para importar', value: importSummary?.readyToImport ?? importRows.length, color: '#0F6E56' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ fontSize: 20, fontWeight: 500, color }}>{value}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {importPreviewLoading && (
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: '#E6F1FB',
                      border: '0.5px solid #B5D4F4',
                      fontSize: 12,
                      color: '#185FA5'
                    }}>
                      Verificando duplicados, clientes activos y filas con revisión desde el backend…
                    </div>
                  )}

                  {importSummary?.previewAvailable && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 10
                    }}>
                      {summaryItems.map(({ label, value, color }) => (
                        <div key={label} style={{
                          background: 'var(--color-background-secondary)',
                          borderRadius: 8,
                          padding: '10px 12px',
                          border: '0.5px solid rgba(15,23,42,0.16)'
                        }}>
                          <div style={{ fontSize: 18, fontWeight: 600, color }}>{value}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {importPreviewNotice && (
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: '#FFF7ED',
                      border: '0.5px solid #FDBA74',
                      fontSize: 12,
                      color: '#9A3412'
                    }}>
                      {importPreviewNotice}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Vista previa — primeras filas
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                      Se muestran los datos más relevantes, pero se cargarán todas las columnas del CSV.
                    </span>
                  </div>
                  <div style={{ border: '0.5px solid rgba(15,23,42,0.16)', borderRadius: 8, overflowX: 'auto', overflowY: 'auto', maxHeight: 220 }}>
                    <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: 'var(--color-background-secondary)' }}>
                          {['Documento', 'Nombre', 'Apellido', 'Teléfono', 'Plan', 'Precio', 'Motivo baja', 'Fecha baja'].map((h) => (
                            <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '0.5px solid rgba(15,23,42,0.16)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.slice(0, 8).map((row, idx) => (
                          <tr key={idx} style={{ borderTop: '0.5px solid rgba(15,23,42,0.16)' }}>
                            <td style={{ padding: '6px 8px' }}>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.documento || '—'}</div>
                              <span style={{
                                display: 'inline-flex',
                                marginTop: 4,
                                padding: '2px 6px',
                                borderRadius: 999,
                                fontSize: 10,
                                fontWeight: 500,
                                ...getRowStatusBadgeStyle(row.rowStatus?.code)
                              }}>
                                {row.rowStatus?.label || 'Listo'}
                              </span>
                            </td>
                            <td style={{ padding: '6px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.nombre || '—'}</td>
                            <td style={{ padding: '6px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.apellido || '—'}</td>
                            <td style={{ padding: '6px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.telefono || '—'}</td>
                            <td style={{ padding: '6px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.plan || '—'}</td>
                            <td style={{ padding: '6px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.precio ? `$${row.precio}` : '—'}</td>
                            <td style={{ padding: '6px 8px' }}>
                              <span style={{ padding: '2px 6px', borderRadius: 999, background: '#FAEEDA', color: '#854F0B', fontSize: 10, fontWeight: 500 }}>
                                {row.estado || '—'}
                              </span>
                            </td>
                            <td style={{ padding: '6px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.fecha_baja || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ padding: '10px 12px', borderRadius: 8, background: '#FAEEDA44', border: '0.5px solid #FAC77566', fontSize: 12, color: '#854F0B' }}>
                    {importSummary?.previewAvailable
                      ? `Se importarán ${importSummary.readyToImport} filas (${importSummary.backendSummary?.ok ?? 0} OK, ${importSummary.backendSummary?.grupo_familiar ?? 0} grupo familiar, ${importSummary.backendSummary?.requiere_revision ?? 0} requieren revisión). Se excluirán ${importSummary.backendSummary?.duplicado_real ?? 0} duplicados reales, ${importSummary.backendSummary?.cliente_activo ?? 0} clientes activos y ${importSummary.backendSummary?.sin_documento ?? 0} filas sin documento.`
                      : (importPreviewNotice || 'Los duplicados y clientes activos se verificarán en cuanto responda el preview del backend. Mientras tanto mostramos un conteo local provisorio.')}
                  </div>

                      </>
                    );
                  })()}

                </div>
              )}

              {importStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: isImportSuccess(importResult) ? '#E1F5EE' : '#FEF2F2',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'
                    }}>
                      {isImportSuccess(importResult)
                        ? <span style={{ fontSize: 24, color: '#0F6E56' }}>✓</span>
                        : <span style={{ fontSize: 24, color: '#B91C1C' }}>✕</span>}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
                      {isImportSuccess(importResult) ? 'Importación completada' : 'Error en la importación'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {getImportMessage(importResult)}
                    </div>
                  </div>

                  {importStats && (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                        {[
                          { label: 'Importados', value: importStats.nuevos, color: '#0F6E56' },
                          { label: 'Ya en recupero', value: importStats.yaEnRecupero, color: '#854F0B' },
                          { label: 'Clientes activos', value: importStats.activos, color: '#185FA5' },
                          { label: 'Errores de formato', value: importStats.errores, color: '#993C1D' },
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 500, color }}>{value ?? '—'}</div>
                            <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2 }}>{label}</div>
                          </div>
                        ))}
                      </div>

                      {importStats?.activosDetalle?.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <div style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            background: '#E6F1FB',
                            border: '0.5px solid #B5D4F4',
                            marginBottom: 8
                          }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#185FA5', marginBottom: 4 }}>
                              {importStats.activosDetalle.length} contacto{importStats.activosDetalle.length > 1 ? 's' : ''} excluido{importStats.activosDetalle.length > 1 ? 's' : ''} por ser cliente activo
                            </div>
                            <div style={{ fontSize: 12, color: '#185FA5' }}>
                              Estos contactos ya tienen un producto activo en el sistema y no fueron cargados como candidatos a recupero.
                            </div>
                          </div>
                          <div style={{
                            border: '0.5px solid rgba(15,23,42,0.16)',
                            borderRadius: 8,
                            overflow: 'auto',
                            maxHeight: 200
                          }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                              <thead>
                                <tr style={{ background: 'var(--color-background-secondary)' }}>
                                  <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '0.5px solid rgba(15,23,42,0.16)' }}>Fila</th>
                                  <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '0.5px solid rgba(15,23,42,0.16)' }}>Documento</th>
                                  <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '0.5px solid rgba(15,23,42,0.16)' }}>Motivo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {importStats.activosDetalle.map((e, i) => (
                                  <tr key={i} style={{ borderTop: '0.5px solid rgba(15,23,42,0.16)' }}>
                                    <td style={{ padding: '6px 10px', color: 'var(--color-text-secondary)' }}>{e.row}</td>
                                    <td style={{ padding: '6px 10px', fontWeight: 500 }}>{e.documento || '-'}</td>
                                    <td style={{ padding: '6px 10px', color: '#185FA5' }}>Cliente activo</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {importLoading && (
                    <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-secondary)', padding: '8px 0' }}>
                      Procesando archivo en segundo plano…
                    </div>
                  )}

                </div>
              )}

            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              padding: '16px 24px 24px',
              borderTop: '0.5px solid rgba(15,23,42,0.16)',
              background: 'var(--color-background-primary)',
              flexShrink: 0
            }}>
              {importStep === 1 && (
                <>
                  <Button variant="ghost" onClick={() => { resetImportState(); setShowImportModal(false); }}>Cancelar</Button>
                  <Button disabled={!importFile || importErrors.length > 0} onClick={() => setImportStep(2)}>
                    Continuar →
                  </Button>
                </>
              )}

              {importStep === 2 && (
                <>
                  <Button variant="ghost" onClick={() => setImportStep(1)}>← Volver</Button>
                  <Button disabled={importLoading} onClick={handleImportCsv}>
                    {importLoading ? 'Importando…' : 'Confirmar e importar →'}
                  </Button>
                </>
              )}

              {importStep === 3 && (
                <>
                  <Button variant="ghost" onClick={() => { resetImportState(); }}>
                    Importar otro archivo
                  </Button>
                  <Button onClick={() => { resetImportState(); setShowImportModal(false); }}>
                    Cerrar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





















