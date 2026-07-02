# Trayectoria académica — ajuste visual

## Problema

Los formularios de inscripción y antecedentes se renderizan dentro de dos tarjetas
estrechas. La cuadrícula interna comprime etiquetas, campos y botones hasta hacerlos
ilegibles.

## Diseño aprobado

- La ficha muestra dos tarjetas de resumen: inscripciones y antecedentes.
- Cada tarjeta prioriza el historial, su estado vacío/error/carga y una acción clara.
- “Nueva inscripción” y “Reconocer antecedente” abren un panel lateral con el mismo
  patrón de Matrícula masiva.
- El panel contiene el formulario a ancho completo, encabezado, cierre accesible y
  errores junto a la acción.
- En móvil, el panel ocupa el ancho disponible y los campos se apilan.
- Los permisos permanecen visibles: consulta para gestores, alta de inscripción para
  administrador/gestor y reconocimiento solo para dirección.

## Validación

- Escritorio 1280×720: tarjetas sin cortes y panel sin desbordamiento.
- Móvil 390×844: una columna, controles legibles y cierre visible.
- Estados carga, error y vacío conservados.

