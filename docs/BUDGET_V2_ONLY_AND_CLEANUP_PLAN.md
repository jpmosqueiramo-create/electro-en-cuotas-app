# Presupuestos exclusivamente V2

Decisión del propietario: el confeccionador y el historial operativo legacy se retiran; no se migran ni borran datos por este cambio. Evolución posterior al cierre P3; reemplaza únicamente la decisión de conservar la UI de presupuestos antiguos.

## Aplicación

- `/admin/presupuestos` monta sólo `BudgetV2Workspace`: catálogo o referencia nueva, múltiples alternativas, guardado, emisión, PDF y WhatsApp desde snapshots V2.
- El detalle de Solicitudes remite al único historial V2 sin renderizar sus propuestas legacy. Se conserva la proyección de metadatos compartida para no alterar los consumidores operativos. Validaciones enlaza a esa misma ruta con colección e ID explícitos. Se retiran su editor, aceptación/rechazo y PDF de presupuestos legacy. No se alteran los handlers contractuales, pagos ni documentos históricos.
- Se retira del resumen de Clientes el contador basado en arrays legacy; no se reemplaza por coincidencias de DNI/email ni por un total V2 inventado.
- Se eliminan `budgetEditorLifecycle`, `manualBudgetProduct` y el renderer `generarPdfPresupuesto`, sin consumidores de aplicación restantes. `budgetAlertRouting` sigue utilizado por Hoy; se conservan los motores financieros y los renderers de contrato, pagaré, remitos y pagos.
- `test:manual-budget` ahora verifica `testBudgetReferenceV2.ts`; las pruebas exclusivas de la UI retirada se sustituyen por ausencia de rutas legacy y los cuatro recorridos V2. Se conservan las regresiones de selección contractual histórica, privacidad, snapshots e idempotencia.

## Creación manual explícita

El editor V2 preexistente necesitaba una solicitud existente para guardar. Sin solicitud seleccionada se exige confirmación visible antes de crear un origen manual, nunca se sustituye una solicitud indicada que falta.

Comando admin `SAVE` admite opcionalmente `createManualSource: true`, sólo para versión 1/revisión 0 y `sourceCollection=solicitudes_cuenta`, con ID determinístico `budget_manual_{budgetId}`. Una transacción crea el origen y el presupuesto; el mismo commandId reejecutado devuelve el resultado y no duplica. Si existe un origen ajeno o falla la escritura, se rechaza sin alta parcial. No se crea Acceptance ni contrato.

Nuevo origen: `schemaVersion=BUDGET_MANUAL_SOURCE_V2`, `origin=ADMIN_MANUAL_BUDGET`, `originBudgetId`, nombre/DNI/CUIL/WhatsApp/localidad del cliente, necesidad pública, `estado=Pendiente`, fecha y actor admin. No contiene costos, factores, proveedor ni array `presupuestos`. Los consumidores actuales leen los campos comerciales existentes; ningún registro anterior se modifica. No requiere migración ni cambio de Rules. Se mantienen comandos anteriores sin el nuevo campo.

## Inventario productivo read-only

Proyecto `negocio-facil-page`. Fecha UTC: 2026-10-21T11:46:02.390Z. Consulta de colecciones, subcolecciones y campos de identidad/estado; sin escrituras, Auth, descarga de archivos ni tokens. Los primeros intentos de listado devolvieron HTTP 500; se completó el inventario mediante runQuery y listCollectionIds. No se usaron esos fallos como prueba de ausencia.

| Categoría | Cantidad | Tratamiento |
| --- | ---: | --- |
| Presupuestos legacy embebidos en solicitudes | 0 | Ningún candidato encontrado |
| Familia de presupuesto V2 de prueba | 1 | Candidato separado, pendiente de aprobación exacta |
| Solicitudes comerciales `solicitudes` | 2 | Excluidas |
| Solicitudes comerciales `solicitudes_cuenta` | 9 | Excluidas, incluido origen del presupuesto |
| Alertas administrativas | 27 | Excluidas |
| Notificaciones | 16 | Excluidas |
| Pagos de comisiones | 1 | Excluidos |
| Productos privados / catálogo público | 10 / 6 | Excluidos |
| Vendedores / configuración de envío | 5 / 2 | Excluidos |
| Contadores técnicos de solicitudes públicas | 1 | Excluidos |

El listado paginado adicional confirmó cero padres ausentes en `presupuestos_v2`, `solicitudes` y `solicitudes_cuenta`. Las 11 solicitudes no tienen los campos financieros/presupuestarios embebidos inspeccionados (`planPagos`, `pagos`, `cuotas`, `itemsContrato`, `comprobantes`, `presupuesto`, `presupuestoAceptado`, `budgetId`, `operationId`). La documentación de la familia candidata registra cero attachments. No se listó Storage; antes de cualquier borrado aún debe descartarse la existencia de objetos huérfanos.

No se encontró una colección separada de presupuestos antiguos, ledger V2 ni snapshots definitivos en el inventario de colecciones existentes. Esto no afirma que todo el resto sea ficticio ni habilita su borrado. No se clasifica por nombres, DNI, prefijos o coincidencias de número contractual.

## Candidato sintético separado

`presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d` está acreditado como prueba por autorizaciones explícitas previas del propietario en esta conversación. Estado EMITIDO, versión 1, Acceptance y borrador READY_TO_FORMALIZE. No es un presupuesto legacy.

Solicitud original a preservar: `solicitudes_cuenta/03j4qAuSiA77FOPMEcUg`.

La familia contiene 20 documentos, incluida su raíz. Paths exactos:

- `presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d`
- `presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/acceptanceCommands/2ebc0b32-a3bd-416a-aef9-5f652f35fd8d`
- `presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/acceptances/1`
- `presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/commands/57c04cf0-a55b-43c3-8950-c8785072524a`
- `presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/commands/b9730791-6599-42bc-915e-80a2f54ef4d4`
- `presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1`
- `presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/commands/0e0bfd9f-f6c1-4638-9cce-530c0f2222ea`
- `presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/commands/1499e87c-23b7-4a57-b23a-bef82c640e68`
- `presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/commands/4221efdf-8dae-4b51-b0a4-9cb9de59be55`
- `presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/commands/b4a6028f-ea18-40ee-b18f-9ff6da1ed1af`
- `presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/commands/bb2e234d-4d4a-4f18-9082-7e3f25bbfa48`
- `presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/commands/fe7112c8-378b-44c1-8657-f97d18e20dce`
- `presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/events/0e0bfd9f-f6c1-4638-9cce-530c0f2222ea`
- `presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/events/1499e87c-23b7-4a57-b23a-bef82c640e68`
- `presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/events/4221efdf-8dae-4b51-b0a4-9cb9de59be55`
- `presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/events/b4a6028f-ea18-40ee-b18f-9ff6da1ed1af`
- `presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/events/bb2e234d-4d4a-4f18-9082-7e3f25bbfa48`
- `presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/contracts/v1/readyReviews/4221efdf-8dae-4b51-b0a4-9cb9de59be55`
- `presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/documentation/1`
- `presupuestos_v2/aee8966b-5c17-4f7f-b50c-fff959ca0f0d/versions/1`

No se encontraron referencias externas mediante los campos explícitos inventariados `budgetId`, `originBudgetId`, `sourceCollection`, `solicitudId`, `operationId` y `contractDraftId`. No equivale a una autorización para borrar dependencias contractuales; se requiere aprobar por separado Acceptance, expediente, comandos y evidencia READY incluidos en estos 20 paths.

Inventario completo con todos los IDs, updateTime y vínculos: `/tmp/cuenta-hogar-budget-cleanup/inventory.json`. Manifiesto de aprobación: `/tmp/cuenta-hogar-budget-cleanup/approval-plan.json`. Permanecen fuera de Git. No contienen cuerpos raw de documentos, tokens ni campos personales; nunca adjuntar un export privado completo al PR.

## Plan de limpieza, NO ejecutado

1. Presentar al propietario los 20 paths y confirmar cuáles autoriza; por ahora no hay autorización de borrado para ninguno. Si sólo aprueba presupuesto, conservar las dependencias y STOP hasta resolverlas; no dejar referencias rotas.
2. Repetir el inventario de Firestore inmediatamente antes de ejecutar. Comparar paths y updateTime con el manifiesto aprobado; STOP ante altas, faltantes, cambios o nuevos vínculos. Un listado paginado incompleto nunca acredita ausencia.
3. Verificar separadamente attachments de documentación y objetos Storage vinculados. El inventario Firestore no inspeccionó bytes ni listó Storage; no existe autorización de borrar ningún objeto ni token. Confirmar índices de enlaces contractuales y operaciones antes de aprobar eliminación.
4. Preparar resguardo privado y plan de recuperación autorizado. No copiar PII, documentos, credenciales ni exports a Git.
5. Sólo con aprobación exacta, procesar hojas autorizadas con precondiciones updateTime y raíz al final. No usar recursive delete genérico, filtros por nombre ni borrado de solicitudes. Registrar cada resultado técnico sin contenido personal; STOP ante discrepancia o fallo.
6. Verificar ausencia sólo de paths aprobados y preservación de todas las exclusiones. Reejecutar lectura de historial V2 y accesos administrativos. No regenerar datos ni contratos para compensar faltantes.

`FIREBASE_DATA_DELETION = PENDING_EXACT_INVENTORY_AND_APPROVAL`.
`PRODUCTION_MUTATIONS = 0`. No merge, deploy, Rules, numeración CH, congelamiento, emisión definitiva ni formalización habilitados por este cambio.

## Validación de esta implementación

- `npx tsc --noEmit`, `npm run build`, `npm run test:safe`, `scripts/testBudgetV2.ts`, `scripts/testContractV2.ts`, `scripts/testContractReady.ts`: PASS.
- `scripts/testAdminSolicitudesReadModel.ts`: 21/21 PASS, incluidas fuentes independientes y ausencia de importes inventados.
- `scripts/testBudgetV2Emulator.ts`: PASS, incluidos replay/concurrencia manual, conflicto de origen y ausencia de altas parciales.
- `scripts/testBudgetAcceptanceV2Emulator.ts`: PASS con Auth/Firestore/Storage demo; incluye Acceptance, almacenamiento privado, rollback y borrado documental distribuido. Inicialmente se rechazó la configuración incompleta (Storage host e identidad admin no fijados); se corrigió sólo el entorno de ejecución.
- `scripts/runBudgetV2Browser.ts`: PASS en 1280x800 y 390x844. Cuatro recorridos por tamaño, snapshots, guardado/reapertura, emisión inmutable, revisión, PDF/WhatsApp sin campos privados, alta privada sin publicación y ausencia del editor legacy. La sincronización espera carga y fin del guardado/refresco, sin omitir assertions.
- `scripts/runAdminSolicitudesBrowser.ts`: PASS final en 1280 y 390, 0 escrituras después del setup y aislamiento de fuentes. Hubo dos timeouts móviles intermitentes al abrir detalle en ejecuciones previas; la última ejecución completa pasó sin debilitar assertions. Se agregó diagnóstico acotado al timeout, no una conversión a PASS. La intermitencia de la suite queda informada.
- ESLint diferencial sobre el mismo conjunto de archivos: base 155 errores, actual 131, nuevos 0, resueltos 24. El lint absoluto continúa fallando por deuda histórica; no se presenta como limpio. Comparación por archivo/regla/mensaje/cantidad; detalle fuera de Git en `/tmp/ch-v2-only-eslint-differential.json`.
- Verificación AST de `pdfGenerator.ts`: las 20 declaraciones exportadas restantes son idénticas a la base. Sólo se retiraron `ElementoPresupuesto`, `DatosPresupuestoPdf` y `generarPdfPresupuesto`.
- `git diff --check`: PASS. Firestore/Storage Rules, IAM, secretos y motores financieros no modificados. Pruebas con escrituras únicamente en Emulator.

Capturas sintéticas: `/tmp/cuenta-hogar-p3/` y `/tmp/cuenta-hogar-solicitudes-v1/`. Logs de ejecución: `/tmp/ch-v2-only-*.log`. La aplicación publicada no cambia hasta un merge y despliegue autorizados por separado.
