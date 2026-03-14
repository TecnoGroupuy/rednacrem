import React from 'react';
import { useAuth } from '../../auth/AuthProvider.jsx';
import EstadoNoAutenticado from '../auth/EstadoNoAutenticado.jsx';

export default function RequireAuth({ children, fallback = null }) {
  const { isAuthenticated, authLoading } = useAuth();
  if (authLoading) return fallback;
  if (!isAuthenticated) return <EstadoNoAutenticado />;
  return <>{children}</>;
}
