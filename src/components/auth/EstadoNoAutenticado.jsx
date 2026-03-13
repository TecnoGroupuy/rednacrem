import React from 'react';
import { ArrowRight, Check, Loader2, Mail, Shield, Terminal, Zap } from 'lucide-react';
import { useAuth as useOidcAuth } from 'react-oidc-context';
import { useAuth as useAppAuth } from '../../auth/AuthProvider.jsx';
import './EstadoNoAutenticado.css';

export default function EstadoNoAutenticado() {
  const oidcAuth = useOidcAuth();
  const { login } = useAppAuth();
  const [isLoggingDev, setIsLoggingDev] = React.useState(false);
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const [showEmailForm, setShowEmailForm] = React.useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = React.useState(false);
  const [showTip, setShowTip] = React.useState(false);

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
      const loginUrl = 'https://us-east-2jy8mpm6nj.auth.us-east-2.amazoncognito.com/login?client_id=40v9so763de3tr5agebi3aha16&response_type=code&scope=email+openid+profile&redirect_uri=https://rednacrem.tri.uy&lang=es';
      window.location.assign(loginUrl);
    } finally {
      setIsRedirecting(false);
    }
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    if (isSubmittingEmail || isRedirecting) return;
    setIsSubmittingEmail(true);
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    setIsSubmittingEmail(false);
    handleCognitoLogin();
  };

  return (
    <div className="login-screen-root">
      <div className="login-left-pane">
        <div className="login-left-copy fade-in-delay">
          <h1>Bienvenido a <span>Rednacrem</span></h1>
          <p>
            Gestiona contactos, usuarios y seguimiento comercial en un solo lugar.
            La plataforma integral para equipos de ventas modernos.
          </p>
          <div className="login-feature-list">
            <div><Check size={14} />Gestion centralizada de contactos</div>
            <div><Check size={14} />Seguimiento de oportunidades en tiempo real</div>
            <div><Check size={14} />Reportes y analisis avanzados</div>
          </div>
        </div>

        <div className="login-left-footer fade-in-delay-2">Desarrollado por Tecno Group</div>
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

          <button type="button" className="login-google-btn btn-hover" onClick={handleCognitoLogin} disabled={isRedirecting}>
            <svg className="login-google-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {isRedirecting ? 'Redirigiendo...' : 'Continuar con Google'}
          </button>

          <div className="login-divider"><span>O</span></div>

          <button type="button" className="login-email-btn" onClick={() => setShowEmailForm((prev) => !prev)}>
            <Mail size={16} />Iniciar sesion con email
          </button>

          {showEmailForm ? (
            <form className="login-email-form fade-in-up" onSubmit={handleEmailSubmit}>
              <label>
                Correo electronico
                <input type="email" placeholder="nombre@empresa.com" required />
              </label>
              <label>
                Contrasena
                <input type="password" placeholder="••••••••" required />
              </label>
              <div className="login-email-row">
                <label className="login-check-row"><input type="checkbox" />Recordarme</label>
                <a href="#">¿Olvidaste tu contrasena?</a>
              </div>
              <button type="submit" className="login-submit-btn btn-hover" disabled={isSubmittingEmail || isRedirecting}>
                {isSubmittingEmail ? <Loader2 size={16} className="spin" /> : null}
                {isSubmittingEmail ? 'Validando...' : 'Acceder'}
              </button>
            </form>
          ) : null}

          {oidcAuth.isLoading ? <p className="login-status">Procesando autenticacion...</p> : null}
          {oidcAuth.activeNavigator ? <p className="login-status">Redirigiendo...</p> : null}
          {oidcAuth.error ? <p className="login-error">Error OIDC: {oidcAuth.error.message}</p> : null}

          <p className="login-help">¿No tienes cuenta? <a href="#">Contacta a tu administrador</a></p>
        </div>

        <div className="login-legal-links fade-in-delay-2">
          <a href="#">Privacidad</a>
          <a href="#">Terminos</a>
          <a href="#">Soporte</a>
        </div>

        <div className="login-right-glow"></div>
      </div>

      {import.meta.env.DEV ? (
        <div className="login-dev-wrap">
          <button
            type="button"
            className="button ghost"
            onClick={handleLoginDev}
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
            disabled={isLoggingDev}
            style={{
              border: '1px solid rgba(148,163,184,0.24)',
              background: 'rgba(15,23,42,0.9)',
              color: '#cbd5e1',
              backdropFilter: 'blur(10px)',
              borderRadius: 12,
              padding: '8px 12px',
              fontSize: '0.82rem'
            }}
          >
            {isLoggingDev ? <Loader2 size={15} className="spin" /> : <Terminal size={15} />}
            {isLoggingDev ? 'Ingresando...' : 'Login Dev'}
          </button>
          {showTip ? <div className="login-dev-tip">Acceso temporal de desarrollo</div> : null}
        </div>
      ) : null}
    </div>
  );
}
