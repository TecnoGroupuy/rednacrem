import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth as useOidcAuth } from 'react-oidc-context';
import { useAuth as useAppAuth } from '../../auth/AuthProvider.jsx';
import EstadoNoAutenticado from './EstadoNoAutenticado.jsx';
import RequireApprovedUser from '../guards/RequireApprovedUser.jsx';

function SessionErrorView({ error, onRetry, onLogout }) {
  return (
    <div className="view" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="panel" style={{ width: 'min(560px, 100%)', textAlign: 'center' }}>
        <h2 className="panel-title" style={{ marginBottom: 8 }}>No se pudo iniciar la sesion operativa</h2>
        <p className="panel-subtitle" style={{ maxWidth: 460, margin: '0 auto' }}>
          Cognito autenticó correctamente, pero la validacion de sesion en backend falló.
        </p>
        {error ? <p style={{ marginTop: 12, color: '#be123c', fontWeight: 700 }}>{error}</p> : null}
        <div className="toolbar" style={{ justifyContent: 'center', marginTop: 16 }}>
          <button className="button secondary" onClick={onRetry}>Reintentar</button>
          <button className="button ghost" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
}

export default function AuthGate({ children }) {
  const oidcAuth = useOidcAuth();
  const {
    authSession,
    isAuthenticated,
    authLoading,
    authError,
    rehydrateSessionFromCognito,
    hydrateFromSession,
    clearSession,
    logout
  } = useAppAuth();

  React.useEffect(() => {
    rehydrateSessionFromCognito();
  }, [rehydrateSessionFromCognito]);

  React.useEffect(() => {
    if (!oidcAuth.isAuthenticated || !oidcAuth.user) return;

    const oidcAccess = oidcAuth.user.access_token || null;
    const alreadyHydrated = isAuthenticated && authSession?.accessToken === oidcAccess;
    if (alreadyHydrated) return;

    hydrateFromSession({
      id: oidcAuth.user.profile?.sub || oidcAuth.user.profile?.['cognito:username'] || '',
      nombre: oidcAuth.user.profile?.name || oidcAuth.user.profile?.email || 'Usuario',
      email: oidcAuth.user.profile?.email || '',
      claims: oidcAuth.user.profile || {},
      accessToken: oidcAccess,
      idToken: oidcAuth.user.id_token || null
    });
  }, [oidcAuth.isAuthenticated, oidcAuth.user, isAuthenticated, authSession?.accessToken, hydrateFromSession]);

  React.useEffect(() => {
    const isLocalDevSession = authSession?.accessToken === 'dev-token';
    if (!oidcAuth.isAuthenticated && isAuthenticated && !authLoading && !isLocalDevSession) {
      clearSession();
    }
  }, [oidcAuth.isAuthenticated, isAuthenticated, authLoading, clearSession, authSession?.accessToken]);

  const hasOidcSession = oidcAuth.isAuthenticated && !!oidcAuth.user;
  const oidcAccess = oidcAuth.user?.access_token || null;
  const businessSessionOutdated = hasOidcSession && authSession?.accessToken !== oidcAccess;
  const waitingBusinessSession = hasOidcSession && (!isAuthenticated || businessSessionOutdated) && !authError;

  if (authLoading || oidcAuth.isLoading || !!oidcAuth.activeNavigator) {
    return (
      <div className="view" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div className="panel" style={{ width: 'min(480px, 100%)', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--muted)' }}>
            <Loader2 size={18} className="spin" />
            Verificando sesión...
          </div>
        </div>
      </div>
    );
  }

  if (waitingBusinessSession) {
    return (
      <div className="view" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div className="panel" style={{ width: 'min(480px, 100%)', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--muted)' }}>
            <Loader2 size={18} className="spin" />
            Validando sesion de negocio...
          </div>
        </div>
      </div>
    );
  }

  if (hasOidcSession && authError && !isAuthenticated) {
    return (
      <SessionErrorView
        error={authError}
        onRetry={() => hydrateFromSession({
          id: oidcAuth.user.profile?.sub || oidcAuth.user.profile?.['cognito:username'] || '',
          nombre: oidcAuth.user.profile?.name || oidcAuth.user.profile?.email || 'Usuario',
          email: oidcAuth.user.profile?.email || '',
          claims: oidcAuth.user.profile || {},
          accessToken: oidcAuth.user.access_token || null,
          idToken: oidcAuth.user.id_token || null
        })}
        onLogout={async () => {
          try {
            await oidcAuth.removeUser();
          } catch {}
          await logout();
        }}
      />
    );
  }

  if (!isAuthenticated) return <EstadoNoAutenticado />;

  return <RequireApprovedUser>{children}</RequireApprovedUser>;
}
