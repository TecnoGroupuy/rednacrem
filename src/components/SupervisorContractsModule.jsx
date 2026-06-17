import React from 'react';
import { Filter, RefreshCw, X, Upload, Columns, ChevronDown } from 'lucide-react';
import { getApiClient } from '../services/apiClient.js';
import { formatDate } from '../utils/dateFormat.js';

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
  const [vistaActual, setVistaActual] = React.useState('disponibles'); // 'disponibles' | 'lotes' | 'detalle-lote'
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
  const [assignHasActiveProduct, setAssignHasActiveProduct] = React.useState(false);
  const [sellers, setSellers] = React.useState([]);
  const [creatingLot, setCreatingLot] = React.useState(false);
  const [loteSeleccionado, setLoteSeleccionado] = React.useState(null);
  const [lotesCreados, setLotesCreados] = React.useState([]);
  const [lotesLoading, setLotesLoading] = React.useState(false);
  const [lotesError, setLotesError] = React.useState('');
  const [lotesMetrics, setLotesMetrics] = React.useState({});
  const [activeTab, setActiveTab] = React.useState('disponibles');
  const [tabCounts, setTabCounts] = React.useState({
    disponibles: 0,
    en_gestion: 0,
    recuperados: 0,
    rechazados: 0,
    fallecidos: 0
  });
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importFile, setImportFile] = React.useState(null);
  const [importRows, setImportRows] = React.useState([]);
  const [importErrors, setImportErrors] = React.useState([]);
  const [importSummary, setImportSummary] = React.useState(null);
  const [importLoading, setImportLoading] = React.useState(false);
  const [importResult, setImportResult] = React.useState(null);
  const [importStep, setImportStep] = React.useState(1);
  const [importStats, setImportStats] = React.useState(null);
  const lastPayloadRef = React.useRef('');
  const requestIdRef = React.useRef('');
  const lastInputAtRef = React.useRef(0);
  const selectAllRef = React.useRef(null);
  const [expandedRowId, setExpandedRowId] = React.useState(null);
  const [detalleMetrics, setDetalleMetrics] = React.useState(null);
  const [detalleContacts, setDetalleContacts] = React.useState([]);
  const [detalleLoading, setDetalleLoading] = React.useState(false);
  const [detalleError, setDetalleError] = React.useState('');
  const [detalleSearch, setDetalleSearch] = React.useState('');
  const [showDetalleSearch, setShowDetalleSearch] = React.useState(false);
  const [showInformeModal, setShowInformeModal] = React.useState(false);
  const [informeModalLoteId, setInformeModalLoteId] = React.useState('');

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
    { key: 'asignados', label: 'En gestión' },
    { key: 'recuperados', label: 'Recuperados' },
    { key: 'rechazados', label: 'Rechazados' },
    { key: 'fallecidos', label: 'Fallecidos' }
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

  const MOTIVO_LABELS = {
    fallecimiento: { label: 'Fallecimiento', color: '#DC2626' },
    voluntaria: { label: 'Baja voluntaria', color: '#92400E' },
    falta_de_pago: { label: 'Falta de pago', color: '#854F0B' },
    baja_antel: { label: 'Baja desde Antel', color: '#185FA5' },
    baja_bps: { label: 'Baja desde BPS', color: '#185FA5' },
    administrativa: { label: 'Administrativa', color: '#5F5E5A' },
    error_activacion: { label: 'Error de activación', color: '#5F5E5A' },
    no_llamar: { label: 'No llamar', color: '#DC2626' },
    sin_detalle: { label: 'Sin detalle', color: 'var(--color-text-secondary)' },
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

  const openInformeModal = React.useCallback((lotId) => {
    if (!lotId) return;
    setInformeModalLoteId(String(lotId));
    setShowInformeModal(true);
  }, []);

  const closeInformeModal = React.useCallback(() => {
    setShowInformeModal(false);
    setInformeModalLoteId('');
  }, []);

  React.useEffect(() => {
    if (vistaActual !== 'lotes') return;
    loadLotesCreados();
  }, [loadLotesCreados, vistaActual]);

  React.useEffect(() => {
    loadLotesCreados();
  }, [loadLotesCreados]);

  React.useEffect(() => {
    if (vistaActual !== 'lotes') return;
    if (!Array.isArray(lotesCreados) || !lotesCreados.length) {
      setLotesMetrics({});
      return;
    }
    let active = true;
    (async () => {
      const metricsMap = {};
      await Promise.all(
        lotesCreados.map(async (lote) => {
          const lotId = asLotId(lote);
          if (!lotId) return;
          try {
            const res = await api.get(`/lead-batches/${encodeURIComponent(lotId)}/metrics`);
            metricsMap[lotId] = res?.data?.data || res?.data || null;
          } catch {}
        })
      );
      if (!active) return;
      setLotesMetrics(metricsMap);
    })();
    return () => { active = false; };
  }, [api, lotesCreados, vistaActual]);

  React.useEffect(() => {
    if (vistaActual !== 'detalle-lote') return;
    if (!loteSeleccionado?.id) return;
    let active = true;
    setDetalleLoading(true);
    setDetalleError('');
    setDetalleMetrics(null);
    setDetalleContacts([]);
    Promise.all([
      api.get(`/lead-batches/${encodeURIComponent(loteSeleccionado.id)}/metrics`)
        .then((res) => (res?.ok ? (res?.data?.data || res?.data) : null))
        .catch(() => null),
      (async () => {
        // Prefer lead_contact_status view (batch_id) when available.
        try {
          const assignedRes = await api.get(`/leads/assigned?batch_id=${encodeURIComponent(loteSeleccionado.id)}&page=1&limit=100`);
          const assignedItems = assignedRes?.data?.contactos
            || assignedRes?.data?.items
            || assignedRes?.items
            || assignedRes?.data
            || [];
          const list = Array.isArray(assignedItems) ? assignedItems : [];
          if (list.length) return list;
        } catch {}

        // Fallback to recupero endpoint (supports lote_id / lote).
        try {
          const res = await api.get(`/api/recupero/contactos?lote_id=${encodeURIComponent(loteSeleccionado.id)}&page=1&limit=100`);
          const items = res?.items || res?.data?.items || [];
          const list = Array.isArray(items) ? items : [];
          if (list.length) return list;
        } catch {}

        try {
          const res = await api.get(`/api/recupero/contactos?lote=${encodeURIComponent(loteSeleccionado.id)}&page=1&limit=100`);
          const items = res?.items || res?.data?.items || [];
          return Array.isArray(items) ? items : [];
        } catch {
          return [];
        }
      })()
    ])
      .then(([m, contacts]) => {
        if (!active) return;
        setDetalleMetrics(m);
        setDetalleContacts(Array.isArray(contacts) ? contacts : []);
      })
      .catch((err) => {
        if (!active) return;
        setDetalleError(err?.message || 'No se pudo cargar el detalle del lote.');
      })
      .finally(() => {
        if (!active) return;
        setDetalleLoading(false);
      });
    return () => { active = false; };
  }, [api, loteSeleccionado?.id, vistaActual]);

  const getMotivoColor = (value) => {
    const raw = (value ?? '').toString().trim().toUpperCase();
    if (!raw || raw === 'SIN ESPECIFICAR') return 'var(--color-text-secondary)';
    if (raw.includes('FALLECIMIENTO')) return '#DC2626';
    if (raw.includes('FALTA DE PAGO') || raw.includes('SIN PAGO') || raw.includes('MOROSIDAD')) return '#92400E';
    return 'var(--color-text-secondary)';
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

  const getContactoNombre = React.useCallback((row) => (
    [row?.nombre, row?.apellido].filter(Boolean).join(' ')
    || [row?.contacto_nombre, row?.contacto_apellido].filter(Boolean).join(' ')
    || row?.contacto
    || '—'
  ), []);

  const getEstadoBadge = React.useCallback((row) => {
    const estado = String(row.estado || '').trim().toLowerCase();
    if (estado === 'recuperado') return { label: 'Recuperado', bg: '#BBF7D0', color: '#166534' };
    if (estado === 'rechazado') return { label: 'Rechazado', bg: '#FAECE7', color: '#993C1D' };
    if (estado === 'en_gestion') return { label: 'En gestión', bg: '#E1F5EE', color: '#0F6E56' };
    if (estado === 'fallecido') return { label: 'Fallecido', bg: '#F1EFE8', color: '#5F5E5A' };
    return { label: 'Disponible', bg: '#FFF8E1', color: '#BA7517' };
  }, []);

  const detectActiveProduct = (row) => Boolean(
    row?.producto_activo
    || row?.productoActivo
    || row?.tiene_producto_activo
    || row?.tieneProductoActivo
    || row?.cliente_activo
    || row?.estado_cliente === 'activo'
  );

  const openAssign = React.useCallback((contactIds = [], row = null) => {
    const ids = Array.isArray(contactIds) ? contactIds.filter(Boolean) : [];
    if (!ids.length) return;
    setAssignContactIds(ids);
    setAssignSellerId('');
    setAssignNotes('');
    const rows = Array.isArray(visibleItems) ? visibleItems : [];
    const hasActive = row ? detectActiveProduct(row) : ids.some((id) => detectActiveProduct(rows.find((it) => String(it?.id) === String(id))));
    setAssignHasActiveProduct(Boolean(hasActive));
    setShowAssignModal(true);
    loadSellers();
  }, [loadSellers, visibleItems]);

  const closeAssign = React.useCallback(() => {
    setShowAssignModal(false);
    setAssignContactIds([]);
    setAssignSellerId('');
    setAssignNotes('');
    setAssignHasActiveProduct(false);
  }, []);

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

  const buildSearchPayload = React.useCallback(() => {
    const filters = buildFiltersPayload();
    if (activeTab === 'fallecidos') {
      filters.motivo_normalizado = ['fallecimiento'];
    }
    return {
      tab: activeTab,
      filters,
      sort: vistaActual === 'disponibles'
        ? { field: 'fecha_baja', dir: sortDir }
        : (orden.campo ? { field: orden.campo, dir: orden.direccion } : null),
      columns: visibleColumns.length ? visibleColumns : allColumns.map((col) => col.id),
      page,
      limit: PAGE_SIZE
    };
  }, [activeTab, allColumns, buildFiltersPayload, orden, page, sortDir, vistaActual, visibleColumns]);

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
          en_gestion: Number(incomingTabCounts.en_gestion ?? incomingTabCounts.asignados ?? 0),
          recuperados: Number(incomingTabCounts.recuperados || 0),
          rechazados: Number(incomingTabCounts.rechazados || 0),
          fallecidos: Number(incomingTabCounts.fallecidos || 0)
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
  }, [orden, activeTab, sortDir, visibleColumns]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setImportLoading(false);
    setImportResult(null);
    setImportStep(1);
    setImportStats(null);
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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setImportResult(null);
    setImportStats(null);
    setImportStep(1);
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
      const text = String(reader.result || '').replace(/^\uFEFF/, '');
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) {
        setImportErrors(['El archivo está vacío o no tiene filas de datos.']);
        setImportRows([]);
        setImportSummary(null);
        return;
      }
      const delimiter = text.includes(';') ? ';' : ',';
      const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());
      const idxNombre = headers.findIndex((h) => h === 'nombres' || h === 'nombre');
      const idxApellido = headers.findIndex((h) => h === 'apellidos' || h === 'apellido');
      const idxDoc = headers.findIndex((h) => h === 'documento');
      const idxTel = headers.findIndex((h) => h === 'telefono' || h === 'teléfono' || h === 'tel\u00e9fono' || h.includes('tel'));
      const idxCelular = headers.findIndex((h) => h === 'celular' || h.includes('celular'));
      const idxEstado = headers.findIndex((h) => h === 'estado' || h === 'ultimo estado' || h === 'último estado');
      const idxFechaBaja = headers.findIndex((h) => h === 'fecha de baja');
      const idxPlan = headers.findIndex((h) => h === 'plan contratado' || h === 'plan');
      const idxPrecio = headers.findIndex((h) => h === 'precio');
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
        rows.push({
          nombre,
          apellido,
          documento: get(cells, idxDoc),
          telefono: get(cells, idxTel) || get(cells, idxCelular),
          estado: get(cells, idxEstado),
          fecha_baja: get(cells, idxFechaBaja),
          plan: get(cells, idxPlan),
          precio: get(cells, idxPrecio),
        });
      }
      setImportRows(rows);
      setImportErrors([]);
      setImportSummary({ total: rows.length });
    };
    reader.readAsText(file, 'utf-8');
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

  const handleConfirmAssign = async () => {
    if (!assignContactIds.length) return;
    if (!assignSellerId) return;
    setCreatingLot(true);
    try {
      await api.post('/api/recupero/lotes', {
        nombre: getAssignmentLotName(),
        contact_ids: assignContactIds,
        seller_ids: [assignSellerId]
      });
      closeAssign();
      setSelectedIds([]);
      loadRecupero({ force: true });
    } catch (err) {
      setError(err?.message || 'No se pudo asignar el contacto.');
    } finally {
      setCreatingLot(false);
    }
  };

  return (
    <div className="view">
      <section className="content-grid">
        <Panel
          className="span-12"
          title={vistaActual === 'detalle-lote' ? null : 'Recupero de clientes'}
          subtitle={vistaActual === 'detalle-lote' ? null : 'Cartera de clientes para reconversión'}
          action={vistaActual === 'detalle-lote' ? null : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => { setVistaActual('disponibles'); setLoteSeleccionado(null); }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: vistaActual === 'disponibles' ? '1px solid #0F766E' : '1px solid rgba(148,163,184,0.45)',
                  background: vistaActual === 'disponibles' ? '#0F766E' : 'transparent',
                  color: vistaActual === 'disponibles' ? '#fff' : 'var(--color-text-secondary)',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                Ver disponibles
              </button>
              <button
                type="button"
                onClick={() => { setVistaActual('lotes'); setLoteSeleccionado(null); }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: vistaActual === 'lotes' ? '1px solid #0F766E' : '1px solid rgba(148,163,184,0.45)',
                  background: vistaActual === 'lotes' ? '#0F766E' : 'transparent',
                  color: vistaActual === 'lotes' ? '#fff' : 'var(--color-text-secondary)',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                Mis lotes
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: vistaActual === 'lotes' ? 'rgba(255,255,255,0.2)' : 'rgba(15,118,110,0.10)',
                  color: vistaActual === 'lotes' ? '#fff' : '#0F766E'
                }}>
                  {lotesCreados.length}
                </span>
              </button>
            </div>
          )}
        >
          {vistaActual === 'lotes' && (
            <div>
              {lotesLoading ? <div style={{ marginBottom: 12, color: 'var(--muted)' }}>Cargando lotes...</div> : null}
              {lotesError ? <div style={{ marginBottom: 12, color: '#b91c1c', fontWeight: 700 }}>{lotesError}</div> : null}
              {!lotesLoading && !lotesCreados.length ? (
                <div style={{ padding: 16, color: 'var(--muted)' }}>No hay lotes creados.</div>
              ) : null}

              <div style={{ display: 'grid', gap: 10 }}>
                {lotesCreados.map((lote, idx) => {
                  const lotId = asLotId(lote);
                  const name = asLotName(lote);
                  const createdAt = asLotCreatedAt(lote);
                  const count = asLotCount(lote);
                  const sellerName = asLotSellerName(lote);
                  const initials = sellerName.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
                  const informe = lotId ? lotesMetrics?.[lotId]?.informe : null;
                  const totalContactos = Number(
                    lote?.total_contactos
                    || lote?.contactos
                    || informe?.total_contactos
                    || count
                    || 0
                  );
                  const totalGestionados = Number(informe?.total_vendidos || 0)
                    + Number(informe?.total_no_contesta || 0)
                    + Number(informe?.total_rechazos || 0)
                    + Number(informe?.total_dato_erroneo || 0)
                    + Number(informe?.total_en_proceso || 0)
                    + Number(informe?.total_incontactables || 0);
                  const pct = totalContactos > 0
                    ? Math.round((totalGestionados / totalContactos) * 100)
                    : 0;
                  const isCompletado = totalContactos > 0 && totalGestionados >= totalContactos;
                  const estadoBadge = isCompletado
                    ? { label: 'Completado', bg: 'rgba(148,163,184,0.22)', color: 'var(--color-text-secondary)' }
                    : { label: 'Activo', bg: 'rgba(15,118,110,0.10)', color: '#0F766E' };

                  const openDetalle = () => {
                    if (!lotId) return;
                    setLoteSeleccionado({
                      id: lotId,
                      nombre: name,
                      createdAt,
                      sellerName
                    });
                    setVistaActual('detalle-lote');
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
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
                          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <span>{createdAt ? formatDateTime(createdAt) : '—'}</span>
                            <span>·</span>
                            <span><strong>{count}</strong> contactos</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <div style={{
                            width: 30,
                            height: 30,
                            borderRadius: 999,
                            background: 'rgba(15,118,110,0.10)',
                            color: '#0F766E',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 12
                          }}>
                            {initials || '—'}
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            {sellerName || 'Sin asignar'}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <div style={{ height: 6, background: 'rgba(148,163,184,0.22)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: pct + '%', background: '#0F766E', borderRadius: 999 }} />
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          <strong>{pct}%</strong> gestionado · <strong>{totalGestionados}</strong>/<strong>{totalContactos}</strong> contactos
                        </div>
                      </div>

                      {informe && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10, fontSize: 12 }}>
                          <span style={{ color: '#15803D', fontWeight: 800 }}>Ventas: {Number(informe.total_vendidos || 0)}</span>
                          <span style={{ color: '#DC2626', fontWeight: 800 }}>Rechazos: {Number(informe.total_rechazos || 0)}</span>
                          <span style={{ color: '#92400E', fontWeight: 800 }}>No contesta: {Number(informe.total_no_contesta || 0)}</span>
                          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 800 }}>Dato erróneo: {Number(informe.total_dato_erroneo || 0)}</span>
                          <span style={{ color: '#639922', fontWeight: 800 }}>Nuevos: {Number(informe.total_nuevos || 0)}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); openDetalle(); }} style={{ padding: '7px 10px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.45)', background: 'transparent', cursor: 'pointer', fontWeight: 800, fontSize: 12, color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          Ver detalle <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {vistaActual === 'detalle-lote' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => { setVistaActual('lotes'); setLoteSeleccionado(null); }}
                  style={{
                    background: '#fff',
                    border: '1px solid rgba(148,163,184,0.45)',
                    borderRadius: 8,
                    padding: '7px 14px',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  ← Volver a lotes
                </button>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled
                    style={{
                      background: '#fff',
                      border: '1px solid rgba(148,163,184,0.55)',
                      borderRadius: 8,
                      padding: '7px 14px',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'not-allowed',
                      color: 'var(--color-text-secondary)',
                      opacity: 0.7
                    }}
                  >
                    Agregar datos
                  </button>
                  <button
                    type="button"
                    disabled
                    style={{
                      background: '#fff',
                      border: '1px solid rgba(148,163,184,0.55)',
                      borderRadius: 8,
                      padding: '7px 14px',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'not-allowed',
                      color: 'var(--color-text-secondary)',
                      opacity: 0.7
                    }}
                  >
                    Reasignar
                  </button>
                  <button
                    type="button"
                    onClick={() => openInformeModal(loteSeleccionado?.id)}
                    disabled={!loteSeleccionado?.id}
                    style={{
                      background: '#0F766E',
                      border: '1px solid rgba(15,118,110,0.65)',
                      borderRadius: 8,
                      padding: '7px 14px',
                      fontSize: 13,
                      fontWeight: 900,
                      cursor: loteSeleccionado?.id ? 'pointer' : 'not-allowed',
                      color: '#fff',
                      opacity: loteSeleccionado?.id ? 1 : 0.75
                    }}
                  >
                    Ver informe
                  </button>
                </div>
              </div>

              {(() => {
                const informe = detalleMetrics?.informe || null;
                const totalContactos = Number(informe?.total_contactos || 0);
                const totalGestionados = Number(informe?.total_vendidos || 0)
                  + Number(informe?.total_no_contesta || 0)
                  + Number(informe?.total_rechazos || 0)
                  + Number(informe?.total_dato_erroneo || 0)
                  + Number(informe?.total_en_proceso || 0)
                  + Number(informe?.total_incontactables || 0);
                const pctAvance = totalContactos > 0 ? Math.round((totalGestionados / totalContactos) * 100) : 0;
                const isCompletado = totalContactos > 0 && totalGestionados >= totalContactos;
                const statusBadge = isCompletado
                  ? { label: 'Completado', bg: '#E1F5EE', color: '#0F6E56' }
                  : { label: 'Activo', bg: '#FAEEDA', color: '#854F0B' };
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
                      <span>{loteSeleccionado?.sellerName ? `Vendedor: ${loteSeleccionado.sellerName}` : 'Vendedor: —'}</span>
                      <span>·</span>
                      <span>Creado: {loteSeleccionado?.createdAt ? formatDateTime(loteSeleccionado.createdAt) : '—'}</span>
                      <span>·</span>
                      <span>Contactos: <strong style={{ color: 'var(--color-text-primary)' }}>{totalContactos || '—'}</strong></span>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <div style={{ height: 4, background: 'rgba(148,163,184,0.22)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: pctAvance + '%', background: '#0F766E' }} />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {detalleError ? (
                <div style={{ marginTop: 12, color: '#b91c1c', fontWeight: 800 }}>{detalleError}</div>
              ) : null}
              {detalleLoading ? (
                <div style={{ marginTop: 12, color: 'var(--muted)' }}>Cargando detalle…</div>
              ) : null}

              {detalleMetrics?.informe && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginTop: 12 }}>
                  {[
                    { label: 'Total', value: detalleMetrics.informe.total_contactos, color: 'var(--color-text-primary)' },
                    { label: 'Ventas', value: detalleMetrics.informe.total_vendidos, color: '#15803D' },
                    { label: 'Rechazos', value: detalleMetrics.informe.total_rechazos, color: '#DC2626' },
                    { label: '% Avance', value: `${(() => {
                      const informe = detalleMetrics?.informe || {};
                      const totalContactos = Number(informe.total_contactos || 0);
                      const totalGestionados = Number(informe.total_vendidos || 0)
                        + Number(informe.total_no_contesta || 0)
                        + Number(informe.total_rechazos || 0)
                        + Number(informe.total_dato_erroneo || 0)
                        + Number(informe.total_en_proceso || 0)
                        + Number(informe.total_incontactables || 0);
                      return totalContactos > 0 ? Math.round((totalGestionados / totalContactos) * 100) : 0;
                    })()}%`, color: '#0F766E' }
                  ].map((m) => (
                    <div key={m.label} style={{ background: 'var(--color-background-secondary)', borderRadius: 12, padding: '14px 16px', border: '0.5px solid var(--color-border-tertiary)' }}>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 800 }}>{m.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: m.color, marginTop: 2 }}>{m.value ?? '—'}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 800 }}>
                  {Number(
                    detalleMetrics?.informe?.total_contactos
                      || loteSeleccionado?.total_contactos
                      || loteSeleccionado?.contactos
                      || 0
                  ).toLocaleString('es-UY')} contactos
                </div>
                {showDetalleSearch ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      className="input"
                      value={detalleSearch}
                      onChange={(event) => setDetalleSearch(event.target.value)}
                      placeholder="Buscar contacto..."
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
              </div>

              <div className="table-wrap" style={{ overflowX: 'auto', marginTop: 10 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Contacto</th>
                      <th>Producto</th>
                      <th>Estado</th>
                      <th>Última gestión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detalleContacts || [])
                      .filter((row) => {
                        if (!detalleSearch.trim()) return true;
                        const key = detalleSearch.trim().toLowerCase();
                        const fullName = [row.nombre, row.apellido].filter(Boolean).join(' ')
                          || row.name
                          || row.contacto
                          || '';
                        return fullName.toLowerCase().includes(key);
                      })
                      .map((row, idx) => (
                      (() => {
                        const fullName = [row.nombre, row.apellido].filter(Boolean).join(' ')
                          || row.name
                          || row.contacto
                          || '—';
                        const depto = row.departamento || row.depto || row.city || '';
                        const producto = row.nombre_producto || row.producto || row.producto_anterior || '—';
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
                        const ultima = row.ultima_gestion || row.fecha_ultima_gestion || row.ultima_gestion_real || null;
                        return (
                          <tr key={row.id || idx}>
                            <td>
                              <div style={{ fontWeight: 900, color: 'var(--color-text-primary)' }}>{fullName}</div>
                              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{depto || '—'}</div>
                            </td>
                            <td>{producto}</td>
                            <td>
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
                            <td>{ultima ? formatDateTime(ultima) : '—'}</td>
                          </tr>
                        );
                      })()
                    ))}
                    {!detalleLoading && (!detalleContacts || !detalleContacts.length) ? (
                      <tr><td colSpan={4} style={{ padding: 14, color: 'var(--muted)' }}>Sin contactos para este lote.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {vistaActual === 'disponibles' && (
            <>
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
                {Number((tabCounts.disponibles || 0) || (metrics.disponibles || 0)).toLocaleString('es-UY')}
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
                {Number(tabCounts.en_gestion || 0).toLocaleString('es-UY')}
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
                {Number(tabCounts.recuperados || 0).toLocaleString('es-UY')}
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
                {Number(tabCounts.rechazados || 0).toLocaleString('es-UY')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                no quisieron volver
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {tabsOperativos.map((tab) => (
              (() => {
                const isActive = activeTab === tab.key;
                const count = (
                  tab.key === 'disponibles' ? tabCounts.disponibles
                    : tab.key === 'asignados' ? (tabCounts.en_gestion ?? tabCounts.asignados ?? 0)
                      : tab.key === 'recuperados' ? tabCounts.recuperados
                        : tab.key === 'rechazados' ? tabCounts.rechazados
                          : tab.key === 'fallecidos' ? tabCounts.fallecidos
                            : 0
                );
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: isActive ? 'none' : '0.5px solid var(--color-border-tertiary)',
                      background: isActive ? '#0F766E' : '#fff',
                      color: isActive ? '#fff' : 'var(--color-text-secondary)',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    {tab.label}
                    <span style={{
                      fontSize: 11,
                      padding: '1px 7px',
                      borderRadius: 10,
                      marginLeft: 6,
                      background: isActive ? 'rgba(255,255,255,0.2)' : '#F1EFE8',
                      color: isActive ? 'white' : '#5F5E5A',
                      fontWeight: 500
                    }}>
                      {Number(count || 0).toLocaleString('es-UY')}
                    </span>
                  </button>
                );
              })()
            ))}
          </div>

          <style>{`
            @keyframes recuperoImportPulse {
              0%, 100% {
                box-shadow: 0 0 0 rgba(56, 189, 248, 0.0), 0 10px 24px rgba(14, 116, 144, 0.20);
                transform: translateY(0);
              }
              50% {
                box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.12), 0 16px 30px rgba(37, 99, 235, 0.30);
                transform: translateY(-1px);
              }
            }
            @keyframes recuperoImportSheen {
              0% { transform: translateX(-140%) skewX(-18deg); opacity: 0; }
              20% { opacity: 0.32; }
              60% { opacity: 0.18; }
              100% { transform: translateX(220%) skewX(-18deg); opacity: 0; }
            }
            .button.recupero-import-btn {
              position: relative;
              overflow: hidden;
              border: 1px solid rgba(125, 211, 252, 0.55) !important;
              background: linear-gradient(135deg, #0f4c81 0%, #2563eb 45%, #38bdf8 100%) !important;
              color: #f8fbff !important;
              box-shadow: 0 10px 24px rgba(14, 116, 144, 0.20);
              animation: recuperoImportPulse 2.8s ease-in-out infinite;
            }
            .button.recupero-import-btn svg {
              color: #dbeafe !important;
            }
            .button.recupero-import-btn::before {
              content: '';
              position: absolute;
              inset: 0;
              background: linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.42) 50%, transparent 80%);
              animation: recuperoImportSheen 2.6s linear infinite;
              pointer-events: none;
            }
            .button.recupero-import-btn:hover {
              filter: brightness(1.05);
              transform: translateY(-1px);
            }
          `}</style>

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
              <Button className="recupero-import-btn" variant="secondary" icon={<Upload size={16} />} onClick={() => { resetImportState(); setShowImportModal(true); }}>
                Importar CSV
              </Button>
            </div>

            {activeTab === 'disponibles' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  Seleccionados: {selectedIds.length}
                </span>
                <Button
                  onClick={() => openAssign(selectedIds)}
                  disabled={!selectedIds.length}
                >
                  Asignar seleccionados ({selectedIds.length})
                </Button>
              </div>
            )}
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
            border: '0.5px solid var(--color-border-tertiary)'
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
                  border: '0.5px solid var(--color-border-tertiary)',
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
                    border: '0.5px solid var(--color-border-tertiary)',
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
                    border: '0.5px solid var(--color-border-tertiary)',
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
                      borderBottom: '0.5px solid var(--color-border-tertiary)',
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
                  border: '0.5px solid var(--color-border-tertiary)',
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
                  border: '0.5px solid var(--color-border-tertiary)',
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
                  if (openFilterColumn === 'motivo_baja') setOpenFilterColumn('');
                  const errors = validateColumnFilters(columnFiltersDraft);
                  setFilterErrors(errors);
                  if (!Object.keys(errors).length) {
                    setColumnFiltersApplied({ ...columnFiltersDraft });
                    setPage(1);
                  }
                }}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
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
              <button
                type="button"
                onClick={() => {
                  setColumnFiltersDraft({ ...COLUMN_FILTERS_INITIAL });
                  setColumnFiltersApplied({ ...COLUMN_FILTERS_INITIAL });
                  setFilterErrors({});
                  setOpenFilterColumn('');
                  setPage(1);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '0.5px solid var(--color-border-tertiary)',
                  background: '#fff',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Limpiar
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
                  border: '0.5px solid var(--color-border-tertiary)',
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
                    border: '0.5px solid var(--color-border-tertiary)',
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
                  <th style={{ width: 36 }}>
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allVisibleSelected && visibleSelectableIds.length > 0}
                      onChange={toggleSelectAllVisible}
                      disabled={activeTab !== 'disponibles' || !visibleSelectableIds.length}
                      aria-label="Seleccionar todos los contactos visibles"
                    />
                  </th>
                  <th style={{ textAlign: 'left' }}>Contacto</th>
                  <th style={{ textAlign: 'left' }}>Producto anterior</th>
                  <th style={{ textAlign: 'left' }}>Motivo de baja</th>
                  <th style={{ textAlign: 'left' }}>Fecha de baja</th>
                  <th style={{ textAlign: 'left' }}>Vendedor origen</th>
                  <th style={{ textAlign: 'left' }}>Estado</th>
                  <th style={{ textAlign: 'left' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((row) => {
                  const nombre = getContactoNombre(row);
                  const initials = nombre.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
                  const motivoInfo = getMotivoInfo(row);
                  const estadoBadge = getEstadoBadge(row);
                  const fechaBaja = row.fecha_baja || row.fechaBaja || null;
                  const isExpanded = String(expandedRowId) === String(row.id);
                  const toggleExpand = () => setExpandedRowId((prev) => (String(prev) === String(row.id) ? null : row.id));
                  return (
                    <React.Fragment key={row.id}>
                      <tr style={{ background: isExpanded ? 'rgba(148,163,184,0.12)' : undefined }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(row.id)}
                            onChange={() => toggleSelection(row.id)}
                            disabled={activeTab !== 'disponibles'}
                            aria-label="Seleccionar contacto"
                          />
                        </td>
                        <td>
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
                                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                                  {[row.telefono, row.celular].filter(Boolean).join(' · ') || '—'}
                                </div>
                              </button>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 13 }}>
                            {row.nombre_producto || row.producto_anterior || '—'}
                          </div>
                          {row.precio && (
                            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                              ${Number(row.precio).toLocaleString('es-UY')}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ color: motivoInfo.color, fontSize: 12, fontWeight: 500 }}>
                            {motivoInfo.label}
                          </span>
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                          {row.fecha_baja ? formatDate(row.fecha_baja) : '—'}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                          {row.vendedor_origen || '—'}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: estadoBadge.bg,
                            color: estadoBadge.color,
                            fontSize: 12,
                            fontWeight: 700
                          }}>
                            {estadoBadge.label}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => openAssign([row.id], row)}
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#0f766e',
                                background: 'rgba(15,118,110,0.08)',
                                border: '1px solid rgba(15,118,110,0.22)',
                                borderRadius: 8,
                                padding: '6px 10px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {getVendedorAsignado(row) ? 'Reasignar' : 'Asignar'}
                            </button>
                            <button
                              type="button"
                              onClick={toggleExpand}
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                border: '1px solid rgba(148,163,184,0.5)',
                                background: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              aria-label="Expandir fila"
                            >
                              <ChevronDown size={16} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={7} style={{ background: 'rgba(148,163,184,0.12)', padding: '12px 14px', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
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
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{row.telefono || row.celular || row.phone || '—'}</div>
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
                                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Vendedor original</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{row.vendedor_original || row.vendedorOriginal || row.vendedor_asignado_original || '—'}</div>
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
            </>
          )}

        </Panel>
      </section>

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
                <Button onClick={handleConfirmAssign} disabled={!assignSellerId || creatingLot}>
                  {creatingLot ? 'Asignando...' : 'Confirmar asignación'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInformeModal && (
        <div className="lot-wizard-overlay" onClick={closeInformeModal}>
          <div className="lot-wizard" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="lot-wizard-header">
              <div style={{ fontWeight: 700 }}>Informe del lote</div>
              <button className="close-btn" onClick={closeInformeModal}><X size={16} /></button>
            </div>
            <div className="lot-wizard-content">
              {(() => {
                const loteId = String(informeModalLoteId || '');
                const informe = loteId ? lotesMetrics?.[loteId]?.informe : null;
                const loteNombre = (lotesCreados || []).find((l) => String(asLotId(l)) === loteId)?.nombre
                  || (lotesCreados || []).find((l) => String(asLotId(l)) === loteId)?.name
                  || '—';
                if (!informe) {
                  return <div style={{ color: 'var(--muted)' }}>No hay métricas disponibles para este lote.</div>;
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-text-primary)' }}>{loteNombre}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>Lote: {loteId}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                      {[
                        { label: 'Total contactos', value: informe.total_contactos, color: 'var(--color-text-primary)', sub: null },
                        { label: '% Avance', value: `${Math.round(((Number(informe.total_vendidos || 0) + Number(informe.total_no_contesta || 0) + Number(informe.total_rechazos || 0) + Number(informe.total_dato_erroneo || 0) + Number(informe.total_en_proceso || 0) + Number(informe.total_incontactables || 0)) / Math.max(1, Number(informe.total_contactos || 0))) * 100)}%`, color: '#185FA5', sub: `${Number(informe.total_vendidos || 0) + Number(informe.total_no_contesta || 0) + Number(informe.total_rechazos || 0) + Number(informe.total_dato_erroneo || 0) + Number(informe.total_en_proceso || 0) + Number(informe.total_incontactables || 0)} gestionados` },
                        { label: '% Contactabilidad', value: `${informe.pct_contactabilidad ?? 0}%`, color: '#3B6D11', sub: `${informe.total_contactados ?? 0} atendieron` },
                        { label: '% Conversión', value: `${informe.pct_conversion ?? 0}%`, color: '#0F6E56', sub: `${informe.total_vendidos ?? 0} ventas` },
                      ].map((m, i) => (
                        <div key={i} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '8px 10px', alignSelf: 'start' }}>
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-secondary)' }}>{m.label}</p>
                          <p style={{ margin: '3px 0 0', fontSize: 20, fontWeight: 700, color: m.color }}>{m.value ?? '—'}</p>
                          {m.sub && <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--color-text-secondary)' }}>{m.sub}</p>}
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {[
                        { icon: 'ti-circle-dot', color: '#639922', bg: '#EAF3DE', label: 'Nuevos', value: informe.total_nuevos },
                        { icon: 'ti-check', color: '#0F6E56', bg: '#E1F5EE', label: 'Vendidos', value: informe.total_vendidos },
                        { icon: 'ti-clock', color: '#854F0B', bg: '#FAEEDA', label: 'En proceso', value: informe.total_en_proceso },
                        { icon: 'ti-phone-off', color: '#BA7517', bg: '#FFF8E1', label: 'No contesta', value: informe.total_no_contesta },
                        { icon: 'ti-phone-x', color: '#A32D2D', bg: '#FCEBEB', label: 'Incontactables', value: informe.total_incontactables },
                        { icon: 'ti-x', color: '#E24B4A', bg: '#FCEBEB', label: 'Rechazos', value: informe.total_rechazos },
                        { icon: 'ti-alert-circle', color: '#888780', bg: '#F1EFE8', label: 'Dato erróneo', value: informe.total_dato_erroneo },
                      ].map((row, i) => {
                        const total = Number(informe.total_contactos || 0);
                        const valueNum = Number(row.value || 0);
                        const pct = total > 0 ? Math.round((valueNum / total) * 100) : 0;
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 6 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                            <div style={{ width: 24, height: 24, borderRadius: 6, background: row.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <i className={'ti ' + row.icon} style={{ fontSize: 12, color: row.color }} />
                            </div>
                            <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-primary)' }}>{row.label}</span>
                            <div style={{ width: 80, height: 3, background: 'var(--color-background-secondary)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ width: pct + '%', height: '100%', background: row.color, borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', minWidth: 24, textAlign: 'right' }}>{valueNum}</span>
                            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', minWidth: 30, textAlign: 'right' }}>{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
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
                  background: s < importStep ? '#5DCAA5' : s === importStep ? '#0F766E' : 'var(--color-border-tertiary)',
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
                    border: '0.5px solid var(--color-border-tertiary)'
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

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                    <Button variant="ghost" onClick={() => { resetImportState(); setShowImportModal(false); }}>Cancelar</Button>
                    <Button disabled={!importFile || importErrors.length > 0} onClick={() => setImportStep(2)}>
                      Continuar →
                    </Button>
                  </div>
                </div>
              )}

              {importStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{importFile?.name}</div>
                    <span style={{ padding: '2px 8px', borderRadius: 999, background: '#E1F5EE', color: '#0F6E56', fontSize: 11, fontWeight: 500 }}>
                      {importRows.length} filas leídas
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    {[
                      { label: 'Total filas', value: importRows.length, color: 'var(--color-text-primary)' },
                      { label: 'Listos para importar', value: importRows.length, color: '#0F6E56' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ fontSize: 20, fontWeight: 500, color }}>{value}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Vista previa — primeras filas
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                      Se muestran los datos más relevantes, pero se cargarán todas las columnas del CSV.
                    </span>
                  </div>
                  <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, overflowX: 'auto', overflowY: 'auto', maxHeight: 220 }}>
                    <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: 'var(--color-background-secondary)' }}>
                          {['Documento', 'Nombre', 'Apellido', 'Teléfono', 'Plan', 'Precio', 'Motivo baja', 'Fecha baja'].map((h) => (
                            <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.slice(0, 8).map((row, idx) => (
                          <tr key={idx} style={{ borderTop: '0.5px solid var(--color-border-tertiary)' }}>
                            <td style={{ padding: '6px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.documento || '—'}</td>
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
                    Los duplicados y clientes activos serán excluidos automáticamente durante la importación.
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button variant="ghost" onClick={() => setImportStep(1)}>← Volver</Button>
                    <Button disabled={importLoading} onClick={handleImportCsv}>
                      {importLoading ? 'Importando…' : 'Confirmar e importar →'}
                    </Button>
                  </div>
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
                            border: '0.5px solid var(--color-border-tertiary)',
                            borderRadius: 8,
                            overflow: 'auto',
                            maxHeight: 200
                          }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                              <thead>
                                <tr style={{ background: 'var(--color-background-secondary)' }}>
                                  <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>Fila</th>
                                  <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>Documento</th>
                                  <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>Motivo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {importStats.activosDetalle.map((e, i) => (
                                  <tr key={i} style={{ borderTop: '0.5px solid var(--color-border-tertiary)' }}>
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

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button variant="ghost" onClick={() => { resetImportState(); }}>
                      Importar otro archivo
                    </Button>
                    <Button onClick={() => { resetImportState(); setShowImportModal(false); }}>
                      Cerrar
                    </Button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}





















