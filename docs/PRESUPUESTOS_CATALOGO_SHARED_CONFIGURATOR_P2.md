# Presupuestos / Catálogo — configurador compartido P2

Base: `1afa4439ba861946835c9f0228bb269386e7ab2b`. Rama: `feature/presupuestos-catalogo-p2-shared-configurator`.

## Implementación

`src/lib/referenceConfigurator.ts` reutiliza `CatalogReferenceDraft` y su inicializador existente (adaptación legacy C1/C3). Expone reducer puro para patches controlados, factor, activación y reset de factores. Clona imágenes y mapas, impide claves fuera de 1..18 y más de cuatro imágenes. Reset no modifica habilitación. El borrador admite un factor temporal inválido para poder editarlo; validación impide crear una opción con factor activo inválido, sin sustituirlo por defaults. Referencias nuevas: 18 defaults C1 y cero planes activos.

`src/components/admin/references/ReferenceConfigurator.tsx` contiene las cinco secciones extraídas de C3: Identificación, Información interna, Planes, Descripción e Imágenes. Conserva clases, copy, orden, indicadores internos y áreas táctiles. Estimaciones: salida exacta de `calcularPlanReferenciaCatalogo().cuotaExhibidaCatalogo`, sin fórmula o redondeo JSX adicionales. SKU/EAN son opcionales y privados; código legacy se recibe read-only sin reinterpretarlo.

El componente es controlado por draft y callbacks; no importa Firebase, Storage, solicitudes, presupuestos ni comandos de publicación. Los archivos pendientes y la URL de imagen pertenecen al contenedor; agregar/quitar archivos delega callbacks. El contenedor conserva el límite agregado de URLs + archivos + URL pendiente y todas las validaciones de guardado C3.

`CatalogReferenceWorkspace` consume estos campos y el reducer, manteniendo Publicación como sección06 propia. Guardar, preview, fingerprint, Publicar/Publicar cambios/Ver publicación, despublicar, eliminación, stock y traslado mantienen sus handlers. No se modifican endpoints ni las funciones C1/C2/C3 de cálculo/persistencia. Guardar sigue siendo privado; no publica automáticamente. Los tests C3 pueden escribir únicamente en emuladores demo; P2 no añade escrituras desde presupuesto.

## Snapshot y DTO V2

`src/lib/budgetReferenceV2.ts` define `BudgetReferenceSnapshotV2`, `BudgetOptionV2` y `BudgetOptionClientV2`. Source es EXISTING_REFERENCE con ID explícito o NEW_REFERENCE con referenceId=null. La fecha ISO UTC y optionId opaco estable los aporta el llamador; no hay reloj/azar ni generación desde índice/nombre/SKU/EAN. Nueva referencia puede cotizarse sin documento productos.

Builder valida nombre, costo positivo, imágenes hasta cuatro, dominio de planes, factores activos y al menos un plan explícitamente activo. Congela todos los planes activos con cuota estimada C1, factores/habilitación y metadata interna de trazabilidad. No usa anticipo, CANONICAL_V1, financialEngine, TNA ni desglose contractual. No existen helpers para combinar alternativas. Snapshot y miembros anidados se copian y congelan: cambios de draft o catálogo no alteran la oferta.

La allowlist cliente expone exactamente optionId, nombre, descripción, imagenUrls y planesOfrecidos; cada plan sólo cuotas/cuotaEstimada. No expone referencia privada, SKU/EAN, costo, proveedor, factores ni habilitación. Clona y congela arrays/objetos anidados. La allowlist de campos no detecta información sensible escrita por un Admin en nombre/descripción; se mantiene el requisito P1 de revisión del texto comercial antes de emitir.

VALID_FOR_BUDGET y VALID_FOR_CATALOG_PUBLICATION no son equivalentes: presupuesto acepta descripción e imágenes ausentes; publicación conserva C1/C2 (descripción, 1..4 imágenes y demás validaciones). No se usa el validador de presupuesto para relajar publicación. Un draft C3 puede guardarse privado sin planes activos; la creación de opción V2 exige al menos uno. Validaciones de persistencia C3 siguen en su constructor existente.

## Compatibilidad y límites

No cambian manualBudgetProduct, budgetEditorLifecycle, el editor legacy de presupuestos, Validaciones, CANONICAL_V1, MANUAL_FACTOR_V1, MIXED_V1, defaults financieros, NEXT_90_V1 ni snapshots existentes. MANUAL_FACTOR_V1 continúa operativo para históricos y el editor vigente; su cierre para creaciones nuevas no se activa en P2. No hay adapter que transforme históricos a V2.

P2 no integra la nueva UI final de Presupuestos ni persistencia V2, guardado opcional privado desde presupuesto, aceptación, documentación, contrato, pagaré, remito o estados comerciales. Tampoco agrega rutas/harness navegables. El test de render estático usa el mismo componente como host de presupuesto sin proveedores Firebase ni publicación.

Se mantiene la corrección P1: aceptación futura de una opción, todos sus planes ofrecidos y preferencia opcional no definitiva. Los builders P2 no eligen un plan, no definen importes contractuales y no implementan aceptación.

## Verificación

Comandos de pruebas puras nuevas:

```sh
npx tsx scripts/testReferenceConfigurator.ts
npx tsx scripts/testBudgetReferenceV2.ts
```

Cubren defaults y planes off, edición/reset/toggle, valores inválidos y fuera de dominio, casos NEXT_90_V1, imágenes, adaptación legacy sin mutaciones, copias profundas, harness estático de cinco secciones/18planes, referencia existente/nueva, planes ofrecidos, validación separada de publicación, identidades/fechas, ausencia de agregados y allowlist profunda.

Regresión ejecutada: test:safe (incluye manual-budget, routing y lifecycle), C1 (`npx tsx scripts/testCatalogReference.ts`), C3 pura, C3 Emulator y browser desktop1280/mobile390; tsc, ESLint de tocados y build. Los resultados y cualquier límite se informan al entregar, sin inferir PASS sólo por esta lista. No se debilitan assertions existentes.

Emuladores: demo-cuenta-hogar, Firestore127.0.0.1:8080 y Auth127.0.0.1:9099, guardas del runtime y Next dev demo del wrapper C3. Sin Storage real ni producción. Capturas solicitadas en `/tmp/cuenta-hogar-p2/`: catalog-desktop.png, catalog-planes-desktop.png, catalog-mobile.png y catalog-planes-mobile.png. Para generarlas se usa una copia instrumental del runner C3 fuera del repositorio: conserva todas las assertions y sólo agrega captura en los puntos editor/planes; el runner versionado también se ejecuta sin cambios.

## Próxima fase P3

Integrar el mismo configurador en Presupuestos para 1..N opciones, emisión/versionado y guardado privado opcional con idempotencia según P1. No reutilizar handlers acumulativos de Validaciones. Aceptación, documentos opcionales y límite contractual se mantienen para sus fases posteriores. Ninguna fase se habilita ni despliega automáticamente.
