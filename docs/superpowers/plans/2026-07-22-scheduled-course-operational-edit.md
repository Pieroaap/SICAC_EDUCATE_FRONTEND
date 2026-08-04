# Scheduled Course Operational Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visible edit action for scheduled courses so academic managers can update professor, section, state, capacity, and structured schedule blocks without changing academic identity or related records.

**Architecture:** Keep `PATCH /cursos-programados/:id` as the authority and add only frontend integration. Share one scheduled-course form between create and edit modes, map API records into explicit form values, and map submitted values into create or update payloads so identity fields never enter the update request.

**Tech Stack:** React 19, TypeScript strict, React Hook Form, Zod, TanStack Query, Axios, Vitest, Tailwind CSS v4 with project CSS tokens.

## Global Constraints

- Editable fields are professor, section, state, maximum capacity, and one or more structured schedule blocks.
- Course, career, curriculum plan, and academic period remain read-only during editing.
- Editing must not alter enrollments, grades, attendance, documents, or wall posts.
- The backend remains the permissions and integrity authority.
- Reuse the existing `operation-form`, `FormField`, `Input`, and `Button` visual patterns.
- Invalidate only `['operation', 'scheduled-courses']` after a successful update.
- No database migration or backend endpoint change is required.

---

### Task 1: Model operational form values and payload mapping

**Files:**
- Modify: `src/features/academic-operation/academicOperationForms.ts`
- Modify: `src/features/academic-operation/academicOperationForms.test.ts`
- Create: `src/features/academic-operation/scheduledCourseEditing.ts`
- Create: `src/features/academic-operation/scheduledCourseEditing.test.ts`

**Interfaces:**
- Consumes: `ScheduledCourse` from `src/api/types.ts`.
- Produces: `scheduledCourseOperationalSchema`, `ScheduledCourseValues`, `emptyScheduleBlock`, `scheduledCourseToFormValues(course)`, `toCreateScheduledCoursePayload(values)`, and `toUpdateScheduledCoursePayload(values)`.

- [ ] **Step 1: Add failing schema tests for operational fields**

Extend `academicOperationForms.test.ts` with cases that prove defaults and validation:

```ts
it('completa los campos operativos predeterminados', () => {
  const result = scheduledCourseSchema.parse({
    carreraId: id,
    planCurricularId: id,
    planCursoId: id,
    periodoAcademicoId: id,
    profesorPersonaId: id,
  });
  expect(result.seccion).toBe('ÚNICA');
  expect(result.estado).toBe('activo');
  expect(result.horarios).toHaveLength(1);
});

it('rechaza una sección vacía y un cupo no positivo', () => {
  const base = {
    carreraId: id,
    planCurricularId: id,
    planCursoId: id,
    periodoAcademicoId: id,
    profesorPersonaId: id,
    horarios: [{
      dia: 'lunes', horaInicio: '18:00', horaFin: '20:00',
      modalidad: 'presencial', ubicacion: 'Sala 1',
    }],
  };
  expect(scheduledCourseSchema.safeParse({ ...base, seccion: '' }).success).toBe(false);
  expect(scheduledCourseSchema.safeParse({ ...base, cupoMaximo: 0 }).success).toBe(false);
});

it('rechaza horarios invertidos o sin ubicación', () => {
  const base = {
    carreraId: id,
    planCurricularId: id,
    planCursoId: id,
    periodoAcademicoId: id,
    profesorPersonaId: id,
    seccion: 'A',
    estado: 'activo',
  };
  expect(scheduledCourseSchema.safeParse({
    ...base,
    horarios: [{ dia: 'lunes', horaInicio: '20:00', horaFin: '18:00', modalidad: 'presencial', ubicacion: 'Sala 1' }],
  }).success).toBe(false);
  expect(scheduledCourseSchema.safeParse({
    ...base,
    horarios: [{ dia: 'lunes', horaInicio: '18:00', horaFin: '20:00', modalidad: 'presencial', ubicacion: '' }],
  }).success).toBe(false);
});
```

- [ ] **Step 2: Run the schema test and verify it fails**

Run: `npm test -- src/features/academic-operation/academicOperationForms.test.ts`

Expected: FAIL because `seccion` and `estado` are not returned by the current schema.

- [ ] **Step 3: Extract the schedule block and operational schema**

Replace the scheduled-course schema definition in `academicOperationForms.ts` with:

```ts
export const emptyScheduleBlock = {
  dia: 'lunes' as const,
  horaInicio: '18:00',
  horaFin: '20:00',
  modalidad: 'presencial' as const,
  ubicacion: '',
};

export const scheduleBlockSchema = z.object({
  dia: z.enum(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  horaFin: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  modalidad: z.enum(['presencial', 'virtual', 'hibrido']),
  ubicacion: z.string().trim().min(1, 'Indica aula o enlace').max(200),
}).refine((value) => value.horaFin > value.horaInicio, {
  message: 'La hora de fin debe ser posterior al inicio',
  path: ['horaFin'],
});

export const scheduledCourseOperationalSchema = z.object({
  profesorPersonaId: uuid('Selecciona un profesor'),
  seccion: z.string().trim().min(1, 'Indica una sección').max(30).default('ÚNICA'),
  estado: z.enum(['activo', 'inactivo']).default('activo'),
  cupoMaximo: z.number().int().positive().max(500).nullable().default(20),
  horarios: z.array(scheduleBlockSchema).min(1, 'Agrega al menos un horario')
    .default([{ ...emptyScheduleBlock }]),
});

export const scheduledCourseSchema = scheduledCourseOperationalSchema.extend({
  carreraId: uuid('Selecciona una carrera'),
  planCurricularId: uuid('Selecciona un plan'),
  planCursoId: uuid('Selecciona un curso'),
  periodoAcademicoId: uuid('Selecciona un periodo'),
});

export type ScheduledCourseValues = z.infer<typeof scheduledCourseSchema>;
export type ScheduledCourseInput = z.input<typeof scheduledCourseSchema>;
```

- [ ] **Step 4: Add failing mapping tests**

Create `scheduledCourseEditing.test.ts` with a complete `ScheduledCourse` fixture and these assertions:

```ts
import { describe, expect, it } from 'vitest';
import type { ScheduledCourse } from '../../api/types';
import {
  scheduledCourseToFormValues,
  toCreateScheduledCoursePayload,
  toUpdateScheduledCoursePayload,
} from './scheduledCourseEditing';

const course: ScheduledCourse = {
  id: '00000000-0000-4000-8000-000000000001',
  seccion: 'A', estado: 'activo',
  planCursoId: '00000000-0000-4000-8000-000000000002',
  cursoId: '00000000-0000-4000-8000-000000000003',
  cursoCodigo: 'ACT201', cursoNombre: 'Actuación II', ciclo: 2,
  planCurricularId: '00000000-0000-4000-8000-000000000004', planNombre: 'Plan 2026',
  carreraId: '00000000-0000-4000-8000-000000000005', carreraNombre: 'Club Escuela',
  periodoAcademicoId: '00000000-0000-4000-8000-000000000006', periodoNombre: '2026-I',
  profesorPersonaId: '00000000-0000-4000-8000-000000000007', profesorNombres: 'Ana',
  profesorApellidoPaterno: 'Ruiz', profesorApellidoMaterno: null,
  cupoMaximo: null,
  horarios: [{
    id: '00000000-0000-4000-8000-000000000008', dia: 'martes',
    horaInicio: '18:00:00', horaFin: '20:00:00', modalidad: 'presencial', ubicacion: 'Sala 2',
  }],
};

describe('edición de cursos programados', () => {
  it('convierte el registro API en valores editables', () => {
    expect(scheduledCourseToFormValues(course)).toMatchObject({
      carreraId: course.carreraId,
      planCursoId: course.planCursoId,
      profesorPersonaId: course.profesorPersonaId,
      seccion: 'A', estado: 'activo', cupoMaximo: null,
      horarios: [{ horaInicio: '18:00', horaFin: '20:00', ubicacion: 'Sala 2' }],
    });
  });

  it('excluye la identidad académica del payload de actualización', () => {
    const values = scheduledCourseToFormValues(course);
    expect(toUpdateScheduledCoursePayload(values)).toEqual({
      profesorPersonaId: course.profesorPersonaId,
      seccion: 'A', estado: 'activo', cupoMaximo: null,
      horarios: [{ dia: 'martes', horaInicio: '18:00', horaFin: '20:00', modalidad: 'presencial', ubicacion: 'Sala 2' }],
    });
    expect(toCreateScheduledCoursePayload(values)).toMatchObject({
      planCursoId: course.planCursoId,
      periodoAcademicoId: course.periodoAcademicoId,
      seccion: 'A',
    });
  });
});
```

- [ ] **Step 5: Run the mapping test and verify it fails**

Run: `npm test -- src/features/academic-operation/scheduledCourseEditing.test.ts`

Expected: FAIL because `scheduledCourseEditing.ts` does not exist.

- [ ] **Step 6: Implement explicit form and payload mapping**

Create `scheduledCourseEditing.ts`:

```ts
import type { ScheduledCourse } from '../../api/types';
import { emptyScheduleBlock, type ScheduledCourseValues } from './academicOperationForms';

export type ScheduledCourseUpdatePayload = Pick<
  ScheduledCourseValues,
  'profesorPersonaId' | 'seccion' | 'estado' | 'cupoMaximo' | 'horarios'
>;

export function scheduledCourseToFormValues(course: ScheduledCourse): ScheduledCourseValues {
  return {
    carreraId: course.carreraId,
    planCurricularId: course.planCurricularId,
    planCursoId: course.planCursoId,
    periodoAcademicoId: course.periodoAcademicoId,
    profesorPersonaId: course.profesorPersonaId,
    seccion: course.seccion,
    estado: course.estado,
    cupoMaximo: course.cupoMaximo,
    horarios: course.horarios.length ? course.horarios.map((item) => ({
      dia: item.dia,
      horaInicio: item.horaInicio.slice(0, 5),
      horaFin: item.horaFin.slice(0, 5),
      modalidad: item.modalidad,
      ubicacion: item.ubicacion ?? '',
    })) : [{ ...emptyScheduleBlock }],
  };
}

export function toCreateScheduledCoursePayload(values: ScheduledCourseValues) {
  return {
    planCursoId: values.planCursoId,
    periodoAcademicoId: values.periodoAcademicoId,
    profesorPersonaId: values.profesorPersonaId,
    seccion: values.seccion,
    cupoMaximo: values.cupoMaximo ?? undefined,
    horarios: values.horarios,
  };
}

export function toUpdateScheduledCoursePayload(
  values: ScheduledCourseValues,
): ScheduledCourseUpdatePayload {
  return {
    profesorPersonaId: values.profesorPersonaId,
    seccion: values.seccion,
    estado: values.estado,
    cupoMaximo: values.cupoMaximo,
    horarios: values.horarios,
  };
}
```

- [ ] **Step 7: Run both unit-test files**

Run: `npm test -- src/features/academic-operation/academicOperationForms.test.ts src/features/academic-operation/scheduledCourseEditing.test.ts`

Expected: both test files PASS.

- [ ] **Step 8: Commit the domain changes**

```powershell
git add src/features/academic-operation/academicOperationForms.ts src/features/academic-operation/academicOperationForms.test.ts src/features/academic-operation/scheduledCourseEditing.ts src/features/academic-operation/scheduledCourseEditing.test.ts
git commit -m "test: definir edición operativa de cursos"
```

---

### Task 2: Add the update API client

**Files:**
- Modify: `src/features/academic-operation/api/academicOperationApi.ts`

**Interfaces:**
- Consumes: `ScheduledCourseUpdatePayload` from `scheduledCourseEditing.ts`.
- Produces: `updateScheduledCourse(id, input): Promise<ScheduledCourse>`.

- [ ] **Step 1: Add the typed client function**

Import `ScheduledCourseUpdatePayload` as a type and add:

```ts
export const updateScheduledCourse = async (
  id: string,
  input: ScheduledCourseUpdatePayload,
) => (await api.patch<ScheduledCourse>(`/cursos-programados/${id}`, input)).data;
```

Also expand `createScheduledCourse` input with `seccion: string` so creation and editing share the same visible operational field.

- [ ] **Step 2: Run TypeScript validation**

Run: `npm run typecheck`

Expected: PASS with no TypeScript diagnostics.

- [ ] **Step 3: Commit the client contract**

```powershell
git add src/features/academic-operation/api/academicOperationApi.ts
git commit -m "feat: conectar actualización de cursos programados"
```

---

### Task 3: Reuse the form in create and edit modes

**Files:**
- Create: `src/features/academic-operation/components/ScheduledCourseForm.tsx`
- Modify: `src/features/academic-operation/components/AcademicOperationPage.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `ScheduledCourseInput`, `ScheduledCourseValues`, catalog arrays, teacher list, `UseFormReturn<ScheduledCourseInput, unknown, ScheduledCourseValues>`, and mode `create | edit`.
- Produces: `ScheduledCourseForm`, a controlled form that calls `onSubmit(values)` and `onCancel()` without making network requests itself.

- [ ] **Step 1: Extract a mode-aware form component**

Create `ScheduledCourseForm.tsx`. Its public interface must be:

```ts
type ScheduledCourseFormProps = {
  mode: 'create' | 'edit';
  form: UseFormReturn<ScheduledCourseInput, unknown, ScheduledCourseValues>;
  careers: Career[];
  plans: CurriculumPlan[];
  planCourses: PlanCourse[];
  courses: Course[];
  periods: AcademicPeriod[];
  teachers: TeacherListItem[];
  course?: ScheduledCourse | null;
  pending: boolean;
  error: unknown;
  onCancel: () => void;
  onSubmit: (values: ScheduledCourseValues) => void;
};
```

Move the scheduled-course form markup into this component. Resolve the selected plan without mutating identity fields during editing:

```ts
const scheduleFields = useFieldArray({ control: form.control, name: 'horarios' });
const careerId = useWatch({ control: form.control, name: 'carreraId' });
const activePlanId = latestActivePlan(plans, careerId)?.id ?? '';
const planId = mode === 'edit' ? form.getValues('planCurricularId') : activePlanId;

useEffect(() => {
  if (mode !== 'create') return;
  form.setValue('planCurricularId', activePlanId, { shouldValidate: Boolean(careerId) });
  form.setValue('planCursoId', '');
}, [activePlanId, careerId, form, mode]);
```

Render the complete form body as follows:

```tsx
<form className="operation-form scheduled-course-form" onSubmit={form.handleSubmit(onSubmit)}>
  {mode === 'edit' && course ? (
    <div className="scheduled-course-form__context">
      <span className="eyebrow">Edición operativa</span>
      <strong>{course.cursoNombre} · Sección {course.seccion}</strong>
      <small>{course.carreraNombre} · {course.planNombre} · {course.periodoNombre}</small>
    </div>
  ) : null}
  <FormField error={form.formState.errors.carreraId?.message} htmlFor="scheduled-career" label="Carrera">
    <select className="form-select" disabled={mode === 'edit'} id="scheduled-career" {...form.register('carreraId')}>
      <option value="">Seleccionar</option>
      {careers.filter((item) => item.estado === 'activo').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
    </select>
  </FormField>
  <FormField error={form.formState.errors.planCursoId?.message} htmlFor="scheduled-course" label="Curso">
    <select className="form-select" disabled={mode === 'edit' || !planId} id="scheduled-course" {...form.register('planCursoId')}>
      <option value="">Seleccionar</option>
      {planCourses.filter((item) => item.planCurricularId === planId && item.estado === 'activo').map((item) => (
        <option key={item.id} value={item.id}>Ciclo {item.ciclo} · {courses.find((courseItem) => courseItem.id === item.cursoId)?.nombre ?? 'Curso'}</option>
      ))}
    </select>
  </FormField>
  <FormField error={form.formState.errors.periodoAcademicoId?.message} htmlFor="scheduled-period" label="Periodo">
    <select className="form-select" disabled={mode === 'edit'} id="scheduled-period" {...form.register('periodoAcademicoId')}>
      <option value="">Seleccionar</option>
      {periods.filter((item) => item.carreraId === careerId && (mode === 'edit' || item.estado !== 'culminado')).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
    </select>
  </FormField>
  <FormField error={form.formState.errors.profesorPersonaId?.message} htmlFor="scheduled-teacher" label="Profesor">
    <select className="form-select" id="scheduled-teacher" {...form.register('profesorPersonaId')}>
      <option value="">Seleccionar</option>
      {teachers.map((item) => <option key={item.id} value={item.id}>{item.apellidoPaterno}, {item.nombres}</option>)}
    </select>
  </FormField>
  <FormField error={form.formState.errors.seccion?.message} htmlFor="scheduled-section" label="Sección">
    <Input id="scheduled-section" maxLength={30} {...form.register('seccion')} />
  </FormField>
  {mode === 'edit' ? (
    <FormField error={form.formState.errors.estado?.message} htmlFor="scheduled-state" label="Estado">
      <select className="form-select" id="scheduled-state" {...form.register('estado')}>
        <option value="activo">Activo</option>
        <option value="inactivo">Inactivo</option>
      </select>
    </FormField>
  ) : null}
  <FormField error={form.formState.errors.cupoMaximo?.message} htmlFor="scheduled-capacity" label="Cupo máximo">
    <Input
      id="scheduled-capacity"
      min={1}
      type="number"
      {...form.register('cupoMaximo', {
        setValueAs: (value) => value === '' ? null : Number(value),
      })}
    />
  </FormField>
  <fieldset className="schedule-fieldset">
    <legend>Horarios</legend>
    {scheduleFields.fields.map((field, index) => (
      <div className="schedule-row" key={field.id}>
        <select aria-label={`Día ${index + 1}`} className="form-select" {...form.register(`horarios.${index}.dia`)}>
          {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map((day) => <option key={day} value={day}>{day}</option>)}
        </select>
        <Input aria-label={`Inicio ${index + 1}`} type="time" {...form.register(`horarios.${index}.horaInicio`)} />
        <Input aria-label={`Fin ${index + 1}`} type="time" {...form.register(`horarios.${index}.horaFin`)} />
        <select aria-label={`Modalidad ${index + 1}`} className="form-select" {...form.register(`horarios.${index}.modalidad`)}>
          <option value="presencial">Presencial</option>
          <option value="virtual">Virtual</option>
          <option value="hibrido">Híbrido</option>
        </select>
        <Input aria-label={`Ubicación ${index + 1}`} placeholder="Aula o enlace" {...form.register(`horarios.${index}.ubicacion`)} />
        <Button disabled={scheduleFields.fields.length === 1} onClick={() => scheduleFields.remove(index)} type="button" variant="ghost">Quitar</Button>
      </div>
    ))}
    {form.formState.errors.horarios?.root?.message ? <small className="field-error">{form.formState.errors.horarios.root.message}</small> : null}
    <Button onClick={() => scheduleFields.append({ ...emptyScheduleBlock })} type="button" variant="secondary">Agregar horario</Button>
  </fieldset>
  <div className="operation-form__actions">
    {error ? <div className="error-banner">{getApiErrorMessage(error, 'No se pudo guardar el curso programado.')}</div> : null}
    <Button disabled={pending} onClick={onCancel} type="button" variant="secondary">Cancelar</Button>
    <Button disabled={pending} type="submit">{pending ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Guardar'}</Button>
  </div>
</form>
```

- [ ] **Step 2: Wire create and edit state in `ScheduledCoursesView`**

Replace `showForm: boolean` with:

```ts
const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
const [editingCourse, setEditingCourse] = useState<ScheduledCourse | null>(null);
```

Use a single form initialized with explicit defaults:

```ts
const form = useForm<ScheduledCourseInput, unknown, ScheduledCourseValues>({
  resolver: zodResolver(scheduledCourseSchema),
  defaultValues: {
    carreraId: '', planCurricularId: '', planCursoId: '', periodoAcademicoId: '',
    profesorPersonaId: '', seccion: 'ÚNICA', estado: 'activo', cupoMaximo: 20,
    horarios: [{ ...emptyScheduleBlock }],
  },
});
```

Add separate create and update mutations:

```ts
const closeForm = () => {
  setFormMode(null);
  setEditingCourse(null);
  form.reset();
};

const createMutation = useMutation({
  mutationFn: (values: ScheduledCourseValues) => createScheduledCourse(
    toCreateScheduledCoursePayload(values),
  ),
  onSuccess: async () => {
    closeForm();
    await queryClient.invalidateQueries({ queryKey: ['operation', 'scheduled-courses'] });
  },
});

const updateMutation = useMutation({
  mutationFn: ({ id, values }: { id: string; values: ScheduledCourseValues }) =>
    updateScheduledCourse(id, toUpdateScheduledCoursePayload(values)),
  onSuccess: async () => {
    closeForm();
    await queryClient.invalidateQueries({ queryKey: ['operation', 'scheduled-courses'] });
  },
});

const startCreate = () => {
  setEditingCourse(null);
  setFormMode('create');
  form.reset({
    carreraId: '', planCurricularId: '', planCursoId: '', periodoAcademicoId: '',
    profesorPersonaId: '', seccion: 'ÚNICA', estado: 'activo', cupoMaximo: 20,
    horarios: [{ ...emptyScheduleBlock }],
  });
};

const startEdit = (course: ScheduledCourse) => {
  setEditingCourse(course);
  setFormMode('edit');
  form.reset(scheduledCourseToFormValues(course));
};
```

Render `ScheduledCourseForm` when `formMode` is not null. For submission, call the create mutation in create mode and the update mutation with `editingCourse.id` in edit mode.

- [ ] **Step 3: Add the visible edit action**

Import `Pencil` from `lucide-react` and add this action before `Muro`:

```tsx
<Button onClick={() => startEdit(row)} type="button" variant="secondary">
  <Pencil size={15} /> Editar
</Button>
```

The existing `Muro` and `Alumnos` actions remain unchanged.

- [ ] **Step 4: Add focused styles using existing tokens**

Add to `src/styles.css` near the operation-form rules:

```css
.scheduled-course-form__context {
  display: grid;
  grid-column: 1 / -1;
  gap: .25rem;
  padding: 1rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--canvas);
}
.scheduled-course-form__context strong { color: var(--ink); font-size: 1rem; }
.scheduled-course-form__context small { color: var(--ink-muted); font-size: .78rem; }
```

Do not introduce new colors, shadows, or form primitives.

- [ ] **Step 5: Run frontend validation**

Run, in order:

```powershell
npm run typecheck
npm test
npm run lint
npm run build
```

Expected: typecheck, 10 test files with 46 tests, lint, and production build all PASS.

- [ ] **Step 6: Validate the workflow visually**

With the local services running, open `/operacion/cursos-programados` and verify:

1. `Editar` is visible in every row.
2. Clicking it opens the panel with the correct course context.
3. Course, career, plan, and period are disabled.
4. Professor, section, state, cupo, modality, location, and schedule blocks are editable.
5. Cancel closes the panel without changing the row.
6. Saving updates the row without removing `Muro` or `Alumnos` actions.
7. Test a course that previously had no schedule and confirm the form provides one empty block that must be completed.
8. At a mobile viewport, confirm form controls stack and all actions remain reachable.

- [ ] **Step 7: Commit the UI integration**

```powershell
git add src/features/academic-operation/components/ScheduledCourseForm.tsx src/features/academic-operation/components/AcademicOperationPage.tsx src/styles.css
git commit -m "feat: editar operación de cursos programados"
```

---

### Task 4: Synchronize project documentation and final evidence

**Files:**
- Modify: `../docs/PROJECT_STATE.md`
- Modify: `../docs/ROADMAP.md`

**Interfaces:**
- Consumes: completed and visually verified edit workflow.
- Produces: source-of-truth documentation stating that scheduled-course operational editing is available.

- [ ] **Step 1: Update current project state**

Extend the existing scheduled-course bullet in `../docs/PROJECT_STATE.md` to state:

```md
- Cursos programados con creación y edición de profesor, sección, estado, cupo y horarios estructurados por modalidad y ubicación; la identidad académica de curso, plan y periodo permanece inmutable durante la edición.
```

- [ ] **Step 2: Update the roadmap evidence**

In `../docs/ROADMAP.md`, mark operational editing of scheduled courses as completed in the stakeholder-platform section without changing the status of unrelated promotion or portal work.

- [ ] **Step 3: Run the full mandatory frontend checks again**

Run:

```powershell
npm run typecheck
npm test
npm run lint
npm run build
git status --short
```

Expected: all four validations PASS; frontend status contains only intended documentation differences if the root documentation is outside the frontend repository, otherwise it is clean after its dedicated commit.

- [ ] **Step 4: Report final evidence**

The handoff must list changed files, the final test count, build/lint/typecheck results, visual desktop/mobile validation, commit hashes, and confirmation that no backend or database files changed.
