# Simulación del circuito completo — Cuenta Hogar

Fecha: 24/11/2026. Base de aplicación: `cfd121c5cb63319bc9116d3c9677c62c9943d5c6`.
Main remoto consultado: `7c0275e0033dd7841da9598f49211d7b9c1e3a26`.
Trabajo local en `feature/lifecycle-simulation`; sin despliegue, push a main,
modificaciones de motores financieros ni escrituras productivas.

Se simuló el recorrido **solicitud → presupuesto → aceptación → datos y
documentos → revisión manual → emisión → primera cuota → entrega → cobros →
rendiciones → comisiones → saldo cero** con servicios reales de la aplicación.
Las fechas avanzaron dentro del proceso Node; no se cambió el reloj del equipo.

## Resultado

| Caso ficticio | Cronograma | Total contractual | Saldo final | Rendición pendiente | Comisión pendiente |
| --- | --- | ---: | ---: | ---: | ---: |
| Mixto, vendedor afiliado al 10 % | 12 cuotas | $ 1.740.000,00 | $ 0,00 | $ 0,00 | $ 0,00 |
| Mensual, vendedor afiliado al 15 % | 18 cuotas | $ 2.343.420,00 | $ 0,00 | $ 0,00 | $ 0,00 |

El segundo cronograma llega al 31/05/2028 y comprueba el 29/02/2028. Se
conciliaron **33 puntos del recorrido y 30 cuotas**. Cada punto comparó cliente,
vendedor afiliado y Administración, pagos activos, imputaciones, recibos y el
cronograma guardado. Ambos casos conservaron el snapshot contractual.

**21 suites terminaron con código 0** en sus ejecuciones finales. Tres suites
históricas no se consideran aprobadas; sus límites se detallan más abajo. No se
contaron como fallos del producto las correcciones del nuevo guion durante su
preparación, ni se ocultaron los errores de las suites existentes.

## Escenarios ejercitados

| Área | Situaciones verificadas | Evidencia principal |
| --- | --- | --- |
| Solicitud | Alta mínima, repetición simultánea sin duplicar, cambio de datos con el mismo ID rechazado, origen e ID conservados | FullLifecycle, CreditReview |
| Presupuesto | Guardar, emitir, impedir aceptación de borrador, aceptación idempotente, varias opciones, revisiones y snapshots | BudgetV2, BudgetAcceptance, BudgetReference |
| Datos | Enlace privado, secreto incorrecto, consentimiento explícito y aplicación de datos recibidos | FullLifecycle, CompactIntake |
| Documentos | Upload real a Storage Emulator, revisión manual, observación, vigencia, descarga privada, borrado, reintentos y compensación ante fallos | CreditReview, CompactIntakeStorage, BudgetAcceptance |
| Aprobación | Bloqueo por documentación incompleta, revisión, pedido de información, aprobación y rechazo manuales, cambio de datos que invalida revisión | FullLifecycle, CreditReview |
| Emisión | Conformidad, numeración, PDFs privados, repetición sin segundo pagaré, recuperación, autorización y revocación | ProductionAdapter: 30 grupos |
| Entrega | Primera cuota antes de entrega, firmas y recepción independientes, documento externo, originales, regularización explícita, cierre bloqueado sin respaldo | FullLifecycle, ProductionAdapter |
| Cobro directo | Transferencia recibida por Administración sin aviso al vendedor afiliado, efectivo recibido por Administración | FullLifecycle, PaymentReports |
| Cobro informado | Efectivo o transferencia informados por vendedor afiliado, pendiente sin acreditar, confirmación administrativa, rechazo | FullLifecycle, PaymentReports |
| Pago ya acreditado | Informe vinculado al pago existente, referencia bancaria normalizada duplicada rechazada incluso entre operaciones | PaymentReports, FullLifecycle |
| Imputación | Pago parcial, complemento, un pago para dos cuotas, adelanto, atraso, pago final y bloqueo de sobrepago | FullLifecycle, ProductionAdapter |
| Dinero inválido | Cero, negativo, fracciones de centavo, magnitudes inseguras, formatos inválidos y pago mayor al saldo | FullLifecycle, PaymentReports, NetRemittance |
| Reversión | Saldo y recibo revertidos, reapertura después de saldo cero, reversión después de comisión pagada y posterior reposición sin pagar comisión dos veces | FullLifecycle, ProductionAdapter |
| Custodia de efectivo | Cuota acreditada con efectivo pendiente, entrega parcial, rendición total y rendición neta sin alterar saldo del cliente | PaymentReports, NetRemittance, Settlements |
| Comisión | 10 % y 15 % guardados en los cobros, mezcla de porcentajes, retención calculada desde cobros seleccionados, reservas y liquidaciones | NetRemittance, Commissions, FullLifecycle |
| Concurrencia y fallos | Confirmar/rechazar simultáneamente, mismo comando repetido, revisiones viejas, aborto atómico, respuesta perdida después de commit y reintento | PaymentReports, NetRemittance, ProductionAdapter |
| Acceso y privacidad | Cuenta ajena, rol incorrecto, cuenta inactiva, cliente revocado, referencias internas ocultas y recibos privados | PaymentReports, ProductionAdapter, FirestoreRules |
| Historia | Paginación sin omisiones/duplicados, recibos y reversas conservados, términos originales sin recalcular | PaymentReports, NetRemittance, ProductionAdapter |

Las pruebas de atraso V2 comprueban días vencidos y **recargo automático cero**.
Ese es el comportamiento actual; no se inventó ni cambió una política de mora.
Las pruebas del motor histórico de vencimientos se distinguen del circuito V2.

## Navegador → API → datos → respuesta

Se inició sesión por el formulario normal con tres usuarios sintéticos de Auth
Emulator. Se consultaron los endpoints reales mediante el harness local y se
verificaron los estados finales en Administración, cliente y vendedor afiliado.

| Frontera | Resultado |
| --- | --- |
| UI del caso completado | Los tres roles muestran 12/12, $ 1.740.000 acreditados y $ 0 pendientes |
| Cliente → API | Consultas financieras, informes y recibos por las rutas existentes |
| API → Firestore/Storage | Base nombrada aislada, runtime de prueba explícito y objetos privados locales |
| Datos → respuesta | 33 conciliaciones con recibos e imputaciones; proyecciones privadas por rol |
| Respuesta → UI | Cronograma saldado, recibos acreditados/revertidos, efectivo y comisiones pendientes en cero |

La revisión visual fue de consulta: el alta, las decisiones, uploads y pagos se
ejecutaron mediante servicios del servidor. No se recorrieron todos los
formularios del navegador. Los PDFs y fotos fueron sintéticos; no representan
identidad, documentación ni aprobación jurídica reales.

## Hallazgos para la próxima mejora

1. **Un informe rechazado de efectivo sigue diciendo “Efectivo recibido”.**
   Reproducido en Administración y vendedor afiliado. En
   `src/components/operations/PaymentReportsPanel.tsx:91` la leyenda depende del
   receptor y del rol, pero no excluye `REJECTED`. El saldo y la custodia sí
   quedaron correctos. Mostrar texto según el estado evita confundir un informe
   con un cobro confirmado.
2. **El cliente mezcla su plan V2 con un resumen antiguo vacío.** Debajo de
   12/12 pagadas aparecen “0 cuotas abonadas” y “Todavía no tenés operaciones
   activas”. El texto aclara que es otro circuito, pero sigue siendo confuso.
   Origen: `src/app/cliente/page.tsx:330`. Conviene ocultar el bloque anterior
   cuando no hay historia de ese circuito.
3. **Comisiones brutas y reversas requieren leer el detalle.** En el ejemplo,
   $ 203.000 generados menos $ 29.000 revertidos explican $ 174.000 pagados.
   El resumen muestra generado y pagado sin mostrar la reversa al mismo nivel.
   No es una diferencia de dinero: conviene mostrar esa conciliación visible.

Estos hallazgos no se corrigieron en la aplicación como parte de esta
simulación. La rama agrega pruebas y actualiza fixtures, sin alterar la
operatoria ni agregar datos para completar.

## Verificaciones y límites abiertos

| Suite / control | Resultado final |
| --- | --- |
| testFullLifecycleEmulator | PASS, 12 y 18 cuotas; 33 puntos |
| testPaymentReportsThreePanelsEmulator | PASS |
| testNetRemittanceEmulator | PASS |
| testProductionAdapterEmulator | PASS, 30 grupos |
| testBudgetV2Emulator, testBudgetAcceptanceV2Emulator | PASS |
| testCompactIntakeEmulator, testCompactIntakeStorageEmulator | PASS |
| testCreditReviewV2Emulator | PASS |
| testCanonicalPricingEngine, testEndToEndPricingFlow | PASS |
| testBudgetAlertRoutingFlow, testBudgetReferenceV2, testContractV2 | PASS |
| testLedgerEngine3B2, testLedgerEmulator3B2 | PASS |
| testCommissionsEngine3B4B | PASS, 15/15 |
| testSettlementsEngine3B5B | PASS, 64/64 |
| testProductionAuthEmulatorGuard, testRuntimeGuards | PASS |
| testFirestoreRules3B6A | PASS, 36/36, base predeterminada con Rules |
| tsc --noEmit | PASS |
| eslint de archivos modificados | PASS |
| npm run build | PASS, Next 16.2.1 |

Límites conservados, sin marcar PASS:

- `testOperationFinancialV2Emulator`: el adaptador histórico crea su propia
  conexión a la base predeterminada y no encuentra los fixtures de la base
  nombrada (`CONTRACT_READY_ORIGIN_REQUIRED`). El circuito productivo V2 se
  ejercitó en las suites FullLifecycle y ProductionAdapter.
- `testEngine3B3`: 33/34. Espera 200 del escritor antiguo de promesas por correo;
  la ruta está retirada y devuelve 403 deliberadamente. No se reabrió esa ruta.
- `testE2EThreePanels3B5D`: se detiene en RBAC con un administrador fijo distinto
  del administrador sintético configurado para la suite. No valida el recorrido
  actual; se conservó su resultado fallido.
- `testManualBudgetProductsFlow.ts`, citado en instrucciones históricas, no
  existe en este SHA. El runner usa las suites existentes BudgetReference y
  BudgetV2, sin inventar una aprobación de la suite ausente.
- Hubo errores intermitentes del emulador `Transaction is invalid or closed`
  en intentos de PaymentReports/ProductionAdapter. Se conservan logs; las
  ejecuciones finales aisladas pasaron. La causa intermitente no quedó aislada
  con certeza, por lo que no se presenta como resuelta ni como fallo demostrado
  de producción.
- Las bases nombradas implícitas del emulador tienen Rules abiertas. Por eso
  las pruebas Admin/servicios no se usan como prueba de Rules: se ejecutó la
  suite REST aparte en `(default)`. El hash registrado es del archivo fuente
  `firestore.rules`; no prueba por sí solo qué versión está desplegada.
- En el harness de base nombrada, los avisos generales que consultan Firestore
  directamente desde el navegador y algunas consultas históricas no comparten
  esa base. Hubo rechazos esperables del usuario previo y de consultas ajenas al
  flujo financiero. No se afirma que todas las rutas respondieran 200.

No se probaron bancos reales, dinero real, correo/WhatsApp enviado, caída total
de infraestructura, concurrencia ilimitada, migración productiva ni cada
combinación posible de estados. Una cobertura finita no demuestra infalibilidad.

## Reproducción y evidencia

Node usado: **24.11.1**. No se instaló un runner ni se modificaron dependencias.
Los tres emuladores deben estar activos. Desde la rama de simulación:

```sh
GCLOUD_PROJECT=demo-cuenta-hogar \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cuenta-hogar \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
node --import tsx scripts/runLifecycleSimulation.ts
```

El runner ejecuta las suites actuales secuencialmente, crea bases nombradas
nuevas y no borra fixtures anteriores. Auth y Storage permanecen en emuladores;
no se suministran ADC ni service accounts. Las tres suites históricas quedan
disponibles por nombre explícito para diagnóstico, excluidas de la matriz por
defecto. Las Rules se prueban aparte en la base predeterminada.

Cambios legítimos en fixtures existentes:

- CreditReview ahora envía el consentimiento requerido.
- BudgetAcceptance usa el administrador sintético configurado y verificado.
- ProductionAdapter usa correos únicos por ejecución y referencias diferentes
  para transferencias diferentes. Se mantienen las pruebas negativas de
  duplicados en PaymentReports; no se relajó el control bancario.

Evidencia local conservada en
`output/simulacion-ciclo-2026-11-24/`: informe, `verification.json`, resultados
individuales, línea temporal completa, registro HTTP del navegador, capturas y
logs de verificaciones. `diagnosticos/` conserva intentos intermitentes fallidos.
