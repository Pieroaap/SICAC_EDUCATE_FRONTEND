# Sistema visual de SICAC

## Dirección: Teatro sereno

SICAC usa una interfaz administrativa sobria inspirada en un programa teatral: jerarquía clara, rojo institucional como acento y superficies cálidas discretas. La información y los estados deben dominar sobre la decoración.

## Fundamentos

- Tipografía: Manrope; títulos compactos y texto de interfaz legible.
- Color primario: `#C41E3A`; reservarlo para acciones, foco y navegación activa.
- Sidebar: oscuro, fijo en escritorio y colapsable en móvil.
- Espaciado: escala base de 4 px.
- Radios: 8 px en controles, 12 px en paneles, 16 px en superficies principales.
- Bordes y sombras: sutiles; nunca usar sombras pesadas para separar información.
- Estados: éxito verde, advertencia ámbar, error rojo; siempre acompañar color con texto.

## Patrones

- Encabezados con eyebrow, título y descripción breve.
- Formularios agrupados en paneles; etiquetas visibles y errores próximos al campo.
- Listados paginados y estados vacíos explícitos.
- Tarjetas solo cuando cada elemento tenga identidad y acciones propias; para comparación tabular usar tablas.
- Botón primario único por contexto. Acciones secundarias y destructivas deben distinguirse.
- Diseño responsivo sin ocultar datos o acciones esenciales.

## Accesibilidad y seguridad visual

- Mantener foco visible, contraste suficiente y objetivos táctiles de al menos 40 px.
- No renderizar HTML recibido en publicaciones; el contenido se presenta como texto.
- Descargas privadas se inician mediante una acción explícita y URL temporal.
