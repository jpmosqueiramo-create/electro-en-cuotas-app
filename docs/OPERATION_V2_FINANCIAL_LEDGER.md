# Integración financiera de operaciones V2

Base: `d31ea132e0aa559161183597e6c1deca04b9c728`.
Política: `OPERATION_LEDGER_V2_FIFO_1`.

## Alcance y bloqueo productivo

Cobranza exclusivamente en Firebase Emulators `demo-cuenta-hogar`, Auth9099,
Firestore8080 y Storage9199. No existe variable para habilitar producción.
La guarda también rechaza runtime production, Cloud Run/App Hosting y credenciales
productivas. No se activa TERMS_FROZEN, numeración, FORMALIZED ni invitaciones
productivas. No se cambian Rules ni recursos. Toda aprobación usada en pruebas
es sintética y NO constituye aprobación jurídica.

La activación exige snapshot V2 congelado e íntegro en `contractSnapshotsV2`,
borrador vinculado mediante recibo C1 y hashes de presupuesto y Acceptance iguales
al snapshot. Exige entrega `DELIVERED_EMULATOR`, responsable y evento de entrega,
las tres firmas físicas verificadas, archivos preparados y firmados íntegros,
originales recibidos sin transferencia pendiente e incidencias resueltas.
READY solo nunca habilita cobranza.

El arnés de pruebas registra además `financialApprovalFixture` con esquema
`EMULATOR_FINANCIAL_APPROVAL_V1`, proyecto demo, aprobación
`SYNTHETIC_APPROVED_ONLY`, snapshotId/hash, operationId, comando de entrega y
hashes de los tres documentos. No hay API ni botón que fabrique esa aprobación.
La revisión jurídica real y el contrato definitivo aprobado siguen pendientes.
El fixture no cambia el estado legal de los documentos ni marca FORMALIZED.

## Identidad y persistencia

Se reutiliza identidad explícita PR39 (colección/ID de solicitud, presupuesto,
versión, opción aceptada y borrador) y el expediente privado existente:

`presupuestos_v2/{budgetId}/contracts/v{version}/operation/financial`

Estado: esquema, política, modo Emulator, operationId, revisión, snapshotId/hash,
número contractual tomado del snapshot, capital/servicios/total en centavos,
cronograma original, fecha/actor de activación, comando de entrega y fixture.
Subcolecciones:

- `payments/{paymentId}`: importe acreditado entero en centavos, medio, fecha
  efectiva, referencia administrativa, actor, imputaciones y datos de reversa.
- `receipts/{receiptId}`: comprobante técnico demo del pago acreditado y su
  imputación, operación, contrato, snapshotHash, estado ACREDITADO/REVERSADO.
- `commands/{commandId}`: digest de actor+contenido y respuesta para replay.
- `events/{commandId}`: comando, revisión esperada/resultante, fecha, actor,
  contenido y hash contractual; conserva cada reversa con motivo.

El fixture de aprobación está al mismo nivel, en `financialApprovalFixture`.
Todos esos documentos quedan bajo el deny directo de `contracts` ya existente.
No se agregan colecciones públicas ni accesos SDK. La matriz Emulator prueba
get/list/create/update/delete/batch, incluyendo admin navegador.

## Economía e integración del ledger

Importes y vencimientos se copian exclusivamente del ContractSnapshotV2 sellado.
Conversión exacta pesos-centavos: rechazar cantidades no representables, nunca
redondear condiciones. Capital+servicios y suma del cronograma deben coincidir
con total. Cada lectura y escritura vuelve a comparar la proyección con el
snapshot. Su validador existente comprueba la integridad; no se usa su resultado
para reemplazar valores por cálculos nuevos.

Se reutiliza `calcularImputacionesFIFO` de `ledgerEngine.ts` para orden y monto
de imputación parcial. La adaptación usa sólo importe/saldo por cuota y conserva
únicamente `importeAplicadoCentavos`; no inventa desglose fiscal por cuota.
No llama escritores legacy: dependen de solicitudes/propuestas, schema canónico,
comisiones y custodia de efectivo históricos. No escribe `ledger_movimientos`,
`ledger_imputaciones`, comisiones ni saldos iniciales. No modifica sus motores.

Un pago se registra sólo como acreditado por Administración. Transferencia y
efectivo son medios informativos; no se integran cuentas bancarias ni cobro por
afiliado. Referencia de acreditación obligatoria; no se afirma verificación
bancaria automática. No admite monto cero/negativo, exceder saldo ni anticipos
anteriores a entrega. No hay recargos, intereses, garantes ni conversión monetaria.
Las fechas se interpretan como fechas civiles del cronograma; comparación de días
con UTC como referencia técnica diaria, sin alterar el vencimiento pactado.

Cada cuota muestra PENDIENTE, PARCIAL o PAGADA. Mora significa saldo vencido y
cantidad de días; cargo de mora siempre cero. Una reversa desactiva sus imputaciones,
conserva el pago y marca su recibo REVERSADO. No reasigna pagos posteriores ni
sobrescribe el cronograma. El próximo pago aplica FIFO a los saldos vigentes.

## Atomicidad, reintentos y permisos

ACTIVATE, CREDIT_PAYMENT y REVERSE_PAYMENT exigen revisión esperada, commandId
único, operationId y actor administrativo. Estado, pago, recibo, comando y evento
se guardan en una única transacción. El mismo comando/contenido/actor retorna
replay sin duplicar importes; commandId con contenido distinto se rechaza.
PaymentId también es único: otro comando no puede reutilizarlo ni sobrescribirlo.
La interfaz conserva commandId, paymentId y revisión original tras respuesta
perdida incluso si se recarga el estado; después de recargar toda la página debe
consultarse el historial antes de registrar otra acreditación.

No existe cargo financiero por lectura. La activación única queda serializada por
la revisión y el documento financiero. Fallo antes del commit no registra pago,
imputación, recibo ni consume revisión. Los reintentos concurrentes CAS fallan
explícitamente si no son replay del mismo comando.

- Administración: API privada del presupuesto, lectura completa y comandos demo.
- Vendedor afiliado: consulta servidor sólo con UID/registro activo y asignación
  vigente; no acredita, revierte ni modifica importes.
- Cliente: consulta servidor sólo con UID verificado, vínculo ACTIVE y operación
  exacta. Soporta múltiples servicios mediante índice vigente sin coincidencia
  de email/DNI. No activa servicios ni invitaciones productivas.

Proyecciones cliente/afiliado contienen sólo total/cronograma, pagos imputados,
saldo/vencimientos y recibos acreditados/reversados. No incluyen capital privado,
servicios internos, referencia bancaria, actor interno, proveedor, margen ni
snapshot completo. Respuestas no-store y sin URLs de documentos.

APIs:

- `/api/admin/presupuestos-v2/{budgetId}/versions/{version}/financial` GET/POST.
- `/api/afiliado/operaciones-v2/{budgetId}/{version}/financial` GET.
- `/api/cliente/servicios-v2/{budgetId}/{version}/financial` GET.

Se integran las tres vistas existentes, sin nuevo portal. Servicio cliente agrega
budgetId y versión como localizadores explícitos, sin migrar registros históricos.

## Pruebas y límites

Suite `testOperationFinancialV2Emulator.ts`: activación con C1 y entrega completa,
aprobación pendiente/firma faltante, idempotencia, concurrencia, pagos parciales,
pago total, reversa, aborto antes de commit, recibos, mora sin cargos, proyección
alterada, roles, vinculación revocada, históricos intactos y bloqueo productivo.

Suite `testOperationFinancialV2Browser.ts` desde `runContractV2Browser.ts`:
escritorio1280/mobile390, pago por UI administrativa, recibo persistido, consulta
afiliado y cliente, recarga, autorización y ausencia de overflow/requests productivos.
`--financial-only` permite ejecución específica; ejecución sin flags mantiene
regresiones anteriores e incluye la suite nueva.

La revisión física y la aprobación jurídica no se automatizan. Recibos son
constancias técnicas demo, no comprobantes fiscales ni PDFs definitivos.
No existe cobranza productiva ni conciliación bancaria. No hay asignación de
comisiones ni integración con liquidaciones históricas. Las consultas actuales
leen el historial completo de pagos por operación; su costo crece linealmente
con pagos y se requiere paginación/resumen al habilitar escalas mayores. Cada
comando revalida seis archivos privados: aceptable para pruebas, no optimizado
ni autorizado para producción. Sin migración automática ni mutación legacy.

Capturas y logs de revisión permanecen en `/tmp`, fuera de Git.

## Verificación realizada

- TypeScript y ESLint del alcance: PASS.
- Build y `npm run test:safe`: PASS.
- READY, entrega documental, portal cliente y suite financiera Emulator: PASS.
- Firestore: 2382 denegaciones y 115 accesos legítimos; PASS.
- Browser completo de contrato, proveedor/logística, custodia, cliente, entrega
  y finanzas en desktop/mobile: PASS; overflow0 y solicitudes Firebase productivas0.
- Conversión de servicios cero y capital decimal exacto: PASS.
- Ruido conocido en las consultas legacy de `/cliente` y `/afiliado` por
  clienteEmail ausente: persiste, sin modificar ni ocultar esas consultas.

Las suites se ejecutaron sobre datos sintéticos. La primera combinación de suites
ejecutó READY después de crear un snapshot financiero: su assertion de Emulator
vacío falló. Se repitió READY primero y luego las demás suites; todas pasaron
sin debilitar assertions ni borrar fixtures para ocultar resultados.
