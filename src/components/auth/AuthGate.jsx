import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth as useOidcAuth } from 'react-oidc-context';
import { useAuth as useAppAuth } from '../../auth/AuthProvider.jsx';
import EstadoNoAutenticado from './EstadoNoAutenticado.jsx';

export default function AuthGate({ children }) {
  const oidcAuth = useOidcAuth();
  const { user, authLoading, rehydrateSessionFromCognito, hydrateFromSession } = useAppAuth();

  React.useEffect(() => {
    rehydrateSessionFromCognito();
  }, [rehydrateSessionFromCognito]);

  React.useEffect(() => {
    if (!oidcAuth.isAuthenticated || user || !oidcAuth.user) return;
    hydrateFromSession({
      id: oidcAuth.user.profile?.sub || oidcAuth.user.profile?.['cognito:username'] || '',
      nombre: oidcAuth.user.profile?.name || oidcAuth.user.profile?.email || 'Usuario',
      email: oidcAuth.user.profile?.email || '',
      claims: oidcAuth.user.profile || {},
      accessToken: oidcAuth.user.access_token || null,
      idToken: oidcAuth.user.id_token || null
    });
  }, [oidcAuth.isAuthenticated, oidcAuth.user, user, hydrateFromSession]);

  const haySesion = oidcAuth.isAuthenticated || !!user;

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

  if (!haySesion) return <EstadoNoAutenticado />;
  return <>{children}</>;
}
