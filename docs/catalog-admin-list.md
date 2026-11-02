# Catálogo administrativo: listado, clasificación y orden

## Operatoria

Listado único con miniatura, nombre, marca/tipo, estado de publicación, costo proveedor y cuota estimada de 12 pagos. En móvil los importes se agrupan en dos columnas y las acciones se acomodan al ancho. Se conservan edición, publicación, stock y eliminación con sus controles existentes.

Buscar por palabras de nombre/marca/tipo/SKU (sin diferencias de mayúsculas o tildes). Filtrar por marca y tipo, incluyendo Sin marca / Sin clasificar. Orden ascendente o descendente por nombre, marca, tipo, costo y cuota en 12 pagos. Comparación alfabética española con números naturales; valores ausentes siempre al final y desempate estable por nombre/ID. Restablecer filtros vuelve al orden por nombre; no borra la selección múltiple.

El importe en 12 pagos usa exclusivamente el cálculo de catálogo existente con su costo y factor guardados; no muestra una cuota si el plan está deshabilitado o sus datos son inválidos. No usa un cuota12 legacy obsoleto para reemplazar planes deshabilitados ni recalcula snapshots de presupuestos u operaciones.

## Schema y compatibilidad

Se agregan sólo dos campos opcionales al documento privado `productos/{id}`:

- `marca`: string sin espacios extremos, hasta 80 caracteres; null al limpiar.
- `tipoProducto`: string sin espacios extremos, hasta 100 caracteres; null al limpiar.

Consumidores: edición directa del catálogo en ReferenceConfigurator (los campos de clasificación sólo se muestran en contexto CATALOG), createCatalogReferenceDraft/buildCatalogReferencePrivatePatch, listado administrativo y carga/exportación masiva. La categoría de servicios A/B/C/D sigue siendo independiente. No se infiere marca ni tipo desde el nombre y no se ejecuta backfill: documentos anteriores siguen válidos y aparecen sin clasificar. El editor guarda valores explícitos al actualizar una ficha.

Carga masiva admite columnas opcionales `marca` y `tipo_producto`, además de los campos existentes. Las celdas vacías en una actualización conservan los valores existentes; el editor individual permite limpiarlos. Plantillas XLSX/CSV y exportación incluyen las columnas; las planillas anteriores siguen siendo válidas. PREVIEW incluye los metadatos para revisar antes de guardar. No se agregan colecciones, índices ni cambios de Rules: productos ya admite campos privados para admin.

Catálogo público, portal afiliado y payload cliente siguen con sus allowlists existentes; no se agregan campos a esas proyecciones ni a snapshots contractuales. No se modifican motores, factores, comisiones ni documentos históricos.

## Verificación

- tsc, ESLint de archivos modificados y build.
- testCatalogAdminList.ts: orden numérico/alfabético, filtros y búsqueda, ausentes al final, metadatos opcionales, límites, preservación, import/export y allowlist pública.
- testCatalogReferenceEditor.ts, testCatalogBulk.ts, testCatalogSpreadsheet.ts, testBudgetReferenceV2.ts y testLoopContractDisclosure.ts.
- testCatalogListEmulator.ts: navegador real con orden por costo/cuota, filtros combinados, búsqueda, reset, edición de un documento anterior sin campos, guardado y recarga, sin tocar historial. Vistas 1280/390/320 sin desbordamiento, cero Firebase externo y cero escrituras Storage.
- testCatalogBulkEmulator.ts: marca/tipo desde importación junto a compatibilidad XLSX/CSV, idempotencia, atomicidad, concurrencia y preservación de stock.
- testCatalogBulkDeleteEmulator.ts: selección filtrada y controles de eliminación existentes.

La edición compartida está vinculada al manifiesto PDF: se agrega paquete técnico V7_CATALOG_METADATA y se conservan íntegros paquetes previos y párrafos legales. verifyProductionRendererManifest.mjs verifica hashes. La suite testProductionRendererManifest.ts mantiene su limitación preexistente documentada en el PR 124: assertOwnerFinalCatalog exige un paquete de octubre como primero; no se alteró para ocultar ese fallo.

No se han desplegado estos cambios ni escrito datos productivos.
