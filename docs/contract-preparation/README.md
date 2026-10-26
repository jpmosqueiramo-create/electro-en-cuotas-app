# Confección y revisión contractual

## Recorrido administrativo

1. Abrir la operación aceptada y pulsar **Confeccionar contrato y pagaré**. Se abre una ventana independiente de la misma operación; si el navegador bloquea ventanas emergentes, el enlace conserva su destino y funciona como enlace normal.
2. Revisar y aplicar expresamente los datos recibidos mediante el enlace privado, o editar y guardar los datos personales y laborales en sus secciones actuales.
3. Elegir y guardar el plan del borrador; completar la primera fecha y día habitual y guardar el cronograma. El cálculo utiliza el motor existente y el snapshot aceptado. No permite modificar arbitrariamente capital, factores o fórmulas.
4. Revisar mandato y pagaré con leyenda de borrador. La falta de conformidad se muestra como pendiente, pero no impide revisar estos PDF sin valor de emisión. Una identidad incompatible sigue bloqueándolos.
5. Para emitir, completar la evaluación crediticia vigente, conformidad del cliente, revisión READY, aprobación del paquete por el titular y autorización de la operación. Los pasos de emisión, firma, entrega y finanzas conservan sus controles.
6. Antes de firma, recepción y actividad financiera, **Corregir datos antes de la firma y entrega** permite volver a edición con motivo y confirmación explícita. La nueva edición requiere nuevamente preparación vigente y autorización; conserva CH y archiva las ediciones anteriores.
7. Después de firmas, recepción, entrega o actividad financiera no se ofrece reemplazo: corresponde una corrección auditada por el procedimiento posterior. Este PR no implementa la sustitución de instrumentos firmados.

Los datos de otro expediente nunca se toman como sustitutos. No se aplican automáticamente los formularios recibidos. La ventana que recupera foco consulta cambios guardados sólo si no existen cambios locales sin guardar, y bloquea la edición mientras actualiza.

## Persistencia y compatibilidad

No hay migración ni cambios de Rules, índices, IAM, Auth o configuración.

- `contractSnapshotsV2/{contractId}_s1` y los recibos originales de número/origen/evidencia permanecen inmutables.
- Ediciones siguientes usan `_s2`, `_s3`, etc., con `snapshotVersion` entero y prueba de contexto productivo. No se amplía el adaptador Emulator a ediciones productivas.
- Bajo el documento `production` existente de cada operación: `revisionCommands/{commandId}` registra motivo, actor, digest y resultado inmutable; `documentRevision/current` identifica edición activa/estado; `documentEditions/{edition}` conserva la cadena de recibos y autorización. Cada edición nueva tiene su propio `documents/issued`. La primera conserva su ruta histórica.
- Al reabrir se archiva la preparación logística no firmada en `documentEditions/{previousEdition}/preparationHistory/{commandId}`, conservando archivos anteriores y bloqueos activos. Las fotos firmadas incluso pendientes impiden reabrir.
- Los PDF se crean con rutas derivadas del hash del snapshot y precondición de generación. No se sobrescriben objetos, instrumentos ni fechas de ediciones anteriores.
- No se incrementa CH al revisar. La transacción comprueba contador, recibos originales, versión esperada, ausencia de firmas/actividad y comandos idempotentes.
- Todos los lectores operativos usan el manifiesto de la edición activa. Los archivos anteriores permanecen conservados, sin exponerse como documentos actuales.

## Catálogo técnico

El paquete técnico `loop-owner-final-20261025-v3` identifica el nuevo hash del generador. Conserva exactamente los textos y hashes de plantillas del paquete V2, que permanece en el catálogo para lecturas históricas. No se transfiere una aprobación previa al nuevo hash ni se declara aprobación profesional. La aprobación del titular continúa en su interfaz existente. `prepareOwnerFinalCatalog.ts --write` ahora conserva paquetes anteriores y rechaza reutilizar un ID con otro hash.

## Evidencia ejecutada

| Control | Resultado | Entorno |
| --- | --- | --- |
| TypeScript, ESLint diferencial, build, test:safe | PASS | Local, esta rama |
| Catálogo original, texto íntegro y hashes | PASS | Offline |
| Revisión crédito, datos nuevos/recurrentes, permisos e históricos | PASS | Firebase Emulator demo-cuenta-hogar |
| PDF privados, dos operaciones, identidad bloqueada, borrador pendiente de conformidad sin CH | PASS | Firebase Emulator demo-cuenta-hogar |
| Tres ediciones, un CH, concurrencia, reintentos, snapshots y PDF previos inmutables | PASS | Firebase Emulator demo-cuenta-hogar |
| Firmas pendientes, entrega, finanzas, usuario ajeno, alteración del estado | PASS: rechazo | Firebase Emulator demo-cuenta-hogar |
| Adaptador productivo y recuperación, cuotas, pagos, recibos, reversas, tres roles | PASS: 30 grupos | Firebase Emulator demo-cuenta-hogar |
| Variante de documentación externa, sin remito interno | PASS: 31 grupos | Firebase Emulator demo-cuenta-hogar |
| Ventana independiente real y PDF desktop/mobile, cambios locales preservados, doble comando durante guardado | PASS | Chrome local + Emulator |

Capturas sintéticas: [editor desktop](evidence/editor-desktop.png), [editor mobile](evidence/editor-mobile.png), [mandato desktop](evidence/mandato-desktop.png), [mandato mobile](evidence/mandato-mobile.png), [pagaré desktop](evidence/pagare-desktop.png), [pagaré mobile](evidence/pagare-mobile.png).

Suites: `testContractDocumentRevisionEmulator.ts`, `testCreditReviewV2Emulator.ts`, `testOperationDraftDocumentsEmulator.ts`, `testProductionAdapterEmulator.ts` (normal y `SYNTHETIC_EXTERNAL_DELIVERY_SUITE=1`), `runContractPreparationBrowser.ts`, `testOwnerFinalCatalog.ts`, `npm run test:safe`.

Todas las escrituras de prueba usan proyecto `demo-cuenta-hogar`, Firestore 8080, Auth 9099 y Storage 9199; sin credenciales productivas. Las pruebas de navegador usan un perfil temporal independiente. No se efectuó smoke productivo de esta rama, merge ni deploy. El escenario completo de pagos tras una **segunda edición** no se ejecutó; se comprobó emisión/lectura de tres ediciones y, por separado, la regresión integral del adaptador en su primera edición. No se declara esa combinación como PASS.

Observación del harness: al pasar por `/admin`, el usuario sintético con correo `example.test` recibe la denegación esperada de la suscripción SDK de alertas, porque las Rules vigentes conservan el correo administrativo productivo fijo. No se modificaron Rules ni se usó ese correo real en Auth. Las rutas administrativas del recorrido probado respondieron 200. La suite de navegador crediticia histórica se actualizó a los nuevos rótulos/guardado de borrador, pero no se declara reejecutada; el recorrido nuevo de confección sí se ejecutó.
