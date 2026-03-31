import React from 'react';
import { Filter, RefreshCw, Plus, X, Upload } from 'lucide-react';
import { getApiClient } from '../services/apiClient.js';

const PAGE_SIZE = 50;

const normalizeOption = (value) => String(value || '').trim();
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
  const [orden, setOrden] = React.useState({ campo: '', direccion: 'asc' });
  const [filterOptions, setFilterOptions] = React.useState({ productos: [], departamentos: [], motivos: [] });
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
  const [activeTab, setActiveTab] = React.useState('disponibles');
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importFile, setImportFile] = React.useState(null);
  const [importRows, setImportRows] = React.useState([]);
  const [importErrors, setImportErrors] = React.useState([]);
  const [importSummary, setImportSummary] = React.useState(null);
  const [importLoading, setImportLoading] = React.useState(false);
  const [importResult, setImportResult] = React.useState(null);

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

  const loadFilters = React.useCallback(async () => {
    try {
      const response = await api.get('/api/recupero/filtros');
      const productos = response?.productos || response?.data?.productos || [];
      const departamentos = response?.departamentos || response?.data?.departamentos || [];
      const motivos = response?.motivos || response?.data?.motivos || [];
      setFilterOptions({
        productos: Array.isArray(productos) ? productos : [],
        departamentos: Array.isArray(departamentos) ? departamentos : [],
        motivos: Array.isArray(motivos) ? motivos : []
      });
    } catch {
      setFilterOptions({ productos: [], departamentos: [], motivos: [] });
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

  const getMotivoBaja = (row) => row?.motivo_baja || null;
  const getNombreLote = (row) => row?.nombre_lote || null;
  const getVendedorAsignado = (row) => row?.vendedor_asignado_nombre || null;
  const getUltimoEstado = (row) => row?.ultimo_estado_gestion || null;
  const getFechaUltimaGestion = (row) => row?.fecha_ultima_gestion || null;

  const loadRecupero = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = `/api/recupero/contactos?page=${page}&limit=${PAGE_SIZE}`
        + (filtroProducto ? `&producto=${encodeURIComponent(filtroProducto)}` : '')
        + (filtroDepartamento ? `&departamento=${encodeURIComponent(filtroDepartamento)}` : '')
        + (filtroMotivo ? `&motivo_baja=${encodeURIComponent(filtroMotivo)}` : '')
        + (filtroBusqueda ? `&search=${encodeURIComponent(filtroBusqueda)}` : '')
        + (activeTab ? `&tab=${encodeURIComponent(activeTab)}` : '')
        + (orden.campo ? `&sort=${orden.campo}&dir=${orden.direccion}` : '');
      const response = await api.get(url);
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
      setError(err?.message || 'No se pudo cargar Recupero de clientes.');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [api, filtroDepartamento, filtroMotivo, filtroProducto, filtroBusqueda, orden, page, activeTab, metrics.total]);

  React.useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  React.useEffect(() => {
    loadRecupero();
  }, [loadRecupero]);

  React.useEffect(() => {
    setPage(1);
    loadRecupero();
  }, [filtroProducto, filtroDepartamento, filtroMotivo, filtroBusqueda, orden, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

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

  React.useEffect(() => {
    if (!showImportModal) return;
    if (!isImportSuccess(importResult)) return;
    setShowImportModal(false);
    resetImportState();
  }, [importResult, showImportModal]);

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
      loadRecupero();
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
      loadRecupero();
    } catch (err) {
      setError(err?.message || 'No se pudo crear el lote de recupero.');
    } finally {
      setCreatingLot(false);
    }
  };

  return (
    <div className="view">
      <section className="content-grid">
        <Panel className="span-12" title="Recupero de clientes" subtitle="Cartera de clientes para reconversión">
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
            <div className="toolbar" style={{ gap: 10, marginBottom: 0 }}>
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
              <Button variant="secondary" icon={<Filter size={16} />}>Filtros</Button>
              <Button variant="ghost" icon={<RefreshCw size={16} />} onClick={loadRecupero}>Actualizar</Button>
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

          {error ? <div style={{ marginBottom: 12, color: '#b91c1c', fontWeight: 600 }}>{error}</div> : null}
          {loading ? <div style={{ marginBottom: 12, color: 'var(--muted)' }}>Cargando recupero...</div> : null}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Contacto</th>
                  <ColHeader campo="edad" label="Edad" ordenActual={orden} onOrden={setOrden} />
                  <ColHeader campo="telefono" label="Teléfono" ordenActual={orden} onOrden={setOrden} />
                  <ColHeader campo="departamento" label="Departamento" ordenActual={orden} onOrden={setOrden} />
                  <ColHeader campo="nombre_producto" label="Producto" ordenActual={orden} onOrden={setOrden} />
                  <ColHeader campo="precio" label="Precio" ordenActual={orden} onOrden={setOrden} />
                  <ColHeader campo="fecha_baja" label="Fecha de baja" ordenActual={orden} onOrden={setOrden} />
                  <ColHeader campo="motivo_baja" label="Motivo de baja" ordenActual={orden} onOrden={setOrden} />
                  <ColHeader campo="lote" label="Lote" ordenActual={orden} onOrden={setOrden} />
                  <ColHeader campo="vendedor" label="Vendedor asignado" ordenActual={orden} onOrden={setOrden} />
                  <ColHeader campo="ultimo_estado" label="Último estado" ordenActual={orden} onOrden={setOrden} />
                  <ColHeader campo="ultima_gestion_fecha" label="Última gestión" ordenActual={orden} onOrden={setOrden} />
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
                      <td>{row.edad ? `${row.edad} años` : '—'}</td>
                      <td>{row.telefono || row.phone || '—'}</td>
                      <td>{row.departamento || row.depto || '—'}</td>
                      <td>{row.producto || row.producto_anterior || row.nombre_producto || '—'}</td>
                      <td>{row.precio || row.monto || '—'}</td>
                      <td>{formatDate(row.fecha_baja || row.fechaBaja)}</td>
                      <td>{motivoBaja || 'Sin motivo'}</td>
                      <td>{nombreLote || '—'}</td>
                      <td>{vendedorAsignado || 'Sin asignar'}</td>
                      <td>{ultimoEstadoGestion || 'Nuevo'}</td>
                      <td>{fechaUltimaGestion ? formatDateTime(fechaUltimaGestion) : '—'}</td>
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
