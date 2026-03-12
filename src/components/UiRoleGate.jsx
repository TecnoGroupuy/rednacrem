import React from 'react';
import { useRolEfectivo } from '../hooks/useRolEfectivo.js';

export default function UiRoleGate({ allowRoles = [], fallback = null, children }) {
  const { rolEfectivo } = useRolEfectivo();
  const allowed = !allowRoles.length || allowRoles.includes(rolEfectivo);
  if (!allowed) return fallback;
  return <>{children}</>;
}
