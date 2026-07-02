import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ClipboardList, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { NavLink, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../../api/client';
import type { CareerEnrollment, PrerequisiteAuthorization } from '../../../api/types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { FormField } from '../../../components/FormField';
import { StatusBadge } from '../../../components/StatusBadge';
import { useAuth } from '../../auth/AuthProvider';
import {
  getAcademicPeriods,
  getCareers,
  getCurriculumPlans,
  getPlanCourses,
} from '../../academic-structure/api/academicStructureApi';
import { getStudents, getTeachers } from '../../profiles/api/profilesApi';
import {
  authorizationSchema,
  enrollmentSchema,
  scheduledCourseSchema,
  type EnrollmentValues,
  type ScheduledCourseValues,
} from '../academicOperationForms';
import {
  createEnrollment,
  createScheduledCourse,
  enrollCourse,
  getAuthorizations,
  getEnrollmentCourses,
  getEnrollments,
  getScheduledCourses,
  requestAuthorization,
  resolveAuthorization,
} from '../api/academicOperationApi';

const today = new Date().toISOString().slice(0, 10);
const tabs = [
  { entity: 'cursos-programados', label: 'Cursos programados' },
  { entity: 'matriculas', label: 'Matrículas e historial' },
  { entity: 'excepciones', label: 'Excepciones' },
];

export function AcademicOperationPage() {
  const { entity = 'cursos-programados' } = useParams();
  return (
    <main className="page-shell operation-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Operación académica</p>
          <h1>Trayectoria por periodo</h1>
          <p>Programa la oferta, registra matrículas y conserva el historial del alumno.</p>
        </div>
      </header>
      <nav aria-label="Secciones de operación académica" className="academic-tabs">
        {tabs.map((tab) => (
          <NavLink
            className={entity === tab.entity ? 'is-active' : ''}
            key={tab.entity}
            to={`/operacion/${tab.entity}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      {entity === 'matriculas' ? <EnrollmentsView /> : null}
      {entity === 'excepciones' ? <AuthorizationsView /> : null}
      {entity === 'cursos-programados' ? <ScheduledCoursesView /> : null}
    </main>
  );
}

function ScheduledCoursesView() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const careers = useQuery({ queryKey: ['academic', 'careers'], queryFn: getCareers });
  const plans = useQuery({ queryKey: ['academic', 'plans'], queryFn: () => getCurriculumPlans() });
  const planCourses = useQuery({ queryKey: ['academic', 'plan-courses'], queryFn: () => getPlanCourses() });
  const periods = useQuery({ queryKey: ['academic', 'periods'], queryFn: () => getAcademicPeriods() });
  const teachers = useQuery({
    queryKey: ['profiles', 'teachers', 'operation'],
    queryFn: () => getTeachers({ page: 1, pageSize: 20, estado: 'activo' }),
  });
  const scheduled = useQuery({
    queryKey: ['operation', 'scheduled-courses'],
    queryFn: () => getScheduledCourses(),
  });
  const form = useForm<ScheduledCourseValues>({
    resolver: zodResolver(scheduledCourseSchema),
    defaultValues: {
      carreraId: '', planCurricularId: '', planCursoId: '',
      periodoAcademicoId: '', profesorPersonaId: '', seccion: '',
    },
  });
  const careerId = useWatch({ control: form.control, name: 'carreraId' });
  const planId = useWatch({ control: form.control, name: 'planCurricularId' });
  const mutation = useMutation({
    mutationFn: (values: ScheduledCourseValues) => createScheduledCourse({
      planCursoId: values.planCursoId,
      periodoAcademicoId: values.periodoAcademicoId,
      profesorPersonaId: values.profesorPersonaId,
      seccion: values.seccion,
    }),
    onSuccess: async () => {
      form.reset();
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: ['operation', 'scheduled-courses'] });
    },
  });

  return (
    <section className="operation-section">
      <div className="operation-section__heading">
        <div><h2>Oferta del periodo</h2><p>Cada sección vincula un curso, periodo y docente activo.</p></div>
        <Button onClick={() => setShowForm((value) => !value)} type="button"><Plus size={16} />Programar curso</Button>
      </div>
      {showForm ? (
        <form className="operation-form" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <FormField error={form.formState.errors.carreraId?.message} htmlFor="scheduled-career" label="Carrera">
            <select className="form-select" id="scheduled-career" {...form.register('carreraId')}><option value="">Seleccionar</option>{careers.data?.filter((item) => item.estado === 'activo').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>
          </FormField>
          <FormField error={form.formState.errors.planCurricularId?.message} htmlFor="scheduled-plan" label="Plan">
            <select className="form-select" id="scheduled-plan" {...form.register('planCurricularId')}><option value="">Seleccionar</option>{plans.data?.filter((item) => item.carreraId === careerId && item.estado === 'activo').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>
          </FormField>
          <FormField error={form.formState.errors.planCursoId?.message} htmlFor="scheduled-course" label="Curso del plan">
            <select className="form-select" id="scheduled-course" {...form.register('planCursoId')}><option value="">Seleccionar</option>{planCourses.data?.filter((item) => item.planCurricularId === planId && item.estado === 'activo').map((item) => <option key={item.id} value={item.id}>Ciclo {item.ciclo} · orden {item.orden}</option>)}</select>
          </FormField>
          <FormField error={form.formState.errors.periodoAcademicoId?.message} htmlFor="scheduled-period" label="Periodo">
            <select className="form-select" id="scheduled-period" {...form.register('periodoAcademicoId')}><option value="">Seleccionar</option>{periods.data?.filter((item) => item.carreraId === careerId && item.estado === 'activo').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>
          </FormField>
          <FormField error={form.formState.errors.profesorPersonaId?.message} htmlFor="scheduled-teacher" label="Profesor">
            <select className="form-select" id="scheduled-teacher" {...form.register('profesorPersonaId')}><option value="">Seleccionar</option>{teachers.data?.data.map((item) => <option key={item.id} value={item.id}>{item.apellidoPaterno}, {item.nombres}</option>)}</select>
          </FormField>
          <FormField error={form.formState.errors.seccion?.message} htmlFor="scheduled-section" label="Sección"><Input id="scheduled-section" {...form.register('seccion')} /></FormField>
          <MutationActions error={mutation.error} pending={mutation.isPending} onCancel={() => setShowForm(false)} />
        </form>
      ) : null}
      <DataTable
        columns={['Curso', 'Carrera y plan', 'Periodo', 'Docente', 'Sección', 'Estado']}
        empty="No hay cursos programados."
        error={scheduled.isError}
        loading={scheduled.isPending}
      >
        {scheduled.data?.map((row) => <tr key={row.id}><td><strong>{row.cursoNombre}</strong><span>{row.cursoCodigo} · ciclo {row.ciclo}</span></td><td>{row.carreraNombre}<small>{row.planNombre}</small></td><td>{row.periodoNombre}</td><td>{row.profesorApellidoPaterno}, {row.profesorNombres}</td><td>{row.seccion}</td><td><StatusBadge active={row.estado === 'activo'} /></td></tr>)}
      </DataTable>
    </section>
  );
}

function EnrollmentsView() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<CareerEnrollment | null>(null);
  const careers = useQuery({ queryKey: ['academic', 'careers'], queryFn: getCareers });
  const plans = useQuery({ queryKey: ['academic', 'plans'], queryFn: () => getCurriculumPlans() });
  const periods = useQuery({ queryKey: ['academic', 'periods'], queryFn: () => getAcademicPeriods() });
  const students = useQuery({
    queryKey: ['profiles', 'students', 'operation'],
    queryFn: () => getStudents({ page: 1, pageSize: 20, estado: 'activo' }),
  });
  const enrollments = useQuery({ queryKey: ['operation', 'enrollments'], queryFn: () => getEnrollments() });
  const form = useForm<EnrollmentValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      personaId: '', carreraId: '', planCurricularId: '',
      periodoAcademicoId: '', fechaMatricula: today, costo: '',
    },
  });
  const careerId = useWatch({ control: form.control, name: 'carreraId' });
  const mutation = useMutation({
    mutationFn: ({ costo, ...values }: EnrollmentValues) => createEnrollment({ ...values, costo: costo || undefined }),
    onSuccess: async () => {
      form.reset({ personaId: '', carreraId: '', planCurricularId: '', periodoAcademicoId: '', fechaMatricula: today, costo: '' });
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: ['operation', 'enrollments'] });
    },
  });

  return (
    <section className="operation-section">
      <div className="operation-section__heading">
        <div><h2>Matrículas por periodo</h2><p>El ciclo de ingreso permanece en el perfil; aquí se ordena la continuidad académica.</p></div>
        <Button onClick={() => setShowForm((value) => !value)} type="button"><Plus size={16} />Nueva matrícula</Button>
      </div>
      {showForm ? (
        <form className="operation-form" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <FormField error={form.formState.errors.personaId?.message} htmlFor="student" label="Alumno"><select className="form-select" id="student" {...form.register('personaId')}><option value="">Seleccionar</option>{students.data?.data.map((item) => <option key={item.id} value={item.id}>{item.apellidos}, {item.nombres} · {item.dni}</option>)}</select></FormField>
          <FormField error={form.formState.errors.carreraId?.message} htmlFor="enrollment-career" label="Carrera"><select className="form-select" id="enrollment-career" {...form.register('carreraId')}><option value="">Seleccionar</option>{careers.data?.filter((item) => item.estado === 'activo').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></FormField>
          <FormField error={form.formState.errors.planCurricularId?.message} htmlFor="enrollment-plan" label="Plan"><select className="form-select" id="enrollment-plan" {...form.register('planCurricularId')}><option value="">Seleccionar</option>{plans.data?.filter((item) => item.carreraId === careerId && item.estado === 'activo').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></FormField>
          <FormField error={form.formState.errors.periodoAcademicoId?.message} htmlFor="enrollment-period" label="Periodo"><select className="form-select" id="enrollment-period" {...form.register('periodoAcademicoId')}><option value="">Seleccionar</option>{periods.data?.filter((item) => item.carreraId === careerId && item.estado === 'activo').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></FormField>
          <FormField error={form.formState.errors.fechaMatricula?.message} htmlFor="enrollment-date" label="Fecha"><Input id="enrollment-date" type="date" {...form.register('fechaMatricula')} /></FormField>
          <FormField error={form.formState.errors.costo?.message} htmlFor="enrollment-cost" label="Costo (opcional)"><Input id="enrollment-cost" inputMode="decimal" {...form.register('costo')} /></FormField>
          <MutationActions error={mutation.error} pending={mutation.isPending} onCancel={() => setShowForm(false)} />
        </form>
      ) : null}
      <DataTable columns={['Alumno', 'Trayectoria', 'Periodo', 'Fecha', 'Estado', 'Acción']} empty="No hay matrículas registradas." error={enrollments.isError} loading={enrollments.isPending}>
        {enrollments.data?.map((row) => <tr key={row.matricula.id}><td><strong>{row.persona.apellidoPaterno}, {row.persona.nombres}</strong><span>{row.persona.dni}</span></td><td>{row.carreraNombre}<small>{row.planNombre}</small></td><td>{row.periodoNombre}</td><td>{row.matricula.fechaMatricula}</td><td><span className={`profile-state is-${row.matricula.estado}`}>{row.matricula.estado}</span></td><td><Button onClick={() => setSelected(row)} type="button" variant="ghost"><ClipboardList size={15} />Continuar</Button></td></tr>)}
      </DataTable>
      {selected ? <EnrollmentDetail enrollment={selected} onClose={() => setSelected(null)} /> : null}
    </section>
  );
}

function EnrollmentDetail({ enrollment, onClose }: { enrollment: CareerEnrollment; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [courseId, setCourseId] = useState('');
  const [reason, setReason] = useState('');
  const courses = useQuery({
    queryKey: ['operation', 'enrollment-courses', enrollment.matricula.id],
    queryFn: () => getEnrollmentCourses(enrollment.matricula.id),
  });
  const scheduled = useQuery({
    queryKey: ['operation', 'scheduled-courses', enrollment.matricula.carreraId, enrollment.matricula.periodoAcademicoId],
    queryFn: () => getScheduledCourses({
      carreraId: enrollment.matricula.carreraId,
      periodoId: enrollment.matricula.periodoAcademicoId,
    }),
  });
  const authorizations = useQuery({
    queryKey: ['operation', 'authorizations', enrollment.matricula.id],
    queryFn: () => getAuthorizations({ matriculaId: enrollment.matricula.id }),
  });
  const enrolledIds = useMemo(() => new Set(courses.data?.map((item) => item.cursoProgramado.id)), [courses.data]);
  const available = scheduled.data?.filter((item) => item.planCurricularId === enrollment.matricula.planCurricularId && item.estado === 'activo' && !enrolledIds.has(item.id)) ?? [];
  const enroll = useMutation({
    mutationFn: () => enrollCourse({ matriculaCarreraId: enrollment.matricula.id, cursoProgramadoId: courseId, fechaInscripcion: today }),
    onSuccess: async () => {
      setCourseId('');
      await queryClient.invalidateQueries({ queryKey: ['operation', 'enrollment-courses', enrollment.matricula.id] });
    },
  });
  const request = useMutation({
    mutationFn: () => {
      const parsed = authorizationSchema.parse({ motivo: reason });
      return requestAuthorization({ matriculaCarreraId: enrollment.matricula.id, cursoProgramadoId: courseId, motivo: parsed.motivo });
    },
    onSuccess: async () => {
      setReason('');
      await queryClient.invalidateQueries({ queryKey: ['operation', 'authorizations', enrollment.matricula.id] });
    },
  });

  return (
    <aside aria-label="Detalle de matrícula" className="operation-detail">
      <header><div><p className="eyebrow">{enrollment.periodoNombre}</p><h2>{enrollment.persona.apellidoPaterno}, {enrollment.persona.nombres}</h2><p>{enrollment.carreraNombre} · {enrollment.planNombre}</p></div><Button aria-label="Cerrar detalle" onClick={onClose} type="button" variant="ghost"><X size={18} /></Button></header>
      <div className="operation-detail__grid">
        <section><h3>Cursos inscritos</h3>{courses.data?.length ? <ul className="trajectory-list">{courses.data.map((item) => <li key={item.inscripcion.id}><span>{item.ciclo}</span><div><strong>{item.cursoNombre}</strong><small>{item.cursoCodigo} · {item.inscripcion.fechaInscripcion}</small></div></li>)}</ul> : <p className="operation-empty">Aún no hay cursos inscritos.</p>}</section>
        <section><h3>Inscribir curso</h3><select className="form-select" onChange={(event) => setCourseId(event.target.value)} value={courseId}><option value="">Seleccionar curso programado</option>{available.map((item) => <option key={item.id} value={item.id}>{item.cursoCodigo} · {item.cursoNombre} · sección {item.seccion}</option>)}</select><Button disabled={!courseId || enroll.isPending} onClick={() => enroll.mutate()} type="button">Inscribir</Button>{enroll.error ? <div className="error-banner">{getApiErrorMessage(enroll.error, 'No se pudo inscribir.')}</div> : null}<textarea className="form-textarea" onChange={(event) => setReason(event.target.value)} placeholder="Si no cumple prerrequisitos, explica el motivo de la excepción." value={reason} /><Button disabled={!courseId || request.isPending} onClick={() => request.mutate()} type="button" variant="secondary">Solicitar excepción</Button>{request.error ? <div className="error-banner">{getApiErrorMessage(request.error, 'No se pudo solicitar la excepción.')}</div> : null}</section>
      </div>
      {authorizations.data?.length ? <section><h3>Solicitudes</h3><div className="authorization-strip">{authorizations.data.map((item) => <span className={`authorization-state is-${item.estado}`} key={item.id}>{item.cursoCodigo} · {item.estado}</span>)}</div></section> : null}
    </aside>
  );
}

function AuthorizationsView() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<PrerequisiteAuthorization['estado']>('pendiente');
  const authorizations = useQuery({
    queryKey: ['operation', 'authorizations', status],
    queryFn: () => getAuthorizations({ estado: status }),
  });
  const canResolve = profile?.roles.some((role) => role.codigo === 'DIRECTOR_ACADEMICO') ?? false;
  const mutation = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: 'aprobada' | 'rechazada' }) => resolveAuthorization(id, estado),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['operation', 'authorizations'] }),
  });
  return (
    <section className="operation-section">
      <div className="operation-section__heading"><div><h2>Bandeja de excepciones</h2><p>La decisión académica queda registrada y no inscribe automáticamente al alumno.</p></div><label className="select-filter"><span>Estado</span><select className="form-select" onChange={(event) => setStatus(event.target.value as PrerequisiteAuthorization['estado'])} value={status}><option value="pendiente">Pendientes</option><option value="aprobada">Aprobadas</option><option value="rechazada">Rechazadas</option></select></label></div>
      <DataTable columns={['Alumno', 'Curso', 'Periodo', 'Motivo', 'Estado', 'Decisión']} empty="No hay solicitudes en este estado." error={authorizations.isError} loading={authorizations.isPending}>
        {authorizations.data?.map((row) => <tr key={row.id}><td><strong>{row.alumnoApellidoPaterno}, {row.alumnoNombres}</strong><span>{row.alumnoDocumento}</span></td><td>{row.cursoNombre}<small>{row.cursoCodigo} · sección {row.seccion}</small></td><td>{row.periodoNombre}</td><td className="operation-reason">{row.motivo}</td><td><span className={`authorization-state is-${row.estado}`}>{row.estado}</span></td><td>{canResolve && row.estado === 'pendiente' ? <div className="decision-actions"><Button aria-label="Aprobar" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: row.id, estado: 'aprobada' })} type="button" variant="ghost"><Check size={16} /></Button><Button aria-label="Rechazar" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: row.id, estado: 'rechazada' })} type="button" variant="ghost"><X size={16} /></Button></div> : '—'}</td></tr>)}
      </DataTable>
    </section>
  );
}

function MutationActions({ error, onCancel, pending }: { error: unknown; onCancel: () => void; pending: boolean }) {
  return <div className="operation-form__actions">{error ? <div className="error-banner">{getApiErrorMessage(error, 'No se pudo guardar.')}</div> : null}<Button disabled={pending} onClick={onCancel} type="button" variant="secondary">Cancelar</Button><Button disabled={pending} type="submit">{pending ? 'Guardando…' : 'Guardar'}</Button></div>;
}

function DataTable({ children, columns, empty, error, loading }: { children: React.ReactNode; columns: string[]; empty: string; error: boolean; loading: boolean }) {
  if (loading) return <div className="table-state">Cargando información…</div>;
  if (error) return <div className="table-state is-error">No se pudo cargar la información.</div>;
  const rows = Array.isArray(children) ? children.filter(Boolean) : children;
  if (Array.isArray(rows) && rows.length === 0) return <div className="table-state"><h2>{empty}</h2></div>;
  return <div className="data-table-wrap"><table className="data-table operation-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
