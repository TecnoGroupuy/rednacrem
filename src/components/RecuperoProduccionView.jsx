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
  const excluidos = getCountValue(item, ['excluidos', 'excluded', 'excluded_count', 'duplicate_rows']);
  const pendiente = getCountValue(item, ['pending', 'pendiente', 'pendientes']);
  const enGestion = getCountValue(item, ['in_progress', 'en_gestion', 'gestion']);
  const recuperado = getCountValue(item, ['recovered', 'recuperado', 'recuperados']);
  const rechazado = getCountValue(item, ['rejected', 'rechazado', 'rechazados']);
  const datoErroneo = getCountValue(item, ['dato_erroneo', 'datoErroneo', 'invalid_data']);
  return {
    id: asText(item?.id, item?.dataset_id, item?.datasetId, `dataset-${index + 1}`),
    nombre: asText(item?.nombre, item?.name, item?.dataset_name, `Dataset ${index + 1}`),
    archivo: asText(item?.archivo, item?.source_file, item?.file_name, item?.filename),
    estado: normalizeKey(item?.estado, item?.status) || 'activo',
    filas,
    excluidos,
    pendiente,
    enGestion,
    recuperado,
    rechazado,
    datoErroneo,
    avance: getSummaryValue(item, ['avance', 'progress', 'progress_pct'], calcRate(recuperado + rechazado + datoErroneo, Math.max(filas - excluidos, 1))),
    efectividad: getEffectivenessValue({ recuperado, rechazado })
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
  onSync = () => {}
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

  const breakdownValue = (value) => (summary.hasBreakdown ? formatCount(value) : '—');

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Base útil', value: formatCount(summary.baseUtil), color: 'var(--color-text-primary)', accent: false, sub: `de ${formatCount(summary.totalImportadas)} filas · ${formatCount(summary.depuradas)} depuradas` },
              { label: 'Sin gestión', value: breakdownValue(summary.sinGestion), color: 'var(--color-text-secondary)', accent: false, sub: 'asignados, sin intento todavía' },
              { label: 'No contesta', value: breakdownValue(summary.noContesta), color: 'var(--color-text-secondary)', accent: false, sub: 'intentado, sin respuesta' },
              { label: 'Seguimiento', value: breakdownValue(summary.seguimiento), color: 'var(--color-text-secondary)', accent: false, sub: 'con próxima acción agendada' },
              { label: 'Rellamar', value: breakdownValue(summary.rellamar), color: 'var(--color-text-secondary)', accent: false, sub: 'pidió que lo llamen después' },
              { label: 'Dato erróneo', value: breakdownValue(summary.datoErroneo), color: 'var(--color-text-secondary)', accent: false, sub: 'datos de contacto inválidos' },
              { label: 'Ventas / Recuperados', value: formatCount(summary.recuperado), color: '#166534', accent: false, sub: `${calcRate(summary.recuperado, summary.baseUtil)}% de la base útil` },
              { label: 'Rechazos', value: formatCount(summary.rechazado), color: '#993C1D', accent: false, sub: `${calcRate(summary.rechazado, summary.baseUtil)}% de la base útil` },
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
                    <th style={thStyle}>Filas</th>
                    <th style={thStyle}>Excluidos</th>
                    <th style={thStyle}>Pend.</th>
                    <th style={thStyle}>Gest.</th>
                    <th style={thStyle}>Recup.</th>
                    <th style={thStyle}>Rech.</th>
                    <th style={thStyle}>Dato err.</th>
                    <th style={thStyle}>Avance</th>
                  </tr>
                </thead>
                <tbody>
                  {datasetsLoading ? (
                    <tr><td colSpan={9} style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>Cargando datasets...</td></tr>
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
                        <td style={tdStyle}>{formatCount(dataset.excluidos)}</td>
                        <td style={{ ...tdStyle, color: '#BA7517' }}>{formatCount(dataset.pendiente)}</td>
                        <td style={{ ...tdStyle, color: '#0F6E56', fontWeight: 600 }}>{formatCount(dataset.enGestion)}</td>
                        <td style={{ ...tdStyle, color: '#166534', fontWeight: 600 }}>{formatCount(dataset.recuperado)}</td>
                        <td style={{ ...tdStyle, color: '#993C1D', fontWeight: 600 }}>{formatCount(dataset.rechazado)}</td>
                        <td style={tdStyle}>{formatCount(dataset.datoErroneo)}</td>
                        <td style={tdStyle}>
                          <div style={{ minWidth: 140 }}>
                            <div style={{ height: 8, background: '#E5E7EB', borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
                              <div style={{ width: `${calcRate(dataset.enGestion, dataset.filas)}%`, background: '#0F6E56' }} />
                              <div style={{ width: `${calcRate(dataset.recuperado, dataset.filas)}%`, background: '#166534' }} />
                              <div style={{ width: `${calcRate(dataset.rechazado, dataset.filas)}%`, background: '#993C1D' }} />
                              <div style={{ width: `${calcRate(dataset.datoErroneo, dataset.filas)}%`, background: '#9CA3AF' }} />
                            </div>
                            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>{dataset.avance}% cerrado · efect. {formatPercent(dataset.efectividad)}</div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!datasetsLoading && datasets.length === 0 ? (
                    <tr><td colSpan={9} style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>No hay datasets para mostrar.</td></tr>
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
