import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { ForbiddenPage } from './ForbiddenPage';
import { ProtectedRoute } from './ProtectedRoute';
import { RequireRole } from './RequireRole';

const LoginPage = lazy(() => import('../features/auth/components/LoginPage')
  .then((module) => ({ default: module.LoginPage })));
const ChangePasswordPage = lazy(() => import('../features/auth/components/ChangePasswordPage')
  .then((module) => ({ default: module.ChangePasswordPage })));
const DashboardPage = lazy(() => import('../features/dashboard/components/DashboardPage')
  .then((module) => ({ default: module.DashboardPage })));
const PeopleListPage = lazy(() => import('../features/people/components/PeopleListPage')
  .then((module) => ({ default: module.PeopleListPage })));
const PersonCreatePage = lazy(() => import('../features/people/components/PersonCreatePage')
  .then((module) => ({ default: module.PersonCreatePage })));
const PersonDetailPage = lazy(() => import('../features/people/components/PersonDetailPage')
  .then((module) => ({ default: module.PersonDetailPage })));
const StudentsListPage = lazy(() => import('../features/profiles/components/StudentsListPage')
  .then((module) => ({ default: module.StudentsListPage })));
const TeachersListPage = lazy(() => import('../features/profiles/components/TeachersListPage')
  .then((module) => ({ default: module.TeachersListPage })));

export function App() {
  return (
    <Suspense fallback={<div className="app-boot">Preparando el escenario…</div>}>
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
          <Route
            element={(
              <RequireRole allowed={['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO']}>
                <PeopleListPage />
              </RequireRole>
            )}
            path="personas"
          />
          <Route
            element={(
              <RequireRole allowed={['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO']}>
                <PersonCreatePage />
              </RequireRole>
            )}
            path="personas/nueva"
          />
          <Route
            element={(
              <RequireRole allowed={['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO']}>
                <PersonDetailPage />
              </RequireRole>
            )}
            path="personas/:personId"
          />
          <Route
            element={(
              <RequireRole allowed={['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO']}>
                <StudentsListPage />
              </RequireRole>
            )}
            path="alumnos"
          />
          <Route
            element={(
              <RequireRole allowed={['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO']}>
                <TeachersListPage />
              </RequireRole>
            )}
            path="profesores"
          />
          <Route element={<ForbiddenPage />} path="sin-permiso" />
        </Route>
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </Suspense>
  );
}
