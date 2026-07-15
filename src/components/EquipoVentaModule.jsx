import React from 'react';
import { Plus, Edit3, X, Loader2, ChevronRight, TrendingUp, Phone, ShoppingBag, UserX, BarChart2, Info } from 'lucide-react';
import { getApiClient } from '../services/apiClient.js';
import { toEsUyDate } from '../utils/dateFormat.js';

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
  const [desactivarRedistribucionModo, setDesactivarRedistribucionModo] = React.useState('round_robin');
  const [desactivarTargetSellerId, setDesactivarTargetSellerId] = React.useState('');
  const [reassignedInfoMessage, setReassignedInfoMessage] = React.useState('');

  const canManage = ['supervisor', 'director', 'superadministrador'].includes(userRole);
  const formatDurationFromSeconds = React.useCallback((seconds) => {
    if (!Number.isFinite(Number(seconds))) return '--';
    const total = Math.max(0, Math.floor(Number(seconds)));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return `${h}h ${m}m`;
  }, []);

  const formatPendientesByEstado = React.useCallback((value) => {
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          const estado = item?.estado || item?.status || item?.label || item?.key || '';
          const cantidad = Number(item?.count ?? item?.cantidad ?? item?.total ?? 0) || 0;
          if (!estado || !cantidad) return null;
          return `${cantidad} ${String(estado).replace(/_/g, ' ')}`;
        })
        .filter(Boolean)
        .join(', ');
    }
    if (value && typeof value === 'object') {
      return Object.entries(value)
        .map(([estado, cantidadRaw]) => {
          const cantidad = Number(cantidadRaw ?? 0) || 0;
          if (!cantidad) return null;
          return `${cantidad} ${String(estado).replace(/_/g, ' ')}`;
        })
        .filter(Boolean)
        .join(', ');
    }
    return '';
  }, []);

  const vendedoresRedistribucion = React.useMemo(() => (
    vendedores.filter((v) => (
      v.status === 'approved'
      && String(v.id) !== String(desactivarModal?.id || '')
    ))
  ), [vendedores, desactivarModal?.id]);

  const vendedorStatusMeta = React.useCallback((status) => {
    if (status === 'approved') {
      return {
        label: 'Activo',
        background: 'rgba(15,118,110,0.12)',
        color: '#0f6e56',
        border: '1px solid rgba(15,118,110,0.25)'
      };
    }
    if (status === 'baja') {
      return {
        label: 'Baja',
        background: 'rgba(153,60,29,0.12)',
        color: '#993c1d',
        border: '1px solid rgba(240,153,123,0.45)'
      };
    }
    if (status === 'pausado') {
      return {
        label: 'Pausado',
        background: 'rgba(245,158,11,0.12)',
        color: '#92400e',
        border: '1px solid rgba(245,158,11,0.30)'
      };
    }
    return {
      label: status || 'Sin estado',
      background: 'rgba(100,116,139,0.10)',
      color: '#475569',
      border: '1px solid rgba(148,163,184,0.30)'
    };
  }, []);

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

  const openPausarModal = React.useCallback(async (vendedor) => {
    const api = getApiClient();
    setPausarModal({
      id: vendedor.id,
      nombre: [vendedor.nombre, vendedor.apellido].filter(Boolean).join(' ')
    });
    setPausarStep('analisis');
    setPausarData(null);
    setPausarMotivo('');
    setPausarError('');
    setPausarLoading(true);
    try {
      const params = new URLSearchParams({ seller_id: String(vendedor.id) });
      if (activeOrgId) params.set('organization_id', String(activeOrgId));
      const res = await api.get(`/api/supervisor/seller-detail?${params.toString()}`);
      const payload = res?.data ?? res;
      setPausarData(payload?.data ?? payload);
    } catch {
      setPausarError('No se pudo cargar el análisis.');
    } finally {
      setPausarLoading(false);
    }
  }, [activeOrgId]);

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
                              {v.status !== 'baja' && v.status !== 'inactive' && (
                                <button
                                  type="button"
                                  onClick={() => openPausarModal(v)}
                                  style={{
                                    padding: '7px 12px',
                                    borderRadius: 8,
                                    border: '1px solid #f59e0b',
                                    background: '#fffbeb',
                                    color: '#92400e',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    flexShrink: 0
                                  }}
                                >
                                  ⏸ Pausar
                                </button>
                              )}
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
              onClick={() => {
                setSelectedVendedor(null);
                setReassignedInfoMessage('');
              }}
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
                  onClick={() => {
                    setSelectedVendedor(null);
                    setReassignedInfoMessage('');
                  }}
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
                <div style={{ borderRadius: 12, border: '1px solid var(--line)', overflow: 'hidden' }}>
                  {[
                    { label: 'Telefono', value: selectedVendedor.telefono || '-' },
                    { label: 'Rol en org', value: selectedVendedor.role_in_org || '-' },
                    {
                      label: 'Estado',
                      isStatus: true,
                      value: vendedorStatusMeta(selectedVendedor.status)
                    },
                    ...(selectedVendedor.status === 'baja'
                      ? [
                        { label: 'Fecha de baja', value: selectedVendedor.fecha_baja ? toEsUyDate(selectedVendedor.fecha_baja) : 'No disponible' },
                        { label: 'Procesado por', value: selectedVendedor.procesado_por || 'No disponible' }
                      ]
                      : [
                        { label: 'Tiempo conectado', value: selectedVendedor.stats?.workTime || '-' },
                        { label: 'Tiempo en pausas', value: selectedVendedor.stats?.pausesMinutes ? `${selectedVendedor.stats.pausesMinutes} min` : '-' }
                      ])
                  ].map((item, i, arr) => (
                    <div key={item.label} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 16px',
                      borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                      fontSize: 13
                    }}>
                      <span style={{ color: 'var(--muted)' }}>{item.label}</span>
                      {item.isStatus ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 10px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            background: item.value.background,
                            color: item.value.color,
                            border: item.value.border
                          }}
                        >
                          {item.value.label}
                        </span>
                      ) : (
                        <span style={{ fontWeight: 500 }}>{item.value}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                  {selectedVendedor.status !== 'baja' ? (
                    <Button
                      variant="ghost"
                      icon={<Edit3 size={14} />}
                      onClick={() => {
                        startEdit(selectedVendedor);
                        setSelectedVendedor(null);
                        setReassignedInfoMessage('');
                      }}
                    >
                      Editar vendedor
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    icon={<BarChart2 size={14} />}
                    onClick={async () => {
                      setDesactivarModal({
                        id: selectedVendedor.id,
                        nombre: `${selectedVendedor.nombre || ''} ${selectedVendedor.apellido || ''}`.trim(),
                        status: selectedVendedor.status || ''
                      });
                      setDesactivarStep('analisis');
                      setDesactivarRedistribucionModo('round_robin');
                      setDesactivarTargetSellerId('');
                      setDesactivarData(null);
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
                    {selectedVendedor?.status === 'baja' ? 'Ver reporte de cierre' : 'Ver análisis de desempeño'}
                  </Button>
                  {selectedVendedor?.status === 'baja' ? (
                    <>
                      <Button
                        variant="ghost"
                        icon={<Info size={14} />}
                        onClick={() => {
                          const count = Number(selectedVendedor.contactos_reasignados_count ?? 0) || 0;
                          setReassignedInfoMessage(
                            count > 0
                              ? `${count} contactos fueron reasignados a otros vendedores al momento de la baja.`
                              : '0 contactos fueron reasignados a otros vendedores al momento de la baja.'
                          );
                        }}
                        disabled={Number(selectedVendedor.contactos_reasignados_count ?? 0) === 0}
                      >
                        Contactos reasignados ({Number(selectedVendedor.contactos_reasignados_count ?? 0) || 0})
                      </Button>
                      {reassignedInfoMessage ? (
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--color-text-secondary)',
                            background: 'var(--color-background-secondary)',
                            border: '0.5px solid var(--color-border-secondary)',
                            borderRadius: 8,
                            padding: '10px 12px'
                          }}
                        >
                          {reassignedInfoMessage}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                  {selectedVendedor?.status !== 'baja' && selectedVendedor?.status !== 'inactive' && (
                    <Button
                      variant="ghost"
                      icon={<UserX size={14} />}
                      onClick={async () => {
                        const v = selectedVendedor;
                        setDesactivarModal({
                          id: v.id,
                          nombre: `${v.nombre || ''} ${v.apellido || ''}`.trim(),
                          status: v.status || ''
                        });
                        setDesactivarStep('analisis');
                        setDesactivarRedistribucionModo('round_robin');
                        setDesactivarTargetSellerId('');
                        setDesactivarData(null);
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
          onClick={() => {
            setDesactivarModal(null);
            setDesactivarData(null);
            setDesactivarError('');
            setDesactivarStep('analisis');
            setDesactivarRedistribucionModo('round_robin');
            setDesactivarTargetSellerId('');
          }}
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
                    ? `${desactivarModal?.status === 'baja' ? 'Reporte de cierre' : 'Análisis de desempeño'} — ${desactivarModal.nombre}`
                    : `Confirmar desactivación — ${desactivarModal.nombre}`}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {desactivarStep === 'analisis'
                    ? (desactivarModal?.status === 'baja'
                      ? 'Historial de gestiones'
                      : 'Revisá el historial completo antes de desactivar')
                    : 'Esta acción no se puede deshacer'}
                </div>
              </div>
              <button
                onClick={() => {
                  setDesactivarModal(null);
                  setDesactivarData(null);
                  setDesactivarError('');
                  setDesactivarStep('analisis');
                  setDesactivarRedistribucionModo('round_robin');
                  setDesactivarTargetSellerId('');
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--color-text-secondary)' }}
              >
                ×
              </button>
            </div>

            {desactivarStep === 'analisis' && (
              <>
                {desactivarLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                    {desactivarModal?.status === 'baja' ? 'Cargando reporte de cierre...' : 'Cargando análisis...'}
                  </div>
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
                  const jornada = desactivarData?.jornada || null;
                  const jornadaDias = Array.isArray(jornada?.dias) ? jornada.dias : [];
                  const jornadaDiasVisible = jornadaDias.slice(0, 8);
                  const jornadaDiasRestantes = Math.max(0, jornadaDias.length - jornadaDiasVisible.length);

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

                      {jornada ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                          <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 12px', border: '0.5px solid var(--color-border-secondary)' }}>
                            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Horas trabajadas en el periodo</div>
                            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                              {formatDurationFromSeconds(jornada?.totalHorasSeg)}
                            </div>
                          </div>

                          <div style={{ borderRadius: 8, border: '0.5px solid var(--color-border-secondary)', overflow: 'hidden' }}>
                            <div style={{ padding: '10px 12px', background: 'var(--color-background-secondary)', borderBottom: '0.5px solid var(--color-border-secondary)', fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                              Actividad diaria
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                <thead>
                                  <tr style={{ background: 'rgba(15,23,42,0.03)' }}>
                                    <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Fecha</th>
                                    <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Disponible</th>
                                    <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Descansos</th>
                                    <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Baños</th>
                                    <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Con supervisor</th>
                                    <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {jornadaDiasVisible.map((dia, index) => (
                                    <tr key={dia?.dia || index} style={{ borderTop: index === 0 ? 'none' : '0.5px solid var(--color-border-secondary)' }}>
                                      <td style={{ padding: '8px 12px', color: 'var(--color-text-primary)', fontWeight: 500 }}>{dia?.dia || '—'}</td>
                                      <td style={{ padding: '8px 12px', color: 'var(--color-text-primary)' }}>{dia?.tiempoProductivoLabel || '—'}</td>
                                      <td style={{ padding: '8px 12px', color: 'var(--color-text-primary)' }}>{dia?.descansosLabel || '—'}</td>
                                      <td style={{ padding: '8px 12px', color: 'var(--color-text-primary)' }}>{dia?.banosLabel || '—'}</td>
                                      <td style={{ padding: '8px 12px', color: 'var(--color-text-primary)' }}>{dia?.supervisorLabel || '—'}</td>
                                      <td style={{ padding: '8px 12px', color: 'var(--color-text-primary)', fontWeight: 500 }}>{dia?.totalJornadaLabel || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {jornadaDiasRestantes > 0 ? (
                              <div style={{ padding: '8px 12px', borderTop: '0.5px solid var(--color-border-secondary)', fontSize: 11, color: 'var(--color-text-secondary)', background: 'rgba(15,23,42,0.02)' }}>
                                +{jornadaDiasRestantes} día{jornadaDiasRestantes !== 1 ? 's' : ''} más
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setDesactivarModal(null);
                            setDesactivarData(null);
                            setDesactivarError('');
                            setDesactivarStep('analisis');
                            setDesactivarRedistribucionModo('round_robin');
                            setDesactivarTargetSellerId('');
                          }}
                        >
                          Cerrar
                        </Button>
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
                {(Number(desactivarData?.pendientes_count ?? 0) || 0) > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      Este vendedor tiene <strong>{Number(desactivarData?.pendientes_count ?? 0)}</strong> contactos pendientes
                      {formatPendientesByEstado(desactivarData?.pendientes_by_estado)
                        ? ` (${formatPendientesByEstado(desactivarData?.pendientes_by_estado)}). ¿Cómo redistribuimos?`
                        : '. ¿Cómo redistribuimos?'}
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        { value: 'round_robin', label: 'Redistribuir automáticamente' },
                        { value: 'specific_seller', label: 'Asignar a un vendedor específico' }
                      ].map((option) => {
                        const active = desactivarRedistribucionModo === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setDesactivarRedistribucionModo(option.value);
                              if (option.value !== 'specific_seller') {
                                setDesactivarTargetSellerId('');
                              }
                              setDesactivarError('');
                            }}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 8,
                              border: active ? '1px solid #0F6E56' : '1px solid var(--color-border-secondary)',
                              background: active ? 'rgba(15,110,86,0.10)' : '#fff',
                              color: active ? '#0F6E56' : 'var(--color-text-primary)',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>

                    {desactivarRedistribucionModo === 'specific_seller' ? (
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                          Vendedor destino
                        </label>
                        <select
                          className="input"
                          value={desactivarTargetSellerId}
                          onChange={(e) => {
                            setDesactivarTargetSellerId(e.target.value);
                            setDesactivarError('');
                          }}
                        >
                          <option value="">Seleccionar vendedor</option>
                          {vendedoresRedistribucion.map((v) => (
                            <option key={v.id} value={v.id}>
                              {[v.nombre, v.apellido].filter(Boolean).join(' ').trim() || v.email || v.id}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {desactivarError ? (
                  <div style={{ fontSize: 13, color: '#A32D2D', marginBottom: 16 }}>{desactivarError}</div>
                ) : null}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Button variant="secondary" onClick={() => setDesactivarStep('analisis')}>← Volver</Button>
                  <Button
                    disabled={
                      Number(desactivarData?.pendientes_count ?? 0) > 0
                      && desactivarRedistribucionModo === 'specific_seller'
                      && !desactivarTargetSellerId
                    }
                    onClick={async () => {
                      const pendientesCount = Number(desactivarData?.pendientes_count ?? 0) || 0;
                      if (
                        pendientesCount > 0
                        && desactivarRedistribucionModo === 'specific_seller'
                        && !desactivarTargetSellerId
                      ) {
                        setDesactivarError('Seleccioná un vendedor destino para continuar.');
                        return;
                      }
                      try {
                        const api = getApiClient();
                        const body = pendientesCount > 0
                          ? {
                            redistribucion: {
                              modo: desactivarRedistribucionModo,
                              ...(desactivarRedistribucionModo === 'specific_seller'
                                ? { targetSellerId: desactivarTargetSellerId }
                                : {})
                            }
                          }
                          : undefined;
                        const res = await api.patch(`/api/users/${desactivarModal.id}/desactivar`, body);
                        const payload = res?.data ?? res;
                        const data = payload?.data ?? payload;
                        if (!data.ok) throw new Error(data.message || 'Error al desactivar');
                        setDesactivarModal(null);
                        setDesactivarData(null);
                        setDesactivarError('');
                        setDesactivarStep('analisis');
                        setDesactivarRedistribucionModo('round_robin');
                        setDesactivarTargetSellerId('');
                        setVendedores((prev) => prev.map((u) => (
                          u.id === desactivarModal.id
                            ? { ...u, status: 'baja', estado: 'Baja' }
                            : u
                        )));
                        setSelectedVendedor(null);
                      } catch (err) {
                        setDesactivarError(err?.message || 'No se pudo desactivar.');
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
                      { label: 'Seguimiento', key: 'seguimiento' },
                    ].map(({ label, key }) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: '#64748b' }}>{label}</span>
                        <strong>{pausarData?.pendientes_by_estado?.[key] ?? 0}</strong>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                      <span>Total a redistribuir</span>
                      <span>{
                        ['nuevo', 'no_contesta', 'rellamar', 'seguimiento']
                          .reduce((sum, key) => sum + (pausarData?.pendientes_by_estado?.[key] ?? 0), 0)
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
