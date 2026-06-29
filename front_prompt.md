## Fuente única de verdad

Lee COMPLETAMENTE `architecture.md`. Ahí está toda la estructura de directorios, el mapa de rutas, los patrones de UI, los roles, y los hooks que necesitas.

## Stack

- React 19 + Vite 8 + TypeScript (strict mode)
- React Router DOM v7
- TanStack Query v5
- react-hook-form + zod v4
- axios
- Supabase JS (auth)
- Tailwind CSS v4 + clsx + tailwind-merge
- lucide-react (iconos)
- shadcn/ui primitives (via CVA)

## Lo que DEBES construir

### 1. Infraestructura base

#### `src/main.tsx`

- QueryClientProvider de TanStack Query
- AuthProvider
- ThemeProvider
- BrowserRouter

#### `src/lib/`

- `supabase.ts` — cliente Supabase inicializado con `SUPABASE_URL` + `SUPABASE_ANON_KEY` del .env
- `cn.ts` — helper `cn()` con clsx + tailwind-merge
- `format.ts` — formatos de fecha (DD/MM/YYYY), moneda (S/), notas

#### `src/api/client.ts`

- Axios instance con `baseURL` de `VITE_API_URL`
- Interceptor request: agrega `Authorization: Bearer <token>` desde `supabase.auth.getSession()`
- Interceptor response: si 401, hace logout y redirige a `/login`

### 2. Autenticación

#### `src/features/auth/components/LoginPage.tsx`

- Campo de DNI + campo de password
- Al submit: busca email por DNI, luego signIn con Supabase
- Si hay error, mostrar mensaje
- Si el usuario tiene `requiereCambioClave`, redirigir a `/reset-password`

### 3. Layout

#### `src/layouts/MainLayout.tsx`

Adapta el existente o créalo de cero:

- Sidebar izquierdo fijo (ocultable en mobile)
- Los items del sidebar se renderizan dependiendo del menú ya que cada rol tiene acceso a menus diferentes
- Soporta jerarquía padre → hijos (secciones con submenús)
- Header superior con breadcrumb + botón de modo oscuro
- Footer del sidebar con avatar, nombre, roles y botón de logout
- Responsive: en mobile el sidebar se superpone con overlay

#### `src/layouts/AuthLayout.tsx`

- Layout simple centrado para login/reset-password
- Logo + formulario centrados

### 4. Componentes UI compartidos

En `src/components/ui/` crea primitivas con CVA + Tailwind:

- `Button`, `Input`, `Select`, `Textarea`
- `Table`, `Modal`, `Dialog`
- `Badge`, `Card`, `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`
- `Label`, `Checkbox`, `RadioGroup`

En `src/components/` crea componentes compuestos:

- `PageHeader` — título + breadcrumb + botón de acción (ej: "Nuevo")::
  ```tsx
  <PageHeader
    title="Carreras"
    breadcrumbs={[{ label: "Inicio", to: "/" }, { label: "Carreras" }]}
  >
    <Button>Nueva Carrera</Button>
  </PageHeader>
  ```
- DataTable — tabla con sort por columna, búsqueda, paginación, acciones por fila
- FormField — wrapper que muestra label + input + error message:
  <FormField label="DNI" error={errors.dni}>
  <Input {...register('dni')} />
  </FormField>
- ConfirmDialog — modal de confirmación para acciones destructivas
- EmptyState — icono + mensaje cuando no hay datos
- LoadingSpinner — spinner centrado
- ErrorBoundary — catch de errores de render + botón recargar
- StatusBadge — badge de color según estado (activo=verde, inactivo=rojo, etc.)
- RequireRole — wrapper que oculta contenido si el usuario no tiene el rol:
  <RequireRole roles={['ADMIN', 'DIRECTOR_ACADEMICO']}>
  <Button>Crear Carrera</Button>
  </RequireRole>

5. Features (implementar en este orden)
   CADA FEATURE sigue esta estructura:
   features/<nombre>/
   ├── api/<recurso>.ts # Funciones HTTP
   ├── components/ # Páginas y componentes
   ├── hooks/ # TanStack Query hooks
   └── schemas/ # Validación zod
   a) features/personas/ — Gestión de Personas
   API (api/personas.ts):

- getPersonas(params?) → GET /api/personas
- getPersona(id) → GET /api/personas/:id
- createPersona(input) → POST /api/personas
- updatePersona(id, input) → PATCH /api/personas/:id
- assignRol(personaId, rolId, input) → POST /api/personas/:id/roles
- removeRol(personaId, rolId) → DELETE /api/personas/:id/roles/:rolId
- getTutores(personaId) → GET /api/personas/:id/tutores
- assignTutor(personaId, tutorId, input) → POST /api/personas/:id/tutores
  Componentes:
- PersonasListPage — tabla con filtros (búsqueda, tipo_documento, estado), acciones crear/editar
- PersonaCreatePage / PersonaEditPage — formulario con react-hook-form + zod:
- Tipo documento (select), número documento, nombres, apellidos, correo, teléfono, fecha nacimiento
- PersonaDetailPage — tabs: Datos Generales | Roles Asignados | Tutores | Historial Académico
- PersonaRolesSection — tabla de roles asignados + botón "Asignar Rol" (modal con selector de rol + fecha inicio)
- PersonaTutoresSection — tabla de tutores + botón "Asignar Tutor" (modal, valida máximo 2)
  Schema zod (schemas/personaSchema.ts):
  const personaSchema = z.object({
  tipoDocumento: z.enum(['dni', 'pasaporte', 'carnet_extranjeria', 'otro']),
  numeroDocumento: z.string().min(1, 'Requerido').max(30),
  nombres: z.string().min(1, 'Requerido').max(150),
  apellidoPaterno: z.string().min(1, 'Requerido').max(100),
  apellidoMaterno: z.string().max(100).optional(),
  correo: z.string().email().optional().or(z.literal('')),
  telefono: z.string().max(30).optional(),
  fechaNacimiento: z.string().optional(),
  });
  b) features/career-structure/ — Estructura Académica
  Componentes:
- CarrerasListPage — tabla con búsqueda, crear/editar carrera
- CarreraDetailPage — tabs: Datos | Planes Curriculares | Malla
- CarreraForm — código + nombre + descripción
- PlanesCurricularesSection — tabla de planes + crear plan (código, nombre, versión)
- CursosListPage — tabla de cursos del catálogo, crear/editar
- MallaCurricularPage — página principal de la malla:
- Selector de carrera + selector de plan curricular
- Grid visual: filas = ciclos (1..N), columnas = agrupación por ciclo
- Cada celda = tarjeta del curso con código y nombre
- Flechas entre cursos que tienen prerrequisitos
- PrerrequisitosEditor — modal que Lista cursos disponibles y permite marcar cuáles son prerrequisito del curso actual
- PeriodosAcademicosPage — tabla de periodos (código, nombre, fechas, estado), crear/editar
  c) features/enrollment/ — Matrículas e Inscripciones
  Componentes:
- MatriculasCarreraPage — tabla de matrículas por carrera, filtrar por persona/carrera/periodo/estado
- MatriculaCarreraForm — wizard:

1. Seleccionar persona (buscador por DNI/nombres)
2. Seleccionar carrera + plan curricular
3. Seleccionar periodo académico
4. Beneficio opcional (tipo + porcentaje 25/50/100)
5. Confirmar + crear

- MatriculaDetailPage — datos de la matrícula + lista de cursos inscritos en el periodo actual
- InscripcionCursosPage — para una matrícula activa, muestra los cursos programados del periodo y permite inscribirse:
- Valida prerrequisitos visualmente (check verde / cruz roja)
- Si falta prerrequisito, botón "Solicitar Autorización" que abre modal para DIRECTOR_ACADEMICO
- AutorizacionPrerrequisitoModal — motivo + selector de director académico que aprueba
- HistorialAcademicoPage — para una persona: timeline de estados académicos + cursos cursados con notas
  d) features/courses/ — Cursos Programados
  Componentes:
- CursosProgramadosPage — tabla de instancias de cursos por periodo, crear/editar
- CursoProgramadoForm — seleccionar curso del plan + periodo + profesor + sección
- CursoProgramadoDetailPage — datos del curso + tabs: Estudiantes | Evaluación | Asistencias
- ListaEstudiantesCurso — tabla de estudiantes inscritos con estado
  e) features/evaluation/ — Evaluación y Notas
  Componentes:
- ComponentesEvaluacionPage — para un curso programado, tabla de componentes con peso porcentual
- Validar que la suma dé 100% antes de guardar
- Mostrar progress bar del porcentaje total vs 100%
- CalificacionesPage — grilla editable:
- Columnas: Estudiante | Componente 1 | Componente 2 | ... | Promedio
- Edición inline por celda (input numérico 0-20)
- Validación y guardado por fila o batch
- Columna "Promedio" se calcula automáticamente según los pesos
- Mostrar letra equivalente: A(17-20), B(14-16), C(11-13), D(0-10)
- HistorialNotasPage — para un alumno: historial de cursos y notas (incluyendo retakes, mostrando el intento original)
  f) features/attendance/ — Asistencia
  Componentes:
- AsistenciasPage — para un curso programado:
- Selector de fecha (default: hoy)
- Matriz: filas = estudiantes, celda = toggle estado (presente/tardanza/falta/justificada)
- Atajos de teclado o click rápido para cambiar estado
- Guardar lote completo
- ResumenAsistencias — para un estudiante en un curso:
- Contador de presentes, tardanzas, faltas
- Alertas visuales cuando está próximo a inhabilitarse
- Indicador de "3 faltas = RETIRADO", "9 tardanzas = RETIRADO"
- ReporteInasistencias — tabla de alumnos en riesgo por curso
  g) features/graduation/ — Egreso
  Componentes:
- ElegiblesPage — lista de alumnos que cumplen todos los requisitos para egresar (solo visible para DIRECTOR_ACADEMICO y ADMIN)
- AprobarEgresoModal — modal con datos del alumno, resumen de cursos aprobados, generación de código CAC-XXX, campo de promoción
- EgresadosListPage — tabla de egresados con búsqueda
  h) features/workshops/ — Talleres
  Componentes:
- TalleresListPage — CRUD de talleres del catálogo
- TalleresProgramadosPage — instancias de taller programadas por periodo
- InscripcionesTallerPage — tabla de inscripciones, con formulario que permite buscar persona existente O crear nueva persona sin usuario

6. Enrutamiento en App.tsx
   Usa React Router DOM v7 con layout anidado:
   <Routes>
   <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />

<Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
<Route index element={<Navigate to="/dashboard" replace />} />
<Route path="/dashboard" element={<DashboardPage />} />

    <Route path="/personas" element={<RequireRole roles={['ADMIN','GESTOR']}><PersonasListPage /></RequireRole>} />
    <Route path="/personas/nuevo" element={<RequireRole roles={['ADMIN','GESTOR']}><PersonaCreatePage /></RequireRole>} />
    <Route path="/personas/:id" element={<PersonaDetailPage />} />
    <Route path="/personas/:id/editar" element={<RequireRole roles={['ADMIN','GESTOR']}><PersonaEditPage /></RequireRole>} />

    {/* Carreras */}
    <Route path="/carreras" element={<RequireRole roles={['ADMIN','DIRECTOR_ACADEMICO']}><CarrerasListPage /></RequireRole>} />
    <Route path="/carreras/:id" element={<CarreraDetailPage />} />

    {/* Malla Curricular */}
    <Route path="/malla-curricular" element={<RequireRole roles={['ADMIN','DIRECTOR_ACADEMICO','GESTOR']}><MallaCurricularPage /></RequireRole>} />

    {/* Cursos Catálogo */}
    <Route path="/cursos" element={<RequireRole roles={['ADMIN','DIRECTOR_ACADEMICO']}><CursosListPage /></RequireRole>} />

    {/* Periodos */}
    <Route path="/periodos" element={<RequireRole roles={['ADMIN','DIRECTOR_ACADEMICO','GESTOR']}><PeriodosAcademicosPage /></RequireRole>} />

    {/* Matrículas */}
    <Route path="/matriculas" element={<RequireRole roles={['ADMIN','GESTOR']}><MatriculasCarreraPage /></RequireRole>} />
    <Route path="/matriculas/nueva" element={<RequireRole roles={['ADMIN','GESTOR']}><MatriculaCarreraForm /></RequireRole>} />
    <Route path="/matriculas/:id" element={<MatriculaDetailPage />} />

    {/* Cursos Programados */}
    <Route path="/cursos-programados" element={<CursosProgramadosPage />} />
    <Route path="/cursos-programados/:id" element={<CursoProgramadoDetailPage />} />

    {/* Evaluación */}
    <Route path="/cursos-programados/:id/evaluacion" element={<RequireRole roles={['PROFESOR','DIRECTOR_ACADEMICO']}><ComponentesEvaluacionPage /></RequireRole>} />
    <Route path="/cursos-programados/:id/calificaciones" element={<RequireRole roles={['PROFESOR','DIRECTOR_ACADEMICO']}><CalificacionesPage /></RequireRole>} />

    {/* Asistencia */}
    <Route path="/cursos-programados/:id/asistencias" element={<RequireRole roles={['PROFESOR']}><AsistenciasPage /></RequireRole>} />

    {/* Egreso */}
    <Route path="/egresados/elegibles" element={<RequireRole roles={['DIRECTOR_ACADEMICO','ADMIN']}><ElegiblesPage /></RequireRole>} />
    <Route path="/egresados" element={<RequireRole roles={['DIRECTOR_ACADEMICO','ADMIN']}><EgresadosListPage /></RequireRole>} />

    {/* Talleres */}
    <Route path="/talleres" element={<RequireRole roles={['ADMIN','GESTOR']}><TalleresListPage /></RequireRole>} />
    <Route path="/talleres/inscripciones" element={<RequireRole roles={['ADMIN','GESTOR']}><InscripcionesTallerPage /></RequireRole>} />

  </Route>
</Routes>
7. Dashboard
features/dashboard/components/DashboardPage.tsx:
- Cards de resumen: total personas, estudiantes activos, cursos en ejecución, etc. (datos de GET /api/dashboard/stats)
- Gráfico de barras simple con CSS/Tailwind (no agregar librería de gráficos, usa divs con altura proporcional)
- Lista de actividad reciente (últimas matrículas, egresos, etc.)
8. Convenciones de código
Concepto	Regla
Archivos	PascalCase para componentes (PersonasListPage.tsx), camelCase para hooks/api (usePersonas.ts)
Componentes	Nombre del feature + función (PersonaForm, MallaCurricularGrid)
Hooks	use + nombre del recurso (useCarreras, useCreatePersona)
Funciones API	verbo + nombre (getPersonas, createMatricula)
Schemas zod	camelCase + Schema (personaSchema)
Tipos	Definir interfaces en cada hook file o en src/types/
Imports	Orden: React → librerías → api → hooks → componentes → schemas
CSS	Tailwind utility classes. Sin CSS modules. Sin styled-components.
9. Variables de entorno (.env)
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx
10. Lo que NO debes hacer
- NO agregues librerías de gráficos (usa CSS)
- NO agregues Redux, Zustand, ni ningún state manager (TanStack Query + Context alcanza)
- NO uses clases de componentes (funciones solamente)
- NO implementes backend ni base de datos
- NO toques el archivo docs/architecture.md
- NO hagas el login con email/password directo del formulario → primero busca el email por DNI en la API
- NO inventes endpoints que no existan en el backend (si necesitas uno que no está documentado, pregúntalo)
