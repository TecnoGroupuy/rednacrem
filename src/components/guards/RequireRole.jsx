import React from 'react';
import { useAuth } from '../../auth/AuthProvider.jsx';

export default function RequireRole({ roles = [], children, fallback = null }) {
  const { rolReal } = useAuth();
  const allowed = !roles.length || roles.includes(rolReal);
  if (!allowed) return fallback;
  return <>{children}</>;
}
