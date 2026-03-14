export const authService = {
  // Helper opcional para unificar acciones OIDC/Cognito en UI.
  startLogin: async (oidcAuth) => oidcAuth.signinRedirect(),
  startGoogleLogin: async (oidcAuth) => oidcAuth.signinRedirect({
    extraQueryParams: { identity_provider: 'Google' }
  })
};
