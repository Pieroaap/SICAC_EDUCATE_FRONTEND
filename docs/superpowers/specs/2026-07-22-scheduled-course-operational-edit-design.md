# Diseño: edición operativa de cursos programados

## Contexto

La vista de cursos programados permite crear programaciones y consultar sus alumnos o muro, pero no expone la actualización ya soportada por `PATCH /cursos-programados/:id`. Esto impide completar horarios y cupos de registros existentes desde la interfaz.

## Objetivo

Completar el CRUD visible de cursos programados permitiendo editar exclusivamente sus datos operativos, sin cambiar la identidad académica de la oferta ni afectar matrículas, notas, asistencia o publicaciones existentes.

## Alcance funcional

Desde cada fila del listado se ofrecerá la acción `Editar`. La acción abrirá un panel de formulario sobre la tabla, precargado con la programación seleccionada.

El formulario permitirá modificar:

- profesor;
- sección;
- estado activo o inactivo;
- cupo máximo;
- uno o más bloques de horario;
- día, hora inicial, hora final, modalidad y ubicación de cada bloque.

El formulario mostrará como contexto no editable:

- curso;
- carrera;
- plan curricular;
- periodo académico.

No se permitirá cambiar estas relaciones porque identifican la oferta sobre la que ya pueden existir matrículas y registros académicos.

## Interfaz y comportamiento

Se reutilizará el patrón visual de formulario en panel existente en la vista. El encabezado identificará el curso y la sección que se están editando. El contexto académico aparecerá en un resumen de solo lectura y los campos operativos debajo.

`Cancelar` cerrará el panel y descartará el borrador local. `Guardar cambios` enviará únicamente los campos operativos al endpoint existente. Durante el guardado, las acciones quedarán deshabilitadas. Un error conservará el formulario abierto y los valores introducidos, con un mensaje próximo a las acciones.

Tras un guardado exitoso se cerrará el panel y se invalidará exclusivamente la consulta de cursos programados. La fila deberá reflejar inmediatamente los nuevos datos.

## Validaciones

- Debe existir al menos un bloque horario.
- La hora final debe ser posterior a la inicial.
- Cada bloque requiere modalidad y ubicación o enlace.
- El cupo máximo, cuando se indique, debe ser un entero positivo de hasta 500.
- La sección debe ser obligatoria y no superar 30 caracteres.
- Debe seleccionarse un profesor.
- El backend seguirá siendo la autoridad final de permisos e integridad.

## Contrato y datos

El frontend agregará un cliente para `PATCH /cursos-programados/:id` con `profesorPersonaId`, `seccion`, `estado`, `cupoMaximo` y `horarios`. No se requieren endpoints ni migraciones nuevas.

La actualización reemplaza atómicamente los bloques horarios del curso programado cuando se envía `horarios`. No modifica el identificador del curso programado ni sus relaciones con alumnos, evaluaciones, asistencia, documentos o muro.

## Componentes previstos

- Extraer un formulario reutilizable de programación para creación y edición, evitando duplicar la estructura de horarios.
- Añadir la mutación de actualización al cliente de operación académica.
- Incorporar estado de selección y edición en `AcademicOperationPage`.
- Añadir la acción secundaria `Editar` en cada fila.

## Pruebas y aceptación

- La acción `Editar` carga exactamente los valores de la fila seleccionada.
- Curso, carrera, plan y periodo no pueden modificarse.
- Se pueden agregar y retirar bloques sin dejar el formulario sin horarios.
- Las validaciones impiden horas invertidas, ubicación vacía y cupo inválido.
- El `PATCH` contiene solo campos operativos.
- Un guardado exitoso actualiza la fila y conserva alumnos y accesos relacionados.
- Un error conserva el borrador y muestra una explicación.
- Cancelar no realiza solicitudes de escritura.
- La creación de cursos programados continúa funcionando con el mismo contrato.
- La vista funciona en escritorio y móvil sin ocultar acciones esenciales.

## Fuera de alcance

- Cambiar curso, carrera, plan o periodo.
- Eliminar físicamente cursos programados.
- Modificar matrículas desde el formulario de edición.
- Detectar automáticamente conflictos horarios entre profesores o aulas.
- Cambiar el contrato o la base de datos del backend.
