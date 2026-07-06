import React from 'react';
import {
  ArrowRight, Building2, ChevronDown, Plus, Users, X
} from 'lucide-react';
import {
  listOrganizations,
  createOrganization,
  updateOrganization
} from '../services/organizationsService.js';
import { getApiClient } from '../services/apiClient.js';

const INITIALS_COLORS = [
  { bg: '#E1F5EE', text: '#0F6E56' },
  { bg: '#E6F1FB', text: '#185FA5' },
  { bg: '#FAECE7', text: '#993C1D' },
  { bg: '#FAEEDA', text: '#854F0B' },
  { bg: '#EEEDFE', text: '#534AB7' },
];

const formatUsersLabel = (value) => {
  const total = Number(value || 0);
  return `${total} usuario${total === 1 ? '' : 's'}`;
};

// Pantalla completa al iniciar sesion
export function OrganizationSelectorScreen({ onSelect, hideCreateButton, overrideOrgs }) {
  const [orgs, setOrgs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [showForm, setShowForm] = React.useState(false);
  const [wizardStep, setWizardStep] = React.useState(1);
  const [formDraft, setFormDraft] = React.useState({
    nombre: '', rut: '', email_admin: '', telefono: '', pais: 'UY'
  });
  const [adminDraft, setAdminDraft] = React.useState({
    nombre: '', apellido: '', email: '', telefono: '',
    role: 'supervisor', status: 'approved',
    reason: 'Alta desde onboarding de nueva organizacion'
  });
  const [formSaving, setFormSaving] = React.useState(false);
  const [formError, setFormError] = React.useState('');
  const [createdOrg, setCreatedOrg] = React.useState(null);

  const load = React.useCallback(async () => {
    if (overrideOrgs) {
      setOrgs(overrideOrgs);
      setLoading(false);
      return;
    }
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
  }, [overrideOrgs]);

  React.useEffect(() => { load(); }, [load]);

  const handleCreateOrg = async () => {
    if (!formDraft.nombre.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    setFormSaving(true);
    setFormError('');
    try {
      const created = await createOrganization(formDraft);
      setCreatedOrg(created);
      setWizardStep(2);
    } catch (err) {
      setFormError(err?.message || 'No se pudo crear.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!adminDraft.nombre.trim() || !adminDraft.apellido.trim() ||
        !adminDraft.email.trim() || !adminDraft.telefono.trim()) {
      setFormError('Nombre, apellido, email y telefono son obligatorios.');
      return;
    }
    setFormSaving(true);
    setFormError('');
    try {
      const api = getApiClient();
      await api.post(
        `/superadmin/users?organization_id=${createdOrg.id}`,
        adminDraft
      );
      onSelect(createdOrg);
    } catch (err) {
      setFormError(err?.message || 'No se pudo crear el usuario.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleSkipAdmin = () => {
    onSelect(createdOrg);
  };

  const resetForm = () => {
    setShowForm(false);
    setWizardStep(1);
    setFormDraft({ nombre: '', rut: '', email_admin: '', telefono: '', pais: 'UY' });
    setAdminDraft({
      nombre: '', apellido: '', email: '', telefono: '',
      role: 'supervisor', status: 'approved',
      reason: 'Alta desde onboarding de nueva organizacion'
    });
    setFormError('');
    setCreatedOrg(null);
  };

  return (
    <div
      className="grid min-h-screen content-start justify-items-center overflow-y-auto bg-gradient-to-br from-[#0f172a] to-[#1e293b] px-6 pb-8 pt-8"
      style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}
    >
      <div className="flex w-full max-w-[760px] flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col gap-5">
          <div className="text-center">
            <img
              src="https://rednacrem-assets.s3.us-east-1.amazonaws.com/home/TRI+sin+fondo.png"
              alt="Tri"
              style={{
                height: 130,
                width: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 12px rgba(16,185,129,0.3))',
                margin: '0 auto'
              }}
            />
            <h1
              className="mb-2 text-[26px] font-extrabold text-slate-50"
              style={{ fontFamily: 'Manrope, "IBM Plex Sans", sans-serif' }}
            >
              Seleccionar organizacion
            </h1>
            <p className="m-0 text-base text-slate-400">
              Elegi con que organizacion vas a trabajar.
            </p>
          </div>

          {!hideCreateButton && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (showForm) {
                    resetForm();
                  } else {
                    setShowForm(true);
                    setWizardStep(1);
                    setFormError('');
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-950/30 transition duration-200 hover:-translate-y-0.5 hover:from-teal-400 hover:to-teal-500"
                style={{ fontFamily: 'inherit' }}
              >
                {showForm ? <X size={16} /> : <Plus size={16} />}
                {showForm ? 'Cancelar nueva organización' : 'Nueva organización'}
              </button>
            </div>
          )}
        </div>

        {/* Formulario nueva org */}
        {!hideCreateButton && showForm && (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16, padding: 24,
            display: 'flex', flexDirection: 'column', gap: 16
          }}>
            {/* Indicador de pasos */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: wizardStep === 1 ? '#0f766e' : '#64748b'
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: wizardStep === 1 ? '#0f766e' : '#1D9E75',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff'
                }}>1</div>
                Datos de la empresa
              </div>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: wizardStep === 2 ? '#0f766e' : '#64748b'
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: wizardStep === 2 ? '#0f766e' : 'rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  color: wizardStep === 2 ? '#fff' : '#64748b'
                }}>2</div>
                Usuario administrador
              </div>
            </div>

            {/* PASO 1 — Datos de la empresa */}
            {wizardStep === 1 && (
              <>
                <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 15 }}>
                  Nueva organizacion
                </div>

                <input
                  autoFocus
                  placeholder="Nombre *"
                  value={formDraft.nombre}
                  onChange={e => setFormDraft(p => ({ ...p, nombre: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateOrg(); }}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 10, padding: '10px 12px',
                    color: '#f1f5f9', fontSize: 14, outline: 'none', width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
                <input
                  placeholder="RUT (opcional)"
                  value={formDraft.rut}
                  onChange={e => setFormDraft(p => ({ ...p, rut: e.target.value }))}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 10, padding: '10px 12px',
                    color: '#f1f5f9', fontSize: 14, outline: 'none', width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
                <input
                  placeholder="Email de contacto (opcional)"
                  type="email"
                  value={formDraft.email_admin}
                  onChange={e => setFormDraft(p => ({ ...p, email_admin: e.target.value }))}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 10, padding: '10px 12px',
                    color: '#f1f5f9', fontSize: 14, outline: 'none', width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
                <input
                  placeholder="Telefono (opcional)"
                  value={formDraft.telefono}
                  onChange={e => setFormDraft(p => ({ ...p, telefono: e.target.value }))}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 10, padding: '10px 12px',
                    color: '#f1f5f9', fontSize: 14, outline: 'none', width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
                <select
                  value={formDraft.pais}
                  onChange={e => setFormDraft(p => ({ ...p, pais: e.target.value }))}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 10, padding: '10px 12px',
                    color: '#f1f5f9', fontSize: 14, outline: 'none', width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="UY">Uruguay</option>
                  <option value="AR">Argentina</option>
                  <option value="CL">Chile</option>
                  <option value="BR">Brasil</option>
                  <option value="MX">Mexico</option>
                  <option value="CO">Colombia</option>
                  <option value="PE">Peru</option>
                </select>

                {formError && (
                  <div style={{ color: '#f87171', fontSize: 13 }}>{formError}</div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={resetForm}
                    style={{
                      padding: '8px 16px', borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'transparent', color: '#94a3b8', cursor: 'pointer',
                      fontSize: 13
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateOrg}
                    disabled={formSaving}
                    style={{
                      padding: '8px 16px', borderRadius: 10, border: 'none',
                      background: '#0f766e', color: '#fff', fontWeight: 600,
                      cursor: formSaving ? 'wait' : 'pointer',
                      opacity: formSaving ? 0.7 : 1, fontSize: 13
                    }}
                  >
                    {formSaving ? 'Creando...' : 'Siguiente →'}
                  </button>
                </div>
              </>
            )}

            {/* PASO 2 — Usuario administrador */}
            {wizardStep === 2 && (
              <>
                <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 15 }}>
                  Usuario administrador
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400, marginLeft: 8 }}>
                    para {createdOrg?.nombre}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input
                    autoFocus
                    placeholder="Nombre *"
                    value={adminDraft.nombre}
                    onChange={e => setAdminDraft(p => ({ ...p, nombre: e.target.value }))}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 10, padding: '10px 12px',
                      color: '#f1f5f9', fontSize: 14, outline: 'none',
                      width: '100%', boxSizing: 'border-box'
                    }}
                  />
                  <input
                    placeholder="Apellido *"
                    value={adminDraft.apellido}
                    onChange={e => setAdminDraft(p => ({ ...p, apellido: e.target.value }))}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 10, padding: '10px 12px',
                      color: '#f1f5f9', fontSize: 14, outline: 'none',
                      width: '100%', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <input
                  placeholder="Email *"
                  type="email"
                  value={adminDraft.email}
                  onChange={e => setAdminDraft(p => ({ ...p, email: e.target.value }))}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 10, padding: '10px 12px',
                    color: '#f1f5f9', fontSize: 14, outline: 'none', width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
                <input
                  placeholder="Telefono *"
                  value={adminDraft.telefono}
                  onChange={e => setAdminDraft(p => ({ ...p, telefono: e.target.value }))}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 10, padding: '10px 12px',
                    color: '#f1f5f9', fontSize: 14, outline: 'none', width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
                <select
                  value={adminDraft.role}
                  onChange={e => setAdminDraft(p => ({ ...p, role: e.target.value }))}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 10, padding: '10px 12px',
                    color: '#f1f5f9', fontSize: 14, outline: 'none', width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="supervisor">Supervisor</option>
                  <option value="director">Director</option>
                  <option value="operaciones">Operaciones</option>
                </select>

                {formError && (
                  <div style={{ color: '#f87171', fontSize: 13 }}>{formError}</div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleSkipAdmin}
                    style={{
                      padding: '8px 16px', borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'transparent', color: '#94a3b8', cursor: 'pointer',
                      fontSize: 13
                    }}
                  >
                    Saltar por ahora
                  </button>
                  <button
                    onClick={handleCreateAdmin}
                    disabled={formSaving}
                    style={{
                      padding: '8px 16px', borderRadius: 10, border: 'none',
                      background: '#0f766e', color: '#fff', fontWeight: 600,
                      cursor: formSaving ? 'wait' : 'pointer',
                      opacity: formSaving ? 0.7 : 1, fontSize: 13
                    }}
                  >
                    {formSaving ? 'Creando usuario...' : 'Crear y entrar'}
                  </button>
                </div>
              </>
            )}
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
        <div className="flex flex-col gap-4">
          {loading && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center text-sm text-slate-400">
              Cargando organizaciones...
            </div>
          )}
          {!loading && !error && !orgs.length && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center text-sm text-slate-400">
              Sin organizaciones aun.
            </div>
          )}
          {orgs.map((org, idx) => {
            return (
              <button
                key={org.id}
                onClick={() => onSelect(org)}
                disabled={org.activo === false}
                className={[
                  'animate-fade-in-up relative w-full overflow-visible rounded-2xl text-left',
                  org.activo === false
                    ? 'glass-card glass-card-inactive cursor-not-allowed'
                    : 'group glass-card glass-card-hover cursor-pointer'
                ].join(' ')}
                style={{
                  animationDelay: `${Math.min(idx * 80, 320)}ms`,
                  fontFamily: 'inherit'
                }}
              >
                <div className="grid grid-cols-1 items-center gap-5 px-5 py-4 sm:grid-cols-[170px_1fr_auto_auto_auto] sm:px-5">
                  <div className="w-full sm:w-[170px]">
                    <div
                      className={[
                        'flex h-20 w-full items-center justify-center overflow-hidden rounded-xl p-2.5 shadow-md',
                        org.activo === false ? 'bg-white/85' : 'bg-white'
                      ].join(' ')}
                    >
                      {org.logo_url ? (
                        <img
                          src={org.logo_url}
                          alt={org.nombre || 'Organizacion'}
                          className="max-h-full max-w-full object-contain"
                          style={{ filter: org.activo === false ? 'grayscale(1)' : 'none' }}
                        />
                      ) : (
                        <Building2 className="h-6 w-6 text-slate-400" />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h3
                      className="truncate text-center text-lg font-semibold text-slate-50"
                      style={{ fontFamily: 'Manrope, "IBM Plex Sans", sans-serif' }}
                    >
                      {org.nombre || 'Sin nombre'}
                    </h3>
                  </div>

                  <div
                    className="flex items-center justify-center gap-2 text-sm text-slate-300"
                    style={{ fontFamily: 'inherit' }}
                  >
                    <Users size={15} className="shrink-0 text-slate-400" />
                    <span>{formatUsersLabel(org.total_usuarios)}</span>
                  </div>

                  <span
                    className={[
                      'inline-flex justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                      org.activo === false
                        ? 'border-red-400/20 bg-red-500/10 text-red-200'
                        : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
                    ].join(' ')}
                  >
                    {org.activo === false ? 'Inactiva' : 'Activa'}
                  </span>

                  <div
                    className={[
                      'mx-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition duration-200 sm:mx-0',
                      org.activo === false
                        ? 'border-white/10 bg-white/[0.03] text-slate-500'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 group-hover:border-teal-400/30 group-hover:bg-teal-500/10 group-hover:text-teal-200'
                    ].join(' ')}
                  >
                    <ArrowRight size={18} />
                  </div>
                </div>
              </button>
            );
          })}
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
      setError(err?.message || 'Error cargando organizaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Cerrar al hacer click fuera
  React.useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('#org-switcher-dropdown')) onClose();
    };
    setTimeout(() => window.addEventListener('mousedown', handler), 0);
    return () => window.removeEventListener('mousedown', handler);
  }, [onClose]);

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? orgs.filter((o) => o.nombre.toLowerCase().includes(term)) : orgs;
  }, [orgs, search]);

  const handleCreate = async () => {
    if (!createDraft.nombre.trim()) {
      setCreateError('El nombre es obligatorio.');
      return;
    }
    setCreateSaving(true);
    setCreateError('');
    try {
      const created = await createOrganization(createDraft);
      onSelect(created);
    } catch (err) {
      setCreateError(err?.message || 'No se pudo crear.');
      setCreateSaving(false);
    }
  };

  return (
    <div
      id="org-switcher-dropdown"
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: 320,
        background: 'var(--color-background-primary, #1e293b)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        zIndex: 200,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 14px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Organizaciones
        </span>
        <button
          onClick={() => { setShowCreateForm((v) => !v); setCreateError(''); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(15,118,110,0.15)',
            border: '1px solid rgba(15,118,110,0.3)',
            borderRadius: 8, padding: '4px 10px',
            fontSize: 12, fontWeight: 600, color: '#0f766e', cursor: 'pointer'
          }}
        >
          + Nueva
        </button>
      </div>

      {/* Formulario crear */}
      {showCreateForm && (
        <div style={{
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', flexDirection: 'column', gap: 6
        }}>
          <input
            autoFocus
            placeholder="Nombre *"
            value={createDraft.nombre}
            onChange={(e) => setCreateDraft((p) => ({ ...p, nombre: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, padding: '7px 10px',
              color: '#f1f5f9', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box'
            }}
          />
          <input
            placeholder="Descripcion (opcional)"
            value={createDraft.descripcion}
            onChange={(e) => setCreateDraft((p) => ({ ...p, descripcion: e.target.value }))}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, padding: '7px 10px',
              color: '#f1f5f9', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box'
            }}
          />
          {createError && <div style={{ color: '#f87171', fontSize: 12 }}>{createError}</div>}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowCreateForm(false)}
              style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={createSaving}
              style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: '#0f766e', color: '#fff', fontSize: 12, fontWeight: 600, cursor: createSaving ? 'wait' : 'pointer', opacity: createSaving ? 0.7 : 1 }}
            >
              {createSaving ? 'Creando...' : 'Crear y entrar'}
            </button>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '7px 10px',
            color: '#f1f5f9', fontSize: 13, outline: 'none'
          }}
        />
      </div>

      {/* Lista */}
      <div style={{ maxHeight: 280, overflowY: 'auto', padding: '6px 8px' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0', fontSize: 13 }}>
            Cargando...
          </div>
        )}
        {error && (
          <div style={{ color: '#f87171', fontSize: 12, padding: '8px 6px' }}>
            {error}
            <button onClick={load} style={{ marginLeft: 8, color: '#fca5a5', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>
              Reintentar
            </button>
          </div>
        )}
        {!loading && !error && filtered.map((org, idx) => {
          const c = INITIALS_COLORS[idx % INITIALS_COLORS.length];
          const initials = org.nombre.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
          const isCurrent = org.id === currentOrgId;
          return (
            <button
              key={org.id}
              onClick={() => org.activo !== false && onSelect(org)}
              disabled={org.activo === false}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 8px', borderRadius: 10, border: 'none',
                background: isCurrent ? 'rgba(15,118,110,0.15)' : 'transparent',
                cursor: org.activo === false ? 'not-allowed' : 'pointer',
                opacity: org.activo === false ? 0.4 : 1,
                textAlign: 'left', marginBottom: 2
              }}
              onMouseEnter={(e) => { if (org.activo !== false && !isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = isCurrent ? 'rgba(15,118,110,0.15)' : 'transparent'; }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: c.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 13, fontWeight: 600, color: c.text
              }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {org.nombre}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {org.total_usuarios ?? 0} usuario{org.total_usuarios !== 1 ? 's' : ''}
                  {isCurrent ? ' · Actual' : ''}
                </div>
              </div>
              {isCurrent && (
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0f766e', flexShrink: 0 }} />
              )}
            </button>
          );
        })}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0', fontSize: 13 }}>
            Sin resultados.
          </div>
        )}
      </div>
    </div>
  );
}

// Chip para la topbar
export function OrganizationTopbarChip({ org, onClick }) {
  return (
    <button
      onClick={onClick}
      title="Cambiar organizacion"
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
