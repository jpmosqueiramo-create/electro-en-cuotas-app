# Carga masiva desde Excel

El importador anterior leía CSV/TSV con `File.text()`: un archivo Excel `.xlsx` no era un formato admitido. El motor PREVIEW/APPLY ya estaba conectado.

## Flujo

1. Descargar `public/plantilla-catalogo.xlsx` (una hoja Productos, encabezados y ejemplo idénticos a BULK_TEMPLATE). La alternativa CSV y la exportación del catálogo siguen disponibles.
2. Subir .xlsx, CSV o TSV, o pegar celdas. Excel se lee localmente mediante read-excel-file 9.3.14, cargado dinámicamente. Si hay varias hojas, elegir una explícitamente.
3. Revisar carga: usa la misma API, validaciones y cálculo existente.
4. Confirmar: el motor existente guarda atómicamente y recarga la lista. Productos nuevos no se publican automáticamente.

El lector normaliza números y texto al protocolo CSV existente; no introduce campos, colecciones, migraciones, reglas, tarifas ni motores financieros. Conserva las validaciones de encabezados y máximo 100 productos, límite de archivo de 400.000 bytes y límite de texto de 200.000 caracteres. Fechas y booleanos no son celdas de catálogo válidas. Archivos .xls deben guardarse como .xlsx. Para preservar ceros iniciales, guardar SKU/códigos como texto. Las fórmulas no se ejecutan: usar valores calculados guardados en el archivo o pegar valores.

La plantilla se generó y renderizó con el runtime de @oai/artifact-tool. Su lectura real se compara con el ejemplo CSV en testCatalogSpreadsheet.ts.

## Verificación

- TypeScript, ESLint de archivos tocados, build: PASS.
- testCatalogBulk.ts y testCatalogSpreadsheet.ts: PASS.
- testCatalogBulkEmulator.ts con CATALOG_BULK_BROWSER=1: PASS, proyecto demo-cuenta-hogar, Auth/Firestore/Storage locales. Descarga real de plantilla, lectura XLSX, selección de hoja, dos altas, revisión sin escrituras, guardado y lista actualizada, ceros iniciales, decimales, archivo dañado, CSV, atomicidad, permisos e idempotencia. Vista 1280/390/320 sin desbordamiento. Cero solicitudes Firebase externas.
- verifyProductionRendererManifest.mjs y testLoopContractDisclosure.ts: PASS. Paquetes anteriores conservados íntegros.
- testProductionRendererManifest.ts: su verificación de manifiesto pasa; después falla en assertOwnerFinalCatalog, que exige que el primer paquete sea loop-owner-final-20261025-v4. La misma expectativa es incompatible con main, cuyo primer paquete ya es loop-consolidated-20261101-v5-finance-cft. No se modificó esa prueba para ocultar el fallo.

La dependencia modifica el lock, que está vinculado al manifiesto PDF. Se agrega el paquete técnico inmutable V6_XLSX_RUNTIME con el nuevo manifiesto; los textos legales y todos los paquetes previos se conservan. Sin despliegue ni escrituras productivas.
