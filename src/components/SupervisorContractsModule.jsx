import React from 'react';
import { Filter, RefreshCw, Plus, X } from 'lucide-react';
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
  const [metrics, setMetrics] = React.useState({ total: 0, enGestion: 0, recuperados: 0, rechazados: 0 });
  const [items, setItems] = React.useState([]);
  const [filtroProducto, setFiltroProducto] = React.useState('');
  const [filtroDepartamento, setFiltroDepartamento] = React.useState('');
  const [filtroBusqueda, setFiltroBusqueda] = React.useState('');
  const [orden, setOrden] = React.useState({ campo: '', direccion: 'asc' });
  const [filterOptions, setFilterOptions] = React.useState({ productos: [], departamentos: [] });
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

  const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));

  const loadFilters = React.useCallback(async () => {
    try {
      const response = await api.get('/api/recupero/filtros');
      const productos = response?.productos || response?.data?.productos || [];
      const departamentos = response?.departamentos || response?.data?.departamentos || [];
      setFilterOptions({
        productos: Array.isArray(productos) ? productos : [],
        departamentos: Array.isArray(departamentos) ? departamentos : []
      });
    } catch {
      setFilterOptions({ productos: [], departamentos: [] });
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

  const loadRecupero = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = `/api/recupero/contactos?page=${page}&limit=${PAGE_SIZE}`
        + (filtroProducto ? `&producto=${encodeURIComponent(filtroProducto)}` : '')
        + (filtroDepartamento ? `&departamento=${encodeURIComponent(filtroDepartamento)}` : '')
        + (filtroBusqueda ? `&search=${encodeURIComponent(filtroBusqueda)}` : '')
        + (orden.campo ? `&sort=${orden.campo}&dir=${orden.direccion}` : '');
      const response = await api.get(url);
      const rows = response?.items || response?.data?.items || [];
      const totalCount = Number(response?.total ?? response?.data?.total ?? rows.length);
      setItems(Array.isArray(rows) ? rows : []);
      setTotal(Number.isFinite(totalCount) ? totalCount : 0);
      setMetrics((prev) => ({
        total: Number.isFinite(totalCount) ? totalCount : prev.total,
        enGestion: 0,
        recuperados: 0,
        rechazados: 0
      }));
    } catch (err) {
      setError(err?.message || 'No se pudo cargar Recupero de clientes.');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [api, filtroDepartamento, filtroProducto, filtroBusqueda, orden, page, metrics.total, metrics.enGestion, metrics.convertidos]);

  React.useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  React.useEffect(() => {
    loadRecupero();
  }, [loadRecupero]);

  React.useEffect(() => {
    setPage(1);
    loadRecupero();
  }, [filtroProducto, filtroDepartamento, filtroBusqueda, orden]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSelection = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSeller = (id) => {
    setSelectedSellers((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const resetLotModal = () => {
    setLotName('');
    setSelectedSellers([]);
  };

  const openCreateLot = () => {
    if (!selectedIds.length) return;
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
                {Number(metrics.total || 0).toLocaleString('es-UY')}
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
                En gestión
              </div>
              <div style={{ fontSize: '28px', fontWeight: '500' }}>
                {Number(metrics.enGestion || 0).toLocaleString('es-UY')}
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

          <div className="toolbar" style={{ marginBottom: 12, gap: 10 }}>
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
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const nombre = [row.nombre, row.apellido].filter(Boolean).join(' ')
                    || [row.contacto_nombre, row.contacto_apellido].filter(Boolean).join(' ')
                    || row.contacto || '—';
                  return (
                    <tr key={row.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={() => toggleSelection(row.id)}
                        />
                      </td>
                      <td><strong>{nombre}</strong></td>
                      <td>{row.edad ? `${row.edad} años` : '—'}</td>
                      <td>{row.telefono || row.phone || '—'}</td>
                      <td>{row.departamento || row.depto || '—'}</td>
                      <td>{row.producto || row.producto_anterior || row.nombre_producto || '—'}</td>
                      <td>{row.precio || row.monto || '—'}</td>
                      <td>{row.fecha_baja || row.fechaBaja ? new Date(row.fecha_baja || row.fechaBaja).toLocaleDateString('es-UY') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && !items.length ? (
              <div style={{ padding: 16, color: 'var(--muted)' }}>No hay clientes para recuperar.</div>
            ) : null}
          </div>

          <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 12 }}>
            <div style={{ color: 'var(--muted)' }}>
              Mostrando {items.length} de {total}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>Anterior</Button>
              <div style={{ fontWeight: 600 }}>Página {page} de {totalPages}</div>
              <Button variant="ghost" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>Siguiente</Button>
            </div>
          </div>

          {selectedIds.length ? (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(15,23,42,0.12)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>{selectedIds.length} contactos seleccionados</div>
              <Button icon={<Plus size={16} />} onClick={openCreateLot}>Crear lote de recupero</Button>
            </div>
          ) : null}
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
    </div>
  );
}
