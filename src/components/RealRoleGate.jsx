import React from 'react';
import { useRolEfectivo } from '../hooks/useRolEfectivo.js';

export default function RealRoleGate({ allowRoles = [], fallback = null, children }) {
  const { rolReal } = useRolEfectivo();
  const allowed = !allowRoles.length || allowRoles.includes(rolReal);
  if (!allowed) return fallback;
  return <>{children}</>;
}
