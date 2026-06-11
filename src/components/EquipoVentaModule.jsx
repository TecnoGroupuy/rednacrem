import React from 'react';
import { Plus, Edit3, X, Loader2, ChevronRight, TrendingUp, Phone, ShoppingBag, UserX, BarChart2 } from 'lucide-react';
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
  const [mostrarInactivos, setMostrarInactivos] = React.useState(false);
  const [desactivarModal, setDesactivarModal] = React.useState(null); // { id, nombre }
  const [desactivarStep, setDesactivarStep] = React.useState('analisis'); // 'analisis' | 'confirmar'
  const [desactivarData, setDesactivarData] = React.useState(null);
  const [pausarModal, setPausarModal] = React.useState(null);
  const [pausarStep, setPausarStep] = React.useState('analisis'); // 'analisis' | 'confirmar'
  const [pausarData, setPausarData] = React.useState(null);
  const [pausarMotivo, setPausarMotivo] = React.useState('');
  const [pausarLoading, setPausarLoading] = React.useState(false);
  const [pausarError, setPausarError] = React.useState('');
  const [desactivarLoading, setDesactivarLoading] = React.useState(false);
  const [desactivarError, setDesactivarError] = React.useState('');

  const canManage = ['supervisor', 'director', 'superadministrador'].includes(userRole);

  const loadVendedores = React.useCallback(async (inactivos = false) => {
    if (!activeOrgId) return;
    setLoading(true);
    try {
      const api = getApiClient();
      const url = inactivos ? '/org/users?incluir_inactivos=true' : '/org/users';
      const res = await api.get(url);
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
    loadVendedores(false);
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
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');
    try {
      const api = getApiClient();
      if (editingId) {
        await api.put(`/superadmin/users/${editingId}`, draft);
        setFormSuccess('Vendedor actualizado correctamente.');
      } else {
        const payload = { ...draft };
        if (payload.password) {
          payload.temporaryPassword = payload.password;
        }
        delete payload.password;
        await api.post('/org/users', payload);
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
            subtitle=""
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
            {(() => {
              const vendedoresFiltrados = vendedores.filter((v) => (
                mostrarInactivos
                  ? v.status === 'baja' || v.status === 'inactive'
                  : v.status === 'approved' || v.status === 'pausado'
              ));

              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <h2 style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>Vendedores</h2>
                      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                        {vendedoresFiltrados.length} vendedores {mostrarInactivos ? 'inactivos' : 'activos'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const nuevoEstado = !mostrarInactivos;
                        setMostrarInactivos(nuevoEstado);
                        loadVendedores(nuevoEstado);
                      }}
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        padding: '6px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--line)',
                        background: mostrarInactivos ? '#FAECE7' : 'var(--surface)',
                        color: mostrarInactivos ? '#993C1D' : 'var(--muted)',
                        cursor: 'pointer'
                      }}
                    >
                      {mostrarInactivos ? 'Ver activos' : 'Ver inactivos'}
                    </button>
                  </div>

                  {loading || statsLoading ? (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                  ) : vendedoresFiltrados.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                      {mostrarInactivos
                        ? 'No hay vendedores inactivos para mostrar.'
                        : 'No hay vendedores activos para mostrar.'}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {vendedoresFiltrados.map((v) => {
                        const fullName = [v.nombre, v.apellido].filter(Boolean).join(' ').toLowerCase();
                        const stats = agentStats.find((a) =>
                          a.name?.toLowerCase() === fullName ||
                          a.name?.toLowerCase() === v.nombre?.toLowerCase() ||
                          a.id === v.id
                        );
                        const statusVariant =
                          v.status === 'approved' ? 'success' :
                          v.status === 'pausado' ? 'warning' :
                          v.status === 'blocked' ? 'danger' : 'default';
                        const statusLabel =
                          v.status === 'approved' ? 'Activo' :
                          v.status === 'pausado' ? 'Pausado' :
                          v.status === 'baja' ? 'Baja' :
                          v.status === 'blocked' ? 'Bloqueado' :
                          v.status === 'inactive' ? 'Inactivo' : v.status;

                        return (
                          <div key={v.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            padding: '14px 16px',
                            borderRadius: 12,
                            border: '1px solid var(--line)',
                            background: 'var(--surface)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                              <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: v.status === 'baja' ? '#F1EFE8' : '#E1F5EE',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                fontWeight: 600,
                                flexShrink: 0,
                                color: v.status === 'baja' ? '#5F5E5A' : '#0F6E56'
                              }}>
                                {`${v.nombre?.[0] || ''}${v.apellido?.[0] || ''}`.toUpperCase()}
                              </div>

                              <div style={{ minWidth: 0 }}>
                                <div style={{
                                  fontWeight: 600,
                                  fontSize: 14,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  color: v.status === 'baja' ? 'var(--muted)' : 'var(--text)'
                                }}>
                                  {v.nombre} {v.apellido}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                                  {v.email}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                              <Tag variant={statusVariant}>{statusLabel}</Tag>
                              <button
                                onClick={() => setSelectedVendedor({ ...v, stats })}
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 8,
                                  border: '1px solid var(--line)',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--muted)',
                                  flexShrink: 0
                                }}
                                title="Ver detalle"
                              >
                                <ChevronRight size={15} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </Panel>

          {selectedVendedor && (
            <>
            <div
              onClick={() => setSelectedVendedor(null)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.3)',
                zIndex: 99
              }}
            />
            <div style={{
              position: 'fixed',
              top: 0, right: 0, bottom: 0,
              width: 'min(420px, 100vw)',
              background: 'var(--color-background-primary, #ffffff)',
              borderLeft: '1px solid var(--line)',
              boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
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
                {selectedVendedor?.status !== 'baja' && selectedVendedor?.status !== 'inactive' && (
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
                )}

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

                <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
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
                  <Button
                    variant="ghost"
                    icon={<BarChart2 size={14} />}
                    onClick={async () => {
                      setDesactivarModal({
                        id: selectedVendedor.id,
                        nombre: `${selectedVendedor.nombre || ''} ${selectedVendedor.apellido || ''}`.trim()
                      });
                      setDesactivarStep('analisis');
                      setDesactivarLoading(true);
                      setDesactivarError('');
                      try {
                        const api = getApiClient();
                        const params = new URLSearchParams({ seller_id: String(selectedVendedor.id) });
                        if (activeOrgId) params.set('organization_id', String(activeOrgId));
                        const res = await api.get(`/api/supervisor/seller-detail?${params.toString()}`);
                        const payload = res?.data ?? res;
                        setDesactivarData(payload?.data ?? payload);
                      } catch (err) {
                        setDesactivarError('No se pudo cargar el análisis.');
                      } finally {
                        setDesactivarLoading(false);
                      }
                    }}
                  >
                    Ver análisis de desempeño
                  </Button>
                  {selectedVendedor?.status !== 'baja' && selectedVendedor?.status !== 'inactive' && (
                    <button
                      type="button"
                      onClick={async () => {
                        const api = getApiClient();
                        setPausarModal({
                          id: selectedVendedor.id,
                          nombre: [selectedVendedor.nombre, selectedVendedor.apellido].filter(Boolean).join(' ')
                        });
                        setPausarStep('analisis');
                        setPausarData(null);
                        setPausarMotivo('');
                        setPausarError('');
                        setPausarLoading(true);
                        try {
                          const params = new URLSearchParams({ seller_id: String(selectedVendedor.id) });
                          if (activeOrgId) params.set('organization_id', String(activeOrgId));
                          const res = await api.get(`/api/supervisor/seller-detail?${params.toString()}`);
                          const payload = res?.data ?? res;
                          setPausarData(payload?.data ?? payload);
                        } catch {
                          setPausarError('No se pudo cargar el análisis.');
                        } finally {
                          setPausarLoading(false);
                        }
                      }}
                      style={{ width: '100%', padding: '10px 16px', borderRadius: 8, border: '1px solid #f59e0b', background: '#fffbeb', color: '#92400e', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                    >
                      ⏸ Pausar vendedor
                    </button>
                  )}
                  {selectedVendedor?.status !== 'baja' && selectedVendedor?.status !== 'inactive' && (
                    <Button
                      variant="ghost"
                      icon={<UserX size={14} />}
                      onClick={async () => {
                        const v = selectedVendedor;
                        setDesactivarModal({
                          id: v.id,
                          nombre: `${v.nombre || ''} ${v.apellido || ''}`.trim()
                        });
                        setDesactivarStep('analisis');
                        setDesactivarLoading(true);
                        setDesactivarError('');
                        try {
                          const api = getApiClient();
                          const params = new URLSearchParams({ seller_id: String(v.id) });
                          if (activeOrgId) params.set('organization_id', String(activeOrgId));
                          const res = await api.get(`/api/supervisor/seller-detail?${params.toString()}`);
                          const payload = res?.data ?? res;
                          setDesactivarData(payload?.data ?? payload);
                        } catch (err) {
                          setDesactivarError('No se pudo cargar el análisis.');
                        } finally {
                          setDesactivarLoading(false);
                        }
                      }}
                      style={{ color: '#993C1D' }}
                    >
                      Desactivar vendedor
                    </Button>
                  )}
                </div>
              </div>
            </div>
            </>
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
                      placeholder="Dejar vacio para usar contrasena default"
                      value={draft.password}
                      onChange={(e) => setDraft((p) => ({ ...p, password: e.target.value }))}
                      autoComplete="new-password"
                    />
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      Si no ingresa contrasena se usara: Rednacrem@2026
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

      {desactivarModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => setDesactivarModal(null)}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.98)',
              backdropFilter: 'blur(6px)',
              borderRadius: 12,
              padding: 24,
              width: 620,
              maxHeight: '85vh',
              overflowY: 'auto',
              border: '1px solid var(--color-border-secondary)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 15, color: 'var(--color-text-primary)' }}>
                  {desactivarStep === 'analisis'
                    ? `Análisis de desempeño — ${desactivarModal.nombre}`
                    : `Confirmar desactivación — ${desactivarModal.nombre}`}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {desactivarStep === 'analisis'
                    ? (desactivarModal && vendedores.find((v) => v.id === desactivarModal.id)?.status === 'baja'
                      ? 'Historial de gestiones'
                      : 'Revisá el historial completo antes de desactivar')
                    : 'Esta acción no se puede deshacer'}
                </div>
              </div>
              <button
                onClick={() => setDesactivarModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--color-text-secondary)' }}
              >
                ×
              </button>
            </div>

            {desactivarStep === 'analisis' && (
              <>
                {desactivarLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)', fontSize: 13 }}>Cargando análisis...</div>
                ) : null}
                {desactivarError ? (
                  <div style={{ fontSize: 13, color: '#A32D2D', marginBottom: 16 }}>{desactivarError}</div>
                ) : null}
                {!desactivarLoading && desactivarData ? (() => {
                  const r = desactivarData?.resumen || {};
                  const totalGestiones = (r.ventas || 0)
                    + (r.rechazos || 0)
                    + (r.seguimientos || 0)
                    + (r.rellamar || 0)
                    + (r.no_contesta || 0)
                    + (r.dato_erroneo || 0);
                  const efectividad = totalGestiones > 0
                    ? (((r.ventas || 0) / Math.max(1, (totalGestiones - (r.dato_erroneo || 0)))) * 100).toFixed(1)
                    : '0.0';
                  const desde = desactivarData?.fecha_desde;
                  const hasta = desactivarData?.fecha_hasta;
                  const dias = (desde && hasta)
                    ? Math.max(1, Math.floor((new Date(hasta) - new Date(desde)) / 86400000) + 1)
                    : 1;
                  const promDiario = (totalGestiones / dias).toFixed(1);
                  const pendientes = desactivarData?.pendientes_count ?? 0;

                  return (
                    <>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16, background: 'var(--color-background-secondary)', borderRadius: 8, padding: '8px 12px' }}>
                        Período: <strong>{desde} → {hasta}</strong> ({dias} día{dias !== 1 ? 's' : ''} activo{dias !== 1 ? 's' : ''})
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                        {[
                          { label: 'Total gestiones', value: totalGestiones, color: 'var(--color-text-primary)' },
                          { label: 'Ventas', value: r.ventas || 0, color: '#0F6E56' },
                          { label: 'Efectividad', value: `${efectividad}%`, color: '#185FA5' },
                          { label: 'Prom. diario', value: promDiario, color: 'var(--color-text-primary)' },
                          { label: 'Rechazos', value: r.rechazos || 0, color: '#A32D2D' },
                          { label: 'Seguimientos', value: r.seguimientos || 0, color: 'var(--color-text-primary)' },
                          { label: 'Rellamar', value: r.rellamar || 0, color: 'var(--color-text-primary)' },
                          { label: 'No contesta', value: r.no_contesta || 0, color: 'var(--color-text-primary)' }
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 12px', border: '0.5px solid var(--color-border-secondary)' }}>
                            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: 20, fontWeight: 500, color }}>{value}</div>
                          </div>
                        ))}
                      </div>

                      {pendientes > 0 ? (
                        <div style={{ background: '#FAECE7', border: '0.5px solid #F0997B', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#993C1D' }}>
                          ⚠️ Este vendedor tiene <strong>{pendientes} contactos pendientes</strong> (seguimientos, rellamadas y no contesta). Redistribuílos desde el detalle del lote antes de desactivar.
                        </div>
                      ) : null}

                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                        <Button variant="secondary" onClick={() => setDesactivarModal(null)}>Cerrar</Button>
                        {desactivarModal &&
                          (() => {
                            const vendedor = vendedores.find((v) => v.id === desactivarModal.id);
                            return vendedor?.status !== 'baja' && vendedor?.status !== 'inactive';
                          })() && (
                          <Button
                            onClick={() => setDesactivarStep('confirmar')}
                            style={{ background: '#993C1D', color: '#fff', border: 'none' }}
                          >
                            Continuar con desactivación
                          </Button>
                        )}
                      </div>
                    </>
                  );
                })() : null}
              </>
            )}

            {desactivarStep === 'confirmar' && (
              <>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
                  Al confirmar, <strong>{desactivarModal.nombre}</strong> pasará a estado <strong>Baja</strong>, será removido de todos los lotes activos y dejará de aparecer en los monitores.
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Button variant="secondary" onClick={() => setDesactivarStep('analisis')}>← Volver</Button>
                  <Button
                    onClick={async () => {
                      try {
                        const api = getApiClient();
                        const res = await api.patch(`/api/users/${desactivarModal.id}/desactivar`);
                        const payload = res?.data ?? res;
                        const data = payload?.data ?? payload;
                        if (!data.ok) throw new Error(data.message || 'Error al desactivar');
                        setDesactivarModal(null);
                        setVendedores((prev) => prev.map((u) => (
                          u.id === desactivarModal.id
                            ? { ...u, status: 'baja', estado: 'Baja' }
                            : u
                        )));
                        setSelectedVendedor(null);
                      } catch (err) {
                        setDesactivarError(err?.message || 'No se pudo desactivar.');
                        setDesactivarStep('analisis');
                      }
                    }}
                    style={{ background: '#993C1D', color: '#fff', border: 'none' }}
                  >
                    Confirmar desactivación
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {pausarModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'grid', placeItems: 'center', zIndex: 80 }}>
          <div style={{ width: 'min(520px, calc(100% - 32px))', background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 24px 60px rgba(15,23,42,0.25)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>⏸ Pausar vendedor</h3>
              <button
                type="button"
                onClick={() => {
                  setPausarModal(null);
                  setPausarData(null);
                  setPausarMotivo('');
                  setPausarError('');
                  setPausarStep('analisis');
                }}
                style={{ border: 'none', background: '#f3f4f6', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: 14, color: '#475569' }}>
              Estás por pausar a <strong>{pausarModal.nombre}</strong>. Sus datos serán redistribuidos entre los vendedores activos del lote.
            </div>

            {pausarStep === 'analisis' && (
              <>
                {pausarLoading && <div style={{ color: '#64748b', fontSize: 13 }}>Cargando análisis...</div>}
                {pausarError && <div style={{ color: '#dc2626', fontSize: 13 }}>{pausarError}</div>}
                {pausarData && (
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Datos pendientes para redistribuir
                    </div>
                    {[
                      { label: 'Nuevos', key: 'nuevo' },
                      { label: 'No contesta', key: 'no_contesta' },
                      { label: 'Rellamar', key: 'rellamar' },
                      { label: 'Seguimiento', key: 'seguimientos' },
                    ].map(({ label, key }) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: '#64748b' }}>{label}</span>
                        <strong>{pausarData?.pendientes?.[key] ?? pausarData?.resumen?.[key] ?? 0}</strong>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                      <span>Total a redistribuir</span>
                      <span>{
                        ['nuevo', 'no_contesta', 'rellamar', 'seguimientos']
                          .reduce((sum, key) => sum + (pausarData?.pendientes?.[key] ?? pausarData?.resumen?.[key] ?? 0), 0)
                      }</span>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setPausarStep('confirmar')}
                  disabled={pausarLoading}
                  style={{ border: 'none', background: '#f59e0b', color: '#fff', padding: '10px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                >
                  Continuar
                </button>
              </>
            )}

            {pausarStep === 'confirmar' && (
              <>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#475569' }}>
                  Motivo de la pausa *
                  <select className="input" value={pausarMotivo} onChange={(e) => setPausarMotivo(e.target.value)}>
                    <option value="">Seleccioná un motivo...</option>
                    <option value="enfermedad">Enfermedad</option>
                    <option value="suspendido">Suspendido</option>
                    <option value="se_retira_antes">Se retira antes</option>
                    <option value="no_se_presento">No se presentó</option>
                  </select>
                </label>

                {pausarError && <div style={{ color: '#dc2626', fontSize: 13 }}>{pausarError}</div>}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setPausarStep('analisis')}
                    style={{ border: '1px solid #e2e8f0', background: '#fff', color: '#475569', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    disabled={!pausarMotivo || pausarLoading}
                    onClick={async () => {
                      setPausarLoading(true);
                      setPausarError('');
                      try {
                        const api = getApiClient();
                        await api.patch(`/users/${pausarModal.id}/pausar`, { motivo_pausa: pausarMotivo });
                        setPausarModal(null);
                        setPausarData(null);
                        setPausarMotivo('');
                        await loadVendedores(mostrarInactivos);
                        setSelectedVendedor(null);
                      } catch (err) {
                        setPausarError(err?.message || 'No se pudo pausar al vendedor.');
                      } finally {
                        setPausarLoading(false);
                      }
                    }}
                    style={{ border: 'none', background: '#f59e0b', color: '#fff', padding: '10px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: (!pausarMotivo || pausarLoading) ? 0.5 : 1 }}
                  >
                    {pausarLoading ? 'Pausando...' : 'Confirmar pausa'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
