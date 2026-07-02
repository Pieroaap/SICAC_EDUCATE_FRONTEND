# Corrección del alta de personas con rol no alumno

## Problema

El formulario de alta inicia con valores de inscripción para el rol `ALUMNO`. Al cambiar a un rol no alumno, esos valores quedan ocultos pero el esquema intenta validarlos como UUID. La validación bloquea el envío sin mostrar un error accionable.

Además, el encabezado utiliza el rol recibido en la URL en lugar del rol actualmente seleccionado.

## Diseño

- La inscripción inicial seguirá siendo obligatoria únicamente para `ALUMNO`.
- El esquema aceptará los valores intermedios vacíos del formulario y comprobará carrera y periodo dentro de la validación condicional de `ALUMNO`.
- Al cambiar a un rol no alumno se limpiarán el perfil, la inscripción y el tutor para evitar datos residuales en el payload.
- El título y la descripción responderán al rol seleccionado actualmente.
- El payload de roles no alumno no incluirá datos académicos.

## Validación

- Añadir una prueba de regresión que acepte un gestor aunque los valores iniciales de inscripción estén vacíos.
- Mantener pruebas que rechacen un alumno sin carrera o periodo.
- Ejecutar typecheck, tests, lint y build.
- Reproducir el flujo autenticado y crear a Astrid Ramos Vivas como `GESTOR_ACADEMICO`.

## Fuera de alcance

- Cambiar el contrato backend.
- Crear acceso de usuario o credenciales para la nueva persona.
- Modificar permisos del rol.
