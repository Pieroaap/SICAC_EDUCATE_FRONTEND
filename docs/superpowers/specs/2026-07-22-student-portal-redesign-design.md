# Rediseño del portal del alumno

## Objetivo

Convertir `/portal` en una agenda académica útil para el alumno autenticado y trasladar la información que depende de un curso a una vista de curso explícita. El inicio deja de funcionar como un contenedor de todos los datos disponibles y pasa a responder qué tiene el alumno ahora y cuál es su siguiente acción.

## Decisiones aprobadas

- El inicio muestra próximas evaluaciones, cursos activos, avisos relevantes y talleres.
- La asistencia y los documentos dejan de aparecer en el portal general.
- La asistencia y los documentos se consultan dentro del curso programado correspondiente.
- El historial académico publicado se retira del inicio y se ofrece como pantalla secundaria.
- El bloque `Mis talleres` permanece en el inicio.
- El historial representa únicamente resultados finales oficiales provenientes de actas publicadas.

## Arquitectura de información

### Inicio `/portal`

1. Encabezado personal y resumen del periodo activo.
2. `Próximo en tu agenda`, con la evaluación o clase más cercana cuando exista.
3. `Mis cursos`, con nombre, código, periodo, próximo horario y acceso al espacio del curso.
4. `Mis talleres`, con estado, modalidad, fecha y ubicación.
5. Acceso secundario a `Mi historial académico`.

Las secciones sin datos muestran un estado vacío breve y orientado a la acción. No se renderizan títulos aislados ni cuadrículas vacías.

### Curso `/portal/cursos/:courseId`

La vista pertenece al curso programado y presenta:

- resumen y horario;
- muro;
- notas publicadas del curso;
- asistencia del alumno en ese curso;
- documentos institucionales o vinculados a ese curso.

El acceso debe comprobar en backend que el `personaId` autenticado posee una matrícula válida en el curso programado. El frontend no enviará un identificador de alumno.

### Historial `/portal/historial`

Lista de cursos con acta publicada, agrupada por periodo. Cada registro muestra curso, nota final, letra, descripción y condición académica. Los cursos sin resultado publicado no aparecen.

## Contrato backend

Se mantendrán los endpoints personales bajo `/alumno/me` y se agregarán consultas contextualizadas por curso:

- `GET /alumno/me/cursos/:courseId`
- `GET /alumno/me/cursos/:courseId/notas`
- `GET /alumno/me/cursos/:courseId/asistencia`
- `GET /alumno/me/cursos/:courseId/documentos`

Todos derivan la identidad desde `request.auth`, validan matrícula y devuelven `404` o `403` según la convención existente sin revelar cursos ajenos. Los endpoints generales de asistencia y documentos pueden conservarse temporalmente por compatibilidad, pero el frontend nuevo no los consumirá desde el inicio.

## Dirección visual

La dirección es `Agenda académica`, dentro del sistema visual `Teatro sereno`.

- Persona: alumno que consulta desde computadora o móvil antes de una clase o ensayo.
- Tarea principal: identificar rápidamente qué viene después y entrar al curso correcto.
- Sensación: clara, serena y cercana a un programa teatral, sin decoración innecesaria.
- Firma: bloque `Próximo en tu agenda`, tratado como una llamada a escena.
- Paleta: negro escenario, marfil de programa, rojo institucional, ámbar de aviso y verde de confirmación.
- Profundidad: superficies cálidas con sombra muy sutil; bordes reservados para controles y separaciones necesarias.
- Tipografía: Manrope, jerarquía basada en peso, color y espacio antes que en tamaños exagerados.
- Ritmo: base de 4 px, áreas operativas compactas y separación amplia entre grupos.

Se rechazan la cuadrícula uniforme de tarjetas, los contadores decorativos circulares y las secciones vacías sin explicación.

## Estados y accesibilidad

- Carga con esqueletos que conserven la geometría de la pantalla.
- Error por sección con opción de reintento cuando corresponda.
- Estados vacíos con explicación concreta, por ejemplo `Aún no tienes evaluaciones programadas`.
- Objetivos táctiles mínimos de 40 px y foco visible.
- Fechas y estados no dependerán únicamente del color.
- En móvil, la agenda y los cursos mantienen el orden de prioridad; no se oculta información esencial.
- Se respeta `prefers-reduced-motion`.

## Pruebas y aceptación

- Un alumno no puede consultar asistencia, documentos ni notas de un curso ajeno alterando `courseId`.
- El inicio no solicita ni renderiza historial, asistencia o documentos generales.
- Cada curso enlaza a su vista contextual y muestra exclusivamente información de ese curso.
- El historial solo presenta resultados publicados y funciona correctamente vacío.
- Talleres continúan visibles en el inicio y cuentan con estado vacío.
- La pantalla se verifica en escritorio y móvil sin solapamientos, cortes ni controles inaccesibles.
- Se cubren estados de carga, error, vacío y datos completos.

## Fuera de alcance

- Cambiar reglas de notas, asistencia o documentos.
- Permitir edición académica desde el rol alumno.
- Incorporar mensajería, chat o notificaciones push.
- Crear matrículas, talleres o datos simulados para completar la interfaz.
