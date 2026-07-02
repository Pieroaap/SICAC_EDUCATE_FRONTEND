import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ClipboardList, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { NavLink, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../../api/client';
import type { CareerEnrollment, PrerequisiteAuthorization } from '../../../api/types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { FormField } from '../../../components/FormField';
import { StatusBadge } from '../../../components/StatusBadge';
import { useDebouncedValue } from '../../../lib/useDebouncedValue';
import { useAuth } from '../../auth/AuthProvider';
import {
  getAcademicPeriods,
  getCareers,
  getCourses,
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
  getScheduledCourseCandidates,
  enrollCourseCandidates,
  withdrawCourseStudent,
  requestAuthorization,
  resolveAuthorization,
  createBulkEnrollments,
  getBulkEnrollmentCandidates,
} from '../api/academicOperationApi';

const today = new Date().toISOString().slice(0, 10);
const tabs = [
  { entity: 'cursos-programados', label: 'Cursos programados' },
  { entity: 'matriculas', label: 'Matrículas e historial' },
  { entity: 'excepciones', label: 'Excepciones' },
];

function latestActivePlan<T extends { carreraId: string; estado: string; createdAt?: string; version: string }>(
  plans: T[] | undefined,
  careerId: string,
) {
  return plans
    ?.filter((plan) => plan.carreraId === careerId && plan.estado === 'activo')
    .sort((a, b) => (b.createdAt ?? b.version).localeCompare(a.createdAt ?? a.version))[0];
}

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
  const [periodFilter, setPeriodFilter] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const careers = useQuery({ queryKey: ['academic', 'careers'], queryFn: getCareers });
  const plans = useQuery({ queryKey: ['academic', 'plans'], queryFn: () => getCurriculumPlans() });
  const planCourses = useQuery({ queryKey: ['academic', 'plan-courses'], queryFn: () => getPlanCourses() });
  const courses = useQuery({ queryKey: ['academic', 'courses'], queryFn: getCourses });
  const periods = useQuery({ queryKey: ['academic', 'periods'], queryFn: () => getAcademicPeriods() });
  const teachers = useQuery({
    queryKey: ['profiles', 'teachers', 'operation'],
    queryFn: () => getTeachers({ page: 1, pageSize: 20, estado: 'activo' }),
  });
  const scheduled = useQuery({
    queryKey: ['operation', 'scheduled-courses', periodFilter],
    queryFn: () => getScheduledCourses({ periodoId: periodFilter || undefined }),
  });
  const form = useForm<ScheduledCourseValues>({
    resolver: zodResolver(scheduledCourseSchema),
    defaultValues: {
      carreraId: '', planCurricularId: '', planCursoId: '',
      periodoAcademicoId: '', profesorPersonaId: '',
    },
  });
  const careerId = useWatch({ control: form.control, name: 'carreraId' });
  const planId = latestActivePlan(plans.data, careerId)?.id ?? '';
  useEffect(() => {
    form.setValue('planCurricularId', planId, { shouldValidate: Boolean(careerId) });
    form.setValue('planCursoId', '');
  }, [careerId, form, planId]);
  const mutation = useMutation({
    mutationFn: (values: ScheduledCourseValues) => createScheduledCourse({
      planCursoId: values.planCursoId,
      periodoAcademicoId: values.periodoAcademicoId,
      profesorPersonaId: values.profesorPersonaId,
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
        <div><h2>Oferta del periodo</h2><p>Cada curso vincula una carrera, periodo y docente activo.</p></div>
        <Button onClick={() => setShowForm((value) => !value)} type="button"><Plus size={16} />Programar curso</Button>
      </div>
      <label className="select-filter operation-period-filter"><span>Periodo</span><select className="form-select" onChange={(event) => setPeriodFilter(event.target.value)} value={periodFilter}><option value="">Todos</option>{periods.data?.map((period) => <option key={period.id} value={period.id}>{period.nombre}</option>)}</select></label>
      {showForm ? (
        <form className="operation-form" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <FormField error={form.formState.errors.carreraId?.message} htmlFor="scheduled-career" label="Carrera">
            <select className="form-select" id="scheduled-career" {...form.register('carreraId')}><option value="">Seleccionar</option>{careers.data?.filter((item) => item.estado === 'activo').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>
          </FormField>
          <FormField error={form.formState.errors.planCursoId?.message} htmlFor="scheduled-course" label="Curso">
            <select className="form-select" disabled={!planId} id="scheduled-course" {...form.register('planCursoId')}><option value="">Seleccionar</option>{planCourses.data?.filter((item) => item.planCurricularId === planId && item.estado === 'activo').map((item) => <option key={item.id} value={item.id}>Ciclo {item.ciclo} · {courses.data?.find((course) => course.id === item.cursoId)?.nombre ?? 'Curso'}</option>)}</select>
          </FormField>
          <FormField error={form.formState.errors.periodoAcademicoId?.message} htmlFor="scheduled-period" label="Periodo">
            <select className="form-select" id="scheduled-period" {...form.register('periodoAcademicoId')}><option value="">Seleccionar</option>{periods.data?.filter((item) => item.carreraId === careerId && item.estado === 'activo').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>
          </FormField>
          <FormField error={form.formState.errors.profesorPersonaId?.message} htmlFor="scheduled-teacher" label="Profesor">
            <select className="form-select" id="scheduled-teacher" {...form.register('profesorPersonaId')}><option value="">Seleccionar</option>{teachers.data?.data.map((item) => <option key={item.id} value={item.id}>{item.apellidoPaterno}, {item.nombres}</option>)}</select>
          </FormField>
          <MutationActions error={mutation.error} pending={mutation.isPending} onCancel={() => setShowForm(false)} />
        </form>
      ) : null}
      <DataTable
        columns={['Curso', 'Carrera y plan', 'Periodo', 'Docente', 'Estado', 'Alumnos']}
        empty="No hay cursos programados."
        error={scheduled.isError}
        loading={scheduled.isPending}
      >
        {scheduled.data?.map((row) => <tr key={row.id}><td><strong>{row.cursoNombre}</strong><span>Ciclo {row.ciclo}</span></td><td>{row.carreraNombre}<small>{row.planNombre}</small></td><td>{row.periodoNombre}</td><td>{row.profesorApellidoPaterno}, {row.profesorNombres}</td><td><StatusBadge active={row.estado === 'activo'} /></td><td><Button onClick={() => setSelectedCourseId(row.id)} type="button" variant="ghost">Gestionar</Button></td></tr>)}
      </DataTable>
      {selectedCourseId ? <CourseRoster courseId={selectedCourseId} onClose={() => setSelectedCourseId(null)} /> : null}
    </section>
  );
}

function EnrollmentsView() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<CareerEnrollment | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const debouncedStudentSearch = useDebouncedValue(studentSearch.trim(), 300);
  const careers = useQuery({ queryKey: ['academic', 'careers'], queryFn: getCareers });
  const plans = useQuery({ queryKey: ['academic', 'plans'], queryFn: () => getCurriculumPlans() });
  const periods = useQuery({ queryKey: ['academic', 'periods'], queryFn: () => getAcademicPeriods() });
  const students = useQuery({
    queryKey: ['profiles', 'students', 'operation', debouncedStudentSearch],
    queryFn: () => getStudents({
      page: 1,
      pageSize: 20,
      estado: 'activo',
      search: debouncedStudentSearch || undefined,
    }),
    enabled: showForm,
  });
  const enrollments = useQuery({ queryKey: ['operation', 'enrollments', periodFilter], queryFn: () => getEnrollments({ periodoId: periodFilter || undefined }) });
  const form = useForm<EnrollmentValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      personaId: '', carreraId: '', planCurricularId: '',
      periodoAcademicoId: '',
    },
  });
  const careerId = useWatch({ control: form.control, name: 'carreraId' });
  const selectedStudentId = useWatch({ control: form.control, name: 'personaId' });
  const planId = latestActivePlan(plans.data, careerId)?.id ?? '';
  useEffect(() => {
    form.setValue('planCurricularId', planId, { shouldValidate: Boolean(careerId) });
  }, [careerId, form, planId]);
  const mutation = useMutation({
    mutationFn: (values: EnrollmentValues) => createEnrollment(values),
    onSuccess: async () => {
      form.reset({ personaId: '', carreraId: '', planCurricularId: '', periodoAcademicoId: '' });
      setStudentSearch('');
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: ['operation', 'enrollments'] });
    },
  });
  const canBulk = profile?.roles.some((role) => (
    role.codigo === 'ADMINISTRADOR_SISTEMA' || role.codigo === 'GESTOR_ACADEMICO'
  )) ?? false;

  return (
    <section className="operation-section">
      <div className="operation-section__heading">
        <div><h2>Matrículas por periodo</h2><p>El ciclo de ingreso permanece en el perfil; aquí se ordena la continuidad académica.</p></div>
        <div className="decision-actions">
          {canBulk ? <Button onClick={() => setShowBulk(true)} type="button" variant="secondary">Matrícula masiva</Button> : null}
          <Button onClick={() => setShowForm((value) => !value)} type="button"><Plus size={16} />Nueva matrícula</Button>
        </div>
      </div>
      <label className="select-filter operation-period-filter"><span>Periodo</span><select className="form-select" onChange={(event) => setPeriodFilter(event.target.value)} value={periodFilter}><option value="">Todos</option>{periods.data?.map((period) => <option key={period.id} value={period.id}>{period.nombre}</option>)}</select></label>
      {showForm ? (
        <form className="operation-form" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <FormField error={form.formState.errors.personaId?.message} htmlFor="student-search" label="Alumno">
            <div className="student-search">
              <Input id="student-search" onChange={(event) => { setStudentSearch(event.target.value); form.setValue('personaId', '', { shouldValidate: false }); }} placeholder="Escribe apellidos, nombres o DNI" value={studentSearch} />
              {studentSearch && !selectedStudentId ? <div className="student-search__results">{students.isFetching ? <span>Buscando…</span> : students.data?.data.map((item) => <button key={item.id} onClick={() => { form.setValue('personaId', item.id, { shouldValidate: true }); setStudentSearch(`${item.apellidos}, ${item.nombres} · ${item.dni}`); }} type="button"><strong>{item.apellidos}, {item.nombres}</strong><small>{item.dni}</small></button>)}</div> : null}
            </div>
          </FormField>
          <FormField error={form.formState.errors.carreraId?.message} htmlFor="enrollment-career" label="Carrera"><select className="form-select" id="enrollment-career" {...form.register('carreraId')}><option value="">Seleccionar</option>{careers.data?.filter((item) => item.estado === 'activo').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></FormField>
          <FormField error={form.formState.errors.periodoAcademicoId?.message} htmlFor="enrollment-period" label="Periodo"><select className="form-select" id="enrollment-period" {...form.register('periodoAcademicoId')}><option value="">Seleccionar</option>{periods.data?.filter((item) => item.carreraId === careerId && item.estado === 'activo').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></FormField>
          <MutationActions error={mutation.error} pending={mutation.isPending} onCancel={() => setShowForm(false)} />
        </form>
      ) : null}
      <DataTable columns={['Alumno', 'Trayectoria', 'Periodo', 'Estado', 'Acción']} empty="No hay matrículas registradas." error={enrollments.isError} loading={enrollments.isPending}>
        {enrollments.data?.map((row) => <tr key={row.matricula.id}><td><strong>{row.persona.apellidoPaterno}, {row.persona.nombres}</strong><span>{row.persona.dni}</span></td><td>{row.carreraNombre}<small>{row.planNombre}</small></td><td>{row.periodoNombre}</td><td><span className={`profile-state is-${row.matricula.estado}`}>{row.matricula.estado}</span></td><td><Button onClick={() => setSelected(row)} type="button" variant="ghost"><ClipboardList size={15} />Continuar</Button></td></tr>)}
      </DataTable>
      {selected ? <EnrollmentDetail enrollment={selected} onClose={() => setSelected(null)} /> : null}
      {showBulk ? (
        <BulkEnrollmentPanel
          careers={careers.data ?? []}
          onClose={() => setShowBulk(false)}
          periods={periods.data ?? []}
          plans={plans.data ?? []}
        />
      ) : null}
    </section>
  );
}

function BulkEnrollmentPanel({
  careers, onClose, periods, plans,
}: {
  careers: Awaited<ReturnType<typeof getCareers>>;
  onClose: () => void;
  periods: Awaited<ReturnType<typeof getAcademicPeriods>>;
  plans: Awaited<ReturnType<typeof getCurriculumPlans>>;
}) {
  const queryClient = useQueryClient();
  const [careerId, setCareerId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const planId = latestActivePlan(plans, careerId)?.id ?? '';
  const candidates = useQuery({
    queryKey: ['operation', 'bulk-candidates', careerId, planId, periodId],
    queryFn: () => getBulkEnrollmentCandidates({
      carreraId: careerId, planCurricularId: planId, periodoAcademicoId: periodId,
    }),
    enabled: Boolean(careerId && planId && periodId),
  });
  const create = useMutation({
    mutationFn: () => createBulkEnrollments({
      personaIds: selectedIds, carreraId: careerId,
      planCurricularId: planId, periodoAcademicoId: periodId,
    }),
    onSuccess: async () => {
      setSelectedIds([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['operation', 'enrollments'] }),
        queryClient.invalidateQueries({ queryKey: ['operation', 'bulk-candidates', careerId, planId, periodId] }),
      ]);
    },
  });
  return (
    <aside aria-label="Matrícula masiva" className="operation-detail">
      <header>
        <div><p className="eyebrow">Matrículas</p><h2>Matrícula masiva</h2><p>Solo aparecen alumnos activos, inscritos y aún no matriculados en el periodo.</p></div>
        <Button aria-label="Cerrar matrícula masiva" onClick={onClose} type="button" variant="ghost"><X size={18} /></Button>
      </header>
      <div className="operation-form">
        <FormField htmlFor="bulk-career" label="Carrera">
          <select className="form-select" id="bulk-career" onChange={(event) => {
            setCareerId(event.target.value); setPeriodId(''); setSelectedIds([]);
          }} value={careerId}>
            <option value="">Seleccionar</option>
            {careers.filter((item) => item.estado === 'activo').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
        </FormField>
        <FormField htmlFor="bulk-period" label="Periodo">
          <select className="form-select" id="bulk-period" onChange={(event) => {
            setPeriodId(event.target.value); setSelectedIds([]);
          }} value={periodId}>
            <option value="">Seleccionar</option>
            {periods.filter((item) => item.carreraId === careerId && item.estado === 'activo').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
        </FormField>
      </div>
      {candidates.isFetching ? <p>Cargando candidatos…</p> : null}
      {candidates.isError ? <div className="error-banner">No se pudieron cargar los candidatos.</div> : null}
      {candidates.data?.data.length === 0 ? <p className="operation-empty">No hay alumnos pendientes para este contexto.</p> : null}
      {candidates.data?.data.length ? (
        <section className="roster-section">
          <h3>Candidatos ({candidates.data.pagination.total})</h3>
          <div className="roster-list">
            {candidates.data.data.map((row) => (
              <label key={row.personaId}>
                <input checked={selectedIds.includes(row.personaId)} onChange={(event) => setSelectedIds((current) => (
                  event.target.checked ? [...current, row.personaId] : current.filter((id) => id !== row.personaId)
                ))} type="checkbox" />
                <span><strong>{row.apellidoPaterno}, {row.nombres}</strong><small>{row.dni}</small></span>
              </label>
            ))}
          </div>
          {create.error ? <div className="error-banner">{getApiErrorMessage(create.error, 'No se pudo completar el lote.')}</div> : null}
          <Button disabled={!selectedIds.length || create.isPending} onClick={() => create.mutate()} type="button">
            Matricular seleccionados ({selectedIds.length})
          </Button>
        </section>
      ) : null}
    </aside>
  );
}

function CourseRoster({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const candidates = useQuery({
    queryKey: ['operation', 'course-candidates', courseId],
    queryFn: () => getScheduledCourseCandidates(courseId),
  });
  const register = useMutation({
    mutationFn: () => enrollCourseCandidates(courseId, selectedIds),
    onSuccess: async () => {
      setSelectedIds([]);
      await queryClient.invalidateQueries({ queryKey: ['operation', 'course-candidates', courseId] });
    },
  });
  const withdraw = useMutation({
    mutationFn: withdrawCourseStudent,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['operation', 'course-candidates', courseId] }),
  });
  const available = candidates.data?.filter((row) => !row.inscripcion) ?? [];
  const registered = candidates.data?.filter((row) => row.inscripcion) ?? [];
  return (
    <aside aria-label="Alumnos del curso" className="operation-detail">
      <header><div><p className="eyebrow">Curso programado</p><h2>Gestionar alumnos</h2><p>Selecciona varios matriculados para registrarlos en una sola operación.</p></div><Button aria-label="Cerrar alumnos" onClick={onClose} type="button" variant="ghost"><X size={18} /></Button></header>
      <section className="roster-section"><h3>Disponibles ({available.length})</h3>{available.length ? <div className="roster-list">{available.map((row) => <label key={row.matriculaId}><input checked={selectedIds.includes(row.matriculaId)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, row.matriculaId] : current.filter((id) => id !== row.matriculaId))} type="checkbox" /><span><strong>{row.apellidoPaterno}, {row.nombres}</strong><small>{row.dni}</small></span></label>)}</div> : <p className="operation-empty">No hay alumnos pendientes de registro.</p>}<Button disabled={!selectedIds.length || register.isPending} onClick={() => register.mutate()} type="button">Registrar seleccionados ({selectedIds.length})</Button></section>
      <section className="roster-section"><h3>Registrados ({registered.length})</h3>{registered.length ? <div className="roster-list">{registered.map((row) => <div className="roster-row" key={row.matriculaId}><span><strong>{row.apellidoPaterno}, {row.nombres}</strong><small>{row.dni} · {row.inscripcion?.estado}</small></span>{row.inscripcion?.estado === 'activo' ? <Button disabled={withdraw.isPending} onClick={() => withdraw.mutate(row.inscripcion!.id)} type="button" variant="ghost">Retirar</Button> : null}</div>)}</div> : <p className="operation-empty">Aún no hay alumnos registrados.</p>}</section>
    </aside>
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
        <section><h3>Inscribir curso</h3><select className="form-select" onChange={(event) => setCourseId(event.target.value)} value={courseId}><option value="">Seleccionar curso programado</option>{available.map((item) => <option key={item.id} value={item.id}>Ciclo {item.ciclo} · {item.cursoNombre}</option>)}</select><Button disabled={!courseId || enroll.isPending} onClick={() => enroll.mutate()} type="button">Inscribir</Button>{enroll.error ? <div className="error-banner">{getApiErrorMessage(enroll.error, 'No se pudo inscribir.')}</div> : null}<textarea className="form-textarea" onChange={(event) => setReason(event.target.value)} placeholder="Si no cumple prerrequisitos, explica el motivo de la excepción." value={reason} /><Button disabled={!courseId || request.isPending} onClick={() => request.mutate()} type="button" variant="secondary">Solicitar excepción</Button>{request.error ? <div className="error-banner">{getApiErrorMessage(request.error, 'No se pudo solicitar la excepción.')}</div> : null}</section>
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
        {authorizations.data?.map((row) => <tr key={row.id}><td><strong>{row.alumnoApellidoPaterno}, {row.alumnoNombres}</strong><span>{row.alumnoDocumento}</span></td><td>{row.cursoNombre}<small>{row.cursoCodigo}</small></td><td>{row.periodoNombre}</td><td className="operation-reason">{row.motivo}</td><td><span className={`authorization-state is-${row.estado}`}>{row.estado}</span></td><td>{canResolve && row.estado === 'pendiente' ? <div className="decision-actions"><Button aria-label="Aprobar" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: row.id, estado: 'aprobada' })} type="button" variant="ghost"><Check size={16} /></Button><Button aria-label="Rechazar" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: row.id, estado: 'rechazada' })} type="button" variant="ghost"><X size={16} /></Button></div> : '—'}</td></tr>)}
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
