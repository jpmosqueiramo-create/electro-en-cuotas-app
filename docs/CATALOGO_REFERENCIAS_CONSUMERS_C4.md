# Catálogo de referencias — consumidores C4

Base: `ed3e28f7d64eb0a1b5f221218d7290f04d8cb5e0`. Rama `feature/catalogo-referencias-c4`.

## Frontera pública

HomeTechCatalog, PublicCatalog (/servicio-de-compra), /solicitar, /cliente y /afiliado consumen un cliente HTTP compartido. GET /api/catalogo y GET /api/catalogo/[id] leen exclusivamente catalogo_publico mediante Admin server-side. No requieren autenticación; el parser runtime construye un nuevo DTO mediante allowlist, incluidos planes anidados. Ningún documento privado enriquece ni reemplaza una referencia pública faltante. Respuestas y fetch usan no-store.

El parser exige referenciaId igual al ID del documento, nombre no vacío, descripción string, 1–4 imágenes no vacías (contrato C1 real), al menos un plan único 1–18 con importe finito positivo, publicado=true y schemaVersion=1. Campos desconocidos se descartan. El listado excluye malformados con logging sólo de ID y ordena por nombre normalizado e ID; detalle inválido/retirado devuelve 404, ID inválido 400, fallos internos 500 genérico. La allowlist de claves no sustituye la revisión humana del contenido público e imágenes.

Los consumidores sólo muestran planesPublicados: no recalculan ni reciben parámetros financieros. Home limita a seis referencias y sólo destaca/envía cuotas=12 si ese plan existe. PublicCatalog busca nombre/descripción, filtra 1–18 y usa galería pública. Solicitar selecciona parámetro publicado; en su ausencia permite 12 si existe, y en otro caso exige elección. Carga, error, vacío y retirada se presentan por separado.

## Identidad y solicitudes

Se mantiene productoId=referenciaId; productoNombre/productoDeseado usan nombre público, planElegido=String(cuotas), montoCuota=cuotaEstimada. No se agregan catalogReferenceId, schema/revisión o fingerprints a solicitudes ni solicitudes_cuenta. No se obtienen ni inventan precioContado, TNA o mora para nuevas consultas del catálogo. Las solicitudes históricas, sus snapshots, PDF, reglas y motores conservan su comportamiento. El flujo libre A definir existente no fabrica ficha ni importe de catálogo.

El catálogo de /afiliado se carga en un efecto independiente de solicitudes y muestra únicamente planes publicados, incluidos 13–18. Las nuevas selecciones de /cliente y /afiliado se validan antes de sus uploads preexistentes; las pruebas C4 no ejecutan uploads. catalogManager permanece sin imports en src: candidato legacy a retiro C6, sin eliminarlo ni ejecutar su alta automática desde consumidores públicos.

## Permisos y límites transitorios

PREEXISTING_PERMISSION_DEFECT=YES; INTRODUCED_BY_C4=NO. /cliente consulta solicitudes por clienteId mientras las reglas autorizan clienteAuthUid/email; /afiliado consulta por afiliadoEmail no contemplado como autorización. C4 no cambia estas queries ni corrige Rules. El catálogo funciona independientemente de ese fallo; no se acredita la carga de operaciones ni sus escrituras con el smoke de navegación.

PUBLIC_PRODUCT_EXPOSURE_FIXED=NO: productos conserva lectura pública legacy. catalogo_publico aún no tiene lectura directa pública por Rules; por eso se usa la API servidor. SAFE_TO_DEPLOY_STANDALONE=NO: no se acreditó ni realizó backfill productivo. C5 debe inventariar/revisar referencias e imágenes, preparar publicación/backfill idempotente aprobado, probar cierre de productos y permisos específicos de proyección, validar consumidores y coordinar deploy manual. Sin cambios a Firestore/Storage Rules, pricing o producción en C4.

## Auditoría estática de accesos a productos

Los cinco consumidores tienen cero accesos directos. Import graph runtime revisado: no alcanzan firebase-admin, publicCatalogReader, catalogPublicationService ni catalogManager. El uso financiero histórico en snapshots/PDF no se sustituye por el catálogo vivo.

| Archivo | Clasificación | Líneas C4 |
| --- | --- | --- |
| `src/app/admin/validaciones/page.tsx` | ADMIN | 469, 511, 556, 588, 1022, 1801, 1925 |
| `src/app/admin/productos/page.tsx` | ADMIN | 22, 125, 180, 200 |
| `src/app/admin/presupuestos/page.tsx` | ADMIN | 426, 801 |
| `src/app/api/admin/reserva-stock/route.ts` | ADMIN | 56 |
| `src/app/api/admin/calcular-pricing/route.ts` | ADMIN | 42 |
| `src/app/api/admin/liberar-reserva/route.ts` | ADMIN | 38 |
| `src/components/admin/catalog/CatalogReferenceWorkspace.tsx` | ADMIN | 109, 111, 116, 159 |
| `src/lib/catalogPublicationService.ts` | SERVER_PRIVADO | 15, 36, 59 |
| `src/lib/catalogManager.ts` | LEGACY_SIN_CONSUMIDORES | 19, 35 |
| `src/lib/stockUtils.ts` | SERVER_PRIVADO | 32 |

LEGACY_SIN_CONSUMIDORES clasifica la función de catalogManager que aún define acceso, pero no tiene callers en src; no es un consumidor activo no-admin.

## Verificación

- `node --import tsx scripts/testPublicCatalog.ts`: parser/contaminación, rangos, selección/snapshot, error/abort HTTP y prohibiciones estáticas.
- `node --import tsx scripts/testPublicCatalogEmulator.ts`: handlers reales, respuestas sanitizadas, orden, errores/404 y observación de todas las colecciones consultadas. Cinco escrituras de fixture público y una privada necesaria para demostrar ausencia de fallback; cero escrituras de runtime del lector.
- `node --import tsx scripts/runPublicCatalogBrowser.ts`: Next dev propio y emuladores demo, Chrome/CDP, cinco consumidores, desktop/mobile, red real (claves sensibles y productos), estados y capturas en /tmp/cuenta-hogar-catalogo-c4/. Sólo fixtures públicas y cuentas Auth de rol; cero uploads.
- Regresión C1/C2/C3, test:safe, build, TSC y smoke general original. Los resultados de ejecución se informan por separado, sin equiparar lista de suites con PASS.
- ESLint completo de archivos tocados conserva deuda previa en handlers históricos de cliente/afiliado (any); no se desactivan reglas ni se amplían refactors para ocultarla. Baseline y resultado detallados se preservan fuera de Git.

No commit, push, PR ni deploy. Capturas y logs permanecen fuera de Git.
