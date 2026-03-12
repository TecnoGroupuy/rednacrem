// Ejemplo de integracion Cognito-ready (sin acoplar el provider al SDK concreto).
// Reemplazar imports con la libreria real que uses (Amplify Auth, AWS SDK, etc.).

export function createCognitoAdapterExample(authSdk) {
  return {
    async getCurrentSession() {
      // TODO(Cognito): ejemplo con Amplify v6:
      // const { tokens } = await fetchAuthSession();
      // const idToken = tokens?.idToken?.toString() || null;
      // const accessToken = tokens?.accessToken?.toString() || null;
      // const claims = tokens?.idToken?.payload || {};

      const session = await authSdk.getCurrentSession();
      if (!session) return null;

      return {
        id: session.userId,
        nombre: session.name,
        email: session.email,
        claims: session.claims,
        idToken: session.idToken,
        accessToken: session.accessToken
      };
    },
    async signOut() {
      await authSdk.signOut();
    }
  };
}

export function createBackendAdapterExample(apiClient) {
  return {
    async getMe(accessToken) {
      // Backend valida JWT y devuelve rol real.
      return apiClient.get('/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
    }
  };
}
