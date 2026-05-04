import React from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { getApiClient } from '../services/apiClient.js';

const PERIODOS = [
  { value: 'mes', label: 'Este mes' },
  { value: 'semana', label: 'Últimos 7 días' },
  { value: 'dia', label: 'Hoy' }
];

const ORIGENES = [
  { value: 'todos', label: 'Todos los orígenes' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'referido', label: 'Referido' }
];

function safeNumber(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPercent(value) {
  const numeric = safeNumber(value);
  if (numeric === null) return '0.0%';
  return `${numeric.toFixed(1)}%`;
}

function getInitials(nombre, apellido) {
  const parts = [nombre, apellido].filter(Boolean).join(' ').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
  return (first + last).toUpperCase();
}

function MetricCard({ label, value, valueColor, subtitle }) {
  return (
    <div style={{
      background: 'var(--color-background-secondary, rgba(15,23,42,0.04))',
      borderRadius: 16,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      minHeight: 78
    }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary, #64748b)', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, lineHeight: '32px', fontWeight: 800, color: valueColor }}>
        {value ?? '-'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary, #94a3b8)', minHeight: 16 }}>
        {subtitle || '\u00A0'}
      </div>
    </div>
  );
}

export default function CampanasRedesModule() {
  const [periodo, setPeriodo] = React.useState('mes');
  const [origen, setOrigen] = React.useState('facebook');
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [dailyOpen, setDailyOpen] = React.useState(false);
  const [leads, setLeads] = React.useState([]);
  const [leadsLoading, setLeadsLoading] = React.useState(false);
  const [leadsTotal, setLeadsTotal] = React.useState(0);
  const [leadsPage, setLeadsPage] = React.useState(1);
  const LEADS_LIMIT = 50;

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const api = getApiClient();
      const params = new URLSearchParams();
      if (periodo) params.set('periodo', periodo);
      if (origen && origen !== 'todos') params.set('origen_dato', origen);
      const qs = params.toString();
      const res = await api.get(`/campanas/stats${qs ? `?${qs}` : ''}`);
      setData(res);
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar las métricas.');
    } finally {
      setLoading(false);
    }
  }, [periodo, origen]);

  React.useEffect(() => { load(); }, [load]);

  const metricas = data?.metricas || {};
  const porDia = data?.por_dia || [];
  const porVendedor = data?.por_vendedor || [];

  const total = safeNumber(metricas.total) ?? 0;
  const convertidos = safeNumber(metricas.convertidos) ?? 0;
  const monthConversionPercent = total > 0 ? (convertidos / total) * 100 : 0;

  const sinAsignarTotal =
    safeNumber(data?.sin_asignar?.total) ??
    safeNumber(data?.sin_asignar_total) ??
    safeNumber(data?.unassigned_total) ??
    0;

  const loadLeads = React.useCallback(async (page = 1) => {
    setLeadsLoading(true);
    try {
      const api = getApiClient();
      const params = new URLSearchParams();
      if (origen && origen !== 'todos') params.set('origen_dato', origen);
      params.set('page', String(page));
      params.set('limit', String(LEADS_LIMIT));
      const res = await api.get(`/campanas/leads?${params.toString()}`);
      setLeads(res?.items || []);
      setLeadsTotal(safeNumber(res?.total) ?? 0);
      setLeadsPage(page);
    } catch (err) {
      console.error('Error cargando leads:', err);
    } finally {
      setLeadsLoading(false);
    }
  }, [origen]);

  React.useEffect(() => { loadLeads(1); }, [loadLeads]);

  const periodoLabel = periodo === 'dia'
    ? 'Hoy'
    : periodo === 'semana'
      ? 'Últimos 7 días'
      : 'Este mes';

  return (
    <div className="view">
      <section className="hero" style={{ gridTemplateColumns: '1fr' }}>
        <div className="hero-panel" style={{ width: '100%', display: 'block' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.2px' }}>Datos calientes</div>
              <div style={{ color: 'var(--color-text-secondary, #64748b)', fontSize: 12, marginTop: 2 }}>
                Vista supervisor · métricas de leads por origen
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {PERIODOS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPeriodo(p.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 12,
                      border: `1px solid ${periodo === p.value ? 'var(--color-border-primary, rgba(15,118,110,0.55))' : 'var(--color-border-tertiary, rgba(15,23,42,0.12))'}`,
                      background: periodo === p.value ? 'var(--color-background-secondary, rgba(15,23,42,0.04))' : 'transparent',
                      color: 'var(--color-text-primary, #0f172a)',
                      fontSize: 13,
                      fontWeight: 700
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div style={{ position: 'relative' }}>
                <select
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value)}
                  style={{
                    appearance: 'none',
                    padding: '8px 36px 8px 12px',
                    borderRadius: 12,
                    border: '1px solid var(--color-border-tertiary, rgba(15,23,42,0.12))',
                    background: 'transparent',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--color-text-primary, #0f172a)'
                  }}
                >
                  {ORIGENES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <ChevronDown size={16} color="var(--color-text-secondary, #64748b)" />
                </div>
              </div>

              <button
                onClick={load}
                style={{
                  padding: '8px 12px',
                  borderRadius: 12,
                  border: '1px solid var(--color-border-tertiary, rgba(15,23,42,0.12))',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--color-text-primary, #0f172a)'
                }}
                title="Actualizar"
              >
                <RefreshCw size={16} />
                Actualizar
              </button>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, color: '#A32D2D', fontWeight: 700 }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>Resumen del mes</div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 10
            }}>
              <MetricCard label="Total del mes" value={metricas.total ?? '-'} valueColor="var(--color-text-primary, #0f172a)" subtitle="" />
              <MetricCard label="Sin gestión" value={metricas.sin_gestion ?? metricas.sin_gestion_total ?? '-'} valueColor="var(--color-text-secondary, #64748b)" subtitle="" />
              <MetricCard label="No contesta" value={metricas.no_contesta ?? '-'} valueColor="#854F0B" subtitle="" />
              <MetricCard label="Rechazados" value={metricas.rechazados ?? '-'} valueColor="#A32D2D" subtitle="" />
              <MetricCard label="En proceso" value={metricas.en_proceso ?? metricas.en_proceso_total ?? '-'} valueColor="#854F0B" subtitle="seguimientos + rellamar" />
              <MetricCard label="Convertidos" value={metricas.convertidos ?? '-'} valueColor="#0F6E56" subtitle={`${formatPercent(monthConversionPercent)} conversión`} />
              <MetricCard label="Bloqueados" value={metricas.bloqueados ?? '-'} valueColor="var(--color-text-secondary, #64748b)" subtitle="duplicados + ya clientes" />
            </div>
          </div>

          <div style={{ height: 0.5, background: 'var(--color-border-tertiary, rgba(15,23,42,0.12))', margin: '18px 0' }} />

          <div>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>Vendedores</div>

            <div style={{ overflowX: 'auto' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                gap: 10,
                padding: '0 2px',
                marginBottom: 8,
                minWidth: 640
              }}>
                {['Vendedor', 'Total leads', 'Sin gestión', 'Convertidos'].map((h) => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary, #94a3b8)' }}>
                    {h}
                  </div>
                ))}
              </div>

              {loading ? (
                <div style={{ padding: 14, color: 'var(--color-text-secondary, #64748b)' }}>Cargando...</div>
              ) : !porVendedor.length ? (
                <div style={{ padding: 14, color: 'var(--color-text-secondary, #64748b)' }}>Sin datos para el período seleccionado</div>
              ) : (
                <div style={{ display: 'grid', gap: 10, minWidth: 640 }}>
                  {porVendedor.map((v, idx) => {
                    const vendorTotal = safeNumber(v.total) ?? 0;
                    const vendorSinGestion = safeNumber(v.sin_gestion) ?? null;
                    const vendorConvertidos = safeNumber(v.convertidos) ?? 0;
                    const vendorConvPercent = vendorTotal > 0 ? (vendorConvertidos / vendorTotal) * 100 : 0;
                    const badgeBg = vendorConvPercent >= 5 ? 'rgba(21,128,61,0.10)' : 'rgba(133,79,11,0.12)';
                    const badgeColor = vendorConvPercent >= 5 ? 'var(--success, #15803d)' : '#854F0B';

                    return (
                      <div
                        key={v.id || `${v.nombre || ''}-${v.apellido || ''}-${idx}`}
                        style={{
                          border: '0.5px solid var(--color-border-tertiary, rgba(15,23,42,0.12))',
                          borderRadius: 18,
                          padding: '14px 16px',
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr 1fr 1fr',
                          gap: 10,
                          alignItems: 'center',
                          background: 'var(--panel, rgba(255,255,255,0.76))'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 999,
                            background: '#CECBF6',
                            color: '#3C3489',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: 14,
                            flexShrink: 0
                          }}>
                            {getInitials(v.nombre, v.apellido)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontWeight: 800,
                              fontSize: 14,
                              color: 'var(--color-text-primary, #0f172a)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {[v.nombre, v.apellido].filter(Boolean).join(' ') || '—'}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary, #94a3b8)', marginTop: 2 }}>
                              {v.rol || 'Vendedor'}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text-primary, #0f172a)' }}>
                            {vendorTotal}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary, #94a3b8)', fontWeight: 700 }}>
                            asignados
                          </div>
                        </div>

                        <div style={{ fontSize: 18, fontWeight: 900, color: '#854F0B' }}>
                          {vendorSinGestion === null ? '—' : vendorSinGestion}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--success, #15803d)' }}>
                            {vendorConvertidos}
                          </div>
                          <div style={{
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: badgeBg,
                            color: badgeColor,
                            fontSize: 12,
                            fontWeight: 900,
                            whiteSpace: 'nowrap'
                          }}>
                            {formatPercent(vendorConvPercent)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div style={{
                    border: '0.5px dashed var(--color-border-tertiary, rgba(15,23,42,0.18))',
                    borderRadius: 18,
                    padding: '14px 16px',
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    gap: 10,
                    alignItems: 'center',
                    background: 'transparent'
                  }}>
                    <div style={{ fontWeight: 800, color: 'var(--color-text-primary, #0f172a)' }}>
                      Sin asignar
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text-primary, #0f172a)' }}>
                      {sinAsignarTotal}
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary, #94a3b8)', fontWeight: 700 }}>asignados</div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#854F0B' }}>—</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--success, #15803d)' }}>—</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ height: 0.5, background: 'var(--color-border-tertiary, rgba(15,23,42,0.12))', margin: '18px 0' }} />

          <div style={{
            border: '0.5px solid var(--color-border-tertiary, rgba(15,23,42,0.12))',
            borderRadius: 18,
            background: 'var(--panel, rgba(255,255,255,0.76))',
            overflow: 'hidden'
          }}>
            <button
              type="button"
              onClick={() => setDailyOpen((p) => !p)}
              style={{
                width: '100%',
                border: 0,
                background: 'transparent',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                textAlign: 'left',
                borderBottom: dailyOpen ? '0.5px solid var(--color-border-tertiary, rgba(15,23,42,0.12))' : 'none'
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Ingresos por día</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary, #94a3b8)', marginTop: 2 }}>{periodoLabel}</div>
              </div>
              <div style={{ transform: dailyOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 140ms ease' }}>
                <ChevronDown size={18} color="var(--color-text-secondary, #64748b)" />
              </div>
            </button>
            {dailyOpen && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 620 }}>
                <thead>
                  <tr style={{ background: 'rgba(15,23,42,0.02)' }}>
                    {['Fecha', 'Total', 'Bloqueados', 'Convertidos'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '10px 14px',
                          textAlign: h === 'Fecha' ? 'left' : 'right',
                          color: 'var(--color-text-tertiary, #94a3b8)',
                          fontWeight: 800,
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: 0.8,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} style={{ padding: 16, color: 'var(--color-text-secondary, #64748b)' }}>Cargando...</td>
                    </tr>
                  ) : !porDia.length ? (
                    <tr>
                      <td colSpan={4} style={{ padding: 16, color: 'var(--color-text-secondary, #64748b)' }}>Sin datos para el período seleccionado</td>
                    </tr>
                  ) : (
                    porDia.map((row, i) => (
                      <tr key={row.fecha || i} style={{ borderTop: '0.5px solid var(--color-border-tertiary, rgba(15,23,42,0.10))' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {row.fecha
                            ? new Date(row.fecha).toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Montevideo' })
                            : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 900 }}>
                          {safeNumber(row.total) ?? 0}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--color-text-secondary, #64748b)', fontWeight: 800 }}>
                          {safeNumber(row.bloqueados) ?? 0}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--success, #15803d)', fontWeight: 900 }}>
                          {safeNumber(row.convertidos) ?? 0}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            )}
          </div>

          <div style={{ height: 0.5, background: 'var(--color-border-tertiary, rgba(15,23,42,0.12))', margin: '18px 0' }} />

          <div style={{
            border: '0.5px solid var(--color-border-tertiary, rgba(15,23,42,0.12))',
            borderRadius: 18,
            background: 'var(--panel, rgba(255,255,255,0.76))',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '0.5px solid var(--color-border-tertiary, rgba(15,23,42,0.12))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap'
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Detalle de leads</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary, #94a3b8)', marginTop: 2 }}>
                  {leadsTotal} leads totales
                </div>
              </div>

              {leadsTotal > LEADS_LIMIT && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ color: 'var(--color-text-secondary, #64748b)', fontSize: 12, fontWeight: 700 }}>
                    Página {leadsPage} de {Math.max(1, Math.ceil(leadsTotal / LEADS_LIMIT))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => loadLeads(leadsPage - 1)}
                      disabled={leadsPage === 1 || leadsLoading}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 12,
                        border: '1px solid var(--color-border-tertiary, rgba(15,23,42,0.12))',
                        background: 'transparent',
                        fontSize: 13,
                        fontWeight: 800,
                        opacity: leadsPage === 1 || leadsLoading ? 0.5 : 1
                      }}
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => loadLeads(leadsPage + 1)}
                      disabled={leadsPage >= Math.ceil(leadsTotal / LEADS_LIMIT) || leadsLoading}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 12,
                        border: '1px solid var(--color-border-tertiary, rgba(15,23,42,0.12))',
                        background: 'transparent',
                        fontSize: 13,
                        fontWeight: 800,
                        opacity: leadsPage >= Math.ceil(leadsTotal / LEADS_LIMIT) || leadsLoading ? 0.5 : 1
                      }}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 980 }}>
                <thead>
                  <tr style={{ background: 'rgba(15,23,42,0.02)' }}>
                    {['Nombre', 'Teléfono', 'Email', 'Origen', 'Estado', 'Motivo', 'Gestión', 'Intentos', 'Último intento', 'Vendedor', 'Ingreso'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '10px 12px',
                          textAlign: 'left',
                          color: 'var(--color-text-tertiary, #94a3b8)',
                          fontWeight: 800,
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: 0.8,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leadsLoading ? (
                    <tr>
                      <td colSpan={11} style={{ padding: 16, color: 'var(--color-text-secondary, #64748b)' }}>Cargando leads...</td>
                    </tr>
                  ) : !leads.length ? (
                    <tr>
                      <td colSpan={11} style={{ padding: 16, color: 'var(--color-text-secondary, #64748b)' }}>Sin leads</td>
                    </tr>
                  ) : (
                    leads.map((lead, idx) => {
                      const estado = String(lead.estado || '').toLowerCase();
                      const gestion = String(lead.estado_venta || '').toLowerCase();
                      const estadoColor = estado.includes('convert')
                        ? 'var(--success, #15803d)'
                        : estado.includes('rechaz')
                          ? '#A32D2D'
                          : estado.includes('no contesta')
                            ? '#854F0B'
                            : 'var(--color-text-secondary, #64748b)';
                      const gestionColor = gestion.includes('sin')
                        ? 'var(--color-text-secondary, #64748b)'
                        : gestion.includes('seguim') || gestion.includes('rellam')
                          ? '#854F0B'
                          : gestion.includes('venta') || gestion.includes('convert')
                            ? 'var(--success, #15803d)'
                            : 'var(--color-text-secondary, #64748b)';

                      return (
                        <tr key={lead.id || idx} style={{ borderTop: '0.5px solid var(--color-border-tertiary, rgba(15,23,42,0.10))' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 800, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lead.nombre || '—'} {lead.apellido || ''}
                          </td>
                          <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary, #64748b)', whiteSpace: 'nowrap' }}>
                            {lead.telefono || '—'}
                          </td>
                          <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary, #64748b)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lead.email || '—'}
                          </td>
                          <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary, #64748b)', whiteSpace: 'nowrap' }}>
                            {lead.origen_dato || '—'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              background: 'rgba(15,23,42,0.04)',
                              color: estadoColor,
                              borderRadius: 999,
                              padding: '2px 8px',
                              fontSize: 11,
                              fontWeight: 900,
                              whiteSpace: 'nowrap'
                            }}>
                              {lead.estado || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            {lead.motivo_bloqueo === 'duplicado'
                              ? <span style={{ background: 'rgba(133,79,11,0.12)', color: '#854F0B', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 900 }}>Duplicado</span>
                              : lead.motivo_bloqueo === 'cliente_existente'
                                ? <span style={{ background: 'rgba(163,45,45,0.12)', color: '#A32D2D', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 900 }}>Cliente</span>
                                : <span style={{ color: 'var(--color-text-tertiary, #94a3b8)' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              background: 'rgba(15,23,42,0.04)',
                              color: gestionColor,
                              borderRadius: 999,
                              padding: '2px 8px',
                              fontSize: 11,
                              fontWeight: 900,
                              whiteSpace: 'nowrap'
                            }}>
                              {lead.estado_venta || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-text-secondary, #64748b)', fontWeight: 800 }}>
                            {lead.intentos ?? '—'}
                          </td>
                          <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary, #64748b)', whiteSpace: 'nowrap' }}>
                            {lead.last_gestion_at
                              ? new Date(lead.last_gestion_at).toLocaleDateString('es-UY', { timeZone: 'America/Montevideo' })
                              : '—'}
                          </td>
                          <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary, #64748b)', whiteSpace: 'nowrap' }}>
                            {lead.assigned_to_name || '—'}
                          </td>
                          <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary, #64748b)', whiteSpace: 'nowrap' }}>
                            {lead.created_at
                              ? new Date(lead.created_at).toLocaleString('es-UY', { timeZone: 'America/Montevideo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
