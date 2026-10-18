# Catálogo de referencias — privacidad C5A

Base: `dc6594f4ae4d62deb8e2a1917516b597d4a6668e`. Rama: `feature/catalogo-referencias-c5a`.

## Alcance y límites

C5A prepara inventario, simulación, propuesta de Rules y rollback. No ejecuta backfill,
lecturas productivas, deploy ni cambios de permisos. `firestore.rules`, C1–C4 y los
motores financieros permanecen sin modificaciones. El defecto preexistente de permisos
(`/cliente` consulta `clienteId`; `/afiliado` consulta `afiliadoEmail`) queda fuera del alcance.
PREEXISTING_PERMISSION_DEFECT = YES; INTRODUCED_BY_C5A = NO.

## Consumidores

La búsqueda textual completa de `productos` se contrastó con literales AST en `src/`
y `scripts/`, imports de `catalogManager` y el gate estático C4. Los nombres de variables,
copy y comentarios no son accesos Firestore. No hay imports activos de `catalogManager`:
el helper legacy continúa sin uso y su eliminación requiere otra tarea. El path Storage
de imágenes C3 es independiente de la colección Firestore. Stock/logística y pricing
siguen siendo privados y conservan sus controles Admin; no se migran al DTO público.

NON_ADMIN_DIRECT_PRODUCTS_READS = 0; NON_ADMIN_DIRECT_PRODUCTS_WRITES = 0.
Esto caracteriza consumidores activos, no demuestra cierre de permisos: las Rules
actuales aún permiten lectura pública de productos. C5A no corrige esa exposición.
La auditoría estática no pretende resolver strings construidos arbitrariamente;
la búsqueda textual y las pruebas de red C4 complementan el inventario.

Regenerar: `node --import tsx scripts/auditCatalogPrivacyConsumers.ts`.
Salida segura fuera de Git: `/tmp/cuenta-hogar-c5a-consumers.json`.

| Archivo | Línea | Tipo | Estado / justificación |
| --- | ---: | --- | --- |
| `scripts/auditCatalogPrivacyConsumers.ts` | 16 | OTHER | AUDIT_ONLY: Auditoría estática; sin acceso a datos |
| `scripts/auditCatalogPrivacyConsumers.ts` | 16 | OTHER | AUDIT_ONLY: Auditoría estática; sin acceso a datos |
| `scripts/auditCatalogPrivacyConsumers.ts` | 16 | OTHER | AUDIT_ONLY: Auditoría estática; sin acceso a datos |
| `scripts/helpers/adminSolicitudesFixtures.ts` | 53 | TEST | ACTIVE: Fixture/prueba local protegida; no consumidor público |
| `scripts/testCatalogPrivacyInventoryEmulator.ts` | 9 | TEST | ACTIVE: Fixture/prueba local protegida; no consumidor público |
| `scripts/testCatalogPrivacyInventoryEmulator.ts` | 11 | TEST | ACTIVE: Fixture/prueba local protegida; no consumidor público |
| `scripts/testCatalogPrivacyInventoryEmulator.ts` | 14 | TEST | ACTIVE: Fixture/prueba local protegida; no consumidor público |
| `scripts/testCatalogPrivacyInventoryEmulator.ts` | 20 | TEST | ACTIVE: Fixture/prueba local protegida; no consumidor público |
| `scripts/testCatalogPrivacyRulesC5B.ts` | 17 | TEST | ACTIVE: Fixture/prueba local protegida; no consumidor público |
| `scripts/testCatalogPrivacyRulesC5B.ts` | 18 | TEST | ACTIVE: Fixture/prueba local protegida; no consumidor público |
| `scripts/testCatalogPrivacyRulesC5B.ts` | 40 | TEST | ACTIVE: Fixture/prueba local protegida; no consumidor público |
| `scripts/testCatalogPublicationEmulator.ts` | 26 | TEST | ACTIVE: Fixture/prueba local protegida; no consumidor público |
| `scripts/testCatalogPublicationEmulator.ts` | 117 | TEST | ACTIVE: Fixture/prueba local protegida; no consumidor público |
| `scripts/testCatalogPublicationEmulator.ts` | 205 | TEST | ACTIVE: Fixture/prueba local protegida; no consumidor público |
| `scripts/testCatalogPublicationEmulator.ts` | 242 | TEST | ACTIVE: Fixture/prueba local protegida; no consumidor público |
| `scripts/testCatalogReferenceBrowser.ts` | 18 | TEST | ACTIVE: Fixture/prueba local protegida; no consumidor público |
| `scripts/testCatalogReferenceBrowser.ts` | 56 | TEST | ACTIVE: Fixture/prueba local protegida; no consumidor público |
| `scripts/testCatalogReferenceBrowser.ts` | 57 | TEST | ACTIVE: Fixture/prueba local protegida; no consumidor público |
| `scripts/testCatalogReferenceBrowser.ts` | 120 | TEST | ACTIVE: Fixture/prueba local protegida; no consumidor público |
| `scripts/testCatalogReferenceEditorEmulator.ts` | 11 | TEST | ACTIVE: Fixture/prueba local protegida; no consumidor público |
| `scripts/testPublicCatalogEmulator.ts` | 15 | TEST | ACTIVE: Fixture/prueba local protegida; no consumidor público |
| `scripts/testPublicCatalogEmulator.ts` | 25 | TEST | ACTIVE: Fixture/prueba local protegida; no consumidor público |
| `src/app/admin/presupuestos/page.tsx` | 426 | ADMIN_UI | ACTIVE: Interfaz Admin privada; no migrar a DTO público |
| `src/app/admin/presupuestos/page.tsx` | 801 | ADMIN_UI | ACTIVE: Interfaz Admin privada; no migrar a DTO público |
| `src/app/admin/productos/page.tsx` | 22 | ADMIN_UI | ACTIVE: Interfaz Admin privada; no migrar a DTO público |
| `src/app/admin/productos/page.tsx` | 125 | ADMIN_UI | ACTIVE: Interfaz Admin privada; no migrar a DTO público |
| `src/app/admin/productos/page.tsx` | 180 | ADMIN_UI | ACTIVE: Interfaz Admin privada; no migrar a DTO público |
| `src/app/admin/productos/page.tsx` | 200 | ADMIN_UI | ACTIVE: Interfaz Admin privada; no migrar a DTO público |
| `src/app/admin/validaciones/page.tsx` | 469 | ADMIN_UI | ACTIVE: Interfaz Admin privada; no migrar a DTO público |
| `src/app/admin/validaciones/page.tsx` | 511 | ADMIN_UI | ACTIVE: Interfaz Admin privada; no migrar a DTO público |
| `src/app/admin/validaciones/page.tsx` | 556 | ADMIN_UI | ACTIVE: Interfaz Admin privada; no migrar a DTO público |
| `src/app/admin/validaciones/page.tsx` | 588 | ADMIN_UI | ACTIVE: Interfaz Admin privada; no migrar a DTO público |
| `src/app/admin/validaciones/page.tsx` | 1022 | ADMIN_UI | ACTIVE: Interfaz Admin privada; no migrar a DTO público |
| `src/app/admin/validaciones/page.tsx` | 1801 | ADMIN_UI | ACTIVE: Interfaz Admin privada; no migrar a DTO público |
| `src/app/admin/validaciones/page.tsx` | 1925 | ADMIN_UI | ACTIVE: Interfaz Admin privada; no migrar a DTO público |
| `src/app/api/admin/calcular-pricing/route.ts` | 42 | SERVER_PRIVATE | ACTIVE: Pricing Admin autorizado; conserva fuente privada canónica |
| `src/app/api/admin/liberar-reserva/route.ts` | 38 | LOGISTICS_STOCK | ACTIVE: Stock/logística privada; conservar referencias y autorización |
| `src/app/api/admin/reserva-stock/route.ts` | 56 | LOGISTICS_STOCK | ACTIVE: Stock/logística privada; conservar referencias y autorización |
| `src/components/admin/catalog/CatalogReferenceWorkspace.tsx` | 109 | ADMIN_UI | ACTIVE: Interfaz Admin privada; no migrar a DTO público |
| `src/components/admin/catalog/CatalogReferenceWorkspace.tsx` | 111 | ADMIN_UI | ACTIVE: Interfaz Admin privada; no migrar a DTO público |
| `src/components/admin/catalog/CatalogReferenceWorkspace.tsx` | 116 | ADMIN_UI | ACTIVE: Interfaz Admin privada; no migrar a DTO público |
| `src/components/admin/catalog/CatalogReferenceWorkspace.tsx` | 159 | ADMIN_UI | ACTIVE: Interfaz Admin privada; no migrar a DTO público |
| `src/lib/catalogManager.ts` | 19 | LEGACY_NON_ADMIN | INACTIVE: Sin imports en src/scripts de aplicación; candidato C6, no ejecutado |
| `src/lib/catalogManager.ts` | 35 | LEGACY_NON_ADMIN | INACTIVE: Sin imports en src/scripts de aplicación; candidato C6, no ejecutado |
| `src/lib/catalogPrivacyInventory.ts` | 80 | SERVER_PRIVATE | ACTIVE: Inventario Admin read-only, sólo emuladores autorizados |
| `src/lib/catalogPublicationService.ts` | 15 | SERVER_PRIVATE | ACTIVE: Publicador C2 servidor, autenticación Admin en handlers |
| `src/lib/catalogPublicationService.ts` | 36 | SERVER_PRIVATE | ACTIVE: Publicador C2 servidor, autenticación Admin en handlers |
| `src/lib/catalogPublicationService.ts` | 59 | SERVER_PRIVATE | ACTIVE: Publicador C2 servidor, autenticación Admin en handlers |
| `src/lib/catalogReferenceImages.ts` | 38 | OTHER | ADMIN_STORAGE_PATH: Ruta Firebase Storage del editor Admin C3; no acceso a colección Firestore |
| `src/lib/stockUtils.ts` | 32 | LOGISTICS_STOCK | ACTIVE: Stock/logística privada; conservar referencias y autorización |

## Inventario y elegibilidad

`src/lib/catalogPrivacyInventory.ts` lee exclusivamente `productos` y `catalogo_publico`.
Cada ID de la unión aparece exactamente una vez; no se consulta ni modifica ninguna
solicitud histórica. El ID privado se conserva como ID público y `referenciaId`.
Las referencias históricas `productoId` no necesitan regeneración ni migración.

El resumen contiene ID, nombre, flags tipados (boolean/MISSING/INVALID), validación C1,
cantidad de imágenes, planes activos, capacidad de producir DTO, existencia pública,
paridad, fingerprint, motivos y propuesta. SKU/EAN/costo/proveedor se informan sólo
como presencia. Nunca se serializa el documento privado ni sus valores internos.
El DTO del plan usa el pipeline exacto C2 `prepareCatalogPublication`, que reutiliza
adaptador legacy, validación C1 y mapper público. No se duplica cálculo financiero.

Evidencia aceptada: `activo === true && publicado === true`, o proyección existente
válida y sin campos extra. C3 guarda nuevas referencias con ambos flags false y su
publicación explícita C2 no depende de cambiar esos flags. Por ello una proyección
C3 válida conserva autoridad aunque los flags privados sean false. Campos faltantes
o ambiguos sin proyección no permiten inferir elegibilidad: requieren revisión.
Una proyección contaminada no constituye evidencia suficiente por sí sola.

Precedencia exclusiva: IDENTITY_CONFLICT → PUBLIC_MALFORMED → PUBLIC_ORPHAN →
REVIEW_REQUIRED por planes fuera de dominio → NOT_ELIGIBLE/REVIEW_REQUIRED por falta
de evidencia → INVALID_PRIVATE → READY_NEW/ALREADY_CURRENT/READY_UPDATE.

| Categoría | Interpretación / acción futura |
| --- | --- |
| READY_NEW | Fuente válida y elegible, sin público: CREATE con mismo ID |
| READY_UPDATE | Fuente válida y elegible, público válido diferente: full replace C2 |
| ALREADY_CURRENT | Proyección canónica coincide: sin escritura |
| NOT_ELIGIBLE | Flag false explícito y sin proyección válida: excluir |
| INVALID_PRIVATE | Candidata explícita que falla C1: revisar fuente, no publicar |
| PUBLIC_ORPHAN | Público válido sin fuente: decisión humana; nunca borrado automático |
| PUBLIC_MALFORMED | Contrato inválido/campos extra: REPLACE_FROM_PRIVATE sólo con fuente válida y evidencia explícita; si no REVIEW_REQUIRED |
| IDENTITY_CONFLICT | ID inválido o distinto de referenciaId/id: intervención humana |
| REVIEW_REQUIRED | Flags ambiguos/ausentes o planes activos fuera de 1–18: excluir del plan |

Una anomalía de mayor precedencia no desaparece: cada fila conserva existencia privada,
existencia pública y validación pública. Orphan contaminado se clasifica MALFORMED;
ninguna categoría anómala entra al plan automático. La eliminación eventualmente
propuesta requiere aprobación humana C5B independiente; no hay ruta de borrado C5A.

Paridad compara sólo DTO: nombre, descripción, imágenes, planes, publicado y schemaVersion
(más identidad), con `isCurrentCatalogProjection` C2. Campos públicos extra se detectan
por allowlist, sin ignorar contaminación. El escáner recursivo cubre campos sensibles
y objetos/arrays anidados; no recorre instancias SDK ajenas al DTO JSON.
Planes sólo 1–18, únicos, cuotas positivas; NEXT_90_V1 se reutiliza sin cambios.
Un plan activo 24 se excluye y deriva a revisión; stock cero no bloquea publicación
ni planes. STOCK_REQUIRED_FOR_PUBLICATION = NO; STOCK_REQUIRED_FOR_PLANS = NO.

## CLI y futuro apply

Por defecto `--dry-run`. Confirmación de proyecto obligatoria; actualmente sólo admite
`demo-cuenta-hogar` y hosts exactos locales 8080/9099, con las guardas existentes.
Se valida antes de importar Firebase Admin. Producción no está autorizada ni siquiera
para inventario en esta fase. Ejemplo, con las cuatro variables demo de CODEX_RUNTIME:

```sh
node --import tsx scripts/catalogBackfillDryRun.ts \
  --confirm-project demo-cuenta-hogar --output /tmp/c5a-inventory-unique.json
```

La salida usa creación exclusiva (no sobrescribe) y modo 0600. Sin output usa stdout.
`--apply` se reconoce pero siempre falla cerrado, sin override por flag o variable.
`assertC5AApplyDisabled` bloquea también el helper futuro `catalogBackfillApplyC5B.ts`
antes de cualquier acceso. No se ejecutó apply, ni contra Emulator.
El esqueleto futuro conserva ID, usa Admin SDK y `publishCatalogReference` C2, full
replace, fingerprint e idempotencia; prepara resultado por ID y hasta tres reintentos,
sin persistir errores privados. Cambios de fingerprint requieren nuevo plan/aprobación.
No hay borrado ni escritura de privados en ese helper.

No basta quitar el guard en C5B: deben aprobarse nuevamente proyecto productivo,
identidad mínima, plan final y cambios de elegibilidad. Las dos colecciones se leen
en paralelo, sin snapshot transaccional global. Se requiere ventana controlada de
edición/publicación o reconciliación con relectura por referencia antes de aplicar.
El fingerprint C2 no sustituye control de retiros públicos o cambios sólo de flags.

## Evidencia de Emulator

Fixtures: 10 documentos privados y 6 públicos, 11 IDs únicos. No son inventario real.
READY_NEW=1; READY_UPDATE=1; ALREADY_CURRENT=2; NOT_ELIGIBLE=1; INVALID_PRIVATE=1;
PUBLIC_ORPHAN=1; PUBLIC_MALFORMED=1; IDENTITY_CONFLICT=1; REVIEW_REQUIRED=2.
PUBLIC_PARITY_CURRENT=2; PUBLIC_PARITY_OUTDATED=1; PUBLIC_PARITY_INVALID=2.
DRY_RUN_SENSITIVE_FIELD_LEAKS=0; WRITES_AFTER_SETUP=0.

La suite verifica contenido y updateTime antes/después, dos ejecuciones idénticas,
sin escrituras después del setup. El CLI real se ejecutó después con el mismo conjunto.
Las pruebas puras cubren clasificación, flags, autoridad C3, stock cero, fuera de dominio,
identidad, datos sensibles, orden/idempotencia, proyecto erróneo y apply OFF.
Reportes: `/tmp/cuenta-hogar-c5a-inventory-emulator.json`,
`/tmp/c5a-cli-inventory-final.json`, `/tmp/c5a-emulators.log`.
PRODUCTION_INVENTORY_EXECUTED=NO; PRODUCTION_DATABASE_MUTATIONS=0.

## Rules propuestas, todavía sin aplicar

El patch exacto está en `CATALOGO_REFERENCIAS_RULES_C5B_PROPOSED.patch`; hashes de base
propuesta en `CATALOGO_REFERENCIAS_RULES_C5B_PLAN.json`. `firestore.rules` no se modifica.

- productos y subcolecciones: read/write sólo isAdmin.
- catalogo_publico raíz: lectura isAdmin o publicado true; escritura false para todos
  los clientes, incluido browser Admin. Admin SDK bypassa Rules y sigue publicando C2.
- catchall Admin excluye catalogo_publico: los grants son aditivos, por lo que un false
  local no revoca el grant del catchall. Sus subcolecciones tampoco obtienen ese grant.
- Todos los demás bloques/catchall conservan sus condiciones. No se amplían permisos
  de shipping_settings, vendedores, solicitudes, solicitudes_cuenta, alertas ni finanzas.

Las Rules NO sanitizan documentos. Una regla publicado true expondría campos extra de
un documento contaminado: reconciliar o retirar todos los MALFORMED requiere decisión
humana antes de otorgar esa lectura. Rules no filtran resultados: un futuro cliente
directo debe consultar where publicado == true; un cliente no-admin no puede listar
sin esa condición. C4 sigue usando API server-side, filtrado y parser allowlist;
no se migra a Firestore browser. No se cierra exposición productiva en C5A.

## Suite futura de privacidad C5B

`scripts/testCatalogPrivacyRulesC5B.ts` preparada y NO ejecutada. Primero exige hash
exacto de Rules propuestas; no carga Rules ni conecta Admin si todavía rigen las actuales.
Debe ejecutarse sólo tras autorización C5B y carga de esas Rules en Emulator.
Cubre anónimo/cliente/vendedor afiliado/Admin: lectura privada y subcolección denegadas
salvo Admin; publicado público; oculto sólo Admin; productos write sólo Admin; público
create/update/delete cliente denegado incluso Admin; consultas publicadas; publicación
real server C2; permisos de lectura Admin/público en colecciones ajenas al catálogo.
La regresión completa de permisos financieros y flujos particulares debe conservar
sus suites existentes en la aprobación C5B; no se declara probada con Rules futuras hoy.

## Rollback

ROLLBACK_REOPENS_PRODUCTS=NO. Nunca volver a productos read:true. Conservar snapshot
protegido del público anterior, hashes y resultados por ID. Ante incidente: suspender
publicación/backfill, mantener productos privado, restaurar API/UI compatible con
catalogo_publico, reparar/republicar proyección desde fuente válida y reconciliar.
Revertir Rules sólo a una versión igualmente segura (productos privado y sin grants
aditivos de escritura pública). No revertir indiscriminadamente a las Rules C5A actuales.
No restaurar datos sensibles hacia colección pública. No alterar IDs ni históricos.

## Secuencia de C5B, pendiente de aprobación

1. Snapshot/inventario protegido de ambas colecciones, confirmar proyecto, SHA y permisos.
2. Dry-run final en ventana controlada; excluir anomalías, revisar malformados y huérfanos.
3. Aprobación humana del plan exacto y de retiros/reemplazos excepcionales.
4. Backfill autorizado con Admin SDK/C2, mismo ID, full replace y resultados por referencia.
5. Reconciliar paridad, cero campos sensibles y cero anomalías públicas pendientes.
6. Probar API/browser contra proyección. Confirmar que todos los consumidores desplegados
   son compatibles C4; no inferir deploy a partir de main ni del HEAD de una feature.
7. Aplicar Rules exactas aprobadas sólo tras cumplir esas precondiciones.
8. Ejecutar suite Rules en Emulator y verificaciones autorizadas del entorno objetivo.
9. Smoke general con datos demo; no usar producción para pruebas destructivas.
10. Deploy coordinado del SHA explícitamente aprobado; no activar rollouts automáticos.
11. Verificación post-deploy de SHA, API/UI, privacidad y alertas. Rollback seguro si falla.

Nada de esa secuencia productiva se ejecuta en C5A. Build y regresiones se documentan
con resultados reales al cierre; suite Rules futura permanece NOT_EXECUTED.

## Registro de gates de esta revisión

- C5A pure y Emulator: PASS; CLI dry-run real PASS; cero escrituras después del setup.
- C1, C2 pure/Emulator, C3 pure/Emulator, C4 pure/Emulator: PASS.
- C4 browser: PASS en tercera ejecución; primera falló en auditor de red al bloquear
  intencionalmente API, segunda tuvo timeout del selector de afiliado. No se cambió
  protocolo, helpers, código C4 ni assertions para obtener el resultado.
- La copia de runner/test usada fuera del repositorio sólo resuelve imports absolutos
  y cambia destino de capturas a `/tmp/cuenta-hogar-c5a-regression-c4/`; assertions idénticas.
- TypeScript PASS; ESLint nuevo 0. Los nueve TS nuevos no existen en la base exacta;
  errores base=0, C5A=0, nuevos=0, resueltos=0. Config/lock sin cambios.
  Evidencia: `/tmp/c5a-eslint-differential.json`.
- General browser smoke PASS 12/12 en tercera ejecución conjunta (primera ejecución
  del smoke: las anteriores se detenían antes). Conserva el ruido preexistente de permisos.
- Build inicial y final PASS; verificación final en `/tmp/c5a-build-final.log`.
- `npm run test:safe` PASS; cero procesos test escuchando en 3000/8080/9099/9222/9227
  después del cierre de los wrappers. Dataless tracked/C5A/node_modules: 0/0/0.
- Logs individuales: `/tmp/c5a-c1.log`, `/tmp/c5a-c2-pure.log`, `/tmp/c5a-c3-pure.log`,
  `/tmp/c5a-c4-pure.log`, `/tmp/c5a-safe.log`, `/tmp/c5a-emulators.log`,
  `/tmp/c5a-browser.log`, `/tmp/c5a-browser-retry.log`, `/tmp/c5a-browser-run3.log`.
- Patch propuesto sin contexto (`--unidiff-zero` para una futura aplicación autorizada),
  validado contra los hashes; nunca aplicado. Suite Rules futura NOT_EXECUTED.

## Archivos C5A nuevos

Ningún archivo previamente versionado fue modificado.

- `docs/CATALOGO_REFERENCIAS_PRIVACY_C5A.md`
- `docs/CATALOGO_REFERENCIAS_RULES_C5B_PLAN.json`
- `docs/CATALOGO_REFERENCIAS_RULES_C5B_PROPOSED.patch`
- `scripts/auditCatalogPrivacyConsumers.ts`
- `scripts/catalogBackfillDryRun.ts`
- `scripts/helpers/catalogBackfillApplyC5B.ts`
- `scripts/helpers/catalogPrivacyFixtures.ts`
- `scripts/testCatalogPrivacyInventory.ts`
- `scripts/testCatalogPrivacyInventoryEmulator.ts`
- `scripts/testCatalogPrivacyRulesC5B.ts`
- `src/lib/catalogBackfillPolicy.ts`
- `src/lib/catalogPrivacyInventory.ts`
