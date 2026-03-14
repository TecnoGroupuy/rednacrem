import React from 'react';
import { getBusinessSession } from '../services/sessionService.js';
import { setApiAccessTokenGetter, ApiError } from '../services/apiClient.js';

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

const VALID_STATUSES = ['pending', 'approved', 'rejected', 'blocked', 'inactive'];
const ALLOW_CLAIMS_ROLE_FALLBACK = Boolean(
  import.meta.env.DEV || String(import.meta.env?.VITE_AUTH_ALLOW_CLAIMS_ROLE_FALLBACK || '').toLowerCase() === 'true'
);

const DEFAULT_AUTH_SESSION = {
  isAuthenticated: false,
  loading: true,
  user: null,
  role: null,
  status: null,
  permissions: [],
  accessToken: null,
  idToken: null,
  claims: null,
  error: ''
};

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

const buildFallbackRoleFromClaims = (claims = {}) => {
  const groups = extractGroupsFromClaims(claims);
  return mapCognitoGroupsToRol(groups);
};

const normalizeStatus = (status) => {
  const safe = String(status || '').toLowerCase();
  if (VALID_STATUSES.includes(safe)) return safe;
  return null;
};

const buildDevSessionFallback = ({ sessionData, claims, fallbackRole }) => {
  const roleFallback = buildFallbackRoleFromClaims(claims || {}) || fallbackRole || null;
  if (!roleFallback) return null;
  const nextUser = {
    id: sessionData?.id || claims?.sub || 'dev-user',
    nombre: sessionData?.nombre || claims?.name || claims?.email || 'Dev User',
    email: sessionData?.email || claims?.email || 'dev@test.com',
    rol: roleFallback,
    status: 'approved',
    permissions: []
  };
  return {
    isAuthenticated: true,
    loading: false,
    user: nextUser,
    role: roleFallback,
    status: 'approved',
    permissions: [],
    accessToken: sessionData?.accessToken || null,
    idToken: sessionData?.idToken || null,
    claims: claims || {},
    error: ''
  };
};

export function AuthProvider({ children, fallbackRole = null }) {
  const [authSession, setAuthSession] = React.useState(DEFAULT_AUTH_SESSION);
  const [vistaRol, setVistaRolState] = React.useState(null);

  const clearSession = React.useCallback(() => {
    setApiAccessTokenGetter(async () => null);
    setVistaRolState(null);
    setAuthSession({ ...DEFAULT_AUTH_SESSION, loading: false });
  }, []);

  const hydrateFromSession = React.useCallback(async (sessionData) => {
    const accessToken = sessionData?.accessToken || null;
    const idToken = sessionData?.idToken || null;
    const claims = sessionData?.claims || null;

    if (!accessToken) {
      clearSession();
      return null;
    }

    setAuthSession((prev) => ({ ...prev, loading: true, error: '' }));
    setApiAccessTokenGetter(async () => accessToken);

    try {
      const me = await getBusinessSession();
      const status = normalizeStatus(me.status);
      const roleFromBackend = me.role || null;
      const roleFallback = buildFallbackRoleFromClaims(claims || {});
      const role = roleFromBackend || (ALLOW_CLAIMS_ROLE_FALLBACK ? (roleFallback || fallbackRole) : null) || null;

      if (!role) {
        setAuthSession((prev) => ({
          ...prev,
          isAuthenticated: false,
          loading: false,
          role: null,
          status: null,
          permissions: [],
          user: null,
          error: 'Sesion invalida: /me no devolvio un rol valido.'
        }));
        setVistaRolState(null);
        return null;
      }

      if (!status) {
        setAuthSession((prev) => ({
          ...prev,
          isAuthenticated: false,
          loading: false,
          role: null,
          status: null,
          permissions: [],
          user: null,
          error: 'Sesion invalida: /me no devolvio un estado valido.'
        }));
        setVistaRolState(null);
        return null;
      }

      const nextUser = {
        id: me.id || sessionData?.id || '',
        nombre: me.nombre || sessionData?.nombre || claims?.name || claims?.email || 'Usuario',
        email: me.email || sessionData?.email || claims?.email || '',
        rol: role,
        status,
        permissions: me.permissions || []
      };

      const nextSession = {
        isAuthenticated: true,
        loading: false,
        user: nextUser,
        role,
        status,
        permissions: me.permissions || [],
        accessToken,
        idToken,
        claims: me.claims || claims || {},
        error: ''
      };

      setAuthSession(nextSession);
      return nextSession;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        return null;
      }
      // Fallback acotado para Login Dev local sin backend /me.
      if (import.meta.env.DEV && accessToken === 'dev-token') {
        const fallbackSession = buildDevSessionFallback({ sessionData, claims, fallbackRole });
        if (fallbackSession) {
          setAuthSession(fallbackSession);
          return fallbackSession;
        }
      }
      setAuthSession((prev) => ({
        ...prev,
        isAuthenticated: false,
        loading: false,
        role: null,
        status: null,
        permissions: [],
        user: null,
        error: err?.message || 'No se pudo recuperar la sesión.'
      }));
      setVistaRolState(null);
      return null;
    }
  }, [clearSession, fallbackRole]);

  const refreshSession = React.useCallback(async () => {
    if (!authSession.accessToken) return null;
    return hydrateFromSession({
      accessToken: authSession.accessToken,
      idToken: authSession.idToken,
      claims: authSession.claims,
      id: authSession.user?.id,
      nombre: authSession.user?.nombre,
      email: authSession.user?.email
    });
  }, [authSession, hydrateFromSession]);

  const rehydrateSessionFromCognito = React.useCallback(async () => {
    // Source of truth de login en esta app: react-oidc-context.
    // AuthGate llamará hydrateFromSession cuando oidcAuth esté autenticado.
    setAuthSession((prev) => ({ ...prev, loading: false }));
  }, []);

  const login = React.useCallback(async (payload) => {
    // Login técnico/dev o puente desde OIDC.
    setVistaRolState(null);
    return hydrateFromSession(payload);
  }, [hydrateFromSession]);

  const logout = React.useCallback(async () => {
    clearSession();
  }, [clearSession]);

  const setVistaRol = React.useCallback((nextVistaRol) => {
    const rolReal = authSession.role;
    if (rolReal !== 'superadministrador') return;
    setVistaRolState(sanitizeVistaRol(rolReal, nextVistaRol));
  }, [authSession.role]);

  const restaurarVistaRol = React.useCallback(() => {
    setVistaRolState(null);
  }, []);

  const rolReal = authSession.role;
  const rolEfectivo = vistaRol || authSession.role;
  const esModoVista = !!vistaRol;

  const user = authSession.user
    ? {
      ...authSession.user,
      rol: authSession.role,
      vistaRol,
      status: authSession.status,
      permissions: authSession.permissions,
      accessToken: authSession.accessToken,
      idToken: authSession.idToken,
      claims: authSession.claims
    }
    : null;

  const value = React.useMemo(() => ({
    authSession,
    user,
    setUser: () => {
      // Deprecated: mantener compatibilidad temporal.
      // TODO: eliminar cuando toda la app use authSession.
    },
    login,
    logout,
    hydrateFromSession,
    rehydrateSessionFromCognito,
    refreshSession,
    clearSession,
    setVistaRol,
    restaurarVistaRol,
    rolReal,
    rolEfectivo,
    esModoVista,
    authLoading: authSession.loading,
    authError: authSession.error,
    isAuthenticated: authSession.isAuthenticated,
    status: authSession.status,
    permissions: authSession.permissions
  }), [
    authSession,
    user,
    login,
    logout,
    hydrateFromSession,
    rehydrateSessionFromCognito,
    refreshSession,
    clearSession,
    setVistaRol,
    restaurarVistaRol,
    rolReal,
    rolEfectivo,
    esModoVista
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}

export { mapCognitoGroupsToRol, sanitizeVistaRol };
