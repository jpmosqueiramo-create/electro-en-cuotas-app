# Ventas anteriores — seguimiento independiente

Ruta administrativa `/admin/ventas-anteriores`, accesible desde el menú. Permite
cargar cliente, referencia/documento y teléfono opcionales, producto, fecha original,
referencia de venta y notas; entre 1 y 120 cuotas con vencimientos e importes
originales editables antes de guardar. Cada cuota puede incorporar un pago total o
parcial y la fecha efectiva, ingresada explícitamente sin asumir la fecha de hoy. Se revisan total, pagado y saldo antes de confirmar.

El calendario mensual es una sugerencia con ajuste al último día del mes. No aplica
factores, tasas, intereses, impuestos ni recálculos de precios. La lectura de saldos
reutiliza `financialSummary`, el motor existente de cuotas. Los pagos se registran
sobre la cuota elegida y se rechaza cualquier importe que supere su saldo.

El detalle permite agregar pagos de seguimiento o pagos anteriores faltantes,
consultar fechas, revertir un pago con motivo y volver a cargarlo correctamente.
Los registros originales y la corrección se conservan. El listado tiene búsqueda
por nombre/apellido sin distinción de acentos u orden, documento, producto o
referencia; filtros por cuotas vencidas, al día, pagadas y fecha original de venta.
Los filtros actúan sobre los registros cargados, con Cargar más cuando corresponda.

## Persistencia y compatibilidad

Colección nueva `ventas_anteriores_v1/{saleId}`. Es aditiva; no migra ni modifica
colecciones existentes. Schema `HISTORICAL_SALE_V1`:

- `id` string; `revision` entero positivo.
- `clientName`, `clientDocument`, `phone`, `product`, `originalReference`, `notes`: strings.
- `saleDate`: fecha calendario YYYY-MM-DD.
- `installments`: array de `{number, dueDate, amountCents}` con numeración consecutiva.
- `paidByInstallment`: array de enteros en centavos, alineado con cuotas.
- `lastPaidOnByInstallment`: array de fechas YYYY-MM-DD o null, incluyendo cuotas
  cuyos pagos no están en la página visible del historial.
- `createdAt`, `updatedAt`: instantes ISO UTC; `createdBy`, `updatedBy`: UID.

Subcolección `payments`: documentos con id, installmentNumber, amountCents, paidOn,
kind (`HISTORICAL` o `FOLLOW_UP`), reference, recordedAt/by y reversedAt/by/reason.
Los pagos iniciales usan IDs determinísticos `initial_NNN`; los adicionales se
vinculan al commandId. La fecha efectiva se conserva separada de la fecha de carga.

Subcolección `commands`: schema `HISTORICAL_SALE_COMMAND_V1`, digest del comando y
actor, at, action, data, result. CREATE, PAY y REVERSE son transacciones atómicas.
Reintentar un commandId devuelve el mismo resultado sin duplicar dinero; reutilizarlo
con otros datos falla. expectedRevision evita sobrepagos y pérdidas concurrentes.
Una reversa resta el pago una sola vez y recalcula la última fecha de pago activa
para esa cuota, sin alterar vencimientos ni importes originales.

API `/api/admin/ventas-anteriores`: GET paginado de 100 ventas, detalle con historial
de 50 pagos por página y POST con cuerpo JSON acotado a 64 KiB. Listado ordenado por
ID; historial por recordedAt descendente con cursor de documento. Usa índices
simples existentes. Respuestas privadas no-store; requiere administrador vigente
con correo verificado. Las reglas actuales por defecto son sólo Administración:
no se modifican ni despliegan Rules. Cliente y vendedor afiliado no tienen acceso.

El módulo no crea contratos, pagarés, recibos X, cuentas de cliente, movimientos de
ledger, comisiones ni custodia de efectivo. Tampoco aparece en sus totales actuales.
La navegación, página y API son sus únicos consumidores. Una eventual integración
con esos circuitos requiere una tarea separada; esta carga no presume nuevos cobros.

## Verificación

- testHistoricalSales: centavos, importes originales, cuotas parciales/pagadas,
  vencidas, fechas históricas, calendario y validaciones.
- testHistoricalSalesEmulator: idempotencia, concurrencia, sobrepago, reversa,
  fechas, aislamiento, autorización, reglas existentes y paginación.
- runHistoricalSalesBrowser: carga y revisión, fechas originales, pago parcial,
  pago nuevo, reversa, búsqueda, persistencia tras recarga y reintento de carga
  guardada con respuesta interrumpida, sin duplicación, en 1280/390 px.
- TypeScript, ESLint y build; sin datos productivos en las pruebas.
