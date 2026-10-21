# Control documental y entrega física V2

Base: `b778809eb17cabfdba3adb4a7995753243fa5922`.
Se reutilizan identidad Acceptance/operationId, confeccionador y expediente
contractual, seguimiento proveedor/logística, custodios por UID, panel del vendedor
afiliado y pantalla autenticada de confirmaciones. No se crea otro circuito logístico.

## Alcance y bloqueo productivo

Todo comando y carga de archivos del módulo exige proyecto demo consistente,
Auth 9099, Firestore 8080 y Storage 9199 locales, sin credenciales de servicio.
`NODE_ENV=production`, K_SERVICE, GAE_ENV o una selección productiva/incompleta
bloquean la ejecución. No hay flag para habilitarla en App Hosting. Las consultas
administrativas son de sólo lectura y no crean expedientes al abrirlos.

El resultado completo es `DELIVERED_EMULATOR`, nunca entrega productiva ni
FORMALIZED. No cambia TERMS_FROZEN, numeración CH, snapshots, PDFs definitivos,
invitaciones productivas, presupuesto aceptado o ledger. La revisión jurídica
continúa pendiente. El módulo controla documentos físicos preparados por fuera
de esta pantalla: no redacta cláusulas, genera un remito jurídico ni convierte
las muestras contractuales de revisión en documentos definitivos.

## Preparación y firmas

Administración registra responsable con UID/rol/registro y custodia física
confirmada. Se muestran producto, estado logístico y faltantes. Cada mandato,
pagaré y remito preparado tiene archivo privado, SHA256, referencia y versión
explícitos. Al cambiar una preparación se invalida su revisión de firma; no se
reemplaza la versión una vez recibidos los originales.

READY sólo acredita preparación técnica, no firma ni entrega. Para cada uno de
los tres documentos Administración debe comprobar:

- Firma física del cliente.
- Identidad del firmante y pertenencia del documento a la operación/version.
- Fotografía legible del documento firmado, vinculada al archivo preparado.
- Fecha/hora real de firma y actor/fecha de verificación.

La legibilidad y la autenticidad física se comprueban mediante revisión humana
explícita; el sistema no afirma detectarlas mediante OCR o reconocimiento de
firmas. Una foto o booleano aislados, sin preparación, versión y revisión
administrativa, no cierran una entrega. Los fixtures son sintéticos, no firmas
reales. La existencia/ausencia de firma de LOOP queda registrada pero su ausencia
**no bloquea por sí sola** si están las tres firmas del cliente. Esto no declara
aprobación ni validez jurídica.

## Archivos y privacidad

Fotos firmadas/daños/embalaje: JPEG, PNG o WebP. Preparaciones: esos formatos o
PDF. Hasta 10 MiB por archivo, máximo 100 archivos por operación. Se reutiliza la
validación MIME/bytes de documentación P4; se conserva SHA256 del contenido.

Metadatos en
`presupuestos_v2/{budgetId}/contracts/v{version}/operation/delivery/photos/{photoId}`.
Bytes en `operation-delivery-v2/{budgetId}/v{version}/{photoId}`. Los IDs/path no
contienen nombres, DNI, email ni teléfono. No se usa `comprobantes`, getDownloadURL,
signed URL, token de descarga, ACL pública o URL permanente.

Reserva PENDING antes de Storage, creación condicional sin sobrescribir, hash
verificado, revalidación de autorización y confirmación COMMITTED. El mismo
photoId/bytes/slot/relación/actor permite retry; otros contenidos se rechazan.
Si cambia la custodia o se pierde la confirmación puede quedar una reserva/objeto
privado PENDING para reconciliación futura. No se ejecutan borrados compensatorios
ni se declara el archivo incorporado antes de su confirmación.

Lectura mediante servidor con autorización actual y hash comprobado, no-store,
no-referrer y nosniff. El navegador usa un blob temporal, no una URL Storage.
Documentos completos sólo para Administración o custodios físicos/documentales
explícitos, incluidos participantes de una transferencia de originales. La mera
asignación comercial al vendedor afiliado no concede acceso al archivo firmado.
Clientes y terceros no tienen acceso. No se incluyen costos de proveedor, margen
ni condiciones administrativas en la vista operativa.

## Incidencias, retención y comunicación

El custodio informa firmas faltantes o rechazo por daños. La misma transacción:
conserva custodia, registra incidencia en el modelo existente, bloquea el avance
de proveedor/logística, crea una retención de entrega y una alerta `ENTREGA_V2_RETENIDA`
en `alertas_admin` con fecha Firestore y sin datos personales. Reintentar el mismo
commandId no duplica incidencia ni alerta. No envía mensajes automáticamente.

La firma informada como faltante invalida su revisión y requiere una fotografía
nueva posterior al informe. Administración debe resolver la incidencia y revisar
las tres firmas antes de levantar la retención.

Un rechazo por daño exige incorporar fotos privadas de daño y embalaje para
levantar su retención. Administración conserva la decisión exclusiva RETURN,
REPLACE o RESCHEDULE del circuito de custodia. Registrar una decisión o levantar
una retención no entrega el producto, no ejecuta un reemplazo automático ni
altera la economía aceptada. El afiliado conserva temporalmente el producto y su
retorno al conductor utiliza la transferencia existente con dos confirmaciones.
Si la custodia cambia, el antiguo responsable ya no puede cerrar la entrega.

Sin conexión no hay escritura ficticia de éxito: avisar inmediatamente a
Administración por WhatsApp y conservar producto/originales. La evidencia se
incorpora después; una regularización no omite fotos, firmas, originales ni
incidencias. La referencia de evidencia alternativa no copia conversaciones.

## Originales físicos

Después de revisar las tres firmas se registra recepción de los tres originales
como un paquete: UID/rol del custodio, ubicación, fecha/hora real, referencia y
los hashes exactos de las tres versiones preparadas. Si Administración atestigua
recepción en otra persona, exige referencia explícita de evidencia alternativa.
Las fotografías no sustituyen estos originales.

Las transferencias documentales reutilizan la estructura de participantes y
confirmaciones de custodia: autorización administrativa, origen vigente, destino,
fecha real, ubicación y motivo. Entrega y recepción son confirmaciones separadas,
aun para dos roles de la misma persona. Hasta ambas confirmaciones no cambian
custodio/ubicación. Una transferencia parcial no se cancela: se regulariza con
evidencia y motivo administrativos. Fechas no pueden retroceder antes de la
recepción anterior. El historial conserva las transferencias completadas.

La custodia documental sigue después de la entrega del producto. Por eso, tras
DELIVERED_EMULATOR sólo se admiten comandos de transferencia de originales;
no se sustituyen documentos, reabren entregas ni mueven de nuevo el producto.

## Cierre y atomicidad

`CONFIRM_DELIVERY` exige el UID del responsable/custodio real. Un admin distinto
no lo suplanta; `REGULARIZE_DELIVERY` identifica expresamente una atestación
administrativa de evidencia alternativa, con motivo y responsable físico
conservado. Ambos comandos sólo existen en Emulator.

Requisitos obligatorios, revalidados dentro de la transacción:

1. Identidad V2 y Acceptance válida.
2. Logística ENTREGA_PROGRAMADA.
3. Custodia vigente confirmada del mismo responsable, sin transferencia pendiente.
4. Tres documentos preparados y tres firmas del cliente verificadas.
5. Archivos COMMITTED, versiones/hashes coincidentes y bytes íntegros relectos.
6. Originales recibidos, hashes coincidentes y sin transferencia documental pendiente.
7. Sin incidencias abiertas en custodia/logística ni retenciones pendientes.
8. Fecha real no futura ni anterior a firmas, recepción de originales o custodia.

Todos los comandos tienen operationId, commandId, revisión esperada y actor
servidor. Recibos con digest del actor/contenido permiten replay exacto y rechazan
commandId alterado. Revisión y transacción serializan comandos concurrentes, aun
si cambian incidencias/custodia/logística durante la comprobación. Un aborto no
consume el comando ni libera el producto.

El cierre escribe atómicamente estado/evento de entrega, recibo e historiales,
libera la custodia física del producto y registra DELIVERED_EMULATOR en logística
y custodia. Esos módulos rechazan nuevas mutaciones físicas del producto
entregado. El estado cerrado sólo se acepta en demo; la custodia comprueba el
evento correlacionado. Las transferencias de originales permanecen auditables.

## Persistencia, APIs y futuro

Estado en `presupuestos_v2/{budgetId}/contracts/v{version}/operation/delivery`:
schema OPERATION_DELIVERY_V2, PREPARING/DELIVERED_EMULATOR, documentos, responsable,
originales, transferencia documental, retenciones y evento. Subcolecciones
`commands`, `events`, `photos`. La familia mantiene el vínculo original con
solicitud, presupuesto/versión, alternativa y borrador. No se infiere por DNI/email.

API administrativa:
`/api/admin/presupuestos-v2/{budgetId}/versions/{version}/delivery` y `/photos`.
Participantes:
`/api/custodia-v2/{budgetId}/{version}/delivery` y `/photos`.
Se integra a la ficha admin, el panel afiliado y la pantalla ya existente
`/custodia-v2/{budgetId}/{version}`. No se agrega un portal paralelo.

El evento `DELIVERY_CONFIRMED_V2` conserva modo EMULATOR_ONLY, operationId,
identidad completa, responsable, actor registrante, fecha física/registro, producto,
versiones, hashes, firmas revisadas y custodia original al cerrar. Queda disponible
para integrar activación y finanzas posteriormente; no activa clientes, cobra,
crea cuotas ni modifica el ledger. Los guards productivos de esos módulos siguen
intactos. No se convierte este evento en FORMALIZED.

Todos los documentos están en el subtree contracts ya privado incluso para SDK
admin. El prefijo Storage es privado por deny existente. No se alteran Rules,
IAM, índices cloud o configuración. Históricos sin identidad V2 siguen sin
migrarse. No se reescriben snapshots, contratos legacy ni plantillas jurídicas.

## Verificación

- `testOperationDeliveryV2Emulator.ts`: tres firmas/una faltante, LOOP no bloqueante,
  foto invalidada, bytes privados/integridad, originales/doble confirmación,
  rechazo/afiliado/retorno, replays/concurrencia/aborto, roles, bloqueo productivo
  y conservación de presupuesto/Acceptance/borrador/históricos.
- `testOperationDeliveryV2Browser.ts`: checklist admin, carga privada HTTP,
  revisión de remito, originales, responsable autenticado y cierre/reload mobile,
  aislamiento entre participantes y cero peticiones Firebase productivas.
- Runner contractual completo conserva regresiones anteriores. `--delivery-only`
  repite únicamente este nuevo recorrido cuando corresponde.
- TypeScript, ESLint de tocados, build, test:safe y matriz de seguridad Firestore.

No hay merge, deploy ni mutaciones productivas en esta entrega. La revisión
jurídica y la autorización de cierre productivo siguen pendientes.

Resultados ejecutados: TypeScript, ESLint de todos los tocados, build,
test:safe, nueva suite Emulator y navegador desktop/mobile: PASS. Regresiones
READY, proveedor/logística, custodia y portal cliente: PASS. Matriz Firestore:
2166 denegaciones y 115 accesos legítimos, PASS. Se mantiene el ruido legacy
preexistente de clienteEmail ausente en las cargas antiguas de cliente/afiliado;
no se cambian sus consultas ni Rules para ocultarlo. Capturas sintéticas fuera
de Git en `/tmp/cuenta-hogar-delivery-v2/`.
