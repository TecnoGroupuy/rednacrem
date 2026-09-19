import React from 'react';
import { formatDate } from '../utils/dateFormat.js';

const asText = (value, fallback = '-') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const extractPayload = (response) => response?.data?.data || response?.data || response || {};

const RESULTADO_GESTION_LABELS = {
  nuevo: 'Nuevo',
  no_contesta: 'No contesta',
  seguimiento: 'Seguimiento',
  rellamar: 'Rellamar',
  rechazo: 'Rechazo',
  dato_erroneo: 'Dato erróneo',
  venta: 'Venta'
};

const resultadoLabel = (value) => RESULTADO_GESTION_LABELS[value] || asText(value);

const resultadoMeta = (value) => {
  if (value === 'venta') return { bg: '#EAF3DE', color: '#3B6D11' };
  if (value === 'rechazo') return { bg: '#FCEBEB', color: '#A32D2D' };
  if (value === 'no_contesta') return { bg: '#FAEEDA', color: '#854F0B' };
  if (value === 'dato_erroneo') return { bg: '#F1EFE8', color: '#5F5E5A' };
  if (value === 'seguimiento' || value === 'rellamar') return { bg: '#E6F1FB', color: '#185FA5' };
  return { bg: 'rgba(148,163,184,0.18)', color: 'var(--color-text-secondary)' };
};

const normalizeResultados = (response) => {
  const payload = extractPayload(response);
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return {
    items: items.map((row) => ({
      id: row?.id,
      contacto: asText(row?.contacto, null),
      resultadoGestion: row?.resultado_gestion || null,
      sellerId: row?.seller_id || null,
      sellerName: row?.seller_name || null,
      fechaUltimoContacto: row?.fecha_ultimo_contacto || null,
      medioPago: row?.medio_pago || null,
      hasHistorial: Boolean(row?.has_historial)
    })),
    total: asNumber(payload?.total),
    page: asNumber(payload?.page, 1),
    limit: asNumber(payload?.limit, 50),
    filters: {
      vendedores: Array.isArray(payload?.filters?.vendedores) ? payload.filters.vendedores : [],
      mediosPago: Array.isArray(payload?.filters?.medios_pago) ? payload.filters.medios_pago : []
    }
  };
};

const normalizeHistorial = (response) => {
  const payload = extractPayload(response);
  const historial = Array.isArray(payload?.historial) ? payload.historial : [];
  return {
    contacto: asText(payload?.candidato?.contacto, null),
    eventos: historial.map((row) => ({
      id: row?.id,
      resultadoGestion: row?.resultado_gestion || null,
      fecha: row?.fecha || null,
      sellerName: row?.seller_name || null,
      nota: row?.nota || null
    }))
  };
};

export default function RecuperoResultadosView({ Panel, api, active = false }) {
  const [filtroDesde, setFiltroDesde] = React.useState('');
  const [filtroHasta, setFiltroHasta] = React.useState('');
  const [filtroVendedor, setFiltroVendedor] = React.useState('');
  const [filtroMedioPago, setFiltroMedioPago] = React.useState('');
  const [page, setPage] = React.useState(1);

  const [rows, setRows] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [limit, setLimit] = React.useState(50);
  const [filterOptions, setFilterOptions] = React.useState({ vendedores: [], mediosPago: [] });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [historialCandidatoId, setHistorialCandidatoId] = React.useState('');
  const [historialData, setHistorialData] = React.useState(null);
  const [historialLoading, setHistorialLoading] = React.useState(false);
  const [historialError, setHistorialError] = React.useState('');

  React.useEffect(() => {
    setPage(1);
  }, [filtroDesde, filtroHasta, filtroVendedor, filtroMedioPago]);

  React.useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (filtroDesde) params.set('desde', filtroDesde);
    if (filtroHasta) params.set('hasta', filtroHasta);
    if (filtroVendedor) params.set('vendedor_id', filtroVendedor);
    if (filtroMedioPago) params.set('medio_pago', filtroMedioPago);
    api.get(`/recovery/resultados?${params.toString()}`)
      .then((res) => {
        if (cancelled) return;
        const normalized = normalizeResultados(res);
        setRows(normalized.items);
        setTotal(normalized.total);
        setLimit(normalized.limit || limit);
        setFilterOptions(normalized.filters);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'No se pudieron cargar los resultados.');
        setRows([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [active, api, page, limit, filtroDesde, filtroHasta, filtroVendedor, filtroMedioPago]);

  const openHistorial = React.useCallback((candidatoId) => {
    setHistorialCandidatoId(candidatoId);
    setHistorialData(null);
    setHistorialError('');
    setHistorialLoading(true);
    api.get(`/api/recupero/candidatos/${encodeURIComponent(candidatoId)}/historial`)
      .then((res) => {
        setHistorialData(normalizeHistorial(res));
      })
      .catch((err) => {
        setHistorialError(err?.message || 'No se pudo cargar el historial.');
      })
      .finally(() => {
        setHistorialLoading(false);
      });
  }, [api]);

  const closeHistorial = React.useCallback(() => {
    setHistorialCandidatoId('');
    setHistorialData(null);
    setHistorialError('');
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));

  const thStyle = { textAlign: 'left', padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', borderBottom: '1px solid rgba(15,23,42,0.16)' };
  const tdStyle = { padding: '10px 12px', borderBottom: '0.5px solid rgba(15,23,42,0.16)' };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)' }}>Resultados</div>
        <div style={{ marginTop: 4, fontSize: 14, color: 'var(--color-text-secondary)' }}>
          Todos los candidatos con al menos una gestión registrada, cruzando todos los lotes
        </div>
      </div>

      {error ? (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FEF2F2', color: '#B91C1C', fontWeight: 700 }}>
          {error}
        </div>
      ) : null}

      <div style={{
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        padding: '12px 16px',
        background: '#F8F7F4',
        borderRadius: 10,
        border: '0.5px solid rgba(15,23,42,0.16)'
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
            {filterOptions.vendedores.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Medio de pago</label>
          <select className="input" value={filtroMedioPago} onChange={(event) => setFiltroMedioPago(event.target.value)}>
            <option value="">Todos</option>
            {filterOptions.mediosPago.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div style={{
        background: '#E1F5EE',
        borderRadius: 12,
        padding: '14px 16px',
        maxWidth: 260
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0F6E56', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Resultados en el período</div>
        <div style={{ fontSize: 24, fontWeight: 600, color: '#0F6E56', marginTop: 8 }}>{loading ? '...' : total.toLocaleString('es-UY')}</div>
      </div>

      <Panel title="Detalle" subtitle={`${rows.length} de ${total} registros`}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={thStyle}>Contacto</th>
                <th style={thStyle}>Último resultado</th>
                <th style={thStyle}>Vendedor</th>
                <th style={thStyle}>Medio de pago</th>
                <th style={thStyle}>Última gestión</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>Cargando resultados...</td></tr>
              ) : rows.map((row) => {
                const meta = resultadoMeta(row.resultadoGestion);
                return (
                  <tr key={row.id}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{asText(row.contacto)}</td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: meta.bg,
                        color: meta.color,
                        fontSize: 12,
                        fontWeight: 800,
                        whiteSpace: 'nowrap'
                      }}>
                        {resultadoLabel(row.resultadoGestion)}
                      </span>
                    </td>
                    <td style={tdStyle}>{asText(row.sellerName)}</td>
                    <td style={tdStyle}>{asText(row.medioPago)}</td>
                    <td style={tdStyle}>{row.fechaUltimoContacto ? formatDate(row.fechaUltimoContacto) : '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {row.hasHistorial ? (
                        <button
                          type="button"
                          onClick={() => openHistorial(row.id)}
                          style={{
                            background: '#fff',
                            border: '1px solid rgba(148,163,184,0.55)',
                            borderRadius: 8,
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: 'pointer',
                            color: 'var(--color-text-primary)',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Ver historial
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {!loading && !rows.length ? (
                <tr><td colSpan={6} style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>No hay resultados para los filtros seleccionados.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Página {page} de {totalPages}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || loading}
              style={{
                background: '#fff',
                border: '1px solid rgba(148,163,184,0.55)',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 800,
                cursor: (page <= 1 || loading) ? 'not-allowed' : 'pointer',
                opacity: (page <= 1 || loading) ? 0.55 : 1
              }}
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              style={{
                background: '#fff',
                border: '1px solid rgba(148,163,184,0.55)',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 800,
                cursor: (page >= totalPages || loading) ? 'not-allowed' : 'pointer',
                opacity: (page >= totalPages || loading) ? 0.55 : 1
              }}
            >
              Siguiente
            </button>
          </div>
        </div>
      </Panel>

      {historialCandidatoId && (
        <div
          className="lot-wizard-overlay"
          onClick={closeHistorial}
        >
          <div className="lot-wizard" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="lot-wizard-header">
              <div style={{ fontWeight: 700 }}>
                Historial{historialData?.contacto ? ` — ${historialData.contacto}` : ''}
              </div>
              <button className="close-btn" onClick={closeHistorial}>×</button>
            </div>
            <div className="lot-wizard-content">
              {historialError ? (
                <div style={{ fontSize: 12, color: '#b91c1c', fontWeight: 700 }}>{historialError}</div>
              ) : historialLoading ? (
                <div style={{ color: 'var(--color-text-secondary)' }}>Cargando historial...</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {(historialData?.eventos || []).map((evento, index) => {
                    const meta = resultadoMeta(evento.resultadoGestion);
                    return (
                      <div key={evento.id || index} style={{ borderLeft: '2px solid rgba(148,163,184,0.6)', paddingLeft: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 10px',
                            borderRadius: 999,
                            background: meta.bg,
                            color: meta.color,
                            fontSize: 12,
                            fontWeight: 800
                          }}>
                            {resultadoLabel(evento.resultadoGestion)}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                            {evento.fecha ? formatDate(evento.fecha) : '—'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                          {asText(evento.sellerName, 'Sin vendedor')}
                        </div>
                        {evento.nota ? (
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{evento.nota}</div>
                        ) : null}
                      </div>
                    );
                  })}
                  {!historialLoading && !(historialData?.eventos || []).length ? (
                    <div style={{ color: 'var(--color-text-secondary)' }}>Sin gestiones registradas.</div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
