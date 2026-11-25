# Catálogo: alta y edición en ventana emergente

## Comportamiento

- **Agregar producto** y **Editar** abren un diálogo centrado sobre el catálogo,
  sin navegación, panel lateral ni reducción del listado de fondo.
- El formulario conserva carga simple y edición completa. No suma campos
  obligatorios: nombre y costo siguen siendo suficientes para un borrador.
- Encabezado y acciones de guardado permanecen visibles; sólo el contenido del
  formulario se desplaza. Se adapta al ancho disponible.
- **Guardar y cerrar** vuelve al listado después de confirmar la escritura,
  consultar la ficha guardada y actualizar el catálogo.
- **Guardar y cargar otro** conserva proveedor, categoría y configuración de
  planes; limpia la identidad del producto siguiente y enfoca el nombre.
- Cerrar o pulsar Escape con cambios abre una confirmación dentro de la página.
  Cancelar conserva el borrador; descartar vuelve al listado. Durante un guardado
  o una creación con resultado incierto se conserva el editor y su reintento.
- El diálogo nativo aísla el fondo, mantiene el recorrido de Tab dentro de la
  ventana y devuelve el foco al cerrar. Los diálogos superpuestos conservan el
  bloqueo de desplazamiento hasta cerrar el último.

## Compatibilidad

No cambia colecciones, campos, reglas, cálculos, snapshots ni el protocolo de
creación idempotente. Guardar sigue siendo privado; publicar requiere la vista
previa y confirmación existentes. No requiere migración.

## Verificación

Prueba de navegador local con Auth y Firestore Emulator, proyecto
`demo-cuenta-hogar`, con productos sintéticos: alta, edición, cierre limpio,
cancelación y descarte de cambios, vista previa superpuesta, foco, Tab,
validación de obligatorios, dos altas consecutivas y conservación de filtros.
Revisadas dimensiones 1280×720, 390×844 y 338×804. No se probaron subidas de
archivos porque Storage no forma parte de estos emuladores.

Gates: TypeScript, ESLint de los componentes modificados, build y suites
`testCatalogQuickEntry.ts`, `testCatalogReferenceEditor.ts`,
`testCatalogReference.ts`, `testCatalogPublicationPure.ts` y
`testCatalogQuickEntryEmulator.ts`. Los comandos, resultados y capturas se
registran en el informe local de verificación del commit bajo revisión.

Ninguna prueba modifica datos productivos. Este cambio requiere aprobación de
su SHA antes de desplegarlo en Firebase App Hosting.
