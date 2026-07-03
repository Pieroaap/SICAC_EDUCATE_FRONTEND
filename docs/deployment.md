# Despliegue en Vercel

## Proyecto

- Repositorio: `Pieroaap/SICAC_EDUCATE_FRONTEND`.
- Rama de producción: `main`.
- Framework preset: Vite.
- Build command: `npm run build`.
- Output directory: `dist`.
- Plan: Hobby.

## Variable de entorno

Configurar `VITE_API_URL` con la URL pública del backend en Render, sin
barra final. Debe aplicarse a Production y Preview cuando ambos entornos
usen el mismo backend.

## Rutas

La aplicación usa React Router. Vercel debe reescribir las rutas que no
correspondan a archivos estáticos hacia `/index.html` para permitir
recargas y accesos directos.

## Verificación

- La pantalla de acceso carga sin errores.
- Una ruta interna puede recargarse sin devolver 404.
- Las solicitudes se envían a Render.
- El inicio de sesión y la renovación de sesión funcionan.
