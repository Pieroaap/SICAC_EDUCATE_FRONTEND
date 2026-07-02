# Non-Student Person Creation Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir crear personas con roles no alumno sin que campos académicos ocultos bloqueen el envío.

**Architecture:** Mantener un único formulario y hacer condicional la validación académica según el rol seleccionado. Limpiar valores exclusivos de alumno al cambiar de rol y mantener el encabezado sincronizado con la selección actual.

**Tech Stack:** React 19, TypeScript, React Hook Form, Zod, Vitest.

## Global Constraints

- La inscripción solo es obligatoria para `ALUMNO`.
- Los payloads no alumno no incluyen perfil, inscripción ni tutor.
- No se modifica el contrato backend.

---

### Task 1: Validación condicional y regresión

**Files:**
- Modify: `src/features/people/personForm.ts`
- Test: `src/features/people/personForm.test.ts`

**Interfaces:**
- Consumes: `createPersonSchema` y `toCreatePersonPayload`.
- Produces: validación condicional por `initialRole`.

- [x] **Step 1: Añadir prueba que acepte un gestor con inscripción vacía**

Usar `createPersonSchema.safeParse` con `initialRole: 'GESTOR_ACADEMICO'` y los valores vacíos por defecto; esperar `success: true`.

- [x] **Step 2: Ejecutar la prueba y confirmar el fallo**

Run: `npm test -- personForm.test.ts`
Expected: FAIL porque `initialRegistration` intenta validar UUID vacíos.

- [x] **Step 3: Mover la validación UUID a `superRefine`**

Definir los campos como strings de formulario y, solo para `ALUMNO`, añadir errores en `initialRegistration.carreraId` y `initialRegistration.periodoInicioId` cuando no sean UUID.

- [x] **Step 4: Ejecutar la prueba**

Run: `npm test -- personForm.test.ts`
Expected: PASS.

### Task 2: Sincronización visual y limpieza

**Files:**
- Modify: `src/features/people/components/PersonCreatePage.tsx`

**Interfaces:**
- Consumes: `initialRole` observado por React Hook Form.
- Produces: encabezado sincronizado y valores exclusivos de alumno limpiados.

- [x] **Step 1: Usar `initialRole` en título y descripción**

Reemplazar el uso de `defaultInitialRole` en el encabezado por el valor observado.

- [x] **Step 2: Limpiar campos al salir de Alumno**

Usar `setValue` para establecer `alumnoPerfil`, `initialRegistration` y `tutor` como `undefined`, además de desactivar `includeTutor`.

- [x] **Step 3: Ejecutar cierre frontend**

Run: `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`.
Expected: todos los comandos finalizan con código 0.

### Task 3: Validación autenticada

**Files:**
- No code files.

**Interfaces:**
- Consumes: formulario corregido en `http://localhost:5173/personas/nueva`.
- Produces: persona real con rol `GESTOR_ACADEMICO`.

- [x] **Step 1: Completar el formulario**

Ingresar DNI, nombres, apellidos y correo autorizados por el usuario; seleccionar Gestor académico.

- [x] **Step 2: Crear y verificar**

Enviar una vez, comprobar navegación al detalle y verificar que el rol activo sea Gestor académico.

- [x] **Step 3: Commit**

Crear un commit frontend separado con la corrección y el plan.
