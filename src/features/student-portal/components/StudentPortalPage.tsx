import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, CalendarClock, MapPin, NotebookTabs, Presentation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { getPortalCourses, getPortalStart, getPortalWorkshops, type PortalAssessment } from '../api/studentPortalApi';
import { PortalEmptyState, PortalErrorState, PortalLoadingState } from './PortalStates';

const dateTime = new Intl.DateTimeFormat('es-PE', { dateStyle: 'long', timeStyle: 'short' });

function nextAssessment(items: PortalAssessment[] | undefined) {
  const now = Date.now();
  return [...(items ?? [])]
    .filter((item) => item.fechaProgramada && new Date(item.fechaProgramada).getTime() >= now)
    .sort((a, b) => new Date(a.fechaProgramada!).getTime() - new Date(b.fechaProgramada!).getTime())[0];
}

function firstSchedule(horarios: Array<{ dia: string; horaInicio: string; horaFin: string }>) {
  const schedule = horarios[0];
  return schedule ? `${schedule.dia} · ${schedule.horaInicio.slice(0, 5)}–${schedule.horaFin.slice(0, 5)}` : 'Horario por confirmar';
}

export function StudentPortalPage() {
  const { profile } = useAuth();
  const start = useQuery({ queryKey: ['portal', 'start'], queryFn: getPortalStart });
  const courses = useQuery({ queryKey: ['portal', 'courses'], queryFn: getPortalCourses });
  const workshops = useQuery({ queryKey: ['portal', 'workshops'], queryFn: getPortalWorkshops });
  const upcoming = nextAssessment(start.data?.proximasEvaluaciones);

  return (
    <main className="page-shell student-home">
      <header className="student-home__heading">
        <div><p className="eyebrow">Mi espacio académico</p><h1>Hola, {profile?.nombres.split(' ')[0] ?? 'alumno'}</h1><p>Revisa lo próximo y entra directamente al curso que necesitas.</p></div>
        <Link className="student-history-link" to="/portal/historial"><NotebookTabs size={18} /> Mi historial</Link>
      </header>

      <section aria-labelledby="next-title" className="student-call-sheet">
        <div className="student-call-sheet__label"><CalendarClock size={18} /><span>Próximo en tu agenda</span></div>
        {start.isPending ? <PortalLoadingState rows={1} /> : start.isError ? <PortalErrorState onRetry={() => void start.refetch()} /> : upcoming ? (
          <div className="student-call-sheet__content">
            <div><p>{upcoming.tipo ?? 'Evaluación'}</p><h2 id="next-title">{upcoming.nombre}</h2><strong>{dateTime.format(new Date(upcoming.fechaProgramada!))}</strong></div>
            <span>{Number(upcoming.porcentaje)}% de la evaluación</span>
          </div>
        ) : <PortalEmptyState icon={CalendarClock} title="Tu agenda está despejada" message="Aún no tienes evaluaciones programadas." />}
      </section>

      <section aria-labelledby="courses-title" className="student-section">
        <header><div><p className="eyebrow">Periodo activo</p><h2 id="courses-title">Mis cursos</h2></div><span>{courses.data?.filter((course) => course.periodoEstado === 'activo' && course.estado === 'activo').length ?? 0} activos</span></header>
        {courses.isPending ? <PortalLoadingState rows={2} /> : courses.isError ? <PortalErrorState onRetry={() => void courses.refetch()} /> : courses.data?.length ? (
          <div className="student-course-list">
            {courses.data.map((course) => (
              <Link key={course.cursoProgramadoId} to={`/portal/cursos/${course.cursoProgramadoId}`}>
                <span className="student-course-list__mark" aria-hidden="true"><BookOpen size={20} /></span>
                <div><small>{course.cursoCodigo} · Ciclo {course.ciclo}</small><strong>{course.cursoNombre}</strong><span>{course.periodoNombre}</span></div>
                <div className="student-course-list__schedule"><CalendarClock size={16} /><span>{firstSchedule(course.horarios)}</span></div>
                <ArrowRight aria-hidden="true" size={20} />
              </Link>
            ))}
          </div>
        ) : <PortalEmptyState icon={BookOpen} title="No tienes cursos activos" message="Cuando se confirme tu matrícula, tus cursos aparecerán aquí." />}
      </section>

      <section aria-labelledby="workshops-title" className="student-section">
        <header><div><p className="eyebrow">Formación complementaria</p><h2 id="workshops-title">Mis talleres</h2></div></header>
        {workshops.isPending ? <PortalLoadingState rows={1} /> : workshops.isError ? <PortalErrorState onRetry={() => void workshops.refetch()} /> : workshops.data?.length ? (
          <div className="student-workshop-list">
            {workshops.data.map((workshop) => (
              <article key={workshop.id}>
                <span aria-hidden="true"><Presentation size={20} /></span>
                <div><small>{workshop.estado}</small><h3>{workshop.nombre}</h3><p><MapPin size={15} /> {workshop.modalidad} · {workshop.ubicacion || 'Ubicación por confirmar'}</p></div>
                <time dateTime={workshop.fechaInicio}>{new Date(`${workshop.fechaInicio}T12:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</time>
              </article>
            ))}
          </div>
        ) : <PortalEmptyState icon={Presentation} title="Aún no estás inscrito en talleres" message="Tus talleres confirmados aparecerán en esta sección." />}
      </section>
    </main>
  );
}
