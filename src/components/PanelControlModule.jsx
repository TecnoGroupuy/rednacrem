import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, TrendingUp, TrendingDown, Minus,
  Users, CalendarDays, ChevronLeft, ChevronRight,
  CheckCircle, FileX, RotateCcw, PhoneOff, AlertCircle,
  X, Loader2
} from 'lucide-react';
import { getApiClient } from '../services/apiClient.js';

// ─── Utilidades ────────────────────────────────────────────────────────────────

const DAYS   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatDate(date) {
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function toISODate(date) {
  return date.toISOString().split('T')[0];
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function safeNum(value) {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

function safePct(value) {
  const n = Number(value);
  if (isNaN(n)) return '-';
  return `${Math.round(n)}%`;
}

// ─── Estilos inline (design system Tri) ────────────────────────────────────────

const S = {
  wrap: {
    minHeight: '100%',
    paddingBottom: 32,
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 40,
    padding: '12px 16px 8px',
  },
  headerInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '14px 18px',
    background: 'rgba(255,255,255,0.80)',
    backdropFilter: 'blur(20px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
    border: '1px solid rgba(255,255,255,0.65)',
    borderRadius: 22,
    boxShadow: '0 8px 32px rgba(17,37,61,0.10)',
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 10 },
  logoIcon: {
    width: 38, height: 38, borderRadius: 12,
    background: 'linear-gradient(135deg,#0f766e,#115e59)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(15,118,110,0.25)',
    flexShrink: 0,
  },
  logoTitle: {
    fontFamily: "'Manrope',sans-serif",
    fontSize: 14, fontWeight: 700, color: '#152235', lineHeight: 1,
  },
  logoSub: { fontSize: 11, color: '#69788d', fontWeight: 500, marginTop: 1 },
  dateNav: { display: 'flex', alignItems: 'center', gap: 6 },
  navBtn: {
    width: 30, height: 30, borderRadius: '50%', border: 'none',
    background: 'rgba(21,34,53,0.06)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  datePill: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', borderRadius: 999,
    background: 'rgba(15,118,110,0.08)',
  },
  datePillText: { fontSize: 12, fontWeight: 600, color: '#152235', whiteSpace: 'nowrap' },

  section: { padding: '0 16px', marginTop: 10 },
  metricCard: {
    background: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: 22,
    boxShadow: '0 8px 32px rgba(17,37,61,0.08)',
    border: '1px solid rgba(255,255,255,0.75)',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  metricBlob: {
    position: 'absolute', top: -30, right: -30,
    width: 120, height: 120, borderRadius: '50%',
    background: 'radial-gradient(circle,rgba(15,118,110,0.09) 0%,transparent 70%)',
    pointerEvents: 'none',
  },
  metricLabelRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 },
  metricIcon: {
    width: 32, height: 32, borderRadius: 10,
    background: 'linear-gradient(135deg,#0f766e,#115e59)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  metricLabelText: {
    fontSize: 12, fontWeight: 600, color: '#69788d',
    textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  metricTotal: {
    fontFamily: "'Manrope',sans-serif",
    fontSize: 34, fontWeight: 800,
    background: 'linear-gradient(135deg,#0f766e,#115e59)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text', lineHeight: 1, letterSpacing: -1,
  },
  metricTrendRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 },
  trendLabel: { fontSize: 12, color: '#69788d' },
  subMetrics: {
    display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
    borderTop: '1px solid rgba(21,34,53,0.06)',
    marginTop: 14, paddingTop: 14,
  },
  subMetricVal: {
    fontFamily: "'Manrope',sans-serif",
    fontSize: 17, fontWeight: 700, color: '#152235', textAlign: 'center',
  },
  subMetricLabel: { fontSize: 10, color: '#69788d', marginTop: 2, textAlign: 'center' },

  sectionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    margin: '18px 16px 10px',
  },
  sectionTitle: {
    fontSize: 12, fontWeight: 700, color: '#69788d',
    textTransform: 'uppercase', letterSpacing: '0.07em',
  },
  sectionCount: { fontSize: 11, color: '#69788d', fontWeight: 500 },

  vendorList: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 },
  vendorCard: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.85)',
    boxShadow: '0 4px 18px rgba(17,37,61,0.06)',
    cursor: 'pointer', width: '100%', textAlign: 'left',
    fontFamily: 'inherit',
  },
  avatar: {
    width: 50, height: 50, borderRadius: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: {
    fontFamily: "'Manrope',sans-serif",
    color: '#fff', fontSize: 16, fontWeight: 700,
  },
  vendorInfo: { flex: 1, minWidth: 0 },
  vendorName: {
    fontSize: 14, fontWeight: 600, color: '#152235',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  vendorMeta: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 },
  vendorOps: { fontSize: 11, color: '#69788d' },
  dot: { width: 3, height: 3, borderRadius: '50%', background: 'rgba(105,120,141,0.4)' },
  vendorSales: { textAlign: 'right', flexShrink: 0 },
  vendorSalesVal: {
    fontFamily: "'Manrope',sans-serif",
    fontSize: 17, fontWeight: 700, color: '#0f766e',
  },
  vendorSalesLabel: { fontSize: 10, color: '#69788d', marginTop: 1 },

  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(21,34,53,0.55)',
    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
    zIndex: 100,
  },
  sheet: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: '#faf8f4',
    borderRadius: '22px 22px 0 0',
    boxShadow: '0 -8px 40px rgba(17,37,61,0.18)',
    maxHeight: '92vh', overflowY: 'auto',
    zIndex: 101,
  },
  dragBar: {
    width: 36, height: 4, borderRadius: 999,
    background: 'rgba(21,34,53,0.18)', margin: '12px auto 6px',
  },
  sheetCloseBtn: {
    position: 'absolute', top: 12, right: 14,
    width: 34, height: 34, borderRadius: '50%',
    background: 'rgba(21,34,53,0.07)', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  sheetBody: { padding: '6px 16px 32px' },
  sheetVendorHeader: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 },
  sheetVendorName: {
    fontFamily: "'Manrope',sans-serif",
    fontSize: 21, fontWeight: 700, color: '#152235', lineHeight: 1.1,
  },
  sheetVendorSub: { fontSize: 13, color: '#69788d', fontWeight: 500, marginTop: 4 },
  subSectionTitle: {
    fontSize: 12, fontWeight: 700, color: '#69788d',
    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10,
  },
  mgmtGrid: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 20 },
  mgmtItem: {
    background: 'rgba(255,255,255,0.85)', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.7)',
    padding: '12px 14px',
    boxShadow: '0 2px 10px rgba(17,37,61,0.05)',
  },
  mgmtHeader: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 },
  mgmtIco: { width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  mgmtLabel: { fontSize: 11, fontWeight: 600, color: '#69788d' },
  mgmtVal: { fontFamily: "'Manrope',sans-serif", fontSize: 24, fontWeight: 800, lineHeight: 1 },
  analysisList: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 },
  analysisItem: {
    background: 'rgba(255,255,255,0.85)', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.7)',
    padding: '14px 16px',
    boxShadow: '0 2px 10px rgba(17,37,61,0.05)',
  },
  analysisRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  analysisName: { fontSize: 13, fontWeight: 600, color: '#152235' },
  analysisPct: { fontFamily: "'Manrope',sans-serif", fontSize: 19, fontWeight: 700 },
  barBg: { background: 'rgba(21,34,53,0.08)', borderRadius: 999, height: 9, overflow: 'hidden' },
  closeBtn: {
    width: '100%', padding: 16, borderRadius: 18,
    background: 'linear-gradient(135deg,#0f766e,#115e59)',
    color: '#fff', fontFamily: "'Manrope',sans-serif",
    fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(15,118,110,0.25)',
  },
  centered: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    minHeight: 200, gap: 12, color: '#69788d', fontSize: 14,
  },
  errorText: { color: '#be123c', fontSize: 13, textAlign: 'center', padding: '0 24px' },
};

// ─── Colores de avatar por índice ───────────────────────────────────────────────

const AVATAR_COLORS = [
  'linear-gradient(135deg,#0f766e,#115e59)',
  'linear-gradient(135deg,#7c3aed,#6d28d9)',
  'linear-gradient(135deg,#2563eb,#1d4ed8)',
  'linear-gradient(135deg,#db2777,#be185d)',
  'linear-gradient(135deg,#d97706,#b45309)',
  'linear-gradient(135deg,#0891b2,#0e7490)',
  'linear-gradient(135deg,#4f46e5,#4338ca)',
  'linear-gradient(135deg,#059669,#047857)',
];

function avatarColor(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function initials(nombre) {
  if (!nombre) return '?';
  const parts = nombre.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Pill de tendencia ──────────────────────────────────────────────────────────

function TrendPill({ trend, value }) {
  const cfg = {
    up:      { Icon: TrendingUp,   color: '#15803d', bg: 'rgba(21,128,61,0.10)',   sign: '+' },
    down:    { Icon: TrendingDown, color: '#be123c', bg: 'rgba(190,18,60,0.10)',   sign: '-' },
    neutral: { Icon: Minus,        color: '#69788d', bg: 'rgba(105,120,141,0.10)', sign: ''  },
  };
  const { Icon, color, bg, sign } = cfg[trend] || cfg.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 999,
      background: bg, fontSize: 11, fontWeight: 700, color,
    }}>
      <Icon size={11} strokeWidth={2.5} />
      {sign}{Math.abs(value ?? 0).toFixed(1)}%
    </span>
  );
}

// ─── Configuración del resumen de gestión ──────────────────────────────────────

const MGMT_CONFIG = [
  { key: 'ventas',       label: 'Ventas',        Icon: CheckCircle,  color: '#15803d', bg: 'rgba(21,128,61,0.08)'    },
  { key: 'rechazos',     label: 'Rechazos',       Icon: FileX,        color: '#be123c', bg: 'rgba(190,18,60,0.08)'    },
  { key: 'seguimientos', label: 'Seguimientos',   Icon: TrendingUp,   color: '#2563eb', bg: 'rgba(37,99,235,0.08)'    },
  { key: 'rellamar',     label: 'Rellamar',       Icon: RotateCcw,    color: '#d97706', bg: 'rgba(217,119,6,0.08)'    },
  { key: 'no_contesta',  label: 'No contesta',    Icon: PhoneOff,     color: '#69788d', bg: 'rgba(105,120,141,0.08)'  },
  { key: 'dato_erroneo', label: 'Dato erróneo',   Icon: AlertCircle,  color: '#9f1239', bg: 'rgba(159,18,57,0.08)'    },
];

const ANALYSIS_CONFIG = [
  { key: 'contacto_comercial',   label: 'Contacto comercial',  color: '#15803d', grad: 'linear-gradient(90deg,#16a34a,#15803d)' },
  { key: 'contacto_telefonico',  label: 'Contacto telefónico', color: '#2563eb', grad: 'linear-gradient(90deg,#3b82f6,#2563eb)' },
  { key: 'efectividad',          label: 'Efectividad',         color: '#d97706', grad: 'linear-gradient(90deg,#f59e0b,#d97706)' },
];

// ─── Componente principal ───────────────────────────────────────────────────────

export default function PanelControlModule({ activeOrgId }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [resumen, setResumen]         = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [selected, setSelected]       = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const api = getApiClient({ activeOrganizationId: activeOrgId });

  // ── Fetch ─────────────────────────────────────────────────────────────────────

  const fetchResumen = useCallback(async (date) => {
    setLoading(true);
    setError(null);
    try {
      const fecha = toISODate(date);
      const data = await api.get(`/panel/resumen?fecha=${fecha}`);
      setResumen(data);
    } catch (err) {
      console.error('[PanelControl] Error al cargar resumen:', err);
      setError('No se pudo cargar el resumen. Intentá de nuevo.');
      setResumen(null);
    } finally {
      setLoading(false);
    }
  }, [activeOrgId]);

  useEffect(() => {
    fetchResumen(currentDate);
  }, [currentDate, fetchResumen]);

  // ── Navegación de fecha ────────────────────────────────────────────────────────

  function changeDay(delta) {
    setCurrentDate(d => new Date(d.getTime() + delta * 86400000));
  }

  // ── Sheet de detalle ──────────────────────────────────────────────────────────

  function openSheet(vendedor) {
    setSelected(vendedor);
    setSheetVisible(true);
  }

  function closeSheet() {
    setSheetVisible(false);
    setTimeout(() => setSelected(null), 300);
  }

  // ── Totales ───────────────────────────────────────────────────────────────────

  const totales      = resumen?.totales     ?? {};
  const vendedores   = resumen?.vendedores  ?? [];
  const totalVentas  = safeNum(totales.monto_total);
  const totalOps     = safeNum(totales.operaciones);
  const ticketProm   = totalOps > 0 ? totalVentas / totalOps : 0;
  const cantVend     = vendedores.length;
  const tendencia    = totales.tendencia;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={S.wrap}>

      {/* Header */}
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.logoWrap}>
            <div style={S.logoIcon}>
              <span style={{ fontFamily: "'Manrope',sans-serif", color: '#fff', fontSize: 17, fontWeight: 800 }}>T</span>
            </div>
            <div>
              <div style={S.logoTitle}>Panel de control</div>
              <div style={S.logoSub}>Resumen del día</div>
            </div>
          </div>

          <div style={S.dateNav}>
            <button style={S.navBtn} onClick={() => changeDay(-1)} aria-label="Día anterior">
              <ChevronLeft size={14} color="#152235" />
            </button>
            <div style={S.datePill}>
              <CalendarDays size={13} color="#0f766e" />
              <span style={S.datePillText}>{formatDate(currentDate)}</span>
            </div>
            <button style={S.navBtn} onClick={() => changeDay(1)} aria-label="Día siguiente">
              <ChevronRight size={14} color="#152235" />
            </button>
          </div>
        </div>
      </header>

      {/* Métrica principal */}
      <div style={S.section}>
        <div style={S.metricCard}>
          <div style={S.metricBlob} />

          <div style={S.metricLabelRow}>
            <div style={S.metricIcon}>
              <ShoppingCart size={16} color="#fff" />
            </div>
            <span style={S.metricLabelText}>Ventas del día</span>
            {loading && <Loader2 size={14} color="#69788d" style={{ marginLeft: 'auto', animation: 'spin 1s linear infinite' }} />}
          </div>

          {error ? (
            <p style={S.errorText}>{error}</p>
          ) : (
            <>
              <div style={S.metricTotal}>
                {loading ? '-' : formatCurrency(totalVentas)}
              </div>

              <div style={S.metricTrendRow}>
                {tendencia !== undefined && tendencia !== null ? (
                  <>
                    <TrendPill
                      trend={tendencia > 0 ? 'up' : tendencia < 0 ? 'down' : 'neutral'}
                      value={Math.abs(tendencia)}
                    />
                    <span style={S.trendLabel}>vs. ayer</span>
                  </>
                ) : (
                  <span style={S.trendLabel}>Sin datos de ayer</span>
                )}
              </div>

              <div style={S.subMetrics}>
                <div>
                  <div style={S.subMetricVal}>{loading ? '-' : totalOps}</div>
                  <div style={S.subMetricLabel}>Operaciones</div>
                </div>
                <div style={{ borderLeft: '1px solid rgba(21,34,53,0.06)', borderRight: '1px solid rgba(21,34,53,0.06)' }}>
                  <div style={S.subMetricVal}>{loading ? '-' : formatCurrency(ticketProm)}</div>
                  <div style={S.subMetricLabel}>Ticket prom.</div>
                </div>
                <div>
                  <div style={{ ...S.subMetricVal, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Users size={13} color="#0f766e" />
                    {loading ? '-' : cantVend}
                  </div>
                  <div style={S.subMetricLabel}>Vendedores</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lista de vendedores */}
      <div style={S.sectionHeader}>
        <span style={S.sectionTitle}>Vendedores</span>
        <span style={S.sectionCount}>{cantVend > 0 ? `${cantVend} activos` : '-'}</span>
      </div>

      <div style={S.vendorList}>
        {loading && (
          <div style={S.centered}>
            <Loader2 size={22} color="#69788d" style={{ animation: 'spin 1s linear infinite' }} />
            <span>Cargando...</span>
          </div>
        )}

        {!loading && !error && vendedores.length === 0 && (
          <div style={S.centered}>
            <Users size={28} color="#c7cfd8" />
            <span>Sin gestiones registradas para este día</span>
          </div>
        )}

        {!loading && vendedores.map((v, idx) => {
          const monto = safeNum(v.monto_total);
          const ops   = safeNum(v.operaciones);
          const ini   = initials(v.nombre);
          const color = avatarColor(idx);
          return (
            <button key={v.vendedor_id ?? idx} style={S.vendorCard} onClick={() => openSheet({ ...v, _color: color, _ini: ini })}>
              <div style={{ ...S.avatar, background: color }}>
                <span style={S.avatarText}>{ini}</span>
              </div>
              <div style={S.vendorInfo}>
                <div style={S.vendorName}>{v.nombre ?? '-'}</div>
                <div style={S.vendorMeta}>
                  <span style={S.vendorOps}>{ops} ops</span>
                  <span style={S.dot} />
                  <TrendPill
                    trend={v.tendencia > 0 ? 'up' : v.tendencia < 0 ? 'down' : 'neutral'}
                    value={v.tendencia ?? 0}
                  />
                </div>
              </div>
              <div style={S.vendorSales}>
                <div style={S.vendorSalesVal}>{formatCurrency(monto)}</div>
                <div style={S.vendorSalesLabel}>ventas</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Overlay + Sheet de detalle */}
      {sheetVisible && selected && (
        <>
          <div style={S.overlay} onClick={closeSheet} />
          <div style={{
            ...S.sheet,
            transform: sheetVisible ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
          }}>
            <div style={S.dragBar} />
            <button style={S.sheetCloseBtn} onClick={closeSheet} aria-label="Cerrar">
              <X size={18} color="#152235" />
            </button>

            <div style={S.sheetBody}>
              {/* Cabecera vendedor */}
              <div style={S.sheetVendorHeader}>
                <div style={{ ...S.avatar, width: 58, height: 58, borderRadius: 18, background: selected._color, boxShadow: '0 6px 20px rgba(0,0,0,0.15)' }}>
                  <span style={{ ...S.avatarText, fontSize: 20 }}>{selected._ini}</span>
                </div>
                <div>
                  <div style={S.sheetVendorName}>{selected.nombre ?? '-'}</div>
                  <div style={S.sheetVendorSub}>
                    {safeNum(selected.operaciones)} operaciones · {formatCurrency(safeNum(selected.monto_total))}
                  </div>
                </div>
              </div>

              {/* Resumen de gestión */}
              <div style={S.subSectionTitle}>Resumen de gestión</div>
              <div style={S.mgmtGrid}>
                {MGMT_CONFIG.map(({ key, label, Icon, color, bg }) => (
                  <div key={key} style={S.mgmtItem}>
                    <div style={S.mgmtHeader}>
                      <div style={{ ...S.mgmtIco, background: bg }}>
                        <Icon size={13} color={color} />
                      </div>
                      <span style={S.mgmtLabel}>{label}</span>
                    </div>
                    <div style={{ ...S.mgmtVal, color }}>
                      {selected.gestion?.[key] !== undefined ? safeNum(selected.gestion[key]) : 0}
                    </div>
                  </div>
                ))}
              </div>

              {/* Análisis */}
              <div style={{ ...S.subSectionTitle, marginTop: 4 }}>Análisis</div>
              <div style={S.analysisList}>
                {ANALYSIS_CONFIG.map(({ key, label, color, grad }) => {
                  const pct = safeNum(selected.analisis?.[key]);
                  return (
                    <div key={key} style={S.analysisItem}>
                      <div style={S.analysisRow}>
                        <span style={S.analysisName}>{label}</span>
                        <span style={{ ...S.analysisPct, color }}>{safePct(pct)}</span>
                      </div>
                      <div style={S.barBg}>
                        <div style={{ height: '100%', borderRadius: 999, width: `${Math.min(pct, 100)}%`, background: grad, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button style={S.closeBtn} onClick={closeSheet}>Cerrar</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
