import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { ForbiddenPage } from './ForbiddenPage';
import { ProtectedRoute } from './ProtectedRoute';
import { RequireRole } from './RequireRole';
import { useAuth } from '../features/auth/AuthProvider';

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
const AcademicStructurePage = lazy(() => import('../features/academic-structure/components/AcademicStructurePage')
  .then((module) => ({ default: module.AcademicStructurePage })));
const AcademicOperationPage = lazy(() => import('../features/academic-operation/components/AcademicOperationPage')
  .then((module) => ({ default: module.AcademicOperationPage })));
const EvaluationCoursesPage = lazy(() => import('../features/academic-evaluation/components/EvaluationCoursesPage')
  .then((module) => ({ default: module.EvaluationCoursesPage })));
const GradebookPage = lazy(() => import('../features/academic-evaluation/components/GradebookPage')
  .then((module) => ({ default: module.GradebookPage })));
const AttendanceCoursesPage = lazy(() => import('../features/academic-attendance/components/AttendanceCoursesPage')
  .then((module) => ({ default: module.AttendanceCoursesPage })));
const AttendanceBookPage = lazy(() => import('../features/academic-attendance/components/AttendanceBookPage')
  .then((module) => ({ default: module.AttendanceBookPage })));
const ReactivationRequestsPage = lazy(() => import('../features/academic-attendance/components/ReactivationRequestsPage')
  .then((module) => ({ default: module.ReactivationRequestsPage })));
const WorkshopsPage = lazy(() => import('../features/workshops/components/WorkshopsPage')
  .then((module) => ({ default: module.WorkshopsPage })));
const DocumentsPage = lazy(() => import('../features/documents/components/DocumentsPage').then((module) => ({ default: module.DocumentsPage })));
const CourseWallPage = lazy(() => import('../features/course-wall/components/CourseWallPage').then((module) => ({ default: module.CourseWallPage })));
const StudentPortalPage = lazy(() => import('../features/student-portal/components/StudentPortalPage').then((module) => ({ default: module.StudentPortalPage })));
const StudentCoursePage = lazy(() => import('../features/student-portal/components/StudentCoursePage').then((module) => ({ default: module.StudentCoursePage })));
const StudentHistoryPage = lazy(() => import('../features/student-portal/components/StudentHistoryPage').then((module) => ({ default: module.StudentHistoryPage })));
const PromotionPage = lazy(() => import('../features/promotion/components/PromotionPage').then((module) => ({ default: module.PromotionPage })));

function HomePage() {
  const { profile } = useAuth();
  const roles = profile?.roles.map((role) => role.codigo) ?? [];
  return roles.length === 1 && roles[0] === 'ALUMNO' ? <Navigate replace to="/portal" /> : <DashboardPage />;
}

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
          <Route element={<HomePage />} index />
          <Route element={<RequireRole allowed={['ALUMNO']}><StudentPortalPage /></RequireRole>} path="portal" />
          <Route element={<RequireRole allowed={['ALUMNO']}><StudentCoursePage /></RequireRole>} path="portal/cursos/:courseId" />
          <Route element={<RequireRole allowed={['ALUMNO']}><StudentHistoryPage /></RequireRole>} path="portal/historial" />
          <Route element={<RequireRole allowed={['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO']}><DocumentsPage /></RequireRole>} path="documentos" />
          <Route element={<RequireRole allowed={['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO', 'PROFESOR', 'ALUMNO']}><CourseWallPage /></RequireRole>} path="muro/:courseId" />
          <Route element={<RequireRole allowed={['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO']}><PromotionPage /></RequireRole>} path="promociones" />
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
          <Route
            element={(
              <RequireRole allowed={['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO']}>
                <AcademicStructurePage />
              </RequireRole>
            )}
            path="estructura/:entity"
          />
          <Route
            element={(
              <RequireRole allowed={['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO']}>
                <AcademicStructurePage />
              </RequireRole>
            )}
            path="estructura/:entity/nueva"
          />
          <Route
            element={(
              <RequireRole allowed={['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO']}>
                <AcademicStructurePage />
              </RequireRole>
            )}
            path="estructura/:entity/:id"
          />
          <Route
            element={(
              <RequireRole allowed={['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO']}>
                <AcademicOperationPage />
              </RequireRole>
            )}
            path="operacion/:entity"
          />
          <Route
            element={(
              <RequireRole allowed={['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO', 'PROFESOR']}>
                <EvaluationCoursesPage />
              </RequireRole>
            )}
            path="evaluacion"
          />
          <Route
            element={(
              <RequireRole allowed={['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO', 'PROFESOR']}>
                <GradebookPage />
              </RequireRole>
            )}
            path="evaluacion/cursos/:courseId"
          />
          <Route
            element={(
              <RequireRole allowed={['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO', 'PROFESOR']}>
                <AttendanceCoursesPage />
              </RequireRole>
            )}
            path="asistencia"
          />
          <Route
            element={(
              <RequireRole allowed={['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO', 'PROFESOR']}>
                <AttendanceBookPage />
              </RequireRole>
            )}
            path="asistencia/cursos/:courseId"
          />
          <Route
            element={(
              <RequireRole allowed={['DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO']}>
                <ReactivationRequestsPage />
              </RequireRole>
            )}
            path="asistencia/reactivaciones"
          />
          <Route
            element={(
              <RequireRole allowed={['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO']}>
                <WorkshopsPage />
              </RequireRole>
            )}
            path="talleres"
          />
          <Route element={<ForbiddenPage />} path="sin-permiso" />
        </Route>
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </Suspense>
  );
}
