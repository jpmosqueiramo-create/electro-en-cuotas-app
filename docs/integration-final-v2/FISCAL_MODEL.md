# Modelo fiscal V2 y adaptador de simulación

LOOP fue declarada responsable inscripta por el titular. No se consultó una constancia autenticada de ARCA ni se configuraron alícuotas productivas. No se usa el supuesto legacy de IVA 21 % para descomponer el contrato.

## Separación económica

El snapshot sigue siendo fuente única de capital, servicios, total y cuotas. El modelo fiscal recibe bases explícitas por concepto: capital por mandato, gestión, logística u otros conceptos pactados. No distribuye porcentajes del agregado Servicios de Cuenta Hogar ni modifica el total aceptado. Requiere política identificada y versionada con responsable, referencia, vigencia, clase habilitada, tratamiento y tasa explícitos; un concepto desconocido bloquea la simulación.

Los importes fiscales son centavos enteros, con redondeo HALF_UP por línea y operaciones BigInt. Esta política es exclusivamente de simulación y debe homologarse antes de un adaptador real. Las bases recibidas son netas: no se asume que los servicios contractuales sean netos ni se agrega IVA al total contractual. Los conceptos exentos/no gravados exigen tasa cero y referencia; no se presume que el capital tenga alguno de esos tratamientos.

Clases simuladas: emisor RI → A para RI/monotributista, B para consumidor final/exento; C sólo para un emisor sintético exento/monotributista, nunca como supuesto para LOOP. La habilitación de clase/punto de venta se declara explícitamente en la política; no se infiere una autorización de ARCA. Quedan pendientes variantes/leyendas de A, retenciones, otros tributos y parámetros exigidos por el servicio real.

## Persistencia y límites

El adaptador `fiscalV2Emulator.ts` exige proyecto demo, hosts locales y ausencia de credenciales productivas con las guardas existentes. No tiene cliente ARCA ni realiza llamadas externas. Genera `SIM-…` y `MOCK-NOT-CAE`, sin validez fiscal.

Al emitir la simulación verifica un snapshot válido y la operación persistida. Registra documento, contador y comando idempotente en transacción bajo `presupuestos_v2/_fiscal_mock_v1/contracts`. Los contadores se separan por clase, tipo y punto; no tienen relación con numeración CH ni puntos fiscales reales. La política queda identificada por versión/hash y cada línea conserva referencia, base, IVA y total.

Notas de crédito/débito exigen factura de la misma operación, snapshot, receptor, clase y política. Las notas de crédito acumulan límites por total/concepto en un documento técnico separado; no reescriben la factura original. Una reversa financiera no genera nota fiscal automáticamente. Los recibos sólo referencian pagos y facturas; no calculan IVA ni originan otra deuda.

La referencia sintética de factura de proveedor verifica snapshot, operación y UID de cliente ACTIVE. Es un vínculo al comprobante del proveedor, no una factura emitida por LOOP en su nombre. El adaptador no copia documentación productiva.

Administración puede consultar simulaciones en Cuotas y pagos → Comprobantes fiscales. En producción muestra configuración/emisión pendiente y no consulta la colección demo. La API es administrativa; ni cliente ni afiliado reciben costos o documentos del proveedor. No hay botón ni POST fiscal productivo.

## Pruebas

Modelo: clases A/B/C, tasas explícitas, exención sintética, vigencia, configuración faltante, notas sin asociación, importes inválidos y recibo sin nuevo IVA. Emulator: concurrencia, replay, conflicto, factura inmutable, límite de nota de crédito, nota de débito, cruce de operación rechazado y guarda productiva.

El recorrido integral de doce cuotas agrega una factura simulada por servicios: base sintética $958.677,69 + IVA de prueba $201.322,31 = $1.160.000, coincidente con el servicio del caso ficticio. La tasa 21 % y atribución a gestión pertenecen únicamente a esa fixture, no son una decisión fiscal de LOOP. El capital de $580.000 se vincula a la referencia de factura sintética del proveedor. El total contractual permanece $1.740.000 y las cuotas son 12 × $145.000.

## Investigación y pendientes

- [ARCA: clases de comprobantes](https://www.arca.gob.ar/facturacion/regimen-general/comprobantes.asp): emisor, receptor y habilitación determinan la clase.
- [RG 5614/2024](https://biblioteca.arca.gob.ar/search/query/norma.aspx?p=t%3ARAG%7Cn%3A5614%7Co%3A9%7Ca%3A2024%7Cf%3A12%2F12%2F2024): transparencia fiscal y discriminación de impuestos. El modelo distingue el IVA; no se presenta su vista técnica como representación fiscal aprobada.
- [Manual oficial WSFE](https://www.arca.gob.ar/fe/ayuda/documentos/wsfev1-RG-4291.pdf): el enlace actual muestra una revisión de diciembre de 2026, posterior al contexto de esta tarea. Antes de integrar debe fijarse versión vigente y probar homologación; no se asume vigencia anticipada.

Pendientes de contador: constancia fiscal, tratamiento del capital por mandato, distribución real gestión/logística, inclusión de impuestos en servicios pactados, tasas/exenciones, momentos de facturación, puntos de venta y habilitación de clases. Pendientes técnicos para homologación: adaptador SOAP/WSAA, consultas de catálogos, autorización/consulta de resultado tras timeout y representación fiscal completa. No se solicitaron credenciales ni CAE reales.

Resultados ejecutados: modelo y Emulator fiscal PASS; recorrido integral de 22 etapas PASS, incluyendo cliente recurrente, snapshot de 12 cuotas, tres firmas, entrega demo, pagos parciales/cancelación/reversa, factura simulada inmutable y los tres roles. TypeScript, ESLint diferencial, build, test:safe y regresiones de borradores PDF PASS. Evidencias en `docs/evidence/fiscal-v2/`. La configuración jurídica sigue pendiente de verificación documental y no se emitió ningún CAE real.
