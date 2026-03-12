import { useAuth } from '../auth/AuthProvider.jsx';

export function useRolEfectivo() {
  const { user, rolReal, rolEfectivo, esModoVista } = useAuth();

  const esSuperadmin = rolReal === 'superadministrador';
  const esVistaSimulada = esModoVista;

  return {
    user,
    rolReal,
    rolEfectivo,
    esVistaSimulada,
    esSuperadmin,
    tieneRolReal: (roles = []) => roles.includes(rolReal),
    tieneRolUi: (roles = []) => roles.includes(rolEfectivo)
  };
}
