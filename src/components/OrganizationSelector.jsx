import React from 'react';
import { Building2, Plus, ChevronRight, Search, Edit3, CheckCircle2, X } from 'lucide-react';
import { listOrganizations, createOrganization, updateOrganization } from '../services/organizationsService.js';

// ─── Pantalla completa al iniciar sesión ──────────────────────────────────
export function OrganizationSelectorScreen({ onSelect }) {
  const [orgs, setOrgs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
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

  const handleCreate = async () => {
    if (!formDraft.nombre.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    setFormSaving(true);
    setFormError('');
    try {
      const created = await createOrganization(formDraft);
      setOrgs((prev) => [created, ...prev]);
      setShowForm(false);
      setFormDraft({ nombre: '', descripcion: '' });
      onSelect(created);
    } catch (err) {
      setFormError(err?.message || 'No se pudo crear la organización.');
    } finally {
      setFormSaving(false);
    }
  };

  return (
    <div className="org-page">
      <style>{`
        .org-page {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          height: 100vh;
          overflow: hidden;
          position: relative;
        }
        .org-page * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .org-status-bar {
          height: 44px;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          font-size: 14px;
          font-weight: 600;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .org-container {
          height: calc(100vh - 44px);
          overflow-y: auto;
          padding: 24px 20px;
          padding-bottom: 100px;
          -webkit-overflow-scrolling: touch;
        }
        .org-header { margin-bottom: 32px; margin-top: 8px; }
        .org-header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        .org-title { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2; }
        .org-subtitle { color: #94a3b8; font-size: 16px; line-height: 1.4; }
        .org-edit-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #14b8a6;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(10px);
        }
        .org-section-label {
          font-size: 13px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
          letter-spacing: 0.8px;
          margin-bottom: 16px;
          margin-left: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .org-section-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.05);
          margin-left: 8px;
        }
        .org-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .org-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 24px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 18px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          animation: orgSlideUp 0.5s ease-out forwards;
          opacity: 0;
        }
        .org-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s;
        }
        .org-card:active {
          transform: scale(0.98);
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(20, 184, 166, 0.3);
        }
        .org-card:active::before { transform: translateX(100%); }
        .org-logo-wrap { position: relative; flex-shrink: 0; }
        .org-logo {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          border: 2px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          background: #1e293b;
          color: #14b8a6;
        }
        .org-status-dot {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 18px;
          height: 18px;
          background: #22c55e;
          border: 3px solid #0f172a;
          border-radius: 50%;
        }
        .org-status-dot.inactive { background: #64748b; }
        .org-info { flex: 1; min-width: 0; }
        .org-name {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 6px;
          color: #f8fafc;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .org-role {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #14b8a6;
          background: rgba(20, 184, 166, 0.1);
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 500;
        }
        .org-meta {
          font-size: 14px;
          color: #64748b;
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .org-chevron {
          color: #475569;
          font-size: 24px;
          transition: all 0.3s;
          margin-left: 8px;
        }
        .org-card:active .org-chevron { color: #14b8a6; transform: translateX(4px); }
        .org-fab {
          position: fixed;
          bottom: 24px;
          right: 20px;
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 28px;
          font-weight: 300;
          box-shadow: 0 6px 24px rgba(13, 148, 136, 0.5);
          border: none;
          cursor: pointer;
          z-index: 90;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .org-fab:active { transform: scale(0.9) rotate(90deg); box-shadow: 0 3px 12px rgba(13, 148, 136, 0.4); }
        .org-form {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }
        .org-input {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          padding: 10px 12px;
          color: #f1f5f9;
          font-size: 14px;
          outline: none;
        }
        .org-actions { display: flex; gap: 8px; justify-content: flex-end; }
        .org-btn-ghost {
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.15);
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
        }
        .org-btn-primary {
          padding: 8px 16px;
          border-radius: 10px;
          border: none;
          background: #0f766e;
          color: #fff;
          font-weight: 600;
          cursor: pointer;
        }
        @keyframes orgSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .org-fab { bottom: calc(24px + env(safe-area-inset-bottom)); }
          .org-container { padding-bottom: calc(100px + env(safe-area-inset-bottom)); }
        }
        .org-container::-webkit-scrollbar { width: 0px; background: transparent; }
      `}</style>
      <div className="org-status-bar">
        <span>9:41</span>
        <div style={{ display: 'flex', gap: 6, fontSize: 12 }}>
          <span>📶</span>
          <span>WiFi</span>
          <span>🔋</span>
        </div>
      </div>
      <div className="org-container">
        <div className="org-header">
          <div className="org-header-top">
            <div>
              <h1 className="org-title">Mis Empresas</h1>
            </div>
          </div>
          <p className="org-subtitle">Seleccioná la empresa para comenzar a trabajar</p>
        </div>

        {showForm && (
          <div className="org-form">
            <div style={{ color: '#f1f5f9', fontWeight: 700 }}>Nueva organización</div>
            <input
              autoFocus
              className="org-input"
              placeholder="Nombre *"
              value={formDraft.nombre}
              onChange={(e) => setFormDraft((p) => ({ ...p, nombre: e.target.value }))}
            />
            <input
              className="org-input"
              placeholder="Descripción (opcional)"
              value={formDraft.descripcion}
              onChange={(e) => setFormDraft((p) => ({ ...p, descripcion: e.target.value }))}
            />
            {formError && <div style={{ color: '#f87171', fontSize: 13 }}>{formError}</div>}
            <div className="org-actions">
              <button className="org-btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="org-btn-primary" onClick={handleCreate} disabled={formSaving}>
                {formSaving ? 'Guardando...' : 'Crear y entrar'}
              </button>
            </div>
          </div>
        )}

        <div className="org-section-label">Todas las empresas</div>

        {loading && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 32 }}>Cargando...</div>
        )}
        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 12, padding: 12, color: '#f87171', fontSize: 13, marginBottom: 12
          }}>
            {error}
          </div>
        )}
        {!loading && !orgs.length && !error && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 32 }}>
            No hay organizaciones creadas aún.
          </div>
        )}

        <div className="org-grid">
          {orgs.map((org, index) => (
            <div
              key={org.id}
              className="org-card"
              style={{ animationDelay: `${Math.min(index + 1, 5) * 0.05}s`, opacity: org.activo === false ? 0.6 : 1 }}
              onClick={() => onSelect(org)}
            >
              <div className="org-logo-wrap">
                <div className="org-logo">
                  <Building2 size={22} />
                </div>
                <div className={`org-status-dot ${org.activo === false ? 'inactive' : ''}`}></div>
              </div>
              <div className="org-info">
                <div className="org-name">{org.nombre}</div>
                <span className="org-role">👤 {org.role || org.rol || 'Admin'}</span>
                <div className="org-meta">
                  {org.descripcion || 'Sin descripción'}
                  {org.total_usuarios != null
                    ? ` · ${org.total_usuarios} usuario${org.total_usuarios !== 1 ? 's' : ''}`
                    : ''}
                </div>
              </div>
              <span className="org-chevron">›</span>
            </div>
          ))}
        </div>
      </div>

      <button className="org-fab" onClick={() => { setShowForm(true); setFormError(''); }}>
        <Plus size={24} />
      </button>
    </div>
  );
}

// ─── Modal de cambio de org desde topbar ──────────────────────────────────
export function OrganizationSwitcherModal({ currentOrgId, onSelect, onClose }) {
  const [orgs, setOrgs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [editingId, setEditingId] = React.useState(null);
  const [editDraft, setEditDraft] = React.useState({});
  const [editSaving, setEditSaving] = React.useState(false);
  const [editError, setEditError] = React.useState('');

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

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 300 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(560px, calc(100% - 48px))',
        maxHeight: 'calc(100vh - 80px)',
        background: '#1e293b', borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        zIndex: 301, display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
        }}>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16 }}>Cambiar organización</div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>Seleccioná o editá una organización</div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer'
            }}
          >
            <X size={15} color="#94a3b8" />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '8px 12px'
          }}>
            <Search size={14} color="#64748b" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#f1f5f9', fontSize: 13
              }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {loading && <div style={{ color: '#64748b', textAlign: 'center', padding: 24 }}>Cargando...</div>}
          {error && <div style={{ color: '#f87171', fontSize: 13 }}>{error}</div>}
          {filtered.map((org) => {
            const isCurrent = org.id === currentOrgId;
            const isEditing = editingId === org.id;
            return (
              <div key={org.id} style={{
                borderRadius: 12,
                border: isCurrent
                  ? '1px solid rgba(15,118,110,0.6)'
                  : '1px solid rgba(255,255,255,0.07)',
                background: isCurrent ? 'rgba(15,118,110,0.12)' : 'rgba(255,255,255,0.03)',
                overflow: 'hidden'
              }}>
                {!isEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: 'rgba(15,118,110,0.15)', border: '1px solid rgba(15,118,110,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Building2 size={16} color="#0f766e" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>{org.nombre}</span>
                        {isCurrent && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: '#0f766e',
                            background: 'rgba(15,118,110,0.2)', borderRadius: 999, padding: '2px 7px'
                          }}>
                            Actual
                          </span>
                        )}
                        {org.activo === false && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: '#f59e0b',
                            background: 'rgba(245,158,11,0.15)', borderRadius: 999, padding: '2px 7px'
                          }}>
                            Inactiva
                          </span>
                        )}
                      </div>
                      {org.descripcion && (
                        <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{org.descripcion}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => startEdit(org)}
                        style={{
                          width: 28, height: 28, borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.05)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        title="Editar"
                      >
                        <Edit3 size={13} color="#94a3b8" />
                      </button>
                      {!isCurrent && (
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
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      autoFocus
                      value={editDraft.nombre}
                      onChange={(e) => setEditDraft((p) => ({ ...p, nombre: e.target.value }))}
                      style={{
                        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 8, padding: '8px 10px', color: '#f1f5f9', fontSize: 13, outline: 'none'
                      }}
                    />
                    <input
                      value={editDraft.descripcion}
                      onChange={(e) => setEditDraft((p) => ({ ...p, descripcion: e.target.value }))}
                      placeholder="Descripción (opcional)"
                      style={{
                        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 8, padding: '8px 10px', color: '#f1f5f9', fontSize: 13, outline: 'none'
                      }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={editDraft.activo}
                        onChange={(e) => setEditDraft((p) => ({ ...p, activo: e.target.checked }))}
                      />
                      Organización activa
                    </label>
                    {editError && <div style={{ color: '#f87171', fontSize: 12 }}>{editError}</div>}
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          padding: '6px 12px', borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer'
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
                          fontSize: 12, fontWeight: 600, cursor: editSaving ? 'wait' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6
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
          {!loading && !filtered.length && !error && (
            <div style={{ color: '#64748b', textAlign: 'center', padding: 24 }}>
              {search ? 'Sin resultados.' : 'No hay organizaciones.'}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
