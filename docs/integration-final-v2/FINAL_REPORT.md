# Integración final V2 — resultado y habilitación pendiente

Actualización vigente contra main con #74 e IVA contenido: [Preparación segura de #75, #76 y #77](SAFE_INTEGRATION.md). El resto de este informe conserva la evidencia de la validación anterior.

Base auditada: `b95395fbe678de2033f46d078449e2eae7448808` (PR #73 mergeado). Cuatro PRs pequeños: #74 revocación de cliente; #75 aprobación jurídica; #76 modelo fiscal/mock y recorrido integral; #77 resumen financiero y actualización de portales. #77 tiene como base #76 para mantener su diff pequeño; después de integrar #76 debe cambiarse a main. Ninguno fue mergeado ni desplegado.

Integración local validada: `a3f34c384fee86c63fa154ab7b35ebde8d222959` (rama local, sin push). Incluye #74 `f7d1c2427b2405a0e1f3cb4cb38817d344dd57a5`, #75 `46d28ef47e3ebbdaa33ded859126993891539913`, #76 `e20692975b12f79c0fa6047f86081cc024a07a00` y código #77 `d0198c171b81a7b6fa3b86c29afc113c2563b35c`. El commit posterior de #77 incorpora sólo este informe y evidencias.

## Declaraciones del titular

Se conserva «la última» como declaración de aprobación, sin atribuir evidencia profesional a un texto concreto. Faltan fecha, profesional, referencia y vinculación verificable al artefacto exacto. Los textos actuales contienen pendientes y permanecen borradores. El registro no habilita emisión.

LOOP fue declarada responsable inscripta. No se verificó su constancia con credenciales fiscales y no se inventaron tasas ni tratamiento del capital, gestión o logística. La factura simulada con 21 % pertenece sólo al caso sintético.

## Matriz de validación

| Circuito / control | Resultado | Alcance |
|---|---|---|
| Solicitud → presupuesto → Acceptance → operación | PASS | HTTP local; una identidad y vínculos explícitos |
| Datos personales, documentación, revisión y cliente recurrente | PASS | Reutilización sin duplicación; vigencia manual e identidad explícita |
| Economía, conformidad, READY y snapshot | PASS | Doce cuotas; controles de identidad y cambios materiales |
| Mandato y pagaré | PASS | Texto seleccionable, importes y fechas persistidos exactos; borradores |
| Proveedor, custodia, tres firmas y entrega | PASS | Sólo Emulator; falta de cada firma bloquea entrega y finanzas |
| Pagos parciales, cancelación, reversas y recibos | PASS | FIFO original, una cuenta por operación y cronograma intacto |
| Comisiones y reasignación | PASS | Beneficiario vigente, dos porcentajes, 0 %, recuperación de reversas y no duplicación |
| Revocación de cliente ACTIVE | PASS | Auditada, concurrente e idempotente; otra operación legítima permanece visible |
| Registro jurídico | PASS | Versión/hash exactos, declaración separada, evidencia privada opcional, permisos |
| Modelo fiscal A/B/C y notas | PASS | Sólo mocks: política explícita, tasas/vigencias, notas asociadas e invoice inmutable |
| Tres roles, acceso cruzado y desactivación | PASS | Autorización servidor por UID y asignación/vínculo vigente |
| Reconexión y orden de respuestas | PASS | Evento online simulado; respuesta antigua no restaura saldo anterior |
| Desktop/mobile y paginación | PASS | 1280/390 px; 51 recibos paginados; sin desbordamiento horizontal |
| TypeScript, ESLint diferencial, build y test:safe | PASS | Sin diagnósticos nuevos en los archivos modificados |
| Habilitación jurídica, fiscal o financiera real | PENDIENTE | No forma parte de los PASS de Emulator |

Recorrido integrado: 22 etapas. Suite adicional: 21 controles contractuales/de entrega/financieros. Además se ejecutaron suites de cliente, aprobación legal, fiscal, financiero, afiliados, regresiones PDF y navegador. Estos conteos representan etapas y controles nombrados, no un conteo artificial de cada assertion.

## Concordancia económica sintética

- Capital: $580.000.
- Servicios: $1.160.000.
- Total único: $1.740.000.
- Cronograma: 12 × $145.000; primera fecha 15/12/2026, luego día 30 con ajuste de febrero a 28/02/2027; última 30/11/2027.
- Pagaré: $1.740.000; no genera otra deuda ni muestra cuotas.
- Mock fiscal de servicios: base $958.677,69 + IVA de prueba $201.322,31 = $1.160.000. No agrega IVA al contrato ni determina el tratamiento fiscal real.
- Primera acreditación parcial: $72.500; saldo $1.667.500. Una reversa deja el saldo correspondiente al ledger, sin modificar la factura simulada.

El mandato actual tiene tres páginas y el pagaré una. Se revisaron todas: logo en mandato, ninguno en pagaré, advertencias de borrador, sin cortes o superposiciones. El remito de la suite es una evidencia técnica sintética con logo, no un diseño legal definitivo aprobado. Los PDF de referencia históricos se conservan separados.

## Límites e incidencias detectadas

- La fixture aislada financiera no reproduce un origen documental completo: al abrir la ficha registra `DOCUMENT_ORIGIN_INCONSISTENT/SOURCE_MISMATCH` en la vista documental. Es un rechazo esperado del origen sintético de esa fixture, no se relajó la validación. El recorrido integral completo genera ambos PDF correctamente.
- Se corrigió una expresión inválida del nuevo runner de navegador, una advertencia nueva de hooks y la compatibilidad de evaluación jurídica con los metadatos del registro; se repitieron las pruebas sin retirar assertions.
- La ficha contractual todavía es extensa: se midieron 42 campos/39 botones y unos 5.709 px de alto en mobile; el caso recurrente llega a 6.986 px. No hay desbordamiento, pero conviene reducir progresivamente la información visible y mantener el siguiente paso destacado. No se rediseñó la operación en esta tarea.
- La actualización es por foco/reconexión y polling visible de 30 segundos, no push. El refresco vuelve a la primera página para no mezclar revisiones. El costo crece con las operaciones visibles; evaluar consultas agregadas antes de escalar.
- La aprobación jurídica usa el hash del texto normativo versionado y emisor; no equivale al hash binario del PDF individual ni acredita por sí sola firma profesional. Antes del emisor real hay que cerrar todos los textos y datos formales y fijar el artefacto exacto aprobado.
- No hay adaptador ARCA productivo ni homologación efectuada, autorización CAE, numeración fiscal real o representación fiscal completa. Las variantes de comprobantes y demás tributos requieren definición contable y homologación.

## Habilitación gradual y recuperación

1. Revisar y mergear manualmente los PRs, respetando la dependencia #77 → #76.
2. Preflight del nuevo SHA integrado: configuración y guardas, Rules intactas, pruebas, build y aprobación de un rollout exacto. No se realizó este rollout.
3. Publicación inicial sólo de consultas/registro administrativo autorizado; mantener emisión, entrega definitiva, invitaciones y cobranza productivas bloqueadas.
4. Vincular aprobación profesional a textos definitivos y completar representación, jurisdicción, lugar/fecha y custodia documental. La declaración del titular no sustituye esos campos.
5. Confirmar políticas fiscales con contador y ejecutar homologación aislada; nunca reutilizar la política sintética como configuración real.
6. Autorizar por separado activación contractual, entrega y financiera; verificar concurrencia y permisos del SHA habilitado antes de un piloto real.
7. Recuperación de una publicación futura: conservar build anterior y retirar tráfico al nuevo sólo con autorización; no borrar registros, no reescribir snapshots ni restaurar permisos inseguros. Revocar un vínculo de cliente no borra su historia; una rehabilitación requiere procedimiento explícito futuro.

Producción: cero escrituras, cero cambios de Rules/IAM/secretos/configuración y cero despliegues. Script local `testBudgetV2HttpIdempotency.ts` intacto y excluido de Git. No se usaron clientes reales ni credenciales productivas.
