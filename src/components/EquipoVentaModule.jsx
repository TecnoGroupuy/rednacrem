import React from 'react';
import { Plus, Edit3, X, Loader2, ChevronRight, TrendingUp, Phone, ShoppingBag } from 'lucide-react';
import { getApiClient } from '../services/apiClient.js';

const DEFAULT_DRAFT = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  password: '',
  role: 'vendedor',
  status: 'approved',
  reason: 'Alta desde modulo equipo de venta'
};

export default function EquipoVentaModule({
  currentUser,
  teamSinceLabel,
  teamStatusMeta,
  displayUserName,
  displayUserEmail,
  activeOrgId,
  userRole,
  Button,
  Panel,
  Tag
}) {
  const [vendedores, setVendedores] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [draft, setDraft] = React.useState({ ...DEFAULT_DRAFT });
  const [formLoading, setFormLoading] = React.useState(false);
  const [formError, setFormError] = React.useState('');
  const [formSuccess, setFormSuccess] = React.useState('');
  const [editingId, setEditingId] = React.useState(null);
  const [agentStats, setAgentStats] = React.useState([]);
  const [statsLoading, setStatsLoading] = React.useState(false);
  const [selectedVendedor, setSelectedVendedor] = React.useState(null);

  const canManage = ['supervisor', 'director', 'superadministrador'].includes(userRole);

  const loadVendedores = React.useCallback(async () => {
    if (!activeOrgId) return;
    setLoading(true);
    try {
      const api = getApiClient();
      const res = await api.get('/org/users');
      const items = res?.items || [];
      setVendedores(items);
    } catch (err) {
      console.error('Error cargando vendedores:', err);
    } finally {
      setLoading(false);
    }
  }, [activeOrgId]);

  const loadAgentStats = React.useCallback(async () => {
    if (!activeOrgId) return;
    setStatsLoading(true);
    try {
      const api = getApiClient();
      const res = await api.get('/campanas/stats');
      setAgentStats(res?.agents || []);
    } catch (err) {
      console.error('Error cargando stats de equipo:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [activeOrgId]);

  React.useEffect(() => {
    loadVendedores();
  }, [loadVendedores]);

  React.useEffect(() => {
    loadAgentStats();
  }, [loadAgentStats]);

  const resetForm = () => {
    setDraft({ ...DEFAULT_DRAFT });
    setFormError('');
    setFormSuccess('');
    setEditingId(null);
    setShowForm(false);
  };

  const saveVendedor = async () => {
    const { nombre, apellido, email, telefono, password } = draft;
    if (!nombre.trim() || !apellido.trim() || !email.trim() || !telefono.trim()) {
      setFormError('Nombre, apellido, email y telefono son obligatorios.');
      return;
    }
    if (!editingId && !password.trim()) {
      setFormError('La contrasena provisoria es obligatoria.');
      return;
    }
    if (!editingId && password.trim().length < 8) {
      setFormError('La contrasena debe tener al menos 8 caracteres.');
      return;
    }
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');
    try {
      const api = getApiClient();
      if (editingId) {
        await api.put(`/superadmin/users/${editingId}`, draft);
        setFormSuccess('Vendedor actualizado correctamente.');
      } else {
        const url = activeOrgId
          ? `/superadmin/users?organization_id=${activeOrgId}`
          : '/superadmin/users';
        const payload = { ...draft };
        if (payload.password) {
          payload.temporaryPassword = payload.password;
        }
        delete payload.password;
        await api.post(url, payload);
        setFormSuccess('Vendedor creado y asignado a la organizacion.');
      }
      await loadVendedores();
      await loadAgentStats();
      setTimeout(resetForm, 1500);
    } catch (err) {
      const msg = err?.details?.message || err?.message || 'No se pudo guardar.';
      setFormError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const startEdit = (v) => {
    setDraft({
      nombre: v.nombre || '',
      apellido: v.apellido || '',
      email: v.email || '',
      telefono: v.telefono || '',
      role: 'vendedor',
      status: v.status || 'approved',
      reason: 'Edicion desde modulo equipo de venta'
    });
    setEditingId(v.id);
    setShowForm(true);
    setSelectedVendedor(null);
    setFormError('');
    setFormSuccess('');
  };

  return (
    <div className="view">
      {canManage && (
        <section className="content-grid">
          <Panel
            className={showForm ? 'span-8' : 'span-12'}
            title="Vendedores"
            subtitle={`${vendedores.length} vendedor${vendedores.length !== 1 ? 'es' : ''} activos`}
            action={
              <div className="toolbar">
                {showForm && (
                  <Button variant="ghost" onClick={resetForm}>
                    Cancelar
                  </Button>
                )}
                <Button
                  icon={<Plus size={16} />}
                  onClick={() => {
                    setDraft({ ...DEFAULT_DRAFT });
                    setEditingId(null);
                    setShowForm(true);
                    setSelectedVendedor(null);
                    setFormError('');
                    setFormSuccess('');
                  }}
                >
                  Nuevo vendedor
                </Button>
              </div>
            }
          >
            {loading || statsLoading ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : vendedores.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                No hay vendedores asignados a esta organizacion.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {vendedores.map((v) => {
                  const fullName = [v.nombre, v.apellido].filter(Boolean).join(' ').toLowerCase();
                  const stats = agentStats.find((a) =>
                    a.name?.toLowerCase() === fullName ||
                    a.name?.toLowerCase() === v.nombre?.toLowerCase() ||
                    a.id === v.id
                  );
                  const ventas = stats?.sales ?? 0;
                  const contactos = stats?.calls ?? 0;
                  const efectividad = stats?.conversion ?? 0;
                  const statusVariant =
                    v.status === 'approved' ? 'success' :
                    v.status === 'pausado' ? 'warning' :
                    v.status === 'blocked' ? 'danger' : 'default';
                  const statusLabel =
                    v.status === 'approved' ? 'Activo' :
                    v.status === 'pausado' ? 'Baja' :
                    v.status === 'blocked' ? 'Bloqueado' :
                    v.status === 'inactive' ? 'Inactivo' : v.status;

                  return (
                    <div key={v.id} style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderRadius: 12,
                      border: '1px solid var(--line)',
                      background: 'var(--surface)'
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.nombre} {v.apellido}
                        </div>
                        <Tag variant={statusVariant} style={{ marginTop: 4 }}>
                          {statusLabel}
                        </Tag>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--muted)', fontSize: 11, marginBottom: 2 }}>
                          <ShoppingBag size={11} /> Ventas
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 18, color: '#15803d' }}>{ventas}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--muted)', fontSize: 11, marginBottom: 2 }}>
                          <Phone size={11} /> Contactos
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 18 }}>{contactos}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--muted)', fontSize: 11, marginBottom: 2 }}>
                          <TrendingUp size={11} /> Efectividad
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 18, color: efectividad >= 20 ? '#15803d' : efectividad >= 10 ? '#d97706' : '#be123c' }}>
                          {efectividad}%
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedVendedor({ ...v, stats })}
                        style={{
                          width: 36, height: 36, borderRadius: 10,
                          border: '1px solid var(--line)',
                          background: 'transparent',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--muted)',
                          flexShrink: 0
                        }}
                        title="Ver detalle"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {selectedVendedor && (
            <div style={{
              position: 'fixed',
              top: 0, right: 0, bottom: 0,
              width: 'min(420px, 100vw)',
              background: 'var(--bg)',
              borderLeft: '1px solid var(--line)',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
              zIndex: 100,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--line)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {selectedVendedor.nombre} {selectedVendedor.apellido}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{selectedVendedor.email}</div>
                </div>
                <button
                  onClick={() => setSelectedVendedor(null)}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    border: '1px solid var(--line)',
                    background: 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Ventas hoy', value: selectedVendedor.stats?.sales ?? 0, color: '#15803d' },
                    { label: 'Contactos hoy', value: selectedVendedor.stats?.calls ?? 0, color: 'var(--text)' },
                    { label: 'Efectividad', value: `${selectedVendedor.stats?.conversion ?? 0}%`, color: '#2563eb' },
                    { label: 'Pausas', value: selectedVendedor.stats?.pausesCount ?? 0, color: 'var(--muted)' }
                  ].map((item) => (
                    <div key={item.label} style={{
                      padding: '14px 16px', borderRadius: 12,
                      border: '1px solid var(--line)',
                      background: 'var(--surface)'
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{item.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ borderRadius: 12, border: '1px solid var(--line)', overflow: 'hidden' }}>
                  {[
                    { label: 'Telefono', value: selectedVendedor.telefono || '-' },
                    { label: 'Rol global', value: selectedVendedor.role_key },
                    { label: 'Rol en org', value: selectedVendedor.role_in_org || '-' },
                    { label: 'Estado', value: selectedVendedor.status === 'approved' ? 'Activo' : selectedVendedor.status },
                    { label: 'Tiempo conectado', value: selectedVendedor.stats?.workTime || '-' },
                    { label: 'Tiempo en pausas', value: selectedVendedor.stats?.pausesMinutes ? `${selectedVendedor.stats.pausesMinutes} min` : '-' }
                  ].map((item, i) => (
                    <div key={item.label} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 16px',
                      borderBottom: i < 5 ? '1px solid var(--line)' : 'none',
                      fontSize: 13
                    }}>
                      <span style={{ color: 'var(--muted)' }}>{item.label}</span>
                      <span style={{ fontWeight: 500 }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    variant="ghost"
                    icon={<Edit3 size={14} />}
                    onClick={() => {
                      startEdit(selectedVendedor);
                      setSelectedVendedor(null);
                    }}
                  >
                    Editar vendedor
                  </Button>
                </div>
              </div>
            </div>
          )}

          {showForm && (
            <Panel
              className="span-4"
              title={editingId ? 'Editar vendedor' : 'Nuevo vendedor'}
              subtitle={activeOrgId ? 'Se asignara a esta organizacion' : 'Sin organizacion activa'}
            >
              <div className="list">
                <div>
                  <label className="label">Nombre *</label>
                  <input
                    className="input"
                    value={draft.nombre}
                    onChange={(e) => setDraft((p) => ({ ...p, nombre: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Apellido *</label>
                  <input
                    className="input"
                    value={draft.apellido}
                    onChange={(e) => setDraft((p) => ({ ...p, apellido: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input
                    className="input"
                    type="email"
                    value={draft.email}
                    onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Telefono *</label>
                  <input
                    className="input"
                    value={draft.telefono}
                    onChange={(e) => setDraft((p) => ({ ...p, telefono: e.target.value }))}
                  />
                </div>
                {!editingId && (
                  <div>
                    <label className="label">Contrasena provisoria *</label>
                    <input
                      className="input"
                      type="password"
                      placeholder="Minimo 8 caracteres"
                      value={draft.password}
                      onChange={(e) => setDraft((p) => ({ ...p, password: e.target.value }))}
                      autoComplete="new-password"
                    />
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      El vendedor usara esta clave para su primer ingreso.
                    </div>
                  </div>
                )}
                <div>
                  <label className="label">Estado</label>
                  <select
                    className="input"
                    value={draft.status}
                    onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="approved">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="blocked">Bloqueado</option>
                    <option value="pausado">Baja</option>
                  </select>
                </div>
                {formError && (
                  <div style={{ color: '#be123c', fontSize: 13 }}>{formError}</div>
                )}
                {formSuccess && (
                  <div style={{ color: '#15803d', fontSize: 13 }}>{formSuccess}</div>
                )}
                <div className="toolbar">
                  <Button variant="ghost" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button onClick={saveVendedor} disabled={formLoading}>
                    {formLoading
                      ? 'Guardando...'
                      : editingId ? 'Guardar cambios' : 'Crear vendedor'}
                  </Button>
                </div>
              </div>
            </Panel>
          )}
        </section>
      )}
    </div>
  );
}
