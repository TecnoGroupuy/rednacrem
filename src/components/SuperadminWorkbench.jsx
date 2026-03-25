
import React from 'react';
import { Search, Filter, Upload, Plus, CheckCircle2, X, Edit3, Activity, Phone, PhoneCall, Download, Eye, Trash2 } from 'lucide-react';
import ContactDetailModal from './ContactDetailModal.jsx';
import { listImports, previewCsvText, createImportFromCsv, deleteImportById, IMPORT_TYPES } from '../services/importsService.js';
import { listNoCallEntries, listPhoneResultEntries, getNoCallStats, listDatosParaTrabajar } from '../services/leadsService.js';
import { listProductsAsync, createProduct, updateProduct } from '../services/productsService.js';
import { listUsersAsync, createUser, updateUser } from '../services/usersService.js';
import { listRecentActivity, listActivityLog, logActivityEvent } from '../services/activityService.js';
import { IMPORT_SAMPLE_CSV, NO_LLAMAR_SAMPLE_CSV, RESULTADOS_SAMPLE_CSV, DATOS_TRABAJAR_SAMPLE_CSV, downloadCsvFile, formatFileSize } from '../utils/importWizardHelpers.js';

const USER_ROLE_OPTIONS = ['superadministrador', 'director', 'supervisor', 'operaciones', 'atencion_cliente'];
const USER_STATUS_OPTIONS = [
  { value: 'approved', label: 'Aprobado' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'blocked', label: 'Bloqueado' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'rejected', label: 'Rechazado' }
];
const DEFAULT_USER_ROLE = 'supervisor';
const DEFAULT_USER_STATUS = 'approved';
const DEFAULT_USER_REASON = 'Alta manual desde panel superadmin';

const createImportDraft = () => ({
  fileName: '',
  csvText: '',
  importType: 'clientes',
  fileSize: 0,
  fileType: ''
});

const createUserDraft = (overrides = {}) => ({
  id: '',
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  role: DEFAULT_USER_ROLE,
  status: DEFAULT_USER_STATUS,
  reason: DEFAULT_USER_REASON,
  ...overrides
});

export default function SuperadminWorkbench({
  route,
  onOpenRoute,
  logoUrl,
  onSaveLogo,
  roleMeta,
  roleNav,
  moduleStates,
  estadoModuloOptions,
  onChangeModuleState,
  Button,
  Panel,
  Tag,
  MetricCard
}) {
  const [imports, setImports] = React.useState([]);
  const [importsPage, setImportsPage] = React.useState(1);
  const [importsType, setImportsType] = React.useState('todos');
  const [importsSearch, setImportsSearch] = React.useState('');
  const [importsMeta, setImportsMeta] = React.useState({ page: 1, totalPages: 1, total: 0, pageSize: 8 });
  const [importsLoading, setImportsLoading] = React.useState(false);
  const [importsError, setImportsError] = React.useState('');
  const [importSuccess, setImportSuccess] = React.useState('');
  const [importDeleteTarget, setImportDeleteTarget] = React.useState(null);
  const [importDeleteLoading, setImportDeleteLoading] = React.useState(false);
  const [importDeleteToast, setImportDeleteToast] = React.useState('');
  const importDeleteToastRef = React.useRef(null);

  const [products, setProducts] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [noCallRows, setNoCallRows] = React.useState([]);
  const [noCallStats, setNoCallStats] = React.useState({ total: 0, celulares: 0, montevideo: 0, interior: 0 });
  const [noCallSearch, setNoCallSearch] = React.useState('');
  const [noCallFuente, setNoCallFuente] = React.useState('todos');
  const [noCallDepartamento, setNoCallDepartamento] = React.useState('');
  const [noCallLocalidad, setNoCallLocalidad] = React.useState('');
  const [noCallPage, setNoCallPage] = React.useState(1);
  const [noCallPageSize, setNoCallPageSize] = React.useState(20);
  const [noCallMeta, setNoCallMeta] = React.useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [noCallLoading, setNoCallLoading] = React.useState(false);
  const [noCallError, setNoCallError] = React.useState('');
  const [workDataRows, setWorkDataRows] = React.useState([]);
  const [workDataLoading, setWorkDataLoading] = React.useState(false);
  const [workDataError, setWorkDataError] = React.useState('');
  const [workDataSearch, setWorkDataSearch] = React.useState('');
  const [workDataSelected, setWorkDataSelected] = React.useState(null);
  const [workDataPage, setWorkDataPage] = React.useState(1);
  const [workDataPageSize, setWorkDataPageSize] = React.useState(10);
  const [workDataMeta, setWorkDataMeta] = React.useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [workDataTab, setWorkDataTab] = React.useState('nuevo');
  const [workDataDepto, setWorkDataDepto] = React.useState('todos');
  const [workDataOrigen, setWorkDataOrigen] = React.useState('todos');
  const [phoneResultsRows, setPhoneResultsRows] = React.useState([]);
  const [activityRows, setActivityRows] = React.useState([]);

  const [showImportFlow, setShowImportFlow] = React.useState(false);
  const [importDraft, setImportDraft] = React.useState(createImportDraft());
  const [preview, setPreview] = React.useState(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState('');
  const [importSubmitting, setImportSubmitting] = React.useState(false);
  const fileInputRef = React.useRef(null);
  const [dragActive, setDragActive] = React.useState(false);

  const [productDraft, setProductDraft] = React.useState({ id: '', nombre: '', categoria: '', precio: '', descripcion: '', observaciones: '', activo: true });
  const [userDraft, setUserDraft] = React.useState(() => createUserDraft());
  const [showUserForm, setShowUserForm] = React.useState(false);
  const [userFormError, setUserFormError] = React.useState('');
  const [userFormSuccess, setUserFormSuccess] = React.useState('');
  const [userFormLoading, setUserFormLoading] = React.useState(false);

  const [logoDraft, setLogoDraft] = React.useState(logoUrl || '');
  const [logoError, setLogoError] = React.useState('');
  const [logoSaved, setLogoSaved] = React.useState('');
  const [moduleRoleFilter, setModuleRoleFilter] = React.useState(() => Object.keys(roleMeta).find((key) => key !== 'superadministrador') || 'superadministrador');

  const resetImportFlow = React.useCallback(() => {
    setImportDraft(createImportDraft());
    setDragActive(false);
    setPreview(null);
    setPreviewError('');
    setPreviewLoading(false);
  }, []);

  const showImportDeleteToast = React.useCallback((message) => {
    setImportDeleteToast(message);
    if (importDeleteToastRef.current) {
      clearTimeout(importDeleteToastRef.current);
    }
    importDeleteToastRef.current = setTimeout(() => {
      setImportDeleteToast('');
    }, 4200);
  }, []);

  React.useEffect(() => () => {
    if (importDeleteToastRef.current) {
      clearTimeout(importDeleteToastRef.current);
      importDeleteToastRef.current = null;
    }
  }, []);

  const resolveImportId = React.useCallback((row = {}) => (
    row.id || row.batchId || row.batch_id || row.jobId || row.job_id || null
  ), []);

  const resolveImportTypeKey = React.useCallback((row = {}) => {
    const rawType = row.importType || row.tipo || row.import_type || row.tipoImportacion || row.tipo_key || '';
    const normalized = String(rawType || '').toLowerCase();
    if (IMPORT_TYPES[normalized]) return normalized;
    if (normalized.includes('no') && normalized.includes('llamar')) return 'no_llamar';
    if (normalized.includes('dato') && normalized.includes('trabajar')) return 'datos_para_trabajar';
    if (normalized.includes('result')) return 'resultados';
    if (normalized.includes('cliente')) return 'clientes';
    const label = row.importTypeLabel || row.tipoLabel || row.tipo_label || '';
    const normalizedLabel = String(label || '').toLowerCase();
    if (normalizedLabel.includes('no llamar')) return 'no_llamar';
    if (normalizedLabel.includes('datos')) return 'datos_para_trabajar';
    if (normalizedLabel.includes('result')) return 'resultados';
    if (normalizedLabel.includes('cliente')) return 'clientes';
    return '';
  }, []);

  const resolveImportStatusLabel = React.useCallback((row = {}) => (
    row.estado || row.statusLabel || row.status || row.estadoLabel || ''
  ), []);

  const canDeleteImport = React.useCallback((row = {}) => {
    const id = resolveImportId(row);
    if (!id) return false;
    const statusLabel = String(resolveImportStatusLabel(row) || '').toLowerCase();
    const allowedStatuses = ['validada', 'con observaciones', 'completada', 'fallida'];
    if (!allowedStatuses.includes(statusLabel)) return false;
    if (statusLabel === 'en proceso' || statusLabel === 'en cola') return false;
    const typeKey = resolveImportTypeKey(row);
    return ['clientes', 'datos_para_trabajar', 'no_llamar'].includes(typeKey);
  }, [resolveImportId, resolveImportStatusLabel, resolveImportTypeKey]);

  const openImportDeleteModal = React.useCallback((row) => {
    if (!row) return;
    const id = resolveImportId(row);
    const typeKey = resolveImportTypeKey(row);
    setImportDeleteTarget({ row, id, typeKey });
  }, [resolveImportId, resolveImportTypeKey]);

  const closeImportDeleteModal = React.useCallback(() => {
    if (importDeleteLoading) return;
    setImportDeleteTarget(null);
  }, [importDeleteLoading]);

  const confirmImportDelete = React.useCallback(async () => {
    if (!importDeleteTarget?.id || !importDeleteTarget?.typeKey) {
      closeImportDeleteModal();
      return;
    }
    setImportDeleteLoading(true);
    try {
      const result = await deleteImportById({ id: importDeleteTarget.id, importType: importDeleteTarget.typeKey });
      if (result?.ok) {
        setImports((prev) => prev.filter((item) => String(resolveImportId(item)) !== String(importDeleteTarget.id)));
        setImportsMeta((prev) => ({
          ...prev,
          total: Math.max(0, Number(prev.total || 0) - 1)
        }));
        setImportDeleteTarget(null);
      }
    } catch (error) {
      showImportDeleteToast(error?.message || 'No se pudo eliminar la importación.');
    } finally {
      setImportDeleteLoading(false);
    }
  }, [importDeleteTarget, resolveImportId, closeImportDeleteModal, showImportDeleteToast]);

  const downloadImportExampleCsv = React.useCallback(() => {
    const activeType = showImportFlow
      ? importDraft.importType
      : (importsType && importsType !== 'todos' ? importsType : 'clientes');
    if (activeType === 'no_llamar') {
      downloadCsvFile(NO_LLAMAR_SAMPLE_CSV, 'importacion-no-llamar-ejemplo.csv');
      return;
    }
    if (activeType === 'resultados') {
      downloadCsvFile(RESULTADOS_SAMPLE_CSV, 'importacion-resultados-ejemplo.csv');
      return;
    }
    if (activeType === 'datos_para_trabajar') {
      downloadCsvFile(DATOS_TRABAJAR_SAMPLE_CSV, 'importacion-datos-para-trabajar-ejemplo.csv');
      return;
    }
    downloadCsvFile(IMPORT_SAMPLE_CSV, 'importacion-clientes-ejemplo.csv');
  }, [showImportFlow, importDraft.importType, importsType]);

  const loadImports = React.useCallback(async () => {
    setImportsLoading(true);
    setImportsError('');
    try {
      const result = await listImports({ page: importsPage, pageSize: 8, search: importsSearch, importType: importsType });
      setImports(result.items);
      setImportsMeta({ page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages });
    } catch (err) {
      setImportsError(err.message || 'No se pudo cargar el historial de importaciones.');
    } finally {
      setImportsLoading(false);
    }
  }, [importsPage, importsSearch, importsType]);

  const loadProducts = React.useCallback(async () => setProducts(await listProductsAsync()), []);
  const loadUsers = React.useCallback(async () => setUsers(await listUsersAsync()), []);
  const loadSpecialBases = React.useCallback(async () => {
    const [noCall, results, stats] = await Promise.all([
      listNoCallEntries({ page: 1, pageSize: 20, search: '' }),
      listPhoneResultEntries(),
      getNoCallStats()
    ]);
    setNoCallRows(noCall?.items || []);
    setNoCallMeta({
      page: noCall?.page || 1,
      pageSize: noCall?.pageSize || 20,
      total: noCall?.total || 0,
      totalPages: noCall?.totalPages || 1
    });
    setNoCallStats(stats || { total: 0, celulares: 0, montevideo: 0, interior: 0 });
    setPhoneResultsRows(results);
  }, []);
  const loadActivity = React.useCallback(() => setActivityRows(listActivityLog()), []);

  const loadWorkData = React.useCallback(async () => {
    setWorkDataLoading(true);
    setWorkDataError('');
    try {
      const result = await listDatosParaTrabajar({
        page: workDataPage,
        pageSize: workDataPageSize,
        search: workDataSearch,
        estado: workDataTab,
        departamento: workDataDepto === 'todos' ? '' : workDataDepto,
        origen_dato: workDataOrigen === 'todos' ? '' : workDataOrigen
      });
      const rows = result?.items || [];
      setWorkDataRows(Array.isArray(rows) ? rows : []);
      setWorkDataMeta({
        page: result?.page || workDataPage,
        pageSize: result?.pageSize || workDataPageSize,
        total: result?.total || 0,
        totalPages: result?.totalPages || 1
      });
    } catch (err) {
      setWorkDataError(err?.message || 'No se pudo cargar la base de trabajo.');
      setWorkDataRows([]);
    } finally {
      setWorkDataLoading(false);
    }
  }, [workDataPage, workDataPageSize, workDataSearch, workDataTab, workDataDepto, workDataOrigen]);

  const noCallStatsDisplay = React.useMemo(() => {
    const normalized = noCallRows.map((item) => String(item.numero || item.telefono || '').replace(/\D/g, ''));
    const fallbackTotal = noCallMeta.total || normalized.length;
    const fallbackCelulares = normalized.filter((value) => value.startsWith('09')).length;
    const fallbackMontevideo = normalized.filter((value) => value.startsWith('2')).length;
    const fallbackInterior = normalized.filter((value) => value.startsWith('4')).length;
    return {
      total: Number(noCallStats.total || 0) || fallbackTotal,
      celulares: Number(noCallStats.celulares || 0) || fallbackCelulares,
      montevideo: Number(noCallStats.montevideo || 0) || fallbackMontevideo,
      interior: Number(noCallStats.interior || 0) || fallbackInterior
    };
  }, [noCallRows, noCallMeta.total, noCallStats]);

  const filteredNoCallRows = React.useMemo(() => {
    const term = String(noCallSearch || '').trim().toLowerCase();
    if (!term) return noCallRows;
    return noCallRows.filter((item) => {
      const values = [
        item.numero,
        item.telefono,
        item.documento,
        item.nombre,
        item.fuente,
        item.origen,
        item.departamento,
        item.localidad
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return values.some((value) => value.includes(term));
    });
  }, [noCallRows, noCallSearch]);

  const filteredWorkDataRows = React.useMemo(() => workDataRows, [workDataRows]);
  const workDataDeptOptions = React.useMemo(() => {
    const values = workDataRows
      .map((item) => String(item.departamento || '').trim())
      .filter(Boolean);
    return ['todos', ...new Set(values)];
  }, [workDataRows]);

  const workDataOrigenOptions = React.useMemo(() => {
    const values = workDataRows
      .map((item) => String(item.origen_dato || '').trim())
      .filter(Boolean);
    return ['todos', ...new Set(values)];
  }, [workDataRows]);

  const splitFullName = (value) => {
    const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
    return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
  };

  const buildSafeToggleUserFields = (item) => {
    const { firstName, lastName } = splitFullName(item.nombre);
    const apellidoSeguro = String(item.apellido || lastName || '').trim();
    const nombreSeguro = String(item.nombrePropio || firstName || item.nombre || '').trim();

    return {
      nombre: nombreSeguro,
      apellido: apellidoSeguro,
      canToggle: Boolean(nombreSeguro && apellidoSeguro),
    };
  };

  React.useEffect(() => {
    if (!route.startsWith('sa_') && route !== 'dashboard_global') return;
    Promise.all([loadProducts(), loadUsers(), loadSpecialBases()]).catch(() => {});
    loadActivity();
  }, [route, loadProducts, loadUsers, loadSpecialBases, loadActivity]);

  const loadNoCall = React.useCallback(async () => {
    setNoCallLoading(true);
    setNoCallError('');
    try {
      const result = await listNoCallEntries({
        page: noCallPage,
        pageSize: noCallPageSize,
        search: noCallSearch,
        fuente: noCallFuente === 'todos' ? '' : noCallFuente,
        departamento: noCallDepartamento,
        localidad: noCallLocalidad
      });
      setNoCallRows(result?.items || []);
      setNoCallMeta({
        page: result?.page || noCallPage,
        pageSize: result?.pageSize || noCallPageSize,
        total: result?.total || 0,
        totalPages: result?.totalPages || 1
      });
    } catch (err) {
      setNoCallError(err?.message || 'No se pudo cargar Base No llamar.');
    } finally {
      setNoCallLoading(false);
    }
  }, [noCallPage, noCallPageSize, noCallSearch, noCallFuente, noCallDepartamento, noCallLocalidad]);

  React.useEffect(() => {
    if (route !== 'sa_no_llamar') return;
    loadNoCall();
    getNoCallStats().then((stats) => setNoCallStats(stats || { total: 0, celulares: 0, montevideo: 0, interior: 0 })).catch(() => {});
  }, [route, loadNoCall]);

  React.useEffect(() => {
    if (!['sa_importaciones', 'dashboard_global'].includes(route)) return;
    loadImports();
  }, [route, loadImports]);

  React.useEffect(() => {
    if (route !== 'sa_datos_trabajar') return;
    setWorkDataPage(1);
  }, [route, workDataTab]);

  React.useEffect(() => {
    if (route !== 'sa_datos_trabajar') return;
    loadWorkData();
  }, [route, workDataTab, loadWorkData]);

  React.useEffect(() => {
    if (route !== 'sa_datos_trabajar') return;
    setWorkDataPage(1);
    loadWorkData();
  }, [route, workDataDepto, workDataOrigen, loadWorkData]);

  React.useEffect(() => setLogoDraft(logoUrl || ''), [logoUrl]);

  const formatDate = (value) => value ? new Date(value).toLocaleString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
  const daysWithoutAccess = (value) => !value ? '-' : String(Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000)));
  const estimateUsageHours = (seed) => {
    const base = (String(seed || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 5) + 2;
    return { day: base, month: base * 20, year: base * 240 };
  };
  const processCsvFile = async (file) => {
    try {
      const csvText = await file.text();
      setImportDraft((prev) => ({
        ...prev,
        fileName: file.name,
        csvText,
        fileSize: file.size || 0,
        fileType: file.type || 'text/csv'
      }));
      setPreview(null);
      setPreviewError('');
    } catch {
      setPreviewError('No se pudo leer el archivo seleccionado.');
    } finally {
      setDragActive(false);
    }
  };

  const handleCsvFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processCsvFile(file);
    event.target.value = '';
  };

  const handleDropFile = async (event) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      await processCsvFile(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const validatePreview = async () => {
    setPreviewError('');
    setPreview(null);
    setPreviewLoading(true);
    try {
      setPreview(await previewCsvText(importDraft.csvText, { importType: importDraft.importType }));
    } catch (err) {
      setPreviewError(err.message || 'Error validando el CSV.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmImport = async () => {
    if (importSubmitting) return;
    setImportSubmitting(true);
    setPreviewError('');
    try {
      const created = await createImportFromCsv({ fileName: importDraft.fileName, csvText: importDraft.csvText, userId: 'usr-001', importType: importDraft.importType });
      logActivityEvent({ entidad: 'importacion', entidadId: created.id, tipo: 'csv', descripcion: 'Importación ' + created.tipoLabel + ' (' + created.archivo + ')', usuarioId: 'usr-001' });
      setImportSuccess('Importación registrada correctamente.');
      setShowImportFlow(false);
      resetImportFlow();
      setImportsPage(1);
      await Promise.all([loadImports(), loadSpecialBases()]);
      loadActivity();
    } catch (err) {
      setPreviewError(err.message || 'No se pudo completar la importación.');
    } finally {
      setImportSubmitting(false);
    }
  };

  const saveProduct = async () => {
    if (!productDraft.nombre.trim()) return;
    const payload = {
      nombre: productDraft.nombre.trim(),
      categoria: productDraft.categoria.trim() || 'General',
      precio: Number(productDraft.precio || 0),
      descripcion: productDraft.descripcion.trim(),
      observaciones: productDraft.observaciones.trim(),
      activo: !!productDraft.activo
    };
    if (productDraft.id) {
      const updated = await updateProduct(productDraft.id, payload);
      logActivityEvent({ entidad: 'producto', entidadId: updated.id, tipo: 'edicion', descripcion: 'Producto actualizado: ' + updated.nombre, usuarioId: 'usr-001' });
    } else {
      const created = await createProduct(payload);
      logActivityEvent({ entidad: 'producto', entidadId: created.id, tipo: 'alta', descripcion: 'Producto creado: ' + created.nombre, usuarioId: 'usr-001' });
    }
    setProductDraft({ id: '', nombre: '', categoria: '', precio: '', descripcion: '', observaciones: '', activo: true });
    await loadProducts();
    loadActivity();
  };

  const saveUser = async () => {
    const nombre = userDraft.nombre.trim();
    const apellido = userDraft.apellido.trim();
    const email = userDraft.email.trim();
    const telefono = userDraft.telefono.trim();
    const role = userDraft.role;
    const status = userDraft.status;
    const reasonValue = userDraft.reason.trim();

    if (!nombre || !apellido || !email || !telefono) {
      setUserFormError('Nombre, apellido, email y teléfono son obligatorios.');
      return;
    }

    if (role === 'vendedor') {
      setUserFormError('Los usuarios vendedor deben registrarse por solicitud y ser aprobados por supervisor.');
      return;
    }

    setUserFormError('');
    setUserFormSuccess('');
    setUserFormLoading(true);
    const payload = {
      nombre,
      apellido,
      email,
      telefono,
      role,
      status,
      reason: reasonValue || DEFAULT_USER_REASON
    };

    try {
      if (userDraft.id) {
        const updated = await updateUser(userDraft.id, payload);
        logActivityEvent({ entidad: 'usuario', entidadId: updated.id, tipo: 'edicion', descripcion: 'Usuario actualizado: ' + updated.nombre, usuarioId: 'usr-001' });
        setUserFormSuccess('Usuario actualizado correctamente.');
      } else {
        const created = await createUser(payload);
        logActivityEvent({ entidad: 'usuario', entidadId: created.id, tipo: 'alta', descripcion: 'Usuario creado: ' + created.nombre, usuarioId: 'usr-001' });
        setUserFormSuccess('Usuario creado correctamente.');
      }
      setUserDraft(createUserDraft());
      await loadUsers();
      loadActivity();
    } catch (err) {
      const backendMessage =
        err?.details?.error?.message ||
        err?.details?.message ||
        err?.message ||
        'No se pudo crear el usuario.';
      setUserFormError(backendMessage);
    } finally {
      setUserFormLoading(false);
    }
  };

  const onLogoFile = async (event) => {
    setLogoError('');
    setLogoSaved('');
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoError('Selecciona una imagen válida.');
      return;
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.readAsDataURL(file);
    });
    setLogoDraft(dataUrl);
  };

  const saveLogo = () => {
    onSaveLogo(logoDraft || '');
    setLogoSaved('Logo guardado correctamente.');
    logActivityEvent({ entidad: 'sistema', tipo: 'branding', descripcion: 'Identidad visual actualizada', usuarioId: 'usr-001' });
    loadActivity();
  };

  const activeUsers = users.filter((item) => item.activo).length;
  const usersInactive7d = users.filter((item) => Number(daysWithoutAccess(item.ultimoAcceso)) >= 7);
  const usageTotals = users.reduce((acc, item) => {
    const usage = estimateUsageHours(item.id);
    return { day: acc.day + usage.day, month: acc.month + usage.month, year: acc.year + usage.year };
  }, { day: 0, month: 0, year: 0 });

  const globalMetrics = [
    { title: 'Ventas del día', value: '26', change: 8.1, label: 'últimas 24h', trend: 'up', icon: Activity, bg: 'rgba(22,163,74,0.12)', color: '#15803d' },
    { title: 'Tickets abiertos', value: '17', change: -4.0, label: 'mesa de ayuda', trend: 'up', icon: Activity, bg: 'rgba(37,99,235,0.12)', color: '#2563eb' },
    { title: 'Solicitudes en curso', value: '12', change: 2.2, label: 'operaciones', trend: 'up', icon: Activity, bg: 'rgba(217,119,6,0.12)', color: '#d97706' },
    { title: 'Lotes activos', value: '6', change: 0.0, label: 'supervisión', trend: 'up', icon: Activity, bg: 'rgba(20,34,53,0.12)', color: '#1f2937' },
    { title: 'Usuarios activos', value: String(activeUsers), change: 4.4, label: 'actividad reciente', trend: 'up', icon: Activity, bg: 'rgba(15,118,110,0.12)', color: '#0f766e' },
    { title: 'Importaciones hoy', value: String(imports.slice(0, 4).length), change: 0, label: 'últimos archivos', trend: 'up', icon: Activity, bg: 'rgba(124,58,237,0.12)', color: '#7c3aed' }
  ];

  const moduleRows = React.useMemo(() => {
    const map = new Map();
    roleNav.forEach((item) => {
      if (!item.roles.includes(moduleRoleFilter)) return;
      if (!map.has(item.path)) {
        map.set(item.path, { path: item.path, label: item.label, caption: item.caption });
      }
    });
    return [...map.values()];
  }, [roleNav, moduleRoleFilter]);
  if (route === 'sa_importaciones') {
    return (
      <div className="view">
        <section className="content-grid">
          <Panel
            className="span-12"
            title="Importaciones"
            subtitle="Carga masiva por tipo (clientes, No llamar, resultados)"
            action={
              <div className="toolbar" style={{ gap: 8 }}>
                <Button variant="ghost" icon={<Download size={16} />} onClick={downloadImportExampleCsv}>
                  Descargar ejemplo CSV
                </Button>
                <Button icon={<Upload size={16} />} onClick={() => { setShowImportFlow(true); setImportSuccess(''); resetImportFlow(); }}>
                  Importar CSV
                </Button>
              </div>
            }
          >
            {importDeleteToast ? (
              <div style={{
                position: 'fixed',
                right: 24,
                bottom: 24,
                zIndex: 40,
                background: '#fee2e2',
                color: '#b91c1c',
                border: '1px solid rgba(239,68,68,0.4)',
                padding: '12px 16px',
                borderRadius: 12,
                boxShadow: '0 12px 28px rgba(15,23,42,0.12)',
                fontWeight: 600
              }}>
                {importDeleteToast}
              </div>
            ) : null}
            <div className="toolbar" style={{ marginBottom: 12 }}>
              <div className="searchbox" style={{ maxWidth: 320 }}>
                <Search size={18} color="#69788d" />
                <input
                  value={importsSearch}
                  onChange={(event) => { setImportsPage(1); setImportsSearch(event.target.value); }}
                  placeholder="Buscar por archivo..."
                />
              </div>
              <select
                className="input"
                style={{ width: 250 }}
                value={importsType}
                onChange={(event) => { setImportsPage(1); setImportsType(event.target.value); }}
              >
                <option value="todos">Todos los tipos</option>
                {Object.values(IMPORT_TYPES).map((item) => (
                  <option key={item.key} value={item.key}>{item.label}</option>
                ))}
              </select>
              <Button variant="secondary" icon={<Filter size={16} />} onClick={loadImports}>Aplicar</Button>
              {importSuccess ? <span className="pill" style={{ color: '#15803d' }}>{importSuccess}</span> : null}
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Archivo</th><th>Tipo</th><th>Fecha</th><th>Total</th><th>Importados</th><th>Rechazados</th><th>Estado</th><th>Usuario</th><th>Acciones</th></tr></thead>
                <tbody>{imports.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.archivo}</strong></td>
                    <td>{row.tipoLabel}</td>
                    <td>{row.fecha}</td>
                    <td>{row.total}</td>
                    <td>{row.importados}</td>
                    <td>{row.rechazados}</td>
                    <td><Tag variant={row.estado === 'Completada' ? 'success' : row.estado === 'Fallida' ? 'danger' : 'warning'}>{row.estado}</Tag></td>
                    <td>{row.usuario}</td>
                    <td style={{ textAlign: 'right' }}>
                      {canDeleteImport(row) ? (
                        <button
                          type="button"
                          onClick={() => openImportDeleteModal(row)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: 999,
                            border: '1px solid rgba(248,113,113,0.4)',
                            background: 'rgba(248,113,113,0.15)',
                            color: '#b91c1c',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
              {importsLoading ? <div style={{ padding: 16, color: 'var(--muted)' }}>Cargando historial...</div> : null}
              {importsError ? <div style={{ padding: 16, color: '#be123c', fontWeight: 700 }}>{importsError}</div> : null}
            </div>
            <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 12 }}>
              <span className="pill">Página {importsMeta.page} de {importsMeta.totalPages} · {importsMeta.total} registros</span>
              <div className="toolbar">
                <Button variant="ghost" onClick={() => setImportsPage((p) => Math.max(1, p - 1))} disabled={importsMeta.page <= 1}>Anterior</Button>
                <Button variant="ghost" onClick={() => setImportsPage((p) => Math.min(importsMeta.totalPages, p + 1))} disabled={importsMeta.page >= importsMeta.totalPages}>Siguiente</Button>
              </div>
            </div>
            {showImportFlow ? (
              <div className="lot-wizard-overlay" onClick={() => setShowImportFlow(false)}>
                <div className="lot-wizard" onClick={(event) => event.stopPropagation()}>
                  <div className="lot-wizard-header">
                    <div>
                      <h3>Importar CSV</h3>
                      <p>Subida, preview y confirmación.</p>
                    </div>
                    <button className="icon-button" style={{ width: 36, height: 36 }} onClick={() => setShowImportFlow(false)}><X size={16} color="#152235" /></button>
                  </div>
                  <div className="import-wizard">
                    <div className="import-step import-step--active">
                      <div className="import-step-header">
                        <span className="import-step-badge import-step-badge--completed">1</span>
                        <div>
                          <strong>Tipo de importación</strong>
                          <p className="import-step-subtitle">Elige la carga que vas a realizar</p>
                        </div>
                      </div>
                      <select
                        className="input"
                        value={importDraft.importType}
                        onChange={(event) => setImportDraft((prev) => ({ ...prev, importType: event.target.value }))}
                      >
                        {Object.values(IMPORT_TYPES).map((item) => (
                          <option key={item.key} value={item.key}>{item.label}</option>
                        ))}
                      </select>
                      <p className="import-step-note">{IMPORT_TYPES[importDraft.importType]?.label}</p>
                    </div>
                    <div className="step-connector" aria-hidden="true"><span>▶</span></div>
                    <div className={`import-step ${importDraft.csvText ? 'import-step--active' : 'import-step--pending'}`}>
                      <div className="import-step-header">
                        <span className="import-step-badge import-step-badge--pending">2</span>
                        <div>
                          <strong>Archivo</strong>
                          <p className="import-step-subtitle">Arrastra o selecciona el CSV</p>
                        </div>
                      </div>
                      <div
                        className={`import-dropzone ${dragActive ? 'active' : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDropFile}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        tabIndex={0}
                        role="button"
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            fileInputRef.current?.click();
                          }
                        }}
                      >
                        <div className="import-dropzone-content">
                          <strong>{importDraft.fileName || 'Sin archivo seleccionado'}</strong>
                          <span>{importDraft.fileName ? formatFileSize(importDraft.fileSize) : 'CSV · máximo 10 MB'}</span>
                        </div>
                        <input ref={fileInputRef} type="file" accept=".csv" className="import-file-input" onChange={handleCsvFile} />
                      </div>
                    </div>
                    {
                      importDraft.csvText && (
                        <>
                          <div className="step-connector" aria-hidden="true"><span>▶</span></div>
                          <div className={`import-step validation-step ${preview ? 'validation-step--success' : previewError ? 'validation-step--error' : 'validation-step--pending'}`}>
                            <div className="import-step-header">
                              <span className="import-step-badge">3</span>
                              <div>
                                <strong>Validación</strong>
                                <p className="import-step-subtitle">
                                  {preview ? 'Listo para confirmar' : previewError ? 'Corrige los errores' : 'Revisa tu archivo antes de continuar'}
                                </p>
                              </div>
                            </div>
                            <div className="import-step-body">
                              <Button variant="secondary" onClick={validatePreview} disabled={!importDraft.csvText || previewLoading}>
                                {previewLoading ? 'Validando...' : preview ? 'Revalidar archivo' : 'Validar archivo'}
                              </Button>
                              <p className="import-step-note">Se verifican las columnas obligatorias y formato.</p>
                              {preview ? (
                                <div className="validation-summary">
                                  <div className="validation-summary-row">
                                    <span>Total</span>
                                    <strong>{preview.summary.total}</strong>
                                  </div>
                                  <div className="validation-summary-row">
                                    <span>Importables</span>
                                    <strong>{preview.summary.importados}</strong>
                                  </div>
                                  <div className="validation-summary-row">
                                    <span>Rechazados</span>
                                    <strong>{preview.summary.rechazados}</strong>
                                  </div>
                                </div>
                              ) : null}
                              {preview?.rowErrors?.length ? (
                                <div className="validation-errors">
                                  {preview.rowErrors.slice(0, 3).map((err) => (
                                    <div key={err.rowNumber} className="validation-error-row">
                                      <strong>Fila {err.rowNumber}</strong>
                                      <span>{err.errors.join(', ')}</span>
                                    </div>
                                  ))}
                                  {preview.rowErrors.length > 3 ? (
                                    <span className="validation-error-more">+{preview.rowErrors.length - 3} más errores</span>
                                  ) : null}
                                </div>
                              ) : null}
                              {previewError ? <div className="import-error-bar">{previewError}</div> : null}
                            </div>
                          </div>
                        </>
                      )
                    }
                  </div>
                  <div className="wizard-actions" style={{ justifyContent: 'flex-end' }}>
                    <Button variant="ghost" onClick={() => setShowImportFlow(false)}>Cancelar</Button>
                    <Button
                      icon={<CheckCircle2 size={16} />}
                      onClick={confirmImport}
                      disabled={!preview || !importDraft.fileName || importSubmitting}
                    >
                      {importSubmitting ? 'Importando...' : 'Confirmar importación'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
            {importDeleteTarget ? (
              <div className="lot-wizard-overlay" onClick={closeImportDeleteModal}>
                <div className="lot-wizard" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 420 }}>
                  <div className="lot-wizard-header">
                    <div>
                      <h3>¿Eliminar importación?</h3>
                      <p>Esta acción no se puede deshacer.</p>
                    </div>
                    <button className="icon-button" style={{ width: 36, height: 36 }} onClick={closeImportDeleteModal}><X size={16} color="#152235" /></button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                    <Button variant="secondary" onClick={closeImportDeleteModal} disabled={importDeleteLoading}>Cancelar</Button>
                    <Button
                      onClick={confirmImportDelete}
                      disabled={importDeleteLoading}
                      style={{
                        background: '#ef4444',
                        border: 'none',
                        color: '#fff'
                      }}
                    >
                      {importDeleteLoading ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </Panel>
        </section>
      </div>
    );
  }

  if (route === 'sa_no_llamar') {
    return (
      <div className="view">
        <section className="content-grid">
          <Panel className="span-12" title="Base No llamar" subtitle="Contactos bloqueados">
            <div className="mini-stats" style={{ marginBottom: 16 }}>
              <div className="mini-stat"><span>Teléfonos registrados</span><strong>{noCallStatsDisplay.total}</strong></div>
              <div className="mini-stat"><span>Registros en Montevideo</span><strong>{noCallStatsDisplay.montevideo}</strong></div>
              <div className="mini-stat"><span>Registros en interior</span><strong>{noCallStatsDisplay.interior}</strong></div>
              <div className="mini-stat"><span>Registros de celulares</span><strong>{noCallStatsDisplay.celulares}</strong></div>
            </div>
            <div className="toolbar" style={{ marginBottom: 12 }}>
              <div className="searchbox" style={{ maxWidth: 360 }}>
                <Search size={18} color="#69788d" />
                <input
                  value={noCallSearch}
                  onChange={(event) => { setNoCallPage(1); setNoCallSearch(event.target.value); }}
                  placeholder="Buscar por teléfono, documento o nombre..."
                />
              </div>
              <select
                className="input"
                style={{ width: 160 }}
                value={noCallFuente}
                onChange={(event) => { setNoCallPage(1); setNoCallFuente(event.target.value); }}
              >
                <option value="todos">Todos los tipos</option>
                <option value="celular">Celular</option>
                <option value="tel_fijo">Tel fijo</option>
              </select>
              <input
                className="input"
                style={{ width: 180 }}
                value={noCallDepartamento}
                onChange={(event) => { setNoCallPage(1); setNoCallDepartamento(event.target.value); }}
                placeholder="Departamento"
              />
              <input
                className="input"
                style={{ width: 180 }}
                value={noCallLocalidad}
                onChange={(event) => { setNoCallPage(1); setNoCallLocalidad(event.target.value); }}
                placeholder="Localidad"
              />
              <select
                className="input"
                style={{ width: 140 }}
                value={noCallPageSize}
                onChange={(event) => { setNoCallPage(1); setNoCallPageSize(Number(event.target.value)); }}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <Button variant="secondary" icon={<Filter size={16} />} onClick={loadNoCall}>Aplicar</Button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Fecha de carga</th><th>Número</th><th>Tipo (Fuente)</th><th>Departamento</th><th>Localidad</th></tr></thead>
                <tbody>
                  {filteredNoCallRows.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.fecha_carga || item.createdAt)}</td>
                      <td><strong>{item.numero || item.telefono || '-'}</strong></td>
                      <td>{item.fuente || item.origen || '-'}</td>
                      <td>{item.departamento || item.departamento_residencia || '-'}</td>
                      <td>{item.localidad || item.ciudad || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {noCallLoading ? <div style={{ padding: 16, color: 'var(--muted)' }}>Cargando registros...</div> : null}
              {noCallError ? <div style={{ padding: 16, color: '#be123c', fontWeight: 700 }}>{noCallError}</div> : null}
              {!noCallLoading && !noCallError && !filteredNoCallRows.length ? (
                <div style={{ padding: 16, color: 'var(--muted)' }}>No hay registros para los filtros aplicados.</div>
              ) : null}
            </div>
            <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 12 }}>
              <span className="pill">Página {noCallMeta.page} de {noCallMeta.totalPages} · {noCallMeta.total} registros</span>
              <div className="toolbar">
                <Button variant="ghost" onClick={() => setNoCallPage((p) => Math.max(1, p - 1))} disabled={noCallMeta.page <= 1}>Anterior</Button>
                <Button variant="ghost" onClick={() => setNoCallPage((p) => Math.min(noCallMeta.totalPages, p + 1))} disabled={noCallMeta.page >= noCallMeta.totalPages}>Siguiente</Button>
              </div>
            </div>
          </Panel>
        </section>
      </div>
    );
  }

  if (route === 'sa_resultados') {
    return <div className="view"><section className="content-grid"><Panel className="span-12" title="Resultados telefónicos" subtitle="Historial importado"><div className="table-wrap"><table><thead><tr><th>Teléfono</th><th>Documento</th><th>Nombre</th><th>Resultado</th><th>Observación</th><th>Origen</th><th>Coincidencia</th><th>Fecha</th></tr></thead><tbody>{phoneResultsRows.map((item) => <tr key={item.id}><td><strong>{item.telefono || '-'}</strong></td><td>{item.documento || '-'}</td><td>{item.nombre || '-'}</td><td>{String(item.resultado || '-').replace(/_/g, ' ')}</td><td>{item.observacion || '-'}</td><td>{item.origen || '-'}</td><td>{item.leadId ? <Tag variant="success">Vinculado</Tag> : <Tag variant="warning">Sin match</Tag>}</td><td>{formatDate(item.createdAt)}</td></tr>)}</tbody></table></div></Panel></section></div>;
  }
  if (route === 'sa_datos_trabajar') {
    return (
      <div className="view">
        <section className="content-grid">
          <Panel className="span-12" title="Datos para trabajar" subtitle="Listado completo de registros cargados">
            <div className="toolbar" style={{ marginBottom: 8 }}>
              <Button
                variant={workDataTab === 'nuevo' ? 'secondary' : 'ghost'}
                onClick={() => setWorkDataTab('nuevo')}
              >
                Nuevos
              </Button>
              <Button
                variant={workDataTab === 'trabajado' ? 'secondary' : 'ghost'}
                onClick={() => setWorkDataTab('trabajado')}
              >
                Trabajados
              </Button>
              <Button
                variant={workDataTab === 'bloqueado' ? 'secondary' : 'ghost'}
                onClick={() => setWorkDataTab('bloqueado')}
              >
                Bloqueados
              </Button>
            </div>
            <div className="toolbar" style={{ marginBottom: 12 }}>
              <div className="searchbox" style={{ maxWidth: 360 }}>
                <Search size={18} color="#69788d" />
                <input
                  value={workDataSearch}
                  onChange={(event) => { setWorkDataPage(1); setWorkDataSearch(event.target.value); }}
                  placeholder="Buscar por nombre, teléfono o documento..."
                />
              </div>
              <select
                className="input"
                style={{ width: 190 }}
                value={workDataDepto}
                onChange={(event) => { setWorkDataPage(1); setWorkDataDepto(event.target.value); }}
              >
                {workDataDeptOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept === 'todos' ? 'Todos los departamentos' : dept}
                  </option>
                ))}
              </select>
              <select
                className="input"
                style={{ width: 180 }}
                value={workDataOrigen}
                onChange={(event) => { setWorkDataPage(1); setWorkDataOrigen(event.target.value); }}
              >
                {workDataOrigenOptions.map((origin) => (
                  <option key={origin} value={origin}>
                    {origin === 'todos' ? 'Todos los orígenes' : origin}
                  </option>
                ))}
              </select>
              <select
                className="input"
                style={{ width: 120 }}
                value={workDataPageSize}
                onChange={(event) => { setWorkDataPage(1); setWorkDataPageSize(Number(event.target.value)); }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <Button variant="secondary" icon={<Filter size={16} />} onClick={loadWorkData}>Aplicar</Button>
              <span className="pill" style={{ marginLeft: 'auto' }}>
                Total: {workDataMeta.total}
              </span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Departamento</th>
                    <th>Origen del dato</th>
                    <th>Estado</th>
                    <th>Última gestión</th>
                    <th>Próxima acción</th>
                    <th style={{ minWidth: 140 }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkDataRows.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{[item.nombre, item.apellido].filter(Boolean).join(' ') || item.nombre || '-'}</strong></td>
                      <td>{item.telefono || item.celular || '-'}</td>
                      <td>{item.departamento || '-'}</td>
                      <td>{(item.origen_dato && String(item.origen_dato).trim()) ? item.origen_dato : '-'}</td>
                      <td>{item.estado_label || item.estado || '-'}</td>
                      <td>{item.ultima_gestion || '-'}</td>
                      <td>{item.proxima_accion || '-'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <Button variant="ghost" icon={<Eye size={16} />} onClick={() => setWorkDataSelected(item)}>Ver detalles</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {workDataLoading ? <div style={{ padding: 16, color: 'var(--muted)' }}>Cargando registros...</div> : null}
              {workDataError ? <div style={{ padding: 16, color: '#be123c', fontWeight: 700 }}>{workDataError}</div> : null}
              {!workDataLoading && !workDataError && !filteredWorkDataRows.length ? (
                <div style={{ padding: 16, color: 'var(--muted)' }}>No hay datos cargados aún.</div>
              ) : null}
            </div>
            <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 12 }}>
              <span className="pill">Página {workDataMeta.page} de {workDataMeta.totalPages}</span>
              <div className="toolbar">
                <Button variant="ghost" onClick={() => setWorkDataPage((p) => Math.max(1, p - 1))} disabled={workDataMeta.page <= 1}>Anterior</Button>
                <Button variant="ghost" onClick={() => setWorkDataPage((p) => Math.min(workDataMeta.totalPages, p + 1))} disabled={workDataMeta.page >= workDataMeta.totalPages}>Siguiente</Button>
              </div>
            </div>
            {workDataSelected ? <ContactDetailModal contact={workDataSelected} onClose={() => setWorkDataSelected(null)} /> : null}
          </Panel>
        </section>
      </div>
    );
  }
  if (route === 'sa_productos') {
    return <div className="view"><section className="content-grid"><Panel className="span-8" title="Productos" subtitle="Gestión de catálogo" action={<Button icon={<Plus size={16} />} onClick={() => setProductDraft({ id: '', nombre: '', categoria: '', precio: '', descripcion: '', observaciones: '', activo: true })}>Nuevo</Button>}><div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Estado</th><th>Actualización</th><th>Acción</th></tr></thead><tbody>{products.map((item) => <tr key={item.id}><td><strong>{item.nombre}</strong></td><td>{item.categoria}</td><td>$ {Number(item.precio || 0).toLocaleString('es-UY')}</td><td><Tag variant={item.activo ? 'success' : 'warning'}>{item.activo ? 'Activo' : 'Inactivo'}</Tag></td><td>{formatDate(item.updatedAt)}</td><td><div className="toolbar"><Button variant="ghost" icon={<Edit3 size={15} />} onClick={() => setProductDraft({ id: item.id, nombre: item.nombre, categoria: item.categoria, precio: String(item.precio), descripcion: item.descripcion || '', observaciones: item.observaciones || '', activo: !!item.activo })}>Editar</Button><Button variant="secondary" onClick={async () => { await updateProduct(item.id, { activo: !item.activo }); await loadProducts(); }}>Estado</Button></div></td></tr>)}</tbody></table></div></Panel><Panel className="span-4" title={productDraft.id ? 'Editar producto' : 'Crear producto'} subtitle="Formulario"><div className="list"><input className="input" placeholder="Nombre" value={productDraft.nombre} onChange={(event) => setProductDraft((prev) => ({ ...prev, nombre: event.target.value }))} /><input className="input" placeholder="Categoría" value={productDraft.categoria} onChange={(event) => setProductDraft((prev) => ({ ...prev, categoria: event.target.value }))} /><input className="input" placeholder="Precio / Cuota" value={productDraft.precio} onChange={(event) => setProductDraft((prev) => ({ ...prev, precio: event.target.value }))} /><textarea className="input" rows="3" placeholder="Descripción" value={productDraft.descripcion} onChange={(event) => setProductDraft((prev) => ({ ...prev, descripcion: event.target.value }))}></textarea><textarea className="input" rows="3" placeholder="Observaciones" value={productDraft.observaciones} onChange={(event) => setProductDraft((prev) => ({ ...prev, observaciones: event.target.value }))}></textarea><Button icon={<CheckCircle2 size={16} />} onClick={saveProduct}>{productDraft.id ? 'Guardar' : 'Crear'}</Button></div></Panel></section></div>;
  }

  if (route === 'sa_usuarios') {
    return (
      <div className="view">
        <section className="content-grid">
          <Panel
            className={showUserForm ? 'span-8' : 'span-12'}
            title="Usuarios y roles"
            subtitle="Control de accesos"
            action={
              <div className="toolbar">
                {showUserForm ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowUserForm(false);
                    setUserDraft(createUserDraft());
                    setUserFormError('');
                    setUserFormSuccess('');
                    setUserFormLoading(false);
                  }}
                >
                    Ocultar formulario
                  </Button>
                ) : null}
                <Button
                  icon={<Plus size={16} />}
                  onClick={() => {
                    setUserDraft(createUserDraft());
                    setShowUserForm(true);
                    setUserFormError('');
                    setUserFormSuccess('');
                  }}
                >
                  Nuevo
                </Button>
              </div>
            }
          >
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Último acceso</th>
                    <th>Días inactivo</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.nombre}</strong></td>
                      <td>{item.email}</td>
                      <td>{roleMeta[item.rol]?.label || item.rol}</td>
                      <td><Tag variant={item.activo ? 'success' : 'warning'}>{item.activo ? 'Activo' : 'Bloqueado'}</Tag></td>
                      <td>{formatDate(item.ultimoAcceso)}</td>
                      <td>{daysWithoutAccess(item.ultimoAcceso)}</td>
                      <td>
                        <div className="toolbar">
                          <Button
                            variant="ghost"
                            icon={<Edit3 size={15} />}
                            onClick={() => {
                              const { firstName, lastName } = splitFullName(item.nombre);
                              setUserDraft(createUserDraft({
                                id: item.id,
                                nombre: firstName || item.nombre || '',
                                apellido: lastName,
                                email: item.email || '',
                                telefono: item.telefono || '',
                                role: item.rol || item.role || DEFAULT_USER_ROLE,
                                status: item.status || DEFAULT_USER_STATUS,
                                reason: DEFAULT_USER_REASON
                              }));
                              setShowUserForm(true);
                              setUserFormError('');
                              setUserFormSuccess('');
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={async () => {
                              const safeFields = buildSafeToggleUserFields(item);
                              if (!safeFields.canToggle) {
                                setUserFormError('Completá apellido desde Editar antes de cambiar el estado de este usuario.');
                                setUserFormSuccess('');
                                return;
                              }

                              const nextStatus = item.status === 'approved' ? 'blocked' : 'approved';
                              await updateUser(item.id, {
                                userId: item.id,
                                nombre: safeFields.nombre,
                                apellido: safeFields.apellido,
                                email: item.email || '',
                                telefono: item.telefono || '',
                                role: item.rol || item.role || DEFAULT_USER_ROLE,
                                status: nextStatus,
                                reason: nextStatus === 'approved' ? 'Reactivado desde toggle rápido' : 'Bloqueado desde toggle rápido'
                              });
                              await loadUsers();
                            }}
                            disabled={!buildSafeToggleUserFields(item).canToggle}
                            title={!buildSafeToggleUserFields(item).canToggle ? 'Completá apellido desde Editar antes de cambiar estado.' : undefined}
                          >
                            {item.activo ? 'Bloquear' : 'Activar'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {showUserForm ? (
            <Panel className="span-4" title={userDraft.id ? 'Editar usuario' : 'Crear usuario'} subtitle="Formulario">
              <div className="list">
                <input
                  className="input"
                  placeholder="Nombre"
                  value={userDraft.nombre}
                  onChange={(event) => setUserDraft((prev) => ({ ...prev, nombre: event.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Apellido"
                  value={userDraft.apellido}
                  onChange={(event) => setUserDraft((prev) => ({ ...prev, apellido: event.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Email / Usuario"
                  value={userDraft.email}
                  onChange={(event) => setUserDraft((prev) => ({ ...prev, email: event.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Teléfono"
                  value={userDraft.telefono}
                  onChange={(event) => setUserDraft((prev) => ({ ...prev, telefono: event.target.value }))}
                />
                <select
                  className="input"
                  value={userDraft.role}
                  onChange={(event) => setUserDraft((prev) => ({ ...prev, role: event.target.value }))}
                >
                  {USER_ROLE_OPTIONS.map((roleKey) => (
                    <option key={roleKey} value={roleKey}>
                      {roleMeta[roleKey]?.label || roleKey}
                    </option>
                  ))}
                </select>
                <select
                  className="input"
                  value={userDraft.status}
                  onChange={(event) => setUserDraft((prev) => ({ ...prev, status: event.target.value }))}
                >
                  {USER_STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Motivo / comentario (opcional)"
                  value={userDraft.reason}
                  onChange={(event) => setUserDraft((prev) => ({ ...prev, reason: event.target.value }))}
                ></textarea>
                <Button icon={<CheckCircle2 size={16} />} onClick={saveUser} disabled={userFormLoading}>
                  {userFormLoading ? 'Procesando...' : (userDraft.id ? 'Guardar' : 'Crear')}
                </Button>
                {userFormError ? (
                  <div style={{ marginTop: 8, color: '#be123c', fontSize: '0.85rem' }}>
                    {userFormError}
                  </div>
                ) : null}
                {userFormSuccess ? (
                  <div style={{ marginTop: 8, color: '#15803d', fontSize: '0.85rem' }}>
                    {userFormSuccess}
                  </div>
                ) : null}
              </div>
            </Panel>
          ) : null}
        </section>
      </div>
    );
  }

  if (route === 'sa_logs_actividad') {
    return <div className="view"><section className="content-grid"><Panel className="span-7" title="Log básico" subtitle="Eventos clave del sistema"><div className="list">{activityRows.map((item) => <div key={item.id} className="alert"><div className="status-ring" style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(15,118,110,0.12)', color: '#0f766e' }}><Activity size={16} /></div><div><div style={{ fontWeight: 700 }}>{item.tipo} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>· {formatDate(item.createdAt)}</span></div><div style={{ color: 'var(--muted)' }}>{item.detalle}</div><div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{item.modulo} · {item.usuario} · {item.rolUsado}</div></div></div>)}</div></Panel><Panel className="span-5" title="Inactividad y uso" subtitle="Resumen operativo"><div className="mini-stats"><div className="mini-stat"><span>Usuarios inactivos (&gt;= 7 días)</span><Tag variant={usersInactive7d.length ? 'warning' : 'success'}>{usersInactive7d.length}</Tag></div><div className="mini-stat"><span>Horas estimadas / día</span><strong>{usageTotals.day} h</strong></div><div className="mini-stat"><span>Horas estimadas / mes</span><strong>{usageTotals.month} h</strong></div><div className="mini-stat"><span>Horas estimadas / año</span><strong>{usageTotals.year} h</strong></div></div></Panel></section></div>;
  }

  if (route === 'sa_estado_modulos') {
    return (
      <div className="view">
        <section className="content-grid">
          <Panel className="span-12" title="Estado de módulos" subtitle="Define visibilidad por rol. Solo los módulos en estado activo se muestran en el menú.">
            <div className="toolbar" style={{ marginBottom: 12 }}>
              <select className="input" style={{ width: 280 }} value={moduleRoleFilter} onChange={(event) => setModuleRoleFilter(event.target.value)}>
                {Object.entries(roleMeta).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>
              <Tag variant="info">Rol en edición: {roleMeta[moduleRoleFilter]?.label || moduleRoleFilter}</Tag>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Rol</th><th>Módulo</th><th>Estado</th></tr></thead>
                <tbody>
                  {moduleRows.map((item) => {
                    const currentState = moduleStates?.[moduleRoleFilter]?.[item.path] || 'activo';
                    return (
                      <tr key={item.path}>
                        <td>{roleMeta[moduleRoleFilter]?.label || moduleRoleFilter}</td>
                        <td><strong>{item.label}</strong><div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{item.caption}</div></td>
                        <td>
                          <select className="input" style={{ width: 220 }} value={currentState} onChange={(event) => onChangeModuleState(moduleRoleFilter, item.path, event.target.value)}>
                            {estadoModuloOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!moduleRows.length ? <div style={{ padding: 16, color: 'var(--muted)' }}>No hay módulos configurados para este rol.</div> : null}
            </div>
          </Panel>
        </section>
      </div>
    );
  }

  if (route === 'sa_configuracion') {
    return <div className="view"><section className="content-grid"><Panel className="span-8" title="Configuración general" subtitle="Parámetros globales"><div className="mini-stats"><div className="mini-stat"><span>Tipos de solicitud</span><strong>Atención al cliente</strong></div><div className="mini-stat"><span>Estados comerciales</span><strong>Ventas y seguimiento</strong></div><div className="mini-stat"><span>Parámetros generales</span><strong>Categorías y estados</strong></div></div></Panel><Panel className="span-4" title="Identidad visual" subtitle="Cambio de logo"><div className="list"><div style={{ borderRadius: 16, border: '1px solid var(--line)', minHeight: 100, display: 'grid', placeItems: 'center', background: 'rgba(20,34,53,0.03)' }}>{logoDraft ? <img src={logoDraft} alt="Logo" style={{ maxWidth: '100%', maxHeight: 80, objectFit: 'contain' }} /> : <strong>Sin logo personalizado</strong>}</div><input className="input" type="file" accept="image/*" onChange={onLogoFile} />{logoError ? <div style={{ color: '#be123c', fontWeight: 700 }}>{logoError}</div> : null}{logoSaved ? <div style={{ color: '#15803d', fontWeight: 700 }}>{logoSaved}</div> : null}<Button icon={<CheckCircle2 size={16} />} onClick={saveLogo}>Guardar logo</Button></div></Panel></section></div>;
  }

  return <div className="view"><section className="metrics-grid">{globalMetrics.map((item) => <MetricCard key={item.title} item={item} />)}</section><section className="content-grid"><Panel className="span-7" title="Vista general del sistema" subtitle="Control rápido de módulos críticos"><div className="mini-stats"><div className="mini-stat"><span>Importaciones recientes</span><strong>{imports.slice(0, 5).length}</strong></div><div className="mini-stat"><span>Base No llamar activa</span><strong>{noCallMeta.total || noCallRows.length}</strong></div><div className="mini-stat"><span>Resultados telefónicos cargados</span><strong>{phoneResultsRows.length}</strong></div><div className="mini-stat"><span>Usuarios con actividad reciente</span><strong>{activeUsers}</strong></div></div><div className="toolbar" style={{ marginTop: 14 }}><Button icon={<Upload size={16} />} onClick={() => onOpenRoute('sa_importaciones')}>Ir a Importaciones</Button><Button variant="secondary" icon={<Phone size={16} />} onClick={() => onOpenRoute('sa_no_llamar')}>Base No llamar</Button><Button variant="secondary" icon={<PhoneCall size={16} />} onClick={() => onOpenRoute('sa_resultados')}>Resultados</Button></div></Panel><Panel className="span-5" title="Actividad reciente" subtitle="Monitoreo transversal">{listRecentActivity(6).map((item) => <div key={item.id} className="status-item"><div className="status-ring" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}><Activity size={16} /></div><div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{item.tipo}</div><div style={{ color: 'var(--muted)' }}>{item.detalle}</div></div><span style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>{item.at}</span></div>)}</Panel></section></div>;
}


