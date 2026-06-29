import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status, profile } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <div className="app-boot">Abriendo el escenario…</div>;
  }
  if (status === 'anonymous') {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }
  if (profile?.mustChangePassword && location.pathname !== '/cambiar-clave') {
    return <Navigate replace to="/cambiar-clave" />;
  }
  return children;
}
