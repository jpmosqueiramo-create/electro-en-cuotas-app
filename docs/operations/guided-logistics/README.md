# Logística: pedido, retiro, recepción y entrega

## Uso

- Abrir Administración → Logística. La bandeja muestra productos de presupuestos aceptados y su estado, cliente, proveedor, cantidades registradas y fechas de pedido, retiro, recepción y entrega prevista.
- Los accesos superiores agrupan pendientes, productos con el proveedor, productos en poder de Administración o pendientes de entregar, y entregados. La búsqueda admite nombre/apellido en cualquier orden, producto y proveedor. El selector permite consultar también cancelados, incidencias y consultas sin verificar.
- Abrir «Seguimiento». En la ficha el recorrido del producto queda visible, sin un selector técnico como primera acción.
- Completar la pregunta del siguiente paso y guardar. El sistema propone sucesivamente proveedor, fecha del pedido, disponibilidad y costo confirmado, listo para retirar, retiro real, recepción en poder de Administración, traslado y entrega programada.
- Las correcciones, programación de retiro, cancelación, reapertura e incidencias permanecen en «Corregir datos, programar retiro u otras acciones».
- La fecha final de entrega procede del registro de recepción verificado en «Firmas y entrega», accesible desde el recorrido. Programar una entrega no la acredita. La primera cuota conserva su circuito independiente en el mismo panel.

Las fechas reales se muestran en verde y las previstas/disponibilidad en ámbar, con etiquetas textuales. No se completa ninguna fecha real por defecto. Los resultados no verificados permanecen visibles y las cantidades faltantes se declaran expresamente, sin asumir una unidad.

## Integración

La UI reutiliza los comandos y rutas de `fulfillment` existentes. Se conservan validación de origen, transiciones, revisión esperada, commandId, reintentos idempotentes, auditoría, custodia y evidencias documentales. El formulario evita consultas concurrentes con sus guardados. Al cambiar de cuenta o expediente se reinicia su estado local.

La bandeja compone lecturas autorizadas de presupuestos, contrato y seguimiento, con concurrencia limitada a cuatro operaciones. Se actualiza al recuperar foco/conexión y cada minuto visible, descartando respuestas anteriores. No escribe al abrirse. Los registros históricos siguen disponibles por separado.

La única ampliación de respuesta es `deliveredAt: string | null` en GET de seguimiento: se obtiene de `delivery.event.occurredAt` del mismo expediente y sólo ante un cierre de entrega coincidente. La entrega productiva mantiene la comprobación de `productionDeliveryProof`; no se deduce de `updatedAt`, pagos o una fecha prevista. No hay cambio de esquema persistido, colección, Rules ni índices.

Los costos internos siguen restringidos a Administración y no modifican los importes del presupuesto, contrato o cuotas. No se alteran documentos jurídicos, CH, Auth, configuración ni finanzas.

## Pruebas ejecutadas

| Área | Resultado | Evidencia |
| --- | --- | --- |
| TypeScript, ESLint diferencial sin diagnósticos, build, test:safe | PASS | Logs `/tmp/ch99-{tsc,eslint,build,safe}.log` |
| Secuencia guiada, clasificación de estados, búsqueda, filtros, fechas reales vs previstas, entrega sin fecha inventada, cantidades ausentes | PASS | `scripts/testLogisticsOverview.ts` |
| Motor vigente: fechas, secuencia, cambios de costo y bloqueo de cierre directo | PASS | `scripts/testOperationFulfillmentV2.ts` |
| Navegador → rutas reales → Emulator: ocho pasos guardados, bandeja actualizada, búsqueda, filtro de entregados y fecha real de entrega | PASS | `scripts/testGuidedLogisticsEmulator.ts`, capturas adjuntas |
| Desktop 1280 y mobile 390 sin desbordamientos | PASS | Suite de navegador y capturas |
| Rechazo a anónimo y vendedor afiliado en rutas administrativas; entrega sin firmas/evidencias rechazada | PASS | Suite integrada |
| Concurrencia, abortos atómicos, historial, costos y snapshot, fechas, incidencias y custodia, permisos e históricos | PASS | `scripts/testOperationFulfillmentV2Emulator.ts` |

El recorrido de navegador usa una sola operación sintética en `demo-cuenta-hogar`. Para verificar la fecha final se completó exclusivamente en Emulator el circuito existente de documentos, firmas y originales, seguido de la entrega. No se emitieron instrumentos, registraron pagos ni modificaron operaciones productivas. Las capturas son sintéticas; no acreditan un smoke productivo de esta rama. Merge y deploy pendientes de revisión.
