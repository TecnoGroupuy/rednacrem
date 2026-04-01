import React from 'react';
import { Filter, RefreshCw, Plus, X, Upload, Columns } from 'lucide-react';
import { getApiClient } from '../services/apiClient.js';

const PAGE_SIZE = 50;

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

export default function SupervisorContractsModule({ Panel, Button, Tag }) {
  const api = React.useMemo(() => getApiClient(), []);
  const [metrics, setMetrics] = React.useState({ total: 0, disponibles: 0, enLote: 0, recuperados: 0, rechazados: 0 });
  const [items, setItems] = React.useState([]);
  const [columnFiltersDraft, setColumnFiltersDraft] = React.useState({ ...COLUMN_FILTERS_INITIAL });
  const [columnFiltersApplied, setColumnFiltersApplied] = React.useState({ ...COLUMN_FILTERS_INITIAL });
  const [filterErrors, setFilterErrors] = React.useState({});
  const [openFilterColumn, setOpenFilterColumn] = React.useState('');
  const [orden, setOrden] = React.useState({ campo: '', direccion: 'asc' });
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
  const [showCreateLot, setShowCreateLot] = React.useState(false);
  const [lotName, setLotName] = React.useState('');
  const [sellers, setSellers] = React.useState([]);
  const [selectedSellers, setSelectedSellers] = React.useState([]);
  const [creatingLot, setCreatingLot] = React.useState(false);
  const [showLotesModal, setShowLotesModal] = React.useState(false);
  const [lotesCreados, setLotesCreados] = React.useState([]);
  const [lotesLoading, setLotesLoading] = React.useState(false);
  const [lotesError, setLotesError] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('disponibles');
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importFile, setImportFile] = React.useState(null);
  const [importRows, setImportRows] = React.useState([]);
  const [importErrors, setImportErrors] = React.useState([]);
  const [importSummary, setImportSummary] = React.useState(null);
  const [importLoading, setImportLoading] = React.useState(false);
  const [importResult, setImportResult] = React.useState(null);
  const lastPayloadRef = React.useRef('');
  const requestIdRef = React.useRef('');
  const lastInputAtRef = React.useRef(0);

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

  const tabsOperativos = [
    { key: 'disponibles', label: 'Disponibles' },
    { key: 'en_lote', label: 'En lote' },
    { key: 'asignados', label: 'Asignados' },
    { key: 'gestionados', label: 'Gestionados' },
    { key: 'recuperados', label: 'Recuperados' },
    { key: 'rechazados', label: 'Rechazados' }
  ];

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
      const response = await api.get('/api/recupero/lotes');
      const itemsList = response?.items || response?.data?.items || response?.lotes || response?.data?.lotes || [];
      setLotesCreados(Array.isArray(itemsList) ? itemsList : []);
    } catch (err) {
      setLotesError(err?.message || 'No se pudieron cargar los lotes.');
      setLotesCreados([]);
    } finally {
      setLotesLoading(false);
    }
  }, [api]);

  const formatDate = (value) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString('es-UY');
  };

  const formatDateTime = (value) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString('es-UY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const formatLoteConfig = (lote) => {
    const raw = lote?.configuracion || lote?.filtros || lote?.filters || lote?.criteria || lote?.segmento || lote?.segment || null;
    if (!raw) return '—';
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
    return text.length > 160 ? `${text.slice(0, 160)}…` : text;
  };

  const formatLoteSeller = (lote) => (
    lote?.vendedor_asignado
    || lote?.seller
    || lote?.seller_name
    || lote?.vendedor_nombre
    || (Array.isArray(lote?.vendedores) ? lote.vendedores.map((v) => `${v.nombre || ''} ${v.apellido || ''}`.trim()).join(', ') : '')
    || 'Sin asignar'
  );

  const formatLoteCount = (lote) => (
    lote?.cantidad_datos
    || lote?.cantidad
    || lote?.count
    || lote?.total
    || lote?.contactos
    || 0
  );

  const getFilterOptionsForKey = React.useCallback((key) => {
    if (key === 'departamento') return filterOptions.departamentos;
    if (key === 'producto') return filterOptions.productos;
    if (key === 'motivo_baja') return filterOptions.motivos;
    if (key === 'ultimo_estado') return ultimoEstadoOptions;
    if (key === 'lote') return filterOptions.lotes;
    if (key === 'vendedor_asignado') return filterOptions.vendedores.length ? filterOptions.vendedores : sellers;
    return [];
  }, [filterOptions, sellers, ultimoEstadoOptions]);

  const getMotivoBaja = (row) => {
    const raw = (row?.motivo_baja ?? '').toString().trim();
    if (!raw) return null;
    const normalized = raw.toLowerCase();
    if (normalized === 'otro' || normalized === 'otros') return null;
    return raw;
  };
  const getNombreLote = (row) => row?.nombre_lote || null;
  const getVendedorAsignado = (row) => (
    row?.vendedor_asignado
    || row?.vendedor_asignado_nombre
    || row?.seller_name
    || null
  );
  const getUltimoEstado = (row) => row?.ultimo_estado_gestion || null;
  const getFechaUltimaGestion = (row) => (
    row?.ultima_gestion
    || row?.fecha_ultima_gestion
    || row?.ultima_gestion_real
    || null
  );

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

  const buildFiltersPayload = React.useCallback(() => {
    const payload = {
      contacto: columnFiltersApplied.contacto?.trim() || '',
      documento: columnFiltersApplied.documento?.trim() || '',
      telefono: columnFiltersApplied.telefono?.trim() || '',
      edad_min: toNumberOrNull(columnFiltersApplied.edad_min),
      edad_max: toNumberOrNull(columnFiltersApplied.edad_max),
      precio_min: toNumberOrNull(columnFiltersApplied.precio_min),
      precio_max: toNumberOrNull(columnFiltersApplied.precio_max),
      fecha_baja_desde: columnFiltersApplied.fecha_baja_desde || '',
      fecha_baja_hasta: columnFiltersApplied.fecha_baja_hasta || '',
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
  }, [columnFiltersApplied]);

  const buildSearchPayload = React.useCallback(() => ({
    tab: activeTab,
    filters: buildFiltersPayload(),
    sort: orden.campo ? { field: orden.campo, dir: orden.direccion } : null,
    columns: visibleColumns.length ? visibleColumns : allColumns.map((col) => col.id),
    page,
    limit: PAGE_SIZE
  }), [activeTab, allColumns, buildFiltersPayload, orden, page, visibleColumns]);

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
    loadRecupero();
  }, [payloadKey, loadRecupero]);

  React.useEffect(() => {
    // Periodic refetch to keep Recupero in sync (skip while user is typing).
    const intervalMs = 45000;
    const timer = setInterval(() => {
      if (Date.now() - lastInputAtRef.current < 900) return;
      loadRecupero({ force: true });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [loadRecupero, payloadKey]);

  React.useEffect(() => {
    setPage(1);
  }, [orden, activeTab, visibleColumns]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (activeTab !== 'disponibles' && selectedIds.length) {
      setSelectedIds([]);
    }
  }, [activeTab, selectedIds.length]);

  const toggleSelection = (id) => {
    if (activeTab !== 'disponibles') return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSeller = (id) => {
    setSelectedSellers((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const resetLotModal = () => {
    setLotName('');
    setSelectedSellers([]);
  };

  const resetImportState = () => {
    setImportFile(null);
    setImportRows([]);
    setImportErrors([]);
    setImportSummary(null);
    setImportLoading(false);
    setImportResult(null);
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

  React.useEffect(() => {
    if (!showImportModal) return;
    if (!isImportSuccess(importResult)) return;
    setShowImportModal(false);
    resetImportState();
  }, [importResult, showImportModal]);

  

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

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setImportResult(null);
    if (!file) {
      resetImportState();
      return;
    }
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
      const result = parseCsvPreview(String(reader.result || ''));
      setImportRows(result.rows || []);
      setImportErrors(result.errors || []);
      setImportSummary(result.summary || null);
    };
    reader.readAsText(file);
  };

  const handleImportCsv = async () => {
    if (!importFile || importErrors.length) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      for (const [k, v] of formData.entries()) {
        console.log(k, v);
      }
      const response = await api.post('/api/recupero/importaciones', formData);
      setImportResult(response);
      loadRecupero({ force: true });
    } catch (err) {
      setImportResult({ ok: false, message: err?.message || 'No se pudo importar el archivo.' });
    } finally {
      setImportLoading(false);
    }
  };

  const openCreateLot = () => {
    if (!selectedIds.length || activeTab !== 'disponibles') return;
    setShowCreateLot(true);
    loadSellers();
  };

  const handleCreateLot = async () => {
    if (!lotName.trim()) return;
    setCreatingLot(true);
    try {
      await api.post('/api/recupero/lotes', {
        nombre: lotName.trim(),
        contact_ids: selectedIds,
        seller_ids: selectedSellers
      });
      setShowCreateLot(false);
      resetLotModal();
      setSelectedIds([]);
      loadRecupero({ force: true });
    } catch (err) {
      setError(err?.message || 'No se pudo crear el lote de recupero.');
    } finally {
      setCreatingLot(false);
    }
  };

  return (
    <div className="view">
      <section className="content-grid">
        <Panel
          className="span-12"
          title="Recupero de clientes"
          subtitle="Cartera de clientes para reconversión"
          action={(
            <Button variant="secondary" onClick={() => { setShowLotesModal(true); loadLotesCreados(); }}>
              Lotes creados
            </Button>
          )}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <div style={{
              background: 'var(--color-background-secondary)',
              borderRadius: '8px',
              padding: '12px 16px',
            }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                Disponibles para recupero
              </div>
              <div style={{ fontSize: '28px', fontWeight: '500' }}>
                {Number(metrics.disponibles || 0).toLocaleString('es-UY')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                sin producto activo
              </div>
            </div>
            <div style={{
              background: 'var(--color-background-secondary)',
              borderRadius: '8px',
              padding: '12px 16px',
            }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                En lote
              </div>
              <div style={{ fontSize: '28px', fontWeight: '500' }}>
                {Number(metrics.enLote || 0).toLocaleString('es-UY')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                en lotes activos
              </div>
            </div>
            <div style={{
              background: 'var(--color-background-secondary)',
              borderRadius: '8px',
              padding: '12px 16px',
            }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                Recuperados
              </div>
              <div style={{ fontSize: '28px', fontWeight: '500', color: 'var(--color-text-success)' }}>
                {Number(metrics.recuperados || 0).toLocaleString('es-UY')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                volvieron a estar de alta
              </div>
            </div>
            <div style={{
              background: 'var(--color-background-secondary)',
              borderRadius: '8px',
              padding: '12px 16px',
            }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                Rechazados
              </div>
              <div style={{ fontSize: '28px', fontWeight: '500', color: 'var(--color-text-danger)' }}>
                {Number(metrics.rechazados || 0).toLocaleString('es-UY')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                no quisieron volver
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {tabsOperativos.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: activeTab === tab.key ? '1px solid #f97316' : '1px solid rgba(148,163,184,0.4)',
                  background: activeTab === tab.key ? 'rgba(249,115,22,0.12)' : 'transparent',
                  color: activeTab === tab.key ? '#9a3412' : 'var(--color-text-secondary)',
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: 12, flexWrap: 'wrap' }}>
            <div className="toolbar" style={{ gap: 10, marginBottom: 0, alignItems: 'center', flexWrap: 'wrap' }}>
              {activeFilterCount > 0 && (
                <Button variant="ghost" icon={<Filter size={16} />} onClick={clearAllFilters}>
                  Limpiar filtros
                </Button>
              )}
              <Button variant="secondary" icon={<Columns size={16} />} onClick={() => setColumnsPanelOpen((prev) => !prev)}>
                Columnas
              </Button>
              <Button variant="ghost" icon={<RefreshCw size={16} />} onClick={() => loadRecupero({ force: true })}>Actualizar</Button>
              <Button variant="secondary" icon={<Upload size={16} />} onClick={() => { resetImportState(); setShowImportModal(true); }}>
                Importar CSV
              </Button>
            </div>

            {activeTab === 'disponibles' && selectedIds.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  {selectedIds.length} contactos seleccionados
                </span>
                <Button icon={<Plus size={16} />} onClick={openCreateLot}>
                  Crear lote de recupero
                </Button>
              </div>
            )}
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
                {activeFilterCount} filtros · {total.toLocaleString('es-UY')} resultados
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
              {total.toLocaleString('es-UY')} resultados
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
                  <th></th>
                  {renderHeaderCell('contacto', 'Contacto')}
                  {isColumnVisible('documento') && renderHeaderCell('documento', 'Documento')}
                  {isColumnVisible('edad') && renderHeaderCell('edad', 'Edad')}
                  {isColumnVisible('telefono') && renderHeaderCell('telefono', 'Teléfono')}
                  {isColumnVisible('departamento') && renderHeaderCell('departamento', 'Departamento')}
                  {isColumnVisible('producto') && renderHeaderCell('producto', 'Producto')}
                  {isColumnVisible('precio') && renderHeaderCell('precio', 'Precio')}
                  {isColumnVisible('fecha_baja') && renderHeaderCell('fecha_baja', 'Fecha de baja')}
                  {isColumnVisible('motivo_baja') && renderHeaderCell('motivo_baja', 'Motivo de baja')}
                  {isColumnVisible('lote') && renderHeaderCell('lote', 'Lote')}
                  {isColumnVisible('vendedor_asignado') && renderHeaderCell('vendedor_asignado', 'Vendedor asignado')}
                  {isColumnVisible('ultimo_estado') && renderHeaderCell('ultimo_estado', 'Último estado')}
                  {isColumnVisible('ultima_gestion') && renderHeaderCell('ultima_gestion', 'Última gestión', false)}
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((row) => {
                  console.log('ROW DATA', row);
                  const nombre = [row.nombre, row.apellido].filter(Boolean).join(' ')
                    || [row.contacto_nombre, row.contacto_apellido].filter(Boolean).join(' ')
                    || row.contacto || '—';
                  const motivoBaja = getMotivoBaja(row);
                  const nombreLote = getNombreLote(row);
                  const vendedorAsignado = getVendedorAsignado(row);
                  const ultimoEstadoGestion = getUltimoEstado(row);
                  const fechaUltimaGestion = getFechaUltimaGestion(row);
                  return (
                    <tr key={row.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={() => toggleSelection(row.id)}
                          disabled={activeTab !== 'disponibles'}
                        />
                      </td>
                      <td><strong>{nombre}</strong></td>
                      {isColumnVisible('documento') && <td>{row.documento || row.cedula || row.ci || row.documento_identidad || '—'}</td>}
                      {isColumnVisible('edad') && <td>{row.edad ? `${row.edad} años` : '—'}</td>}
                      {isColumnVisible('telefono') && <td>{row.telefono || row.phone || '—'}</td>}
                      {isColumnVisible('departamento') && <td>{row.departamento || row.depto || '—'}</td>}
                      {isColumnVisible('producto') && <td>{row.producto || row.producto_anterior || row.nombre_producto || '—'}</td>}
                      {isColumnVisible('precio') && <td>{row.precio || row.monto || '—'}</td>}
                      {isColumnVisible('fecha_baja') && <td>{formatDate(row.fecha_baja || row.fechaBaja)}</td>}
                      {isColumnVisible('motivo_baja') && <td>{motivoBaja || 'Sin motivo'}</td>}
                      {isColumnVisible('lote') && <td>{nombreLote || '—'}</td>}
                      {isColumnVisible('vendedor_asignado') && <td>{vendedorAsignado || 'Sin asignar'}</td>}
                      {isColumnVisible('ultimo_estado') && <td>{ultimoEstadoGestion || 'Nuevo'}</td>}
                      {isColumnVisible('ultima_gestion') && <td>{fechaUltimaGestion ? formatDateTime(fechaUltimaGestion) : '—'}</td>}
                    </tr>
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

        </Panel>
      </section>`r`n`r`n

      {showLotesModal && (
        <div className="lot-wizard-overlay" onClick={() => setShowLotesModal(false)}>
          <div className="lot-wizard" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 900 }}>
            <div className="lot-wizard-header">
              <div style={{ fontWeight: 700 }}>Lotes creados</div>
              <button className="close-btn" onClick={() => setShowLotesModal(false)}><X size={16} /></button>
            </div>
            <div className="lot-wizard-content">
              {lotesLoading ? <div style={{ marginBottom: 12, color: 'var(--muted)' }}>Cargando lotes...</div> : null}
              {lotesError ? <div style={{ marginBottom: 12, color: '#b91c1c', fontWeight: 600 }}>{lotesError}</div> : null}
              <div className="table-wrap" style={{ maxHeight: 360, overflow: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Fecha y hora</th>
                      <th>Nombre</th>
                      <th>Cantidad</th>
                      <th>Configuración</th>
                      <th>Vendedor asignado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotesCreados.map((lote, idx) => {
                      const configText = formatLoteConfig(lote);
                      return (
                        <tr key={lote.id || lote.lote_id || idx}>
                          <td>{formatDateTime(lote.created_at || lote.fecha_creacion || lote.createdAt)}</td>
                          <td>{lote.nombre || lote.name || '—'}</td>
                          <td>{formatLoteCount(lote)}</td>
                          <td title={configText}>{configText}</td>
                          <td>{formatLoteSeller(lote)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!lotesLoading && !lotesCreados.length ? (
                  <div style={{ padding: 16, color: 'var(--muted)' }}>No hay lotes creados.</div>
                ) : null}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <Button variant="ghost" onClick={() => setShowLotesModal(false)}>Cerrar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateLot && (
        <>
          <div className="lot-wizard-overlay" onClick={() => { setShowCreateLot(false); resetLotModal(); }}>
            <div className="lot-wizard" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 520 }}>
              <div className="lot-wizard-header">
                <div style={{ fontWeight: 700 }}>Crear lote de recupero</div>
                <button className="close-btn" onClick={() => { setShowCreateLot(false); resetLotModal(); }}><X size={16} /></button>
              </div>
              <div className="lot-wizard-content">
                <label style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Nombre del lote</span>
                  <input
                    className="input"
                    value={lotName}
                    onChange={(event) => setLotName(event.target.value)}
                    placeholder="Lote recupero marzo"
                  />
                </label>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Vendedores</div>
                  <div style={{ border: '1px solid rgba(15,23,42,0.1)', borderRadius: 12, padding: 10, maxHeight: 200, overflowY: 'auto' }}>
                    {sellers.length ? sellers.map((seller) => (
                      <label key={seller.id || seller.email} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 2px' }}>
                        <input
                          type="checkbox"
                          checked={selectedSellers.includes(seller.id)}
                          onChange={() => toggleSeller(seller.id)}
                        />
                        <span>{seller.label || seller.nombre || seller.email || 'Vendedor'}</span>
                      </label>
                    )) : <div style={{ color: 'var(--muted)' }}>Sin vendedores disponibles.</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button variant="ghost" onClick={() => { setShowCreateLot(false); resetLotModal(); }}>Cancelar</Button>
                  <Button disabled={!lotName.trim() || creatingLot} onClick={handleCreateLot}>Crear lote</Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showImportModal && (
        <div className="lot-wizard-overlay" onClick={() => setShowImportModal(false)}>
          <div className="lot-wizard" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="lot-wizard-header">
              <div style={{ fontWeight: 700 }}>Importar CSV</div>
              <button className="close-btn" onClick={() => setShowImportModal(false)}><X size={16} /></button>
            </div>
            <div className="lot-wizard-content">
              <p style={{ marginTop: 0, color: 'var(--color-text-secondary)', fontSize: 13 }}>
                Subí un CSV con las columnas: Documento, Motivo de la baja, Último estado.
              </p>
              <input type="file" accept=".csv" onChange={handleFileChange} />
              {importErrors.length ? (
                <div style={{ marginTop: 10, color: '#b91c1c', fontSize: 13 }}>
                  {importErrors.map((err) => <div key={err}>{err}</div>)}
                </div>
              ) : null}
              {importSummary?.duplicates ? (
                <div style={{ marginTop: 8, color: '#b45309', fontSize: 12 }}>
                  Duplicados: se usa la última fila del CSV (last_wins).
                </div>
              ) : null}
              {importSummary ? (
                <div style={{ marginTop: 12, fontSize: 12, color: '#555' }}>
                  Total filas: {importSummary.total} · Duplicados: {importSummary.duplicates}
                </div>
              ) : null}
              {importRows.length ? (
                <div style={{ marginTop: 12, maxHeight: 180, overflow: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 12 }}>Documento</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 12 }}>Motivo de baja</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 12 }}>Último estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 10).map((row, idx) => (
                        <tr key={`${row.documento}-${idx}`}>
                          <td style={{ padding: '6px 8px', fontSize: 12 }}>{row.documento || '—'}</td>
                          <td style={{ padding: '6px 8px', fontSize: 12 }}>{row.motivo_baja || '—'}</td>
                          <td style={{ padding: '6px 8px', fontSize: 12 }}>{row.ultimo_estado || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {importResult && (
                <div style={{ marginTop: 12, fontSize: 13, color: isImportSuccess(importResult) ? '#166534' : '#b91c1c' }}>
                  {getImportMessage(importResult)}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <Button variant="ghost" onClick={() => setShowImportModal(false)}>Cancelar</Button>
                <Button disabled={!importFile || importLoading || isImportSuccess(importResult)} onClick={handleImportCsv}>
                  {importLoading ? 'Procesando…' : 'Importar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





















