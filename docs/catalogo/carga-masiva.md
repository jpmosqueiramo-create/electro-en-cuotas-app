# Carga masiva de precios del catálogo

Administración → Catálogo → Carga masiva de precios. Permite pegar celdas copiadas desde Excel o elegir CSV/TSV UTF-8. No requiere instalar dependencias ni enviar archivos a terceros. El archivo se lee en el navegador y su texto se envía exclusivamente al endpoint administrativo de Cuenta Hogar.

## Operatoria

1. Exportar el catálogo para actualizar, o descargar la plantilla para productos nuevos.
2. Una fila por producto, con encabezados. Máximo 100 productos por carga y 200.000 caracteres de texto.
3. Revisar las filas: producto nuevo/existente, proveedor, categoría de servicios, costo anterior/nuevo, factores y cuotas resultantes.
El editor individual debe estar cerrado para evitar que una ficha abierta conserve un costo anterior a la importación. Durante el guardado masivo no se abren ediciones individuales.

4. Confirmar la carga completa. Con errores no se guarda nada. Si hubo un cambio concurrente, hay que revisar nuevamente.

`id` identifica exactamente una ficha existente; nunca se recrea un ID inexistente. Si no se indica ID, se busca por SKU normalizado (espacios externos, Unicode NFKC y mayúsculas). Un SKU ambiguo o repetido se rechaza. Las altas usan un ID determinístico derivado del SKU; repetir una carga no genera un segundo producto. Conviene conservar el ID en la exportación y usar SKU y código de barras como identificadores de negocio. Marca/modelo pueden incluirse en el nombre o descripción existentes; la categoría de servicios utiliza el campo existente `categoriaLogistica`; no se crean campos de producto ni vigencias programadas.

| Columna | Uso |
| --- | --- |
| id | ID existente, preferido para actualizaciones |
| sku | Obligatorio para altas; permite encontrar fichas existentes sin ID |
| nombre | Obligatorio en altas; vacío conserva el existente |
| costo | Obligatorio, pesos ARS; se usa el importe ingresado sin agregar conceptos fiscales |
| proveedor | Obligatorio en altas; vacío conserva el existente |
| categoria_logistica | Categoría de servicios existente: A, B, C o D. Opcional; vacío conserva la actual y un alta sin categoría queda sin asignar |
| cuotas | Plazos 1–18 separados por `|`, por ejemplo `8|12`; vacío conserva los existentes |
| factor_1 … factor_18 | Factor explícito de cada plazo nuevo; vacío conserva un factor existente |
| descripcion | Opcional; vacío conserva la existente |
| codigo_barras | Opcional, texto para conservar ceros iniciales |

También se reconocen encabezados equivalentes: `skuInterno`, `costoProveedor`, `cuotasDisponibles` y `categoriaLogistica` (también `categoria`, `categoriaServicios` o `Categoría de servicios`), sin distinguir acentos o mayúsculas. Columnas desconocidas o repetidas se rechazan. CSV admite comillas escapadas y saltos de línea dentro de celdas; el pegado desde Excel admite tabulaciones. Costo: `400000`, `400000,50`, `400000.50` o `400.000,50`; no usar `$`, porcentajes ni fórmulas. Un factor es multiplicador, por ejemplo `2,31` o `3`. Los CSV exportados neutralizan valores que podrían interpretarse como fórmulas.

La plantilla y la exportación incluyen `categoria_logistica` y `codigo_barras`. La categoría acepta letras minúsculas y se guarda como A/B/C/D. Sólo asigna el campo privado ya existente `productos/{id}.categoriaLogistica`; no modifica la tabla de tarifas, no copia importes de gestión/entrega/asistencia al producto ni agrega categorías. Las plantillas anteriores sin esta columna siguen siendo válidas y conservan la categoría existente. No requiere migración ni cambios de Rules. La revisión muestra la categoría que se guardará; no se expone en la proyección pública.

Los cálculos reutilizan `createCatalogReferenceDraft`, `buildCatalogReferencePrivatePatch` y `generarPlanesPublicablesCatalogo`. No se modifica `canonicalPricingEngine.ts`, ni se recalculan presupuestos, contratos o cronogramas guardados. La exportación incluye factores por los plazos activos del catálogo.

Por defecto se guardan fichas privadas. La opción **Actualizar también las publicaciones existentes**, seleccionada antes de revisar, permite reemplazar sus proyecciones públicas en la misma transacción, utilizando la allowlist y validación existentes de publicación. La revisión muestra cuántas publicaciones se actualizarán. Nuevos productos nunca se publican automáticamente: requieren completar imágenes/descripción y publicarse desde su ficha. La visibilidad general del catálogo no cambia.

Imágenes, stock, fechas de creación, datos legacy ajenos a los campos importados y tipos Firestore se conservan. Una celda opcional vacía no borra datos; para eliminarlos se usa el editor individual. La fecha de la carga queda registrada automáticamente como auditoría de la operación, sin programar vigencias futuras.

## Endpoint, consistencia y datos

`POST /api/admin/catalogo/carga-masiva` exige `verifyAdminAuth`, con token vigente/revocable y la identidad administrativa actual; no basta un claim genérico. Devuelve `Cache-Control: private, no-store`. Admite:

- PREVIEW: `{action:'PREVIEW', text, updatePublished:boolean}`. No escribe.
- APPLY: mismos datos más `digest` revisado y `commandId` UUID. Reintenta el mismo comando tras una respuesta perdida; no se acredita un segundo guardado.

La revisión devuelve filas/errores, cuotas resultantes, digest y cantidad de publicaciones afectadas. Cada fila del DTO administrativo incluye ahora `categoriaLogistica: A|B|C|D|null`, tomada del mismo patch del editor individual; este dato de revisión no agrega un campo persistido nuevo. El digest vincula texto, modalidad y versiones exactas de las fichas/proyecciones. APPLY vuelve a leer dentro de una transacción, rechaza cambios, valida todas las filas y guarda en conjunto. Un fallo revierte todas las escrituras. La búsqueda por SKU utiliza la lectura administrativa del catálogo, limitada a 5.000 documentos por colección. No pretende imponer unicidad global a ediciones manuales ajenas; comprueba ambigüedades al revisar y al confirmar.

No cambia nombres de colecciones ni requiere migrar productos. La colección privada existente es `catalogo_cargas_masivas/{commandId}` con `{schemaVersion:1, actor:string, at:ISO string, payloadHash:sha256, count:number, publishedUpdates:number, productIds:string[], limit:100}`. No guarda el CSV original ni credenciales. Consumidor: el endpoint para reintentos idempotentes. Se aplican las Rules vigentes de acceso exclusivamente administrativo; no se despliegan Rules ni índices nuevos.

## Verificación

- `scripts/testCatalogBulk.ts`: CSV/TSV, comillas, decimales, factores, filas, encabezados, límites, preservación y exportación protegida contra fórmulas; categorías A/B/C/D, aliases, valores inválidos, compatibilidad con plantillas anteriores y esquema idéntico al editor individual.
- `scripts/testCatalogBulkEmulator.ts`: permisos, revisión sin escrituras, transacción, reintentos concurrentes, conflictos, altas y actualización de publicaciones allowlist; stock, timestamps y presupuesto previo intactos; alta/cambio/preservación de categoría y rechazo atómico de categorías inválidas.
- `CATALOG_BULK_BROWSER=1`: interfaz real con servidor Next y Firebase Emulators; pegado con categoría, CSV seleccionado desde archivo, revisión de la categoría, confirmación, categoría actualizada en la ficha y rechazo de categoría inválida; anchos 1280/390/320.

Usar exclusivamente el proyecto `demo-cuenta-hogar`, Auth 9099, Firestore 8080 y Storage 9199, con Java 21 y `LOCAL_BROWSER_WEBPACK=1`. El correo del administrador sintético coincide con las Rules existentes. No se realizan importaciones ni cambios de precios en producción durante las pruebas.

Resultado de esta implementación: TypeScript, ESLint de los archivos TypeScript modificados y build correctos, sin errores ni advertencias de lint. Suite pura y suite con Firebase Emulators/Chrome correctas; selección de CSV real, pegado, confirmación, validación por fila, bloqueo de edición individual concurrente y ausencia de desbordes en 1280/390/320. Sin deploy ni escrituras productivas.
