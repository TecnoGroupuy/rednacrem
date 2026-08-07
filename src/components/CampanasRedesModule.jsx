import React from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { getApiClient } from '../services/apiClient.js';

function formatOrigenLabel(origen) {
  const str = String(origen || '').trim();
  if (!str) return '—';
  const lower = str.toLowerCase();
  const explicit = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    whatsapp: 'WhatsApp',
    web_form: 'Formulario web'
  };
  if (explicit[lower]) return explicit[lower];
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

const PERIODOS = [
  { value: '', label: 'Todos' },
  { value: 'mes', label: 'Este mes' },
  { value: 'semana', label: 'Últimos 7 días' },
  { value: 'dia', label: 'Hoy' }
];

const ORIGENES = [
  { value: 'todos', label: 'Todos los canales' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'web_form', label: 'Formulario web' }
];

const LEADS_TABLE_COLUMNS = [
  { key: 'fecha_solicitud', label: 'F. Solicitud' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'email', label: 'Email' },
  { key: 'canal', label: 'Canal' },
  { key: 'campana', label: 'Campaña' },
  { key: 'estado', label: 'Estado' },
  { key: 'motivo', label: 'Motivo' },
  { key: 'gestion', label: 'Gestión' },
  { key: 'intentos', label: 'Intentos' },
  { key: 'ultimo_intento', label: 'Último intento' },
  { key: 'vendedor', label: 'Vendedor' }
];

const BADGE_STYLE = {
  padding: '2px 8px',
  borderRadius: 'var(--radius)',
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: 'nowrap'
};

const CAMPAIGN_BADGE_COLORS = [
  { bg: '#EEEDFE', text: '#3C3489' },
  { bg: '#E1F5EE', text: '#085041' },
  { bg: '#FAECE7', text: '#712B13' },
  { bg: '#FBEAF0', text: '#72243E' }
];

const ESTADO_BADGE_MAP = {
  bloqueado: { bg: 'var(--bg-danger, rgba(163,45,45,0.12))', text: 'var(--text-danger, #A32D2D)' },
  nuevo: { bg: 'var(--bg-accent, rgba(59,130,246,0.12))', text: 'var(--text-accent, #1d4ed8)' },
  trabajado: { bg: 'var(--bg-warning, rgba(133,79,11,0.12))', text: 'var(--text-warning, #854F0B)' }
};

const MOTIVO_BADGE_MAP = {
  cliente_existente: { bg: 'var(--bg-danger, rgba(163,45,45,0.12))', text: 'var(--text-danger, #A32D2D)' },
  no_llamar: { bg: 'var(--bg-danger, rgba(163,45,45,0.12))', text: 'var(--text-danger, #A32D2D)' },
  rechazo: { bg: 'var(--bg-danger, rgba(163,45,45,0.12))', text: 'var(--text-danger, #A32D2D)' },
  duplicado: { bg: 'var(--bg-warning, rgba(133,79,11,0.12))', text: 'var(--text-warning, #854F0B)' },
  reemplazado: { bg: 'var(--surface-1, rgba(15,23,42,0.06))', text: 'var(--text-secondary, #64748b)' }
};

const GESTION_BADGE_MAP = {
  venta: { bg: 'var(--bg-success, rgba(21,128,61,0.12))', text: 'var(--text-success, #15803d)' },
  rechazo: { bg: 'var(--bg-danger, rgba(163,45,45,0.12))', text: 'var(--text-danger, #A32D2D)' },
  no_contesta: { bg: 'var(--bg-warning, rgba(133,79,11,0.12))', text: 'var(--text-warning, #854F0B)' },
  rellamar: { bg: 'var(--bg-warning, rgba(133,79,11,0.12))', text: 'var(--text-warning, #854F0B)' },
  seguimiento: { bg: 'var(--bg-warning, rgba(133,79,11,0.12))', text: 'var(--text-warning, #854F0B)' },
  nuevo: { bg: 'var(--bg-accent, rgba(59,130,246,0.12))', text: 'var(--text-accent, #1d4ed8)' }
};

const NEUTRAL_BADGE_STYLE = {
  bg: 'var(--surface-1, rgba(15,23,42,0.06))',
  text: 'var(--text-secondary, #64748b)'
};

function buildLeadCellStyle(overrides = {}) {
  return {
    padding: '10px 12px',
    ...overrides
  };
}

function getBadgeTone(map, value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  return map[normalized] || NEUTRAL_BADGE_STYLE;
}

function getCampaignBadgeTone(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash += normalized.charCodeAt(i);
  }
  return CAMPAIGN_BADGE_COLORS[hash % CAMPAIGN_BADGE_COLORS.length];
}

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
  const [periodo, setPeriodo] = React.useState('');
  const [origen, setOrigen] = React.useState('todos');
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
      const originValue = String(origen || '').trim();
      if (originValue && originValue.toLowerCase() !== 'todos') params.set('origen_dato', originValue);
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

  const total = safeNumber(metricas.total) ?? 0;
  const convertidos = safeNumber(metricas.convertidos) ?? 0;
  const monthConversionPercent = total > 0 ? (convertidos / total) * 100 : 0;

  const [leadsPhoneQuery, setLeadsPhoneQuery] = React.useState('');
  const [leadsPhoneQueryDebounced, setLeadsPhoneQueryDebounced] = React.useState('');

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setLeadsPhoneQueryDebounced(String(leadsPhoneQuery || '').trim());
    }, 500);

    return () => clearTimeout(handle);
  }, [leadsPhoneQuery]);

  // Nota: sección "Vendedores" removida; ya no se usan métricas "sin asignar" aquí.

  const loadLeads = React.useCallback(async (page = 1, telefono = leadsPhoneQueryDebounced) => {
    setLeadsLoading(true);
    try {
      const api = getApiClient();
      const params = new URLSearchParams();
      const originValue = String(origen || '').trim();
      if (originValue && originValue.toLowerCase() !== 'todos') params.set('origen_dato', originValue.toLowerCase());
      const telefonoValue = String(telefono || '').trim();
      if (telefonoValue) params.set('telefono', telefonoValue);
      if (periodo) params.set('periodo', String(periodo));
      params.set('sort', 'fecha_lead');
      params.set('dir', 'desc');
      params.set('page', String(page));
      params.set('limit', String(LEADS_LIMIT));
      const res = await api.get(`/campanas/leads?${params.toString()}`);
      setLeads(res?.items ?? res?.data?.items ?? []);
      setLeadsTotal(safeNumber(res?.total ?? res?.data?.total) ?? 0);
      setLeadsPage(page);
    } catch (err) {
      console.error('Error cargando leads:', err);
    } finally {
      setLeadsLoading(false);
    }
  }, [origen, periodo, leadsPhoneQueryDebounced]);

  React.useEffect(() => { loadLeads(1); }, [loadLeads]);

  const periodoLabel = !periodo
    ? 'Todos'
    : periodo === 'dia'
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
                Vista supervisor · métricas de leads por canal
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {PERIODOS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPeriodo((prev) => (prev === p.value ? '' : p.value))}
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
              <MetricCard label="Total" value={metricas.total ?? '-'} valueColor="var(--color-text-primary, #0f172a)" subtitle="" />
              <MetricCard label="Sin gestión" value={metricas.sin_gestion ?? metricas.sin_gestion_total ?? '-'} valueColor="var(--color-text-secondary, #64748b)" subtitle="" />
              <MetricCard label="No contesta" value={metricas.no_contesta ?? '-'} valueColor="#854F0B" subtitle="" />
              <MetricCard label="Rechazados" value={metricas.rechazados ?? '-'} valueColor="#A32D2D" subtitle="" />
              <MetricCard label="En proceso" value={metricas.en_proceso ?? metricas.en_proceso_total ?? '-'} valueColor="#854F0B" subtitle="seguimientos + rellamar" />
              <MetricCard label="Convertidos" value={metricas.convertidos ?? '-'} valueColor="#0F6E56" subtitle={`${formatPercent(monthConversionPercent)} conversión`} />
              <MetricCard label="Bloqueados" value={metricas.bloqueados ?? '-'} valueColor="var(--color-text-secondary, #64748b)" subtitle="duplicados + ya clientes" />
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>Detalle de leads</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary, #94a3b8)', marginTop: 2 }}>
                    {leadsTotal} leads totales
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await Promise.all([load(), loadLeads(1)]);
                  }}
                  disabled={loading || leadsLoading}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 12,
                    border: '1px solid var(--color-border-tertiary, rgba(15,23,42,0.12))',
                    background: 'transparent',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 800,
                    opacity: loading || leadsLoading ? 0.6 : 1
                  }}
                  title="Actualizar"
                >
                  <RefreshCw size={16} />
                  Actualizar
                </button>

                <div style={{ position: 'relative', minWidth: 260 }}>
                  <input
                    value={leadsPhoneQuery}
                    onChange={(e) => setLeadsPhoneQuery(e.target.value)}
                    placeholder="Buscar por teléfono..."
                    style={{
                      width: '100%',
                      padding: '8px 34px 8px 12px',
                      borderRadius: 12,
                      border: '1px solid var(--color-border-tertiary, rgba(15,23,42,0.12))',
                      fontSize: 13,
                      fontWeight: 700,
                      outline: 'none',
                      background: 'rgba(255,255,255,0.86)'
                    }}
                  />
                  {!!String(leadsPhoneQuery || '').trim() && (
                    <button
                      type="button"
                      onClick={async () => {
                        setLeadsPhoneQuery('');
                        setLeadsPhoneQueryDebounced('');
                        await loadLeads(1, '');
                      }}
                      aria-label="Limpiar búsqueda"
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--color-text-tertiary, #94a3b8)',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 900,
                        display: 'grid',
                        placeItems: 'center',
                        padding: 0
                      }}
                      title="Limpiar"
                    >
                      ✕
                    </button>
                  )}
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
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 1080 }}>
                <thead>
                  <tr style={{ background: 'rgba(15,23,42,0.02)' }}>
                    {LEADS_TABLE_COLUMNS.map((column) => (
                      <th
                        key={column.key}
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
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leadsLoading ? (
                    <tr>
                      <td colSpan={12} style={{ padding: 16, color: 'var(--color-text-secondary, #64748b)' }}>Cargando leads...</td>
                    </tr>
                  ) : !leads.length ? (
                    <tr>
                      <td colSpan={12} style={{ padding: 16, color: 'var(--color-text-secondary, #64748b)' }}>Sin leads</td>
                    </tr>
                  ) : (
                    leads.map((lead, idx) => {
                      const campaignValue = String(lead.campana_meta || '').trim();
                      const campaignTone = getCampaignBadgeTone(campaignValue);
                      const estadoTone = getBadgeTone(ESTADO_BADGE_MAP, lead.estado);
                      const motivoTone = getBadgeTone(MOTIVO_BADGE_MAP, lead.motivo_bloqueo);
                      const gestionTone = getBadgeTone(GESTION_BADGE_MAP, lead.estado_venta);

                      return (
                        <tr key={lead.id || idx} style={{ borderTop: '0.5px solid var(--color-border-tertiary, rgba(15,23,42,0.10))' }}>
                          <td style={buildLeadCellStyle({ color: 'var(--color-text-secondary, #64748b)', whiteSpace: 'nowrap' })}>
                            {(() => {
                              const fSolicitud = lead.fecha_lead || lead.created_at || null;
                              return fSolicitud
                                ? new Date(fSolicitud).toLocaleDateString('es-UY', { timeZone: 'America/Montevideo', day: '2-digit', month: '2-digit', year: 'numeric' })
                                : '—';
                            })()}
                          </td>
                          <td style={buildLeadCellStyle({ fontWeight: 800, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>
                            {lead.nombre || '—'} {lead.apellido || ''}
                          </td>
                          <td style={buildLeadCellStyle({ color: 'var(--color-text-secondary, #64748b)', whiteSpace: 'nowrap' })}>
                            {lead.telefono || lead.celular || '—'}
                          </td>
                          <td style={buildLeadCellStyle({ color: 'var(--color-text-secondary, #64748b)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>
                            {lead.email || '—'}
                          </td>
                          <td style={buildLeadCellStyle({ color: 'var(--text-secondary, var(--color-text-secondary, #64748b))', whiteSpace: 'nowrap' })}>
                            {formatOrigenLabel(lead.source_channel || lead.origen_dato)}
                          </td>
                          <td style={buildLeadCellStyle({ whiteSpace: 'nowrap' })}>
                            {!campaignValue ? (
                              <span style={{ color: 'var(--text-muted, var(--color-text-tertiary, #94a3b8))' }}>{'\u2014'}</span>
                            ) : (
                              <span
                                style={{
                                  ...BADGE_STYLE,
                                  background: campaignTone.bg,
                                  color: campaignTone.text
                                }}
                              >
                                {campaignValue}
                              </span>
                            )}
                          </td>
                          <td style={buildLeadCellStyle()}>
                            {!String(lead.estado || '').trim() ? (
                              <span style={{ color: 'var(--text-muted, var(--color-text-tertiary, #94a3b8))' }}>{'\u2014'}</span>
                            ) : (
                              <span
                                style={{
                                  ...BADGE_STYLE,
                                  background: estadoTone.bg,
                                  color: estadoTone.text
                                }}
                              >
                                {lead.estado}
                              </span>
                            )}
                          </td>
                          <td style={buildLeadCellStyle({ whiteSpace: 'nowrap' })}>
                            {!String(lead.motivo_bloqueo || '').trim() ? (
                              <span style={{ color: 'var(--text-muted, var(--color-text-tertiary, #94a3b8))' }}>{'\u2014'}</span>
                            ) : (
                              <span
                                style={{
                                  ...BADGE_STYLE,
                                  background: motivoTone.bg,
                                  color: motivoTone.text
                                }}
                              >
                                {lead.motivo_bloqueo_detalle || lead.motivo_bloqueo}
                              </span>
                            )}
                          </td>
                          <td style={buildLeadCellStyle()}>
                            {!String(lead.estado_venta || '').trim() ? (
                              <span style={{ color: 'var(--text-muted, var(--color-text-tertiary, #94a3b8))' }}>{'\u2014'}</span>
                            ) : (
                              <span
                                style={{
                                  ...BADGE_STYLE,
                                  background: gestionTone.bg,
                                  color: gestionTone.text
                                }}
                              >
                                {lead.estado_venta}
                              </span>
                            )}
                          </td>
                          <td style={buildLeadCellStyle({ textAlign: 'center', color: 'var(--color-text-secondary, #64748b)', fontWeight: 800 })}>
                            {lead.intentos ?? '—'}
                          </td>
                          <td style={buildLeadCellStyle({ color: 'var(--color-text-secondary, #64748b)', whiteSpace: 'nowrap' })}>
                            {lead.last_gestion_at
                              ? new Date(lead.last_gestion_at).toLocaleDateString('es-UY', { timeZone: 'America/Montevideo' })
                              : '—'}
                          </td>
                          <td style={buildLeadCellStyle({ color: 'var(--color-text-secondary, #64748b)', whiteSpace: 'nowrap' })}>
                            {lead.assigned_to_name || '—'}
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
