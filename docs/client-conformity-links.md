# Mensaje y enlace privado de conformidad

## Operación

En Revisión y conformidad, Administración genera un mensaje con las condiciones guardadas y un enlace privado. Puede copiarlo o abrir WhatsApp con el texto preparado. No se envían mensajes automáticamente. El cliente revisa el resumen, marca la casilla y pulsa Confirmar conformidad. La aceptación queda registrada en el expediente; el panel la consulta al recuperar foco o mediante Actualizar respuesta del cliente. El registro manual por otros medios sigue disponible.

El resumen utiliza una allowlist: nombre, domicilio completo, producto, cantidad/condición, cantidad e importe de cuotas, total, primera fecha y cronograma. El mensaje incluye producto, plan, total y primera fecha; el domicilio se revisa sólo dentro del enlace. No se comparten DNI, correo, empleo, proveedor, costo proveedor, factores ni otros campos internos. No se agrega un desglose adicional de netos, IVA o financiación.

La conformidad permite continuar con la confección; no emite instrumentos, no reemplaza sus firmas ni registra cobros. El código no modifica documentos legales congelados ni motores de precios.

## Acceso e integridad

El enlace contiene un secreto de 256 bits en el fragmento. El navegador lo retira de la barra y lo transmite únicamente por la cabecera X-Client-Conformity-Token; sólo se guarda su SHA-256. Página y API usan noindex/no-referrer y las respuestas son privadas sin caché. La API rechaza parámetros de consulta, orígenes cruzados y POST sin Origin; el enlace no exige crear una cuenta de cliente.

Dura siete días. Generar otro reemplaza el anterior. Antes de confirmar se comprueba el estado editable/activo del contrato, el origen aceptado y una vinculación de condiciones, domicilio, datos personales y referencia guardados. Si cambian, se solicita un nuevo enlace. La confirmación explícita requiere `{confirmed:true}` y se ejecuta en una transacción: evidencia, digest, hash del domicilio, revisión del contrato, estado de la solicitud y evento. Doble clic/reintento no duplica el evento. Un enlace ya aceptado sólo acusa recibo de su respuesta histórica; no renueva la conformidad ni aprueba cambios posteriores. No se presume identidad autenticada ni firma digital: el origen del evento es la posesión del enlace privado.

El botón de generación usa permisos administrativos existentes, expectedRevision y commandId. Los reintentos no vuelven a entregar el secreto; ante respuesta perdida puede generarse otro. Existen límites durables por solicitud y globales. No se registran secretos en logs ni en documentos.

## Datos y compatibilidad

Dentro de `presupuestos_v2/{id}/contracts/v{version}`:

- `conformityRequests/{requestId}`: schemaVersion CLIENT_CONFORMITY_REQUEST_V1; requestId, tokenHash, binding y originHash (strings), summary (allowlist anterior), status ACTIVE/ACCEPTED/REVOKED, createdAt/createdBy/expiresAt y, cuando corresponda, revokedAt/confirmedAt (strings ISO, actor string).
- `conformityLinks/current`: requestId string, puntero al único enlace vigente.
- `conformityLinkCommands/{commandId}`: actor string, expectedRevision number, requestId string y at string ISO, para idempotencia.
- `conformity/current`: conserva los campos existentes termsDigest, confirmedDigest, confirmedPaymentAddressHash, confirmedAt, confirmedBy y evidence. El origen automático usa confirmedBy client-conformity-link y referencia la solicitud en evidence.
- `events/client-conformity-{requestId}`: evento RECORD_CLIENT_CONFORMITY con by/at, before/after, evidence, termsDigest, requestId y presentation (resumen aceptado).

Índice privado `contractClientConformityRequests/{requestId}`: budgetId string y version number. `contractClientConformityLimits/{requestId|global}`: start (epoch ms number) y count number. El servidor consume estos registros; el cliente no accede directamente a Firestore. Las Rules actuales mantienen privado el subárbol contractual y acceso administrativo al resto; no se modifican ni despliegan Rules. No se renombran colecciones ni se migran registros anteriores.

## Verificación

TypeScript, ESLint, build y diff-check. Tests con proyecto demo-cuenta-hogar y Auth/Firestore/Storage Emulators: generación sin conformidad implícita, allowlist, secreto no persistido, token inválido, reemplazo, vencimiento, domicilio/condiciones modificados, rechazo de payload/origen inválido, límites, doble aceptación y auditoría. Navegador real a 1280 y 390 px: mensaje administrativo, aislamiento entre operaciones, enlace sin secreto en la barra, casilla obligatoria, aceptación y actualización del expediente. Sin mensajes enviados, firmas, emisiones ni escrituras productivas.

Pendiente de merge y deploy.
