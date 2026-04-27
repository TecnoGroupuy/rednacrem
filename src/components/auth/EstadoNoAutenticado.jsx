import React from 'react';
import { Loader2, Mail, Terminal, Zap } from 'lucide-react';
import { useAuth as useOidcAuth } from 'react-oidc-context';
import { useAuth as useAppAuth } from '../../auth/AuthProvider.jsx';
import './EstadoNoAutenticado.css';

export default function EstadoNoAutenticado() {
  const oidcAuth = useOidcAuth();
  const { login } = useAppAuth();
  const [isLoggingDev, setIsLoggingDev] = React.useState(false);
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const isDev = import.meta.env.DEV;

  const DEV_ROLE_PRESETS = [
    {
      id: 'superadministrador',
      label: 'Superadmin',
      email: import.meta.env?.VITE_LOCAL_DEV_USER_EMAIL_SUPERADMIN || 'admin@local.test',
      name: 'Dev Superadmin'
    },
    {
      id: 'supervisor',
      label: 'Supervisor',
      email: import.meta.env?.VITE_LOCAL_DEV_USER_EMAIL_SUPERVISOR || 'supervisor@renacrem.com',
      name: 'Dev Supervisor'
    },
    {
      id: 'vendedor',
      label: 'Vendedor',
      email: import.meta.env?.VITE_LOCAL_DEV_USER_EMAIL_VENDEDOR || 'vendedor@rednacrem.com',
      name: 'Dev Vendedor'
    },
    {
      id: 'vendedor',
      label: 'Matias Decker (Vendedor)',
      email: import.meta.env?.VITE_LOCAL_DEV_USER_EMAIL_VENDEDOR || 'vendedor@rednacrem.com',
      sub: 'dev-matias-decker',
      name: 'Matias Decker'
    }
  ];

  const setLocalDevOverrides = (preset) => {
    try {
      localStorage.setItem('local_dev_user_role', preset.id);
      localStorage.setItem('local_dev_user_email', preset.email);
      if (preset.sub) {
        localStorage.setItem('local_dev_user_sub', preset.sub);
      } else {
        localStorage.removeItem('local_dev_user_sub');
      }
    } catch {
      // no-op
    }
  };

  const handleLoginDev = async (preset) => {
    if (!import.meta.env.DEV || isLoggingDev) return;
    setIsLoggingDev(true);
    try {
      setLocalDevOverrides(preset);
      await login({
        id: 'dev-001',
        nombre: preset.name,
        email: preset.email,
        claims: { 'cognito:groups': [preset.id], email: preset.email },
        accessToken: 'dev-token',
        idToken: 'dev-id'
      });
    } finally {
      setIsLoggingDev(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isRedirecting) return;
    setIsRedirecting(true);
    try {
      await oidcAuth.signinRedirect({
        extraQueryParams: { identity_provider: 'Google' }
      });
    } catch {
      setIsRedirecting(false);
    }
  };

  const handleEmailLogin = async () => {
    if (isRedirecting) return;
    setIsRedirecting(true);
    try {
      await oidcAuth.signinRedirect();
    } catch {
      setIsRedirecting(false);
    }
  };

  return (
    <div className="login-screen-root">
      <div className="login-left-pane">
        <div className="login-brand-center fade-in-delay">
          <div className="login-brand-logo-wrap">
            <img
              src="https://rednacrem-assets.s3.us-east-1.amazonaws.com/home/TRI+sin+fondo.png"
              alt="Tri"
              className="login-brand-logo-img"
            />
          </div>
        </div>
        <div className="login-left-footer fade-in-delay-2">
          <div className="login-aws-badge">
            <span>Powered by</span>
            <img
              src="https://rednacrem-assets.s3.amazonaws.com/home/Amazon_Web_Services-Logo.wine.png"
              alt="AWS"
              className="login-aws-logo"
            />
          </div>
          <p className="login-copyright">Desarrollado por Tecno Group</p>
        </div>
        <div className="login-left-glow-a"></div>
        <div className="login-left-glow-b"></div>
      </div>

      <div className="login-right-pane">
        <div className="login-mobile-brand fade-in-up">
          <div className="login-brand-icon"><Zap size={16} /></div>
          <span>Rednacrem</span>
        </div>

        <div className="login-card fade-in-up">
          <div className="login-card-head">
            <h2>Iniciar sesion</h2>
            <p>Accede a tu cuenta para continuar</p>
          </div>

          {isDev ? (
            <div className="login-dev-card">
              <div className="login-dev-title">
                <Terminal size={16} />
                <span>Acceso rapido local</span>
              </div>
              <div className="login-dev-actions">
                {DEV_ROLE_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    className="login-dev-primary btn-hover"
                    onClick={() => handleLoginDev(preset)}
                    disabled={isLoggingDev}
                  >
                    {isLoggingDev ? <Loader2 size={16} className="spin" /> : <Terminal size={16} />}
                    {isLoggingDev ? 'Ingresando...' : `Entrar como ${preset.label}`}
                  </button>
                ))}
              </div>
              <p className="login-dev-note">No aplica a produccion.</p>
            </div>
          ) : (
            <>
              <button type="button" className="login-google-btn btn-hover" onClick={handleGoogleLogin} disabled={isRedirecting}>
                <svg className="login-google-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {isRedirecting ? 'Redirigiendo...' : 'Continuar con Google'}
              </button>

              <div className="login-divider"><span>O</span></div>

              <button type="button" className="login-email-btn" onClick={handleEmailLogin} disabled={isRedirecting}>
                <Mail size={16} />Acceso a usuarios
              </button>
            </>
          )}

          {oidcAuth.isLoading ? <p className="login-status">Procesando autenticacion...</p> : null}
          {oidcAuth.activeNavigator ? <p className="login-status">Redirigiendo...</p> : null}
          {oidcAuth.error ? <p className="login-error">Error OIDC: {oidcAuth.error.message}</p> : null}
        </div>

        <div className="login-right-glow"></div>
      </div>

    </div>
  );
}
