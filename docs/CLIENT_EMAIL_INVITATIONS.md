# Alta de clientes por correo

## Operatoria

En **Clientes**, «Enviar acceso al panel por correo» envía el enlace al correo guardado de la solicitud representada en esa tarjeta. En la ficha de una operación, **Cuenta del cliente → Enviar acceso al panel por correo** invita al titular de ese plan emitido. No pide copiar un UID ni crear contraseñas desde Administración.

El cliente abre el correo de Firebase, confirma su dirección y elige una contraseña. Después entra a `/cliente` para consultar sus planes, cuotas, pagos y recibos. Una cuenta existente usa el mismo UID; repetir una invitación no crea otro plan. Los clientes sin un plan emitido pueden crear su cuenta, pero no se inventan cuotas ni deudas. Al emitir un plan nuevo, Administración debe enviar su invitación desde la ficha correspondiente.

El envío es una acción explícita. Este cambio no envía correos por el mero alta de una solicitud y no realiza cobros. Reutiliza Email Link de Firebase ya configurado para vendedores afiliados y los dominios autorizados; no requiere cambiar Rules, permisos ni configuración productiva.

## Identidad y compatibilidad

El servidor acepta sólo una referencia exacta: `OPERATION {budgetId, version}` o `REQUEST {collection, id}`, con colección `solicitudes` o `solicitudes_cuenta`. El correo se obtiene del registro guardado y del snapshot emitido. No se permite elegir un correo ni UID arbitrarios en el payload. Correos o UID contradictorios, cuentas deshabilitadas, planes revocados y documentos emitidos inconsistentes bloquean el vínculo.

Las tarjetas históricas de Clientes ya agrupan registros por DNI/correo. Su invitación conserva la colección e ID originales de la tarjeta; esa agrupación visual nunca autoriza vincular otros registros por DNI o nombre. Se incluyen únicamente planes emitidos que apuntan a esa solicitud exacta. Para otra solicitud/operación se envía desde su propia ficha. Una invitación de solicitud admite hasta 50 familias consultadas, 100 documentos contractuales por familia y 20 versiones emitidas; por encima de esos límites se pide invitar desde cada operación.

La activación exige identidad de Firebase vigente y correo verificado coincidente. Se comprueba evidencia de los PDF emitidos y se reutilizan `ClientBindingV2` y el índice de servicios existente. Cambios del contexto después del envío invalidan el enlace y requieren uno nuevo. Una invitación jamás rehabilita acceso revocado ni cambia el propietario de un plan. La consulta histórica sigue utilizando el mecanismo vigente de UID/correo verificado, sin migraciones automáticas.

## Persistencia añadida

Ruta privada, accesible sólo mediante backend:

`presupuestos_v2/_operation_client_index_v2/contracts/emailAccounts/records/{client_SHA256(target)}`

- Cuenta: `activeInvitationId`, `lastSentAt`, `state`, `email`; tras aceptar, `activatedUid` y `activatedAt`.
- Subcolección `invitations/{commandId}`: `target`, `contextDigest`, `email`, `targetUid` nullable, `createdBy`, `createdAt`, `expiresAt`, `state`; confirmación de intento `attemptFinishedAt`; aceptación `acceptedBy`, `acceptedAt`.
- Fechas ISO; estados `SENDING`, `SENT`, `UNCONFIRMED`, `ACCEPTED`. No se almacenan tokens OOB ni contraseñas.
- En el vínculo/índice existentes se registra `ACTIVE` y un evento `ACTIVATE_BY_VERIFIED_EMAIL_INVITATION`. La activación de todos los planes de una invitación es atómica.

No modifica documentos financieros, pagos, recibos, snapshots, PDF emitidos, numeración CH ni los schemas de solicitudes. Las invitaciones antiguas por UID siguen disponibles bajo «Vínculo e historial de acceso».

## Reenvío y recuperación

Validez de 48 horas y espera mínima de un minuto entre envíos del mismo destino. La reserva del comando se guarda antes de solicitar el correo: repetirlo tras pérdida de respuesta no vuelve a enviarlo. Un reenvío deliberado genera otra invitación e invalida la anterior. `UNCONFIRMED` indica que Firebase no confirmó el envío; no se afirma que llegó. Si el proceso cae durante el envío puede quedar `SENDING`: se recupera con un reenvío explícito después de un minuto. No se promete entrega exactamente una vez ni recepción efectiva del correo.

## Verificación

`scripts/testClientEmailInvitationsEmulator.ts` usa exclusivamente el proyecto `demo-cuenta-hogar` con Auth, Firestore y Storage locales. Con `CLIENT_EMAIL_BROWSER=1` verifica el enlace real de Auth Emulator, alta con contraseña, panel del mismo plan de 12 cuotas, pago y recibo existentes, aislamiento entre clientes, reintentos, reenvío, revocación y vistas de 1280, 390 y 320 px. También rechaza identidades no verificadas/deshabilitadas, invitaciones vencidas/sustituidas, cambios de correo y conflictos de UID.

El emulador no entrega correos externos: el navegador utiliza su buzón local. No se enviaron correos reales ni se escribieron datos comerciales de producción durante estas pruebas.

### Resultado del PR

- `npx tsc --noEmit`: PASS.
- `npx eslint <archivos modificados y nuevos>` comparado con la base: PASS diferencial, 0 mensajes nuevos; 8 mensajes heredados en los archivos existentes.
- `npm run build`: PASS.
- `npm run test:safe`: PASS.
- `testClientEmailInvitationsEmulator.ts`: PASS; ejecución con navegador `CLIENT_EMAIL_BROWSER=1` y ejecución final del dominio con casos negativos y cliente sin plan emitido.
- `testAffiliateInvitationsEmulator.ts` con `AFFILIATE_BROWSER=1`: PASS, alta por correo y acceso independiente del vendedor afiliado.
- `testFirstInstallmentBeforeDeliveryEmulator.ts`: PASS, tres roles, primera cuota, reintentos, recibos, comisiones, revocación e integridad documental.
- Navegador local: 1280, 390 y 320 px sin desbordamiento horizontal en la activación; panel del plan y envío desde Clientes comprobados. Se inspeccionó visualmente la captura móvil de activación.

Las suites Firebase se ejecutaron con `firebase-tools emulators:exec --only auth,firestore,storage --project demo-cuenta-hogar`, Java 21 y las variables de aislamiento de AGENTS.md, incluyendo `FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199`. El administrador de la prueba del directorio coincide con el correo exigido por las Rules, exclusivamente dentro de Auth Emulator. No se modificaron las Rules para hacer pasar la prueba.
