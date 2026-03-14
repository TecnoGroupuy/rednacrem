import React from 'react';
import { useAuth } from '../../auth/AuthProvider.jsx';

const PendingView = ({ onRefresh, onLogout }) => (
  <div className="view" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
    <div className="panel" style={{ width: 'min(560px, 100%)', textAlign: 'center' }}>
      <h2 className="panel-title" style={{ marginBottom: 8 }}>Tu cuenta está pendiente de aprobación</h2>
      <p className="panel-subtitle" style={{ maxWidth: 460, margin: '0 auto' }}>Un supervisor debe revisar tu solicitud de vendedor antes de habilitar el acceso operativo.</p>
      <div className="toolbar" style={{ justifyContent: 'center', marginTop: 16 }}>
        <button className="button secondary" onClick={onRefresh}>Reintentar estado</button>
        <button className="button ghost" onClick={onLogout}>Cerrar sesión</button>
      </div>
    </div>
  </div>
);

const RejectedView = ({ onLogout }) => (
  <div className="view" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
    <div className="panel" style={{ width: 'min(560px, 100%)', textAlign: 'center' }}>
      <h2 className="panel-title" style={{ marginBottom: 8 }}>Solicitud rechazada</h2>
      <p className="panel-subtitle" style={{ maxWidth: 460, margin: '0 auto' }}>Tu solicitud de registro fue rechazada. Contacta a soporte o intenta nuevamente desde la landing.</p>
      <div className="toolbar" style={{ justifyContent: 'center', marginTop: 16 }}>
        <button className="button ghost" onClick={onLogout}>Volver a la landing</button>
      </div>
    </div>
  </div>
);

const BlockedView = ({ status, onLogout }) => (
  <div className="view" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
    <div className="panel" style={{ width: 'min(560px, 100%)', textAlign: 'center' }}>
      <h2 className="panel-title" style={{ marginBottom: 8 }}>{status === 'inactive' ? 'Cuenta inactiva' : 'Cuenta bloqueada'}</h2>
      <p className="panel-subtitle" style={{ maxWidth: 460, margin: '0 auto' }}>No tienes acceso operativo en este momento. Contacta a administración para reactivación.</p>
      <div className="toolbar" style={{ justifyContent: 'center', marginTop: 16 }}>
        <button className="button ghost" onClick={onLogout}>Cerrar sesión</button>
      </div>
    </div>
  </div>
);

export default function RequireApprovedUser({ children }) {
  const { status, refreshSession, logout } = useAuth();

  if (status === 'pending') return <PendingView onRefresh={refreshSession} onLogout={logout} />;
  if (status === 'rejected') return <RejectedView onLogout={logout} />;
  if (status === 'blocked' || status === 'inactive') return <BlockedView status={status} onLogout={logout} />;

  return <>{children}</>;
}
