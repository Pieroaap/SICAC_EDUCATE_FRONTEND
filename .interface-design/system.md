# SICAC — Sistema de interfaz

## Dirección

**Teatro sereno:** navegación oscura, descriptiva y calmada; área de trabajo clara,
legible y operativa. La identidad teatral aparece en el contraste, el ritmo y el
periodo activo, no en ornamentos literales.

## Sistema

- Profundidad: cambios sutiles de superficie y bordes suaves; sombras solo en
  elementos flotantes.
- Espaciado: base de 4 px; densidad media y tablas compactables.
- Radios: controles 8 px, tarjetas 12 px, diálogos 16 px.
- Tipografía: Manrope; números tabulares para datos alineados.
- Sidebar: siempre oscuro, fijo y contraíble en escritorio; overlay en móvil.
- Tema: preferencia inicial del sistema, alternancia manual persistente.
- Acento: rojo institucional `#C41E3A`, usado con moderación.

## Jerarquía

- Una acción o dato focal por vista.
- Peso, contraste y espacio establecen jerarquía antes que tamaño o color.
- El periodo académico activo aporta contexto en vistas donde cambia el
  significado de los datos.
- Las listas diferencian vacío real de filtros sin coincidencias.

## Patrones

- Dashboard adaptativo: solo muestra información útil para los permisos del
  usuario; si no existe, saludo, periodo y accesos permitidos.
- Navegación: grupos ocultos cuando no contienen opciones autorizadas.
- Datos críticos: confirmación del servidor antes de reflejar éxito.
- Estados completos: interacción, carga, vacío, error y permiso insuficiente.

