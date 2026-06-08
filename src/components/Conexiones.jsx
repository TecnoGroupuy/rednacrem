import React, { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Plus, RefreshCw, X } from 'lucide-react';
import { getApiClient } from '../services/apiClient.js';

const emptyDraft = {
  id: '',
  nombre: '',
  url: '',
  apiKey: '',
  activa: true,
  todosProductos: true,
  productos: []
};

const normalizeItems = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  return [];
};

const productId = (product) => String(product?.id || product?.product_id || '');
const productName = (product) => product?.nombre || product?.name || product?.nombreProducto || product?.nombre_producto || 'Producto';

export default function Conexiones({ Button, Panel, Tag }) {
  const api = getApiClient();
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

  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach((product) => map.set(productId(product), productName(product)));
    return map;
  }, [products]);

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

  useEffect(() => {
    loadConnections();
    loadProducts();
  }, []);

  const openCreate = () => {
    setEditingConnection(null);
    setDraft(emptyDraft);
    setShowApiKey(false);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (connection) => {
    const enabledProducts = Array.isArray(connection.productos)
      ? connection.productos.map((item) => String(item?.id || item?.product_id || item)).filter(Boolean)
      : [];
    setEditingConnection(connection);
    setDraft({
      id: connection.id || '',
      nombre: connection.nombre || connection.name || '',
      url: connection.url || '',
      apiKey: '',
      activa: connection.activa ?? connection.active ?? true,
      todosProductos: connection.todosProductos ?? connection.todos_productos ?? enabledProducts.length === 0,
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

  const deleteConnection = async () => {
    if (!editingConnection?.id) return;
    if (!window.confirm('¿Eliminar esta conexión?')) return;
    setSaving(true);
    try {
      await api.del(`/api/connections/${encodeURIComponent(editingConnection.id)}`);
      setFormOpen(false);
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

  return (
    <div className="view">
      <section className="content-grid">
        <Panel
          className="span-12"
          title="Conexiones"
          subtitle="Webhooks y envíos externos"
          action={<Button icon={<Plus size={16} />} onClick={openCreate}>Nueva conexión</Button>}
        >
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
                    {(connection.todos_productos || connection.todosProductos || !enabledProducts.length) ? (
                      <span className="pill">Todos los productos</span>
                    ) : enabledProducts.map((item) => {
                      const id = String(item?.id || item?.product_id || item);
                      return <span key={id} className="pill">{productMap.get(id) || item?.nombre || item?.name || id}</span>;
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, color: 'var(--muted)', fontSize: 13 }}>
                    <span>Último envío: {lastLog.fecha || lastLog.createdAt || connection.lastSent || '—'}</span>
                    <span>Total enviados: {connection.totalSent ?? connection.total_enviados ?? 0}</span>
                    <span>Errores: {connection.errors ?? connection.errores ?? 0}</span>
                  </div>
                  <div className="toolbar" style={{ marginTop: 12 }}>
                    <Button variant="ghost" onClick={() => openLogs(connection)}>Ver log</Button>
                    <Button variant="secondary" onClick={() => openEdit(connection)}>Editar</Button>
                    <Button variant="secondary" onClick={() => toggleConnectionStatus(connection)}>{active ? 'Pausar' : 'Activar'}</Button>
                  </div>
                </div>
              );
            })}
          </div>
          {!loading && !connections.length ? <div style={{ padding: 16, color: 'var(--muted)' }}>No hay conexiones configuradas.</div> : null}
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
                        <td>{log.fecha || log.createdAt || '—'}</td>
                        <td>{log.cliente || log.clientName || log.contacto || '—'}</td>
                        <td><Tag variant={String(log.estado || log.status).startsWith('2') ? 'success' : 'danger'}>{log.estado || log.status || 'error'}</Tag></td>
                        <td>{log.respuesta || log.response || log.error || '—'}</td>
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
