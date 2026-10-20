# Vendedor afiliado y custodia V2

Evolución de PR #39 (identidad) y PR #40 (proveedor/logística), desde main
`be146c29907e994bdbe2b1701fd49de830fa516f`. No modifica ni migra históricos,
contratos, economía aceptada, cuotas, recibos ni ledger. No habilita entrega
final, TERMS_FROZEN, números CH, emisión definitiva ni FORMALIZED.

## Identidad y asignación

La operación conserva íntegra la identidad de Acceptance: `operationId`, colección
original, solicitud, presupuesto/versión, alternativa y borrador contractual.
No se buscan operaciones por DNI, nombre, teléfono o email.

Se reutiliza `vendedores/{affiliateId}`, exigiendo `activo === true`, `authUid`
explícito, único y correspondiente a un usuario Firebase Auth existente y no
inhabilitado. Registros legacy que sólo tienen email o carecen del vínculo UID
no adquieren acceso V2 por inferencia. Su vinculación explícita se gestiona en el
registro existente, fuera de migraciones automáticas.

Sólo Administración puede asignar/reasignar. El motivo es obligatorio. La
reasignación se rechaza con transferencia pendiente o custodia todavía bajo el
UID del afiliado anterior: primero debe transferirse físicamente. Una asignación
idéntica no genera un segundo evento. La revisión esperada serializa conflictos.

## Persistencia privada

Bajo `presupuestos_v2/{budgetId}/contracts/v{version}/operation/`:

- `identity`: identidad existente, no alterada.
- `affiliate`: asignación vigente y localizador de presupuesto/versión.
- `custody`: revisión, asignación, custodio confirmado, ubicación, transferencia
  pendiente e incidencias. `deliveryClosure` permanece bloqueado.
- `custody/commands/{commandId}`: digest ligado a actor y contenido; resultado
  mínimo para replay idéntico sin duplicar revisión.
- `custody/events/{commandId}`: comando, actor UID, fecha servidor, revisiones,
  producto/referencia del snapshot y participantes/evidencia de transferencia.
- `custody/photos/{photoId}`: reserva PENDING o COMMITTED, hash SHA256, tamaño,
  MIME, incidente, actor y path privado; nunca una URL pública ni nombre original.

Índice privado por UID, actualizado en la misma transacción de asignación:
`presupuestos_v2/_operation_affiliate_index_v2/contracts/{sha256(uid)}/assignments/{operationId}`.
La familia reservada no es un presupuesto comercial y no crea documento padre.
Evita consultas collection-group que necesitarían índices nuevos. Al reasignar,
se retira sólo la entrada de índice V2 anterior; el historial se conserva.
Cada lectura revalida registro activo, índice, asignación e identidad originales.

Todos estos paths están dentro del subtree `contracts` ya vedado a acceso
Firestore cliente, incluso admin. No se modifican Rules ni se requieren permisos
más amplios. Los contratos históricos sin identidad persistida no se convierten
en operaciones por lectura.

## Autorización y proyección

API administrativa: `/api/admin/presupuestos-v2/{budgetId}/versions/{version}/custody`.
Lista y comandos propios del afiliado: `/api/afiliado/operaciones-v2` y
`/api/afiliado/operaciones-v2/{budgetId}/{version}`.

Se reutiliza verificación administrativa existente. El afiliado usa token Auth
verificado en servidor (incluida revocación), UID y asignación vigente; no se
confía en localStorage, claims de rol arbitrarios, email ni IDs enviados solos.
No existe acceso implícito de admin como afiliado. Todos los comandos vuelven a
validar permisos dentro de la transacción. El servidor deriva actores y fechas
de confirmación, no los toma del payload.

La proyección del panel existente incluye sólo cliente/localidad del snapshot,
producto, estado/disponibilidad, entrega estimada, próxima acción y custodia
necesaria. Excluye costos, proveedor, margen, DNI/contactos, datos contractuales,
notas administrativas e identidades de otros afiliados. No conecta V2 con las
pestañas financieras legacy del portal ni altera sus consultas históricas.

## Transferencias y roles

`AUTHORIZE_TRANSFER` requiere retiro real del proveedor, origen coherente con
custodia vigente (o inicialización explícita del primer origen), destino,
producto, fecha/hora real, ubicación y motivo. Los participantes se identifican
por UID y rol `DRIVER`, `AFFILIATE` o `DEPOT`; el afiliado debe ser el asignado.
Las cuentas deben existir y estar habilitadas. Dos roles pueden tener el mismo
UID, pero origen y destino no pueden ser el mismo participante UID/rol/registro.

`CONFIRM_DELIVERY` y `CONFIRM_RECEIPT` son actos separados y sólo los confirma el
UID correspondiente. Administración no suplanta otra identidad. Ambas
confirmaciones son necesarias, aun si la persona cumple ambos roles. Hasta
entonces ni el custodio ni la ubicación confirmados cambian. No se admite
cancelar una transferencia parcialmente confirmada.

Se reutiliza el portal del afiliado y la ficha administrativa. Para conductor o
depósito se ofrece únicamente `/custodia-v2/{budgetId}/{version}`: una pantalla
de confirmación autenticada, sin acceso al panel, datos del cliente, costos ni
expediente. El enlace por sí mismo no autoriza: el UID debe ser participante de
una transferencia pendiente. Permite ambas confirmaciones si corresponde, no
modificar participantes ni incidencias. Sin conectividad, la recepción/entrega
se regulariza administrativamente con evidencia alternativa. `REGULARIZE` exige identificador de transferencia, motivo y
referencia de evidencia de entrega y recepción (por ejemplo constancia WhatsApp,
sin copiar conversaciones). Se conserva claramente su carácter de atestación
administrativa, no de confirmación digital de esos participantes. WhatsApp no
sincroniza automáticamente ni se considera transferencia registrada.

Una transferencia completada conserva participantes, producto, fecha física,
fechas de confirmación y eventual evidencia alternativa en eventos inmutables.
No se reemplaza el custodio mediante una edición libre. Reintentos idénticos
reproducen el recibo, y comandos concurrentes de una revisión admiten un ganador.

## Rechazos, decisiones y fotografías

El custodio afiliado vigente puede registrar incidencia, daño visible, rechazo,
ubicación y fecha física real. No puede resolverla. El producto permanece bajo
custodia; nunca se marca entregado. Las incidencias se reflejan atómicamente en
el seguimiento de proveedor/logística para impedir avances silenciosos.
Administración decide RETURN, REPLACE o RESCHEDULE con fundamento. Registrar la
decisión no ejecuta un reemplazo, pedido nuevo ni cierre: los movimientos físicos
posteriores requieren transferencia autorizada y confirmaciones. Un retorno al
conductor en recorrido posterior conserva la secuencia de custodia.

Fotos JPEG/PNG/WebP, máximo 10 MiB y 100 por operación, por servidor en
`operation-custody-v2/{budgetId}/v{version}/{incidentId}/{photoId}`. El prefijo
queda privado por el deny existente, tanto en baseline como en rules privadas.
No se usa `comprobantes`, getDownloadURL, tokens, ACL pública ni signed URLs.
Carga y lectura exigen autorización actual. El servidor valida firma MIME,
tamaño y hash; sirve bytes con no-store/nosniff. Los blobs de navegador son
locales y se revocan. Las pruebas sólo usan Storage Emulator.

Reserva Firestore antes de guardar, creación condicional del objeto y confirmación
de metadatos tras revalidar asignación. Fallos dejan una reserva PENDING privada;
el mismo photoId/bytes/actor puede reintentarse. No se compensan mediante borrados
arriesgados. Si la autorización cambia durante una carga, puede quedar un objeto
privado reservado: requiere reconciliación administrativa futura, no exposición
ni incorporación automática a otro expediente. No se ofrecen borrados.

## Compatibilidad y límites

No se alteran pedidos, textos de responsables ni registros legacy. La cadena de
custodia V2 con UID es la autoridad de transferencias confirmadas; las notas de
recepción anteriores siguen siendo evidencia operativa independiente y no se
convierten silenciosamente en confirmaciones de identidad. Historial completo en
subcolección; interfaz administrativa muestra últimos 100 eventos. Incidencias
máximo 100 por operación. No se borra historia para eludir límites.

No se verifican firmas ni remitos en esta entrega: el cierre permanece bloqueado.
No se habilitan numeración, contrato definitivo, cuotas, recibos o ledger. No se
crean usuarios/afiliados reales, índices cloud, secretos, Rules ni despliegues.

## Verificación

- `testOperationCustodyV2Emulator.ts`: asignación/reasignación, duplicados,
  concurrencia, roles, desactivación, aislamiento, confirmaciones, mismo UID con
  roles distintos, evidencia alternativa, rechazo, retorno, fotografías privadas,
  permisos HTTP/SDK, atomicidad y Budget/Acceptance preservados.
- `testOperationCustodyV2Browser.ts`, integrado al runner contractual existente:
  asignación administrativa, portal real del afiliado, recepción parcial,
  regularización, incidencia/rechazo, privacidad, aislamiento desktop/mobile.
- Regresiones Operation V2, Fulfillment V2, READY, seguridad contractual y
  `test:safe`; TypeScript, ESLint y build.
- `/afiliado/page.tsx` conserva deuda ESLint histórica: comparación por regla,
  mensaje y cantidad contra la base exacta, sin nuevos errores. No se limpia
  deuda ajena para ocultar el resultado de ESLint completo.
