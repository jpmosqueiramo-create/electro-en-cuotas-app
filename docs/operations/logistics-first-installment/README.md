# Logística simple y primera cuota antes de firmas

Base: `5cd0d0489ea4d85f7e902ea427d0db1628050520`.

## Recorrido manual

1. Emitir el mandato y pagaré desde el panel contractual existente.
2. Abrir **Logística → Primera cuota y pagos**. Si el pago ya se recibió, indicar su fecha, medio y referencia y confirmar **Primera cuota recibida**. El importe proviene del contrato emitido. La misma transacción registra el pago, el recibo y el cronograma completo, con la primera cuota acreditada. No se requiere declarar firmas o entrega para cobrar.
3. En **Firmas y entrega**, utilizar las tarjetas de mandato, pagaré, documento externo y recepción firmada. Cargar las evidencias y confirmar sólo lo ocurrido. La custodia y el responsable físico conservan sus validaciones. Proveedor, retiro y traslado quedan en una sección desplegable; incidencias, transferencias y regularizaciones siguen disponibles.
4. El cliente previamente vinculado y verificado accede a su plan; el vendedor afiliado asignado consulta la misma fuente financiera. No se crean cuentas ni se infiere una identidad a partir de un correo o nombre. Si falta el vínculo, se indica expresamente y se conserva el pago. Los accesos revocados no se reactivan.

Las firmas y la recepción continúan pendientes hasta registrarlas. Cobrar no acredita que el producto haya sido entregado, ni habilita sustituir documentos con actividad financiera. El plan no se vuelve a crear al confirmar la entrega.

## Persistencia y compatibilidad

Se reutilizan `OPERATION_FINANCIAL_V2`, su política FIFO, sus documentos `payments`, `receipts`, `commands` y `events`, y el ledger existente de comisiones. No cambia ninguna colección ni se crea un motor alternativo.

| Campo / comando | Uso nuevo | Compatibilidad |
| --- | --- | --- |
| `ACTIVATE_WITH_FIRST_PAYMENT` | Sólo Administración habilitada, documentos emitidos íntegros, importe exacto de la primera cuota, fecha válida y revisión vigente. Activación y cobro atómicos. | `ACTIVATE`, `CREDIT_PAYMENT` y `REVERSE_PAYMENT` existentes conservados. La activación histórica sigue comprobando entrega. |
| `FinancialState.activationBasis` opcional | `{policy: "FIRST_PAYMENT_BEFORE_DELIVERY_V1", issuedManifestHash}`; el servidor verifica snapshot, paquete, autorización, manifest y hashes/generaciones de los documentos. | Ausente en ledgers históricos; siguen sus comprobaciones anteriores. No se migra información. |
| `deliveryCommandId` | `null` sólo para esa nueva política. | Los ledgers anteriores conservan el identificador de entrega. Ningún consumidor externo interpreta el valor nuevo como entrega. |
| Evento de cliente `ACTIVATE_AT_FIRST_PAYMENT` | Activa e indexa únicamente el UID ya vinculado, activo y verificado. Invalida una invitación pendiente coherente. Escrituras dentro de la transacción del pago. | Se conservan la invitación normal, la revocación, sus índices y sus eventos. No se modifican Auth ni roles. |
| `physicalCustodianParticipant` en vista administrativa | Permite seleccionar al responsable ya acreditado sin copiar un UID. | Sólo Administración recibe esos datos; el endpoint y las reglas de custodia no cambian. |

Las vistas financieras se actualizan tras el comando, al recuperar conexión o foco y periódicamente. La lista de servicios del cliente se vuelve a consultar para descubrir la activación, aislada por UID y descartando respuestas anteriores. El cliente y el afiliado no reciben acciones administrativas de cobro.

## Validación ejecutada

| Comprobación | Resultado / entorno |
| --- | --- |
| TypeScript, ESLint diferencial, build e integridad del renderer | PASS, local |
| `npm run test:safe` | PASS, selección demo y suites seguras |
| `testFirstInstallmentBeforeDeliveryEmulator.ts` | PASS, 13 grupos específicos, Auth + Firestore + Storage `demo-cuenta-hogar` |
| `testProductionAdapterEmulator.ts` con originales, paquete instalado y documentación externa | PASS, 32 grupos históricos |
| Navegador real y rutas actuales, tres cuentas sintéticas independientes | PASS, desktop 1280×900 y mobile 390×844; no simulación de roles |
| Recibo sintético | Texto nativo, importe $145.000, leyenda de prueba, sin CAE |

Una misma operación sintética se utilizó para emisión, primera cuota y los tres perfiles: capital $580.000, servicios brutos con IVA incluido $1.160.000, total $1.740.000, doce cuotas de $145.000. Tras el pago: saldo $1.595.000, una cuota pagada y once pendientes. Tras la reversa: saldo $1.740.000 y doce cuotas pendientes. No se recalcularon vencimientos ni se agregó IVA al total. Las comisiones se revirtieron y repusieron una sola vez según la configuración vigente del fixture, sin cambiar porcentajes o base.

Se comprobaron: operación no emitida; rol cliente/afiliado intentando cobrar; operación ajena; importe/fecha inválidos sin escrituras parciales; respuesta perdida y reintentos; activación duplicada; pagos y reversas concurrentes; acceso cruzado; revocación de cliente; sustitución del PDF; autorización revocada; imposibilidad de confirmar entrega sin firmas/evidencias; bloqueo de reemplazo documental después del cobro. Los documentos, plan, recibos e historial utilizan el mismo snapshot y CH.

Incidencias de ejecución resueltas: una carrera del test al esperar el componente de entrega; selección inicial incompleta de flags del fixture histórico; falta de espacio local (`ENOSPC`) durante una repetición de Next dev. Se corrigió la espera/configuración del runner y se limpió exclusivamente `.next` regenerable. No se retiraron validaciones ni se borraron archivos de usuario. El harness conserva la denegación SDK de alertas del dashboard local ya conocida; las rutas de operación y los tres portales completaron el recorrido sin relajar Rules.

## Evidencias sintéticas

- [Primera cuota desktop](primera-cuota-desktop.png) / [mobile](primera-cuota-mobile.png).
- [Firmas desktop](firmas-desktop.png) / [mobile](firmas-mobile.png).
- [Cliente](cliente-mobile.png) / [vendedor afiliado](afiliado-mobile.png).
- [Recibo](recibo-sintetico.pdf).

## Publicación

Merge y deploy pendientes de revisión. No requiere configuración nueva, inicialización CH, migración, instalación de catálogo, cambios de Rules, IAM, Auth ni usuarios. No se ejecutaron cobros, emisiones o escrituras de negocio en producción. ARCA permanece fuera del alcance.
