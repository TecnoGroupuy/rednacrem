import React from 'react';
import { Filter, RefreshCw } from 'lucide-react';
import {
  listContractingCasesAsync,
  updateContractingCase,
  CONTRACTING_FLOWS,
  CONTRACTING_STATUS,
  getContractingMetrics
} from '../services/contractsService.js';
import { getUsersByRole } from '../services/usersService.js';

const TABS = [
  { key: CONTRACTING_FLOWS.ALTAS, label: 'Altas' },
  { key: CONTRACTING_FLOWS.RETENCIONES, label: 'Retenciones' },
  { key: CONTRACTING_FLOWS.RECUPERO, label: 'Recupero' }
];

const statusVariant = (status) => {
  if (['completada', 'retenido', 'recuperado'].includes(status)) return 'success';
  if (['observada', 'baja_confirmada', 'no_localizado', 'no_recuperado'].includes(status)) return 'warning';
  return 'info';
};

const statusLabel = (status) => String(status || '').replace(/_/g, ' ');

export default function SupervisorContractsModule({ Panel, Button, Tag }) {
  const [activeTab, setActiveTab] = React.useState(CONTRACTING_FLOWS.ALTAS);
  const [rows, setRows] = React.useState({ altas: [], retenciones: [], recupero: [] });
  const [metrics, setMetrics] = React.useState({
    altas: { pendientes: 0, completadas: 0 },
    retenciones: { abiertas: 0, retenidos: 0, bajasConfirmadas: 0 },
    recupero: { recuperados: 0, noRecuperados: 0 }
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [quickFilter, setQuickFilter] = React.useState('todos');
  const [savingById, setSavingById] = React.useState({});

  const assignees = React.useMemo(() => {
    const sellers = getUsersByRole('vendedor').map((item) => item.nombre);
    const supervisors = getUsersByRole('supervisor').map((item) => item.nombre);
    return [...new Set([...supervisors, ...sellers, 'Supervisor'])];
  }, []);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const cases = await listContractingCasesAsync();
      setRows(cases);
      setMetrics(getContractingMetrics());
    } catch (err) {
      setError(err.message || 'No se pudo cargar Contrataciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const updateRow = async (id, patch) => {
    setSavingById((prev) => ({ ...prev, [id]: true }));
    try {
      await updateContractingCase(activeTab, id, patch);
      await loadData();
    } finally {
      setSavingById((prev) => ({ ...prev, [id]: false }));
    }
  };

  const currentRows = rows[activeTab] || [];
  const filteredRows = currentRows.filter((item) => quickFilter === 'todos' || item.estado === quickFilter);
  const tabStatuses = CONTRACTING_STATUS[activeTab] || [];

  const renderMetrics = () => {
    if (activeTab === CONTRACTING_FLOWS.ALTAS) {
      return (
        <div className="mini-stats">
          <div className="mini-stat"><span>Altas pendientes</span><strong>{metrics.altas.pendientes}</strong></div>
          <div className="mini-stat"><span>Altas completadas</span><strong>{metrics.altas.completadas}</strong></div>
        </div>
      );
    }
    if (activeTab === CONTRACTING_FLOWS.RETENCIONES) {
      return (
        <div className="mini-stats">
          <div className="mini-stat"><span>Casos abiertos</span><strong>{metrics.retenciones.abiertas}</strong></div>
          <div className="mini-stat"><span>Retenidos</span><strong>{metrics.retenciones.retenidos}</strong></div>
          <div className="mini-stat"><span>Bajas confirmadas</span><strong>{metrics.retenciones.bajasConfirmadas}</strong></div>
        </div>
      );
    }
    return (
      <div className="mini-stats">
        <div className="mini-stat"><span>Clientes recuperados</span><strong>{metrics.recupero.recuperados}</strong></div>
        <div className="mini-stat"><span>No recuperados</span><strong>{metrics.recupero.noRecuperados}</strong></div>
      </div>
    );
  };

  const renderAltas = () => (
    <table>
      <thead><tr><th>ID</th><th>Cliente</th><th>Producto</th><th>Fecha</th><th>Vendedor origen</th><th>Estado</th><th>Asignado</th><th>Acción</th></tr></thead>
      <tbody>
        {filteredRows.map((row) => (
          <tr key={row.id}>
            <td>{row.id}</td>
            <td><strong>{row.cliente}</strong></td>
            <td>{row.producto}</td>
            <td>{row.fecha}</td>
            <td>{row.vendedorOrigen}</td>
            <td><Tag variant={statusVariant(row.estado)}>{statusLabel(row.estado)}</Tag></td>
            <td>
              <select className="input" style={{ width: 170 }} value={row.asignado} onChange={(event) => updateRow(row.id, { asignado: event.target.value })}>
                {assignees.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </td>
            <td>
              <select className="input" style={{ width: 165 }} value={row.estado} onChange={(event) => updateRow(row.id, { estado: event.target.value })}>
                {tabStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderRetenciones = () => (
    <table>
      <thead><tr><th>Contacto</th><th>Producto</th><th>Fecha alta</th><th>Motivo baja</th><th>Fecha solicitud</th><th>Asignado</th><th>Estado ticket</th><th>Resultado</th><th>Acción</th></tr></thead>
      <tbody>
        {filteredRows.map((row) => (
          <tr key={row.id}>
            <td><strong>{row.cliente}</strong></td>
            <td>{row.producto}</td>
            <td>{row.fechaAltaProducto || '-'}</td>
            <td>{row.motivo}</td>
            <td>{row.fechaSolicitud || '-'}</td>
            <td>
              <select className="input" style={{ width: 170 }} value={row.asignado} onChange={(event) => updateRow(row.id, { estado: row.estado, asignado: event.target.value })}>
                {assignees.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </td>
            <td><Tag variant="info">{row.estadoTicket}</Tag></td>
            <td><Tag variant={statusVariant(row.resultadoRetencion === '-' ? row.estado : row.resultadoRetencion)}>{statusLabel(row.resultadoRetencion === '-' ? row.estado : row.resultadoRetencion)}</Tag></td>
            <td>
              <select className="input" style={{ width: 170 }} value={row.estado} onChange={(event) => updateRow(row.id, { estado: event.target.value, asignado: row.asignado })}>
                {tabStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderRecupero = () => (
    <table>
      <thead><tr><th>Contacto</th><th>Producto anterior</th><th>Fecha baja</th><th>Motivo</th><th>Último ticket</th><th>Campaña</th><th>Asignado</th><th>Estado recupero</th><th>Acción</th></tr></thead>
      <tbody>
        {filteredRows.map((row) => (
          <tr key={row.id}>
            <td><strong>{row.cliente}</strong></td>
            <td>{row.productoAnterior}</td>
            <td>{row.fechaBaja}</td>
            <td>{row.motivo}</td>
            <td>{row.ultimoTicketId || '-'}</td>
            <td>{row.campana}{row.observacion ? ' · ' + row.observacion : ''}</td>
            <td>
              <select className="input" style={{ width: 170 }} value={row.asignado} onChange={(event) => updateRow(row.id, { estado: row.estado, asignado: event.target.value })}>
                {assignees.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </td>
            <td><Tag variant={statusVariant(row.estado)}>{statusLabel(row.estado)}</Tag></td>
            <td>
              <select className="input" style={{ width: 170 }} value={row.estado} onChange={(event) => updateRow(row.id, { estado: event.target.value, asignado: row.asignado })}>
                {tabStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="view">
      <section className="content-grid">
        <Panel className="span-12" title="Contrataciones" subtitle="Seguimiento operativo de Altas, Retenciones y Recupero">
          <div className="toolbar" style={{ marginBottom: 12 }}>
            {TABS.map((tab) => (
              <Button key={tab.key} variant={activeTab === tab.key ? 'primary' : 'secondary'} onClick={() => { setActiveTab(tab.key); setQuickFilter('todos'); }}>
                {tab.label}
              </Button>
            ))}
            <select className="input" style={{ width: 220, marginLeft: 'auto' }} value={quickFilter} onChange={(event) => setQuickFilter(event.target.value)}>
              <option value="todos">Todos los estados</option>
              {tabStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>
            <Button variant="secondary" icon={<Filter size={16} />}>Filtro</Button>
            <Button variant="ghost" icon={<RefreshCw size={16} />} onClick={loadData}>Actualizar</Button>
          </div>

          {renderMetrics()}
          {error ? <div style={{ marginTop: 12, color: '#be123c', fontWeight: 700 }}>{error}</div> : null}
          {loading ? <div style={{ marginTop: 12, color: 'var(--muted)' }}>Cargando contrataciones...</div> : null}

          <div className="table-wrap" style={{ marginTop: 12 }}>
            {activeTab === CONTRACTING_FLOWS.ALTAS ? renderAltas() : null}
            {activeTab === CONTRACTING_FLOWS.RETENCIONES ? renderRetenciones() : null}
            {activeTab === CONTRACTING_FLOWS.RECUPERO ? renderRecupero() : null}
            {!loading && !filteredRows.length ? <div style={{ padding: 16, color: 'var(--muted)' }}>No hay casos para el filtro seleccionado.</div> : null}
          </div>
        </Panel>
      </section>
    </div>
  );
}

