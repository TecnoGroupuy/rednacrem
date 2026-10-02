import { setAuthLoggingOut } from '../services/apiClient.js';
import { buildCognitoHostedUiLogoutUrl } from './cognitoConfig.js';

// Cierre de sesion unico, usado tanto por el boton "Cerrar sesion" del menu
// principal (main.jsx) como por el de SessionErrorView (AuthGate.jsx,
// pantalla de error cuando Cognito autentico pero el backend rechazo la
// sesion de negocio) -- antes este ultimo solo limpiaba estado local sin
// pasar por el /logout de Cognito, dejando viva la cookie de sesion del
// Hosted UI.
//
// setAuthLoggingOut(true) desactiva el auto-signinRedirect-ante-401 de
// AuthGate.jsx mientras dura el cierre (ver notifyUnauthorized/isAuthLoggingOut
// en apiClient.js): sin esto, un 401 que llegue durante el propio logout
// podia disparar un signinRedirect que terminaba re-logueando al usuario
// antes de que esta navegacion a Cognito se completara. No hace falta
// volver a poner el flag en false al terminar: el navegador sale de la SPA
// (recarga completa al volver de Cognito, que reinicia el estado del modulo
// en false), y si la navegacion llegara a fallar el catch de abajo lo
// resetea.
export async function closeCognitoSession({ oidcAuth, logout }) {
  setAuthLoggingOut(true);

  if (oidcAuth?.removeUser) {
    try {
      await oidcAuth.removeUser();
    } catch (err) {
      console.warn('No se pudo limpiar el usuario OIDC local al cerrar sesion:', err);
    }
  }

  await logout();

  try {
    window.location.assign(buildCognitoHostedUiLogoutUrl());
  } catch (err) {
    setAuthLoggingOut(false);
    console.warn('No se pudo navegar al logout de Cognito:', err);
  }
}
