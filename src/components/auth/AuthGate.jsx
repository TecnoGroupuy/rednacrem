import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth as useOidcAuth } from 'react-oidc-context';
import { useAuth as useAppAuth } from '../../auth/AuthProvider.jsx';
import EstadoNoAutenticado from './EstadoNoAutenticado.jsx';
import RequireApprovedUser from '../guards/RequireApprovedUser.jsx';

export default function AuthGate({ children }) {
  const oidcAuth = useOidcAuth();
  const {
    authSession,
    isAuthenticated,
    authLoading,
    rehydrateSessionFromCognito,
    hydrateFromSession,
    clearSession
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

  if (!isAuthenticated) return <EstadoNoAutenticado />;

  return <RequireApprovedUser>{children}</RequireApprovedUser>;
}
