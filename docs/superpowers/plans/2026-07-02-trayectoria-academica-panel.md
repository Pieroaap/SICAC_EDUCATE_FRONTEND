# Trayectoria académica Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Execute inline and verify each task before continuing. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar formularios comprimidos por paneles laterales accesibles y responsive.

**Architecture:** Los componentes de inscripción y antecedentes conservarán consultas y mutaciones. Cada uno separará la tarjeta de historial del formulario, controlando un `showForm` local que monta un `aside.operation-detail`.

**Tech Stack:** React 19, React Hook Form, Zod, TanStack Query, Tailwind/CSS existente.

## Global Constraints

- Reutilizar `Button`, `Input`, `FormField` y `operation-detail`.
- No cambiar contratos API ni invalidaciones.
- Mantener estados loading, error, vacío y permisos.
- Validar escritorio y móvil en navegador autenticado.

---

### Task 1: Separar resumen y formulario de inscripción

**Files:**
- Modify: `src/features/people/components/PersonCareerEnrollmentsPanel.tsx`

**Interfaces:**
- Consumes: consultas/mutaciones existentes.
- Produces: tarjeta compacta y panel “Nueva inscripción”.

- [ ] Añadir estado `showForm`, acción contextual y cierre accesible.
- [ ] Mover el formulario completo a `aside.operation-detail`.
- [ ] Cerrar el panel después de una creación exitosa.

### Task 2: Separar resumen y formulario de antecedentes

**Files:**
- Modify: `src/features/people/components/PersonAcademicRecordsPanel.tsx`

**Interfaces:**
- Consumes: cursos, inscripciones y antecedentes existentes.
- Produces: tarjeta compacta y panel “Reconocer antecedente”.

- [ ] Añadir estado `showForm`, acción exclusiva de Dirección y cierre accesible.
- [ ] Mover el formulario completo al panel lateral.
- [ ] Cerrar el panel después de una creación exitosa.

### Task 3: Pulido responsive y verificación

**Files:**
- Modify: `src/styles.css`

**Interfaces:**
- Produces: acciones alineadas, listas legibles y panel móvil sin desbordamiento.

- [ ] Añadir estilos semánticos para cabecera/acciones de las tarjetas académicas.
- [ ] Ejecutar typecheck, tests, lint y build.
- [ ] Verificar escritorio 1280×720 y móvil 390×844 en navegador autenticado.
- [ ] Crear commit frontend independiente.
