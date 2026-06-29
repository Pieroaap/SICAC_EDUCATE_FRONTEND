import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { RoleCode } from '../api/types';
import { useAuth } from '../features/auth/AuthProvider';

export function RequireRole({
  allowed,
  children,
}: {
  allowed: RoleCode[];
  children: ReactNode;
}) {
  const { profile } = useAuth();
  const authorized = profile?.roles.some((role) => allowed.includes(role.codigo)) ?? false;
  return authorized ? children : <Navigate replace to="/sin-permiso" />;
}
