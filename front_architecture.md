# SICAC — Arquitectura del Frontend

Este documento describe la estructura, componentes y flujos del frontend de SICAC, diseñado para consumir la API definida en `docs/architecture.md` del backend.

---

## 1. Stack

| Capa          | Tecnología                                     |
| ------------- | ---------------------------------------------- |
| Framework     | React 19 + Vite 8 + TypeScript (strict)        |
| Routing       | React Router DOM v7                            |
| Estado server | TanStack Query v5                              |
| Formularios   | react-hook-form + zod                          |
| HTTP          | axios                                          |
| Auth          | Supabase JS (login) + JWT en headers           |
| Estilos       | Tailwind CSS v4 + clsx + tailwind-merge        |
| Iconos        | lucide-react                                   |
| UI primitives | shadcn/ui (via CVA)                            |

---

## 2. Sistema de Diseño y Estilo Visual

Este proyecto utiliza **Tailwind CSS v4** con una configuración de tema personalizada y una estética inspirada en un **Teatro** (elegante, con contrastes oscuros y acentos vibrantes).

### 2.1 Concepto de Diseño (Theater Theme)
- **Concepto**: El diseño divide la aplicación en dos experiencias visuales. Por un lado, la navegación y las áreas estructurales (como el Sidebar) representan el "Escenario" usando tonos oscuros y profundos. Por el otro, el panel de contenido y formularios utiliza un diseño limpio y moderno con alto contraste para facilitar la legibilidad.
- **Modo Oscuro (Dark Mode)**:
  - Soportado de forma nativa mediante la clase `.dark` (configurada vía `@custom-variant dark (&:where(.dark, .dark *))` en `src/index.css`).
  - La barra lateral (Sidebar) mantiene siempre su estética oscura (`bg-theater-black`) en ambos modos.
  - El fondo del contenido cambia dinámicamente:
    - Modo Claro: `bg-surface-muted` (`#F3F4F6`).
    - Modo Oscuro: `dark:bg-zinc-950`.

### 2.2 Paleta de Colores (`src/index.css`)
Los colores principales están definidos como tokens de tema en Tailwind v4:
- **`--color-theater-black: #050505`**: Color de fondo principal para el sidebar y zonas oscuras de la interfaz.
- **`--color-theater-dark: #1A1A1A`**: Color secundario oscuro, utilizado para bordes de secciones oscuras o elementos en estado hover dentro del sidebar.
- **`--color-theater-red: #C41E3A`**: Color primario de acento de la aplicación. Se utiliza para resaltar elementos activos de navegación, botones principales, focus states y mensajes de error.
- **`--color-theater-red-hover: #A3162E`**: Tono para los estados hover de los elementos con acento rojo.
- **`--color-theater-gray: #4A4A4A`**: Gris neutro para textos secundarios y enlaces menos prioritarios.
- **`--color-surface: #FFFFFF`**: Fondo para tarjetas (cards), contenedores y componentes de formulario en modo claro.
- **`--color-surface-muted: #F3F4F6`**: Fondo general de la aplicación en modo claro.
- **`--color-text-main: #111827`**: Texto principal de alto contraste en el panel de control (modo claro).
- **`--color-text-muted: #6B7280`**: Texto secundario, placeholders y descripciones complementarias.

### 2.3 Logos y Assets Visuales (`src/assets/`)
Para mantener la coherencia de marca, se deben utilizar los siguientes recursos de imagen:
- **Logo Color (`logo-color.png`)**: Versión oficial del logo del Club de Arte & Cultura en color. Se utiliza en el formulario de inicio de sesión en dispositivos móviles y en interfaces sobre fondos claros.
- **Logo Blanco (`logo-white.png`)**: Versión monocromática blanca del logo. Utilizada en el Sidebar y en la sección del "Escenario" en la pantalla de Login (fondo oscuro).
- **Icono del Logo (`logo-icon.png`)**: Iconografía compacta del logo para avatares, pestañas o marcas simplificadas.

### 2.4 Tipografía
- Se utiliza la pila tipográfica **sans-serif por defecto de Tailwind v4** (basada en tipografías de sistema como `Inter`, `Segoe UI`, `Roboto`, `Helvetica`, `Arial`).
- **Jerarquía tipográfica**:
  - Títulos principales (ej. Hero de bienvenida): `text-5xl font-bold leading-tight`.
  - Títulos de páginas: `text-3xl font-bold`.
  - Panel de control y encabezados medianos: `text-lg font-semibold`.
  - Textos descriptivos / etiquetas: `text-sm font-medium` o `text-xs font-semibold`.

### 2.5 Componentes Estructurales Clave
- **Sidebar (`layouts/MainLayout.tsx`)**: Ancho fijo `w-64`, color de fondo `bg-theater-black`. Los links de navegación activos usan `bg-theater-red text-white shadow-md`. Los links inactivos usan `text-gray-400` y cambian a `hover:bg-theater-dark hover:text-white`. El pie del sidebar incluye el avatar del usuario en `bg-theater-red` con su inicial en blanco, su correo, rol y botones para cambiar de tema (Sun/Moon de Lucide) y cerrar sesión.
- **Campos de Formulario (`LoginPage.tsx`)**: Los campos `input` deben tener bordes redondeados (`rounded-lg`), bordes grises claros (`border-gray-300`), y en estado de foco aplicar una sombra o anillo rojo (`focus:ring-2 focus:ring-theater-red focus:border-transparent`) con una transición fluida (`transition-all`).

---

### 3.3 Flujo de autenticación

```
[Usuario] --(DNI + password)--> [LoginPage]
                                    │
                                    ▼
                            [supabase.auth.signInWithPassword]
                                    │
                                    ▼
                            [POST /api/auth/me (con JWT)]
                                    │
                                    ▼
                            [AuthContext actualiza user + roles + menús]
                                    │
                                    ▼
                            [Renderiza MainLayout con sidebar dinámico]
```

El `AuthContext` ya existe y funciona, pero hay que actualizarlo para que coincida con el nuevo modelo de backend (usar `personaId` en lugar de `id`, y `roles` como array de `{ codigo: string; nombre: string }`).

---

---

## 6. Patrones de UI por feature

### 5.1 Listas (página principal de cada feature)

Todas las listas siguen el mismo patrón:

```
[PageHeader: título + botón "Nuevo"]
[Filters: búsqueda, filtros por estado/dominio]
[DataTable: columnas con sort, acciones por fila (editar/ver/eliminar)]
[Pagination: si aplica]
[EmptyState: cuando no hay datos]
```

### 5.2 Formularios

- `react-hook-form` + `zod` para validación
- Componentes `ui/` reutilizables (Input, Select, etc.)
- `FormField` wrapper que unifica label + error message
- Submit button con estado `isPending` de TanStack Query

### 5.3 Detalle de entidad

- Cabecera con nombre y estado
- Tabs o secciones para sub-entidades relacionadas
  - Ej: Persona → Datos generales, Roles, Tutores, Historial académico
  - Ej: Carrera → Datos generales, Planes curriculares, Malla

### 5.4 Páginas especiales

| Página | Patrón |
|--------|--------|
| **Malla curricular** | Grid visual: filas = ciclos, columnas = cursos, flechas = prerrequisitos |
| **Calificaciones** | Tabla: filas = estudiantes, columnas = componentes de evaluación, editable inline |
| **Asistencias** | Matriz: filas = estudiantes, columnas = fechas de sesión, toggle rápido presente/tardanza/falta |
| **Auto-matrícula** | Wizard: seleccionar carrera → ver cursos disponibles → confirmar inscripción |

---


### 7.3 Manejo de errores

- `ErrorBoundary` global en `App.tsx` para errores de render
- `react-hot-toast` o similar para notificaciones de éxito/error
- Errores 401 → `AuthContext` fuerza logout y redirige a `/login`
- Errores 403 → mostrar mensaje de "no tienes permiso"
- Errores 409/422 → mostrar mensaje del servidor en el formulario

---
