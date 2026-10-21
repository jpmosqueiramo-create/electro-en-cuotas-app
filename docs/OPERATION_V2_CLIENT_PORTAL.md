# Portal del cliente V2

Evolución de la operación V2 existente, desde main
`88414ade4a0b33d142f90625ceb1e79a005474d9`.

## Alcance habilitado y bloqueo productivo

Administración prepara un vínculo explícito operationId–UID de Firebase Auth.
Preparar el vínculo **no activa un servicio**, no invita, no acredita entrega,
no formaliza y no modifica la solicitud original ni el presupuesto.

La activación ordinaria requiere entrega efectiva y control de firmas físicas de
mandato, pagaré y remito. Ese cierre V2 sigue bloqueado. Por ello la emisión,
inspección y canje de invitaciones **fallan cerrados fuera de Emulator**; no hay
variable de despliegue que permita habilitarlos. La interfaz administrativa lo
indica y deshabilita el botón de invitación productiva.

`invitationsEnabled` exige proyecto demo consistente y Auth/Firestore en los hosts
locales exactos del runtime de pruebas, sin credenciales de servicio explícitas.
Una combinación productiva, incompleta o mezclada devuelve falso.

En Emulator se prueba el requisito mediante un documento exclusivamente sintético
`operation/clientActivationFixture`, schema `EMULATOR_CLIENT_ACTIVATION_FIXTURE_V2`,
proyecto `demo-cuenta-hogar`, entrega y las tres firmas en true. No hay API que
escriba ese fixture. No representa una entrega real, no altera el estado de
proveedor/logística/custodia y no crea CH, TERMS_FROZEN o FORMALIZED. Integrar
la evidencia documental real y autorizar invitaciones productivas queda pendiente.

## Reutilización del portal e históricos

Se integra una sección básica en `/cliente`, no un portal alternativo. La sección
V2 no participa en los cálculos, saldos, cuotas, recibos, PDFs o acciones de pago
del circuito anterior. Muestra gestión de compra por mandato, producto asociado
al snapshot aceptado, localidad y estado general. Nunca informa que una
preferencia de plan constituye contrato definitivo.

Las lecturas históricas se mantienen. Se retira específicamente el bucle legacy
que escribía `clienteId`/`clienteEmail` automáticamente al leer solicitudes
coincidentes: leer no migra ni cambia titularidad. Las acciones explícitas ya
existentes del usuario no se reescriben. No se migra ninguna cuenta o documento.
La vinculación V2 no escribe `clienteAuthUid` en solicitudes históricas ni concede
acceso al API financiero legacy. Sus importes/resúmenes siguen siendo del circuito
anterior y no incluyen estos servicios V2.

## Identidad y persistencia

La identidad completa sigue siendo la generada desde Acceptance: operationId,
colección/ID de solicitud, presupuesto/versión, opción aceptada y borrador. No se
buscan operaciones por coincidencia de email, DNI o nombre.

Dentro de `presupuestos_v2/{budgetId}/contracts/v{version}/operation/`:

- `client`: schema `OPERATION_CLIENT_V2`, operationId, revisión, UID nullable,
  PREPARED/ACTIVE, invitación vigente y fecha de activación.
- `client/commands/{commandId}`: digest y resultado idempotente del comando admin.
- `client/redemptions/{commandId}`: recibo de activación ligado a invitación y UID.
- `client/events/{id}`: actor UID, comando, revisión previa/nueva, fecha servidor,
  UID vinculado y motivo administrativo cuando corresponda.

Índices privados bajo la familia reservada sin presupuesto comercial padre:

- `presupuestos_v2/_operation_client_index_v2/contracts/{sha256(uid)}/services/{operationId}`.
- `presupuestos_v2/_operation_client_index_v2/contracts/invitations/requests/{invitationId}`.

Los registros de invitación contienen identidad de operación, email destinatario,
UID objetivo opcional, hash SHA256 de capacidad, estado, creación, vencimiento,
revocación y canje. No contienen contraseñas ni capacidades raw.

Estos paths reutilizan el subtree `contracts` ya privado por Rules, incluso para
SDK cliente admin. No se crean colecciones permisivas ni índices cloud. Las
reglas no se modifican. El índice se agrega atómicamente sólo al activar, nunca
al preparar un vínculo. Cada lectura vuelve a validar identidad, estado y UID.
Una cuenta puede tener muchos servicios independientes.

## Invitación y contraseña propia

1. Administración vincula una cuenta existente por **UID**, con motivo. Se valida
   en Firebase Auth que exista, tenga email y no esté inhabilitada ni sea la
   identidad administrativa. No se reemplazan vínculos ACTIVE.
2. Sólo en Emulator y con fixture documental completo puede preparar invitación.
   Si se trata de una cuenta ya existente, se exige su UID explícito antes de
   invitar. No se descubre su operación por email.
3. Para una cuenta nueva, la invitación identifica destinatario y operación pero
   aún no otorga acceso a ningún UID. El cliente crea su cuenta con contraseña
   elegida por él mediante el SDK Firebase Auth y verifica su email. No se crean
   usuarios desde el servidor de invitaciones ni se envían contraseñas fijas.
4. El canje requiere simultáneamente capacidad de 256 bits, sesión Auth válida
   con revocación comprobada, email verificado en Auth y coincidencia con el
   destinatario. Si había UID objetivo/preparado, debe ser exactamente ese UID.
   Si era cuenta nueva, se registra explícitamente el UID autenticado en el evento
   de canje. No se vinculan otras operaciones por ese email.
5. La transacción consume la invitación, activa el vínculo, escribe índice y recibo.
   Un replay idéntico del mismo comando/UID devuelve resultado previo. Otro
   comando no reutiliza la invitación. Revocación y activación concurrentes tienen
   un solo ganador. Un fallo transaccional no consume la invitación.

La contraseña viaja exclusivamente al proveedor Firebase Auth, no al API de
invitaciones ni a Firestore. Para cuentas existentes se ingresa con sus
credenciales actuales; no se restablece una contraseña por poseer esta invitación.
No se agregan nuevos proveedores de acceso. Si el registro Auth se crea y luego
la invitación vence o se revoca, queda una cuenta sin servicio vinculado; no se
elimina automáticamente. La cuenta puede iniciar sesión y reintentar el canje
vigente, previa verificación del email.

## Capacidades, vencimiento y privacidad

Capacidad aleatoria de 32 bytes generada con Web Crypto en el cliente admin,
formato base64url. El servidor sólo conserva su hash. El commandId y la capacidad
se mantienen en memoria para reintentos de respuesta perdida. El digest de
comando usa el hash, nunca el token original. Ni historial ni respuestas de
consulta admin recuperan el token.

Enlace `/activar-cuenta-v2/{invitationId}#capacidad`: el fragmento se retira al
montar la pantalla, antes de consultar el API; no viaja en URL HTTP, query o
referer. El API usa POST con body acotado y cabeceras privadas/no-store/no-referrer.
Recargar tras retirar el fragmento requiere reabrir el enlace original. Al perder
el enlace admin puede emitir otro (en Emulator); éste revoca el anterior.

Vigencia fija de 24 horas. Invitaciones pendientes son revocables; las consumidas
no se reutilizan. Los metadatos vencidos se conservan para auditoría, no hay
borrado/TTL productivo en esta entrega. Los tokens raw y las contraseñas no se
registran en logs ni se copian a documentación. No se envían mensajes automáticos.
La capacidad no sustituye la verificación de email ni la sesión del UID.

Se reutiliza la allowlist exacta de origen público existente. Solicitudes sin
Origin siguen la política explícita de ese helper: pueden proceder de clientes
no navegador y siguen necesitando capacidad/sesión/prerrequisitos. No se confía
en Host o X-Forwarded-Host. Los errores públicos son genéricos.

## APIs y permisos

- Admin: `/api/admin/presupuestos-v2/{budgetId}/versions/{version}/client-portal`.
  LINK, INVITE y REVOKE; revisión esperada y commandId. Verifica admin en servidor.
- Activación: POST `/api/public/client-invitations/{invitationId}` con INSPECT o
  REDEEM. No consulta datos del servicio antes de verificar la capacidad. REDEEM
  exige Bearer Auth. Ambos permanecen bloqueados fuera de Emulator.
- Cliente: `/api/cliente/servicios-v2` y `/api/cliente/servicios-v2/{budgetId}/{version}`.
  Token Auth verificado, UID de servidor y vínculo ACTIVE. Cambiar un ID no
  permite leer otra operación. No acepta un UID del body o de la query.

La allowlist del DTO excluye costos, proveedor, factores, margen, DNI/contactos,
planes, importes, cuotas, cronograma, saldos, archivos, paths y documentos privados.
No expone otros UID. Al cambiar de usuario se remonta la sección React para no
reutilizar datos de la identidad anterior.

## Verificación y límites

`testOperationClientV2Emulator.ts` cubre activación, expiración, reutilización,
revocación, idempotencia/concurrencia, varios servicios, acceso cruzado, ausencia
de grants financieros, bloqueo productivo y ausencia de mutación histórica.
`testOperationClientV2Browser.ts` recorre administración, contraseña propia,
verificación real de email en Auth Emulator, canje y `/cliente` desktop/mobile.
El runner contractual conserva las regresiones; `--client-only` permite repetir
únicamente el recorrido nuevo sin reemplazar los gates de la corrida completa.
La matriz de seguridad prueba también binding, invitaciones, índices y recibos.

Se ejecutan TypeScript, ESLint, build y test:safe. El archivo legacy `/cliente`
conserva deuda ESLint; se registra comparación diferencial contra la base exacta.
No se limpian errores ajenos para ocultar el resultado del archivo completo.

No hay pruebas con escrituras productivas, cambios de Rules/IAM/Storage, envío
real de invitaciones, merge ni deploy. El ledger y el cierre documental de entrega
siguen fuera de esta integración.

Resultados ejecutados: TypeScript, build, test:safe, suites Emulator cliente,
Operation V2, READY y navegador contractual/proveedor/custodia/cliente: PASS.
Repetición focalizada final cliente desktop/mobile: PASS; overflow cero y sin
peticiones Firebase externas. Seguridad Firestore: 2022 denegaciones y 115
accesos legítimos, PASS. ESLint módulos V2: PASS; `/cliente` pasa de 20 a 19
errores heredados, cero nuevos por comparación regla/mensaje/cantidad. El archivo
completo sigue fallando por esa deuda. Persiste el error de permisos legacy de
`clienteEmail` ausente en la carga histórica; no impide consultar los servicios
V2 ni se modifica la consulta o Rules para ocultarlo.
