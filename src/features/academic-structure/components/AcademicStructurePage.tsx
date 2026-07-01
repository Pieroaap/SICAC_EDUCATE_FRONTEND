import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpenCheck, CalendarDays, GitBranch, Layers3, ListTree, SquarePen } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm, useWatch, type UseFormRegisterReturn } from 'react-hook-form';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
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
  courseSchema,
  curriculumPlanSchema,
  planCourseSchema,
  type AcademicPeriodValues,
  type CatalogValues,
  type CourseValues,
  type CurriculumPlanValues,
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
  updateCurriculumPlan,
  updatePlanCourse,
} from '../api/academicStructureApi';

type EntityKey = 'carreras' | 'planes-curriculares' | 'cursos' | 'plan-cursos' | 'periodos-academicos';
type Mode = 'list' | 'create' | 'edit';

const entityOptions: Array<{ key: EntityKey; label: string; icon: typeof Layers3 }> = [
  { key: 'carreras', label: 'Carreras', icon: Layers3 },
  { key: 'planes-curriculares', label: 'Planes curriculares', icon: ListTree },
  { key: 'cursos', label: 'Cursos', icon: BookOpenCheck },
  { key: 'plan-cursos', label: 'Cursos por plan', icon: GitBranch },
  { key: 'periodos-academicos', label: 'Periodos academicos', icon: CalendarDays },
];
const emptyCourse: CourseValues = { codigo: '', nombre: '', tipo: 'obligatorio', estado: 'activo' };
const emptyPlanCourse: PlanCourseValues = {
  planCurricularId: '', cursoId: '', ciclo: 1, orden: 1, estado: 'activo', prerequisiteIds: [],
};
const emptyAcademicPeriod: AcademicPeriodValues = {
  anio: new Date().getFullYear(), periodo: 'I', fechaInicio: '', fechaFin: '', estado: 'activo',
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
        {mode === 'list' ? (
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

      {entity === 'carreras' ? <CatalogEntity id={id} mode={mode} /> : null}
      {entity === 'cursos' ? <CourseEntity id={id} mode={mode} /> : null}
      {entity === 'planes-curriculares' ? <CurriculumPlansEntity id={id} mode={mode} /> : null}
      {entity === 'plan-cursos' ? <PlanCoursesEntity id={id} mode={mode} /> : null}
      {entity === 'periodos-academicos' ? <AcademicPeriodsEntity id={id} mode={mode} /> : null}
    </main>
  );
}

function CatalogEntity({ id, mode }: { id?: string; mode: Mode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const queryKey = ['academic', 'careers'];
  const rows = useQuery({
    queryKey,
    queryFn: getCareers,
    staleTime: 30_000,
  });
  const current = rows.data?.find((row) => row.id === id);
  const form = useForm<CatalogValues>({
    resolver: zodResolver(catalogSchema),
    defaultValues: { codigo: '', nombre: '', descripcion: '', estado: 'activo' },
  });
  useEffect(() => {
    form.reset(current ? {
      codigo: current.codigo,
      nombre: current.nombre,
      descripcion: current.descripcion ?? undefined,
      estado: current.estado,
    } : { codigo: '', nombre: '', descripcion: '', estado: 'activo' });
  }, [current, form, id, mode]);
  const mutation = useMutation({
    mutationFn: (values: CatalogValues) => {
      return mode === 'edit' && id
        ? updateCareer(id, values)
        : createCareer(values);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      navigate('/estructura/carreras');
    },
  });

  if (mode !== 'list') {
    return (
      <CatalogForm
        error={mutation.error}
        form={form}
        isPending={mutation.isPending}
        mode={mode}
        onCancel={() => navigate('/estructura/carreras')}
        onSubmit={(values) => mutation.mutate(values)}
        title="carrera"
      />
    );
  }

  return (
    <AcademicTable
      columns={['Codigo', 'Nombre', 'Descripcion', 'Estado', 'Acciones']}
      empty="Aun no hay registros."
      isError={rows.isError}
      isPending={rows.isPending}
      onRetry={() => void rows.refetch()}
    >
      {rows.data?.map((row) => (
        <tr key={row.id}>
          <td><span className="document-value">{row.codigo}</span></td>
          <td><strong>{row.nombre}</strong></td>
          <td>{row.descripcion ?? 'Sin descripcion'}</td>
          <td><StatusBadge active={row.estado === 'activo'} /></td>
          <td className="table-actions"><EditButton to={`/estructura/carreras/${row.id}`} /></td>
        </tr>
      ))}
    </AcademicTable>
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

function CurriculumPlansEntity({ id, mode }: { id?: string; mode: Mode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const plans = useQuery({ queryKey: ['academic', 'plans'], queryFn: getCurriculumPlans, staleTime: 30_000 });
  const careers = useQuery({ queryKey: ['academic', 'careers'], queryFn: getCareers, staleTime: 60_000 });
  const current = plans.data?.find((row) => row.id === id);
  const form = useForm<CurriculumPlanValues>({
    resolver: zodResolver(curriculumPlanSchema),
    defaultValues: { carreraId: '', codigo: '', nombre: '', version: '', estado: 'activo' },
  });
  useEffect(() => {
    form.reset(current
      ? { ...current }
      : { carreraId: '', codigo: '', nombre: '', version: '', estado: 'activo' });
  }, [current, form, id, mode]);
  const mutation = useMutation({
    mutationFn: (values: CurriculumPlanValues) => (
      mode === 'edit' && id
        ? updateCurriculumPlan(id, { nombre: values.nombre, version: values.version, estado: values.estado })
        : createCurriculumPlan(values)
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['academic', 'plans'] });
      navigate('/estructura/planes-curriculares');
    },
  });

  if (mode !== 'list') {
    return (
      <EntityForm
        error={mutation.error}
        isPending={mutation.isPending}
        mode={mode}
        onCancel={() => navigate('/estructura/planes-curriculares')}
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        title="plan curricular"
      >
        <FormField error={form.formState.errors.carreraId?.message} htmlFor="carreraId" label="Carrera">
          <select className="form-select" disabled={mode === 'edit'} id="carreraId" {...form.register('carreraId')}>
            <option value="">Seleccionar</option>
            {careers.data?.map((career) => <option key={career.id} value={career.id}>{career.codigo} - {career.nombre}</option>)}
          </select>
        </FormField>
        <FormField error={form.formState.errors.codigo?.message} htmlFor="codigo" label="Codigo">
          <Input disabled={mode === 'edit'} id="codigo" {...form.register('codigo')} />
        </FormField>
        <FormField error={form.formState.errors.nombre?.message} htmlFor="nombre" label="Nombre">
          <Input id="nombre" {...form.register('nombre')} />
        </FormField>
        <FormField error={form.formState.errors.version?.message} htmlFor="version" label="Version">
          <Input id="version" {...form.register('version')} />
        </FormField>
        {mode === 'edit' ? <StateSelect register={form.register('estado')} /> : null}
      </EntityForm>
    );
  }

  return (
    <AcademicTable columns={['Codigo', 'Plan', 'Carrera', 'Version', 'Estado', 'Acciones']} empty="Aun no hay planes curriculares." isError={plans.isError} isPending={plans.isPending} onRetry={() => void plans.refetch()}>
      {plans.data?.map((plan) => (
        <tr key={plan.id}>
          <td><span className="document-value">{plan.codigo}</span></td>
          <td><strong>{plan.nombre}</strong></td>
          <td>{nameById(careers.data, plan.carreraId)}</td>
          <td>{plan.version}</td>
          <td><StatusBadge active={plan.estado === 'activo'} /></td>
          <td className="table-actions"><EditButton to={`/estructura/planes-curriculares/${plan.id}`} /></td>
        </tr>
      ))}
    </AcademicTable>
  );
}

function PlanCoursesEntity({ id, mode }: { id?: string; mode: Mode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const planCourses = useQuery({ queryKey: ['academic', 'plan-courses'], queryFn: getPlanCourses, staleTime: 30_000 });
  const plans = useQuery({ queryKey: ['academic', 'plans'], queryFn: getCurriculumPlans, staleTime: 60_000 });
  const courses = useQuery({ queryKey: ['academic', 'courses'], queryFn: getCourses, staleTime: 60_000 });
  const current = planCourses.data?.find((row) => row.id === id);
  const form = useForm<PlanCourseValues>({
    resolver: zodResolver(planCourseSchema),
    defaultValues: emptyPlanCourse,
  });
  useEffect(() => {
    form.reset(current ? { ...current, prerequisiteIds: current.prerequisiteIds ?? [] } : emptyPlanCourse);
  }, [current, form, id, mode]);
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
      navigate('/estructura/plan-cursos');
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

  const rows = [...(planCourses.data ?? [])].sort((a, b) => a.ciclo - b.ciclo || a.orden - b.orden);
  return (
    <AcademicTable columns={['Plan', 'Curso', 'Ciclo', 'Orden', 'Prerrequisitos', 'Estado', 'Acciones']} empty="Aun no hay cursos asignados a planes." isError={planCourses.isError} isPending={planCourses.isPending} onRetry={() => void planCourses.refetch()}>
      {rows.map((row) => (
        <tr key={row.id}>
          <td>{nameById(plans.data, row.planCurricularId)}</td>
          <td><strong>{nameById(courses.data, row.cursoId)}</strong></td>
          <td>{row.ciclo}</td>
          <td>{row.orden}</td>
          <td>
            {row.prerequisiteIds.length > 0
              ? row.prerequisiteIds.map((prerequisiteId) => {
                const prerequisite = planCourses.data?.find((item) => item.id === prerequisiteId);
                return prerequisite ? nameById(courses.data, prerequisite.cursoId) : 'No encontrado';
              }).join(', ')
              : 'Ninguno'}
          </td>
          <td><StatusBadge active={row.estado === 'activo'} /></td>
          <td className="table-actions"><EditButton to={`/estructura/plan-cursos/${row.id}`} /></td>
        </tr>
      ))}
    </AcademicTable>
  );
}

function AcademicPeriodsEntity({ id, mode }: { id?: string; mode: Mode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const periods = useQuery({ queryKey: ['academic', 'periods'], queryFn: getAcademicPeriods, staleTime: 30_000 });
  const current = periods.data?.find((row) => row.id === id);
  const form = useForm<AcademicPeriodValues>({
    resolver: zodResolver(academicPeriodSchema),
    defaultValues: emptyAcademicPeriod,
  });
  useEffect(() => {
    form.reset(current ? {
      anio: current.anio,
      periodo: current.periodo,
      fechaInicio: current.fechaInicio,
      fechaFin: current.fechaFin,
      estado: current.estado,
    } : emptyAcademicPeriod);
  }, [current, form, id, mode]);
  const year = useWatch({ control: form.control, name: 'anio' });
  const periodNumber = useWatch({ control: form.control, name: 'periodo' });
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
          <Input disabled id="nombre" value={`${year || ''} - ${periodNumber}`} />
        </FormField>
        <FormField error={form.formState.errors.fechaInicio?.message} htmlFor="fechaInicio" label="Fecha inicio">
          <Input id="fechaInicio" type="date" {...form.register('fechaInicio')} />
        </FormField>
        <FormField error={form.formState.errors.fechaFin?.message} htmlFor="fechaFin" label="Fecha fin">
          <Input id="fechaFin" type="date" {...form.register('fechaFin')} />
        </FormField>
        {mode === 'edit' ? <StateSelect register={form.register('estado')} /> : null}
      </EntityForm>
    );
  }

  return (
    <AcademicTable columns={['Año', 'Periodo', 'Nombre', 'Inicio', 'Fin', 'Estado', 'Acciones']} empty="Aun no hay periodos academicos." isError={periods.isError} isPending={periods.isPending} onRetry={() => void periods.refetch()}>
      {periods.data?.map((period: AcademicPeriod) => (
        <tr key={period.id}>
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
