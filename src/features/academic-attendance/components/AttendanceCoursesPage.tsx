import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAttendanceCourses } from '../api/academicAttendanceApi';
import { clampAttendanceDate, todayIso } from '../academicAttendanceForms';

export function AttendanceCoursesPage() {
  const courses = useQuery({
    queryKey: ['attendance', 'courses'],
    queryFn: getAttendanceCourses,
  });
  return (
    <main className="page-shell attendance-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Docencia</p>
          <h1>Asistencia</h1>
          <p>Registra asistencia diaria y revisa alumnos en riesgo.</p>
        </div>
      </header>
      {courses.isPending ? <div className="table-state">Cargando cursos…</div> : null}
      {courses.isError ? <div className="table-state is-error">No pudimos cargar los cursos.</div> : null}
      {courses.data?.data.length === 0 ? (
        <div className="table-state"><CalendarCheck size={30} /><strong>No hay cursos disponibles</strong></div>
      ) : null}
      <section className="attendance-course-list">
        {courses.data?.data.map((course) => (
          <Link
            key={course.id}
            to={`/asistencia/cursos/${course.id}?fecha=${clampAttendanceDate(todayIso(), course.fechaInicio, course.fechaFin)}`}
          >
            <div><span>{course.cursoCodigo}</span><strong>{course.cursoNombre}</strong></div>
            <div><span>{course.carreraNombre}</span><small>{course.periodoNombre} · Ciclo {course.ciclo}</small></div>
            <ChevronRight size={18} />
          </Link>
        ))}
      </section>
    </main>
  );
}
