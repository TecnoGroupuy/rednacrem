
import React from 'react';
import { Search, Filter, Upload, Plus, CheckCircle2, X, Edit3, Activity, Phone, PhoneCall } from 'lucide-react';
import { listImports, previewCsvText, createImportFromCsv, IMPORT_TYPES } from '../services/importsService.js';
import { listNoCallEntries, listPhoneResultEntries } from '../services/leadsService.js';
import { listProductsAsync, createProduct, updateProduct } from '../services/productsService.js';
import { listUsersAsync, createUser, updateUser } from '../services/usersService.js';
import { listRecentActivity, listActivityLog, logActivityEvent } from '../services/activityService.js';

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

  const [products, setProducts] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [noCallRows, setNoCallRows] = React.useState([]);
  const [phoneResultsRows, setPhoneResultsRows] = React.useState([]);
  const [activityRows, setActivityRows] = React.useState([]);

  const [showImportFlow, setShowImportFlow] = React.useState(false);
  const [importDraft, setImportDraft] = React.useState({ fileName: '', csvText: '', importType: 'clientes' });
  const [preview, setPreview] = React.useState(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState('');

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
    setImportDraft({ fileName: '', csvText: '', importType: 'clientes' });
    setPreview(null);
    setPreviewError('');
    setPreviewLoading(false);
  }, []);

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
    const [noCall, results] = await Promise.all([listNoCallEntries(), listPhoneResultEntries()]);
    setNoCallRows(noCall);
    setPhoneResultsRows(results);
  }, []);
  const loadActivity = React.useCallback(() => setActivityRows(listActivityLog()), []);

  const splitFullName = (value) => {
    const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
    return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
  };

  React.useEffect(() => {
    if (!route.startsWith('sa_') && route !== 'dashboard_global') return;
    Promise.all([loadProducts(), loadUsers(), loadSpecialBases()]).catch(() => {});
    loadActivity();
  }, [route, loadProducts, loadUsers, loadSpecialBases, loadActivity]);

  React.useEffect(() => {
    if (!['sa_importaciones', 'dashboard_global'].includes(route)) return;
    loadImports();
  }, [route, loadImports]);

  React.useEffect(() => setLogoDraft(logoUrl || ''), [logoUrl]);

  const formatDate = (value) => value ? new Date(value).toLocaleString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
  const daysWithoutAccess = (value) => !value ? '-' : String(Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000)));
  const estimateUsageHours = (seed) => {
    const base = (String(seed || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 5) + 2;
    return { day: base, month: base * 20, year: base * 240 };
  };
  const handleCsvFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const csvText = await file.text();
      setImportDraft((prev) => ({ ...prev, fileName: file.name, csvText }));
      setPreview(null);
      setPreviewError('');
    } catch {
      setPreviewError('No se pudo leer el archivo seleccionado.');
    }
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
          <Panel className="span-12" title="Importaciones" subtitle="Carga masiva por tipo (clientes, No llamar, resultados)" action={<Button icon={<Upload size={16} />} onClick={() => { setShowImportFlow(true); setImportSuccess(''); resetImportFlow(); }}>Importar CSV</Button>}>
            <div className="toolbar" style={{ marginBottom: 12 }}>
              <div className="searchbox" style={{ maxWidth: 320 }}><Search size={18} color="#69788d" /><input value={importsSearch} onChange={(event) => { setImportsPage(1); setImportsSearch(event.target.value); }} placeholder="Buscar por archivo..." /></div>
              <select className="input" style={{ width: 250 }} value={importsType} onChange={(event) => { setImportsPage(1); setImportsType(event.target.value); }}>
                <option value="todos">Todos los tipos</option>
                {Object.values(IMPORT_TYPES).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
              <Button variant="secondary" icon={<Filter size={16} />} onClick={loadImports}>Aplicar</Button>
              {importSuccess ? <span className="pill" style={{ color: '#15803d' }}>{importSuccess}</span> : null}
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Archivo</th><th>Tipo</th><th>Fecha</th><th>Total</th><th>Importados</th><th>Rechazados</th><th>Estado</th><th>Usuario</th></tr></thead>
                <tbody>{imports.map((row) => <tr key={row.id}><td><strong>{row.archivo}</strong></td><td>{row.tipoLabel}</td><td>{row.fecha}</td><td>{row.total}</td><td>{row.importados}</td><td>{row.rechazados}</td><td><Tag variant={row.estado === 'Completada' ? 'success' : row.estado === 'Fallida' ? 'danger' : 'warning'}>{row.estado}</Tag></td><td>{row.usuario}</td></tr>)}</tbody>
              </table>
              {importsLoading ? <div style={{ padding: 16, color: 'var(--muted)' }}>Cargando historial...</div> : null}
              {importsError ? <div style={{ padding: 16, color: '#be123c', fontWeight: 700 }}>{importsError}</div> : null}
            </div>
            <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 12 }}>
              <span className="pill">Página {importsMeta.page} de {importsMeta.totalPages} · {importsMeta.total} registros</span>
              <div className="toolbar"><Button variant="ghost" onClick={() => setImportsPage((p) => Math.max(1, p - 1))} disabled={importsMeta.page <= 1}>Anterior</Button><Button variant="ghost" onClick={() => setImportsPage((p) => Math.min(importsMeta.totalPages, p + 1))} disabled={importsMeta.page >= importsMeta.totalPages}>Siguiente</Button></div>
            </div>
            {showImportFlow ? <div className="lot-wizard-overlay" onClick={() => setShowImportFlow(false)}><div className="lot-wizard" onClick={(event) => event.stopPropagation()}><div className="lot-wizard-header"><div><h3>Importar CSV</h3><p>Subida, preview y confirmación.</p></div><button className="icon-button" style={{ width: 36, height: 36 }} onClick={() => setShowImportFlow(false)}><X size={16} color="#152235" /></button></div><div className="lot-step"><span className="lot-step-index">1</span><div style={{ flex: 1 }}><h4>Tipo</h4><select className="input" value={importDraft.importType} onChange={(event) => setImportDraft((prev) => ({ ...prev, importType: event.target.value }))}>{Object.values(IMPORT_TYPES).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></div></div><div className="lot-step"><span className="lot-step-index">2</span><div style={{ flex: 1 }}><h4>Archivo</h4><input className="input" type="file" accept=".csv" onChange={handleCsvFile} /></div></div><div className="lot-step"><span className="lot-step-index">3</span><div style={{ flex: 1 }}><h4>Validación</h4><Button variant="secondary" onClick={validatePreview} disabled={!importDraft.csvText || previewLoading}>{previewLoading ? 'Validando...' : 'Validar'}</Button>{preview ? <div style={{ marginTop: 8, color: 'var(--muted)' }}>Total: {preview.summary.total} · Importables: {preview.summary.importados} · Rechazados: {preview.summary.rechazados}</div> : null}</div></div>{previewError ? <div style={{ color: '#be123c', fontWeight: 700 }}>{previewError}</div> : null}<div className="toolbar" style={{ justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setShowImportFlow(false)}>Cancelar</Button><Button icon={<CheckCircle2 size={16} />} onClick={confirmImport} disabled={!preview || !importDraft.fileName}>Confirmar</Button></div></div></div> : null}
          </Panel>
        </section>
      </div>
    );
  }

  if (route === 'sa_no_llamar') {
    return <div className="view"><section className="content-grid"><Panel className="span-12" title="Base No llamar" subtitle="Contactos bloqueados"><div className="table-wrap"><table><thead><tr><th>Teléfono</th><th>Documento</th><th>Nombre</th><th>Motivo</th><th>Origen</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>{noCallRows.map((item) => <tr key={item.id}><td><strong>{item.telefono}</strong></td><td>{item.documento || '-'}</td><td>{item.nombre || '-'}</td><td>{item.motivo || '-'}</td><td>{item.origen || '-'}</td><td>{formatDate(item.createdAt)}</td><td><Tag variant="danger">{item.estado || 'Bloqueado'}</Tag></td></tr>)}</tbody></table></div></Panel></section></div>;
  }

  if (route === 'sa_resultados') {
    return <div className="view"><section className="content-grid"><Panel className="span-12" title="Resultados telefónicos" subtitle="Historial importado"><div className="table-wrap"><table><thead><tr><th>Teléfono</th><th>Documento</th><th>Nombre</th><th>Resultado</th><th>Observación</th><th>Origen</th><th>Coincidencia</th><th>Fecha</th></tr></thead><tbody>{phoneResultsRows.map((item) => <tr key={item.id}><td><strong>{item.telefono || '-'}</strong></td><td>{item.documento || '-'}</td><td>{item.nombre || '-'}</td><td>{String(item.resultado || '-').replace(/_/g, ' ')}</td><td>{item.observacion || '-'}</td><td>{item.origen || '-'}</td><td>{item.leadId ? <Tag variant="success">Vinculado</Tag> : <Tag variant="warning">Sin match</Tag>}</td><td>{formatDate(item.createdAt)}</td></tr>)}</tbody></table></div></Panel></section></div>;
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
                              await updateUser(item.id, { activo: !item.activo });
                              await loadUsers();
                            }}
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

  return <div className="view"><section className="metrics-grid">{globalMetrics.map((item) => <MetricCard key={item.title} item={item} />)}</section><section className="content-grid"><Panel className="span-7" title="Vista general del sistema" subtitle="Control rápido de módulos críticos"><div className="mini-stats"><div className="mini-stat"><span>Importaciones recientes</span><strong>{imports.slice(0, 5).length}</strong></div><div className="mini-stat"><span>Base No llamar activa</span><strong>{noCallRows.length}</strong></div><div className="mini-stat"><span>Resultados telefónicos cargados</span><strong>{phoneResultsRows.length}</strong></div><div className="mini-stat"><span>Usuarios con actividad reciente</span><strong>{activeUsers}</strong></div></div><div className="toolbar" style={{ marginTop: 14 }}><Button icon={<Upload size={16} />} onClick={() => onOpenRoute('sa_importaciones')}>Ir a Importaciones</Button><Button variant="secondary" icon={<Phone size={16} />} onClick={() => onOpenRoute('sa_no_llamar')}>Base No llamar</Button><Button variant="secondary" icon={<PhoneCall size={16} />} onClick={() => onOpenRoute('sa_resultados')}>Resultados</Button></div></Panel><Panel className="span-5" title="Actividad reciente" subtitle="Monitoreo transversal">{listRecentActivity(6).map((item) => <div key={item.id} className="status-item"><div className="status-ring" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}><Activity size={16} /></div><div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{item.tipo}</div><div style={{ color: 'var(--muted)' }}>{item.detalle}</div></div><span style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>{item.at}</span></div>)}</Panel></section></div>;
}


