import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getPortalAttendance, getPortalCourses, getPortalDocuments, getPortalHistory, getPortalStart, getPortalWorkshops } from '../api/studentPortalApi';
import { downloadDocument } from '../../documents/api/documentsApi';

export function StudentPortalPage() {
  const start = useQuery({ queryKey: ['portal', 'start'], queryFn: getPortalStart });
  const courses = useQuery({ queryKey: ['portal', 'courses'], queryFn: getPortalCourses });
  const history = useQuery({ queryKey: ['portal', 'history'], queryFn: getPortalHistory });
  const workshops = useQuery({ queryKey: ['portal', 'workshops'], queryFn: getPortalWorkshops });
  const documents = useQuery({ queryKey: ['portal', 'documents'], queryFn: getPortalDocuments });
  const attendance = useQuery({ queryKey: ['portal', 'attendance'], queryFn: getPortalAttendance });
  return <main className="page-shell portal-page"><header className="page-heading"><div><p className="eyebrow">Mi espacio</p><h1>Portal del alumno</h1><p>Tu información académica publicada, sin exponer datos de otros alumnos.</p></div><strong className="portal-count">{start.data?.cursosActivos ?? 0} cursos activos</strong></header>
    <section><h2>Mis cursos</h2><div className="portal-grid">{courses.data?.map((course) => <article className="portal-card" key={course.cursoProgramadoId}><span className="eyebrow">{course.cursoCodigo} · {course.periodoNombre}</span><h3>{course.cursoNombre}</h3><p>{course.horarios.map((item) => `${item.dia} ${item.horaInicio.slice(0, 5)}`).join(', ') || 'Horario pendiente'}</p><Link to={`/muro/${course.cursoProgramadoId}`}>Ver muro</Link></article>)}</div></section>
    <section><h2>Historial publicado</h2><div className="portal-grid">{history.data?.map((item) => <article className="portal-card" key={item.id}><span className="eyebrow">{item.periodoNombre}</span><h3>{item.cursoNombre}</h3><strong className={`grade-letter is-${item.letra}`}>{item.notaFinal} · {item.letra}</strong><p>{item.resultado}</p></article>)}</div></section>
    <section><h2>Mis talleres</h2><div className="portal-grid">{workshops.data?.map((item) => <article className="portal-card" key={item.id}><span className="eyebrow">{item.estado}</span><h3>{item.nombre}</h3><p>{item.fechaInicio} · {item.modalidad} · {item.ubicacion}</p></article>)}</div></section>
    <section><h2>Documentos</h2><div className="portal-grid">{documents.data?.map((item) => <article className="portal-card" key={item.id}><span className="eyebrow">{item.tipo}</span><h3>{item.nombreOriginal}</h3><button className="text-link" onClick={() => void downloadDocument(item.id)} type="button">Descargar de forma segura</button></article>)}</div></section>
    <section><h2>Asistencia reciente</h2><div className="portal-grid">{attendance.data?.slice(0, 12).map((item) => <article className="portal-card" key={item.id}><span className="eyebrow">{item.fecha}</span><h3>{item.estado}</h3></article>)}</div></section>
  </main>;
}
