import React from 'react';
import { Plus, Edit3, X, Loader2 } from 'lucide-react';
import { getApiClient } from '../services/apiClient.js';

const DEFAULT_DRAFT = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
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

  React.useEffect(() => {
    loadVendedores();
  }, [loadVendedores]);

  const resetForm = () => {
    setDraft({ ...DEFAULT_DRAFT });
    setFormError('');
    setFormSuccess('');
    setEditingId(null);
    setShowForm(false);
  };

  const saveVendedor = async () => {
    const { nombre, apellido, email, telefono } = draft;
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
        const url = activeOrgId
          ? `/superadmin/users?organization_id=${activeOrgId}`
          : '/superadmin/users';
        await api.post(url, draft);
        setFormSuccess('Vendedor creado y asignado a la organizacion.');
      }
      await loadVendedores();
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
                    setFormError('');
                    setFormSuccess('');
                  }}
                >
                  Nuevo vendedor
                </Button>
              </div>
            }
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : vendedores.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                No hay vendedores asignados a esta organizacion.
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Telefono</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {vendedores.map(v => (
                    <tr key={v.id}>
                      <td>{v.nombre} {v.apellido}</td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{v.email}</td>
                      <td style={{ fontSize: 12 }}>{v.telefono || '—'}</td>
                      <td>
                        <Tag variant={
                          v.status === 'approved' ? 'success' :
                          v.status === 'pausado' ? 'warning' :
                          v.status === 'blocked' ? 'danger' :
                          v.status === 'inactive' ? 'default' :
                          'warning'
                        }>
                          {v.status === 'approved' ? 'Activo' :
                           v.status === 'pausado' ? 'Baja' :
                           v.status === 'blocked' ? 'Bloqueado' :
                           v.status === 'inactive' ? 'Inactivo' :
                           v.status === 'pending' ? 'Pendiente' :
                           v.status === 'rejected' ? 'Rechazado' :
                           v.status}
                        </Tag>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Edit3 size={14} />}
                          onClick={() => startEdit(v)}
                        >
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

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
                    onChange={e => setDraft(p => ({ ...p, nombre: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Apellido *</label>
                  <input
                    className="input"
                    value={draft.apellido}
                    onChange={e => setDraft(p => ({ ...p, apellido: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input
                    className="input"
                    type="email"
                    value={draft.email}
                    onChange={e => setDraft(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Telefono *</label>
                  <input
                    className="input"
                    value={draft.telefono}
                    onChange={e => setDraft(p => ({ ...p, telefono: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Estado</label>
                  <select
                    className="input"
                    value={draft.status}
                    onChange={e => setDraft(p => ({ ...p, status: e.target.value }))}
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
