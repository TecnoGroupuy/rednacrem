import React from 'react';
import { formatDate } from '../utils/dateFormat.js';

// TODO: reemplazar por GET /recovery/resultados (o el endpoint que se defina)
// cuando el backend esté listo. No existe hoy ningún endpoint de "clientes
// recuperados" filtrable por fecha/vendedor/medio de pago (ver auditoría de
// backend: requiere unir sales con recupero_candidatos.contact_id).
const RESULTADOS_PLACEHOLDER = [
  { id: 'demo-1', contacto: 'Ejemplo Contacto 1', vendedor: 'Vendedor demo', medioPago: 'Débito automático', fecha: '2026-08-14' },
  { id: 'demo-2', contacto: 'Ejemplo Contacto 2', vendedor: 'Vendedor demo', medioPago: 'Redpagos', fecha: '2026-08-02' },
  { id: 'demo-3', contacto: 'Ejemplo Contacto 3', vendedor: 'Otro vendedor demo', medioPago: 'Débito automático', fecha: '2026-07-21' }
];

const asText = (value, fallback = '-') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

export default function RecuperoResultadosView({ Panel }) {
  const [filtroDesde, setFiltroDesde] = React.useState('');
  const [filtroHasta, setFiltroHasta] = React.useState('');
  const [filtroVendedor, setFiltroVendedor] = React.useState('');
  const [filtroMedioPago, setFiltroMedioPago] = React.useState('');

  // Placeholder local — no hay llamada a backend todavía (ver TODO arriba).
  const rows = RESULTADOS_PLACEHOLDER;

  const vendedorOptions = React.useMemo(() => (
    Array.from(new Set(rows.map((row) => row.vendedor).filter(Boolean)))
  ), [rows]);
  const medioPagoOptions = React.useMemo(() => (
    Array.from(new Set(rows.map((row) => row.medioPago).filter(Boolean)))
  ), [rows]);

  const filteredRows = React.useMemo(() => rows.filter((row) => {
    if (filtroDesde && row.fecha < filtroDesde) return false;
    if (filtroHasta && row.fecha > filtroHasta) return false;
    if (filtroVendedor && row.vendedor !== filtroVendedor) return false;
    if (filtroMedioPago && row.medioPago !== filtroMedioPago) return false;
    return true;
  }), [rows, filtroDesde, filtroHasta, filtroVendedor, filtroMedioPago]);

  const thStyle = { textAlign: 'left', padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border-tertiary)' };
  const tdStyle = { padding: '10px 12px', borderBottom: '0.5px solid var(--color-border-tertiary)' };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)' }}>Resultados</div>
        <div style={{ marginTop: 4, fontSize: 14, color: 'var(--color-text-secondary)' }}>
          Clientes recuperados en el período seleccionado
        </div>
      </div>

      <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FFF8E1', color: '#854F0B', fontWeight: 600, fontSize: 13 }}>
        Datos de ejemplo — esta pestaña todavía no está conectada a un endpoint real (ver TODO en el código).
      </div>

      <div style={{
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        padding: '12px 16px',
        background: '#F8F7F4',
        borderRadius: 10,
        border: '0.5px solid var(--color-border-tertiary)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Desde</label>
          <input type="date" className="input" value={filtroDesde} onChange={(event) => setFiltroDesde(event.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hasta</label>
          <input type="date" className="input" value={filtroHasta} onChange={(event) => setFiltroHasta(event.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vendedor</label>
          <select className="input" value={filtroVendedor} onChange={(event) => setFiltroVendedor(event.target.value)}>
            <option value="">Todos</option>
            {vendedorOptions.map((vendedor) => <option key={vendedor} value={vendedor}>{vendedor}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Medio de pago</label>
          <select className="input" value={filtroMedioPago} onChange={(event) => setFiltroMedioPago(event.target.value)}>
            <option value="">Todos</option>
            {medioPagoOptions.map((medio) => <option key={medio} value={medio}>{medio}</option>)}
          </select>
        </div>
      </div>

      <div style={{
        background: '#E1F5EE',
        borderRadius: 12,
        padding: '14px 16px',
        maxWidth: 260
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0F6E56', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recuperados en el período</div>
        <div style={{ fontSize: 24, fontWeight: 600, color: '#0F6E56', marginTop: 8 }}>{filteredRows.length}</div>
      </div>

      <Panel title="Detalle" subtitle={`${filteredRows.length} de ${rows.length} registros`}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={thStyle}>Contacto</th>
                <th style={thStyle}>Vendedor</th>
                <th style={thStyle}>Medio de pago</th>
                <th style={thStyle}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{asText(row.contacto)}</td>
                  <td style={tdStyle}>{asText(row.vendedor)}</td>
                  <td style={tdStyle}>{asText(row.medioPago)}</td>
                  <td style={tdStyle}>{row.fecha ? formatDate(row.fecha) : '—'}</td>
                </tr>
              ))}
              {!filteredRows.length ? (
                <tr><td colSpan={4} style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>No hay resultados para los filtros seleccionados.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
