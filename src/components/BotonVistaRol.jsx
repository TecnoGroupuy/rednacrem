import React from 'react';
import { Eye, ChevronDown, CheckCircle2, Shield } from 'lucide-react';
import { useAuth, VIEWABLE_ROLES } from '../auth/AuthProvider.jsx';
import { useRolEfectivo } from '../hooks/useRolEfectivo.js';
import { logActivityEvent } from '../services/activityService.js';

export default function BotonVistaRol({ roleMeta }) {
  const { user, setVistaRol, restaurarVistaRol } = useAuth();
  const { rolReal, rolEfectivo, esVistaSimulada, esSuperadmin } = useRolEfectivo();
  const [open, setOpen] = React.useState(false);

  if (!esSuperadmin) return null;

  const roleOptions = VIEWABLE_ROLES
    .map((id) => ({ id, ...(roleMeta[id] || { label: id, description: '' }) }))
    .filter((item) => item.id !== 'superadministrador');

  const changeVista = (roleId) => {
    setVistaRol(roleId);
    setOpen(false);
    // Telemetria UX local (no reemplaza auditoria backend).
    logActivityEvent({
      entidad: 'seguridad',
      entidadId: user.id,
      tipo: 'modo_vista_ui',
      descripcion: 'Cambio de vista a ' + roleId,
      usuarioId: user.id
    });
  };

  const restoreVista = () => {
    restaurarVistaRol();
    setOpen(false);
    // Telemetria UX local (no reemplaza auditoria backend).
    logActivityEvent({
      entidad: 'seguridad',
      entidadId: user.id,
      tipo: 'modo_vista_ui',
      descripcion: 'Restauracion de vista real',
      usuarioId: user.id
    });
  };

  return (
    <>
      {esVistaSimulada ? (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: 'rgba(109,40,217,0.95)', color: '#fff', border: '1px solid rgba(196,181,253,0.45)', borderRadius: 999, padding: '10px 14px', boxShadow: '0 14px 32px rgba(91,33,182,0.35)', display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <Eye size={16} />
          <span style={{ fontWeight: 700 }}>Modo vista: {roleMeta[rolEfectivo]?.label || rolEfectivo}</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <button onClick={restoreVista} style={{ border: 0, background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: 999, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 700 }}>
            <Shield size={14} /> Volver a {roleMeta[rolReal]?.label || rolReal}
          </button>
        </div>
      ) : null}

      <div className="fab" style={{ right: 24, bottom: 24 }}>
        {open ? (
          <div className="fab-menu">
            <div style={{ padding: '4px 8px 12px' }}>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800 }}>Ver como rol</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: 4 }}>Solo afecta UI. Permisos reales por backend + rol real.</div>
            </div>
            {roleOptions.map((roleItem) => (
              <button key={roleItem.id} className={'fab-item ' + (rolEfectivo === roleItem.id ? 'active' : '')} onClick={() => changeVista(roleItem.id)}>
                <div className="nav-icon" style={{ background: roleItem.color || 'rgba(15,118,110,0.6)' }}><Eye size={16} color="white" /></div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700 }}>{roleItem.label}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>{roleItem.description || 'Vista simulada'}</div>
                </div>
                {rolEfectivo === roleItem.id ? <CheckCircle2 size={16} color="#15803d" /> : null}
              </button>
            ))}
            {esVistaSimulada ? (
              <>
                <div style={{ height: 1, background: 'rgba(100,116,139,0.3)', margin: '8px 6px' }}></div>
                <button className="fab-item" onClick={restoreVista}>
                  <div className="nav-icon" style={{ background: 'rgba(15,118,110,0.18)' }}><Shield size={16} color="#0f766e" /></div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700 }}>Restaurar vista real</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>Rol real: {roleMeta[rolReal]?.label || rolReal}</div>
                  </div>
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        <button className="fab-trigger" onClick={() => setOpen((prev) => !prev)}>
          <div className="nav-icon" style={{ background: 'rgba(255,255,255,0.12)' }}><Eye size={18} color="white" /></div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.76rem', opacity: 0.72 }}>{esVistaSimulada ? 'Modo vista' : 'Rol activo'}</div>
            <div style={{ fontWeight: 800 }}>{roleMeta[rolEfectivo]?.label || rolEfectivo}</div>
          </div>
          <ChevronDown size={18} />
        </button>
      </div>
    </>
  );
}
