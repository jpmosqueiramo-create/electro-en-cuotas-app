# Estabilización técnica V2

Baseline: `39ea80ab574612931983b996f68342e9a440b742`.
Esta intervención no habilita operatoria contractual, entrega ni cobranza productivas.
No cambia Rules, IAM, secretos, motores económicos ni registros productivos.

## Evidencia privada y transacciones

Se identificaron descargas dentro de `deliveryCommand` (cierre) y
`activationProof` (comandos financieros). Ahora se realizan tres pasos:

1. Transacción de autorización y lectura de metadatos privados.
2. Fuera de la transacción: obtener generación, descargar esa generación,
   comprobar SHA-256/tamaño y confirmar que no cambió mientras se verificaba.
3. Transacción final: repetir autorización, revisión esperada, vínculo de operación,
   documentos/firmas/originales y comparación exacta de metadatos contra el comprobante
   verificado. Un retry de Firestore reutiliza el comprobante; no descarga archivos.

Las generaciones verificadas se conservan en los eventos de comandos. Las nuevas
cargas registran generación, actor y fecha de confirmación. Lecturas privadas usan
esa generación y verifican contenido; los archivos antiguos se verifican sin
reescribirlos al consultar. Un objeto faltante, reemplazado, con hash incorrecto o
con error de descarga impide continuar. Un replay ya confirmado conserva su resultado.

Firestore y Storage no tienen una transacción distribuida: la prueba acredita una
generación concreta, no una promesa de disponibilidad futura. No se agregan escritores
que sobrescriban o eliminen evidencia. Un operador externo con privilegios de Storage
puede afectar disponibilidad; no convierte un archivo diferente en evidencia válida.
La documentación P4 conserva su protocolo de reservas/compensación existente; esta
intervención no invoca ni agrega eliminaciones de archivos.

## Historial financiero acotado

`FinancialState.accounting` es una proyección servidor aditiva y versionada:
`FINANCIAL_BALANCES_V1`, cantidad de pagos y saldo acreditado por cada cuota
(hasta 18 entradas). Se actualiza atómicamente junto con pago, recibo, comando y evento.
El cronograma y sus importes originales no cambian. FIFO sigue siendo el del ledger
existente, y una reversa descuenta exclusivamente sus imputaciones originales.

Las consultas devuelven hasta 50 pagos/recibos, ordenados por fecha de registro descendente e ID estable de desempate, con cursor
ligado a operación y revisión. Una modificación entre páginas obliga a actualizar; no se mezclan
revisiones. Cada recibo leído se compara con su pago. Administración obtiene el historial
privado de la página; cliente y vendedor afiliado reciben sólo su DTO autorizado.
La interfaz permite continuar sin consultar todo el historial para calcular saldos.

Compatibilidad: estados anteriores sin `accounting` se concilian en memoria con un
máximo de 500 pagos y sus recibos, sin escrituras por lectura. El siguiente comando
válido incorpora el acumulador junto con su propia modificación auditada. Si un estado
anterior supera 500 pagos, se bloquea explícitamente y requiere una conciliación
administrativa específica; no se trunca silenciosamente ni se migra en esta tarea.
Los nuevos comandos tienen costo de lectura independiente del número de pagos.

## Recuperación de fotografías

Entrega y custodia admiten `POST` JSON `{photoId}` sobre sus APIs privadas de fotos.
Se reutiliza la reserva, no se crean archivos ni identificadores nuevos al recuperarla. Un lease transaccional de 30 segundos serializa la creación del objeto por reenvíos simultáneos; un error libera el lease si todavía pertenece al mismo intento, y una interrupción permite recuperarlo al vencer. Las precondiciones de generación de Storage se mantienen como segunda protección. Se repiten
permisos y asociación operación/incidencia/documento. Si el objeto ya se transfirió,
se verifica y confirma `COMMITTED`; dos recuperaciones convergen y los replays no
cambian `updateTime`. Si falta o no coincide, sigue pendiente y se permite reenviar
el mismo archivo/ID. No hay limpieza automática ni borrados de evidencia/reservas.

La UI muestra cargas pendientes recuperables. Entrega conserva controles de estado,
versión preparada y participante; el afiliado sólo recupera sus reservas. Administración
puede regularizar una reserva autorizada sin suplantar al actor de la carga original.

## Esquemas aditivos y consumidores

| Campo | Tipo / consumidor / compatibilidad |
| --- | --- |
| `financial.accounting.schemaVersion` | Literal `FINANCIAL_BALANCES_V1`; servidor financiero. Ausente en estados anteriores. |
| `financial.accounting.paymentCount` | Entero no negativo: incluye pagos reversados, sin duplicar replays. |
| `financial.accounting.paidByInstallment` | Array de centavos enteros no negativos, ordenado como el cronograma congelado; hasta 18 posiciones. No cambia vencimientos/importes. |
| `photos.generation` | String de generación Storage validada al confirmar una reserva; lecturas/validaciones privadas. Opcional para fotografías anteriores, sin actualización por lectura. |
| `photos.committedAt`, `committedBy` | Fecha ISO y UID del actor que confirmó/recuperó; se conserva el actor original de carga. |
| `photos.uploadLeaseOwner`, `uploadLeaseUntil` | Identificador aleatorio del intento y vencimiento epoch en milisegundos; sólo servidor. No contiene IP, teléfono ni datos personales adicionales. Un replay confirmado no renueva el lease. |
| `events.evidenceGenerations` | Mapa path privado → generación verificada del comando; auditoría administrativa. No se devuelve al portal cliente/afiliado. |
| DTO `nextCursor` | String opaco de operación, revisión, fecha e ID de desempate; `null` al finalizar. Autorización se repite en cada página. |

No se cambian paths ni colecciones. No hay migración masiva, fusión de identidades,
TTL que borre registros ni duplicación de documentos. Los nuevos metadatos se incorporan
sólo por comandos/cargas explícitos. Los schemas y digests contractuales no cambian.

## Presentación

La evaluación prioriza estado, próxima acción y documentos pendientes. Una resolución
ya aprobada queda en una sección desplegable. Logística mantiene visible el próximo
paso y agrupa costos/fechas/responsables secundarios. Auditoría documental es secundaria.
Controles conservan etiquetas y altura mínima de 44 px; no se cambian colores ni layout
general. Se aplicó la revisión de componentes React y la verificación de flujo completo.

## Inventario jurídico pendiente — sin cambios de texto

Fuente exacta: `src/lib/contractDocuments/templates.ts`, `referenceCopy`, versión
`REFERENCE_FORMAT_REVIEW_V4`; renderer `src/lib/contractDocuments/pdf.ts`.
Toda la plantilla conserva `BORRADOR — NO VÁLIDO PARA FIRMA — PENDIENTE DE REVISIÓN LEGAL`.

| Documento/sección | Aprobación o validación pendiente |
| --- | --- |
| Mandato, encabezado | Identidad documental de LOOP GESTIÓN INTEGRAL S.R.L., CUIT, domicilio y representación; correspondencia del CUIL mostrado como no disponible con la proyección congelada. |
| PRIMERA | Objeto, mandato irrevocable y documentación de compra. |
| SEGUNDA | Texto que menciona logística, capital propio y financiación frente a la tabla aprobada de capital aplicado, servicios y total; no redistribuir importes ni inventar porcentajes. |
| Aclaración sobre facturación | Factura de terceros, bienes nuevos/usados y efectos de su ausencia. |
| TERCERA + garantía | Plan contractual congelado y relación entre obligación en cuotas y pagaré a la vista; alcance de garantía por suma total. |
| CUARTA | Mora automática, caducidad y punitorio del 0,5 % mensual del texto de referencia; no habilita recargos automáticos en el motor. |
| QUINTA | Conformidad por remito, persona autorizada y tratamiento de daños visibles; compatibilidad con las tres firmas exigidas. |
| SEXTA | Responsabilidad, garantías, soporte, traslados y bienes usados. |
| SÉPTIMA | Autonomía de las obligaciones, mandato con fondos propios y obligaciones irrevocables frente a contingencias del bien. |
| OCTAVA | Datos personales, consultas/reportes de antecedentes y consentimientos. |
| NOVENA | Cesión de derechos/créditos y pagaré a terceros. |
| DÉCIMA | Jurisdicción, competencia, domicilios y renuncias del texto de referencia. |
| Mandato, firmas | Lugar/fecha, facultades del representante y procedimiento de firma física y conservación de originales. |
| Pagaré, encabezado/promesa | Denominación “A LA VISTA Y SIN PROTESTO”, beneficiario/identidad de LOOP y promesa incondicional. |
| Pagaré, importe | Decisión comercial: exactamente `contractTotal`, números y letras, sin cuotas ni cronograma. El renderer vigente todavía muestra importe exigible pendiente y referencia técnica propuesta: adaptación pendiente dentro de actualización jurídica aprobada, no en esta estabilización. |
| Pagaré, causa/mora | `noteReason`, `noteArrears`, exigibilidad/presentación y punitorio; relación con pagos parciales y cancelación de obligaciones del mandato. |
| Pagaré, emisión/firmas | Lugar y fecha, firmas y demás parámetros legales pendientes. |
| Remito | No hay plantilla definitiva aprobada en este circuito: contenido, identificación del bien, recepción/rechazos, firma física, daños, custodia y conservación. El runner utiliza evidencia sintética explícita. |
| Conservación/control de entrega | Fotos no sustituyen originales; tres firmas del cliente, cadena de custodia y falta de firma de LOOP requieren validación profesional definitiva. |

La enumeración identifica decisiones pendientes; no constituye opinión ni aprobación
jurídica. No se modificó `templates.ts`, `pdf.ts`, el contrato ni el pagaré.

## Verificación

Ejecuciones del código de esta rama, proyecto `demo-cuenta-hogar`, Auth 9099,
Firestore 8080, Storage 9199 y Next localhost:3000. Configuración temporal fuera de
Git apunta a `storage.private.rules`; no se cambian las Rules versionadas.

| Comando / suite | Resultado y evidencia |
| --- | --- |
| `npx tsc --noEmit` | PASS, exit 0. |
| `npx eslint <archivos TS/TSX tocados y nuevos>` | PASS, cero errores/warnings. |
| `npm run test:safe` | PASS, incluyendo 11/11 guardas de producción. |
| `npm run build` | PASS, exit 0. Se ejecutó sin Next dev concurrente. |
| `npx tsx scripts/testV2ProductionStabilization.ts` en Emulator | PASS: dos comandos sin I/O Storage transaccional, archivos faltantes/reemplazados, cambio concurrente, error de descarga, 55 pagos, cursor cruzado/desactualizado, reversa, aborto después de intentar escribir, lectura anterior sin migración, recuperación concurrente, lease vencido, privilegios y no recreación de objetos confirmados. |
| `testOperationFinancialV2Emulator.ts` | PASS: FIFO, parciales/completos, recibos, reversas, saldos, mora sin recargos, concurrencia, permisos y cronograma original. |
| `testOperationDeliveryV2Emulator.ts` | PASS: tres firmas, originales, daños/custodia, privacidad SDK, atomicidad y cierre productivo bloqueado. |
| `testContractReadyEmulator.ts` | PASS: CAS, idempotencia/concurrencia; sin congelar ni numerar al marcar READY. |
| `testContractV2Emulator.ts` | PASS: formularios de ambos esquemas, aplicación explícita, permisos, compatibilidad, digests y fechas históricas. |
| `testOperationClientV2Emulator.ts` | PASS: invitaciones sintéticas, vencimiento/revocación, múltiples operaciones, aislamiento UID y bloqueo productivo. |
| `testOperationCustodyV2Emulator.ts` | PASS: asignación, transferencias, permisos y fotografías privadas. |
| `testOperationWorkspaceV2Emulator.ts` | PASS: apertura sin escrituras, origen/identidad, conformidad económica y permisos. |
| `testContractDocuments.ts` | PASS: formato, contenido, cronograma, privacidad y manifiesto. |
| `testContractFreezeIntegration.ts` | PASS: compatibilidad C1 y guardas productivas. |
| `testV2IntegralJourney.ts` | PASS: **17/17 etapas**, **83 respuestas HTTP verificadas**, cliente nuevo y recurrente, reutilización sin duplicar archivos, evaluación independiente, proveedor/logística, firmas y pagos simulados, integridad histórica. [Matriz completa](review/v2-production-stabilization/journey.json). |
| `testCreditReviewV2Browser.ts` | PASS desktop/mobile: formularios, documentos reutilizados y resolución manual. |
| `testOperationFulfillmentV2Browser.ts` | PASS desktop/mobile: fechas previstas/reales, costos y entrega bloqueada. |
| `testOperationCustodyV2Browser.ts` | PASS desktop/mobile: recuperación tras recargar y reenvío del archivo faltante conservando exactamente dos reservas; acceso cruzado denegado. |
| `testOperationFinancialV2Browser.ts` | PASS desktop/mobile: pago real sobre Emulator, permisos, 50 recibos iniciales y 51 tras solicitar la segunda página. |
| `git diff --check` | PASS. |

No se eliminaron assertions. Se corrigieron selectores de los casos nuevos para
apuntar al formulario fotográfico correcto y se mantuvieron los diagnósticos de
hash de las pruebas existentes. READY se ejecutó antes de fixtures que asignan números
sintéticos: exige colecciones vacías y no debe compartir ese estado previo.

### Evidencia visual y alcance de la simulación

[Capturas finales](review/v2-production-stabilization/): documentación y logística
1280×800 / 390×844, finanzas, reserva pendiente y recuperación. Sin overflow en las
comprobaciones de navegador. En la misma pantalla móvil de referencia, la altura total
pasó de 4242 a 3897 px en documentación y de 5585 a 1298 px en logística; costos y
fechas permanecen disponibles al desplegar su detalle.

Las muestras PDF del recorrido final permanecen fuera de Git en
`/tmp/cuenta-hogar-v2-integral/mandato-sintetico.pdf` y `pagare-sintetico.pdf`.
El recorrido conserva los puentes explícitos de fixture para aprobación sintética,
congelamiento y activación de cliente ya existentes: **no equivalen a aprobación jurídica
ni validan habilitación productiva**. `journey.json` los declara expresamente.

La instrumentación nueva vigila llamadas reales de Bucket durante callbacks de ambas
transacciones. Los errores de descarga/reemplazo concurrente también se inyectan con
un Bucket de prueba controlado; no se destruye evidencia para provocar el caso faltante.
Las pruebas del SDK esperan denegación incluso para el navegador administrativo.

Logs locales de verificación: `/tmp/ch-stabilization-integral-final.log`,
`/tmp/ch-stabilization-lease-final.log`, `/tmp/ch-stabilization-acceptance.log`
(resultados individuales READY/contrato/cliente/custodia/ficha/crédito/logística),
y `/tmp/ch-stabilization-{tsc,eslint,safe,documents,freeze,build}-final.log`.
Las ejecuciones iniciales fallidas por instrumentación/selectores/orden de fixtures
se conservaron para diagnóstico; los resultados PASS arriba corresponden a repeticiones
verificadas, sin debilitar controles.

Producción: cero escrituras y borrados de documentos/objetos, cero cambios de Rules,
IAM, secretos o configuración, sin merge/deploy. Los motores de pricing y ledger,
el snapshot contractual y las plantillas legales no tienen diff. El archivo local
`scripts/testBudgetV2HttpIdempotency.ts` se conserva sin versionar y no integra el PR.
