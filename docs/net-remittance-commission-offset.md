# Rendición con comisión retenida

## Confirmación del usuario

Se seleccionan los cobros incluidos y se usa la comisión **guardada en cada cobro**.
Una rendición puede reunir cobros al 10 % y al 15 %. No se vuelve a ingresar un
porcentaje ni se aplica la configuración vigente al total histórico.

En Administración → Vendedores afiliados → Efectivo y rendiciones:

1. Seleccionar los cobros pendientes (hasta 25 por rendición; consulta paginada).
2. Marcar «El vendedor afiliado ya descontó su comisión» cuando corresponda.
3. Revisar el total de cobros, la comisión retenida y el importe realmente recibido.
4. Elegir efectivo, transferencia bancaria o depósito; guardar una referencia.
5. Confirmar desde el botón que indica el importe recibido. Una sola confirmación
   desde el resumen concilia efectivo y comisión.

Sin la casilla, se recibe el total seleccionado y las comisiones no cambian.
Con la casilla, la comisión retenida se registra como pagada por compensación y
sale del saldo disponible para pagar. El cliente conserva la cuota acreditada:
no hay otro pago, imputación, recibo ni recálculo de su contrato.

Se conserva una acción secundaria para entregas parciales **sin descuento de
comisión**. No complica el formulario principal ni requiere reingresar datos del
cliente. Las observaciones permanecen opcionales.

## Reutilización del circuito existente

Se reutilizan `construirFifoFuentesComision`, saldos/reservas/recuperos del libro
vigente y el mecanismo `COMPENSACION_EFECTIVO_EN_PODER`. El armado de ítems y los
writers de pago/custodia se comparten con las liquidaciones anteriores. No se
modifica el motor de pricing ni las fórmulas que generaron las comisiones.

La rendición nueva calcula la retención sólo sobre fuentes devengadas verificadas
de los cobros seleccionados, con sus porcentajes y centavos guardados. No toma
comisiones de otra cuota para completar una retención. Fuentes pagadas o reservadas
no vuelven a liquidarse. Los recuperos reducen la disponibilidad global y pueden
bloquear una compensación hasta conciliar la cuenta.

Todo se prepara con lecturas previas dentro de una única transacción final:

- Rendición: dinero efectivamente recibido por Administración.
- `RENDICION_EFECTIVO`: reduce custodia por el importe recibido.
- Si hay retención: liquidación directamente PAGADA con sus ítems de origen,
  `PAGO_LIQUIDACION` por la comisión y `COMPENSACION_COMISION` que reduce la custodia
  por ese mismo importe retenido.
- Recibo de comando con digest del payload y resultado.

Así, **recibido + comisión retenida = cobros rendidos = reducción total de custodia**.
No queda una reserva o borrador intermedio si la transacción aborta.

## Schema y consumidores

Se conservan los nombres de colecciones. Extensiones opcionales de
`rendiciones_efectivo/{id}`:

| Campo | Tipo / significado |
| --- | --- |
| `schemaVersion` | `REMITTANCE_COMMISSION_OFFSET_V1` |
| `montoRendidoCentavos` (existente) | Entero positivo: dinero recibido, neto si hubo retención. Conserva su significado anterior. |
| `montoCobrosRendidosCentavos` | Entero positivo: total bruto de los cobros incluidos. |
| `comisionRetenidaCentavos` | Entero >= 0; comisión cancelada en este acto. |
| `liquidacionComisionId` | ID de liquidación PAGADA o null sin retención. |
| `cobrosIncluidos` | Array con `cashMovementId`, `paymentId` (o null), `grossCents`, `commissionCents`; vinculación explícita de cada cobro. |
| `cashAllocationPolicy` | `EXPLICIT_SELECTION_WITH_LEGACY_FIFO_V1` |
| `revisionPreviaHash` | SHA-256 de la selección y estado revisado; no es una credencial. |

La liquidación, el pago de comisión y la compensación de efectivo se vinculan
además por `rendicionId`. La proyección del vendedor afiliado incorpora
`grossCents`, `commissionRetainedCents`, `settlementId`; no expone notas
administrativas, UID del administrador, costos ni datos de otras cuentas.

Historiales de Administración y vendedor afiliado muestran por separado dinero
recibido, comisión retenida/cancelada y total de cobros rendidos. Los registros
anteriores siguen mostrando el importe recibido sin inventar un desglose.
No hay migración masiva ni reescritura de snapshots.

## Cobros anteriores y rendiciones parciales

Las selecciones nuevas guardan su atribución explícita. Débitos anteriores sin
atribución se concilian, sólo para derivar el saldo disponible, contra el efectivo
restante en orden FIFO de recepción (`createdAt`, ID). Esto es una convención de
conciliación del fondo de efectivo; no cambia el pago ni afirma un origen físico
que el registro anterior no contiene.

Para el remanente de un cobro con entrega parcial anterior, se distribuyen los
**centavos de comisión ya guardados**, sin recalcular el porcentaje vigente. El
remanente conserva el último centavo; además se limita por lo que sigue disponible
en esa fuente. La comisión de una parte ya rendida sin compensación sigue pendiente
para el circuito normal de pago; no se toma de otro cobro seleccionado.

Antes de calcular una retención se verifica la correspondencia exacta entre el
movimiento de custodia, pago activo, operación y fuentes devengadas. Un origen
faltante, repetido, revertido o inconsistente bloquea la retención automática: no
se estima una tasa. El efectivo anterior sin origen verificable puede rendirse por
su total o mediante la entrega parcial sin descuento, conservando sus comisiones
para revisión administrativa.

## Concurrencia, reintentos y permisos

El preview es de lectura autenticada y usa una allowlist. La confirmación sólo
acepta IDs de cobros, casilla, hash del preview, método y referencia; no acepta
importes ni porcentajes calculados por el navegador. Se vuelve a calcular sobre
los registros vigentes y se rechaza un preview desactualizado.

Dos confirmaciones distintas de la misma selección no pueden cobrar ni cancelar
comisión dos veces. Un reintento usa el mismo commandId/payload y obtiene el recibo
existente. La UI congela la acción mientras no haya respuesta definitiva y ofrece
«Reintentar la misma acción». Errores de transporte de Firestore devuelven 503,
conservando ese intento, incluso cuando la respuesta se perdió después del commit.
No se garantiza conservar el intento después de cerrar/reiniciar la pestaña:
al reabrir se debe consultar la cuenta e historial antes de enviar otra acción.

Se mantienen los controles actuales de administrador, identidad vigente y
habilitación productiva. El vendedor afiliado sólo consulta su propia cuenta; el
cliente no accede a comisiones ni a confirmaciones de rendición. No se cambian ni
se despliegan Firestore Rules, configuración productiva o permisos.

## Verificación prevista

- `testNetRemittanceEmulator.ts`: 10 % y 15 % guardados, selección concreta fuera
  de FIFO, parcial anterior, comisión reservada, bruto sin retención, centavos,
  fechas de Argentina, paginación, origen no verificable, abortos sin huérfanos,
  reintentos, respuesta perdida tras commit, carreras, privacidad y cliente intacto.
- `testPaymentReportsThreePanelsEmulator.ts`: mantiene la regresión de pagos de
  tres roles y añade una rendición neta de cobro V2 con fuente/snapshot verificados.
- `testSettlementsEngine3B5B.ts`: regresión de liquidaciones previas. Fixtures con
  namespace por ejecución; se conservan sus 64 comprobaciones y valores esperados.
- `testAffiliateCashUnifiedEmulator.ts`: conserva entregas parciales, separación
  de comisiones, acceso e idempotencia, con fixtures/consultas aisladas por vendedor.

Las suites usan exclusivamente demo-cuenta-hogar y hosts locales explícitos.
Las pruebas documentales requieren Storage Emulator; la revisión visual puede
iniciarse con `NET_REMITTANCE_BROWSER=1`, sin endpoints de prueba en el producto.
La publicación requiere aprobar el SHA final, que incluye esta ampliación y el
flujo de pagos de `467ff40`. No incluye el rediseño documental pendiente `003bb43`.
