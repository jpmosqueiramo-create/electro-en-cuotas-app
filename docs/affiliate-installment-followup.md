# Seguimiento de cuotas del vendedor afiliado

La pantalla `/afiliado`, en Mis operaciones, presenta primero las cuentas asignadas y permite buscar nombre y apellido en cualquier orden, sin distinguir acentos o mayúsculas, localidad o número CH. Incluye filtros por estado, antigüedad del atraso y rango de fecha de venta, y orden por prioridad, atraso, vencimiento, venta o nombre. Los contadores representan clientes/planes, no cantidad de cuotas. Un plan puede tener cuotas vencidas y también una cuota que vence hoy.

La fecha de venta corresponde al día de aceptación de la propuesta en Argentina; no es la fecha de asignación al vendedor. Antigüedad significa días de atraso de la cuota impaga más antigua. No se inventan fechas para registros sin información.

## Contrato de lectura compatible

`GET /api/afiliado/operaciones-v2` conserva sus campos y agrega `operations[].followup`. La proyección autorizada de custodia agrega `saleDate` (`YYYY-MM-DD`). No se agregan campos persistidos, colecciones ni migraciones.

`followup` contiene `state` (`ACTIVE`, `INACTIVE`, `UNKNOWN`), `asOfDate`, `contractNumber` y `balanceCents` (ambos anulables), e `installments`: número, fecha de vencimiento, saldo en centavos, indicador de vencida y días de atraso. Los importes y estados provienen de `readFinancial` y su motor contable existente. No se recalculan intereses, mora ni comisiones. Los pagos parciales conservan su saldo real. Una consulta fallida produce `UNKNOWN`, nunca saldo cero ni estado al día.

La autenticación, el vendedor activo y la asignación vigente siguen validándose en servidor para cada lectura. La composición limita las consultas a cuatro operaciones simultáneas y usa el calendario de Argentina. No expone costos, factores, proveedores ni UIDs de otros participantes.

El listado se actualiza al recuperar foco y cada minuto mientras está visible. El detalle se carga al abrir la cuenta; las actualizaciones mantienen los formularios abiertos mientras la operación siga en la lista. Los contactos y promesas conservan su panel y permisos actuales. Logística y documentos continúan disponibles en el detalle. El seguimiento no acredita pagos ni realiza cambios financieros.

## Verificación

- `scripts/testAffiliateFollowup.ts`: pagos parciales, fechas, búsqueda, atraso, estados desconocidos, allowlist e inmutabilidad.
- `scripts/runAffiliateFollowupBrowser.ts`: navegador con Firebase Emulators demo; filtros, detalle diferido, aislamiento de vendedores y anchos 1280, 390 y 320. Comprueba que la lectura no modifica el documento financiero.

Controles ejecutados el 27/10/2026: TypeScript sin errores; ESLint de todos los archivos modificados sin advertencias; build de producción correcto; pruebas puras de seguimiento correctas; prueba de navegador con Emulator correcta en 1280/390/320, con detalle diferido, aislamiento de vendedores y sin modificar el registro financiero; suite `testAffiliateIntegrationV2Emulator.ts` correcta (reasignación, revocación, pagos parciales, reversas, custodia y comisiones). Las dos suites de navegador históricas se adaptaron a abrir el detalle; no se ejecutaron completas en esta tarea. No se desplegó ni se probaron escrituras sobre producción.
