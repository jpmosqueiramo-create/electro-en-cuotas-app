# Inventario productivo read-only — C5B-1

Proyecto: `negocio-facil-page`. Base main: `d936a3d026e9898f9bc061742c228273e872ce92`.
Rama: `feature/catalogo-referencias-c5b1-production-inventory`.
C5B1_COUNTS_SOURCE = PRODUCTION_READ_ONLY. Estos resultados reemplazan únicamente
los conteos desconocidos de producción; no son las fixtures acreditadas en C5A.

## Ejecución y estabilidad

| Lectura | Inicio UTC | Fin UTC |
| --- | --- | --- |
| 1 | 2026-10-18T16:42:51.174Z | 2026-10-18T16:42:51.942Z |
| 2 | 2026-10-18T16:42:51.942Z | 2026-10-18T16:42:52.252Z |

ADC_AVAILABLE = YES; ADC_SECRET_OUTPUT = NO. Ambos hosts Emulator ausentes en el
proceso productivo. Project ID explícito validado antes de inicializar Admin y en
`app.options.projectId` después. Sólo ADC local ya disponible; no se crearon claves,
service accounts, permisos IAM ni configuración Firebase.

PRODUCTION_INVENTORY_RUNS = 2; PRODUCTION_INVENTORY_STABLE = YES.
Se compararon IDs/existencia privados y públicos, categorías, fingerprints proyectados,
identidad del plan y resumen sanitizado. También se compararon DTO públicos válidos.
Se leen dos colecciones por pasada, sin snapshot global: estabilidad observada no
implica congelación posterior ni autoriza aplicar este plan en otro momento.
No se afirma un número de reads facturables.

PRODUCTION_COLLECTIONS_READ = productos, catalogo_publico.
OTHER_PRODUCTION_COLLECTIONS_READ = 0; HISTORICAL_COLLECTIONS_READ = NO.
Documentos privados = 7; públicos = 0.

## Conteos reales

| Categoría | Cantidad |
| --- | ---: |
| READY_NEW | 0 |
| READY_UPDATE | 0 |
| ALREADY_CURRENT | 0 |
| NOT_ELIGIBLE | 1 |
| INVALID_PRIVATE | 0 |
| PUBLIC_ORPHAN | 0 |
| PUBLIC_MALFORMED | 0 |
| IDENTITY_CONFLICT | 0 |
| REVIEW_REQUIRED | 6 |

PUBLIC_PARITY_CURRENT = 0
PUBLIC_PARITY_OUTDATED = 0
PUBLIC_PARITY_INVALID = 0
DRY_RUN_SENSITIVE_FIELD_LEAKS = 0

## Filas de decisión sanitizadas

Las seis filas son REVIEW_REQUIRED. Sus campos comunes exactos son:

- privateExists = true; publicExists = false.
- legacy.activo = MISSING; legacy.publicado = MISSING.
- eligibilityEvidence = NONE.
- imageCount = 1; canProducePublicDto = true; publicMatches = null.
- privateFieldPresence: SKU = NO; EAN = NO; costo = YES; proveedor = YES.
- reasons = AMBIGUOUS_OR_MISSING_PUBLICATION_FLAGS.
- proposedAction = NONE: no acción automática autorizada; requieren decisión humana.

| referenciaId | nombre | activePlans |
| --- | --- | --- |
| `313uufET7xOR1kXyPAG6` | KANJI LAVARROPAS AUTOMATICO 4K CARGA SUPERIOR  KJH-WMCVSL6K | 12 |
| `5qYNJkPGWm4gGgISjH56` | LAVARROPAS INVERTER 8K Kanji KJH-WMCFWT8 | 12 |
| `D6bStUjs0j5D5wknli8i` | HELADERA Kanji KJH-HD140B | 8, 12 |
| `tXshmaQnIatZzM2ND8IS` | COLCHON CALM ORIGINAL 1 PLAZA 80X190X23 | 8, 12 |
| `tYuknm6Alau0GY8Ip6wD` | Heladera Kanji KJH-SBS400GE | 8, 12 |
| `yPGtIX7i601rZdJtPLVo` | LAVARROPAS ENOVA INVERTER 6,5 K | 12 |

La capacidad técnica de producir DTO no acredita intención de publicación. No se
convirtieron estas filas a READY_NEW/READY_UPDATE/NOT_ELIGIBLE, ni se cambiaron flags.
Los planes listados describen la proyección posible, no una publicación aprobada.
No se muestran valores SKU/EAN, costo, proveedor, factores, stock ni metadata privada.

## Referencias no elegibles

| referenciaId | nombre | motivo |
| --- | --- | --- |
| `v5lxKCM7NOAHLf2EHUIT` | HORNO ELECTRICO | EXPLICIT_LEGACY_DISABLE |

## Candidatas y plan potencial

READY_NEW_ROWS = []
READY_UPDATE_ROWS = []
ALREADY_CURRENT_ROWS = []
AUTO_PLAN_CREATE_COUNT = 0
AUTO_PLAN_REPLACE_COUNT = 0
AUTO_PLAN_TOTAL = 0
PRODUCTION_PLAN_IDENTITY = `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

La identidad es SHA-256 de `inventoryPlanIdentity` C5A; en esta ejecución el plan
está vacío. No hay DTO que publicar ni comparaciones READY_UPDATE que reportar.
PUBLIC_ORPHAN = 0; PUBLIC_MALFORMED = 0; IDENTITY_CONFLICT = 0.
PUBLIC_ORPHANS_DELETED = 0; no se repararon documentos ni regeneraron IDs.

## Vía separada y seguridad

`scripts/catalogProductionInventoryReadOnly.ts` exige `--production-read-only`,
`--confirm-project negocio-facil-page` y `--output` absoluto fuera del repositorio.
La guarda valida proyecto de proceso, ausencia de hosts Emulator (incluso vacíos),
ADC y ausencia de variables de clave Admin. No importa el inicializador heredado
con fallback productivo ni helpers apply/publish/unpublish. Inicializa explícitamente
Admin SDK con ADC y proyecto confirmado. El SDK se utiliza sólo para get().

El adaptador entrega únicamente `collection(...).get()` y rechaza cualquier nombre
salvo productos/catalogo_publico; reutiliza `readCatalogPrivacyInventory()` y por tanto
`inventoryCatalog()` con el pipeline exacto C1/C2 aprobado. No contiene llamadas de
escritura Firestore, batch, BulkWriter ni transacciones. `terminate()` sólo cierra
el cliente local. Las únicas escrituras nuevas del entrypoint son el informe local
protegido. Auditoría de siete módulos locales transitivos: cero helpers de escritura;
Hash.update/Set.add son operaciones en memoria, sin relación con Firestore.
PRODUCTION_WRITE_CAPABLE_IMPORTS = 0 (helpers de mutación; primitivas SDK de lectura).

El output se reserva antes de inicializar Admin usando wx y 0600; no permite stdout,
sobrescritura ni symlinks existentes. Se comprueba ubicación real del directorio padre
para evitar output dentro del repositorio mediante symlinks. No se imprime JSON, errores
SDK completos ni credenciales. Ante denegación de autorización: STOP, sin cambiar IAM.

Output protegido: `/private/tmp/cuenta-hogar-c5b1-production-inventory-1792341767214.json`.
PRODUCTION_OUTPUT_PERMISSIONS = 0600. No se agregó el output a Git.

## Gates y regresión

- C5B1_GUARD_TESTS = PASS: flags ausentes/incorrectos/duplicados, apply rechazado,
  Emulator presente, proyecto de app distinto, entorno de proyecto, output interno/
  relativo/symlink/existente, no overwrite y 0600; redacción, estabilidad y diferencias
  públicas; auditoría de imports transitivos y llamadas; comparación C5A contra base.
- C5A_PURE_TESTS = PASS; C5A_EMULATOR_TESTS = PASS, WRITES_AFTER_SETUP = 0.
- C5A_EMULATOR_GUARD_WEAKENED = NO. Scripts/guardas/apply/read model C5A intactos.
- TSC = PASS; BUILD = PASS; ESLINT_NEW_ERRORS = 0.
- Los cuatro archivos TS nuevos no existen en la base: errores base = 0, actuales = 0.
  Configuración ESLint, package.json y package-lock sin cambios.
- No browser: no hay cambios de UI. No se ejecutó suite de Rules futuras.
- Evidencia local: `/tmp/c5b1-guard.log`, `/tmp/c5b1-c5a-pure.log`,
  `/tmp/c5b1-c5a-emulator.log`, `/tmp/c5b1-tsc.log`, `/tmp/c5b1-build.log`,
  `/tmp/c5b1-eslint.log`, `/tmp/c5b1-eslint-differential.json`.

## Invariantes y siguiente decisión

PRODUCTION_READ_OPERATIONS_COMPLETED = YES.
APPLY_EXECUTIONS = 0; PUBLISH_EXECUTIONS = 0; UNPUBLISH_EXECUTIONS = 0.
PRODUCTION_DATABASE_MUTATIONS = 0; PRODUCTION_BACKFILL_EXECUTED = NO.
FIRESTORE_RULES_CHANGED = NO; PRODUCTION_RULES_DEPLOYED = NO.
HISTORICAL_PRODUCT_IDS_MUTATED = NO; PUBLIC_ORPHANS_DELETED = 0.
STOCK_REQUIRED_FOR_PUBLICATION = NO; STOCK_REQUIRED_FOR_PLANS = NO.
C1–C4, motores financieros, factores, rounding y documentos legales sin cambios.
COMMIT/PUSH/PR/DEPLOY no ejecutados en esta fase.

Se requiere decisión humana individual sobre las seis referencias sin flags: cuáles
se desea publicar y con qué evidencia explícita. La referencia deshabilitada permanece
excluida. No hay plan automático que aprobar por ahora. No cerrar Rules ni ejecutar
backfill a partir de este inventario: primero resolver elegibilidad, obtener autorización
separada y repetir/reconciliar inventario antes de cualquier acción futura.

## Decisión humana posterior al inventario

El inventario productivo fue revisado y aprobado. Por instrucción humana posterior,
se aprueba publicar exactamente las siguientes seis referencias en la próxima fase
C5B-2 como candidatas MANUALES:

APPROVED_FOR_C5B2 =

- `313uufET7xOR1kXyPAG6`
- `5qYNJkPGWm4gGgISjH56`
- `D6bStUjs0j5D5wknli8i`
- `tXshmaQnIatZzM2ND8IS`
- `tYuknm6Alau0GY8Ip6wD`
- `yPGtIX7i601rZdJtPLVo`

EXCLUDED_FROM_C5B2 =

- `v5lxKCM7NOAHLf2EHUIT` — HORNO ELECTRICO; EXPLICIT_LEGACY_DISABLE / NOT_ELIGIBLE.

APPROVED_FOR_C5B2_COUNT = 6; EXCLUDED_FROM_C5B2_COUNT = 1.

Esta decisión no cambia retroactivamente la clasificación C5B-1: READY_NEW=0,
READY_UPDATE=0, ALREADY_CURRENT=0, NOT_ELIGIBLE=1, INVALID_PRIVATE=0, PUBLIC_ORPHAN=0,
PUBLIC_MALFORMED=0, IDENTITY_CONFLICT=0, REVIEW_REQUIRED=6.
C5B1_COUNTS_SOURCE = PRODUCTION_READ_ONLY; PRODUCTION_INVENTORY_STABLE = YES.

El cierre actual sólo versiona tooling e inventario. No autoriza todavía escrituras
productivas ni la ejecución de C5B-2. APPLY_EXECUTIONS=0; PUBLISH_EXECUTIONS=0;
UNPUBLISH_EXECUTIONS=0; PRODUCTION_DATABASE_MUTATIONS=0; PRODUCTION_BACKFILL_EXECUTED=NO;
FIRESTORE_RULES_CHANGED=NO; PRODUCTION_RULES_DEPLOYED=NO; DEPLOY_EXECUTED=NO.
