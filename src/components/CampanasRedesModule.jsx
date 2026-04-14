import React from 'react';
import {
  BarChart3, TrendingUp, Users, XCircle,
  PhoneOff, AlertTriangle, RefreshCw, ChevronDown
} from 'lucide-react';
import { getApiClient } from '../services/apiClient.js';

const PERIODOS = [
  { value: 'dia', label: 'Hoy' },
  { value: 'semana', label: 'Últimos 7 días' },
  { value: 'mes', label: 'Últimos 30 días' }
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
        {value ?? '—'}
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

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const api = getApiClient();
      const res = await api.get(`/campanas/stats?periodo=${periodo}&origen_dato=${origen}`);
      setData(res);
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar las métricas.');
    } finally {
      setLoading(false);
    }
  }, [periodo, origen]);

  React.useEffect(() => { load(); }, [load]);

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
                Campañas de redes
              </div>
              <h1 className="hero-title">Monitor de campañas</h1>
              <p className="hero-copy">Medición en tiempo real de leads, conversiones y gestión por vendedor.</p>
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

        {/* Métricas principales */}
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
            sub={`${conversionRate}% conversión`} />
          <MetricaTarjeta label="No contesta" value={m.no_contesta} color="#d97706" icon={PhoneOff} />
          <MetricaTarjeta label="Rechazados" value={m.rechazados} color="#dc2626" icon={XCircle} />
          <MetricaTarjeta label="Bloqueados" value={m.bloqueados} color="#6b7280" icon={AlertTriangle}
            sub="Duplicados + ya clientes" />
        </div>

        {/* Tabla por día */}
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid rgba(15,23,42,0.08)',
          overflow: 'hidden', marginBottom: 24
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Ingresos por día</div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>Últimos 30 días</div>
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
                    <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Sin datos para el período seleccionado</td>
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
            <div style={{ fontWeight: 700, fontSize: 15 }}>Gestión por vendedor</div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>Distribución y resultados del período</div>
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
                  <th style={{ padding: '10px 16px', textAlign: 'right', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>% Conversión</th>
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
                    <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Sin datos para el período seleccionado</td>
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
      </div>
    </div>
  );
}
