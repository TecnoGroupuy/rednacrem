import React from 'react';

const AuthContext = React.createContext(null);

export const VIEWABLE_ROLES = [
  'director',
  'supervisor',
  'vendedor',
  'operaciones',
  'atencion_cliente'
];

const ROLE_PRECEDENCE = [
  'superadministrador',
  'director',
  'supervisor',
  'operaciones',
  'vendedor',
  'atencion_cliente'
];

const findHighestPrecedenceRole = (roles = []) => {
  const normalized = roles.map((item) => String(item).toLowerCase());
  return ROLE_PRECEDENCE.find((role) => normalized.includes(role)) || null;
};

const mapCognitoGroupsToRol = (groups = []) => {
  const normalized = Array.isArray(groups) ? groups : [];
  return findHighestPrecedenceRole(normalized);
};

const sanitizeVistaRol = (rolReal, vistaRol) => {
  if (rolReal !== 'superadministrador') return null;
  return VIEWABLE_ROLES.includes(vistaRol) ? vistaRol : null;
};

const extractGroupsFromClaims = (claims = {}) => {
  const fromIdToken = claims['cognito:groups'];
  if (Array.isArray(fromIdToken)) return fromIdToken;
  if (typeof fromIdToken === 'string' && fromIdToken.trim()) return [fromIdToken.trim()];
  return [];
};

export function AuthProvider({
  children,
  cognitoAdapter = null,
  backendAdapter = null,
  fallbackRole = null
}) {
  const [user, setUser] = React.useState(null);
  const [authLoading, setAuthLoading] = React.useState(true);

  const buildUserFromSession = React.useCallback(async (sessionData, { resetVista = true } = {}) => {
    const claims = sessionData?.claims || {};
    const groups = extractGroupsFromClaims(claims);

    // Precedencia explicita desde cognito:groups.
    let rolReal = mapCognitoGroupsToRol(groups);

    // Fallback recomendado: perfil backend (/me) validado por token.
    if (!rolReal && backendAdapter?.getMe && sessionData?.accessToken) {
      try {
        const me = await backendAdapter.getMe(sessionData.accessToken);
        if (me?.rol) rolReal = me.rol;
      } catch {
        // no-op
      }
    }

    // Fallback controlado final (puede ser null para bloquear UI sensible).
    rolReal = rolReal || fallbackRole;

    if (!rolReal) {
      return null;
    }

    return {
      id: sessionData?.id || claims.sub || '',
      nombre: sessionData?.nombre || claims.name || claims['cognito:username'] || 'Usuario',
      email: sessionData?.email || claims.email || '',
      rol: rolReal,
      vistaRol: resetVista ? null : sanitizeVistaRol(rolReal, sessionData?.vistaRol || null),
      // TODO(Cognito): token para Authorization: Bearer <access_token>
      accessToken: sessionData?.accessToken || null,
      // TODO(Cognito): opcional para perfil/claims UI.
      idToken: sessionData?.idToken || null
    };
  }, [backendAdapter, fallbackRole]);

  const hydrateFromSession = React.useCallback((sessionData) => {
    setAuthLoading(true);
    buildUserFromSession(sessionData, { resetVista: true })
      .then((nextUser) => {
        // Limpieza obligatoria en restore de sesion.
        setUser(nextUser);
      })
      .finally(() => setAuthLoading(false));
  }, [buildUserFromSession]);

  const rehydrateSessionFromCognito = React.useCallback(async () => {
    setAuthLoading(true);
    try {
      // TODO(Cognito): source of truth de sesion/tokens desde SDK (Amplify/Auth).
      if (!cognitoAdapter?.getCurrentSession) {
        setUser(null);
        return;
      }
      const sessionData = await cognitoAdapter.getCurrentSession();
      if (!sessionData) {
        setUser(null);
        return;
      }
      const nextUser = await buildUserFromSession(sessionData, { resetVista: true });
      setUser(nextUser);
    } finally {
      setAuthLoading(false);
    }
  }, [cognitoAdapter, buildUserFromSession]);

  const login = React.useCallback(async (payload) => {
    setAuthLoading(true);
    try {
      const nextUser = await buildUserFromSession(payload, { resetVista: true });
      // Limpieza obligatoria en login.
      setUser(nextUser);
    } finally {
      setAuthLoading(false);
    }
  }, [buildUserFromSession]);

  const logout = React.useCallback(async () => {
    if (cognitoAdapter?.signOut) {
      try {
        await cognitoAdapter.signOut();
      } catch {
        // no-op
      }
    }
    // Logout seguro: limpiar identidad completa.
    setUser(null);
  }, [cognitoAdapter]);

  const setVistaRol = React.useCallback((nextVistaRol) => {
    setUser((prev) => {
      if (!prev) return prev;
      if (prev.rol !== 'superadministrador') return prev;
      const safeVistaRol = sanitizeVistaRol(prev.rol, nextVistaRol);
      return {
        ...prev,
        vistaRol: safeVistaRol,
        _vistaChangedAt: new Date().toISOString()
      };
    });
  }, []);

  const restaurarVistaRol = React.useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        vistaRol: null,
        _vistaChangedAt: new Date().toISOString()
      };
    });
  }, []);

  React.useEffect(() => {
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        vistaRol: sanitizeVistaRol(prev.rol, prev.vistaRol)
      };
    });
  }, [user?.rol]);

  const rolReal = user?.rol || null;
  const rolEfectivo = user?.vistaRol || user?.rol || null;
  const esModoVista = !!user?.vistaRol;

  const value = React.useMemo(() => ({
    user,
    setUser,
    login,
    logout,
    hydrateFromSession,
    rehydrateSessionFromCognito,
    setVistaRol,
    restaurarVistaRol,
    rolReal,
    rolEfectivo,
    esModoVista,
    authLoading
  }), [
    user,
    login,
    logout,
    hydrateFromSession,
    rehydrateSessionFromCognito,
    setVistaRol,
    restaurarVistaRol,
    rolReal,
    rolEfectivo,
    esModoVista,
    authLoading
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}

export { mapCognitoGroupsToRol, sanitizeVistaRol };
