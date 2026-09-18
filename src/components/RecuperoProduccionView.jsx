import React from 'react';

const asText = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeKey = (value) => asText(value)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const extractPayload = (response) => response?.data?.data || response?.data || response || {};
const extractList = (payload, keys = []) => {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return Array.isArray(payload) ? payload : [];
};

const formatCount = (value) => asNumber(value).toLocaleString('es-UY');
const safeValue = (value, fallback = '-') => asText(value) || fallback;
const formatPercent = (value) => (value === null || value === undefined || value === '' ? '—' : `${value}%`);

const calcRate = (part, total) => {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((asNumber(part) / asNumber(total)) * 100)));
};

const getSummaryValue = (summary, keys, fallback = 0) => {
  for (const key of keys) {
    const value = summary?.[key];
    if (value !== undefined && value !== null && value !== '') return asNumber(value, fallback);
  }
  return fallback;
};

// GET /recovery/datasets y GET /recovery/sellers devuelven los conteos anidados bajo
// "counts": {...}; se busca primero ahí y se cae al nivel plano solo por resiliencia.
const getCountValue = (item, keys, fallback = 0) => {
  for (const key of keys) {
    const nested = item?.counts?.[key];
    if (nested !== undefined && nested !== null && nested !== '') return asNumber(nested, fallback);
  }
  return getSummaryValue(item, keys, fallback);
};

const getEffectivenessValue = (source) => {
  const direct = source?.efectividad ?? source?.effectiveness;
  if (direct !== undefined && direct !== null && direct !== '') {
    return asNumber(direct, 0);
  }
  const recuperado = getSummaryValue(source, ['recuperado', 'recuperados', 'recovered']);
  const rechazado = getSummaryValue(source, ['rechazado', 'rechazados', 'rejected']);
  const denominator = recuperado + rechazado;
  if (!denominator) return null;
  return calcRate(recuperado, denominator);
};

// Campos sin_gestion/no_contesta/seguimiento/rellamar/dato_erroneo: requieren el desglose
// por resultado_gestion agregado a GET /recovery/summary. Si el campo no viene en la
// respuesta (backend viejo sin la migración), se marca con hasBreakdown=false y la UI
// muestra "—" en vez de inventar un valor a partir de in_progress/pending.
const normalizeSummary = (response) => {
  const payload = extractPayload(response);
  const summary = payload?.summary && typeof payload.summary === 'object' ? payload.summary : payload;
  const totalImportadas = getSummaryValue(summary, ['total_importadas', 'filas_importadas', 'total_rows', 'total', 'total_bajas']);
  const depuradas = getSummaryValue(summary, ['depuradas', 'total_depuradas', 'excluded_rows']);
  const baseUtil = getSummaryValue(summary, ['base_util', 'baseUtil', 'usable_base'], Math.max(totalImportadas - depuradas, 0));
  const recuperado = getSummaryValue(summary, ['recuperado', 'recuperados', 'recovered']);
  const rechazado = getSummaryValue(summary, ['rechazado', 'rechazados', 'rejected']);
  const efectividad = getEffectivenessValue(summary);
  const hasBreakdown = summary?.sin_gestion !== undefined || summary?.no_contesta !== undefined;
  return {
    totalImportadas,
    depuradas,
    baseUtil,
    recuperado,
    rechazado,
    efectividad,
    hasBreakdown,
    sinGestion: hasBreakdown ? getSummaryValue(summary, ['sin_gestion']) : null,
    noContesta: hasBreakdown ? getSummaryValue(summary, ['no_contesta']) : null,
    seguimiento: hasBreakdown ? getSummaryValue(summary, ['seguimiento']) : null,
    rellamar: hasBreakdown ? getSummaryValue(summary, ['rellamar']) : null,
    datoErroneo: hasBreakdown ? getSummaryValue(summary, ['dato_erroneo']) : null,
    datasetsActivos: getSummaryValue(summary, ['active_datasets', 'datasets_activos', 'datasets', 'total_datasets']),
    activeSellers: getSummaryValue(summary, ['active_sellers', 'vendedores_activos']),
    lastImport: asText(summary?.last_import, summary?.ultima_importacion, summary?.latest_import_name),
    goal: getSummaryValue(summary, ['goal', 'meta'])
  };
};

const normalizeDataset = (item, index) => {
  const filas = getCountValue(item, ['total', 'filas', 'total_candidates', 'rows_count', 'candidatos']);
  const pendiente = getCountValue(item, ['pending', 'pendiente', 'pendientes']);
  const enGestion = getCountValue(item, ['in_progress', 'en_gestion', 'gestion']);
  const recuperado = getCountValue(item, ['recovered', 'recuperado', 'recuperados']);
  const rechazado = getCountValue(item, ['rejected', 'rechazado', 'rechazados']);
  return {
    id: asText(item?.id, item?.dataset_id, item?.datasetId, `dataset-${index + 1}`),
    nombre: asText(item?.nombre, item?.name, item?.dataset_name, `Dataset ${index + 1}`),
    archivo: asText(item?.archivo, item?.source_file, item?.file_name, item?.filename),
    estado: normalizeKey(item?.estado, item?.status) || 'activo',
    filas,
    pendiente,
    // % del total que ya salió del pool "pendiente" (sin asignar/sin tocar)
    // — no requiere el desglose fino por resultado_gestion, que ya no vive
    // en esta tabla (queda un clic más adentro, en el detalle del lote).
    avance: calcRate(recuperado + rechazado + enGestion, Math.max(filas, 1)),
    efectividad: getEffectivenessValue({ recuperado, rechazado, efectividad: getCountValue(item, ['effectiveness_pct']) })
  };
};

const normalizeDatasetList = (response) => extractList(extractPayload(response), ['items', 'datasets', 'rows', 'data']).map(normalizeDataset);

const normalizeSellerList = (response) => extractList(extractPayload(response), ['items', 'sellers', 'rows', 'data']).map((item, index) => ({
  id: asText(item?.id, item?.seller_id, item?.sellerId, item?.user_id, `seller-${index + 1}`),
  vendedor: asText(
    item?.vendedor,
    item?.seller,
    item?.seller_name,
    item?.label,
    item?.name,
    `${asText(item?.nombre)} ${asText(item?.apellido, item?.last_name)}`.trim(),
    item?.email,
    `Vendedor ${index + 1}`
  ),
  datasets: asNumber(item?.dataset_names?.length, getSummaryValue(item, ['datasets', 'dataset_count'])),
  pendiente: getCountValue(item, ['pending', 'pendiente', 'pendientes']),
  enGestion: getCountValue(item, ['in_progress', 'en_gestion', 'gestion']),
  recuperado: getCountValue(item, ['recovered', 'recuperado', 'recuperados']),
  rechazado: getCountValue(item, ['rejected', 'rechazado', 'rechazados']),
  sinGestion: getCountValue(item, ['sin_gestion']),
  noContesta: getCountValue(item, ['no_contesta']),
  seguimiento: getCountValue(item, ['seguimiento']),
  rellamar: getCountValue(item, ['rellamar']),
  datoErroneo: getCountValue(item, ['dato_erroneo', 'datoErroneo', 'invalid_data']),
  avance: getSummaryValue(item, ['avance', 'progress', 'progress_pct']),
  efectividad: getSummaryValue(item, ['effectiveness_pct', 'efectividad', 'effectiveness'])
}));

const datasetStatusMeta = (status) => {
  if (status === 'pausado') return { label: 'Pausado', bg: '#FAEEDA', color: '#854F0B' };
  if (status === 'cerrado') return { label: 'Cerrado', bg: '#E5E7EB', color: '#475569' };
  return { label: 'Activo', bg: '#E1F5EE', color: '#0F6E56' };
};

export default function RecuperoProduccionView({
  Panel,
  active = false,
  api,
  onSync = () => {},
  onViewDataset = () => {}
}) {
  const [summary, setSummary] = React.useState({
    totalImportadas: 0,
    depuradas: 0,
    baseUtil: 0,
    recuperado: 0,
    rechazado: 0,
    efectividad: 0,
    hasBreakdown: false,
    sinGestion: null,
    noContesta: null,
    seguimiento: null,
    rellamar: null,
    datoErroneo: null,
    datasetsActivos: 0,
    activeSellers: 0,
    lastImport: '',
    goal: 0
  });
  const [vistaProduccion, setVistaProduccion] = React.useState('general'); // 'general' | 'vendedor'
  const [summaryLoading, setSummaryLoading] = React.useState(false);
  const [summaryError, setSummaryError] = React.useState('');

  const [datasets, setDatasets] = React.useState([]);
  const [datasetsLoading, setDatasetsLoading] = React.useState(false);
  const [datasetsError, setDatasetsError] = React.useState('');

  const [sellerRows, setSellerRows] = React.useState([]);
  const [sellerRowsLoading, setSellerRowsLoading] = React.useState(false);
  const [sellerRowsError, setSellerRowsError] = React.useState('');

  const loadOverview = React.useCallback(async () => {
    setSummaryLoading(true);
    setDatasetsLoading(true);
    setSellerRowsLoading(true);
    setSummaryError('');
    setDatasetsError('');
    setSellerRowsError('');

    const [summaryResult, datasetsResult, sellersResult] = await Promise.allSettled([
      api.get('/recovery/summary'),
      api.get('/recovery/datasets'),
      api.get('/recovery/sellers')
    ]);

    if (summaryResult.status === 'fulfilled') {
      setSummary(normalizeSummary(summaryResult.value));
      onSync();
    } else {
      setSummaryError(summaryResult.reason?.message || 'No se pudo cargar el resumen de produccion.');
    }

    if (datasetsResult.status === 'fulfilled') {
      try {
        setDatasets(normalizeDatasetList(datasetsResult.value));
        onSync();
      } catch (err) {
        setDatasetsError(err?.message || 'El listado de datasets devolvio un formato inesperado.');
        setDatasets([]);
      }
    } else {
      setDatasetsError(datasetsResult.reason?.message || 'No se pudo cargar la lista de datasets.');
      setDatasets([]);
    }

    if (sellersResult.status === 'fulfilled') {
      setSellerRows(normalizeSellerList(sellersResult.value));
      onSync();
    } else {
      setSellerRowsError(sellersResult.reason?.message || 'No se pudo cargar la vista por vendedor.');
      setSellerRows([]);
    }

    setSummaryLoading(false);
    setDatasetsLoading(false);
    setSellerRowsLoading(false);
  }, [api, onSync]);

  React.useEffect(() => {
    if (!active) return;
    loadOverview();
  }, [active, loadOverview]);

  const thStyle = { textAlign: 'left', padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', borderBottom: '1px solid rgba(15,23,42,0.16)', position: 'sticky', top: 0, background: '#fff', zIndex: 1 };
  const tdStyle = { padding: '10px 12px', borderBottom: '0.5px solid rgba(15,23,42,0.16)' };

  // De la base útil, cuánto ya tuvo al menos un intento de contacto (todo
  // menos "sin gestión" y "pendiente" — el pool todavía sin tocar). Mismo
  // criterio que el "% Avance" del detalle de lote, a nivel global.
  const gestionadosGlobal = summary.hasBreakdown
    ? (summary.recuperado || 0) + (summary.rechazado || 0)
      + (summary.noContesta || 0) + (summary.seguimiento || 0)
      + (summary.rellamar || 0) + (summary.datoErroneo || 0)
    : null;
  const pctGestionadoGlobal = gestionadosGlobal !== null ? calcRate(gestionadosGlobal, summary.baseUtil) : null;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)' }}>En producción</div>
        <div style={{ marginTop: 4, fontSize: 14, color: 'var(--color-text-secondary)' }}>
          {summaryLoading
            ? 'Cargando resumen...'
            : `${formatCount(summary.datasetsActivos ?? datasets.length)} datasets activos · ${formatCount(summary.activeSellers)} vendedores activos`}
        </div>
      </div>

      {(summaryError || datasetsError || sellerRowsError) && (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FEF2F2', color: '#B91C1C', fontWeight: 700 }}>
          {summaryError || datasetsError || sellerRowsError}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4 }}>
        {[
          { key: 'general', label: 'Vista general' },
          { key: 'vendedor', label: 'Por vendedor' }
        ].map((opt) => {
          const isActive = vistaProduccion === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setVistaProduccion(opt.key)}
              style={{
                padding: '9px 14px',
                borderRadius: 9,
                border: isActive ? 'none' : '0.5px solid rgba(15,23,42,0.16)',
                background: isActive ? '#E1F5EE' : '#fff',
                color: isActive ? '#0F6E56' : 'var(--color-text-secondary)',
                fontWeight: isActive ? 700 : 600,
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {vistaProduccion === 'general' && (
        <>
          {/* Resumen ejecutivo — 4 tarjetas (antes 9, con el desglose fino
              por estado No contesta/Rellamar/Seguimiento/Dato erróneo). Ese
              desglose ya vive un clic más adentro, en el detalle de cada
              lote — repetirlo acá era la misma información contada dos
              veces en dos pantallas distintas. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { label: 'Base útil', value: formatCount(summary.baseUtil), color: 'var(--color-text-primary)', accent: false, sub: `de ${formatCount(summary.totalImportadas)} filas · ${formatCount(summary.depuradas)} depuradas` },
              { label: '% Gestionado', value: pctGestionadoGlobal === null ? '—' : `${pctGestionadoGlobal}%`, color: '#185FA5', accent: false, sub: 'de la base útil, con al menos un intento' },
              { label: 'Ventas / Recuperados', value: formatCount(summary.recuperado), color: '#166534', accent: false, sub: `${calcRate(summary.recuperado, summary.baseUtil)}% de la base útil` },
              { label: 'Efectividad', value: formatPercent(summary.efectividad), color: '#0F6E56', accent: true, sub: 'excluye dato erróneo' }
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  background: card.accent ? '#E1F5EE' : '#fff',
                  borderRadius: 12,
                  padding: '14px 16px',
                  border: card.accent ? 'none' : '0.5px solid rgba(15,23,42,0.16)'
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: card.accent ? '#0F6E56' : 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: card.color, marginTop: 8 }}>{summaryLoading ? '...' : card.value}</div>
                <div style={{ marginTop: 6, fontSize: 12, color: card.accent ? '#0F6E56' : 'var(--color-text-secondary)' }}>{card.sub}</div>
              </div>
            ))}
          </div>

          <Panel title="Datasets importados" subtitle={`${datasets.length} cargas`}>
            <div className="table-wrap" style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={thStyle}>Dataset</th>
                    <th style={thStyle}>Total</th>
                    <th style={thStyle}>% Avance</th>
                    <th style={thStyle}>Efectividad</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {datasetsLoading ? (
                    <tr><td colSpan={5} style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>Cargando datasets...</td></tr>
                  ) : datasets.map((dataset) => {
                    const statusMeta = datasetStatusMeta(dataset.estado);
                    return (
                      <tr key={dataset.id}>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <div style={{ fontWeight: 600 }}>{dataset.nombre}</div>
                            <span style={{ padding: '3px 8px', borderRadius: 999, background: statusMeta.bg, color: statusMeta.color, fontSize: 12, fontWeight: 600 }}>
                              {statusMeta.label}
                            </span>
                          </div>
                          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-secondary)' }}>{safeValue(dataset.archivo)}</div>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{formatCount(dataset.filas)}</td>
                        <td style={tdStyle}>{dataset.avance}%</td>
                        <td style={tdStyle}>{formatPercent(dataset.efectividad)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => onViewDataset(dataset.id)}
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
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!datasetsLoading && datasets.length === 0 ? (
                    <tr><td colSpan={5} style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>No hay datasets para mostrar.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Última importación: {summary.lastImport || '-'}
            </div>
          </Panel>
        </>
      )}

      {vistaProduccion === 'vendedor' && (
        <Panel title="Rendimiento por vendedor" subtitle="Agrupado sobre todos los datasets importados">
          <div className="table-wrap" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={thStyle}>Vendedor</th>
                  <th style={thStyle}>Sin gestión</th>
                  <th style={thStyle}>No contesta</th>
                  <th style={thStyle}>Seguimiento</th>
                  <th style={thStyle}>Rellamar</th>
                  <th style={thStyle}>Dato err.</th>
                  <th style={thStyle}>Ventas</th>
                  <th style={thStyle}>Rechazos</th>
                  <th style={thStyle}>Efect.</th>
                </tr>
              </thead>
              <tbody>
                {sellerRowsLoading ? (
                  <tr><td colSpan={9} style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>Cargando vendedores...</td></tr>
                ) : sellerRows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{row.vendedor}</td>
                    <td style={tdStyle}>{formatCount(row.sinGestion)}</td>
                    <td style={tdStyle}>{formatCount(row.noContesta)}</td>
                    <td style={tdStyle}>{formatCount(row.seguimiento)}</td>
                    <td style={tdStyle}>{formatCount(row.rellamar)}</td>
                    <td style={tdStyle}>{formatCount(row.datoErroneo)}</td>
                    <td style={{ ...tdStyle, color: '#166534', fontWeight: 600 }}>{formatCount(row.recuperado)}</td>
                    <td style={{ ...tdStyle, color: '#993C1D', fontWeight: 600 }}>{formatCount(row.rechazado)}</td>
                    <td style={tdStyle}>{formatPercent(row.efectividad)}</td>
                  </tr>
                ))}
                {!sellerRowsLoading && sellerRows.length === 0 ? (
                  <tr><td colSpan={9} style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>No hay métricas por vendedor para mostrar.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
