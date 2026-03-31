import React from 'react';
import { Filter, RefreshCw, Plus, X, Upload, Columns } from 'lucide-react';
import { getApiClient } from '../services/apiClient.js';

const PAGE_SIZE = 50;

const normalizeOption = (value) => String(value || '').trim();
const makeId = () => `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const EMPTY_GROUP = () => ({
  id: makeId(),
  type: 'group',
  combinator: 'AND',
  rules: []
});

const EMPTY_RULE = (fieldId = 'contacto') => ({
  id: makeId(),
  type: 'rule',
  field: fieldId,
  operator: '',
  value: ''
});

const EMPTY_ADVANCED_FILTERS = () => ({
  fecha_baja_desde: '',
  fecha_baja_hasta: '',
  edad_min: '',
  edad_max: '',
  motivo_baja: [],
  ultimo_estado: [],
  producto: [],
  departamento: []
});

const OPERATOR_LABELS = {
  contains: 'contiene',
  not_contains: 'no contiene',
  eq: 'igual',
  ne: 'distinto',
  starts: 'empieza con',
  ends: 'termina con',
  empty: 'vacío',
  not_empty: 'no vacío',
  gt: 'mayor',
  gte: 'mayor o igual',
  lt: 'menor',
  lte: 'menor o igual',
  between: 'entre',
  before: 'antes',
  after: 'después',
  today: 'hoy',
  last_days: 'últimos X días',
  this_month: 'este mes',
  in: 'es alguno de',
  not_in: 'no es alguno de',
  is_true: 'verdadero',
  is_false: 'falso'
};

const TYPE_OPERATORS = {
  text: ['contains', 'not_contains', 'eq', 'ne', 'starts', 'ends', 'empty', 'not_empty'],
  number: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between', 'empty', 'not_empty'],
  date: ['before', 'after', 'between', 'today', 'last_days', 'this_month', 'empty', 'not_empty'],
  enum: ['in', 'not_in', 'empty', 'not_empty'],
  boolean: ['is_true', 'is_false']
};

const isGroup = (node) => node?.type === 'group';
const isRule = (node) => node?.type === 'rule';
function ColHeader({ campo, label, ordenActual, onOrden }) {
  const activo = ordenActual.campo === campo;
  const icono = !activo ? '↕' : ordenActual.direccion === 'asc' ? '↑' : '↓';
  return (
    <th
      onClick={() => onOrden({
        campo,
        direccion: activo && ordenActual.direccion === 'asc' ? 'desc' : 'asc'
      })}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
    >
      {label} <span style={{ opacity: activo ? 1 : 0.3, fontSize: '11px' }}>{icono}</span>
    </th>
  );
}

export default function SupervisorContractsModule({ Panel, Button, Tag }) {
  const api = React.useMemo(() => getApiClient(), []);
  const [metrics, setMetrics] = React.useState({ total: 0, disponibles: 0, enLote: 0, recuperados: 0, rechazados: 0 });
  const [items, setItems] = React.useState([]);
  const [filtroProducto, setFiltroProducto] = React.useState('');
  const [filtroDepartamento, setFiltroDepartamento] = React.useState('');
  const [filtroMotivo, setFiltroMotivo] = React.useState('');
  const [filtroBusqueda, setFiltroBusqueda] = React.useState('');
  const [filtroBusquedaDebounced, setFiltroBusquedaDebounced] = React.useState('');
  const [orden, setOrden] = React.useState({ campo: '', direccion: 'asc' });
  const [filterOptions, setFilterOptions] = React.useState({ productos: [], departamentos: [], motivos: [], estados: [] });
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
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  const [advancedFiltersDraft, setAdvancedFiltersDraft] = React.useState(EMPTY_ADVANCED_FILTERS());
  const [advancedFiltersApplied, setAdvancedFiltersApplied] = React.useState(EMPTY_ADVANCED_FILTERS());
  const [filterErrors, setFilterErrors] = React.useState({});
  const [columnsPanelOpen, setColumnsPanelOpen] = React.useState(false);
  const [visibleColumns, setVisibleColumns] = React.useState([]);
  const [savedViews, setSavedViews] = React.useState([]);
  const [selectedViewId, setSelectedViewId] = React.useState('');
  const [saveViewName, setSaveViewName] = React.useState('');
  const [saveViewDefault, setSaveViewDefault] = React.useState(false);
  const [saveViewFavorite, setSaveViewFavorite] = React.useState(false);
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

  const visibleItems = React.useMemo(() => (Array.isArray(items) ? items : []), [items]);

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
      const productos = response?.productos || response?.data?.productos || [];
      const departamentos = response?.departamentos || response?.data?.departamentos || [];
      const motivos = response?.motivos || response?.data?.motivos || [];
      const estados = response?.estados || response?.data?.estados || response?.ultimo_estado || response?.data?.ultimo_estado || [];
      setFilterOptions({
        productos: Array.isArray(productos) ? productos : [],
        departamentos: Array.isArray(departamentos) ? departamentos : [],
        motivos: Array.isArray(motivos) ? motivos : [],
        estados: Array.isArray(estados) ? estados : []
      });
    } catch {
      setFilterOptions({ productos: [], departamentos: [], motivos: [], estados: [] });
      setFiltersError('No se pudieron cargar los catÃ¡logos.');
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

  const filterFields = React.useMemo(() => ([
    { id: 'contacto', label: 'Contacto', type: 'text' },
    { id: 'documento', label: 'Documento', type: 'number' },
    { id: 'edad', label: 'Edad', type: 'number' },
    { id: 'telefono', label: 'Teléfono', type: 'number' },
    { id: 'departamento', label: 'Departamento', type: 'enum', options: filterOptions.departamentos },
    { id: 'producto', label: 'Producto', type: 'enum', options: filterOptions.productos },
    { id: 'precio', label: 'Precio', type: 'number' },
    { id: 'fecha_baja', label: 'Fecha de baja', type: 'date' },
    { id: 'motivo_baja', label: 'Motivo de baja', type: 'enum', options: filterOptions.motivos },
    { id: 'lote', label: 'Lote', type: 'text' },
    { id: 'vendedor_asignado', label: 'Vendedor asignado', type: 'enum', options: sellers.map((seller) => ({ value: seller.id, label: seller.label })) },
    { id: 'ultimo_estado', label: 'Último estado', type: 'enum', options: [
      { value: 'Nuevo', label: 'Nuevo' },
      { value: 'Seguimiento', label: 'Seguimiento' },
      { value: 'Rellamar', label: 'Rellamar' },
      { value: 'Rechazo', label: 'Rechazo' },
      { value: 'Recuperado', label: 'Recuperado' }
    ] },
    { id: 'ultima_gestion', label: 'Última gestión', type: 'date' }
  ]), [filterOptions.departamentos, filterOptions.motivos, filterOptions.productos, sellers]);

  const getFieldById = React.useCallback((fieldId) => (
    filterFields.find((field) => field.id === fieldId) || filterFields[0]
  ), [filterFields]);

  const getOperatorsForField = React.useCallback((fieldId) => {
    const field = getFieldById(fieldId);
    return TYPE_OPERATORS[field?.type] || TYPE_OPERATORS.text;
  }, [getFieldById]);

  const normalizeRuleValue = (rule, operator) => {
    if (operator === 'between') {
      return { from: '', to: '' };
    }
    if (operator === 'last_days') {
      return 7;
    }
    if (operator === 'today' || operator === 'this_month' || operator === 'empty' || operator === 'not_empty' || operator === 'is_true' || operator === 'is_false') {
      return '';
    }
    return '';
  };

  const getMotivoBaja = (row) => row?.motivo_baja || null;
  const getNombreLote = (row) => row?.nombre_lote || null;
  const getVendedorAsignado = (row) => row?.vendedor_asignado_nombre || null;
  const getUltimoEstado = (row) => row?.ultimo_estado_gestion || null;
  const getFechaUltimaGestion = (row) => row?.fecha_ultima_gestion || null;

  const updateGroupById = (group, groupId, updater) => {
    if (group.id === groupId) return updater(group);
    return {
      ...group,
      rules: group.rules.map((rule) => {
        if (isGroup(rule)) return updateGroupById(rule, groupId, updater);
        return rule;
      })
    };
  };

  const updateRuleById = (group, ruleId, updater) => ({
    ...group,
    rules: group.rules.map((rule) => {
      if (isGroup(rule)) return updateRuleById(rule, ruleId, updater);
      if (rule.id !== ruleId) return rule;
      return updater(rule);
    })
  });

  const removeRuleOrGroup = (group, targetId) => ({
    ...group,
    rules: group.rules.filter((rule) => rule.id !== targetId).map((rule) => (
      isGroup(rule) ? removeRuleOrGroup(rule, targetId) : rule
    ))
  });

  const addRuleToGroup = (groupId) => {
    const fieldId = advancedFiltersDraft.rules[0]?.field || 'contacto';
    const operator = getOperatorsForField(fieldId)[0] || '';
    const nextRule = {
      ...EMPTY_RULE(fieldId),
      operator,
      value: normalizeRuleValue(null, operator)
    };
    const next = updateGroupById(advancedFiltersDraft, groupId, (group) => ({
      ...group,
      rules: [...group.rules, nextRule]
    }));
    setAdvancedFiltersDraft(next);
  };

  const addGroupToGroup = (groupId) => {
    const nextGroup = EMPTY_GROUP();
    const next = updateGroupById(advancedFiltersDraft, groupId, (group) => ({
      ...group,
      rules: [...group.rules, nextGroup]
    }));
    setAdvancedFiltersDraft(next);
  };

  const updateRuleField = (ruleId, fieldId) => {
    const operators = getOperatorsForField(fieldId);
    const operator = operators[0] || '';
    const nextValue = normalizeRuleValue(null, operator);
    setAdvancedFiltersDraft((prev) => updateRuleById(prev, ruleId, (rule) => ({
      ...rule,
      field: fieldId,
      operator,
      value: nextValue
    })));
  };

  const updateRuleOperator = (ruleId, operator) => {
    setAdvancedFiltersDraft((prev) => updateRuleById(prev, ruleId, (rule) => ({
      ...rule,
      operator,
      value: normalizeRuleValue(rule, operator)
    })));
  };

  const updateRuleValue = (ruleId, value) => {
    setAdvancedFiltersDraft((prev) => updateRuleById(prev, ruleId, (rule) => ({
      ...rule,
      value
    })));
  };

  const updateGroupCombinator = (groupId, combinator) => {
    setAdvancedFiltersDraft((prev) => updateGroupById(prev, groupId, (group) => ({
      ...group,
      combinator
    })));
  };

  const validateRule = (rule) => {
    if (!rule.field || !rule.operator) return 'Seleccioná un campo y operador.';
    if (['empty', 'not_empty', 'today', 'this_month', 'is_true', 'is_false'].includes(rule.operator)) return '';
    if (rule.operator === 'between') {
      if (!rule.value?.from || !rule.value?.to) return 'Completá el rango.';
      return '';
    }
    if (rule.operator === 'last_days') {
      if (!rule.value || Number(rule.value) <= 0) return 'Ingresá cantidad de días.';
      return '';
    }
    if (rule.value === '' || rule.value === null || rule.value === undefined) return 'Seleccioná un valor.';
    return '';
  };

  const collectRuleErrors = (group, errors = {}) => {
    group.rules.forEach((rule) => {
      if (isGroup(rule)) {
        collectRuleErrors(rule, errors);
      } else {
        const error = validateRule(rule);
        if (error) errors[rule.id] = error;
      }
    });
    return errors;
  };

  const flattenRules = (group, acc = []) => {
    group.rules.forEach((rule) => {
      if (isGroup(rule)) flattenRules(rule, acc);
      else acc.push(rule);
    });
    return acc;
  };

  const hasRules = React.useCallback((group) => flattenRules(group).length > 0, []);

  const buildQuickFilterRules = React.useCallback(() => {
    const rules = [];
    if (filtroProducto) rules.push({ id: makeId(), type: 'rule', field: 'producto', operator: 'eq', value: filtroProducto });
    if (filtroMotivo) rules.push({ id: makeId(), type: 'rule', field: 'motivo_baja', operator: 'eq', value: filtroMotivo });
    if (filtroDepartamento) rules.push({ id: makeId(), type: 'rule', field: 'departamento', operator: 'eq', value: filtroDepartamento });
    return rules;
  }, [filtroDepartamento, filtroMotivo, filtroProducto]);

  const mergeRules = (baseRules, extraRules) => {
    const seen = new Set();
    const merged = [];
    [...baseRules, ...extraRules].forEach((rule) => {
      const key = `${rule.field}:${rule.operator}:${JSON.stringify(rule.value)}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(rule);
    });
    return merged;
  };

  const toNumberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  };

  const validateAdvancedFilters = (filters) => {
    const errors = {};
    const edadMin = toNumberOrNull(filters.edad_min);
    const edadMax = toNumberOrNull(filters.edad_max);
    if (edadMin !== null && edadMax !== null && edadMin > edadMax) {
      errors.edad = 'Rango de edad inválido.';
    }
    if (filters.fecha_baja_desde && filters.fecha_baja_hasta && filters.fecha_baja_desde > filters.fecha_baja_hasta) {
      errors.fecha_baja = 'Fecha desde mayor que fecha hasta.';
    }
    return errors;
  };

  const buildFiltersPayload = React.useCallback(() => {
    const payload = {
      contacto: advancedFiltersApplied.contacto?.trim() || '',
      documento: advancedFiltersApplied.documento?.trim() || '',
      telefono: advancedFiltersApplied.telefono?.trim() || '',
      edad_min: toNumberOrNull(advancedFiltersApplied.edad_min),
      edad_max: toNumberOrNull(advancedFiltersApplied.edad_max),
      fecha_baja_desde: advancedFiltersApplied.fecha_baja_desde || '',
      fecha_baja_hasta: advancedFiltersApplied.fecha_baja_hasta || '',
      ultimo_estado: Array.isArray(advancedFiltersApplied.ultimo_estado) ? advancedFiltersApplied.ultimo_estado : [],
      ultima_gestion_desde: advancedFiltersApplied.ultima_gestion_desde || '',
      ultima_gestion_hasta: advancedFiltersApplied.ultima_gestion_hasta || '',
      precio_min: toNumberOrNull(advancedFiltersApplied.precio_min),
      precio_max: toNumberOrNull(advancedFiltersApplied.precio_max),
      vendedor_asignado: Array.isArray(advancedFiltersApplied.vendedor_asignado) ? advancedFiltersApplied.vendedor_asignado : [],
      lote: Array.isArray(advancedFiltersApplied.lote) ? advancedFiltersApplied.lote : []
    };
    if (filtroProducto) payload.producto = [filtroProducto];
    if (filtroMotivo) payload.motivo_baja = [filtroMotivo];
    if (filtroDepartamento) payload.departamento = [filtroDepartamento];
    Object.keys(payload).forEach((key) => {
      const value = payload[key];
      if (value === '' || value === null || value === undefined) delete payload[key];
      if (Array.isArray(value) && !value.length) delete payload[key];
    });
    return payload;
  }, [advancedFiltersApplied, filtroDepartamento, filtroMotivo, filtroProducto]);

  const buildSearchPayload = React.useCallback(() => ({
    tab: activeTab,
    search: filtroBusquedaDebounced || '',
    filters: buildFiltersPayload(),
    sort: orden.campo ? { field: orden.campo, dir: orden.direccion } : null,
    columns: visibleColumns.length ? visibleColumns : allColumns.map((col) => col.id),
    page,
    limit: PAGE_SIZE
  }), [activeTab, allColumns, buildFiltersPayload, filtroBusquedaDebounced, orden, page, visibleColumns]);

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
            + (payload.search ? `&search=${encodeURIComponent(payload.search)}` : '')
            + (payload.tab ? `&tab=${encodeURIComponent(payload.tab)}` : '')
            + (filtroProducto ? `&producto=${encodeURIComponent(filtroProducto)}` : '')
            + (filtroDepartamento ? `&departamento=${encodeURIComponent(filtroDepartamento)}` : '')
            + (filtroMotivo ? `&motivo_baja=${encodeURIComponent(filtroMotivo)}` : '')
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
  }, [api, buildSearchPayload, metrics.total]);

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
      const saved = JSON.parse(localStorage.getItem('recupero_saved_views') || '[]');
      if (Array.isArray(saved)) {
        setSavedViews(saved);
        const defaultView = saved.find((view) => view.isDefault);
        if (defaultView) {
          setSelectedViewId(defaultView.id);
          if (defaultView.filters) {
            setAdvancedFiltersDraft(defaultView.filters);
            setAdvancedFiltersApplied(defaultView.filters);
          }
          if (defaultView.quickFilters) {
            setFiltroProducto(defaultView.quickFilters.producto || '');
            setFiltroDepartamento(defaultView.quickFilters.departamento || '');
            setFiltroMotivo(defaultView.quickFilters.motivo_baja || '');
            setFiltroBusqueda(defaultView.quickFilters.search || '');
            setFiltroBusquedaDebounced(defaultView.quickFilters.search || '');
          }
          if (defaultView.columns?.length) {
            setVisibleColumns(defaultView.columns);
          }
          if (defaultView.sort) {
            setOrden(defaultView.sort);
          }
          if (defaultView.tab) {
            setActiveTab(defaultView.tab);
          }
        }
      }
    } catch {
      setSavedViews([]);
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem('recupero_saved_views', JSON.stringify(savedViews));
    } catch {}
  }, [savedViews]);

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
    const handler = setTimeout(() => {
      setFiltroBusquedaDebounced(filtroBusqueda.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [filtroBusqueda]);

  React.useEffect(() => {
    setPage(1);
  }, [filtroProducto, filtroDepartamento, filtroMotivo, filtroBusquedaDebounced, orden, activeTab, visibleColumns]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const applyAdvancedFilters = () => {
    const errors = validateAdvancedFilters(advancedFiltersDraft);
    setFilterErrors(errors);
    if (Object.keys(errors).length) return;
    setAdvancedFiltersApplied(advancedFiltersDraft);
    setPage(1);
  };

  const clearAdvancedFilters = () => {
    const empty = EMPTY_ADVANCED_FILTERS();
    setAdvancedFiltersDraft(empty);
    setAdvancedFiltersApplied(empty);
    setFilterErrors({});
    setPage(1);
  };

  const updateAdvancedField = (field, value) => {
    setAdvancedFiltersDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleMultiSelect = (event, field) => {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value);
    updateAdvancedField(field, values);
  };

  const clearAllFilters = () => {
    setFiltroProducto('');
    setFiltroDepartamento('');
    setFiltroMotivo('');
    setFiltroBusqueda('');
    setFiltroBusquedaDebounced('');
    clearAdvancedFilters();
  };

  const clearAdvancedField = (fieldId) => {
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
      if (fieldId === 'motivo_baja') next.motivo_baja = [];
      if (fieldId === 'ultimo_estado') next.ultimo_estado = [];
      if (fieldId === 'producto_avanzado') next.producto = [];
      if (fieldId === 'departamento_avanzado') next.departamento = [];
      return next;
    };
    setAdvancedFiltersApplied((prev) => resetField(prev));
    setAdvancedFiltersDraft((prev) => resetField(prev));
    setPage(1);
  };

  const handleSaveView = () => {
    if (!saveViewName.trim()) return;
    const nextView = {
      id: makeId(),
      name: saveViewName.trim(),
      isDefault: saveViewDefault,
      isFavorite: saveViewFavorite,
      tab: activeTab,
      filters: advancedFiltersApplied,
      quickFilters: {
        producto: filtroProducto,
        departamento: filtroDepartamento,
        motivo_baja: filtroMotivo,
        search: filtroBusqueda
      },
      columns: visibleColumns,
      sort: orden
    };
    setSavedViews((prev) => {
      const withoutDefault = saveViewDefault ? prev.map((view) => ({ ...view, isDefault: false })) : prev;
      return [...withoutDefault, nextView];
    });
    setSaveViewName('');
    setSaveViewDefault(false);
    setSaveViewFavorite(false);
    setSelectedViewId(nextView.id);
  };

  const applySavedView = (viewId) => {
    if (!viewId) {
      setSelectedViewId('');
      return;
    }
    const view = savedViews.find((item) => item.id === viewId);
    if (!view) return;
    setSelectedViewId(viewId);
    if (view.filters) {
      setAdvancedFiltersDraft(view.filters);
      setAdvancedFiltersApplied(view.filters);
    }
    if (view.quickFilters) {
      setFiltroProducto(view.quickFilters.producto || '');
      setFiltroDepartamento(view.quickFilters.departamento || '');
      setFiltroMotivo(view.quickFilters.motivo_baja || '');
      setFiltroBusqueda(view.quickFilters.search || '');
      setFiltroBusquedaDebounced(view.quickFilters.search || '');
    }
    if (view.columns?.length) {
      setVisibleColumns(view.columns);
    }
    if (view.sort) {
      setOrden(view.sort);
    }
    if (view.tab) {
      setActiveTab(view.tab);
    }
    setPage(1);
  };

  React.useEffect(() => {
    if (!showImportModal) return;
    if (!isImportSuccess(importResult)) return;
    setShowImportModal(false);
    resetImportState();
  }, [importResult, showImportModal]);

  React.useEffect(() => {
    if (!showAdvancedFilters) return;
    const handler = (event) => {
      if (event.key === 'Escape') {
        setShowAdvancedFilters(false);
        return;
      }
      if (event.key === 'Enter') {
        const tag = event.target?.tagName || '';
        if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
          applyAdvancedFilters();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showAdvancedFilters]);

  const activeQuickFilters = React.useMemo(() => ({
    producto: filtroProducto,
    motivo_baja: filtroMotivo,
    departamento: filtroDepartamento,
    search: filtroBusquedaDebounced
  }), [filtroBusquedaDebounced, filtroDepartamento, filtroMotivo, filtroProducto]);

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

  const activeAdvancedFilters = React.useMemo(() => {
    const filters = [];
    if (advancedFiltersApplied.fecha_baja_desde || advancedFiltersApplied.fecha_baja_hasta) {
      filters.push({
        id: 'fecha_baja',
        label: `Fecha de baja: ${advancedFiltersApplied.fecha_baja_desde || '—'} - ${advancedFiltersApplied.fecha_baja_hasta || '—'}`
      });
    }
    if (advancedFiltersApplied.edad_min || advancedFiltersApplied.edad_max) {
      filters.push({
        id: 'edad',
        label: `Edad: ${advancedFiltersApplied.edad_min || '—'} - ${advancedFiltersApplied.edad_max || '—'}`
      });
    }
    if (Array.isArray(advancedFiltersApplied.motivo_baja) && advancedFiltersApplied.motivo_baja.length) {
      filters.push({
        id: 'motivo_baja',
        label: `Motivo: ${advancedFiltersApplied.motivo_baja.map((val) => getOptionLabel(filterOptions.motivos, val)).join(', ')}`
      });
    }
    if (Array.isArray(advancedFiltersApplied.ultimo_estado) && advancedFiltersApplied.ultimo_estado.length) {
      filters.push({
        id: 'ultimo_estado',
        label: `Último estado: ${advancedFiltersApplied.ultimo_estado.join(', ')}`
      });
    }
    if (Array.isArray(advancedFiltersApplied.producto) && advancedFiltersApplied.producto.length) {
      filters.push({
        id: 'producto_avanzado',
        label: `Producto: ${advancedFiltersApplied.producto.map((val) => getOptionLabel(filterOptions.productos, val)).join(', ')}`
      });
    }
    if (Array.isArray(advancedFiltersApplied.departamento) && advancedFiltersApplied.departamento.length) {
      filters.push({
        id: 'departamento_avanzado',
        label: `Departamento: ${advancedFiltersApplied.departamento.map((val) => getOptionLabel(filterOptions.departamentos, val)).join(', ')}`
      });
    }
    return filters;
  }, [advancedFiltersApplied, filterOptions.departamentos, filterOptions.motivos, filterOptions.productos]);

  const activeFilterCount = React.useMemo(() => {
    const quickCount = Object.values(activeQuickFilters).filter(Boolean).length;
    return quickCount + activeAdvancedFilters.length;
  }, [activeAdvancedFilters.length, activeQuickFilters]);

  const activeChips = React.useMemo(() => {
    const chips = [];
    if (activeQuickFilters.search) chips.push({ id: 'search', label: `Búsqueda: ${activeQuickFilters.search}`, type: 'quick' });
    if (activeQuickFilters.producto) chips.push({ id: 'producto', label: `Producto: ${activeQuickFilters.producto}`, type: 'quick' });
    if (activeQuickFilters.motivo_baja) chips.push({ id: 'motivo_baja_quick', label: `Motivo: ${activeQuickFilters.motivo_baja}`, type: 'quick' });
    if (activeQuickFilters.departamento) chips.push({ id: 'departamento_quick', label: `Departamento: ${activeQuickFilters.departamento}`, type: 'quick' });

    activeAdvancedFilters.forEach((item) => {
      chips.push({ id: item.id, label: item.label, type: 'advanced' });
    });
    return chips;
  }, [activeAdvancedFilters, activeQuickFilters]);

  const renderValueInput = (rule) => {
    const field = getFieldById(rule.field);
    const type = field?.type || 'text';
    const operator = rule.operator;

    if (operator === 'between') {
      return (
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            className="input"
            type={type === 'date' ? 'date' : 'number'}
            placeholder="Desde"
            value={rule.value?.from || ''}
            onChange={(event) => updateRuleValue(rule.id, { ...rule.value, from: event.target.value })}
            style={{ width: '50%' }}
          />
          <input
            className="input"
            type={type === 'date' ? 'date' : 'number'}
            placeholder="Hasta"
            value={rule.value?.to || ''}
            onChange={(event) => updateRuleValue(rule.id, { ...rule.value, to: event.target.value })}
            style={{ width: '50%' }}
          />
        </div>
      );
    }

    if (operator === 'last_days') {
      return (
        <input
          className="input"
          type="number"
          min="1"
          placeholder="Días"
          value={rule.value || ''}
          onChange={(event) => updateRuleValue(rule.id, event.target.value)}
        />
      );
    }

    if (['empty', 'not_empty', 'today', 'this_month', 'is_true', 'is_false'].includes(operator)) {
      return <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>No requiere valor</div>;
    }

    if (type === 'enum') {
      const options = (field?.options || []).map((opt) => (
        typeof opt === 'string' ? { value: opt, label: opt } : opt
      ));
      if (operator === 'in' || operator === 'not_in') {
        return (
          <select
            className="input"
            multiple
            value={Array.isArray(rule.value) ? rule.value : []}
            onChange={(event) => updateRuleValue(rule.id, Array.from(event.target.selectedOptions).map((opt) => opt.value))}
            style={{ minHeight: 38 }}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      }
      return (
        <select
          className="input"
          value={rule.value || ''}
          onChange={(event) => updateRuleValue(rule.id, event.target.value)}
        >
          <option value="">Seleccionar</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        className="input"
        type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
        placeholder="Valor"
        value={rule.value || ''}
        onChange={(event) => updateRuleValue(rule.id, event.target.value)}
      />
    );
  };

  const renderRuleRow = (rule) => {
    const operators = getOperatorsForField(rule.field);
    return (
      <div key={rule.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <select
          className="input"
          value={rule.field}
          onChange={(event) => updateRuleField(rule.id, event.target.value)}
        >
          {filterFields.map((field) => (
            <option key={field.id} value={field.id}>{field.label}</option>
          ))}
        </select>
        <select
          className="input"
          value={rule.operator}
          onChange={(event) => updateRuleOperator(rule.id, event.target.value)}
        >
          <option value="">Operador</option>
          {operators.map((op) => (
            <option key={op} value={op}>{OPERATOR_LABELS[op] || op}</option>
          ))}
        </select>
        {renderValueInput(rule)}
        <button
          type="button"
          onClick={() => setAdvancedFiltersDraft((prev) => removeRuleOrGroup(prev, rule.id))}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9f1239' }}
          aria-label="Eliminar regla"
        >
          ✕
        </button>
        {filterErrors[rule.id] ? (
          <div style={{ gridColumn: '1 / span 3', color: '#b91c1c', fontSize: 12 }}>
            {filterErrors[rule.id]}
          </div>
        ) : null}
      </div>
    );
  };

  const renderGroup = (group, depth = 0) => (
    <div key={group.id} style={{
      border: '1px solid rgba(148,163,184,0.35)',
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      background: depth === 0 ? 'rgba(15, 118, 110, 0.04)' : 'rgba(148,163,184,0.08)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f766e' }}>
          Grupo {depth + 1}
        </span>
        <select
          className="input"
          value={group.combinator}
          onChange={(event) => updateGroupCombinator(group.id, event.target.value)}
          style={{ width: 120 }}
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
        {depth > 0 && (
          <button
            type="button"
            onClick={() => setAdvancedFiltersDraft((prev) => removeRuleOrGroup(prev, group.id))}
            style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: '#9f1239', cursor: 'pointer' }}
          >
            Eliminar grupo
          </button>
        )}
      </div>
      {group.rules.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
          No hay reglas en este grupo.
        </div>
      ) : null}
      {group.rules.map((rule) => (
        isGroup(rule) ? renderGroup(rule, depth + 1) : renderRuleRow(rule)
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Button variant="secondary" onClick={() => addRuleToGroup(group.id)}>
          + Agregar regla
        </Button>
        <Button variant="ghost" onClick={() => addGroupToGroup(group.id)}>
          + Agregar grupo
        </Button>
      </div>
    </div>
  );

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
              <select
                className="input"
                style={{ width: 200 }}
                value={selectedViewId}
                onChange={(event) => applySavedView(event.target.value)}
              >
                <option value="">Mis vistas</option>
                {savedViews.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.isFavorite ? '★ ' : ''}{view.name}
                  </option>
                ))}
              </select>
              <select
                className="input"
                style={{ width: 220 }}
                value={filtroProducto}
                onChange={(event) => setFiltroProducto(event.target.value)}
              >
                <option value="">Producto</option>
                {filterOptions.productos.map((item) => {
                  const value = normalizeOption(item);
                  return <option key={value} value={value}>{value}</option>;
                })}
              </select>
              <select
                className="input"
                style={{ width: 200 }}
                value={filtroMotivo}
                onChange={(event) => setFiltroMotivo(event.target.value)}
              >
                <option value="">Motivo de baja</option>
                {['Sin motivo', ...filterOptions.motivos].map((item) => {
                  const value = normalizeOption(item);
                  return <option key={value} value={value}>{value}</option>;
                })}
              </select>
              <select
                className="input"
                style={{ width: 220 }}
                value={filtroDepartamento}
                onChange={(event) => setFiltroDepartamento(event.target.value)}
              >
                <option value="">Departamento</option>
                {filterOptions.departamentos.map((item) => {
                  const value = normalizeOption(item);
                  return <option key={value} value={value}>{value}</option>;
                })}
              </select>
              <input
                className="input"
                style={{ minWidth: 240 }}
                placeholder="Buscar por nombre o teléfono"
                value={filtroBusqueda}
                onChange={(event) => setFiltroBusqueda(event.target.value)}
              />
              <Button variant="secondary" icon={<Filter size={16} />} onClick={() => setShowAdvancedFilters(true)}>
                Filtros avanzados
              </Button>
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
                    onClick={() => {
                      if (chip.type === 'quick') {
                        if (chip.id === 'search') setFiltroBusqueda('');
                        if (chip.id === 'producto') setFiltroProducto('');
                        if (chip.id === 'motivo_baja_quick') setFiltroMotivo('');
                        if (chip.id === 'departamento') setFiltroDepartamento('');
                      } else {
                        clearAdvancedField(chip.id);
                      }
                    }}
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

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Contacto</th>
                  {isColumnVisible('documento') && <ColHeader campo="documento" label="Documento" ordenActual={orden} onOrden={setOrden} />}
                  {isColumnVisible('edad') && <ColHeader campo="edad" label="Edad" ordenActual={orden} onOrden={setOrden} />}
                  {isColumnVisible('telefono') && <ColHeader campo="telefono" label="Teléfono" ordenActual={orden} onOrden={setOrden} />}
                  {isColumnVisible('departamento') && <ColHeader campo="departamento" label="Departamento" ordenActual={orden} onOrden={setOrden} />}
                  {isColumnVisible('producto') && <ColHeader campo="nombre_producto" label="Producto" ordenActual={orden} onOrden={setOrden} />}
                  {isColumnVisible('precio') && <ColHeader campo="precio" label="Precio" ordenActual={orden} onOrden={setOrden} />}
                  {isColumnVisible('fecha_baja') && <ColHeader campo="fecha_baja" label="Fecha de baja" ordenActual={orden} onOrden={setOrden} />}
                  {isColumnVisible('motivo_baja') && <ColHeader campo="motivo_baja" label="Motivo de baja" ordenActual={orden} onOrden={setOrden} />}
                  {isColumnVisible('lote') && <ColHeader campo="lote" label="Lote" ordenActual={orden} onOrden={setOrden} />}
                  {isColumnVisible('vendedor_asignado') && <ColHeader campo="vendedor" label="Vendedor asignado" ordenActual={orden} onOrden={setOrden} />}
                  {isColumnVisible('ultimo_estado') && <ColHeader campo="ultimo_estado" label="Último estado" ordenActual={orden} onOrden={setOrden} />}
                  {isColumnVisible('ultima_gestion') && <ColHeader campo="ultima_gestion_fecha" label="Última gestión" ordenActual={orden} onOrden={setOrden} />}
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((row) => {
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
      </section>

      {showAdvancedFilters && (
        <div
          role="dialog"
          aria-label="Filtros avanzados"
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            height: '100vh',
            width: '420px',
            background: '#fff',
            boxShadow: '-8px 0 24px rgba(15, 23, 42, 0.12)',
            zIndex: 80,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(148,163,184,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700 }}>Filtros avanzados</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Filtros por columnas
              </div>
            </div>
            <button className="close-btn" onClick={() => setShowAdvancedFilters(false)}><X size={16} /></button>
          </div>
          <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
            {filtersLoading ? (
              <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Cargando catÃ¡logos...
              </div>
            ) : null}
            {filtersError ? (
              <div style={{ marginBottom: 12, fontSize: 12, color: '#b91c1c' }}>
                {filtersError}
              </div>
            ) : null}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>GestiÃ³n</div>
              <label style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Fecha de baja</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    type="date"
                    value={advancedFiltersDraft.fecha_baja_desde}
                    onChange={(event) => updateAdvancedField('fecha_baja_desde', event.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    className="input"
                    type="date"
                    value={advancedFiltersDraft.fecha_baja_hasta}
                    onChange={(event) => updateAdvancedField('fecha_baja_hasta', event.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
                {filterErrors.fecha_baja ? (
                  <span style={{ fontSize: 12, color: '#b91c1c' }}>{filterErrors.fecha_baja}</span>
                ) : null}
              </label>
              <label style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Motivo de baja</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Todos los motivos</span>
                <select
                  className="input"
                  multiple
                  value={advancedFiltersDraft.motivo_baja}
                  onChange={(event) => handleMultiSelect(event, 'motivo_baja')}
                  style={{ minHeight: 86 }}
                  disabled={filtersLoading || !filterOptions.motivos.length}
                >
                  {!filtersLoading && !filterOptions.motivos.length ? (
                    <option value="" disabled>Sin opciones disponibles</option>
                  ) : null}
                  {filterOptions.motivos.map((motivo) => {
                    const value = motivo?.value || motivo?.label || motivo;
                    const label = motivo?.label || motivo?.value || motivo;
                    return <option key={value} value={value}>{label}</option>;
                  })}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Ãšltimo estado</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Todos los estados</span>
                <select
                  className="input"
                  multiple
                  value={advancedFiltersDraft.ultimo_estado}
                  onChange={(event) => handleMultiSelect(event, 'ultimo_estado')}
                  style={{ minHeight: 86 }}
                  disabled={filtersLoading || !ultimoEstadoOptions.length}
                >
                  {!filtersLoading && !ultimoEstadoOptions.length ? (
                    <option value="" disabled>Sin opciones disponibles</option>
                  ) : null}
                  {ultimoEstadoOptions.map((estado) => {
                    const value = estado?.value || estado?.label || estado;
                    const label = estado?.label || estado?.value || estado;
                    return <option key={value} value={value}>{label}</option>;
                  })}
                </select>
              </label>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Datos</div>
              <label style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Edad</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    type="number"
                    placeholder="Desde"
                    value={advancedFiltersDraft.edad_min}
                    onChange={(event) => updateAdvancedField('edad_min', event.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    className="input"
                    type="number"
                    placeholder="Hasta"
                    value={advancedFiltersDraft.edad_max}
                    onChange={(event) => updateAdvancedField('edad_max', event.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
                {filterErrors.edad ? (
                  <span style={{ fontSize: 12, color: '#b91c1c' }}>{filterErrors.edad}</span>
                ) : null}
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Departamento</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Todos los departamentos</span>
                <select
                  className="input"
                  multiple
                  value={advancedFiltersDraft.departamento}
                  onChange={(event) => handleMultiSelect(event, 'departamento')}
                  style={{ minHeight: 86 }}
                  disabled={filtersLoading || !filterOptions.departamentos.length}
                >
                  {!filtersLoading && !filterOptions.departamentos.length ? (
                    <option value="" disabled>Sin opciones disponibles</option>
                  ) : null}
                  {filterOptions.departamentos.map((depto) => {
                    const value = depto?.value || depto?.label || depto;
                    const label = depto?.label || depto?.value || depto;
                    return <option key={value} value={value}>{label}</option>;
                  })}
                </select>
              </label>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Producto</div>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Producto</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Todos los productos</span>
                <select
                  className="input"
                  multiple
                  value={advancedFiltersDraft.producto}
                  onChange={(event) => handleMultiSelect(event, 'producto')}
                  style={{ minHeight: 86 }}
                  disabled={filtersLoading || !filterOptions.productos.length}
                >
                  {!filtersLoading && !filterOptions.productos.length ? (
                    <option value="" disabled>Sin opciones disponibles</option>
                  ) : null}
                  {filterOptions.productos.map((producto) => {
                    const value = producto?.value || producto?.label || producto;
                    const label = producto?.label || producto?.value || producto;
                    return <option key={value} value={value}>{label}</option>;
                  })}
                </select>
              </label>
            </div>

            <div style={{ borderTop: '1px solid rgba(148,163,184,0.3)', paddingTop: 12, marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Guardar vista</div>
              <input
                className="input"
                placeholder="Nombre de la vista"
                value={saveViewName}
                onChange={(event) => setSaveViewName(event.target.value)}
                style={{ marginBottom: 8 }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 6 }}>
                <input type="checkbox" checked={saveViewFavorite} onChange={(event) => setSaveViewFavorite(event.target.checked)} />
                Favorita
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <input type="checkbox" checked={saveViewDefault} onChange={(event) => setSaveViewDefault(event.target.checked)} />
                Definir como vista por defecto
              </label>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <Button variant="secondary" onClick={handleSaveView}>Guardar vista actual</Button>
              </div>
            </div>
          </div>
          <div style={{ padding: 16, borderTop: '1px solid rgba(148,163,184,0.3)', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <Button variant="ghost" onClick={() => { setAdvancedFiltersDraft(advancedFiltersApplied); setFilterErrors({}); }}>
              Cancelar
            </Button>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" onClick={clearAdvancedFilters}>Limpiar</Button>
              <Button onClick={applyAdvancedFilters}>Aplicar filtros</Button>
            </div>
          </div>
        </div>
      )}

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
                Subí un CSV con las columnas: Documento, Motivo de la baja, Ultimo estado.
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







