import React from 'react';
import { Loader2, Mail, Send, Terminal, UserPlus, Zap } from 'lucide-react';
import { useAuth as useOidcAuth } from 'react-oidc-context';
import { useAuth as useAppAuth } from '../../auth/AuthProvider.jsx';
import { submitVendorRegistrationRequest } from '../../services/registrationService.js';
import './EstadoNoAutenticado.css';

export default function EstadoNoAutenticado() {
  const oidcAuth = useOidcAuth();
  const { login } = useAppAuth();
  const [isLoggingDev, setIsLoggingDev] = React.useState(false);
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const [showVendorRequestForm, setShowVendorRequestForm] = React.useState(false);
  const [requestSubmitted, setRequestSubmitted] = React.useState(false);
  const [registerDraft, setRegisterDraft] = React.useState({ nombre: '', apellido: '', email: '', telefono: '' });
  const [registerLoading, setRegisterLoading] = React.useState(false);
  const [registerError, setRegisterError] = React.useState('');
  const [registerSuccess, setRegisterSuccess] = React.useState('');
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

  const updateRegisterField = (field, value) => {
    setRegisterDraft((prev) => ({ ...prev, [field]: value }));
  };

  const resetRequestState = () => {
    setRequestSubmitted(false);
    setRegisterError('');
    setRegisterSuccess('');
  };

  const handleVendorRequest = async (event) => {
    event.preventDefault();
    if (registerLoading) return;
    setRegisterError('');
    setRegisterSuccess('');

    if (!registerDraft.nombre.trim() || !registerDraft.apellido.trim() || !registerDraft.email.trim() || !registerDraft.telefono.trim()) {
      setRegisterError('Completa todos los campos obligatorios.');
      return;
    }

    setRegisterLoading(true);
    try {
      await submitVendorRegistrationRequest({
        nombre: registerDraft.nombre.trim(),
        apellido: registerDraft.apellido.trim(),
        email: registerDraft.email.trim(),
        telefono: registerDraft.telefono.trim()
      });
      setRegisterSuccess('Tu solicitud fue enviada y esta pendiente de aprobacion.');
      setRegisterDraft({ nombre: '', apellido: '', email: '', telefono: '' });
      setShowVendorRequestForm(false);
      setRequestSubmitted(true);
    } catch (error) {
      const message = String(error?.message || '');
      if (message.includes('409')) {
        setRegisterError('El email ya existe o tiene una solicitud pendiente.');
      } else if (message.includes('422')) {
        setRegisterError('Hay datos invalidos. Revisa el formulario.');
      } else {
        setRegisterError(message || 'No se pudo enviar la solicitud.');
      }
    } finally {
      setRegisterLoading(false);
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
          <p className="login-brand-tagline">Plataforma de gestion inteligente</p>
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
                <Mail size={16} />Acceder con email
              </button>

              <div className="login-request-section">
                <div className="login-request-head">
                  <h3>Solicitud comercial</h3>
                  <p>El acceso para vendedor se solicita y queda pendiente de aprobacion.</p>
                </div>

                {!showVendorRequestForm && !requestSubmitted ? (
                  <button
                    type="button"
                    className="login-request-toggle"
                    onClick={() => {
                      setShowVendorRequestForm(true);
                      resetRequestState();
                    }}
                    disabled={registerLoading || isRedirecting}
                  >
                    <UserPlus size={16} />
                    Solicitar acceso como vendedor
                  </button>
                ) : null}

                {showVendorRequestForm ? (
                  <form className="login-email-form fade-in-up" onSubmit={handleVendorRequest}>
                    <label>Nombre<input value={registerDraft.nombre} onChange={(event) => updateRegisterField('nombre', event.target.value)} placeholder="Nombre" required /></label>
                    <label>Apellido<input value={registerDraft.apellido} onChange={(event) => updateRegisterField('apellido', event.target.value)} placeholder="Apellido" required /></label>
                    <label>Email<input type="email" value={registerDraft.email} onChange={(event) => updateRegisterField('email', event.target.value)} placeholder="email@dominio.com" required /></label>
                    <label>Telefono<input value={registerDraft.telefono} onChange={(event) => updateRegisterField('telefono', event.target.value)} placeholder="099123123" required /></label>

                    <div className="login-request-actions">
                      <button
                        type="button"
                        className="login-request-cancel"
                        onClick={() => {
                          setShowVendorRequestForm(false);
                          setRegisterError('');
                        }}
                        disabled={registerLoading}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="login-submit-btn btn-hover" disabled={registerLoading}>
                        {registerLoading ? <Loader2 size={16} className="spin" /> : <Send size={15} />}
                        {registerLoading ? 'Enviando...' : 'Enviar solicitud'}
                      </button>
                    </div>
                  </form>
                ) : null}

                {requestSubmitted ? (
                  <div className="login-request-success fade-in-up">
                    <Check size={16} />
                    <div>
                      <p>Solicitud enviada</p>
                      <span>Tu solicitud fue enviada y esta pendiente de revision.</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}

          {registerError ? <p className="login-error">{registerError}</p> : null}
          {registerSuccess ? <p className="login-status" style={{ color: '#34d399' }}>{registerSuccess}</p> : null}

          {oidcAuth.isLoading ? <p className="login-status">Procesando autenticacion...</p> : null}
          {oidcAuth.activeNavigator ? <p className="login-status">Redirigiendo...</p> : null}
          {oidcAuth.error ? <p className="login-error">Error OIDC: {oidcAuth.error.message}</p> : null}
        </div>

        <div className="login-right-glow"></div>
      </div>

    </div>
  );
}
