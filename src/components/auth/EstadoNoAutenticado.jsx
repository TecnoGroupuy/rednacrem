import React from 'react';
import { Shield, ArrowRight, AlertCircle, Terminal, LogIn, Loader2 } from 'lucide-react';
import { useAuth as useOidcAuth } from 'react-oidc-context';
import { useAuth as useAppAuth } from '../../auth/AuthProvider.jsx';

export default function EstadoNoAutenticado() {
  const oidcAuth = useOidcAuth();
  const { login } = useAppAuth();
  const [isLoggingDev, setIsLoggingDev] = React.useState(false);
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const [showTip, setShowTip] = React.useState(false);

  React.useEffect(() => {
    console.log('OIDC isLoading:', oidcAuth.isLoading);
    console.log('OIDC isAuthenticated:', oidcAuth.isAuthenticated);
    console.log('OIDC activeNavigator:', oidcAuth.activeNavigator);
    console.log('OIDC error:', oidcAuth.error);
    console.log('OIDC user:', oidcAuth.user);
  }, [oidcAuth.isLoading, oidcAuth.isAuthenticated, oidcAuth.activeNavigator, oidcAuth.error, oidcAuth.user]);

  const handleLoginDev = async () => {
    if (!import.meta.env.DEV || isLoggingDev) return;
    setIsLoggingDev(true);
    try {
      await login({
        id: 'dev-001',
        nombre: 'Dev User',
        email: 'dev@test.com',
        claims: { 'cognito:groups': ['superadministrador'] },
        accessToken: 'dev-token',
        idToken: 'dev-id'
      });
    } finally {
      setIsLoggingDev(false);
    }
  };

  const handleCognitoLogin = async () => {
    if (isRedirecting) return;
    setIsRedirecting(true);
    try {
      await oidcAuth.signinRedirect({
        redirect_uri: 'http://localhost:5173'
      });
    } finally {
      setIsRedirecting(false);
    }
  };

  return (
    <div className="view" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, position: 'relative' }}>
      <section style={{ width: 'min(560px, 100%)' }}>
        <div className="panel" style={{ textAlign: 'center' }}>
          <div style={{ width: 76, height: 76, borderRadius: 20, margin: '0 auto 16px', display: 'grid', placeItems: 'center', background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}>
            <LogIn size={34} />
          </div>
          <h1 className="panel-title" style={{ fontSize: '1.55rem', marginBottom: 8 }}>Iniciar sesión</h1>
          <p className="panel-subtitle" style={{ marginBottom: 18 }}>Accede con tu cuenta corporativa</p>

          <button
            type="button"
            className="button secondary"
            onClick={handleCognitoLogin}
            disabled={isRedirecting}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {isRedirecting ? <Loader2 size={16} className="spin" /> : <Shield size={18} />}
            {isRedirecting ? 'Redirigiendo...' : 'Continuar con Cognito'}
            {!isRedirecting ? <ArrowRight size={16} /> : null}
          </button>

          {oidcAuth.isLoading ? <p style={{ marginTop: 10, color: 'var(--muted)', fontSize: '0.84rem' }}>Procesando autenticación...</p> : null}
          {oidcAuth.activeNavigator ? <p style={{ marginTop: 6, color: 'var(--muted)', fontSize: '0.84rem' }}>Redirigiendo...</p> : null}
          {oidcAuth.error ? <p style={{ marginTop: 6, color: '#b91c1c', fontSize: '0.84rem' }}>Error OIDC: {oidcAuth.error.message}</p> : null}

          <div style={{ marginTop: 18, padding: 12, borderRadius: 14, border: '1px solid rgba(20,34,53,0.08)', background: 'rgba(20,34,53,0.03)', textAlign: 'left' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--muted)' }}>
              <AlertCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ fontSize: '0.88rem', lineHeight: 1.45 }}>El módulo de autenticación corporativa está en integración con Amazon Cognito.</div>
            </div>
          </div>
        </div>
      </section>

      {import.meta.env.DEV ? (
        <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 90 }}>
          <button
            type="button"
            className="button ghost"
            onClick={handleLoginDev}
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
            disabled={isLoggingDev}
            style={{ border: '1px solid rgba(20,34,53,0.16)', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(10px)', borderRadius: 12, padding: '8px 12px', fontSize: '0.82rem' }}
          >
            {isLoggingDev ? <Loader2 size={15} className="spin" /> : <Terminal size={15} />}
            {isLoggingDev ? 'Ingresando...' : 'Login Dev'}
          </button>
          {showTip ? (
            <div style={{ position: 'absolute', right: 0, bottom: 'calc(100% + 8px)', background: '#0f172a', color: '#e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: '0.75rem', whiteSpace: 'nowrap', border: '1px solid rgba(148,163,184,0.28)' }}>
              Acceso temporal de desarrollo
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
