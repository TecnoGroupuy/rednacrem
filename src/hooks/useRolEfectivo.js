import { useAuth } from '../auth/AuthProvider.jsx';

export function useRolEfectivo() {
  const { user, rolReal, rolEfectivo, esModoVista, status, permissions } = useAuth();

  const esSuperadmin = rolReal === 'superadministrador';
  const esVistaSimulada = esModoVista;

  return {
    user,
    rolReal,
    rolEfectivo,
    status,
    permissions,
    esVistaSimulada,
    esSuperadmin,
    tieneRolReal: (roles = []) => roles.includes(rolReal),
    tieneRolUi: (roles = []) => roles.includes(rolEfectivo)
  };
}
