import React from 'react';
import {
  Building2, Plus, ChevronRight, Search,
  Edit3, CheckCircle2, X, ChevronDown
} from 'lucide-react';
import {
  listOrganizations,
  createOrganization,
  updateOrganization
} from '../services/organizationsService.js';

// Pantalla completa al iniciar sesión
export function OrganizationSelectorScreen({ onSelect }) {
  const [orgs, setOrgs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [showForm, setShowForm] = React.useState(false);
  const [formDraft, setFormDraft] = React.useState({ nombre: '', descripcion: '' });
  const [formSaving, setFormSaving] = React.useState(false);
  const [formError, setFormError] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const items = await listOrganizations();
      setOrgs(items);
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar las organizaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orgs;
    return orgs.filter((o) => o.nombre.toLowerCase().includes(term));
  }, [orgs, search]);

  const handleCreate = async () => {
    if (!formDraft.nombre.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    setFormSaving(true);
    setFormError('');
    try {
      const created = await createOrganization(formDraft);
      onSelect(created);
    } catch (err) {
      setFormError(err?.message || 'No se pudo crear la organización.');
      setFormSaving(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'grid',
      placeItems: 'center',
      padding: 24
    }}>
      <div style={{ width: 'min(600px, 100%)', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'rgba(15,118,110,0.2)',
            border: '1px solid rgba(15,118,110,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Building2 size={28} color="#0f766e" />
          </div>
          <h1 style={{ color: '#f8fafc', fontWeight: 800, fontSize: 26, margin: '0 0 8px' }}>
            Seleccionar organización
          </h1>
          <p style={{ color: '#94a3b8', margin: 0 }}>
            Elegí con qué organización vas a trabajar en esta sesión.
          </p>
        </div>

        {/* Searchbox + botón crear */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, padding: '10px 14px'
          }}>
            <Search size={16} color="#64748b" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar organización..."
              style={{
                flex: 1, background: 'transparent', border: 'none',
                outline: 'none', color: '#f1f5f9', fontSize: 14
              }}
            />
          </div>
          <button
            onClick={() => { setShowForm((v) => !v); setFormError(''); setFormDraft({ nombre: '', descripcion: '' }); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 12,
              background: '#0f766e', color: '#fff', border: 'none',
              fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            <Plus size={16} />
            Nueva org
          </button>
        </div>

        {/* Formulario nueva org */}
        {showForm && (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16, padding: 20,
            display: 'flex', flexDirection: 'column', gap: 12
          }}>
            <div style={{ color: '#f1f5f9', fontWeight: 700 }}>Nueva organización</div>
            <input
              autoFocus
              placeholder="Nombre *"
              value={formDraft.nombre}
              onChange={(e) => setFormDraft((p) => ({ ...p, nombre: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10, padding: '10px 12px',
                color: '#f1f5f9', fontSize: 14, outline: 'none'
              }}
            />
            <input
              placeholder="Descripción (opcional)"
              value={formDraft.descripcion}
              onChange={(e) => setFormDraft((p) => ({ ...p, descripcion: e.target.value }))}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10, padding: '10px 12px',
                color: '#f1f5f9', fontSize: 14, outline: 'none'
              }}
            />
            {formError && (
              <div style={{ color: '#f87171', fontSize: 13 }}>{formError}</div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  padding: '8px 16px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'transparent', color: '#94a3b8', cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={formSaving}
                style={{
                  padding: '8px 16px', borderRadius: 10, border: 'none',
                  background: '#0f766e', color: '#fff', fontWeight: 600,
                  cursor: formSaving ? 'wait' : 'pointer',
                  opacity: formSaving ? 0.7 : 1
                }}
              >
                {formSaving ? 'Creando...' : 'Crear y entrar'}
              </button>
            </div>
          </div>
        )}

        {/* Error global */}
        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 12, padding: 12,
            color: '#f87171', fontSize: 13
          }}>
            {error}
            <button
              onClick={load}
              style={{ marginLeft: 12, color: '#fca5a5', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Lista de organizaciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading && (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>
              Cargando organizaciones...
            </div>
          )}
          {!loading && !error && !filtered.length && (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>
              {search ? 'Sin resultados para esa búsqueda.' : 'No hay organizaciones creadas aún.'}
            </div>
          )}
          {filtered.map((org) => (
            <button
              key={org.id}
              onClick={() => onSelect(org)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, padding: '14px 16px',
                cursor: org.activo === false ? 'not-allowed' : 'pointer',
                textAlign: 'left', opacity: org.activo === false ? 0.45 : 1,
                transition: 'background 140ms'
              }}
              disabled={org.activo === false}
              onMouseEnter={(e) => {
                if (org.activo !== false) e.currentTarget.style.background = 'rgba(15,118,110,0.14)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: 'rgba(15,118,110,0.18)',
                border: '1px solid rgba(15,118,110,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Building2 size={20} color="#0f766e" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15 }}>
                  {org.nombre}
                </div>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                  {org.descripcion || 'Sin descripción'}
                  {org.total_usuarios != null
                    ? ` · ${org.total_usuarios} usuario${org.total_usuarios !== 1 ? 's' : ''}`
                    : ''}
                </div>
              </div>
              {org.activo === false ? (
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#f59e0b',
                  background: 'rgba(245,158,11,0.15)',
                  borderRadius: 999, padding: '2px 8px', flexShrink: 0
                }}>
                  Inactiva
                </span>
              ) : (
                <ChevronRight size={16} color="#475569" style={{ flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Modal de cambio de org desde la topbar
export function OrganizationSwitcherModal({ currentOrgId, onSelect, onClose }) {
  const [orgs, setOrgs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [editingId, setEditingId] = React.useState(null);
  const [editDraft, setEditDraft] = React.useState({});
  const [editSaving, setEditSaving] = React.useState(false);
  const [editError, setEditError] = React.useState('');
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [createDraft, setCreateDraft] = React.useState({ nombre: '', descripcion: '' });
  const [createSaving, setCreateSaving] = React.useState(false);
  const [createError, setCreateError] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const items = await listOrganizations();
      setOrgs(items);
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar las organizaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // Cerrar con Escape
  React.useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orgs;
    return orgs.filter((o) => o.nombre.toLowerCase().includes(term));
  }, [orgs, search]);

  const startEdit = (org) => {
    setEditingId(org.id);
    setEditDraft({ nombre: org.nombre, descripcion: org.descripcion || '', activo: org.activo !== false });
    setEditError('');
  };

  const saveEdit = async () => {
    if (!editDraft.nombre?.trim()) { setEditError('El nombre es obligatorio.'); return; }
    setEditSaving(true);
    setEditError('');
    try {
      const updated = await updateOrganization(editingId, editDraft);
      setOrgs((prev) => prev.map((o) => o.id === editingId ? { ...o, ...updated } : o));
      setEditingId(null);
    } catch (err) {
      setEditError(err?.message || 'No se pudo guardar.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!createDraft.nombre.trim()) { setCreateError('El nombre es obligatorio.'); return; }
    setCreateSaving(true);
    setCreateError('');
    try {
      const created = await createOrganization(createDraft);
      onSelect(created);
    } catch (err) {
      setCreateError(err?.message || 'No se pudo crear la organización.');
      setCreateSaving(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.65)',
          zIndex: 300
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(540px, calc(100% - 40px))',
        maxHeight: 'calc(100vh - 80px)',
        background: '#1e293b',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
        zIndex: 301,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>

        {/* Header */}
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 12
        }}>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15 }}>
              Cambiar organización
            </div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
              Seleccioná o editá una organización
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setShowCreateForm((v) => !v); setCreateError(''); setCreateDraft({ nombre: '', descripcion: '' }); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8,
                background: 'rgba(15,118,110,0.2)',
                border: '1px solid rgba(15,118,110,0.35)',
                color: '#0f766e', fontSize: 12, fontWeight: 600, cursor: 'pointer'
              }}
            >
              <Plus size={13} />
              Nueva
            </button>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={15} color="#94a3b8" />
            </button>
          </div>
        </div>

        {/* Formulario nueva org (inline) */}
        {showCreateForm && (
          <div style={{
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column', gap: 8
          }}>
            <input
              autoFocus
              placeholder="Nombre *"
              value={createDraft.nombre}
              onChange={(e) => setCreateDraft((p) => ({ ...p, nombre: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8, padding: '8px 10px',
                color: '#f1f5f9', fontSize: 13, outline: 'none'
              }}
            />
            <input
              placeholder="Descripción (opcional)"
              value={createDraft.descripcion}
              onChange={(e) => setCreateDraft((p) => ({ ...p, descripcion: e.target.value }))}
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8, padding: '8px 10px',
                color: '#f1f5f9', fontSize: 13, outline: 'none'
              }}
            />
            {createError && <div style={{ color: '#f87171', fontSize: 12 }}>{createError}</div>}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateForm(false)}
                style={{
                  padding: '6px 12px', borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'transparent', color: '#94a3b8',
                  fontSize: 12, cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={createSaving}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none',
                  background: '#0f766e', color: '#fff',
                  fontSize: 12, fontWeight: 600,
                  cursor: createSaving ? 'wait' : 'pointer',
                  opacity: createSaving ? 0.7 : 1
                }}
              >
                {createSaving ? 'Creando...' : 'Crear y entrar'}
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{
          padding: '10px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '8px 12px'
          }}>
            <Search size={14} color="#64748b" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              style={{
                flex: 1, background: 'transparent', border: 'none',
                outline: 'none', color: '#f1f5f9', fontSize: 13
              }}
            />
          </div>
        </div>

        {/* Lista */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '12px 20px',
          display: 'flex', flexDirection: 'column', gap: 6
        }}>
          {loading && (
            <div style={{ color: '#64748b', textAlign: 'center', padding: 28 }}>
              Cargando...
            </div>
          )}
          {error && (
            <div style={{ color: '#f87171', fontSize: 13 }}>{error}</div>
          )}
          {!loading && !error && !filtered.length && (
            <div style={{ color: '#64748b', textAlign: 'center', padding: 28 }}>
              {search ? 'Sin resultados.' : 'No hay organizaciones.'}
            </div>
          )}

          {filtered.map((org) => {
            const isCurrent = org.id === currentOrgId;
            const isEditing = editingId === org.id;

            return (
              <div
                key={org.id}
                style={{
                  borderRadius: 12,
                  border: isCurrent
                    ? '1px solid rgba(15,118,110,0.55)'
                    : '1px solid rgba(255,255,255,0.07)',
                  background: isCurrent
                    ? 'rgba(15,118,110,0.1)'
                    : 'rgba(255,255,255,0.03)',
                  overflow: 'hidden'
                }}
              >
                {!isEditing ? (
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    gap: 12, padding: '12px 14px'
                  }}>
                    {/* Ícono */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: 'rgba(15,118,110,0.15)',
                      border: '1px solid rgba(15,118,110,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Building2 size={16} color="#0f766e" />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>
                          {org.nombre}
                        </span>
                        {isCurrent && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: '#0f766e',
                            background: 'rgba(15,118,110,0.2)',
                            borderRadius: 999, padding: '2px 7px'
                          }}>
                            Actual
                          </span>
                        )}
                        {org.activo === false && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: '#f59e0b',
                            background: 'rgba(245,158,11,0.15)',
                            borderRadius: 999, padding: '2px 7px'
                          }}>
                            Inactiva
                          </span>
                        )}
                      </div>
                      {org.descripcion && (
                        <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                          {org.descripcion}
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => startEdit(org)}
                        title="Editar"
                        style={{
                          width: 28, height: 28, borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.05)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit3 size={13} color="#94a3b8" />
                      </button>
                      {!isCurrent && org.activo !== false && (
                        <button
                          onClick={() => onSelect(org)}
                          style={{
                            padding: '4px 12px', borderRadius: 8, border: 'none',
                            background: '#0f766e', color: '#fff',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer'
                          }}
                        >
                          Entrar
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  // Modo edición inline
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      autoFocus
                      value={editDraft.nombre}
                      onChange={(e) => setEditDraft((p) => ({ ...p, nombre: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 8, padding: '8px 10px',
                        color: '#f1f5f9', fontSize: 13, outline: 'none'
                      }}
                    />
                    <input
                      value={editDraft.descripcion}
                      onChange={(e) => setEditDraft((p) => ({ ...p, descripcion: e.target.value }))}
                      placeholder="Descripción (opcional)"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 8, padding: '8px 10px',
                        color: '#f1f5f9', fontSize: 13, outline: 'none'
                      }}
                    />
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      color: '#94a3b8', fontSize: 12, cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={editDraft.activo}
                        onChange={(e) => setEditDraft((p) => ({ ...p, activo: e.target.checked }))}
                      />
                      Organización activa
                    </label>
                    {editError && (
                      <div style={{ color: '#f87171', fontSize: 12 }}>{editError}</div>
                    )}
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          padding: '6px 12px', borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: 'transparent', color: '#94a3b8',
                          fontSize: 12, cursor: 'pointer'
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={saveEdit}
                        disabled={editSaving}
                        style={{
                          padding: '6px 12px', borderRadius: 8, border: 'none',
                          background: '#0f766e', color: '#fff',
                          fontSize: 12, fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 5,
                          cursor: editSaving ? 'wait' : 'pointer',
                          opacity: editSaving ? 0.7 : 1
                        }}
                      >
                        <CheckCircle2 size={13} />
                        {editSaving ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// Chip para la topbar
export function OrganizationTopbarChip({ org, onClick }) {
  return (
    <button
      onClick={onClick}
      title="Cambiar organización"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '6px 12px', borderRadius: 10,
        border: '1px solid rgba(15,118,110,0.35)',
        background: 'rgba(15,118,110,0.08)',
        color: '#0f766e', fontWeight: 600, fontSize: 12,
        cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0
      }}
    >
      <Building2 size={13} />
      {org.nombre}
      <ChevronDown size={11} />
    </button>
  );
}
