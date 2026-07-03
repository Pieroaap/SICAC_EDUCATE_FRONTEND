import { useQuery } from '@tanstack/react-query';
import { BookOpenCheck, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getEvaluationCourses } from '../api/academicEvaluationApi';

export function EvaluationCoursesPage() {
  const courses = useQuery({
    queryKey: ['evaluation', 'courses'],
    queryFn: () => getEvaluationCourses(),
  });

  return (
    <main className="page-shell evaluation-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Docencia</p>
          <h1>Evaluación académica</h1>
          <p>Configura evaluaciones, registra notas y publica el acta de cada curso.</p>
        </div>
      </header>

      {courses.isPending ? <div className="table-state">Cargando cursos…</div> : null}
      {courses.isError ? (
        <div className="table-state is-error">No pudimos cargar los cursos disponibles.</div>
      ) : null}
      {courses.data?.data.length === 0 ? (
        <div className="table-state">
          <BookOpenCheck size={30} />
          <strong>No hay cursos por evaluar</strong>
          <span>Los cursos asignados aparecerán aquí.</span>
        </div>
      ) : null}

      <section className="evaluation-course-list" aria-label="Cursos disponibles">
        {courses.data?.data.map((course) => (
          <Link key={course.id} to={`/evaluacion/cursos/${course.id}`}>
            <div className="evaluation-course-list__code">
              <span>{course.cursoCodigo}</span>
              <strong>{course.cursoNombre}</strong>
            </div>
            <div>
              <span>{course.carreraNombre}</span>
              <small>{course.periodoNombre} · Ciclo {course.ciclo}</small>
            </div>
            <span className={`evaluation-state is-${course.actaEstado}`}>
              {course.actaEstado === 'publicada' ? 'Acta publicada' : 'En edición'}
            </span>
            <ChevronRight aria-hidden="true" size={18} />
          </Link>
        ))}
      </section>
    </main>
  );
}
