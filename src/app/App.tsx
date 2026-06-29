import { Navigate, Route, Routes } from 'react-router-dom';
import { ChangePasswordPage } from '../features/auth/components/ChangePasswordPage';
import { LoginPage } from '../features/auth/components/LoginPage';
import { DashboardPage } from '../features/dashboard/components/DashboardPage';
import { MainLayout } from '../layouts/MainLayout';
import { ProtectedRoute } from './ProtectedRoute';

export function App() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />
      <Route
        element={(
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        )}
        path="/cambiar-clave"
      />
      <Route
        element={(
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        )}
      >
        <Route element={<DashboardPage />} index />
      </Route>
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}
