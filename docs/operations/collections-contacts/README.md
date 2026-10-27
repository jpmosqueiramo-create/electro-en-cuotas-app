# Cobranzas y registro de contactos

## Uso

1. Abrir Administración → Cobranzas. Los accesos superiores filtran cuotas vencidas, vencimientos de hoy y operaciones al día.
2. Buscar por nombre, apellido en cualquier orden (sin exigir tildes), o número CH. Combinar con estado y fechas de venta. La fecha de venta corresponde a la aceptación del presupuesto; no se inventa otra fecha ni se modifica el expediente.
3. Cada tarjeta muestra saldo, importe vencido, cuotas pagadas/vencidas y próximo vencimiento. Abrir la ficha para registrar un pago o consultar recibos.
4. Abrir «Contactos y promesas de pago», escribir lo conversado y, opcionalmente, fecha prometida y próximo contacto. El vendedor afiliado asignado tiene el mismo registro en su panel. Una promesa no cambia la deuda ni acredita un pago.
5. Para cuotas que vencen hoy o están pendientes de fechas anteriores, «Recordar cuota por WhatsApp» abre el mensaje preparado. Requiere el teléfono registrado con código de país. El operador revisa y envía; abrirlo no registra un contacto ni demuestra que se haya enviado. Registrar luego el resultado de la comunicación.

Los estados usan texto e iconos además del color: rojo para mora, ámbar para hoy, verde para cuentas al día/canceladas y neutro para planes sin activar. Las consultas fallidas aparecen «Sin verificar», nunca como saldo cero.

## Integración y seguridad

- La bandeja compone GET existentes de presupuestos, contrato y finanzas, con un máximo de cuatro operaciones en paralelo. Usa los importes y las imputaciones del motor vigente; no crea otra deuda ni recalcula factores.
- La lectura financiera usa `America/Argentina/Buenos_Aires` como fecha de corte para mora. Se añade `asOfDate` a la respuesta activa; el motor y los comandos de pagos no cambian. No hay migración ni cambio del estado persistido.
- Se conserva `presupuestos_v2/{id}/contracts/v{version}/operation/custody/engagements/{commandId}`. La nueva ruta administrativa usa la misma transacción y verificación de origen que el vendedor afiliado. La autenticación administrativa se valida en servidor y el vendedor debe seguir activo y asignado. No se habilita acceso a clientes ni a vendedores ajenos.
- Las entradas se crean de forma inmutable e idempotente, con actor y timestamp UTC. La respuesta agrega `at` y `recordedByMe`, sin revelar UIDs. Los registros antiguos siguen siendo compatibles. Se muestran los últimos 30 y se conservan los anteriores.
- Las respuestas antiguas se descartan al recargar o cambiar de identidad. La bandeja se actualiza al recuperar conexión/foco y cada minuto visible. No desmonta el formulario de contactos durante una actualización normal.
- WhatsApp utiliza un enlace manual sin envío automático. El mensaje contiene sólo cliente, cuota, vencimiento e importe pendiente: no costos, factores, notas internas ni datos documentales. No se agregan proveedores, credenciales ni tareas programadas.
- Sin cambios de Rules, Auth, catálogo jurídico, numeración CH, documentos, comisiones, facturación ARCA o configuración. Todas las escrituras de prueba se realizaron en `demo-cuenta-hogar`.

## Validación ejecutada

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| TypeScript, ESLint diferencial sin diagnósticos, build y `test:safe` | PASS | Logs locales `/tmp/ch98-{tsc,eslint,build,safe}.log` |
| Búsqueda sin tildes e invertida; rango inclusivo de fechas; saldos parciales; vencidos, hoy, canceladas y sin verificar; URL WhatsApp segura; concurrencia limitada | PASS | `scripts/testCollectionsOverview.ts` |
| Browser → rutas reales → Auth/Firestore/Storage Emulator → tarjetas y contactos | PASS | `scripts/testCollectionsContactsEmulator.ts` |
| Contactos de Administración visibles al vendedor asignado y viceversa; rechazo a anónimo, cliente y vendedor ajeno; concurrencia, replay y conflicto; sin alterar ledger | PASS | `/tmp/ch98-emulator.log` y capturas adjuntas |
| Búsqueda y fecha desde navegador; actualización conserva comentario sin guardar; desktop 1280 y mobile 390 sin desbordamiento | PASS | Capturas adjuntas y suite integrada |
| Regresión financiera: pagos parciales/completos, FIFO, recibos, reversas, abortos, concurrencia, aislamiento y cronograma original | PASS | `scripts/testOperationFinancialV2Emulator.ts`, `/tmp/ch98-financial-regression.log` |

Las capturas contienen una sola operación sintética. La clasificación de mora y el texto de WhatsApp se prueban con casos sintéticos de vencimiento; el enlace no se envió. No se probaron escrituras comerciales ni mensajes reales en producción. Merge y deploy quedan pendientes de revisión del PR.
