# Student Portal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el portal del alumno en una agenda académica y ubicar notas, asistencia y documentos dentro del curso programado correspondiente.

**Architecture:** El backend seguirá derivando la identidad desde `request.auth.personaId` y expondrá una consulta agregada por curso que valida la matrícula antes de devolver información. El frontend separará inicio, curso e historial en rutas propias, reutilizará el muro existente y presentará estados de carga, error y vacío con la dirección visual Teatro sereno.

**Tech Stack:** Fastify, TypeScript, Drizzle ORM, PostgreSQL, Vitest, React 19, React Router, TanStack Query, Axios, Lucide React, CSS.

## Global Constraints

- No añadir dependencias ni migraciones de base de datos.
- El backend es la autoridad de autorización; ningún endpoint recibe `personaId` desde el cliente.
- Mantener Manrope, rojo institucional `#C41E3A`, espaciado base de 4 px y objetivos táctiles mínimos de 40 px.
- No mostrar asistencia ni documentos en `/portal`.
- El historial solo contiene resultados de actas publicadas.
- Preservar cambios locales y mantener commits separados de backend y frontend.

---

### Task 1: Consulta segura del curso del alumno

**Files:**
- Modify: `BACKEND/src/modules/student-portal/service.ts`
- Modify: `BACKEND/src/modules/student-portal/routes.ts`
- Create: `BACKEND/tests/student-portal.service.test.ts`

**Interfaces:**
- Consumes: `Database`, `request.auth.personaId`, `courseId` UUID.
- Produces: `getStudentCourseData(db, personaId, courseId)` con `{ course, assessments, attendance, documents }`.

- [ ] **Step 1: Write the failing service tests**

Crear pruebas que confirmen que el servicio filtra por `personaId` y `courseId`, devuelve únicamente asistencia y documentos del curso solicitado y rechaza una matrícula inexistente mediante `notFound('Curso no encontrado')`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- tests/student-portal.service.test.ts`

Expected: FAIL porque `getStudentCourseData` todavía no existe.

- [ ] **Step 3: Implement the aggregate query**

Añadir una consulta inicial equivalente a:

```ts
const [course] = await db.select(courseSelection)
  .from(matriculaCursosProgramados)
  .innerJoin(matriculasCarrera, eq(matriculasCarrera.id, matriculaCursosProgramados.matriculaCarreraId))
  .innerJoin(cursosProgramados, eq(cursosProgramados.id, matriculaCursosProgramados.cursoProgramadoId))
  .where(and(
    eq(matriculasCarrera.personaId, personaId),
    eq(cursosProgramados.id, courseId),
  ));
if (!course) throw notFound('Curso no encontrado');
```

Después consultar horarios, componentes de evaluación, asistencia de `course.matriculaCursoId` y documentos activos cuyo ámbito sea institución o cuyo `cursoProgramadoId` coincida.

- [ ] **Step 4: Register the authenticated route**

```ts
app.get('/alumno/me/cursos/:courseId', {
  preHandler: [app.authenticate, authorize('ALUMNO')],
  schema: { params: z.object({ courseId: z.string().uuid() }) },
}, async (request) => getStudentCourseData(
  app.db,
  request.auth!.personaId,
  request.params.courseId,
));
```

- [ ] **Step 5: Run backend focused tests**

Run: `npm test -- tests/student-portal.service.test.ts`

Expected: PASS.

### Task 2: Reducir el contrato del inicio y documentar API

**Files:**
- Modify: `BACKEND/src/modules/student-portal/service.ts`
- Modify: `BACKEND/src/modules/student-portal/routes.ts`
- Modify: `BACKEND/docs/frontend-integration.md`

**Interfaces:**
- Consumes: consulta personal existente de cursos, evaluaciones, historial y talleres.
- Produces: `/alumno/me/inicio`, `/alumno/me/cursos`, `/alumno/me/historial`, `/alumno/me/talleres` y `/alumno/me/cursos/:courseId` documentados.

- [ ] **Step 1: Make the start payload explicit**

El inicio devuelve solo:

```ts
{
  cursosActivos: currentCourses.length,
  proximasEvaluaciones: upcomingAssessments,
  cursos: currentCourses,
}
```

Las fechas programadas nulas o pasadas no deben dominar `Próximo en tu agenda`; ordenar por `fechaProgramada` ascendente.

- [ ] **Step 2: Keep compatibility routes without using them in the new home**

Mantener temporalmente `/alumno/me/asistencia` y `/alumno/me/documentos` para no romper consumidores anteriores. Registrar en integración que el portal nuevo usa el agregado por curso.

- [ ] **Step 3: Validate backend**

Run: `npm run typecheck`, `npm test`, `npm run build`, `npm run docs:validate`.

Expected: todos terminan con código 0.

- [ ] **Step 4: Commit backend**

```bash
git add src/modules/student-portal tests/student-portal.service.test.ts docs/frontend-integration.md
git commit -m "feat: contextualizar portal del alumno por curso"
```

### Task 3: Clientes y rutas del portal

**Files:**
- Modify: `FRONTEND/src/features/student-portal/api/studentPortalApi.ts`
- Modify: `FRONTEND/src/app/App.tsx`
- Modify: `FRONTEND/src/app/navigation.ts`
- Create: `FRONTEND/src/features/student-portal/components/StudentCoursePage.tsx`
- Create: `FRONTEND/src/features/student-portal/components/StudentHistoryPage.tsx`

**Interfaces:**
- Consumes: `GET /alumno/me/cursos/:courseId`, `GET /alumno/me/historial`.
- Produces: `getPortalCourse(courseId)`, rutas `/portal/cursos/:courseId` y `/portal/historial`.

- [ ] **Step 1: Define typed API responses**

```ts
export type PortalCourseDetail = {
  course: PortalCourse;
  assessments: PortalAssessment[];
  attendance: PortalAttendance[];
  documents: PortalDocument[];
};

export const getPortalCourse = async (courseId: string) =>
  (await api.get<PortalCourseDetail>(`/alumno/me/cursos/${courseId}`)).data;
```

- [ ] **Step 2: Add role-protected routes**

Ambas páginas usan `RequireRole allowed={['ALUMNO']}` y carga diferida. El menú del alumno muestra `Mi portal` y `Mi historial`.

- [ ] **Step 3: Build course page sections**

La pantalla incluye encabezado con retorno, resumen/horario, muro enlazado, evaluaciones publicadas o programadas, asistencia resumida con registros y documentos descargables. No renderiza HTML recibido.

- [ ] **Step 4: Build history page**

Agrupar resultados por `periodoNombre`, mostrar nota final, letra y resultado, y un estado vacío cuando no existan actas publicadas.

### Task 4: Rediseñar el inicio como agenda académica

**Files:**
- Modify: `FRONTEND/src/features/student-portal/components/StudentPortalPage.tsx`
- Create: `FRONTEND/src/features/student-portal/components/PortalStates.tsx`
- Modify: `FRONTEND/src/styles.css`

**Interfaces:**
- Consumes: `getPortalStart`, `getPortalCourses`, `getPortalWorkshops`.
- Produces: inicio sin solicitudes de historial, asistencia o documentos.

- [ ] **Step 1: Remove general-context queries**

Eliminar de `StudentPortalPage` las llamadas `getPortalHistory`, `getPortalAttendance` y `getPortalDocuments`.

- [ ] **Step 2: Build the agenda focal block**

Seleccionar la primera evaluación futura ordenada y presentarla como `Próximo en tu agenda`; si no existe, mostrar `No tienes evaluaciones programadas` sin inventar información.

- [ ] **Step 3: Build course rows and workshop section**

Cada curso enlaza a `/portal/cursos/:courseId`, muestra horario real o `Horario por confirmar` y evita tarjetas idénticas. `Mis talleres` permanece y cuenta con estado vacío explícito.

- [ ] **Step 4: Apply visual system and responsive states**

Usar tokens semánticos existentes, una sola superficie elevada, tipografía jerárquica, iconos Lucide con texto, foco visible y reglas a 900 px y 640 px. Respetar `prefers-reduced-motion`.

### Task 5: Validación, documentación y cierre

**Files:**
- Modify: `FRONTEND/.interface-design/system.md`
- Modify: `docs/PROJECT_STATE.md`
- Modify: `docs/ROADMAP.md`

**Interfaces:**
- Consumes: implementación terminada.
- Produces: documentación sincronizada y evidencia de validación.

- [ ] **Step 1: Validate frontend**

Run: `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`.

Expected: todos terminan con código 0.

- [ ] **Step 2: Validate in browser**

Comprobar con un alumno autenticado `/portal`, `/portal/cursos/:courseId` y `/portal/historial` en escritorio y móvil. Verificar agenda, curso, talleres, estados vacíos, descarga autorizada, navegación y ausencia de datos de otros cursos.

- [ ] **Step 3: Update project documentation**

Registrar el nuevo alcance y sus rutas en `PROJECT_STATE.md` y marcar el rediseño del portal como completado en `ROADMAP.md`. Guardar en `system.md` los patrones reutilizables de agenda, fila de curso y estado vacío.

- [ ] **Step 4: Commit frontend**

```bash
git add src .interface-design/system.md docs/superpowers/plans/2026-07-22-student-portal-redesign.md ../docs/PROJECT_STATE.md ../docs/ROADMAP.md
git commit -m "feat: rediseñar portal académico del alumno"
```

## Self-review

- Spec coverage: inicio, curso, historial, permisos, talleres, estados y responsive están asignados a tareas concretas.
- Placeholder scan: no contiene tareas diferidas ni instrucciones ambiguas.
- Type consistency: `PortalCourseDetail` y `getPortalCourse` se definen antes de sus consumidores; todas las rutas utilizan `courseId`.
