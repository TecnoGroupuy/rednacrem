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

const normalizeSummary = (response) => {
  const payload = extractPayload(response);
  const summary = payload?.summary && typeof payload.summary === 'object' ? payload.summary : payload;
  const totalImportadas = getSummaryValue(summary, ['total_importadas', 'filas_importadas', 'total_rows', 'total', 'total_bajas']);
  const depuradas = getSummaryValue(summary, ['depuradas', 'total_depuradas', 'excluded_rows']);
  const baseUtil = getSummaryValue(summary, ['base_util', 'baseUtil', 'usable_base'], Math.max(totalImportadas - depuradas, 0));
  const pendiente = getSummaryValue(summary, ['pendiente', 'pendientes', 'pending']);
  const enGestion = getSummaryValue(summary, ['en_gestion', 'gestionados_abiertos', 'in_progress']);
  const recuperado = getSummaryValue(summary, ['recuperado', 'recuperados', 'recovered']);
  const rechazado = getSummaryValue(summary, ['rechazado', 'rechazados', 'rejected']);
  const datoErroneo = getSummaryValue(summary, ['dato_erroneo', 'datoErroneo', 'invalid_data']);
  const efectividad = getEffectivenessValue(summary);
  return {
    totalImportadas,
    depuradas,
    baseUtil,
    pendiente,
    enGestion,
    recuperado,
    rechazado,
    datoErroneo,
    efectividad,
    datasetsActivos: getSummaryValue(summary, ['datasets_activos', 'datasets', 'total_datasets']),
    activeSellers: getSummaryValue(summary, ['active_sellers', 'vendedores_activos']),
    lastImport: asText(summary?.last_import, summary?.ultima_importacion, summary?.latest_import_name),
    goal: getSummaryValue(summary, ['goal', 'meta']),
    scope: asText(summary?.scope, summary?.organization_scope, 'organization_id')
  };
};

const normalizeDataset = (item, index) => {
  const filas = getSummaryValue(item, ['filas', 'total', 'total_candidates', 'rows_count', 'candidatos']);
  const excluidos = getSummaryValue(item, ['excluidos', 'excluded', 'excluded_count']);
  const pendiente = getSummaryValue(item, ['pendiente', 'pendientes', 'pending']);
  const enGestion = getSummaryValue(item, ['en_gestion', 'gestion', 'in_progress']);
  const recuperado = getSummaryValue(item, ['recuperado', 'recuperados', 'recovered']);
  const rechazado = getSummaryValue(item, ['rechazado', 'rechazados', 'rejected']);
  const datoErroneo = getSummaryValue(item, ['dato_erroneo', 'datoErroneo', 'invalid_data']);
  return {
    id: asText(item?.id, item?.dataset_id, item?.datasetId, `dataset-${index + 1}`),
    nombre: asText(item?.nombre, item?.name, item?.dataset_name, `Dataset ${index + 1}`),
    archivo: asText(item?.archivo, item?.file_name, item?.filename),
    estado: normalizeKey(item?.estado, item?.status) || 'activo',
    filas,
    excluidos,
    pendiente,
    enGestion,
    recuperado,
    rechazado,
    datoErroneo,
    avance: getSummaryValue(item, ['avance', 'progress', 'progress_pct'], calcRate(recuperado + rechazado + datoErroneo, Math.max(filas - excluidos, 1))),
    efectividad: getEffectivenessValue(item)
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
    `${asText(item?.nombre, item?.name)} ${asText(item?.apellido, item?.last_name)}`.trim(),
    item?.email,
    `Vendedor ${index + 1}`
  ),
  datasets: getSummaryValue(item, ['datasets', 'dataset_count']),
  pendiente: getSummaryValue(item, ['pendiente', 'pendientes', 'pending']),
  enGestion: getSummaryValue(item, ['en_gestion', 'gestion', 'in_progress']),
  recuperado: getSummaryValue(item, ['recuperado', 'recuperados', 'recovered']),
  rechazado: getSummaryValue(item, ['rechazado', 'rechazados', 'rejected']),
  datoErroneo: getSummaryValue(item, ['dato_erroneo', 'datoErroneo', 'invalid_data']),
  avance: getSummaryValue(item, ['avance', 'progress', 'progress_pct']),
  efectividad: getSummaryValue(item, ['efectividad', 'effectiveness'])
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
    pendiente: 0,
    enGestion: 0,
    recuperado: 0,
    rechazado: 0,
    datoErroneo: 0,
    efectividad: 0,
    datasetsActivos: 0,
    activeSellers: 0,
    lastImport: '',
    goal: 0,
    scope: 'organization_id'
  });
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

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)' }}>En produccion</div>
        <div style={{ marginTop: 4, fontSize: 14, color: 'var(--color-text-secondary)' }}>
          {summaryLoading
            ? 'Cargando resumen...'
            : `${formatCount(summary.datasetsActivos || datasets.length)} datasets activos · ${formatCount(summary.activeSellers)} vendedores activos · scope ${summary.scope || 'organization_id'}`}
        </div>
      </div>

      {(summaryError || datasetsError || sellerRowsError) && (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FEF2F2', color: '#B91C1C', fontWeight: 700 }}>
          {summaryError || datasetsError || sellerRowsError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Base util', value: formatCount(summary.baseUtil), color: 'var(--color-text-primary)', sub: `de ${formatCount(summary.totalImportadas)} filas · ${formatCount(summary.depuradas)} depuradas` },
          { label: 'Pendiente', value: formatCount(summary.pendiente), color: '#64748B', sub: 'nunca gestionado' },
          { label: 'En gestion', value: formatCount(summary.enGestion), color: '#A16207', sub: 'con intento, sin cierre' },
          { label: 'Recuperado', value: formatCount(summary.recuperado), color: '#15803D', sub: `${calcRate(summary.recuperado, summary.baseUtil)}% de la base util` },
          { label: 'Rechazado', value: formatCount(summary.rechazado), color: '#B91C1C', sub: `${calcRate(summary.rechazado, summary.baseUtil)}% de la base util` },
          { label: 'Efectividad', value: formatPercent(summary.efectividad), color: '#0F766E', sub: 'excluye dato erroneo' }
        ].map((card) => (
          <div key={card.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: card.label === 'Efectividad' ? '1px solid rgba(15,118,110,0.45)' : '0.5px solid var(--color-border-tertiary)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: card.color, marginTop: 10 }}>{summaryLoading ? '...' : card.value}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <Panel title="Datasets importados" subtitle={`${datasets.length} cargas · scope ${summary.scope || 'organization_id'}`}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Dataset</th>
                <th>Filas</th>
                <th>Excluidos</th>
                <th>Pend.</th>
                <th>Gest.</th>
                <th>Recup.</th>
                <th>Rech.</th>
                <th>Dato err.</th>
                <th>Avance</th>
              </tr>
            </thead>
            <tbody>
              {datasetsLoading ? (
                <tr><td colSpan={9} style={{ padding: 16, color: 'var(--color-text-secondary)' }}>Cargando datasets...</td></tr>
              ) : datasets.map((dataset) => {
                const statusMeta = datasetStatusMeta(dataset.estado);
                return (
                  <tr key={dataset.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 900 }}>{dataset.nombre}</div>
                        <span style={{ padding: '3px 8px', borderRadius: 999, background: statusMeta.bg, color: statusMeta.color, fontSize: 12, fontWeight: 800 }}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-secondary)' }}>{safeValue(dataset.archivo)}</div>
                    </td>
                    <td style={{ fontWeight: 800 }}>{formatCount(dataset.filas)}</td>
                    <td>{formatCount(dataset.excluidos)}</td>
                    <td>{formatCount(dataset.pendiente)}</td>
                    <td style={{ color: '#A16207', fontWeight: 800 }}>{formatCount(dataset.enGestion)}</td>
                    <td style={{ color: '#15803D', fontWeight: 800 }}>{formatCount(dataset.recuperado)}</td>
                    <td style={{ color: '#B91C1C', fontWeight: 800 }}>{formatCount(dataset.rechazado)}</td>
                    <td>{formatCount(dataset.datoErroneo)}</td>
                    <td>
                      <div style={{ minWidth: 140 }}>
                        <div style={{ height: 8, background: '#E5E7EB', borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
                          <div style={{ width: `${calcRate(dataset.enGestion, dataset.filas)}%`, background: '#CA8A04' }} />
                          <div style={{ width: `${calcRate(dataset.recuperado, dataset.filas)}%`, background: '#15803D' }} />
                          <div style={{ width: `${calcRate(dataset.rechazado, dataset.filas)}%`, background: '#B91C1C' }} />
                          <div style={{ width: `${calcRate(dataset.datoErroneo, dataset.filas)}%`, background: '#9CA3AF' }} />
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>{dataset.avance}% cerrado · efect. {formatPercent(dataset.efectividad)}</div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!datasetsLoading && datasets.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 16, color: 'var(--color-text-secondary)' }}>No hay datasets para mostrar.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>
          Ultima importacion: {summary.lastImport || '-'} · scope: {summary.scope || 'organization_id'}
        </div>
      </Panel>

      <Panel title="Rendimiento por vendedor" subtitle="Agrupado sobre todos los datasets importados">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vendedor</th>
                <th>Datasets</th>
                <th>Pend.</th>
                <th>Gest.</th>
                <th>Recup.</th>
                <th>Rech.</th>
                <th>Dato err.</th>
                <th>Avance</th>
                <th>Efect.</th>
              </tr>
            </thead>
            <tbody>
              {sellerRowsLoading ? (
                <tr><td colSpan={9} style={{ padding: 16, color: 'var(--color-text-secondary)' }}>Cargando vendedores...</td></tr>
              ) : sellerRows.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 800 }}>{row.vendedor}</td>
                  <td>{formatCount(row.datasets)}</td>
                  <td>{formatCount(row.pendiente)}</td>
                  <td style={{ color: '#A16207', fontWeight: 800 }}>{formatCount(row.enGestion)}</td>
                  <td style={{ color: '#15803D', fontWeight: 800 }}>{formatCount(row.recuperado)}</td>
                  <td style={{ color: '#B91C1C', fontWeight: 800 }}>{formatCount(row.rechazado)}</td>
                  <td>{formatCount(row.datoErroneo)}</td>
                  <td>{row.avance}%</td>
                  <td>{formatPercent(row.efectividad)}</td>
                </tr>
              ))}
              {!sellerRowsLoading && sellerRows.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 16, color: 'var(--color-text-secondary)' }}>No hay metricas por vendedor para mostrar.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
