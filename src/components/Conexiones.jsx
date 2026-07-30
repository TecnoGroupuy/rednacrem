import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Plus, RefreshCw, X } from 'lucide-react';
import { getApiClient } from '../services/apiClient.js';
import { listMyOrganizations } from '../services/organizationsService.js';

const emptyDraft = {
  id: '',
  nombre: '',
  url: '',
  apiKey: '',
  activa: true,
  todosProductos: true,
  productos: []
};

const SMS_TABS = [
  { key: 'club', label: 'Club del Adulto Mayor' },
  { key: 'webhooks', label: 'Webhooks' },
  { key: 'sms', label: 'SMS' }
];

const SMS_STATUS_META = {
  connected: { label: 'Conectado', variant: 'success' },
  idle: { label: 'Sin probar', variant: 'outline' },
  error: { label: 'Error', variant: 'danger' }
};

const SMS_LOG_STATUS_META = {
  entregado: { label: 'Entregado', variant: 'success' },
  enviado: { label: 'Enviado', variant: 'warning' },
  fallo: { label: 'Fallo', variant: 'danger' }
};

const emptySmsConnectionDraft = {
  organizationId: '',
  host: '',
  port: '',
  simPorts: '',
  username: '',
  password: ''
};

const emptySmsTemplateDraft = {
  organizationId: '',
  template: '',
  encoding: 'gsm-7bit'
};

const normalizeItems = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.connections)) return response.connections;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  return [];
};

const normalizeSmsLogItems = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  return [];
};

const productId = (product) => String(product?.id || product?.product_id || '');
const productName = (product) => product?.nombre || product?.name || product?.nombreProducto || product?.nombre_producto || 'Producto';
const organizationIdOf = (item) => String(item?.id || item?.organization_id || item?.organizationId || '');
const organizationNameOf = (item) => item?.nombre || item?.name || item?.organization_name || 'Organización';
const getEncodingLimit = (encoding) => (encoding === 'unicode' ? 70 : 160);

const normalizeSmsConnectionStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['connected', 'conectado', 'ok', 'success'].includes(normalized)) return 'connected';
  if (['error', 'failed', 'fallo', 'fallado'].includes(normalized)) return 'error';
  return 'idle';
};

const normalizeSmsLogStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'entregado') return 'entregado';
  if (['fallo', 'fallado', 'error'].includes(normalized)) return 'fallo';
  return 'enviado';
};

const normalizeSmsConnectionResponse = (response, organizationId = '') => {
  const item = response?.item || response?.data || response || {};
  const simPorts = Array.isArray(item?.sim_ports)
    ? item.sim_ports.join(', ')
    : String(item?.sim_ports || item?.simPorts || '');
  return {
    organizationId: String(item?.organization_id || item?.organizationId || organizationId || ''),
    host: item?.host || item?.ip || '',
    port: String(item?.port || ''),
    simPorts,
    username: item?.username || item?.user || '',
    password: item?.password || '',
    status: normalizeSmsConnectionStatus(item?.last_test_status || item?.status)
  };
};

const normalizeSmsTemplateResponse = (response, organizationId = '') => {
  const item = response?.item || response?.data || response || {};
  return {
    organizationId: String(item?.organization_id || item?.organizationId || organizationId || ''),
    template: String(item?.template || ''),
    encoding: item?.encoding === 'unicode' ? 'unicode' : 'gsm-7bit'
  };
};

export default function Conexiones({ Button, Panel, Tag }) {
  const api = getApiClient();
  const [activeTab, setActiveTab] = useState('webhooks');
  const [connections, setConnections] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [logTarget, setLogTarget] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');

  const [orgs, setOrgs] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [orgsError, setOrgsError] = useState('');

  const [smsConnectionDraft, setSmsConnectionDraft] = useState(emptySmsConnectionDraft);
  const [smsConnectionStatus, setSmsConnectionStatus] = useState('idle');
  const [smsConnectionLoading, setSmsConnectionLoading] = useState(false);
  const [smsConnectionSaving, setSmsConnectionSaving] = useState(false);
  const [smsConnectionTesting, setSmsConnectionTesting] = useState(false);
  const [smsConnectionError, setSmsConnectionError] = useState('');
  const [smsConnectionMessage, setSmsConnectionMessage] = useState('');
  const [smsPasswordVisible, setSmsPasswordVisible] = useState(false);

  const [smsTemplateDraft, setSmsTemplateDraft] = useState(emptySmsTemplateDraft);
  const [smsTemplateLoading, setSmsTemplateLoading] = useState(false);
  const [smsTemplateSaving, setSmsTemplateSaving] = useState(false);
  const [smsTemplateError, setSmsTemplateError] = useState('');
  const [smsTemplateMessage, setSmsTemplateMessage] = useState('');

  const [smsLogRows, setSmsLogRows] = useState([]);
  const [smsLogLoading, setSmsLogLoading] = useState(false);
  const [smsLogError, setSmsLogError] = useState('');

  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach((product) => map.set(productId(product), productName(product)));
    return map;
  }, [products]);

  const organizationOptions = useMemo(
    () => orgs
      .map((item) => ({ id: organizationIdOf(item), label: organizationNameOf(item) }))
      .filter((item) => item.id),
    [orgs]
  );

  const selectedOrganizationId = smsConnectionDraft.organizationId || smsTemplateDraft.organizationId || organizationOptions[0]?.id || '';
  const smsConnectionBadge = SMS_STATUS_META[smsConnectionStatus] || SMS_STATUS_META.idle;
  const smsTemplateLimit = getEncodingLimit(smsTemplateDraft.encoding);
  const smsTemplateLength = smsTemplateDraft.template.length;

  const loadConnections = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/connections');
      setConnections(normalizeItems(response));
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar las conexiones.');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.get('/api/products');
      setProducts(normalizeItems(response));
    } catch {
      setProducts([]);
    }
  };

  const loadOrganizations = useCallback(async () => {
    setOrgsLoading(true);
    setOrgsError('');
    try {
      const items = await listMyOrganizations();
      setOrgs(items);
      const firstOrganizationId = organizationIdOf(items[0]);
      if (firstOrganizationId) {
        setSmsConnectionDraft((prev) => ({ ...prev, organizationId: prev.organizationId || firstOrganizationId }));
        setSmsTemplateDraft((prev) => ({ ...prev, organizationId: prev.organizationId || firstOrganizationId }));
      }
    } catch (err) {
      setOrgs([]);
      setOrgsError(err?.message || 'No se pudieron cargar las organizaciones.');
    } finally {
      setOrgsLoading(false);
    }
  }, []);

  const loadSmsConnection = useCallback(async (organizationId) => {
    if (!organizationId) return;
    setSmsConnectionLoading(true);
    setSmsConnectionError('');
    setSmsConnectionMessage('');
    try {
      const response = await api.get(`/api/sms-connections?organization_id=${encodeURIComponent(organizationId)}`);
      const normalized = normalizeSmsConnectionResponse(response, organizationId);
      setSmsConnectionDraft({
        organizationId,
        host: normalized.host,
        port: normalized.port,
        simPorts: normalized.simPorts,
        username: normalized.username,
        password: normalized.password
      });
      setSmsConnectionStatus(normalized.status);
    } catch (err) {
      if ([404, 501].includes(Number(err?.status))) {
        setSmsConnectionDraft({ ...emptySmsConnectionDraft, organizationId });
        setSmsConnectionStatus('idle');
      } else {
        setSmsConnectionError(err?.message || 'No se pudo cargar la conexión SMS.');
      }
    } finally {
      setSmsConnectionLoading(false);
    }
  }, [api]);

  const loadSmsTemplate = useCallback(async (organizationId) => {
    if (!organizationId) return;
    setSmsTemplateLoading(true);
    setSmsTemplateError('');
    setSmsTemplateMessage('');
    try {
      const response = await api.get(`/api/sms-template?organization_id=${encodeURIComponent(organizationId)}`);
      const normalized = normalizeSmsTemplateResponse(response, organizationId);
      setSmsTemplateDraft({
        organizationId,
        template: normalized.template,
        encoding: normalized.encoding
      });
    } catch (err) {
      if ([404, 501].includes(Number(err?.status))) {
        setSmsTemplateDraft({ ...emptySmsTemplateDraft, organizationId });
      } else {
        setSmsTemplateError(err?.message || 'No se pudo cargar la plantilla SMS.');
      }
    } finally {
      setSmsTemplateLoading(false);
    }
  }, [api]);

  const loadSmsLog = useCallback(async (organizationId) => {
    if (!organizationId) return;
    setSmsLogLoading(true);
    setSmsLogError('');
    try {
      const response = await api.get(`/api/sms-log?organization_id=${encodeURIComponent(organizationId)}&limit=20`);
      setSmsLogRows(normalizeSmsLogItems(response));
    } catch (err) {
      if ([404, 501].includes(Number(err?.status))) {
        setSmsLogRows([]);
      } else {
        setSmsLogError(err?.message || 'No se pudo cargar la actividad reciente.');
      }
    } finally {
      setSmsLogLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadConnections();
    loadProducts();
  }, []);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    if (!selectedOrganizationId) return;
    loadSmsConnection(selectedOrganizationId);
    loadSmsTemplate(selectedOrganizationId);
    loadSmsLog(selectedOrganizationId);
  }, [selectedOrganizationId, loadSmsConnection, loadSmsTemplate, loadSmsLog]);

  const openCreate = () => {
    setEditingConnection(null);
    setDraft(emptyDraft);
    setShowApiKey(false);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (connection) => {
    const enabledProducts = Array.isArray(connection.product_ids)
      ? connection.product_ids.map((item) => String(item?.id || item?.product_id || item)).filter(Boolean)
      : Array.isArray(connection.productos)
        ? connection.productos.map((item) => String(item?.id || item?.product_id || item)).filter(Boolean)
        : [];
    setEditingConnection(connection);
    setDraft({
      id: connection.id || '',
      nombre: connection.nombre || connection.name || '',
      url: connection.url || '',
      apiKey: '',
      activa: connection.activa ?? connection.active ?? true,
      todosProductos: Boolean(connection.todos_productos ?? connection.todosProductos ?? true),
      productos: enabledProducts
    });
    setShowApiKey(false);
    setFormError('');
    setFormOpen(true);
  };

  const toggleProduct = (id) => {
    setDraft((prev) => {
      const exists = prev.productos.includes(id);
      return {
        ...prev,
        todosProductos: false,
        productos: exists ? prev.productos.filter((item) => item !== id) : [...prev.productos, id]
      };
    });
  };

  const saveConnection = async () => {
    if (!draft.nombre.trim() || !draft.url.trim() || (!editingConnection && !draft.apiKey.trim())) {
      setFormError('Nombre, URL y API Key son obligatorios.');
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = {
      nombre: draft.nombre.trim(),
      url: draft.url.trim(),
      activa: Boolean(draft.activa),
      todos_productos: Boolean(draft.todosProductos),
      productos: draft.todosProductos ? [] : draft.productos
    };
    if (draft.apiKey.trim()) payload.api_key = draft.apiKey.trim();
    try {
      if (editingConnection?.id) {
        await api.put(`/api/connections/${encodeURIComponent(editingConnection.id)}`, payload);
      } else {
        await api.post('/api/connections', payload);
      }
      setFormOpen(false);
      await loadConnections();
    } catch (err) {
      setFormError(err?.message || 'No se pudo guardar la conexión.');
    } finally {
      setSaving(false);
    }
  };

  const deleteConnection = async (connection = editingConnection) => {
    if (!connection?.id) return;
    if (!window.confirm('¿Eliminar esta conexión?')) return;
    setSaving(true);
    try {
      await api.del(`/api/connections/${encodeURIComponent(connection.id)}`);
      if (editingConnection?.id === connection.id) setFormOpen(false);
      await loadConnections();
    } catch (err) {
      setFormError(err?.message || 'No se pudo eliminar la conexión.');
    } finally {
      setSaving(false);
    }
  };

  const toggleConnectionStatus = async (connection) => {
    const id = connection.id;
    if (!id) return;
    try {
      await api.put(`/api/connections/${encodeURIComponent(id)}`, {
        ...connection,
        activa: !(connection.activa ?? connection.active)
      });
      await loadConnections();
    } catch (err) {
      setError(err?.message || 'No se pudo cambiar el estado de la conexión.');
    }
  };

  const openLogs = async (connection, page = 1) => {
    setLogTarget(connection);
    setLogsPage(page);
    setLogsLoading(true);
    setLogsError('');
    try {
      const response = await api.get(`/api/connections/${encodeURIComponent(connection.id)}/logs?page=${page}`);
      setLogs(normalizeItems(response));
      setLogsTotalPages(Number(response?.totalPages || response?.meta?.totalPages || 1));
    } catch (err) {
      setLogs([]);
      setLogsError(err?.message || 'No se pudo cargar el log.');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSmsOrganizationChange = (organizationId) => {
    setSmsConnectionDraft((prev) => ({ ...prev, organizationId }));
    setSmsTemplateDraft((prev) => ({ ...prev, organizationId }));
  };

  const handleTestSmsConnection = async () => {
    if (!smsConnectionDraft.organizationId) {
      setSmsConnectionError('Selecciona una organización.');
      return;
    }
    setSmsConnectionTesting(true);
    setSmsConnectionError('');
    setSmsConnectionMessage('');
    try {
      const response = await api.post('/api/sms-connections/test', {
        organization_id: smsConnectionDraft.organizationId,
        host: smsConnectionDraft.host.trim(),
        port: smsConnectionDraft.port.trim(),
        sim_ports: smsConnectionDraft.simPorts.split(',').map((item) => item.trim()).filter(Boolean),
        username: smsConnectionDraft.username.trim(),
        password: smsConnectionDraft.password
      });
      setSmsConnectionStatus(normalizeSmsConnectionStatus(response?.status || response?.last_test_status || 'connected'));
      setSmsConnectionMessage('Conexión probada correctamente.');
    } catch (err) {
      if ([404, 501].includes(Number(err?.status))) {
        setSmsConnectionStatus('connected');
        setSmsConnectionMessage('Mock local: conexión validada para esta maqueta.');
      } else {
        setSmsConnectionStatus('error');
        setSmsConnectionError(err?.message || 'No se pudo probar la conexión SMS.');
      }
    } finally {
      setSmsConnectionTesting(false);
    }
  };

  const handleSaveSmsConnection = async () => {
    if (!smsConnectionDraft.organizationId) {
      setSmsConnectionError('Selecciona una organización.');
      return;
    }
    setSmsConnectionSaving(true);
    setSmsConnectionError('');
    setSmsConnectionMessage('');
    try {
      await api.post('/api/sms-connections', {
        organization_id: smsConnectionDraft.organizationId,
        host: smsConnectionDraft.host.trim(),
        port: smsConnectionDraft.port.trim(),
        sim_ports: smsConnectionDraft.simPorts.split(',').map((item) => item.trim()).filter(Boolean),
        username: smsConnectionDraft.username.trim(),
        password: smsConnectionDraft.password
      });
      setSmsConnectionMessage('Configuración guardada.');
    } catch (err) {
      if ([404, 501].includes(Number(err?.status))) {
        setSmsConnectionMessage('Mock local: configuración guardada para esta maqueta.');
      } else {
        setSmsConnectionError(err?.message || 'No se pudo guardar la conexión SMS.');
      }
    } finally {
      setSmsConnectionSaving(false);
    }
  };

  const handleSaveSmsTemplate = async () => {
    if (!smsTemplateDraft.organizationId) {
      setSmsTemplateError('Selecciona una organización.');
      return;
    }
    setSmsTemplateSaving(true);
    setSmsTemplateError('');
    setSmsTemplateMessage('');
    try {
      await api.post('/api/sms-template', {
        organization_id: smsTemplateDraft.organizationId,
        template: smsTemplateDraft.template,
        encoding: smsTemplateDraft.encoding
      });
      setSmsTemplateMessage('Plantilla guardada.');
    } catch (err) {
      if ([404, 501].includes(Number(err?.status))) {
        setSmsTemplateMessage('Mock local: plantilla guardada para esta maqueta.');
      } else {
        setSmsTemplateError(err?.message || 'No se pudo guardar la plantilla SMS.');
      }
    } finally {
      setSmsTemplateSaving(false);
    }
  };

  return (
    <div className="view">
      <section className="content-grid">
        <Panel
          className="span-12"
          title="Conexiones"
          subtitle="Webhooks y envíos externos"
          action={activeTab === 'webhooks' ? <Button icon={<Plus size={16} />} onClick={openCreate}>Nueva conexión</Button> : null}
        >
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {SMS_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    border: isActive ? '1px solid #1A5C4A' : '1px solid rgba(148,163,184,0.4)',
                    background: isActive ? 'rgba(15,118,110,0.1)' : '#fff',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#0f766e' : '#334155',
                    borderRadius: 999,
                    padding: '8px 14px',
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'club' ? (
            <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 16, background: '#fff', color: 'var(--muted)' }}>
              Sin configuración disponible para Club del Adulto Mayor en esta maqueta.
            </div>
          ) : null}

          {activeTab === 'webhooks' ? (
            <>
              <div className="toolbar" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>{connections.length} conexión(es)</div>
                <Button variant="ghost" icon={<RefreshCw size={16} />} onClick={loadConnections} disabled={loading}>Actualizar</Button>
              </div>
              {error ? <div style={{ color: '#be123c', fontWeight: 700, marginBottom: 10 }}>{error}</div> : null}
              {loading ? <div style={{ color: 'var(--muted)', padding: 16 }}>Cargando conexiones...</div> : null}
              <div style={{ display: 'grid', gap: 12 }}>
                {connections.map((connection) => {
                  const active = connection.activa ?? connection.active;
                  const enabledProducts = Array.isArray(connection.productos) ? connection.productos : [];
                  const lastLog = connection.lastLog || connection.ultimo_log || {};
                  return (
                    <div key={connection.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14, background: '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 800 }}>{connection.nombre || connection.name || 'Sin nombre'}</div>
                          <div style={{ color: 'var(--muted)', fontSize: 13 }}>{connection.url}</div>
                        </div>
                        <Tag variant={active ? 'success' : 'info'}>{active ? 'Activa' : 'Pausada'}</Tag>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                        {(connection.todos_productos === true || connection.todosProductos === true) ? (
                          <span className="pill">Todos los productos</span>
                        ) : enabledProducts.map((item) => {
                          const id = String(item?.id || item?.product_id || item);
                          return <span key={id} className="pill">{productMap.get(id) || item?.nombre || item?.name || id}</span>;
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, color: 'var(--muted)', fontSize: 13 }}>
                        <span>Último envío: {lastLog.fecha || lastLog.createdAt || connection.lastSent || '-'}</span>
                        <span>Total enviados: {connection.totalSent ?? connection.total_enviados ?? 0}</span>
                        <span>Errores: {connection.errors ?? connection.errores ?? 0}</span>
                      </div>
                      <div className="toolbar" style={{ marginTop: 12 }}>
                        <Button variant="ghost" onClick={() => openLogs(connection)}>Ver log</Button>
                        <Button variant="secondary" onClick={() => openEdit(connection)}>Editar</Button>
                        <button
                          type="button"
                          className="button"
                          onClick={() => deleteConnection(connection)}
                          disabled={saving}
                          style={{ background: 'transparent', border: '1px solid #b91c1c', color: '#b91c1c', boxShadow: 'none' }}
                        >
                          Eliminar
                        </button>
                        <Button variant="secondary" onClick={() => toggleConnectionStatus(connection)}>{active ? 'Pausar' : 'Activar'}</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!loading && !connections.length ? <div style={{ padding: 16, color: 'var(--muted)' }}>No hay conexiones configuradas.</div> : null}
            </>
          ) : null}

          {activeTab === 'sms' ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14, background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>Conexión gateway Dinstar</div>
                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>Configuración del gateway SMS por organización</div>
                  </div>
                  <Tag variant={smsConnectionBadge.variant}>{smsConnectionBadge.label}</Tag>
                </div>
                {orgsError ? <div style={{ color: '#be123c', fontWeight: 700, marginBottom: 10 }}>{orgsError}</div> : null}
                {smsConnectionError ? <div style={{ color: '#be123c', fontWeight: 700, marginBottom: 10 }}>{smsConnectionError}</div> : null}
                {smsConnectionMessage ? <div style={{ color: '#15803d', fontWeight: 700, marginBottom: 10 }}>{smsConnectionMessage}</div> : null}
                {(orgsLoading || smsConnectionLoading) ? <div style={{ color: 'var(--muted)', paddingBottom: 12 }}>Cargando configuración SMS...</div> : null}
                <div style={{ display: 'grid', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Organización</span>
                    <select className="input" value={smsConnectionDraft.organizationId} onChange={(event) => handleSmsOrganizationChange(event.target.value)} disabled={orgsLoading || smsConnectionLoading}>
                      <option value="">Seleccionar organización...</option>
                      {organizationOptions.map((organization) => (
                        <option key={organization.id} value={organization.id}>{organization.label}</option>
                      ))}
                    </select>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Host / IP</span>
                      <input className="input" value={smsConnectionDraft.host} onChange={(event) => setSmsConnectionDraft((prev) => ({ ...prev, host: event.target.value }))} />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Puerto</span>
                      <input className="input" value={smsConnectionDraft.port} onChange={(event) => setSmsConnectionDraft((prev) => ({ ...prev, port: event.target.value }))} />
                    </label>
                  </div>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>SIM ports a usar</span>
                    <input className="input" value={smsConnectionDraft.simPorts} onChange={(event) => setSmsConnectionDraft((prev) => ({ ...prev, simPorts: event.target.value }))} placeholder="1,2,3" />
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Usuario</span>
                      <input className="input" value={smsConnectionDraft.username} onChange={(event) => setSmsConnectionDraft((prev) => ({ ...prev, username: event.target.value }))} />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Password</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input className="input" type={smsPasswordVisible ? 'text' : 'password'} value={smsConnectionDraft.password} onChange={(event) => setSmsConnectionDraft((prev) => ({ ...prev, password: event.target.value }))} />
                        <button type="button" className="button ghost" onClick={() => setSmsPasswordVisible((prev) => !prev)}>
                          {smsPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </label>
                  </div>
                  <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
                    <Button variant="ghost" onClick={handleTestSmsConnection} disabled={smsConnectionTesting || smsConnectionSaving}>
                      {smsConnectionTesting ? 'Probando...' : 'Probar conexión'}
                    </Button>
                    <Button onClick={handleSaveSmsConnection} disabled={smsConnectionSaving || smsConnectionTesting}>
                      {smsConnectionSaving ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
                </div>
              </div>

              <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14, background: '#fff' }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 800 }}>Plantilla de confirmación de alta</div>
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>Mensaje base para el envío automático</div>
                </div>
                {smsTemplateError ? <div style={{ color: '#be123c', fontWeight: 700, marginBottom: 10 }}>{smsTemplateError}</div> : null}
                {smsTemplateMessage ? <div style={{ color: '#15803d', fontWeight: 700, marginBottom: 10 }}>{smsTemplateMessage}</div> : null}
                {smsTemplateLoading ? <div style={{ color: 'var(--muted)', paddingBottom: 12 }}>Cargando plantilla SMS...</div> : null}
                <div style={{ display: 'grid', gap: 12 }}>
                  <textarea
                    className="input"
                    rows={5}
                    value={smsTemplateDraft.template}
                    onChange={(event) => setSmsTemplateDraft((prev) => ({ ...prev, template: event.target.value }))}
                    placeholder="Escribe la plantilla de confirmación..."
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['#nombre#', '#organizacion#', '#producto#', '#telefono_contacto#'].map((item) => (
                      <span key={item} className="pill">{item}</span>
                    ))}
                  </div>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Codificación</span>
                    <select className="input" value={smsTemplateDraft.encoding} onChange={(event) => setSmsTemplateDraft((prev) => ({ ...prev, encoding: event.target.value }))}>
                      <option value="gsm-7bit">gsm-7bit (160 caracteres)</option>
                      <option value="unicode">unicode (70 caracteres, admite tildes/ñ)</option>
                    </select>
                  </label>
                  <div style={{ fontSize: 12, fontWeight: 700, color: smsTemplateLength > smsTemplateLimit ? '#b91c1c' : '#64748b' }}>
                    {smsTemplateLength} / {smsTemplateLimit} caracteres
                  </div>
                  <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
                    <Button onClick={handleSaveSmsTemplate} disabled={smsTemplateSaving}>
                      {smsTemplateSaving ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
                </div>
              </div>

              <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14, background: '#fff' }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 800 }}>Actividad reciente</div>
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>Últimos SMS por organización</div>
                </div>
                {smsLogError ? <div style={{ color: '#be123c', fontWeight: 700, marginBottom: 10 }}>{smsLogError}</div> : null}
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Teléfono</th>
                        <th>Organización</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {smsLogRows.map((item, index) => {
                        const statusKey = normalizeSmsLogStatus(item?.estado || item?.status);
                        const statusMeta = SMS_LOG_STATUS_META[statusKey];
                        return (
                          <tr key={item?.id || `${item?.telefono || 'sms'}-${index}`}>
                            <td>{item?.cliente || item?.clientName || '-'}</td>
                            <td>{item?.telefono || item?.phone || '-'}</td>
                            <td>{item?.organizacion || item?.organization_name || item?.organizationName || '-'}</td>
                            <td><Tag variant={statusMeta.variant}>{statusMeta.label}</Tag></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {smsLogLoading ? <div style={{ padding: 16, color: 'var(--muted)' }}>Cargando actividad...</div> : null}
                  {!smsLogLoading && !smsLogRows.length ? <div style={{ padding: 16, color: 'var(--muted)' }}>Todavía no se enviaron SMS</div> : null}
                </div>
              </div>
            </div>
          ) : null}
        </Panel>
      </section>

      {formOpen ? (
        <div className="lot-wizard-overlay" onClick={() => setFormOpen(false)}>
          <div className="lot-wizard" style={{ maxWidth: 620 }} onClick={(event) => event.stopPropagation()}>
            <div className="lot-wizard-header">
              <div style={{ fontWeight: 800 }}>{editingConnection ? 'Editar conexión' : 'Nueva conexión'}</div>
              <button className="close-btn" onClick={() => setFormOpen(false)}><X size={16} /></button>
            </div>
            <div className="lot-wizard-content">
              <div style={{ display: 'grid', gap: 12 }}>
                <input className="input" placeholder="Nombre" value={draft.nombre} onChange={(event) => setDraft((prev) => ({ ...prev, nombre: event.target.value }))} required />
                <input className="input" placeholder="URL" value={draft.url} onChange={(event) => setDraft((prev) => ({ ...prev, url: event.target.value }))} required />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" type={showApiKey ? 'text' : 'password'} placeholder="API Key" value={draft.apiKey} onChange={(event) => setDraft((prev) => ({ ...prev, apiKey: event.target.value }))} required={!editingConnection} />
                  <button type="button" className="button ghost" onClick={() => setShowApiKey((value) => !value)}>{showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700 }}>
                  <input type="checkbox" checked={draft.todosProductos} onChange={(event) => setDraft((prev) => ({ ...prev, todosProductos: event.target.checked, productos: event.target.checked ? [] : prev.productos }))} />
                  Todos los productos
                </label>
                {!draft.todosProductos ? (
                  <div style={{ display: 'grid', gap: 8, maxHeight: 180, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 10, padding: 10 }}>
                    {products.map((product) => {
                      const id = productId(product);
                      return (
                        <label key={id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="checkbox" checked={draft.productos.includes(id)} onChange={() => toggleProduct(id)} />
                          {productName(product)}
                        </label>
                      );
                    })}
                  </div>
                ) : null}
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700 }}>
                  <input type="checkbox" checked={draft.activa} onChange={(event) => setDraft((prev) => ({ ...prev, activa: event.target.checked }))} />
                  {draft.activa ? 'Activa' : 'Pausada'}
                </label>
                {formError ? <div style={{ color: '#be123c', fontWeight: 700 }}>{formError}</div> : null}
              </div>
            </div>
            <div className="lot-wizard-footer">
              {editingConnection ? <Button variant="ghost" onClick={deleteConnection} disabled={saving}>Eliminar</Button> : null}
              <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={saveConnection} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </div>
        </div>
      ) : null}

      {logTarget ? (
        <div className="lot-wizard-overlay" onClick={() => setLogTarget(null)}>
          <div className="lot-wizard" style={{ maxWidth: 820 }} onClick={(event) => event.stopPropagation()}>
            <div className="lot-wizard-header">
              <div style={{ fontWeight: 800 }}>Log de {logTarget.nombre || logTarget.name}</div>
              <button className="close-btn" onClick={() => setLogTarget(null)}><X size={16} /></button>
            </div>
            <div className="lot-wizard-content">
              {logsError ? <div style={{ color: '#be123c', fontWeight: 700 }}>{logsError}</div> : null}
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Fecha</th><th>Cliente</th><th>Estado</th><th>Respuesta</th></tr></thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id || `${log.fecha}-${log.cliente}`}>
                        <td>{log.fecha || log.createdAt || '-'}</td>
                        <td>{log.cliente || log.clientName || log.contacto || '-'}</td>
                        <td><Tag variant={String(log.estado || log.status).startsWith('2') ? 'success' : 'danger'}>{log.estado || log.status || 'error'}</Tag></td>
                        <td>{log.respuesta || log.response || log.error || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {logsLoading ? <div style={{ padding: 16, color: 'var(--muted)' }}>Cargando log...</div> : null}
                {!logsLoading && !logs.length ? <div style={{ padding: 16, color: 'var(--muted)' }}>No hay logs para esta conexión.</div> : null}
              </div>
            </div>
            <div className="lot-wizard-footer">
              <Button variant="ghost" disabled={logsPage <= 1 || logsLoading} onClick={() => openLogs(logTarget, Math.max(1, logsPage - 1))}>Anterior</Button>
              <div style={{ fontWeight: 700 }}>Página {logsPage} de {logsTotalPages}</div>
              <Button variant="ghost" disabled={logsPage >= logsTotalPages || logsLoading} onClick={() => openLogs(logTarget, Math.min(logsTotalPages, logsPage + 1))}>Siguiente</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
