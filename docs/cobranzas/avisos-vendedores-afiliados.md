# Avisos administrativos de cobros y promesas del vendedor afiliado

## Uso

Cuando un vendedor afiliado confirma un cobro en efectivo desde su panel, Administración recibe un aviso con cliente, vendedor afiliado, importe y fecha del pago. Cuando guarda una promesa de pago, recibe otro con cliente, vendedor afiliado, fecha prometida y comentario.

Los avisos aparecen en Inicio → Pendientes y alertas, con acceso directo a Cuotas y pagos de la operación. El enlace Alertas de la cabecera muestra en tiempo real la cantidad total de avisos sin leer desde cualquier sección administrativa. Marcar leído retira el aviso de pendientes y actualiza el contador; no modifica el pago, la custodia ni la promesa.

Los contactos sin promesa y las acciones realizadas por Administración no generan estos avisos. No se envían correos, WhatsApp ni notificaciones del navegador. No se reproducen avisos históricos.

## Persistencia y compatibilidad

Se reutiliza `alertas_admin`. Nuevos tipos: `COBRO_EFECTIVO_AFILIADO` y `PROMESA_PAGO_AFILIADO`, con `schemaVersion=AFFILIATE_COLLECTION_ALERT_V1`.

Campos nuevos (sólo servidor, privados para Administración): operationId, budgetId, budgetVersion, sourceCollection, solicitudId, affiliateId, affiliateName, actorUid, clientName y event. Se conservan tipo, mensaje, fechaCreacion (Timestamp de servidor) y leida (boolean).

- event para cobros: `{kind:'PAYMENT',paymentId,amountCents,effectiveDate,contractNumber}`. Centavos enteros, fechas calendario ISO; se usan los datos del pago confirmado.
- event para promesas: `{kind:'PROMISE',promisedDate,note}`. Se usan los datos de la gestión validada; el mensaje limita el comentario a 400 caracteres para su lectura en el panel.
- ID determinístico: `affiliate_collection_` + SHA256 de `[operationId,kind,commandId]`.

El aviso se crea dentro de la misma transacción que el evento original. Si falla su persistencia, tampoco se confirma el cobro/promesa. Reintentar el comando original conserva un único aviso y su estado leído; no se lo recrea ni se vuelve a poner pendiente. La asignación y la identidad activa y verificada del vendedor afiliado se validan mediante los controles existentes del comando.

Los campos nuevos no se aceptan desde el cliente. El servidor los deriva de la asignación y de los datos contractuales o comerciales verificados. Las reglas actuales de `alertas_admin` permiten su lectura y modificación sólo a Administración; las restricciones existentes de create desde el SDK cliente rechazan el nuevo payload estructurado. No se cambian ni despliegan Rules, índices, colecciones o configuración.

Los tipos de alertas anteriores y su enrutamiento se conservan. El nuevo enlace se construye sólo con budgetId validado y versión positiva; no se admiten destinos suministrados por un usuario.

## Verificación

`testAffiliateCollectionAlertsEmulator.ts` usa exclusivamente demo-cuenta-hogar, Auth 9099, Firestore 8080 y Storage 9199. Comprueba pago/promesa, concurrencia, reintentos después de marcar leído, fallo atómico al persistir el aviso, aislamiento de vendedores ajenos, Rules de lectura/escritura y rutas inválidas. Con ALERTS_BROWSER=1 verifica en Chrome real el contador en otra sección administrativa, llegada en vivo de ambos avisos, datos, acceso a operación, marcado leído y anchos 1280/390/320.

Resultados de esta rama: TypeScript, ESLint y build aprobados; 84 comprobaciones de enrutamiento de alertas aprobadas; suite de nuevos avisos con navegador en 1280/390/320 aprobada; regresión de cobros en efectivo, custodia, comisiones, rendiciones, reversas y recibos aprobada. Sin escrituras, avisos de prueba ni despliegue en producción.
