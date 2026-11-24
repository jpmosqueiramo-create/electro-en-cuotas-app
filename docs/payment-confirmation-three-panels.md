# Cobros informados, acreditación y rendición

## Comportamiento

- Cliente o vendedor afiliado informa importe, fecha, medio y referencia. El
  informe queda **Pendiente de acreditación**. No modifica cuotas, recibos,
  comisiones ni efectivo bajo custodia.
- Administración revisa el informe y acredita desde el mismo motor financiero
  del contrato. Conserva las pruebas documentales, snapshot, FIFO, límites de
  saldo y restricción vigente de primera cuota exacta. No modifica pricing.
- Efectivo recibido por el vendedor afiliado: la confirmación acredita al cliente
  y genera la custodia pendiente de rendición en la misma transacción. Recibir
  después la rendición usa el circuito existente y no acredita otra cuota.
- Transferencia recibida sin aviso: Administración registra el pago directo.
  Si aparece luego un informe, puede vincularlo al pago acreditado de esa misma
  operación, con igual importe y medio. El vínculo no genera otro movimiento.
  El efectivo además debe coincidir con el custodio identificado.
- Rechazar requiere motivo visible para cliente y vendedor afiliado. Vincular y
  confirmar conservan trazabilidad. Una reversa posterior se proyecta en el
  informe como **Acreditación revertida**; no se oculta el registro original.
- Las pestañas antiguas del vendedor afiliado también tienen bloqueada la
  acreditación directa en servidor. Deben informar y esperar confirmación.

## Persistencia y autorización

Nuevos registros privados, dentro del subárbol `contracts` ya cerrado por las
reglas vigentes (no hay cambio ni despliegue de Firestore Rules):

| Ruta | Datos / consumidores |
| --- | --- |
| `presupuestos_v2/_payment_reports_v1/contracts/{id}` | `OPERATION_PAYMENT_REPORT_V1`: identidad exacta de operación/presupuesto/versión/colección de origen/solicitud; importe entero en centavos; método, fecha y referencia; receptor de efectivo y asignación fijada; informante; revisión 1 pendiente o 2 resuelta; pago vinculado, decisión y fechas. Sólo handlers autenticados. |
| anterior `/events/{commandId}` | Informe y decisión auditados. El identificador de envío y su digest evitan duplicar por reintentos. |
| `presupuestos_v2/_financial_transfer_ids_v1/contracts/{hash}` | `FINANCIAL_TRANSFER_ID_V1`: identificador bancario normalizado y hasheado, estado ACTIVE/REVERSED, operación y pago. Evita reutilizar una referencia de transferencia en nuevos cobros V2, incluso entre operaciones. Eventos CREDIT/REVERSE. |
| `alertas_admin/{reportId}` | `OPERATION_PAYMENT_REPORT_ALERT_V1`. Aviso creado junto al informe y resuelto/leído junto a la decisión; conserva vínculo explícito a la ficha. |

`FinancialPayment.bankReferenceKey` es opcional para compatibilidad. Los pagos
nuevos por transferencia lo incorporan; una reversa libera únicamente su propia
referencia y conserva auditoría. **La referencia debe ser el identificador único
real del banco**, no una descripción genérica. Referencias antiguas y pagos del
libro histórico no se reclasifican ni se deducen automáticamente; la protección
no reconoce una misma transferencia si se ingresan identificadores diferentes.

Confirmación, pago, recibo, saldos, custodia, comisiones y resolución del informe
se preparan con lecturas previas y se guardan en una sola transacción final.
El control de revisión rechaza decisiones desactualizadas. La respuesta perdida
se reintenta con el mismo comando y payload; la UI bloquea cambios mientras el
resultado sea incierto. No promete continuidad del intento después de cerrar
la pestaña: al reabrir, se debe consultar el informe/recibo antes de enviar otro.

El cliente sólo consulta operaciones vinculadas explícitamente a su UID actual,
verificado y habilitado. Un vínculo PREPARED puede mostrar el formulario y sus
informes, sin abrir lectura financiera, activar servicio ni crear recibos.
Se indexa al vincular la cuenta o al registrar un informe. Para vínculos PREPARED
anteriores que aún no tienen índice, Administración puede repetir explícitamente
LINK del mismo UID; no se busca ni vincula por email/DNI. Cambiar de UID preparado
no expone información al anterior: el listado omite índices que ya no corresponden.
Los accesos revocados se mantienen bloqueados.

La respuesta de cliente/vendedor afiliado usa allowlist; no incluye UID del
informante/decisor, costos, proveedor, factores, margen ni notas administrativas.
La referencia informada sólo se muestra a su autor y a Administración. El motivo
público del rechazo se identifica en el formulario antes de guardarlo.

Consultas paginadas: informes y bandeja V2 de hasta 50; pagos acreditados del motor
con su paginación existente. La selección para vincular permite cargar más pagos.
Los conteos indican lo consultado y si la lista es parcial. El orden entre páginas
es por ID estable, no una garantía de orden cronológico global. Una actualización
recarga desde la primera página para recoger cambios concurrentes.

## Circuito histórico

Se conservan `pagos_informados`, `solicitudes`/fallback `propuestas`, el ledger y
sus monedas. La bandeja separada consulta hasta 25 informes y muestra receptores
autorizados; los datos inconsistentes requieren revisión y no se cuentan como
cero. Un histórico ya vinculado a V2 no puede acreditarse desde el ledger anterior.

La confirmación histórica reutiliza `registrarPagoDirectoAdmin` con la misma
transacción del informe (elimina la transacción anidada); la autorización del
receptor y su custodia se leen/guardan en ese contexto. La comisión histórica
mantiene su reconciliación idempotente después del commit, sin cambiar fórmulas.
La API ahora transporta la fecha real de acreditación y el receptor. Admite
vincular un pago activo compatible sin crear uno nuevo. El portal no presenta
un informe como acreditado si su movimiento no puede verificarse o fue revertido.

No se inventa cotización ni se convierten monedas automáticamente: si el cobro
requiere una cotización que el informe no contiene, la acreditación se bloquea
para revisión por el circuito existente. Los pagos ya acreditados compatibles
pueden vincularse. La selección histórica consulta hasta 100 movimientos e indica
si faltan; no atribuye importes ni receptores por semejanza de nombres.

## Verificación

Suites nuevas (siempre `demo-cuenta-hogar`, hosts locales explícitos):

- `testPaymentReportsThreePanelsEmulator.ts`: fixture documental actual,
  primera acreditación, cuenta preparada, autorización de los tres roles,
  reintentos y conflicto de payload, carrera confirmar/rechazar, rollback al
  abortar la transacción final, efectivo/rendición sin doble pago, transferencia
  directa/vínculo posterior, unicidad bancaria entre operaciones, reversa,
  centavos exactos y paginación de más de 50 informes.
- `testHistoricalPaymentConfirmationEmulator.ts`: aborto tras preparar
  escrituras sin pago huérfano ni transacción anidada, confirmaciones concurrentes,
  efectivo, vínculo a movimiento existente, rechazo, centavos y fecha, handlers
  HTTP y proyección privada de la bandeja.

`PAYMENT_REPORTS_BROWSER=1` en la primera suite deja un servidor local con los
handlers reales y una fixture sintética para revisión visual; no habilita ningún
endpoint de prueba en el producto. Auth/Firestore/Storage deben estar emulados.
Las credenciales sintéticas se guardan sólo en `/tmp`, nunca en Git.

No hay migración masiva, escrituras de prueba en producción ni despliegue
incluido. La puesta en producción exige la aprobación explícita del SHA final.
