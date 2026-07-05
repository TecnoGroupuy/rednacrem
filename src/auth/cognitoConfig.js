import { WebStorageStateStore } from 'oidc-client-ts';

export const cognitoHostedUiDomain = "https://us-east-2jy8mpm6nj.auth.us-east-2.amazoncognito.com";
const inBrowser = typeof window !== 'undefined';

// Usa el origen actual para que el Hosted UI redireccione al dominio desde el que
// se abrió la app, en lugar de forzar siempre rednacrem.tri.uy.
const currentOrigin = inBrowser ? window.location.origin : "https://rednacrem.tri.uy";
export const cognitoLogoutUri = currentOrigin;

export const cognitoAuthConfig = {
  authority: "https://cognito-idp.us-east-2.amazonaws.com/us-east-2_Jy8mPM6NJ",
  client_id: "59ogsft204res3f33i5ov7rm01",
  redirect_uri: currentOrigin,
  post_logout_redirect_uri: cognitoLogoutUri,
  response_type: "code",
  scope: "email openid profile",
  ...(inBrowser
    ? {
      // Persistir usuario OIDC de forma explícita para evitar sesiones "solo en memoria".
      userStore: new WebStorageStateStore({ store: window.localStorage }),
      stateStore: new WebStorageStateStore({ store: window.sessionStorage })
    }
    : {}),
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
};

export const buildCognitoHostedUiLoginUrl = () =>
  `${cognitoHostedUiDomain}/login?client_id=${cognitoAuthConfig.client_id}&response_type=${cognitoAuthConfig.response_type}&scope=${encodeURIComponent(cognitoAuthConfig.scope)}&redirect_uri=${encodeURIComponent(cognitoAuthConfig.redirect_uri)}&lang=es`;

export const buildCognitoHostedUiGoogleLoginUrl = () =>
  `${cognitoHostedUiDomain}/login?identity_provider=Google&client_id=${cognitoAuthConfig.client_id}&response_type=${cognitoAuthConfig.response_type}&scope=${encodeURIComponent(cognitoAuthConfig.scope)}&redirect_uri=${encodeURIComponent(cognitoAuthConfig.redirect_uri)}`;

export const buildCognitoHostedUiLogoutUrl = () =>
  `${cognitoHostedUiDomain}/logout?client_id=${cognitoAuthConfig.client_id}&logout_uri=${encodeURIComponent(cognitoLogoutUri)}`;
