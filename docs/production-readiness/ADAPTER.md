# Adaptador productivo separado — PR #80

Base: `70b47ef75ae94ba8decc61550b6ea98b096a72ee`. El propietario autorizó continuar el mismo PR con este adaptador. No se publicó ni ejecutó ninguna operación real.

## Lo implementado

`src/lib/productionV2/` integra el circuito normal sin cambiar `contractFreezeIntegrationEmulator.ts`, la numeración TEST ni el Laboratorio:

| Paso | Implementación | Requisito obligatorio |
|---|---|---|
| Contexto servidor | `runtime.ts` | Proyecto exacto, sin hosts Emulator; administrador activo, verificado y habilitado explícitamente |
| Textos finales | `catalog.ts`, `pdf.ts` | Paquete inmutable instalado por revisión de código; tres textos, representación, jurisdicción y recursos con hashes exactos |
| Aprobación jurídica | `authorization.ts` | Registro profesional identificado del paquete exacto. Una declaración sobre originales no lo sustituye |
| Autorización de operación | `authorization.ts` | Revisión READY, identidad, crédito, conformidad, fuente y paquete exactos; actor, motivo, fecha, alcance y vencimiento |
| Congelamiento y CH | `freeze.ts` | Transacción única: contador previamente autorizado, número único, snapshot, origen, evidencia, comando, auditoría y revisión del borrador |
| Mandato, pagaré y remito | `documents.ts` | Tres archivos privados ligados al mismo snapshot; no pueden sustituirse por una carga manual. Pagaré sin logo |
| Entrega | Motor existente `operationDeliveryV2Server.ts` | Documentos emitidos, tres firmas físicas verificadas, fotos legibles, originales, custodia y ausencia de incidencias |
| Cuotas, pagos y reversas | Motor existente `operationFinancialV2Server.ts` | Entrega acreditada de la misma operación; activación única, importes persistidos, FIFO y permisos existentes |
| Recibos | `readFinancialReceipt`, `operationFinancialReceiptPdf.ts` | Pago y recibo persistidos concordantes; lectura privada por los tres roles; reversa visible; no factura ARCA |
| Cliente | `operationClientV2Server.ts` | Cuenta existente vinculada explícitamente; Auth activa/verificada; entrega y autorización; invitación de un uso y revocación vigente |
| Comisiones | `operationCommissionV2Server.ts` | Misma transacción del pago; misma atribución y porcentaje congelados. No cambia liquidaciones |

La ruta HTTP existente de invitaciones usa `assertClientInvitationHttpAccess`: el token solo no revela datos ni activa servicios de una operación productiva. Exige el UID vinculado y verificado y vuelve a comprobar el expediente. Las invitaciones anteriores mantienen su guarda Emulator. El cliente puede iniciar sesión con su cuenta existente desde la página del enlace; no se ofrecen cuentas nuevas para una invitación productiva.

La interfaz de Contrato ofrece registro del paquete, autorización por operación, congelamiento explícito y emisión/recuperación. Se reutilizan las secciones de entrega, cuotas y cliente. Cada paso verifica nuevamente el servidor; no acepta un `production=true` ni un snapshot del navegador.

## Persistencia y compatibilidad

- Catálogo final: código servidor, actualmente **vacío**. No existe todavía un texto derivado final cuya aprobación exacta esté documentada.
- Aprobaciones: subcolección `finalPackageApprovals/{commandId}` de la referencia privada que ya define `legalRegistryRef`. No modifica `records` históricos ni convierte OWNER_REPORTED en VERIFIED.
- Metadatos por operación: `presupuestos_v2/{budgetId}/contracts/v{version}/production/current`, con subcolecciones `authorizations`, `freezeCommands`, `events` y `documents`. Cada autorización conserva su hash y tiene una revocación auditada independiente.
- Numeración: `contractNumberingV2/CONTRACT_NUMBERING_V1`. **No se inicializa automáticamente** ni se adopta un contador de prueba. Requiere `executionMode=PRODUCTION`, `active=true` y referencia de autorización de inicialización, después de inventariar numeración existente.
- Se reutilizan `contractNumbersV2`, `contractSnapshotsV2`, `contractOriginsV2` y `contractOriginEvidenceV2`; el snapshot diferencia estrictamente `CONTRACT_PRODUCTION_APPROVAL_V1` de las variantes anteriores.
- `productionFreeze` sólo se escribe en el borrador tras el congelamiento autorizado. La aceptación, presupuesto y snapshot económico originales no se reescriben.
- Los estados reales de entrega usan `DELIVERED`; `DELIVERED_EMULATOR` permanece diferenciado.
- Ledger y recibos conservan las colecciones existentes. `executionMode=PRODUCTION` exige `approvalAuthorizationId`; no admite `approvalFixtureId`. Los registros anteriores no se migran.
- Los archivos usan el espacio privado existente `operation-delivery-v2/{budgetId}/v{version}/{photoId}`. El manifiesto sólo se publica atómicamente cuando los tres archivos están COMMITTED. Cada descarga comprueba hash, tamaño y generación. Storage no se consulta dentro de transacciones Firestore.
- Reserva y lease de carga existentes: ante una interrupción se recupera el mismo archivo, no se emite otro pagaré. Una sustitución de generación se rechaza. No se borran archivos ni evidencias.
- Firestore/Storage Rules, índices, IAM, secretos y configuración de App Hosting no se modificaron.

## Requisitos aún pendientes para operaciones reales

1. Identificar la aprobación profesional de los originales ya entregados, sin inventar fecha, profesional ni referencia. Mantener su registro separado de las plantillas derivadas.
2. Cerrar el paquete final exacto de mandato, pagaré y remito: textos, variables, representación/facultades, jurisdicción y presentación. La aprobación de un original no se transfiere a cambios materiales.
3. Instalar el paquete aprobado en el catálogo mediante revisión de código. La huella del renderer depende del artefacto ejecutado: comprobarla en el build destinado a publicación y no asumir equivalencia entre compilación local y remota. Una diferencia bloquea la emisión.
4. Autorizar y preparar expresamente el contador CH tras inventario de números existentes. No hay creación automática ni reinicio.
5. Autorizar las cuentas existentes y su asignación de roles. No se reutilizó ni se asignó ningún correo personal.
6. Autorizar la configuración de servidor, el despliegue del SHA revisado y la primera operación real.

Los originales identificados permanecen:

- Mandato `OWNER_ORIGINAL_MANDATE_V3`: `8e23a3734506a63920de1b75a3fdcb4f0c6fe88c13c1941b3357ebd9e1a3b4d6`.
- Pagaré `OWNER_ORIGINAL_NOTE_UNVERSIONED`: `6f22b6f9bae6fd75f989ed9fb33ef53052832a43fff5d3f52fd30db56c3253b6`.

No se modificaron las cláusulas ni los PDF históricos. Los textos utilizados por los tests son ficticios, independientes y rotulados sin validez; no representan aprobación jurídica real. No se fijan distribuciones de servicios ni se agrega IVA a cuotas. ARCA sigue separada y bloqueada.

## Configuración futura y despliegue

Ningún cambio de configuración se ejecutó. El código requiere exclusivamente variables de servidor:

- `PRODUCTION_OPERATIONS_ENABLED=true`: permite intentar comandos, no sustituye ningún requisito.
- `PRODUCTION_OPERATION_ADMIN_UIDS`: UIDs exactos autorizados, sin valores incluidos en Git.

Orden: revisión y merge manual → verificar SHA → gates técnicos → despliegue inicialmente deshabilitado → validar catálogo, hashes, contador y autorizaciones bajo aprobaciones independientes → habilitar cuentas/configuración → primera operación real expresamente autorizada.

Conservar todos los overrides anteriores. No activar el Laboratorio ni ARCA. No ejecutar comandos de publicación desde este informe: aún no existe SHA aprobado para rollout.

## Recuperación

- Deshabilitar nuevos comandos con la variable de servidor, bajo autorización de configuración; las lecturas legítimas de historial permanecen disponibles.
- Revocar una autorización de operación mediante el comando auditado. No borra instrumentos, firmas, deuda ni pagos existentes.
- Repetir el mismo commandId/payload después de pérdida de respuesta. Congelamiento y pagos recuperan el resultado previo; contenido distinto se rechaza.
- Emisión interrumpida: recuperar exactamente los mismos documentos mientras la autorización de emisión siga vigente. Su vencimiento no se omite: requiere revisión administrativa antes de cualquier recuperación posterior; este PR no incorpora una renovación automática.
- Una reversa es un comando administrativo sobre un pago acreditado, nunca una reparación por edición de saldos.
- Rollback de aplicación requiere autorización. No usar rollback para borrar obligaciones ni volver a un código que no comprenda snapshots productivos ya emitidos.

## Límites de la validación

El adaptador normal se ejecuta sobre Auth, Firestore y Storage Emulator, con un contexto de prueba opaco instalado desde el proceso de test. La factoría exige hosts locales, proyecto demo, ausencia de credenciales y ausencia de runtime productivo; ninguna ruta acepta instalarlo. No prueba credenciales o infraestructura productivas.

El runner visual usa Next local para la UI y un harness HTTP local que invoca los exports de las rutas existentes dentro del mismo proceso del contexto opaco. No sustituye respuestas ni permisos, ni agrega endpoints a la aplicación. La compilación y las regresiones de Next se validan por separado.

Las pruebas y capturas efectivamente ejecutadas se registran en `TEST_RESULTS.md`. Que el adaptador funcione técnicamente no autoriza emisión jurídica ni garantiza un lanzamiento real en una fecha determinada.
