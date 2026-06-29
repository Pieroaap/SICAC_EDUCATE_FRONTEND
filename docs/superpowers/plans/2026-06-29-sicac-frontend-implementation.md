# SICAC — Plan de implementación

**Especificación:** `docs/superpowers/specs/2026-06-29-sicac-frontend-design.md`  
**Estrategia:** cortes verticales, pruebas antes o junto a cada comportamiento  
**Repositorios:** `BACKEND` y `FRONTEND`, independientes

## Estado de ejecución

- Cortes 0A, 0B y 0C: completados.
- Corte 1 — Personas: listado, alta, edición, inactivación y detalle completados.
- Corte 1 — Alumnos y profesores: listados operativos con búsqueda, estado,
  paginación y acceso a ficha completados.
- Corte 1 — Tutores y acceso: acciones contextuales en ficha de persona,
  habilitación de acceso, reinicio de clave y asignación de tutores completados.
- Pendiente posterior del Corte 1: importaciones con dry run, resumen y
  confirmación.

## Reglas de ejecución

- No implementar una pantalla sin contrato backend verificado.
- Actualizar Swagger y `BACKEND/docs/frontend-integration.md` con cada cambio de API.
- Mantener la autorización en backend y reflejarla, sin duplicarla como seguridad,
  en frontend.
- Ejecutar typecheck, pruebas y build al cerrar cada corte.
- Validar visualmente escritorio, móvil y ambos temas en cada vista nueva.
- Hacer commits pequeños por comportamiento verificable.

## Corte 0A — Sesión y perfil

### Backend

1. Añadir pruebas de servicio para recuperar perfil autenticado:
   - persona y nombre completo;
   - roles activos y vigentes;
   - exclusión de roles vencidos;
   - indicador de cambio obligatorio de clave.
2. Implementar el servicio de perfil usando consultas acotadas por `personaId`.
3. Publicar `GET /auth/me` con `app.authenticate`.
4. Documentar esquema de respuesta y errores en Swagger.
5. Añadir prueba HTTP de autenticación y respuesta.
6. Actualizar `frontend-integration.md`.
7. Ejecutar typecheck, tests, validación OpenAPI y build.

### Frontend

1. Crear Vite + React + TypeScript estricto.
2. Instalar dependencias acordadas y configurar scripts de calidad.
3. Configurar Tailwind v4, Manrope local, tokens y temas.
4. Mover logos a `src/assets/brand/`.
5. Crear cliente HTTP y almacén mínimo/versionado de sesión.
6. Implementar renovación coordinada de token.
7. Crear consultas de login y `/auth/me`.
8. Implementar `AuthProvider`, `ProtectedRoute` y bloqueo por cambio de clave.
9. Probar login, renovación, logout y unión de roles.

## Corte 0B — Login y cambio de clave

1. Construir el layout dividido del login:
   - logo blanco;
   - mensaje institucional aprobado;
   - subtítulo del sistema;
   - formulario de DNI y contraseña.
2. Crear versión móvil con cabecera oscura compacta.
3. Implementar validación, error de credenciales y estado pendiente.
4. Implementar cambio obligatorio de clave contra
   `POST /auth/cambiar-clave`.
5. No mostrar recuperación de contraseña hasta disponer de contrato.
6. Verificar teclado, lector de pantalla, claro/oscuro y 360–1440 px.
7. Añadir pruebas de componente y flujo E2E.

## Corte 0C — Dashboard y shell autorizado

### Backend

1. Definir respuesta discriminada de dashboard por secciones útiles.
2. Añadir servicio con consultas paralelas independientes y filtros por roles.
3. Evitar conteos globales para Profesor; limitar todo a sus asignaciones.
4. Publicar endpoint autenticado y documentarlo.
5. Probar usuario sin métricas, multirrol y profesor.

### Frontend

1. Crear `MainLayout`, sidebar responsive, header y selector de tema.
2. Definir capacidades y navegación en una configuración central.
3. Construir menú como unión deduplicada de roles.
4. Crear `RequireCapability` para rutas y acciones.
5. Implementar páginas 403, 404 y ErrorBoundary.
6. Construir dashboard por secciones; saludo como fallback válido.
7. Probar matrices de roles y navegación móvil.

## Corte 1 — Identidad

### Contrato

1. Auditar Personas, Alumnos, Profesores, Tutores, Usuarios e Importaciones.
2. Completar listados, detalles, filtros, paginación y mutaciones necesarias.
3. Unificar forma paginada y errores de conflicto/validación.
4. Documentar permisos de Administrador, Dirección y Gestor.

### Frontend

1. Crear primitivas compartidas de formulario, tabla, diálogo y estados.
2. Implementar listas de alumnos y profesores.
3. Implementar alta/edición y detalle de persona.
4. Implementar tutores y acceso de usuario según permisos.
5. Implementar importación con dry run, resumen y confirmación.
6. Probar documentos duplicados, máximo de tutores y permisos.

## Corte 2 — Estructura académica

1. Auditar y completar contratos de carreras, planes, cursos, plan-cursos,
   prerrequisitos y periodos.
2. Construir catálogos y formularios con estados activos/inactivos.
3. Construir detalle de carrera y plan.
4. Construir malla por ciclos con prerrequisitos comprensibles.
5. Validar relaciones inválidas y ciclos con mensajes de negocio.
6. Probar filtros, navegación y responsive.

## Corte 3 — Operación académica

1. Completar contratos de cursos programados, matrículas, inscripción a cursos y
   solicitudes de excepción.
2. Construir cursos programados y detalle.
3. Construir matrícula guiada con confirmación.
4. Construir inscripción con evaluación visible de prerrequisitos.
5. Construir bandeja de excepciones:
   - creación/consulta para roles habilitados;
   - aprobación o rechazo solo para `DIRECTOR_ACADEMICO`.
6. Probar concurrencia, conflictos y autorización.

## Corte 4 — Docencia

### Backend

1. Aplicar alcance contextual de Profesor a todas las consultas y mutaciones.
2. Completar consultas y guardado por lote de evaluación y asistencia.
3. Mantener reglas de notas, pesos y retiro por asistencia en servidor.

### Frontend

1. Crear página de curso propio.
2. Crear configuración de componentes con suma visible al 100 %.
3. Crear grilla de calificaciones 0–20 con promedio confirmado por servidor.
4. Crear captura rápida de asistencia y resumen de riesgo.
5. Probar aislamiento entre profesores, teclado y lotes fallidos.

## Corte 5 — Egreso y talleres

1. Completar consultas de elegibilidad y egresados.
2. Mantener aprobación de egreso según regla backend vigente.
3. Construir elegibilidad, aprobación y listado de egresados.
4. Completar contratos de talleres, programaciones e inscripciones.
5. Construir CRUD y flujo de inscripción de persona existente o nueva.
6. Probar snapshots, permisos y estados históricos.

## Cierre de primera parte

1. Ejecutar suite completa en ambos repositorios.
2. Auditar accesibilidad y rendimiento.
3. Verificar todos los roles simples y combinaciones relevantes.
4. Verificar claro/oscuro y 1440, 1024, 768 y 360 px.
5. Validar Swagger y documentación.
6. Preparar matriz de cobertura funcional y lista explícita de la segunda parte
   del portal Alumno.
