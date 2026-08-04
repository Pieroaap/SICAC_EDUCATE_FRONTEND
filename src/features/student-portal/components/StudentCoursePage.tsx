import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarCheck, CalendarClock, Download, FileText, Megaphone, MapPin } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../../api/client';
import { downloadDocument } from '../../documents/api/documentsApi';
import { getPortalCourse } from '../api/studentPortalApi';
import { PortalEmptyState, PortalErrorState, PortalLoadingState } from './PortalStates';

const fullDate = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' });

export function StudentCoursePage() {
  const { courseId = '' } = useParams();
  const detail = useQuery({
    queryKey: ['portal', 'course', courseId],
    queryFn: () => getPortalCourse(courseId),
    enabled: Boolean(courseId),
  });

  if (detail.isPending) return <main className="page-shell student-detail-page"><PortalLoadingState rows={4} /></main>;
  if (detail.isError) return <main className="page-shell student-detail-page"><Link className="student-back-link" to="/portal"><ArrowLeft size={18} /> Volver a mi portal</Link><PortalErrorState onRetry={() => void detail.refetch()} /><p className="student-detail-error">{getApiErrorMessage(detail.error, 'No pudimos abrir este curso.')}</p></main>;

  const { course, assessments, attendance, documents, finalResult } = detail.data;
  const present = attendance.filter((item) => item.estado === 'presente').length;
  const attendanceRate = attendance.length ? Math.round((present / attendance.length) * 100) : null;

  return (
    <main className="page-shell student-detail-page">
      <Link className="student-back-link" to="/portal"><ArrowLeft size={18} /> Volver a mi portal</Link>
      <header className="student-course-hero">
        <div><p className="eyebrow">{course.cursoCodigo} · Ciclo {course.ciclo}</p><h1>{course.cursoNombre}</h1><p>{course.carreraNombre} · {course.periodoNombre}</p></div>
        <Link className="student-wall-action" to={`/muro/${course.cursoProgramadoId}`}><Megaphone size={18} /> Abrir muro</Link>
      </header>

      <section className="student-course-overview" aria-label="Resumen del curso">
        <div><CalendarClock size={18} /><span>Horario</span><strong>{course.horarios[0] ? `${course.horarios[0].dia} ${course.horarios[0].horaInicio.slice(0, 5)}–${course.horarios[0].horaFin.slice(0, 5)}` : 'Por confirmar'}</strong></div>
        <div><MapPin size={18} /><span>Modalidad y lugar</span><strong>{course.horarios[0] ? `${course.horarios[0].modalidad} · ${course.horarios[0].ubicacion || 'Por confirmar'}` : 'Por confirmar'}</strong></div>
        <div><CalendarCheck size={18} /><span>Asistencia registrada</span><strong>{attendanceRate === null ? 'Sin registros' : `${attendanceRate}%`}</strong></div>
      </section>

      <div className="student-course-columns">
        <section className="student-course-panel" aria-labelledby="assessment-title">
          <header><div><p className="eyebrow">Evaluación</p><h2 id="assessment-title">Notas y actividades</h2></div>{finalResult ? <strong className={`grade-letter is-${finalResult.letra}`}>{finalResult.notaFinal} · {finalResult.letra}</strong> : null}</header>
          {assessments.length ? <div className="student-assessment-list">{assessments.map((item) => <article key={item.id}><div><small>{item.tipo ?? 'Actividad'} · {Number(item.porcentaje)}%</small><strong>{item.nombre}</strong></div><span>{item.fechaProgramada ? fullDate.format(new Date(item.fechaProgramada)) : 'Sin fecha'}</span></article>)}</div> : <PortalEmptyState icon={CalendarClock} title="Sin evaluaciones programadas" message="El docente todavía no ha publicado actividades para este curso." />}
          {finalResult ? <p className="student-final-result">Resultado final publicado: <strong>{finalResult.resultado}</strong></p> : null}
        </section>

        <section className="student-course-panel" aria-labelledby="attendance-title">
          <header><div><p className="eyebrow">Seguimiento</p><h2 id="attendance-title">Mi asistencia</h2></div>{attendanceRate !== null ? <strong>{attendanceRate}%</strong> : null}</header>
          {attendance.length ? <div className="student-attendance-list">{attendance.map((item) => <article key={item.id}><time dateTime={item.fecha}>{fullDate.format(new Date(`${item.fecha}T12:00:00`))}</time><span className={`is-${item.estado}`}>{item.estado}</span></article>)}</div> : <PortalEmptyState icon={CalendarCheck} title="Sin asistencia registrada" message="Los registros de este curso aparecerán aquí." />}
        </section>
      </div>

      <section className="student-course-panel" aria-labelledby="documents-title">
        <header><div><p className="eyebrow">Materiales</p><h2 id="documents-title">Documentos del curso</h2></div></header>
        {documents.length ? <div className="student-document-list">{documents.map((document) => <article key={document.id}><span aria-hidden="true"><FileText size={20} /></span><div><small>{document.tipo.replaceAll('_', ' ')}</small><strong>{document.nombreOriginal}</strong></div><button aria-label={`Descargar ${document.nombreOriginal}`} onClick={() => void downloadDocument(document.id)} type="button"><Download size={18} /> Descargar</button></article>)}</div> : <PortalEmptyState icon={FileText} title="No hay documentos disponibles" message="Los materiales institucionales y del curso aparecerán en esta sección." />}
      </section>
    </main>
  );
}
