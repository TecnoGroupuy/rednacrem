import React from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { formatDate } from '../utils/dateFormat.js';

const PAGE_SIZE = 50;

const TABS = [
  { key: 'nuevos', label: 'Nuevos' },
  { key: 'no_contesta', label: 'No contesta' }
];

const normalizeText = (value) => String(value ?? '').trim();

const formatDateSafe = (value) => {
  if (!value) return '—';
  try {
    return formatDate(value);
  } catch {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString('es-UY', {
      timeZone: 'America/Montevideo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
};

const normalizeStatus = (value) => {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'seguimiento') return { label: 'Seguimiento', variant: 'info' };
  if (raw === 'rellamar') return { label: 'Rellamar', variant: 'warning' };
  if (raw === 'no_contesta') return { label: 'No contesta', variant: 'warning' };
  if (raw === 'rechazo' || raw === 'rechazado') return { label: 'Rechazo', variant: 'danger' };
  if (raw === 'venta' || raw === 'recuperado') return { label: 'Recuperado', variant: 'success' };
  if (raw === 'dato_erroneo') return { label: 'Dato erróneo', variant: 'default' };
  return { label: 'Nuevo', variant: 'success' };
};

const getContactName = (row) => (
  normalizeText(row?.name)
  || [normalizeText(row?.nombre), normalizeText(row?.apellido)].filter(Boolean).join(' ')
  || normalizeText(row?.contacto)
  || 'Sin nombre'
);

const getPhone = (row) => (
  normalizeText(row?.telefono)
  || normalizeText(row?.celular)
  || normalizeText(row?.phone)
  || '—'
);

const getProduct = (row) => (
  normalizeText(row?.nombre_producto)
  || normalizeText(row?.producto)
  || normalizeText(row?.plan)
  || '—'
);

const getReason = (row) => (
  normalizeText(row?.motivo_baja)
  || normalizeText(row?.motivo_baja_label)
  || normalizeText(row?.motivo)
  || normalizeText(row?.motivo_normalizado)
  || '—'
);

const getRowId = (row, index) => String(
  row?.id
  || row?.candidate_id
  || row?.contact_id
  || row?.lead_id
  || `mis-candidato-${index + 1}`
);

export default function RecuperoMyCandidatesView({
  Panel,
  Button,
  Tag,
  api,
  active = false,
  onSync = () => {},
  onExportStateChange = () => {}
}) {
  const { rolReal } = useAuth();
  const isSupervisorView = rolReal === 'supervisor' || rolReal === 'superadministrador';
  const [tab, setTab] = React.useState('nuevos');
  const [search, setSearch] = React.useState('');
  const [searchDebounced, setSearchDebounced] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [tabCounts, setTabCounts] = React.useState({ nuevos: 0, no_contesta: 0 });

  React.useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const loadRows = React.useCallback(async () => {
    if (!active) return;
    if (isSupervisorView) {
      setRows([]);
      setTotal(0);
      setTotalPages(1);
      setTabCounts({ nuevos: 0, no_contesta: 0 });
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        tab: tab === 'nuevos' ? 'en_gestion' : tab
      });
      if (searchDebounced) params.set('search', searchDebounced);
      const response = await api.get(`/api/recupero/mis-candidatos?${params.toString()}`);
      const ok = response?.ok === true || response?.data?.ok === true;
      if (!ok) {
        throw new Error(response?.message || response?.data?.message || 'No se pudo cargar Mis candidatos.');
      }
      const items = Array.isArray(response?.items)
        ? response.items
        : (Array.isArray(response?.data?.items) ? response.data.items : []);
      const resolvedTotal = Number(response?.total ?? response?.data?.total ?? items.length);
      const resolvedTotalPages = Number(
        response?.totalPages
        ?? response?.data?.totalPages
        ?? Math.max(1, Math.ceil(resolvedTotal / PAGE_SIZE))
      );
      const counts = response?.tab_counts || {};
      setRows(items);
      setTotal(Number.isFinite(resolvedTotal) ? resolvedTotal : 0);
      setTotalPages(Number.isFinite(resolvedTotalPages) && resolvedTotalPages > 0 ? resolvedTotalPages : 1);
      setTabCounts({
        nuevos: Number(counts?.nuevos ?? (tab === 'nuevos' ? resolvedTotal : 0)),
        no_contesta: Number(counts?.no_contesta ?? (tab === 'no_contesta' ? resolvedTotal : 0))
      });
      onSync();
    } catch (err) {
      setError(err?.message || 'No se pudo cargar Mis candidatos.');
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [active, api, isSupervisorView, onSync, page, searchDebounced, tab]);

  React.useEffect(() => {
    loadRows();
  }, [loadRows]);

  React.useEffect(() => {
    setPage(1);
  }, [tab, searchDebounced]);

  React.useEffect(() => {
    if (!active) return;
    if (isSupervisorView) {
      onExportStateChange({
        fileName: `recupero-mis-candidatos-${tab}.csv`,
        rows: []
      });
      return;
    }
    onExportStateChange({
      fileName: `recupero-mis-candidatos-${tab}.csv`,
      rows: rows.map((row, index) => ({
        id: getRowId(row, index),
        contacto: getContactName(row),
        telefono: getPhone(row),
        producto_anterior: getProduct(row),
        motivo_baja: getReason(row),
        fecha_baja: row?.fecha_baja || '',
        estado: normalizeStatus(row?.estado_venta || row?.status).label
      }))
    });
  }, [active, isSupervisorView, onExportStateChange, rows, tab]);

  return (
    <Panel
      title="Mis candidatos"
      subtitle="Asignados al vendedor desde Recupero"
      action={(
        <Button variant="ghost" onClick={() => loadRows()} disabled={isSupervisorView}>
          Actualizar
        </Button>
      )}
    >
      {isSupervisorView ? (
        <div style={{
          padding: '16px 18px',
          borderRadius: 12,
          background: '#F8F7F4',
          border: '1px solid rgba(148,163,184,0.35)',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.55
        }}>
          Esta vista muestra los candidatos asignados a tu propio usuario. Para ver el rendimiento de tu equipo, andá a la pestaña "Por vendedor" dentro de Importaciones.
        </div>
      ) : (
        <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {TABS.map((item) => {
          const selected = item.key === tab;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                border: selected ? '1px solid #0F766E' : '1px solid rgba(148,163,184,0.45)',
                background: selected ? '#0F766E' : '#fff',
                color: selected ? '#fff' : 'var(--color-text-secondary)',
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              {item.label} ({tabCounts[item.key] || 0})
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <input
          className="input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          style={{ minWidth: 260, flex: '1 1 260px' }}
        />
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {loading ? 'Cargando...' : `${total} candidatos`}
        </div>
      </div>

      {error ? (
        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 10, background: '#FEF2F2', color: '#B91C1C', fontWeight: 700 }}>
          {error}
        </div>
      ) : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Contacto</th>
              <th>Teléfono</th>
              <th>Producto anterior</th>
              <th>Motivo de baja</th>
              <th>Fecha de baja</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: 16, color: 'var(--color-text-secondary)' }}>Cargando candidatos...</td>
              </tr>
            ) : rows.map((row, index) => {
              const status = normalizeStatus(row?.estado_venta || row?.status);
              return (
                <tr key={getRowId(row, index)}>
                  <td style={{ fontWeight: 800 }}>{getContactName(row)}</td>
                  <td>{getPhone(row)}</td>
                  <td>{getProduct(row)}</td>
                  <td>{getReason(row)}</td>
                  <td>{formatDateSafe(row?.fecha_baja)}</td>
                  <td><Tag variant={status.variant}>{status.label}</Tag></td>
                </tr>
              );
            })}
            {!loading && !rows.length ? (
              <tr>
                <td colSpan={6} style={{ padding: 16, color: 'var(--color-text-secondary)' }}>No hay candidatos para esta vista.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          Página {page} de {totalPages}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" disabled={page <= 1 || loading} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
            Anterior
          </Button>
          <Button variant="ghost" disabled={page >= totalPages || loading} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
            Siguiente
          </Button>
        </div>
      </div>
        </>
      )}
    </Panel>
  );
}
