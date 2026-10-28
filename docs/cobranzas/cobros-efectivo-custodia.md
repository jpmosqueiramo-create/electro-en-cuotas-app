# Cobros en efectivo y custodia

## Operatoria

En Cuotas y pagos, Administración elige Efectivo y quién conserva el dinero: su propia cuenta administrativa o el vendedor afiliado actualmente asignado. No se puede elegir un vendedor ajeno a la operación. En el panel del vendedor afiliado, el único medio habilitado es Efectivo; la custodia se atribuye a su cuenta activa y verificada. Incluye primera cuota antes de firmas/entrega, con documentos ya emitidos, y cobros posteriores parciales o completos.

Después de confirmar se abre la pestaña Recibos con el comprobante disponible para abrir e imprimir. El PDF muestra X y DOCUMENTO NO VALIDO COMO FACTURA en el encabezado; identifica emisor, cliente, contrato, pago, fecha, importe, medio y cuotas imputadas. No emite factura fiscal, CAE ni realiza integración con ARCA. Formato consultado: https://www.afip.gov.ar/facturacion/comprobantes/situaciones-especiales.asp

El efectivo del vendedor afiliado se ve en su saldo pendiente de rendir y en la administración unificada de vendedores afiliados. El cobro no se resta automáticamente de sus comisiones. Las rendiciones existentes registran la entrega a Administración. Las cuotas conservan los importes y orden FIFO del contrato; cobrar no declara firmas ni entrega del producto.

## Autorización y atomicidad

POST de la ruta financiera del vendedor afiliado admite únicamente CREDIT_PAYMENT y ACTIVATE_WITH_FIRST_PAYMENT con method=EFECTIVO y cashCustody=AFFILIATE. Se comprueban Auth, cuenta activa y verificada, asignación actual, origen contractual, documentos emitidos y habilitación productiva. No permite transferencias, activar sin pago, reversas ni custodios arbitrarios. Recibos se consultan con la misma autorización de operación. Administración mantiene sus permisos actuales.

El mismo comando/transacción registra pago, recibo, imputación, comisiones y movimiento de efectivo. El commandId y paymentId conservan la idempotencia: reintentar no duplica saldos. Una falla de validación deja todos esos registros sin cambios. Las comisiones mantienen su porcentaje y motor existente; se admite explícitamente el actor vendedor afiliado verificado dentro del devengamiento del cobro en efectivo.

## Campos y compatibilidad

- `financial/payments/{paymentId}.cashCustody` (opcional): unión `{role:'ADMIN',uid:string,name:string}` o `{role:'AFFILIATE',uid:string,affiliateId:string,name:string}`. Se guarda un snapshot del custodio; no cambia al reasignar ventas. Sólo se devuelve en historial administrativo, no en recibos ni al cliente.
- Comando: `data.cashCustody` acepta ADMIN/AFFILIATE sólo para efectivo. El formulario lo envía explícitamente. Para compatibilidad, clientes administrativos anteriores que omitan el campo en un nuevo cobro en efectivo se atribuyen a la cuenta administrativa que lo registra. Registros históricos sin campo permanecen sin identificar; no se atribuyen ni migran automáticamente.
- `ledger_custodia_efectivo/cash_v2_{sha256([operationId,paymentId])}`: usa el ledger existente del vendedor afiliado, tipo COBRO_EFECTIVO_VENDEDOR, montoCentavos positivo; incluye vendedorAfiliadoId, custodianUid/Name, ledgerMovimientoRelacionadoId, solicitudId/operationId, budgetId/Version, operationSchemaVersion=OPERATION_CASH_V2, actor, fecha y clave determinística.
- `ledger_custodia_efectivo_admin/{mismo ID}`: nueva colección privada, misma estructura, administradorUid en lugar de vendedorAfiliadoId, tipo COBRO_EFECTIVO_ADMIN. Identifica efectivo conservado por Administración sin contaminar el saldo del vendedor afiliado. Protegida por la regla catch-all administrativa existente. Sin modificación ni despliegue de Rules.
- Reversa administrativa: movimiento determinístico `_reverse` negativo con tipo AJUSTE_CUSTODIA_EFECTIVO; revierte pago/recibo/comisiones en la misma transacción. Si el vendedor afiliado ya rindió o compensó dinero y el saldo disponible no cubre la reversa, se exige conciliación de la devolución antes de revertir. Nunca genera saldo negativo de custodia.
- Respuesta de consulta: cashOptions opcional contiene sólo nombre del vendedor afiliado asignado y activo; operación inactiva incluye operationId para registrar primera cuota. No expone sus UIDs a otros roles.

No hay migración ni modificaciones a snapshots, colecciones anteriores, reglas financieras, textos contractuales o configuración productiva.

## Verificación

`testCashCollectionsEmulator.ts` comprueba actores, medios, custodia, concurrencia/replay, comisiones, pago anticipado sin firmas, reversas, rendición y aislamiento del recibo. Con CASH_BROWSER=1 utiliza Chrome real y servidor local en Firebase Emulators para registrar efectivo, abrir PDF y verificar el selector administrativo y anchos 1280/390/320.

Validación realizada en esta rama:

- `npx tsc --noEmit`, ESLint de archivos modificados y `npm run build`: aprobados.
- Firebase Emulators, proyecto `demo-cuenta-hogar`, Auth 9099, Firestore 8080 y Storage 9199: suite nueva y regresión `testUnifiedCollectionsPaymentsEmulator.ts` aprobadas.
- Chrome real: cobro desde vendedor afiliado, consulta PDF autenticada, selector administrativo; sin requests a Firebase externo. Revisión visual y overflow en 1280/390/320 px aprobados. Se corrigió el alto del botón para texto multilínea.
- Recibo X generado sólo con pago sintético, renderizado con Poppler e inspeccionado visualmente.

No se cargaron datos productivos, no se enviaron mensajes y no se desplegó.
