import React from 'react';
import { useRolEfectivo } from '../hooks/useRolEfectivo.js';

export default function ProtectedRoute({
  allowRoles = [],
  checkBy = 'effective',
  fallback = null,
  children
}) {
  const { rolReal, rolEfectivo } = useRolEfectivo();

  // checkBy='effective': solo visualización UI
  // checkBy='real': guard para acciones/rutas sensibles (además de backend)
  const roleForCheck = checkBy === 'real' ? rolReal : rolEfectivo;
  const allowed = !allowRoles.length || allowRoles.includes(roleForCheck);

  if (!allowed) return fallback;
  return <>{children}</>;
}
