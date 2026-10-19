# Presupuestos V2: aceptación y documentación privada P4

Base `ce4e929dcd2d5bf81bbf15a336b16ae21f3535b5`, rama
`feature/presupuestos-p4-acceptance-documentation`. Implementación para revisión;
sin commit, push, PR, deploy ni consultas/mutaciones productivas.

## Aceptación y fuente de verdad

La API Admin recibe exactamente budgetId, version, acceptedOptionId,
preferredPlanCuotas y commandId. Rechaza claves extra, identidades/tipos inválidos,
versiones implícitas, índices y arrays de opciones. Carga exclusivamente
`presupuestos_v2/{budgetId}/versions/{version}`: requiere BUDGET_V2 EMITIDO con
issuedAt válido, y una única coincidencia de optionId. El snapshot se valida con
la frontera runtime existente P3; los importes aceptados se copian literalmente,
sin recalcular la preferencia ni consultar productos vivos.

`BudgetAcceptanceV2` guarda identidad de origen, opción completa desde esa versión,
todos sus planes, autor/fecha, preferencia opcional e importe exacto ofrecido.
preferredPlanCuotas=null implica preferredPlanAmountSnapshot=null. La preferencia
no es contractual: el plan definitivo pertenece a una etapa futura de Contrato.
No se crean contractPlanCuotas, contractInstallmentAmount, contractTotal ni
contractSchedule. Las alternativas no seleccionadas no cambian de estado.

Una transacción crea `acceptances/{version}` y `documentation/{version}` junto
con `acceptanceCommands/{commandId}`, todos bajo la familia presupuestos_v2.
El digest usa campos normalizados en orden estable. Un retry con el mismo comando
y contenido devuelve la aceptación original. Otro contenido o intento de
reemplazar aceptación falla cerrado. La versión EMITIDO permanece intacta.
Una revisión GENERADO posterior no sustituye la aceptación explícita de V1.

La unidad de aceptación implementada en este prompt es budgetId+version, no una
reescritura del estado de la solicitud. No se implementan guardias de operación
contractual entre familias ni migración del circuito electrónico/OTP de P1.
No se escribe en solicitudes, solicitudes_cuenta ni sus arrays legacy.

## Expediente opcional

`BudgetDocumentationCaseV2` conserva identidad, opción aceptada, autores/fechas,
workflowStage DOCUMENTACION, slots y eventos. Los cuatro slots, en este orden:

1. DNI_FRONT: DNI frente.
2. DNI_BACK: DNI dorso.
3. ADDRESS_PROOF: Servicio / comprobante de domicilio.
4. PAYSLIP: Recibo de sueldo.

Todos tienen required=false, inicialmente SIN_CARGAR. Con archivos: CARGADO;
con observación vigente: OBSERVADO. Observar exige al menos un archivo, texto
no vacío de hasta 1000 caracteres, observedAt y observedBy. Una carga nueva
limpia la observación vigente; eliminar el último archivo deja SIN_CARGAR.
Eventos UPLOADED, DELETED y OBSERVED conservan tipo, documento, attachmentId
si corresponde, fecha, autor y nota opcional; nunca bytes del archivo.
Límites técnicos: 20 archivos por slot, 250 eventos por expediente y comprobación
de estructura de 600000 caracteres antes de agregar eventos. No son requisitos
comerciales ni disparan avance automático. Alcanzarlos falla cerrado y requiere
revisión técnica de capacidad, no truncado silencioso del historial.

La falta de cero a cuatro documentos no bloquea esta etapa. P4 no implementa
el avance a Contrato, pagaré, remito, entrega, cobranza ni aceptación electrónica.

## Storage privado por servidor

Browser Admin → API verifyAdminAuth → Admin SDK → bucket explícito.
El Client SDK sigue denegado por el baseline Storage para cualquier rol en P4,
incluido Admin browser. No cambian firestore.rules, storage.rules ni firebase.json.
Los lectores documentales legacy y comprobantes/** permanecen sin migrar.

El helper exige NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET en producción y falla cerrado
si falta; no deriva un bucket productivo appspot.com. En demo exige proyecto
`demo-cuenta-hogar`, Storage127.0.0.1:9199 y bucket demo explícito/permitido.
No modifica firebaseAdmin global. El bucket auditado productivo no se consulta
durante las pruebas.

Path: `budget-documentation-v2/{budgetId}/v{version}/{documentType}/{attachmentId}`.
IDs opacos; no se incluyen nombres, DNI, CUIL, email ni teléfono. El nombre original
es metadata privada: basename, sin controles, longitud máxima150. Descarga usa
Content-Disposition seguro con filename de fallback y filename* codificado.

MAX_ATTACHMENT_SIZE_BYTES=10485760 (10 MiB). MIME permitidos: image/jpeg,
image/png, image/webp y application/pdf. Se valida tamaño, MIME declarado y firma
mínima JPEG/PNG/RIFF-WEBP/PDF. No es antivirus ni prueba de autenticidad documental.
La API acota el cuerpo multipart a 10 MiB+64 KiB y comprueba el expediente antes
de leer/guardar bytes. Un sólo archivo y commandId son las únicas partes admitidas.

## Operaciones e idempotencia

Bajo `/api/admin/presupuestos-v2/{budgetId}/versions/{version}`:

| Operación | Método / sufijo |
| --- | --- |
| Consultar/registrar aceptación | GET/POST acceptance |
| Consultar expediente | GET documentation |
| Observar slot | PATCH documentation/{documentType} |
| Cargar archivo | POST documentation/{documentType}/attachments |
| Descargar/eliminar archivo | GET/DELETE documentation/{documentType}/attachments/{attachmentId} |

Todas verifican Admin, rechazan query params arbitrarios y sanitizan errores.
El navegador nunca envía snapshot, importe aceptado ni storagePath como autoridad.
Los endpoints de lectura/eliminación no admiten cuerpos. Metadata debe pertenecer
al expediente y al path exacto validado antes de usar Storage.

Upload deriva attachmentId de budgetId/version/type/commandId con SHA256 y compara
digest de contenido, MIME y nombre saneado. Una reserva durable por comando, con
lease120s y propietario aleatorio, serializa intentos simultáneos. Un retry en
curso recibe conflicto recuperable; después de la lease puede recuperar una
operación interrumpida. Primero se comprueba existencia; un objeto previo sólo
se reutiliza si coincide su hash. La creación conserva ifGenerationMatch=0 para
proteger también la carrera entre comprobar existencia y crear. La metadata/evento se confirma en transacción
con propiedad de reserva. Mismo comando y archivo distinto falla cerrado.
Una operación ya confirmada no vuelve a subir un archivo posteriormente eliminado.

Protocolo: RESERVA → objeto → metadata → COMMITTED. La reserva conserva desde
su creación commandId, budgetId, budgetVersion, documentType, attachmentId,
storagePath y sha256, sin nombre original, bytes, base64, URLs ni tokens.

Si falla la metadata, una transacción verifica que la reserva siga perteneciendo
al intento y pasa a ROLLBACK_PENDING **antes** de borrar. Conserva failureAt y
la generación del objeto cuando se conoce. Este estado no vence con la lease:
un retry del mismo commandId falla cerrado antes de cualquier llamada Storage.
Así una recuperación concurrente no puede reutilizar el objeto mientras se
está compensando. Si el commit anterior había terminado o cambió el propietario,
no se borra ese objeto.

Sólo se borra el path exacto creado por esta ejecución, con precondición de
generación. Nunca se compensa un objeto reutilizado o de creación incierta;
esos casos quedan ROLLBACK_PENDING para revisión administrativa.

Si DELETE funciona, se confirma COMPENSATED, con compensatedAt y leaseUntil=0,
y se devuelve el error original de persistencia a través del sanitizador de API.
Un reintento de COMPENSATED puede volver a intentar la misma operación, sin objeto
previo. Si DELETE falla, la marca ROLLBACK_PENDING ya existe: no se libera la
reserva ni se recrea/sobrescribe el objeto. Se registra un evento estructurado
DOCUMENT_UPLOAD_ROLLBACK_PENDING con identificadores técnicos, error normalizado
y durableReservationRecorded, sin errores SDK raw, contenido, nombres o URLs.
La API devuelve sólo un error de dominio de reconciliación administrativa pendiente.
La señal principal es la reserva; el log es complementario.

Storage y Firestore no comparten atomicidad. Si Firestore está completamente
indisponible, tampoco se puede garantizar la marca ROLLBACK_PENDING. Se conserva
la reserva previa (que ya tiene identidad suficiente), no se libera ni elimina,
y se emite el log con durableReservationRecorded=false y un error seguro. Sin
confirmar propiedad/bloqueo no se intenta un borrado que pudiera competir con
otro intento. Tampoco se afirma que la marca durable se guardó. Si DELETE tuvo
éxito pero no se pudo confirmar COMPENSATED, se conserva ROLLBACK_PENDING y se
registra el fallo de confirmación para reconciliarlo después.

Una caída abrupta antes de marcar rollback aún puede dejar RESERVED; la lease
permite recuperar ese intento. El bloqueo permanente corresponde a la marca
ROLLBACK_PENDING confirmada, no a una promesa de atomicidad entre servicios.
No hay limpieza automática de objetos ajenos ni consola de reconciliación en P4.

CROSS_SERVICE_ATOMICITY = NOT_POSSIBLE

BEST_EFFORT_COMPENSATION_WITH_DURABLE_RESERVATION = YES

P4_ROLLBACK_RECONCILIATION_UI = NOT_IMPLEMENTED

Descarga localiza metadata, verifica path, tamaño, hash y MIME, y responde bytes
con Content-Type, Content-Length, Content-Disposition attachment,
Cache-Control private,no-store y X-Content-Type-Options nosniff.
No genera getDownloadURL, signed URLs persistentes ni download tokens. Las URLs
blob temporales de UI se revocan y no se guardan en Firestore. Attachment metadata
contiene ID/path/nombre/MIME/tamaño/fecha/autor/hash, nunca URL, token, base64 o bytes.

Delete elimina sólo el path registrado y luego actualiza metadata/evento en una
transacción. Un retry con objeto ya ausente puede terminar la metadata pendiente;
si metadata ya no existe, no deriva ni elimina un path a partir del cliente.
Si falla Firestore después del borrado, debe reintentarse el delete; no se afirma
atomicidad entre ambos servicios. El evento de auditoría permanece al completarse.

## UI y privacidad

Workspace V2 ofrece Registrar aceptación sólo en EMITIDO, radio de una alternativa,
planes ofrecidos y selector Sin preferencia definida. Cambiar opción limpia la
preferencia. La confirmación muestra presupuesto, versión, cliente, opción y
preferencia. Después muestra aceptación registrada, oferta congelada, fecha y
DOCUMENTACIÓN. Gestionar documentación abre cuatro cards OPCIONAL con carga,
descarga, eliminación y observación, sin botones de Contrato.

No se amplía Validaciones ni se cambia BudgetClientV2, PDF o WhatsApp. Documentos,
observaciones y paths no se agregan al presupuesto comercial ni a sus DTO.
Canarios SECRET_DNI_DOCUMENT, SECRET_PAYSLIP y SECRET_STORAGE_PATH verifican la
allowlist existente. No se copian mutation handlers legacy.

## Verificación

Suites nuevas:

- `npx tsx scripts/testBudgetAcceptanceV2.ts`: modelos puros, rechazo de comandos,
  preferencia, slots, MIME/tamaño, bucket fail-closed y canarios de privacidad.
- `npx tsx scripts/testBudgetAcceptanceV2Emulator.ts`: transacciones, retry/conflictos,
  inmutabilidad, revisión posterior, cuatro formatos, spoof, compensación,
  upload/download/delete/observación y API adversarial.
- `npx tsx scripts/runBudgetAcceptanceV2Browser.ts`: navegador real desktop1280 y
  mobile390, opción2 sin preferencia y caso12cuotas, upload/download observado/delete,
  overflow y aislamiento de red. Capturas en `/tmp/cuenta-hogar-p4/`.

Ejecutar Firebase suites sólo con demo-cuenta-hogar y Auth9099, Firestore8080,
Storage9199 explícitos y las guardas del runtime. Ejecutar Storage baseline primero
en una instancia limpia para evitar colisiones de sus usuarios fixture con P4.
Regresiones: P3 modelo/persistencia/browser, históricos, C1, C3, Storage baseline,
test:safe, tsc, ESLint tocados/diferencial y build. La lista de pruebas describe
alcance; el informe de ejecución final acredita resultados, no este documento.

## Resultado de esta ejecución

PASS: modelos aceptación/documentación, aceptación Emulator, Storage documental
Emulator, API adversarial (incluido no-admin403, multipart extra y DELETE con cuerpo),
browser P4 desktop/mobile y descarga real de bytes sintéticos. Se revisaron las
siete capturas solicitadas. La allowlist DTO, WhatsApp y PDF excluye los tres
canarios documentales.

PASS: P3 modelo/persistencia/browser desktop+mobile, históricos, C1, C3 pura/
Emulator/browser y baseline Storage. PASS: diff check, TypeScript, ESLint de los
archivos tocados, test:safe y build. ESLint diferencial por archivo/regla/mensaje/
severidad/cantidad contra la base P4:146 errores históricos de Validaciones,
146 actuales y0 nuevos. El archivo Validaciones permanece byte-identical; no se
presenta su lint completo como PASS ni se debilitan reglas.

Las primeras ejecuciones detectaron una espera de test que incluía un botón
correctamente deshabilitado y el stream vacío que Next entrega a DELETE. Se
corrigieron sin quitar assertions; el browser final verifica upload, download,
observación, eliminación, auditoría, preferencia y overflow en ambas resoluciones.
Se mantienen cuerpos no vacíos y paths arbitrarios rechazados. El selector permite
volver a elegir el mismo archivo y conserva el comando de un upload fallido por
fingerprint local hasta confirmar la operación.

Rules, firebase.json, Validaciones, pricing, BudgetV2, persistencia P3 y PDF V2
permanecen intactos. Producción: cero lecturas de objetos y cero mutaciones.
No se crearon commits, push, PR ni deploy. Next y emuladores se detuvieron.


## Corrección bloqueante: rollback fallido

El fallo de DELETE compensatorio ya no se descarta. Se extendió la reserva
existente, sin nuevas colecciones ni archivo de implementación adicional.
ROLLBACK_PENDING bloquea cualquier reintento automático incluso con lease vencida;
conserva identidad, hash, fecha y generación cuando se conoce. COMPENSATED sólo se
confirma después de borrar el objeto nuevo; un objeto reutilizado nunca se borra
como compensación de esta ejecución.

PASS en demo-cuenta-hogar: UPLOAD_COMPENSATION_SUCCESS_TEST,
UPLOAD_COMPENSATION_FAILURE_TEST, ROLLBACK_PENDING_RETRY_TEST y comprobación de
reserva durable. Retry pendiente: cero objetos creados y cero borrados. Se verificó
la respuesta real de API con mensaje de dominio seguro, sin errores SDK raw.
También se probó indisponibilidad total de Firestore: reserva previa conservada,
log con durableReservationRecorded=false y sin afirmar atomicidad o marca exitosa.

PASS: aceptación/modelos/documentación/Storage Emulator/API adversarial, TypeScript,
ESLint de todos los TS/TSX P4, test:safe, build y diff check. Browser no se repitió:
la corrección quedó exclusivamente server-side, tests y documentación; la UI y
las siete capturas anteriores permanecen intactas. No hay interfaz de reconciliación
ni resolución automática de ROLLBACK_PENDING en P4. Ese estado requiere revisión
administrativa posterior autorizada.
