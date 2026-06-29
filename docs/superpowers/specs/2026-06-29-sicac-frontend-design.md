# SICAC — Especificación de diseño del frontend

**Fecha:** 2026-06-29  
**Estado:** Aprobada en conversación; pendiente de revisión final del documento  
**Ámbito:** Primera parte del frontend operativo para personal interno  
**Fuentes:** `front_architecture.md`, `front_prompt.md` como referencia histórica, `BACKEND/docs/frontend-integration.md`, Swagger y código vigente del backend

## 1. Objetivo

Construir el frontend operativo de SICAC como una aplicación web independiente,
integrada exclusivamente con contratos reales del backend. La aplicación debe
permitir que administración, dirección académica, gestión académica y docentes
realicen sus tareas con permisos correctos, trazabilidad visual y una experiencia
clara en escritorio y móvil.

El portal del rol `ALUMNO` queda fuera de esta entrega. Se diseñará posteriormente
como una segunda parte coordinada de backend y frontend.

## 2. Principios

- El backend es la autoridad de autenticación, autorización y reglas de negocio.
- El menú facilita la navegación, pero nunca sustituye controles de seguridad.
- No se crean pantallas que dependan de datos simulados ni endpoints inventados.
- La implementación avanza por módulos verticales funcionales y verificables.
- Cada vista tiene un propósito principal y estados completos de carga, vacío,
  error, permiso insuficiente y éxito.
- El dashboard solo muestra información útil y respaldada por el backend.
- La interfaz prioriza legibilidad operativa sobre decoración.

## 3. Alcance funcional

### 3.1 Incluido

1. Cierre del contrato del backend necesario para el frontend.
2. Autenticación con DNI y contraseña.
3. Renovación de sesión y cambio obligatorio de contraseña.
4. Perfil autenticado y permisos derivados de todos los roles activos.
5. Dashboard adaptativo según permisos y disponibilidad de información.
6. Identidad: personas, alumnos, profesores, tutores, usuarios e importaciones.
7. Estructura académica: carreras, planes, cursos, malla, prerrequisitos y periodos.
8. Operación académica: cursos programados, matrículas, inscripciones y
   solicitudes de excepción de prerrequisitos.
9. Docencia: estudiantes por curso, componentes de evaluación, calificaciones y
   asistencias.
10. Egreso.
11. Talleres, programaciones e inscripciones.
12. Temas claro y oscuro, diseño responsive y accesibilidad por teclado.

### 3.2 Excluido

- Portal de autoservicio del alumno.
- Datos simulados como sustituto permanente de contratos faltantes.
- Funcionalidad no respaldada por las reglas vigentes del backend.
- Rediseño del dominio o de la base de datos fuera de lo imprescindible para
  integrar las pantallas aprobadas.

## 4. Estrategia de entrega

La construcción seguirá cortes verticales:

1. **Fase 0 — Contrato backend.**
2. **Fundación frontend.**
3. **Identidad.**
4. **Estructura académica.**
5. **Operación académica.**
6. **Docencia.**
7. **Egreso y talleres.**

Cada corte incluirá contrato, tipos, acceso a datos, interfaz real, autorización,
estados de UI, pruebas automatizadas y validación visual. Un corte solo se cierra
cuando su flujo principal puede ejecutarse contra el backend.

## 5. Fase 0 — Cierre del contrato backend

La fase 0 puede modificar `BACKEND`, pero únicamente para habilitar el frontend
aprobado. Debe preservar las reglas de negocio vigentes y actualizar Swagger,
pruebas y `docs/frontend-integration.md`.

### 5.1 Perfil autenticado

Se añadirá `GET /auth/me`, autenticado con Bearer token. Su respuesta mínima será:

```json
{
  "personaId": "uuid",
  "nombres": "Ana",
  "apellidoPaterno": "Pérez",
  "apellidoMaterno": null,
  "nombreCompleto": "Ana Pérez",
  "correo": "ana@example.com",
  "roles": [
    {
      "codigo": "DIRECTOR_ACADEMICO",
      "nombre": "Director académico"
    }
  ],
  "mustChangePassword": false
}
```

Solo se devolverán asignaciones de rol activas y vigentes. El frontend utilizará
la unión deduplicada de esos roles.

### 5.2 Dashboard

Se añadirá un contrato de dashboard adaptativo. La respuesta debe contener
secciones permitidas para el usuario autenticado, no un conjunto fijo de tarjetas.
Puede incluir:

- periodo académico activo;
- métricas accionables;
- alertas que requieren atención;
- accesos rápidos permitidos;
- actividad reciente pertinente.

Si no existe información útil, la respuesta puede contener únicamente identidad,
periodo y accesos rápidos. El frontend mostrará un saludo sobrio; nunca tarjetas
vacías ni valores de relleno.

### 5.3 Operaciones faltantes

Antes de implementar cada corte se compararán sus pantallas con Swagger. Se
añadirán solo las consultas, detalles, mutaciones, filtros y paginación
imprescindibles. Las respuestas de listas usarán una convención común de datos y
metadatos de paginación. Los filtros y ordenamientos admitidos quedarán descritos
en Swagger.

### 5.4 Aislamiento del profesor

Un usuario cuyo único rol operativo sea `PROFESOR` solo podrá consultar y modificar
los cursos programados que tenga asignados y las entidades subordinadas a esos
cursos. Esto incluye estudiantes, componentes de evaluación, calificaciones y
asistencias. El backend aplicará el filtro contextual usando la identidad
autenticada; no confiará en un `profesorId` enviado por el cliente.

Si la persona también posee otro rol activo, se aplicará la unión de capacidades
de sus roles.

### 5.5 Excepciones de prerrequisitos

- Los roles habilitados podrán registrar y consultar solicitudes según su ámbito.
- Solo `DIRECTOR_ACADEMICO` podrá aprobarlas o rechazarlas.
- `ADMINISTRADOR_SISTEMA` no heredará implícitamente la facultad académica de
  resolverlas, salvo que la misma persona también tenga el rol
  `DIRECTOR_ACADEMICO`.
- Cada resolución registrará actor, fecha, decisión y observación.

## 6. Arquitectura frontend

### 6.1 Stack

- React 19 y Vite.
- TypeScript en modo estricto.
- React Router DOM.
- TanStack Query para estado remoto.
- React Hook Form y Zod para formularios.
- Axios para HTTP.
- Tailwind CSS v4.
- Primitivas accesibles de shadcn/Radix, CVA, `clsx` y `tailwind-merge`.
- Lucide para iconografía de interfaz.

No se incorporarán Redux, Zustand ni otro almacén global. El estado remoto reside
en TanStack Query; sesión, tema y preferencias pequeñas usan contextos acotados.

### 6.2 Capas

- `app/`: composición de proveedores, router y límites globales.
- `api/`: cliente HTTP, sesión, errores y tipos compartidos del contrato.
- `components/ui/`: primitivas accesibles y tokens visuales.
- `components/`: patrones compuestos compartidos.
- `features/`: cortes verticales con API, hooks, schemas, componentes y rutas.
- `layouts/`: autenticación y espacio de trabajo.
- `lib/`: formato, utilidades puras y configuración transversal.
- `test/`: utilidades de pruebas e infraestructura de mocks controlados.

Cada feature expone una interfaz pública pequeña. Ninguna feature importa
componentes internos de otra; los cruces pasan por tipos o componentes públicos.

### 6.3 Datos y URL

- TanStack Query controla caché, reintentos e invalidación.
- Los filtros, búsqueda, orden y página de las listas viven en query parameters.
- Las claves de consulta son fábricas tipadas por recurso.
- Las mutaciones invalidan únicamente los recursos afectados.
- Notas, asistencias, matrículas, egresos y resoluciones esperan confirmación del
  servidor; no usan actualizaciones optimistas que aparenten un éxito inexistente.

## 7. Autenticación y sesión

1. El usuario envía DNI y contraseña a `POST /auth/login`.
2. El frontend conserva access y refresh token según la estrategia segura que
   permita el contrato vigente.
3. Consulta `GET /auth/me`.
4. Si `mustChangePassword` es verdadero, solo permite cambio de clave y cierre de
   sesión.
5. Después del cambio de clave, recarga el perfil y habilita el espacio de trabajo.

Ante un `401`, el cliente coordina una única renovación aunque existan solicitudes
concurrentes. Reintenta cada solicitud afectada una vez. Si la renovación falla,
limpia la sesión y redirige al login. Un `403` no provoca logout.

## 8. Navegación y permisos

### 8.1 Grupos del sidebar

- Panel general.
- Personas.
- Estructura académica.
- Operación académica.
- Docencia.
- Egreso.
- Talleres.
- Administración.

Un grupo sin opciones permitidas no se renderiza. En escritorio el sidebar es
fijo y contraíble. En móvil es un panel superpuesto con cierre por botón, Escape y
selección de ruta.

### 8.2 Capacidades por rol

| Rol | Capacidades principales |
| --- | --- |
| `ADMINISTRADOR_SISTEMA` | Acceso general, administración de usuarios, importaciones y configuración operativa. No resuelve excepciones académicas por el mero hecho de ser administrador. |
| `DIRECTOR_ACADEMICO` | Personas, estructura académica, operación, docencia, egreso y resolución exclusiva de excepciones de prerrequisitos. |
| `GESTOR_ACADEMICO` | Personas, estructura operativa, matrículas, cursos programados, talleres y consultas; sin aprobar egresos ni resolver excepciones reservadas. |
| `PROFESOR` | Dashboard y cursos propios; estudiantes, evaluación, calificaciones y asistencias de esos cursos. |
| `ALUMNO` | Fuera del alcance de esta primera parte. |

Las capacidades de una persona multirrol forman una unión deduplicada. Esta matriz
se materializará en una configuración central de capacidades usada por menús,
rutas y acciones. El backend conserva controles independientes.

## 9. Dirección visual

### 9.1 Concepto: Teatro sereno

La interfaz toma del teatro su estructura y tensión visual, no ornamentación
literal. El sidebar representa la caja escénica; el área de trabajo es un plano
claro y legible. El periodo activo funciona como el programa en escena.

### 9.2 Dominio y firma

- **Dominio:** escenario, programación, elenco, periodos, ciclos, progreso y
  control institucional.
- **Firma:** presencia contextual y compacta del periodo académico activo en
  dashboard, cabeceras y filtros donde cambie el significado de los datos.
- **Se rechaza:** dashboard de tarjetas idénticas, rojo decorativo, iconografía
  teatral literal y superficies con sombras dramáticas.

### 9.3 Tokens base

- `theater-black`: `#050505`.
- `theater-dark`: `#1A1A1A`.
- `theater-red`: `#C41E3A`.
- `theater-red-hover`: `#A3162E`.
- `surface`: `#FFFFFF`.
- `surface-muted`: `#F3F4F6`.
- `text-main`: `#111827`.
- `text-muted`: `#6B7280`.

Los colores semánticos de éxito, advertencia, información y error tendrán
variantes accesibles para ambos temas. El rojo institucional se reserva para
acción principal, navegación activa, foco y alertas críticas.

### 9.4 Tipografía, espacio y profundidad

- Familia principal: Manrope, distribuida con el proyecto.
- Números tabulares para notas, conteos, porcentajes y fechas alineadas.
- Escala espacial basada en 4 px.
- Densidad media por defecto y variante compacta para tablas extensas.
- Controles de 8 px de radio, tarjetas de 12 px y diálogos de 16 px.
- Profundidad por cambios sutiles de superficie y bordes suaves.
- Sombras solo en elementos flotantes o elevados.

### 9.5 Marca y assets

- `logo-white.png`: sidebar y zona oscura del login.
- `logo-color.png`: superficies claras y login móvil.
- `logo-icon.png`: favicon y marca compacta.
- `hero.png` no se utilizará por defecto: su lenguaje púrpura no coincide con la
  dirección aprobada. Solo podrá reutilizarse si posteriormente se rediseña para
  la paleta institucional.

Los assets se moverán a la estructura definitiva del proyecto sin cambiar sus
archivos originales.

### 9.6 Tema y responsive

El tema inicial respeta `prefers-color-scheme`. El usuario puede alternarlo y su
preferencia se persiste localmente. El sidebar permanece oscuro en ambos temas.

Se verifican 1440, 1024, 768 y 360 px. Las tablas extensas ofrecen scroll
controlado, columnas prioritarias y una presentación móvil resumida cuando sea
necesario. Nunca comprimen todas las columnas hasta volverlas ilegibles.

### 9.7 Interacción y accesibilidad

- Áreas táctiles de al menos 44 px cuando el contexto lo permita.
- Foco visible, navegación por teclado y etiquetas accesibles.
- Estados default, hover, active, focus y disabled en controles.
- Estados loading, empty y error en datos.
- Movimiento menor de 250 ms, solo con `transform` y `opacity`.
- Respeto por `prefers-reduced-motion`.

## 10. Patrones de pantalla

### 10.1 Listas

Cabecera con acción principal, filtros relevantes, resumen de filtros activos,
tabla, paginación y estado vacío. “No existen registros” y “sin coincidencias”
son estados distintos.

### 10.2 Formularios

Etiquetas persistentes, ayuda breve cuando aporta valor, errores junto al campo y
resumen de error cuando el envío falla. El botón de envío refleja el estado
pendiente y evita duplicados.

### 10.3 Detalle

Cabecera con identidad, estado y acciones autorizadas. Las subentidades se
organizan en tabs o secciones con rutas enlazables cuando su complejidad lo
requiera.

### 10.4 Vistas especializadas

- Malla: ciclos y cursos con relaciones de prerrequisito comprensibles.
- Calificaciones: grilla editable con pesos, promedio y validación 0–20.
- Asistencias: captura rápida por sesión con resumen de riesgo.
- Matrícula: flujo guiado con confirmación final.

## 11. Dashboard adaptativo

El dashboard ordena su contenido por utilidad:

1. saludo e identidad;
2. periodo activo;
3. tareas o alertas accionables;
4. métricas pertinentes;
5. accesos rápidos.

No todas las secciones son obligatorias. Si el usuario no tiene métricas o alertas
útiles, se muestra solo el saludo, el contexto disponible y accesos permitidos.
No se muestran ceros decorativos ni actividad ajena al ámbito del usuario.

## 12. Errores y retroalimentación

- `401`: renovación única y logout si falla.
- `403`: vista de permiso insuficiente.
- `409/422`: mensaje de negocio junto a la acción o campo.
- `5xx` o red: mensaje recuperable y reintento.
- Acciones destructivas: confirmación explícita con nombre del objeto.
- Éxitos: feedback breve; no se usa un toast para sustituir información que debe
  permanecer en pantalla.
- ErrorBoundary global para fallos de render y límites locales en áreas complejas.

## 13. Calidad y criterios de salida

Cada corte debe cumplir:

- TypeScript estricto, lint y build sin errores.
- Pruebas unitarias de permisos, validadores y transformaciones.
- Pruebas de componentes para estados significativos.
- Pruebas de integración de rutas y formularios críticos.
- Recorrido E2E mínimo del flujo principal del módulo.
- Revisión visual en temas claro y oscuro y anchos definidos.
- Navegación por teclado, foco visible, semántica y contraste accesible.
- Swagger, tipos y `frontend-integration.md` sincronizados.
- Ninguna pantalla depende de un endpoint inexistente.

Los recorridos transversales mínimos son:

1. login, renovación y cambio obligatorio de clave;
2. navegación y bloqueo por roles;
3. unión de permisos para una persona multirrol;
4. aislamiento de datos del profesor;
5. resolución de excepciones únicamente por Dirección Académica.

## 14. Repositorio y documentación

`FRONTEND` funcionará como repositorio Git independiente de `BACKEND`. Los
documentos históricos permanecerán como referencia, pero esta especificación y el
Swagger vigente prevalecen cuando exista una contradicción.

Las decisiones reutilizables de diseño se registran también en
`.interface-design/system.md`. Los artefactos temporales del compañero visual
permanecen excluidos de Git.

