import React from 'react';
import {
  BarChart3, TrendingUp, Users, XCircle,
  PhoneOff, AlertTriangle, RefreshCw, ChevronDown
} from 'lucide-react';
import { getApiClient } from '../services/apiClient.js';

const PERIODOS = [
  { value: 'dia', label: 'Hoy' },
  { value: 'semana', label: 'Ultimos 7 dias' },
  { value: 'mes', label: 'Ultimos 30 dias' }
];

const ORIGENES = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'referido', label: 'Referido' }
];

function MetricaTarjeta({ label, value, color, icon: Icon, sub }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      border: '1px solid rgba(15,23,42,0.08)',
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
          {label}
        </span>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>
        {value ?? '-'}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: '#94a3b8' }}>{sub}</div>
      )}
    </div>
  );
}

export default function CampanasRedesModule() {
  const [periodo, setPeriodo] = React.useState('dia');
  const [origen, setOrigen] = React.useState('facebook');
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
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
      const res = await api.get(`/campanas/stats?periodo=${periodo}&origen_dato=${origen}`);
      setData(res);
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar las metricas.');
    } finally {
      setLoading(false);
    }
  }, [periodo, origen]);

  const loadLeads = React.useCallback(async (page = 1) => {
    setLeadsLoading(true);
    try {
      const api = getApiClient();
      const res = await api.get(`/campanas/leads?origen_dato=${origen}&page=${page}&limit=${LEADS_LIMIT}`);
      setLeads(res?.items || []);
      setLeadsTotal(res?.total || 0);
      setLeadsPage(page);
    } catch (err) {
      console.error('Error loading leads:', err);
    } finally {
      setLeadsLoading(false);
    }
  }, [origen]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { loadLeads(1); }, [loadLeads]);

  const m = data?.metricas || {};
  const porDia = data?.por_dia || [];
  const porVendedor = data?.por_vendedor || [];

  const conversionRate = m.total > 0
    ? ((Number(m.convertidos || 0) / Number(m.total)) * 100).toFixed(1)
    : '0.0';

  const bloqueadoRate = m.total > 0
    ? ((Number(m.bloqueados || 0) / Number(m.total)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="view">
      {/* Hero */}
      <section className="hero">
        <div className="hero-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 10, fontWeight: 700, letterSpacing: 1,
                textTransform: 'uppercase', color: '#0f766e',
                background: 'rgba(15,118,110,0.1)', borderRadius: 999,
                padding: '4px 10px', marginBottom: 10
              }}>
                <BarChart3 size={11} />
                Campanas de redes
              </div>
              <h1 className="hero-title">Monitor de campanas</h1>
              <p className="hero-copy">Medicion en tiempo real de leads, conversiones y gestion por vendedor.</p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10,
                border: '1px solid rgba(15,23,42,0.12)',
                background: '#fff', cursor: loading ? 'wait' : 'pointer',
                fontSize: 13, fontWeight: 600, color: '#475569'
              }}
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Actualizar
            </button>
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.8)', borderRadius: 12, border: '1px solid rgba(15,23,42,0.08)', overflow: 'hidden' }}>
              {PERIODOS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriodo(p.value)}
                  style={{
                    padding: '8px 16px', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600,
                    background: periodo === p.value ? '#0f766e' : 'transparent',
                    color: periodo === p.value ? '#fff' : '#64748b',
                    transition: 'all 140ms'
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
                  padding: '8px 32px 8px 12px',
                  borderRadius: 12, border: '1px solid rgba(15,23,42,0.12)',
                  background: '#fff', fontSize: 13, fontWeight: 600,
                  color: '#475569', cursor: 'pointer', appearance: 'none'
                }}
              >
                {ORIGENES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={14} color="#94a3b8" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>
      </section>

      <div style={{ padding: '0 24px 24px' }}>
        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 12, padding: 12, color: '#dc2626', fontSize: 13, marginBottom: 20
          }}>
            {error}
          </div>
        )}

        {/* Metricas principales */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12, marginBottom: 24
        }}>
          <MetricaTarjeta label="Total leads" value={m.total} color="#0f766e" icon={Users}
            sub={`${bloqueadoRate}% bloqueados`} />
          <MetricaTarjeta label="Nuevos" value={m.nuevos} color="#2563eb" icon={TrendingUp}
            sub="Listos para gestionar" />
          <MetricaTarjeta label="Convertidos" value={m.convertidos} color="#15803d" icon={TrendingUp}
            sub={`${conversionRate}% conversion`} />
          <MetricaTarjeta label="No contesta" value={m.no_contesta} color="#d97706" icon={PhoneOff} />
          <MetricaTarjeta label="Rechazados" value={m.rechazados} color="#dc2626" icon={XCircle} />
          <MetricaTarjeta label="Bloqueados" value={m.bloqueados} color="#6b7280" icon={AlertTriangle}
            sub="Duplicados + ya clientes" />
        </div>

        {/* Tabla por dia */}
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid rgba(15,23,42,0.08)',
          overflow: 'hidden', marginBottom: 24
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Ingresos por dia</div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>Ultimos 30 dias</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Fecha</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Total</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Bloqueados</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Convertidos</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Cargando...</td>
                  </tr>
                )}
                {!loading && !porDia.length && (
                  <tr>
                    <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Sin datos para el periodo seleccionado</td>
                  </tr>
                )}
                {porDia.map((row, i) => (
                  <tr key={i} style={{ borderTop: '1px solid rgba(15,23,42,0.05)' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600 }}>
                      {new Date(row.fecha).toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Montevideo' })}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>{row.total}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#6b7280' }}>{row.bloqueados}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#15803d', fontWeight: 600 }}>{row.convertidos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla por vendedor */}
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid rgba(15,23,42,0.08)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Gestion por vendedor</div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>Distribucion y resultados del periodo</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Vendedor</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Asignados</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Convertidos</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>No contesta</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Rechazados</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>% Conversion</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Cargando...</td>
                  </tr>
                )}
                {!loading && !porVendedor.length && (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Sin datos para el periodo seleccionado</td>
                  </tr>
                )}
                {porVendedor.map((v, i) => {
                  const conv = v.total > 0 ? ((Number(v.convertidos) / Number(v.total)) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={i} style={{ borderTop: '1px solid rgba(15,23,42,0.05)' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 600 }}>
                        {[v.nombre, v.apellido].filter(Boolean).join(' ')}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>{v.total}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#15803d', fontWeight: 600 }}>{v.convertidos}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#d97706' }}>{v.no_contesta}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#dc2626' }}>{v.rechazados}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <span style={{
                          background: Number(conv) >= 10 ? 'rgba(21,128,61,0.1)' : 'rgba(15,23,42,0.06)',
                          color: Number(conv) >= 10 ? '#15803d' : '#475569',
                          borderRadius: 999, padding: '2px 8px',
                          fontSize: 12, fontWeight: 700
                        }}>
                          {conv}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla de leads */}
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid rgba(15,23,42,0.08)',
          overflow: 'hidden', marginTop: 24
        }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid rgba(15,23,42,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Detalle de leads</div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                {leadsTotal} leads totales
              </div>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Nombre', 'Teléfono', 'Email', 'F. Nacimiento', 'Estado', 'Gestión', 'Intentos', 'Último intento', 'Vendedor', 'Ingreso'].map((h) => (
                    <th key={h} style={{
                      padding: '10px 12px', textAlign: 'left',
                      color: '#64748b', fontWeight: 600,
                      fontSize: 11, textTransform: 'uppercase',
                      letterSpacing: 1, whiteSpace: 'nowrap'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leadsLoading && (
                  <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Cargando...</td></tr>
                )}
                {!leadsLoading && !leads.length && (
                  <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Sin datos</td></tr>
                )}
                {leads.map((lead) => {
                  const estadoColor = {
                    nuevo: '#2563eb', bloqueado: '#6b7280', trabajado: '#15803d'
                  }[lead.estado] || '#475569';
                  const gestionColor = {
                    venta: '#15803d', no_contesta: '#d97706',
                    rechazo: '#dc2626', nuevo: '#2563eb'
                  }[lead.estado_venta] || '#475569';
                  return (
                    <tr key={lead.id} style={{ borderTop: '1px solid rgba(15,23,42,0.05)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {[lead.nombre, lead.apellido].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>
                        {lead.telefono || lead.celular || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lead.email || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569', whiteSpace: 'nowrap' }}>
                        {lead.fecha_nacimiento
                          ? new Date(lead.fecha_nacimiento).toLocaleDateString('es-UY', { timeZone: 'UTC' })
                          : '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          background: `${estadoColor}18`, color: estadoColor,
                          borderRadius: 999, padding: '2px 8px',
                          fontSize: 11, fontWeight: 700
                        }}>
                          {lead.estado || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          background: `${gestionColor}18`, color: gestionColor,
                          borderRadius: 999, padding: '2px 8px',
                          fontSize: 11, fontWeight: 700
                        }}>
                          {lead.estado_venta || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569' }}>
                        {lead.intentos ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569', whiteSpace: 'nowrap' }}>
                        {lead.ultimo_intento_at
                          ? new Date(lead.ultimo_intento_at).toLocaleDateString('es-UY', { timeZone: 'America/Montevideo' })
                          : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569', whiteSpace: 'nowrap' }}>
                        {[lead.vendedor_nombre, lead.vendedor_apellido].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569', whiteSpace: 'nowrap' }}>
                        {new Date(lead.created_at).toLocaleDateString('es-UY', { timeZone: 'America/Montevideo' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Paginación */}
          {leadsTotal > LEADS_LIMIT && (
            <div style={{
              padding: '12px 20px', borderTop: '1px solid rgba(15,23,42,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ color: '#64748b', fontSize: 13 }}>
                Página {leadsPage} de {Math.ceil(leadsTotal / LEADS_LIMIT)}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => loadLeads(leadsPage - 1)}
                  disabled={leadsPage === 1}
                  style={{
                    padding: '6px 14px', borderRadius: 8,
                    border: '1px solid rgba(15,23,42,0.12)',
                    background: '#fff', cursor: leadsPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: leadsPage === 1 ? 0.5 : 1, fontSize: 13
                  }}
                >
                  Anterior
                </button>
                <button
                  onClick={() => loadLeads(leadsPage + 1)}
                  disabled={leadsPage >= Math.ceil(leadsTotal / LEADS_LIMIT)}
                  style={{
                    padding: '6px 14px', borderRadius: 8,
                    border: '1px solid rgba(15,23,42,0.12)',
                    background: '#fff', cursor: leadsPage >= Math.ceil(leadsTotal / LEADS_LIMIT) ? 'not-allowed' : 'pointer',
                    opacity: leadsPage >= Math.ceil(leadsTotal / LEADS_LIMIT) ? 0.5 : 1, fontSize: 13
                  }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
