import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpenCheck, CalendarDays, GitBranch, Layers3, SquarePen } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch, type UseFormRegisterReturn } from 'react-hook-form';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../../api/client';
import type {
  AcademicPeriod,
  Course,
  CurriculumPlan,
  PlanCourse,
} from '../../../api/types';
import { FormField } from '../../../components/FormField';
import { StatusBadge } from '../../../components/StatusBadge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import {
  academicPeriodSchema,
  catalogSchema,
  careerSchema,
  courseSchema,
  planCourseSchema,
  type AcademicPeriodValues,
  type CatalogValues,
  type CareerValues,
  type CourseValues,
  type PlanCourseValues,
} from '../academicStructureForms';
import {
  createAcademicPeriod,
  createCareer,
  createCourse,
  createCurriculumPlan,
  createPlanCourse,
  getAcademicPeriods,
  getCareers,
  getCourses,
  getCurriculumPlans,
  getPlanCourses,
  updateAcademicPeriod,
  updateCareer,
  updateCourse,
  updatePlanCourse,
} from '../api/academicStructureApi';

type EntityKey = 'carreras' | 'cursos' | 'plan-cursos' | 'periodos-academicos';
type Mode = 'list' | 'create' | 'edit';

const entityOptions: Array<{ key: EntityKey; label: string; icon: typeof Layers3 }> = [
  { key: 'carreras', label: 'Carreras y planes', icon: Layers3 },
  { key: 'cursos', label: 'Cursos', icon: BookOpenCheck },
  { key: 'plan-cursos', label: 'Cursos por plan', icon: GitBranch },
  { key: 'periodos-academicos', label: 'Periodos academicos', icon: CalendarDays },
];
const emptyCourse: CourseValues = { codigo: '', nombre: '', tipo: 'obligatorio', estado: 'activo' };
const emptyPlanCourse: PlanCourseValues = {
  planCurricularId: '', cursoId: '', ciclo: 1, orden: 1, estado: 'activo', prerequisiteIds: [],
};
const emptyAcademicPeriod: AcademicPeriodValues = {
  carreraId: '',
  anio: new Date().getFullYear(),
  periodo: 'I',
  fechaInicio: '',
  fechaFin: '',
  estado: 'activo',
};

function nameById<T extends { id: string; codigo?: string; nombre?: string }>(rows: T[] | undefined, id: string) {
  const item = rows?.find((row) => row.id === id);
  if (!item) return 'No encontrado';
  return [item.codigo, item.nombre].filter(Boolean).join(' - ');
}

function courseInPlanLabel(row: PlanCourse, plans?: CurriculumPlan[], courses?: Course[]) {
  return `${nameById(courses, row.cursoId)} · ${nameById(plans, row.planCurricularId)} · ciclo ${row.ciclo}`;
}

export function AcademicStructurePage() {
  const params = useParams<{ entity?: string; id?: string }>();
  const entity = (params.entity ?? 'carreras') as EntityKey;
  const id = params.id;
  const mode: Mode = id ? 'edit' : window.location.pathname.endsWith('/nueva') ? 'create' : 'list';
  const validEntity = entityOptions.some((option) => option.key === entity);

  if (!validEntity) return <Navigate replace to="/estructura/carreras" />;

  return (
    <main className="page-shell academic-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Estructura academica</p>
          <h1>{entityOptions.find((option) => option.key === entity)?.label}</h1>
          <p>Catalogos, mallas por ciclo, prerequisitos y periodos academicos.</p>
        </div>
        {mode === 'list' && entity !== 'plan-cursos' ? (
          <Button asChild><Link to={`/estructura/${entity}/nueva`}>Nuevo registro</Link></Button>
        ) : null}
      </header>

      <nav className="academic-tabs" aria-label="Entidades de estructura academica">
        {entityOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Link
              className={option.key === entity ? 'is-active' : undefined}
              key={option.key}
              to={`/estructura/${option.key}`}
            >
              <Icon size={16} />
              {option.label}
            </Link>
          );
        })}
      </nav>

      {entity === 'carreras' ? <CareersPlansEntity id={id} mode={mode} /> : null}
      {entity === 'cursos' ? <CourseEntity id={id} mode={mode} /> : null}
      {entity === 'plan-cursos' ? <PlanCoursesEntity id={id} mode={mode} /> : null}
      {entity === 'periodos-academicos' ? <AcademicPeriodsEntity id={id} mode={mode} /> : null}
    </main>
  );
}

function CareersPlansEntity({ id, mode }: { id?: string; mode: Mode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [newPlanCareerId, setNewPlanCareerId] = useState<string | null>(null);
  const [newPlanVersion, setNewPlanVersion] = useState(String(new Date().getFullYear()));
  const [planYearError, setPlanYearError] = useState<string | null>(null);
  const planDialogRef = useRef<HTMLDialogElement>(null);
  const careers = useQuery({ queryKey: ['academic', 'careers'], queryFn: getCareers, staleTime: 30_000 });
  const plans = useQuery({
    queryKey: ['academic', 'plans'],
    queryFn: () => getCurriculumPlans(),
    staleTime: 30_000,
  });
  const current = careers.data?.find((row) => row.id === id);
  const selectedPlanCareer = careers.data?.find((career) => career.id === newPlanCareerId);
  useEffect(() => {
    if (newPlanCareerId && !planDialogRef.current?.open) planDialogRef.current?.showModal();
  }, [newPlanCareerId]);
  const editForm = useForm<CatalogValues>({
    resolver: zodResolver(catalogSchema),
    defaultValues: { codigo: '', nombre: '', descripcion: '', estado: 'activo' },
  });
  useEffect(() => {
    editForm.reset(current ? {
      codigo: current.codigo,
      nombre: current.nombre,
      descripcion: current.descripcion ?? undefined,
      estado: current.estado,
    } : { codigo: '', nombre: '', descripcion: '', estado: 'activo' });
  }, [current, editForm, id, mode]);
  const createForm = useForm<CareerValues>({
    resolver: zodResolver(careerSchema),
    defaultValues: {
      codigo: '',
      nombre: '',
      descripcion: '',
      estado: 'activo',
      planVersion: String(new Date().getFullYear()),
    },
  });
  const saveCareer = useMutation({
    mutationFn: async (values: CatalogValues | CareerValues) => {
      if (mode === 'edit' && id) await updateCareer(id, values);
      else await createCareer(values as CareerValues);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['academic', 'careers'] }),
        queryClient.invalidateQueries({ queryKey: ['academic', 'plans'] }),
      ]);
      navigate('/estructura/carreras');
    },
  });
  const createPlan = useMutation({
    mutationFn: ({ carreraId, version }: { carreraId: string; version: string }) => (
      createCurriculumPlan({ carreraId, version })
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['academic', 'plans'] });
      planDialogRef.current?.close();
    },
  });

  if (mode === 'create') {
    return (
      <EntityForm
        error={saveCareer.error}
        isPending={saveCareer.isPending}
        mode={mode}
        onCancel={() => navigate('/estructura/carreras')}
        onSubmit={createForm.handleSubmit((values) => saveCareer.mutate(values))}
        title="carrera y plan inicial"
      >
        <FormField error={createForm.formState.errors.codigo?.message} htmlFor="codigo" label="Codigo de carrera">
          <Input id="codigo" {...createForm.register('codigo')} />
        </FormField>
        <FormField error={createForm.formState.errors.nombre?.message} htmlFor="nombre" label="Nombre de carrera">
          <Input id="nombre" {...createForm.register('nombre')} />
        </FormField>
        <FormField error={createForm.formState.errors.descripcion?.message} htmlFor="descripcion" label="Descripcion">
          <Input id="descripcion" {...createForm.register('descripcion')} />
        </FormField>
        <FormField error={createForm.formState.errors.planVersion?.message} htmlFor="planVersion" label="Version del plan inicial">
          <Input id="planVersion" {...createForm.register('planVersion')} />
        </FormField>
      </EntityForm>
    );
  }

  if (mode === 'edit') {
    return (
      <CatalogForm
        error={saveCareer.error}
        form={editForm}
        isPending={saveCareer.isPending}
        mode={mode}
        onCancel={() => navigate('/estructura/carreras')}
        onSubmit={(values) => saveCareer.mutate(values)}
        title="carrera"
      />
    );
  }

  return (
    <div className="career-plan-list">
      {careers.isPending || plans.isPending ? <section className="table-state">Cargando informacion...</section> : null}
      {careers.isError || plans.isError ? <section className="table-state is-error">No pudimos cargar carreras y planes.</section> : null}
      {careers.data?.map((career) => {
        const careerPlans = plans.data?.filter((plan) => plan.carreraId === career.id) ?? [];
        return (
          <section className="career-plan-group" key={career.id}>
            <header>
              <div>
                <h2>{career.nombre}</h2>
                <span className="career-plan-code">{career.codigo}</span>
                <p>{career.descripcion ?? 'Sin descripcion'}</p>
              </div>
              <div className="career-plan-actions">
                <EditButton to={`/estructura/carreras/${career.id}`} />
                <Button
                  onClick={() => {
                    createPlan.reset();
                    setPlanYearError(null);
                    setNewPlanVersion(String(new Date().getFullYear()));
                    setNewPlanCareerId(career.id);
                  }}
                  type="button"
                  variant="secondary"
                >
                  Nueva malla
                </Button>
              </div>
            </header>
            <div className="career-plan-versions">
              {careerPlans.map((plan) => (
                <Link key={plan.id} to={`/estructura/plan-cursos?planId=${plan.id}`}>
                  <strong>{plan.nombre}</strong>
                  <span>Version {plan.version}</span>
                  <StatusBadge active={plan.estado === 'activo'} />
                </Link>
              ))}
            </div>
          </section>
        );
      })}
      <dialog
        className="curriculum-dialog"
        onCancel={(event) => {
          event.preventDefault();
          planDialogRef.current?.close();
        }}
        onClose={() => {
          setNewPlanCareerId(null);
          setPlanYearError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            planDialogRef.current?.close();
          }
        }}
        ref={planDialogRef}
      >
        <form
          method="dialog"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!/^[0-9]{4}$/.test(newPlanVersion) || Number(newPlanVersion) < 1900) {
              setPlanYearError('Ingresa un año válido de cuatro dígitos.');
              return;
            }
            if (newPlanCareerId) createPlan.mutate({ carreraId: newPlanCareerId, version: newPlanVersion });
          }}
        >
          <header>
            <p className="eyebrow">Plan curricular</p>
            <h2>Nueva malla curricular</h2>
            <p>Crea una nueva versión sin modificar las mallas anteriores.</p>
          </header>
          <div className="curriculum-dialog__fields">
            <FormField htmlFor="dialog-career" label="Carrera">
              <Input disabled id="dialog-career" value={selectedPlanCareer?.nombre ?? ''} />
            </FormField>
            <FormField error={planYearError ?? undefined} htmlFor="dialog-plan-year" label="Malla">
              <Input
                id="dialog-plan-year"
                inputMode="numeric"
                max={9999}
                min={1900}
                onChange={(event) => {
                  setNewPlanVersion(event.target.value);
                  setPlanYearError(null);
                }}
                type="number"
                value={newPlanVersion}
              />
            </FormField>
          </div>
          {createPlan.error ? (
            <div className="error-banner">{getApiErrorMessage(createPlan.error, 'No se pudo crear la malla.')}</div>
          ) : null}
          <div className="form-actions">
            <Button
              disabled={createPlan.isPending}
              onClick={() => planDialogRef.current?.close()}
              type="button"
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button disabled={createPlan.isPending} type="submit">
              {createPlan.isPending ? 'Creando...' : 'Crear malla'}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

function CourseEntity({ id, mode }: { id?: string; mode: Mode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const courses = useQuery({ queryKey: ['academic', 'courses'], queryFn: getCourses, staleTime: 30_000 });
  const current = courses.data?.find((row) => row.id === id);
  const form = useForm<CourseValues>({ resolver: zodResolver(courseSchema), defaultValues: emptyCourse });

  useEffect(() => {
    form.reset(current
      ? { codigo: current.codigo, nombre: current.nombre, tipo: current.tipo, estado: current.estado }
      : emptyCourse);
  }, [current, form, id, mode]);

  const mutation = useMutation({
    mutationFn: (values: CourseValues) => (
      mode === 'edit' && id ? updateCourse(id, values) : createCourse(values)
    ),
    onSuccess: async () => {
      form.reset(emptyCourse);
      await queryClient.invalidateQueries({ queryKey: ['academic', 'courses'] });
      navigate('/estructura/cursos');
    },
  });

  if (mode !== 'list') {
    return (
      <EntityForm error={mutation.error} isPending={mutation.isPending} mode={mode} onCancel={() => navigate('/estructura/cursos')} onSubmit={form.handleSubmit((values) => mutation.mutate(values))} title="curso">
        <FormField error={form.formState.errors.codigo?.message} htmlFor="codigo" label="Codigo">
          <Input id="codigo" {...form.register('codigo')} />
        </FormField>
        <FormField error={form.formState.errors.nombre?.message} htmlFor="nombre" label="Nombre">
          <Input id="nombre" {...form.register('nombre')} />
        </FormField>
        <FormField error={form.formState.errors.tipo?.message} htmlFor="tipo" label="Tipo">
          <select className="form-select" id="tipo" {...form.register('tipo')}>
            <option value="obligatorio">Obligatorio</option>
            <option value="electivo">Electivo</option>
          </select>
        </FormField>
        {mode === 'edit' ? <StateSelect register={form.register('estado')} /> : null}
      </EntityForm>
    );
  }

  return (
    <AcademicTable columns={['Codigo', 'Nombre', 'Tipo', 'Estado', 'Acciones']} empty="Aun no hay cursos." isError={courses.isError} isPending={courses.isPending} onRetry={() => void courses.refetch()}>
      {courses.data?.map((row) => (
        <tr key={row.id}>
          <td><span className="document-value">{row.codigo}</span></td>
          <td><strong>{row.nombre}</strong></td>
          <td className="text-capitalize">{row.tipo}</td>
          <td><StatusBadge active={row.estado === 'activo'} /></td>
          <td className="table-actions"><EditButton to={`/estructura/cursos/${row.id}`} /></td>
        </tr>
      ))}
    </AcademicTable>
  );
}

function PlanCoursesEntity({ id, mode }: { id?: string; mode: Mode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPlanFromUrl = searchParams.get('planId') ?? '';
  const selectedCareerFromUrl = searchParams.get('careerId') ?? '';
  const planCourses = useQuery({
    queryKey: ['academic', 'plan-courses'],
    queryFn: () => getPlanCourses(),
    staleTime: 30_000,
  });
  const plans = useQuery({
    queryKey: ['academic', 'plans'],
    queryFn: () => getCurriculumPlans(),
    staleTime: 60_000,
  });
  const careers = useQuery({ queryKey: ['academic', 'careers'], queryFn: getCareers, staleTime: 60_000 });
  const courses = useQuery({ queryKey: ['academic', 'courses'], queryFn: getCourses, staleTime: 60_000 });
  const selectedPlan = plans.data?.find((plan) => plan.id === selectedPlanFromUrl);
  const selectedCareerId = selectedPlan?.carreraId ?? selectedCareerFromUrl;
  const planOptions = plans.data?.filter((plan) => !selectedCareerId || plan.carreraId === selectedCareerId) ?? [];
  const current = planCourses.data?.find((row) => row.id === id);
  const form = useForm<PlanCourseValues>({
    resolver: zodResolver(planCourseSchema),
    defaultValues: emptyPlanCourse,
  });
  useEffect(() => {
    form.reset(current
      ? { ...current, prerequisiteIds: current.prerequisiteIds ?? [] }
      : { ...emptyPlanCourse, planCurricularId: selectedPlanFromUrl });
  }, [current, form, id, mode, selectedPlanFromUrl]);
  const selectedPlanId = useWatch({ control: form.control, name: 'planCurricularId' });
  const selectedCycle = useWatch({ control: form.control, name: 'ciclo' });
  const selectedPrerequisites = useWatch({ control: form.control, name: 'prerequisiteIds' }) ?? [];
  const prerequisiteOptions = useMemo(
    () => (planCourses.data ?? []).filter((row) => (
      row.id !== id
      && row.planCurricularId === selectedPlanId
      && row.ciclo < selectedCycle
    )),
    [id, planCourses.data, selectedCycle, selectedPlanId],
  );
  const mutation = useMutation({
    mutationFn: (values: PlanCourseValues) => (
      mode === 'edit' && id
        ? updatePlanCourse(id, {
          ciclo: values.ciclo,
          orden: values.orden,
          estado: values.estado,
          prerequisiteIds: values.prerequisiteIds,
        })
        : createPlanCourse(values)
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['academic', 'plan-courses'] });
      navigate(`/estructura/plan-cursos?planId=${selectedPlanId || selectedPlanFromUrl}`);
    },
  });

  if (mode !== 'list') {
    return (
      <EntityForm error={mutation.error} isPending={mutation.isPending} mode={mode} onCancel={() => navigate('/estructura/plan-cursos')} onSubmit={form.handleSubmit((values) => mutation.mutate(values))} title="curso por plan">
        <FormField error={form.formState.errors.planCurricularId?.message} htmlFor="planCurricularId" label="Plan curricular">
          <select
            className="form-select"
            disabled={mode === 'edit'}
            id="planCurricularId"
            {...form.register('planCurricularId')}
            onChange={(event) => {
              form.setValue('planCurricularId', event.target.value, { shouldDirty: true, shouldValidate: true });
              form.setValue('prerequisiteIds', [], { shouldDirty: true });
            }}
          >
            <option value="">Seleccionar</option>
            {plans.data?.map((plan) => <option key={plan.id} value={plan.id}>{plan.codigo} - {plan.nombre}</option>)}
          </select>
        </FormField>
        <FormField error={form.formState.errors.cursoId?.message} htmlFor="cursoId" label="Curso">
          <select className="form-select" disabled={mode === 'edit'} id="cursoId" {...form.register('cursoId')}>
            <option value="">Seleccionar</option>
            {courses.data?.map((course) => <option key={course.id} value={course.id}>{course.codigo} - {course.nombre}</option>)}
          </select>
        </FormField>
        <FormField error={form.formState.errors.ciclo?.message} htmlFor="ciclo" label="Ciclo">
          <Input
            id="ciclo"
            min={1}
            type="number"
            {...form.register('ciclo', { valueAsNumber: true })}
            onChange={(event) => {
              form.setValue('ciclo', event.target.valueAsNumber, { shouldDirty: true, shouldValidate: true });
              form.setValue('prerequisiteIds', [], { shouldDirty: true });
            }}
          />
        </FormField>
        <FormField error={form.formState.errors.orden?.message} htmlFor="orden" label="Orden">
          <Input id="orden" min={1} type="number" {...form.register('orden', { valueAsNumber: true })} />
        </FormField>
        {[0, 1].map((index) => (
          <FormField
            error={form.formState.errors.prerequisiteIds?.message}
            htmlFor={`prerequisite-${index}`}
            key={index}
            label={`Prerrequisito ${index + 1} (opcional)`}
          >
            <select
              className="form-select"
              id={`prerequisite-${index}`}
              onChange={(event) => {
                const next = [...selectedPrerequisites];
                if (event.target.value) next[index] = event.target.value;
                else next.splice(index, 1);
                form.setValue('prerequisiteIds', next.filter(Boolean), { shouldValidate: true });
              }}
              value={selectedPrerequisites[index] ?? ''}
            >
              <option value="">Ninguno</option>
              {prerequisiteOptions.map((row) => (
                <option
                  disabled={selectedPrerequisites.some((value, selectedIndex) => selectedIndex !== index && value === row.id)}
                  key={row.id}
                  value={row.id}
                >
                  {courseInPlanLabel(row, plans.data, courses.data)}
                </option>
              ))}
            </select>
          </FormField>
        ))}
        {mode === 'edit' ? <StateSelect register={form.register('estado')} /> : null}
      </EntityForm>
    );
  }

  const rows = (planCourses.data ?? [])
    .filter((row) => row.planCurricularId === selectedPlanFromUrl)
    .sort((a, b) => a.ciclo - b.ciclo || a.orden - b.orden);
  const cycles = [...new Set(rows.map((row) => row.ciclo))];
  return (
    <div className="curriculum-view">
      <section className="curriculum-toolbar">
        <FormField htmlFor="career-filter" label="Carrera">
          <select
            className="form-select"
            id="career-filter"
            onChange={(event) => setSearchParams(event.target.value ? { careerId: event.target.value } : {})}
            value={selectedCareerId}
          >
            <option value="">Seleccionar carrera</option>
            {careers.data?.map((career) => (
              <option key={career.id} value={career.id}>{career.nombre}</option>
            ))}
          </select>
        </FormField>
        <FormField htmlFor="plan-filter" label="Plan curricular">
          <select
            className="form-select"
            disabled={!selectedCareerId}
            id="plan-filter"
            onChange={(event) => setSearchParams(event.target.value
              ? { careerId: selectedCareerId, planId: event.target.value }
              : { careerId: selectedCareerId })}
            value={selectedPlanFromUrl}
          >
            <option value="">Seleccionar plan</option>
            {planOptions.map((plan) => (
              <option key={plan.id} value={plan.id}>{plan.nombre} · version {plan.version}</option>
            ))}
          </select>
        </FormField>
        {selectedPlanFromUrl ? (
          <Button asChild>
            <Link to={`/estructura/plan-cursos/nueva?planId=${selectedPlanFromUrl}`}>Agregar curso</Link>
          </Button>
        ) : <Button disabled type="button">Agregar curso</Button>}
      </section>

      {!selectedPlanFromUrl ? (
        <section className="table-state">
          <h2>Selecciona una carrera y un plan.</h2>
          <p>La malla curricular se organizara por ciclos.</p>
        </section>
      ) : null}
      {selectedPlanFromUrl && rows.length === 0 && !planCourses.isPending ? (
        <section className="table-state">
          <h2>Este plan aun no tiene cursos.</h2>
          <p>Agrega el primer curso para comenzar la malla.</p>
        </section>
      ) : null}
      {selectedPlanFromUrl && rows.length > 0 ? (
        <div className="curriculum-cycles">
          {cycles.map((cycle) => (
            <section className="curriculum-cycle" key={cycle}>
              <header>
                <span>Ciclo</span>
                <strong>{cycle}</strong>
              </header>
              <table>
                <thead>
                  <tr><th>Curso</th><th>Tipo</th><th>Prerrequisitos</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {rows.filter((row) => row.ciclo === cycle).map((row) => {
                    const course = courses.data?.find((item) => item.id === row.cursoId);
                    const prerequisites = row.prerequisiteIds.map((prerequisiteId) => {
                      const prerequisite = planCourses.data?.find((item) => item.id === prerequisiteId);
                      return prerequisite ? nameById(courses.data, prerequisite.cursoId) : 'No encontrado';
                    });
                    return (
                      <tr key={row.id}>
                        <td><strong>{course?.nombre ?? 'No encontrado'}</strong><span>{course?.codigo}</span></td>
                        <td className="text-capitalize">{course?.tipo}</td>
                        <td>{prerequisites.length ? prerequisites.join(', ') : 'Ninguno'}</td>
                        <td><EditButton to={`/estructura/plan-cursos/${row.id}?planId=${selectedPlanFromUrl}`} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AcademicPeriodsEntity({ id, mode }: { id?: string; mode: Mode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const careerFilter = searchParams.get('careerId') ?? '';
  const yearFilter = Number(searchParams.get('year')) || undefined;
  const periods = useQuery({
    queryKey: ['academic', 'periods', careerFilter, yearFilter],
    queryFn: () => getAcademicPeriods({ carreraId: careerFilter || undefined, anio: yearFilter }),
    staleTime: 30_000,
  });
  const careers = useQuery({ queryKey: ['academic', 'careers'], queryFn: getCareers, staleTime: 60_000 });
  const current = periods.data?.find((row) => row.id === id);
  const form = useForm<AcademicPeriodValues>({
    resolver: zodResolver(academicPeriodSchema),
    defaultValues: emptyAcademicPeriod,
  });
  useEffect(() => {
    form.reset(current ? {
      carreraId: current.carreraId,
      anio: current.anio,
      periodo: current.periodo,
      fechaInicio: current.fechaInicio,
      fechaFin: current.fechaFin,
      estado: current.estado,
    } : emptyAcademicPeriod);
  }, [current, form, id, mode]);
  const year = useWatch({ control: form.control, name: 'anio' });
  const periodNumber = useWatch({ control: form.control, name: 'periodo' });
  const selectedCareerId = useWatch({ control: form.control, name: 'carreraId' });
  const selectedCareerName = careers.data?.find((career) => career.id === selectedCareerId)?.nombre ?? '';
  const mutation = useMutation({
    mutationFn: (values: AcademicPeriodValues) => (
      mode === 'edit' && id
        ? updateAcademicPeriod(id, values)
        : createAcademicPeriod(values)
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['academic', 'periods'] });
      navigate('/estructura/periodos-academicos');
    },
  });

  if (mode !== 'list') {
    return (
      <EntityForm error={mutation.error} isPending={mutation.isPending} mode={mode} onCancel={() => navigate('/estructura/periodos-academicos')} onSubmit={form.handleSubmit((values) => mutation.mutate(values))} title="periodo academico">
        <FormField error={form.formState.errors.carreraId?.message} htmlFor="carreraId" label="Carrera">
          <select className="form-select" id="carreraId" {...form.register('carreraId')}>
            <option value="">Seleccionar carrera</option>
            {careers.data?.map((career) => (
              <option key={career.id} value={career.id}>{career.nombre}</option>
            ))}
          </select>
        </FormField>
        <FormField error={form.formState.errors.anio?.message} htmlFor="anio" label="Año">
          <Input id="anio" min={1900} max={9999} type="number" {...form.register('anio', { valueAsNumber: true })} />
        </FormField>
        <FormField error={form.formState.errors.periodo?.message} htmlFor="periodo" label="Periodo">
          <select className="form-select" id="periodo" {...form.register('periodo')}>
            <option value="I">I</option>
            <option value="II">II</option>
            <option value="III">III</option>
          </select>
        </FormField>
        <FormField htmlFor="nombre" label="Nombre">
          <Input disabled id="nombre" value={`${selectedCareerName} ${year || ''}-${periodNumber}`.trim()} />
        </FormField>
        <FormField error={form.formState.errors.fechaInicio?.message} htmlFor="fechaInicio" label="Fecha inicio">
          <Input id="fechaInicio" type="date" {...form.register('fechaInicio')} />
        </FormField>
        <FormField error={form.formState.errors.fechaFin?.message} htmlFor="fechaFin" label="Fecha fin">
          <Input id="fechaFin" type="date" {...form.register('fechaFin')} />
        </FormField>
        {mode === 'edit' ? (
          <FormField htmlFor="estado-periodo" label="Estado">
            <select className="form-select" id="estado-periodo" {...form.register('estado')}>
              <option value="activo">Activo</option>
              <option value="culminado">Culminado</option>
            </select>
          </FormField>
        ) : null}
      </EntityForm>
    );
  }

  return (
    <div className="periods-view">
      <section className="curriculum-toolbar">
        <FormField htmlFor="period-career-filter" label="Carrera">
          <select
            className="form-select"
            id="period-career-filter"
            onChange={(event) => {
              const next = new URLSearchParams(searchParams);
              if (event.target.value) next.set('careerId', event.target.value);
              else next.delete('careerId');
              setSearchParams(next);
            }}
            value={careerFilter}
          >
            <option value="">Todas las carreras</option>
            {careers.data?.map((career) => <option key={career.id} value={career.id}>{career.nombre}</option>)}
          </select>
        </FormField>
        <FormField htmlFor="period-year-filter" label="Año">
          <Input
            id="period-year-filter"
            min={1900}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams);
              if (event.target.value) next.set('year', event.target.value);
              else next.delete('year');
              setSearchParams(next);
            }}
            type="number"
            value={yearFilter ?? ''}
          />
        </FormField>
      </section>
      <AcademicTable columns={['Carrera', 'Año', 'Periodo', 'Nombre', 'Inicio', 'Fin', 'Estado', 'Acciones']} empty="Aun no hay periodos academicos." isError={periods.isError} isPending={periods.isPending} onRetry={() => void periods.refetch()}>
        {periods.data?.map((period: AcademicPeriod) => (
          <tr key={period.id}>
            <td>{nameById(careers.data, period.carreraId)}</td>
            <td><span className="document-value">{period.anio}</span></td>
            <td>{period.periodo}</td>
            <td><strong>{period.nombre}</strong></td>
            <td>{period.fechaInicio}</td>
            <td>{period.fechaFin}</td>
            <td><StatusBadge active={period.estado === 'activo'} /></td>
            <td className="table-actions"><EditButton to={`/estructura/periodos-academicos/${period.id}`} /></td>
          </tr>
        ))}
      </AcademicTable>
    </div>
  );
}

function CatalogForm({
  error,
  form,
  isPending,
  mode,
  onCancel,
  onSubmit,
  title,
}: {
  error: unknown;
  form: ReturnType<typeof useForm<CatalogValues>>;
  isPending: boolean;
  mode: Mode;
  onCancel: () => void;
  onSubmit: (values: CatalogValues) => void;
  title: string;
}) {
  return (
    <EntityForm error={error} isPending={isPending} mode={mode} onCancel={onCancel} onSubmit={form.handleSubmit(onSubmit)} title={title}>
      <FormField error={form.formState.errors.codigo?.message} htmlFor="codigo" label="Codigo">
        <Input id="codigo" {...form.register('codigo')} />
      </FormField>
      <FormField error={form.formState.errors.nombre?.message} htmlFor="nombre" label="Nombre">
        <Input id="nombre" {...form.register('nombre')} />
      </FormField>
      <FormField error={form.formState.errors.descripcion?.message} htmlFor="descripcion" label="Descripcion">
        <Input id="descripcion" {...form.register('descripcion')} />
      </FormField>
      {mode === 'edit' ? <StateSelect register={form.register('estado')} /> : null}
    </EntityForm>
  );
}

function EntityForm({
  children,
  error,
  isPending,
  mode,
  onCancel,
  onSubmit,
  title,
}: {
  children: React.ReactNode;
  error: unknown;
  isPending: boolean;
  mode: Mode;
  onCancel: () => void;
  onSubmit: () => void;
  title: string;
}) {
  return (
    <form className="entity-form form-page" onSubmit={onSubmit}>
      <section>
        <header>
          <span>01</span>
          <div>
            <h2>{mode === 'edit' ? `Editar ${title}` : `Crear ${title}`}</h2>
            <p>Los cambios quedan sujetos a las reglas y validaciones del backend.</p>
          </div>
        </header>
        <div className="form-grid">{children}</div>
      </section>
      {error ? <div className="error-banner">{getApiErrorMessage(error, 'No se pudo guardar el registro.')}</div> : null}
      <div className="form-actions">
        <Button disabled={isPending} onClick={onCancel} type="button" variant="secondary">Cancelar</Button>
        <Button disabled={isPending} type="submit">{isPending ? 'Guardando...' : 'Guardar'}</Button>
      </div>
    </form>
  );
}

function StateSelect({ register }: { register: UseFormRegisterReturn<'estado'> }) {
  return (
    <FormField htmlFor="estado" label="Estado">
      <select className="form-select" id="estado" {...register}>
        <option value="activo">Activo</option>
        <option value="inactivo">Inactivo</option>
      </select>
    </FormField>
  );
}

function EditButton({ to }: { to: string }) {
  return (
    <Button asChild className="table-action-button" variant="ghost">
      <Link to={to}>
        <SquarePen size={15} />
        Editar
      </Link>
    </Button>
  );
}

function AcademicTable({
  children,
  columns,
  empty,
  isError,
  isPending,
  onRetry,
}: {
  children: React.ReactNode;
  columns: string[];
  empty: string;
  isError: boolean;
  isPending: boolean;
  onRetry: () => void;
}) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : children;
  if (isError) {
    return (
      <section className="table-state is-error">
        <p>No pudimos cargar la informacion.</p>
        <button onClick={onRetry} type="button">Reintentar</button>
      </section>
    );
  }
  if (isPending) return <section className="table-state">Cargando informacion...</section>;
  if (Array.isArray(rows) && rows.length === 0) {
    return (
      <section className="table-state">
        <h2>{empty}</h2>
        <p>Los registros apareceran aqui cuando sean creados.</p>
      </section>
    );
  }
  return (
    <div className="data-table-wrap academic-table-wrap">
      <table className="data-table academic-table">
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
