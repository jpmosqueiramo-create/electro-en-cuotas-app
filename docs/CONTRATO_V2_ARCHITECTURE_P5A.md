> Decisiones P5-C vigentes: prevalecen sobre las alternativas históricas de este diseño.
> CLIENT_DATA_LINK_EXPIRY_POLICY = 7_DAYS_REVOCABLE; un nuevo enlace revoca el ACTIVE previo.
> CLIENT_RESUBMISSION_POLICY = ONE_SUBMISSION_PER_LINK; corrección ADMIN_EDIT_OR_NEW_LINK.
> Sólo se permite variar plazo 1..18 con capital y factores del snapshot aceptado.
> Producto/capital/factor externo/override requieren NEW_PROPOSAL_REQUIRED, sin automatizarla.
> Total contractual = cuota NEXT_90_V1 × N; ajuste = total − total del helper;
> servicio = total − capital. El capital no absorbe redondeo. Conciliación RESUELTA.
> Formulario: /completar-datos/{requestId}#{secret}; secreto sólo en header API,
> nunca pathname/query. Día mensual obligatorio al enviar. Prefill sólo snapshots V2.
> P5-C mantiene únicamente DRAFT; no formaliza, no congela snapshot final ni genera PDFs.

# Contrato V2 — P5-A: auditoría y arquitectura contractual

Base auditada: `e34d948456ca2d0c177333e835886bc5a6934be1`.
Rama documental: `docs/contrato-v2-p5a-architecture`.

Estado: diseño, sin implementación. Actualizado por las decisiones P5-B.
Las decisiones resueltas en P5-B sustituyen las alternativas abiertas originales;
la auditoría del código legacy permanece como evidencia histórica. Las estructuras, comandos, colecciones y
validaciones objetivo de este documento no existen todavía por esta propuesta.
No se modifican templates legales, Pagaré, Remito, reglas, datos ni motores.
Las observaciones legales identifican preguntas para revisión; no constituyen
una validación jurídica de los textos actuales ni de nuevas condiciones.

## 1. Fuentes y límites

Fuentes: AGENTS.md, CODEX_RUNTIME.md, arquitectura P1, configurador P2,
editor P3, aceptación/documentación P4 y STORAGE_SECURITY_BASELINE.md.
Código auditado: `budgetReferenceV2.ts`, `budgetV2.ts`,
`budgetAcceptanceV2.ts`, `budgetAcceptanceV2Server.ts`, BudgetV2Workspace,
BudgetAcceptanceDocumentation y el flujo contractual de Validaciones.
Se incluyen sus consumidores en `pdfGenerator.ts`, el enlace legacy de
`firmar-contrato/[id]/FirmarContratoClient.tsx`, Remitos y los defaults de
`financialEngine.ts`. La auditoría es estática; no acredita datos productivos.

Para las referencias siguientes:

- V: `src/app/admin/validaciones/page.tsx`.
- P: `src/lib/pdfGenerator.ts`.
- F: `src/app/firmar-contrato/[id]/FirmarContratoClient.tsx`.

## 2. Auditoría del circuito actual

### 2.1 Origen y persistencia

V:926, `handleAceptarPresupuesto`, pertenece al flujo legacy: excluye BUDGET_V2,
selecciona ítems por índices, suma importes y toma el plazo del primer ítem.
Actualiza la solicitud con ítems y condiciones; no produce un contrato inmutable.

V:1131, `handleOpenContratoEditor`, reconstruye `contratoAEditar` desde la
solicitud mutable y, para contacto rápido, el primer presupuesto legacy aceptado.
Consume `itemsContrato`, `planElegido`, `montoCuota` y datos personales con
precedencias distintas según el campo. Los campos contractuales no proceden de
Acceptance V2. El objeto abierto fija `isApertura: true` y genera un número
abreviado desde el ID; no garantiza conservar el número contractual guardado.

V:1065, `handleGuardarEdicionContrato`, determina la colección mediante
`aperturas.some(id)`, no mediante el par explícito colección/ID. Guarda campos
mutables en solicitudes o solicitudes_cuenta y replica a documentos relacionados
con escrituras separadas; algunas réplicas sólo registran errores. No hay snapshot
versionado, CAS ni transacción conjunta de contrato y réplicas.

V:1303, confirmar/enviar WhatsApp, tiene otro payload. Exige nombre, DNI,
WhatsApp y número; puede crear una solicitud con ID aleatorio, copia datos
parciales y envía un enlace de autorización digital. No conserva todos los campos
que guarda la edición: por ejemplo, ítems, número y total no tienen el mismo
tratamiento. Guardar edición, confirmar y descargar PDF no son una única operación
atómica ni garantizan usar la misma revisión persistida.

V:1408 y V:1505 contienen migración/aprobación legacy que también generan
solicitudes y cronogramas. El loader de aperturas tiene efectos de escritura.
Ninguno debe reutilizarse como lector o comando del nuevo circuito.

### 2.2 Capital, catálogo vivo y defaults

En la apertura se calcula primero total = plazo × cuota, aunque exista otro total
guardado. La búsqueda de capital aplicado sigue esta secuencia:

1. `costoProveedor`, `costoProducto`, `costoBien`, positivos e inferiores al total.
2. Producto vivo por nombre exacto o inclusión en ambos sentidos; toma
   costoProducto, costoProveedor o precioContado si satisface sus condiciones.
3. precioContado de la solicitud, sujeto al límite total / 1.1.
4. Si falta o supera el umbral: redondear total / factor predeterminado.
5. Si la relación total/capital queda fuera de 1.1..10: volver a derivar ambos.
6. Si hay ítems con capital positivo: sumar sus capitales. Se calcula también
   una suma de totales de ítems que no reemplaza el total global del editor.

V:1022 carga productos privados completos. V:1131 y V:4656 buscan productos
por nombre; cambiar plazo consulta factores de la solicitud, producto vivo o
FACTORES_PREDETERMINADOS. Esto hace depender la reconstrucción de datos actuales,
no del acuerdo histórico. La coincidencia parcial no es identidad de referencia.

| Dato/default actual | Uso y riesgo | Tratamiento objetivo |
| --- | --- | --- |
| planElegido ausente → 12 | Apertura, normalización, guardado y generación | Exigir selección contractual explícita |
| TNA ausente o cero → 60 | Apertura y persistencia; `||` borra un cero explícito | Rol y valor pendientes de aprobación |
| Mora ausente o cero → 0.5 | Apertura, persistencia y PDFs | Rol, unidad y valor pendientes |
| Factor predeterminado; 2.5 / 3.25 | Reconstruye capital, total y cuota | No heredar ni recalcular silenciosamente |
| Importe inválido → 0 | Parseo del editor y PDF | Error de validación, no importe contractual |
| CFT EA → 75 | Estado del editor; no alimenta el detalle económico del PDF | No trasladar sin decisión |
| Cantidad → 1; estado → Nuevo | Normalización de bienes | Confirmar cantidad/condición, sin inventarlas |
| Localidad CABA / provincia Buenos Aires | Fallbacks PDF | Ausencia visible, sin ubicación ficticia |
| CUIL → DNI | Contrato PDF y descarga digital | Nunca convertir DNI en CUIL |
| Email ficticio al confirmar | Payload legacy | Ausente explícito; no fabricar contacto |
| Lugar/fecha → fecha actual | Editor, PDF y auxiliares | Fechas con significado y fuente explícitos |
| Número desde DNI/ID/fecha actual | P:2 y editor | Identidad estable y numeración aprobada |

### 2.3 Edición y cronograma actual

V:4497 muestra el editor. Capital, factor, total, cuota y plazo se recalculan
mutuamente; los cambios reemplazan importes de las filas. El selector ofrece
1..12, 18 y 24, no todos los plazos 1..18. La apertura normaliza ítems con
fallbacks de plazo, cuota y cantidad.

Si existe planPagos, se filtran cuotas con numero > 0 y se normalizan fechas;
la observación se recupera de notaAcumulacion o texto genérico, no necesariamente
de observacion ya guardada. Si falta, se parte de `new Date()` y se aplica
setMonth con incremento mensual. Cambiar plazo vuelve a generar desde el día
actual. Esto expone desplazamientos de fin de mes y diferencias entre fecha
local y fecha ISO; no hay política contractual explícita de calendario.

Las filas editan número, vencimiento, monto y observación; la vista no garantiza
reconciliar suma de filas y total. Confirmar convierte a montoOriginal,
vencimiento ISO, montoPagado cero y estado PENDIENTE; pierde las observaciones.
V:1907, al registrar entrega, puede reconstruir planPagos desde la fecha de
entrega y registrar una primera cuota pagada. Puede reemplazar el cronograma
anterior: esta conducta no es admisible para un snapshot contractual V2.

FIRST_DUE_DATE_POLICY_CURRENT = un mes desde la apertura/cambio de plazo si no
hay cronograma; otro cálculo desde entrega; PDF resume además “Del 1 al 10”.
FIRST_DUE_DATE_POLICY_TARGET = EXPLICIT_FIRST_INSTALLMENT_DATE (RESUELTA).

### 2.4 Contrato, Pagaré y otros generadores

P:60 define DatosContrato: nombre, DNI, CUIL opcional, domicilio, localidad,
código postal, provincia, email, teléfono; bien, cantidad, condición, serie,
ítems; capital, total, factor, anticipo, plazo, cuota, primer vencimiento,
TNA, mora, CFT EA, lugar/fecha, jurisdicción, garante y cuotasPlan.
No incluye fecha de nacimiento. Estos tipos no prueban obligatoriedad legal.

P:160, generarContratoModelo, usa el objeto editable. Para varios ítems suma
sus totales y capitales con fallbacks, independientemente del total global.
Descompone la diferencia total-capital en 60% servicio/logística y 40% financiero.
El editor también presenta una división 60/40 y cálculos con IVA. No existe un
snapshot contractual común que certifique esa composición.

El template contiene “Valor Neto del Bien”, “Costo Financiero Total (CFT)” y
“VALOR TOTAL A FINANCIAR”, así como “gestión y financiación” y referencias a
capital propio. Debe revisarse su coherencia con gestión de compra/mandato y
capital aplicado vs servicio. P5-A no cambia esas frases ni define fiscalidad.

El contrato imprime anticipo si existe, primera cuota y un resumen de cuotas
2..n; no reproduce íntegramente el cronograma editable ni todas sus excepciones.
TNA compensatoria y CFT EA declarados en la interfaz no determinan allí el
cálculo impreso. La mora sí se imprime con fallback 0.5% mensual.

P:701, generarPagareModelo, toma totalFinanciado global parseado, no la suma de
ítems usada por el contrato. Aunque ambos reciban contratoAEditar, pueden
mostrar importes diferentes. El texto dice “A LA VISTA Y SIN PROTESTO”; consume
nombre, DNI, CUIL si está, domicilio/contacto, lugar/fecha, mora y garante
opcional. No toma un cronograma económico inmutable compartido. P:597 convierte
el total a letras; es un formateador, no una fuente económica autorizada.

P:904, P:1006 y P:1907 generan remitos simples, múltiples y Tipo R. Consumen
identidad, bien, serie, cantidad, origen/destino y referencia de contrato.
Tipo R tiene fallbacks empresariales, de domicilio y código de producto derivado
del DNI; no deben convertirse en identidad V2. V:1649 persiste remitos con
número contractual inferido. Remitos no deben recibir tasas ni plan financiero.
Los comprobantes P:1358 y estados de cuenta P:1723 son consumidores posteriores
de pagos; no son el origen del nuevo contrato ni se migran en P5-A.

F carga solicitudes y luego solicitudes_cuenta con el mismo ID, compara DNI en
cliente y registra autorización digital con flags, fecha, IP y user-agent.
Su descarga reconstruye datos: puede tomar capital como total, usa plazo 12
por defecto, tasas textuales cero y cronograma vacío. No consume Acceptance V2.
Las afirmaciones legales de su UI son texto existente, no conclusiones de esta
auditoría. Ese evento digital no acredita firma física del mandato y pagaré.

## 3. Fuente objetivo e invariantes

Budget V2 EMITIDO → Acceptance V2 → DOCUMENTACION → confección de contrato →
snapshot contractual definitivo. El nuevo circuito es separado del legacy.

TARGET_CONTRACT_SOURCE = BudgetAcceptanceV2.optionSnapshot + condiciones
contractuales confirmadas explícitamente en la etapa CONTRATO.

No se reconstruye desde productos, catalogo_publico, nombre, motores legacy ni
FACTORES_PREDETERMINADOS. El recálculo contractual autorizado usa exactamente
calcularPlanReferenciaCatalogo de C1/P2 con costoProveedorSnapshot y
factoresSnapshot de la referencia aceptada, sin catálogo vivo. El referenceId identifica procedencia; no autoriza
refrescar descripción, precio, factores, imagen o planes del snapshot.

BUDGET_MUTATED_BY_CONTRACT = NO.
ACCEPTANCE_MUTATED_BY_CONTRACT = NO.
DOCUMENTATION_CASE_MUTATED_BY_CONTRACT = NO.
PREFERRED_PLAN_IS_CONTRACTUAL = NO.
FINAL_PLAN_DEFINED_AT_CONTRACT_STAGE = YES.
SILENT_CONTRACT_DEFAULTS_TARGET = 0.

Acceptance conserva una opción completa y todos sus planes ofrecidos. Su
preferredPlanCuotas/Amount es referencia opcional: “Preferencia informada: 12
cuotas”. Abrir el confeccionador no selecciona ni confirma automáticamente ese
plan. Acceptance no incluye datos personales del cliente: el clienteSnapshot
pertenece al Budget exacto de esa versión y contiene nombre, DNI, CUIL,
WhatsApp y localidad. No debe atribuirse a Acceptance información inexistente.

La documentación P4 mantiene cuatro tipos con required=false. Su ausencia no
impide abrir borrador. Mostrar disponibilidad mediante lectura autorizada,
sin copiar archivos, paths, tokens, URLs permanentes u observaciones privadas
al snapshot contractual ni a PDFs. No se cambia el caso P4 para marcar contrato.

## 4. Modelo propuesto: origen, edición y pendientes

### ContractOriginV2: contexto de sólo lectura

Resuelto y validado por servidor: budgetId, budgetVersion, sourceCollection,
solicitudId, aceptación exacta, acceptedOptionId, acceptedAt/By, nombre y
descripción del bien, referenceId opcional, todos los planes ofrecidos y
preferencia opcional. Contiene huellas y versión de schema de la evidencia.
La fuente del bien es exactamente optionSnapshot.referenceSnapshot.

Conservar evidencia privada del origen sin trasladar costos, proveedor, factores,
margen o SKU/EAN internos a un DTO cliente. Imagen es apoyo visual, no condición
contractual por defecto. SKU/EAN sólo para una función administrativa justificada.

### ContractDraftV2: edición y envelope persistido

Payload editable conceptual, no implementación:

- customer: datos personales confirmados con fuente y correcciones auditables.
- goodConfirmation: cantidad, condición y número de serie cuando corresponda;
  no permite reemplazar silenciosamente la identidad del bien aceptado.
- economicTerms: contractPlanCuotas, contractInstallmentAmount, contractTotal,
  capital aplicado a compra, valor del servicio y ajustes explícitos permitidos
  por ANY_PLAN_1_TO_18 y CURRENT_CONTRACT_BASELINE aprobados en P5-B.
- contractSchedule: propuesta editable de ContractPaymentScheduleV2.
- datesAndPlace: lugar confirmado y primer vencimiento explícito bajo política
  aprobada. contractPreparedAt/contractDate son fechas de sistema, no editables
  por cliente; nunca firma física presumida.
- confirmation: explicación de diferencias, evidencia de confirmación requerida
  y decisiones de negocio/legal aplicables.

P5-B denomina ContractDraftV2 al agregado persistido: incluye IDs, origen,
revisión, permisos, autor, estados y huellas en un envelope server-side. Sólo
su payload de edición es modificable por Admin; estos metadatos no son editables. Datos pendientes viven en una lista
`pendingFields` con motivo y resolución requerida, no en defaults contractuales.
El borrador puede empezar con origen válido aunque falten personales/economía.

### Matriz de datos personales y laborales — decisiones P5-B resueltas

Todos los campos pueden faltar al crear BORRADOR. El servidor no inventa valores.
Los seis datos personales son obligatorios para formalizar por decisión de
negocio expresa; no se presenta esta decisión como una obligación legal inferida.

| FIELD | SOURCE de prellenado | EDITABLE | REQUIRED_TO_CREATE_DRAFT | REQUIRED_TO_FORMALIZE | OPTIONAL | LEGAL_REVIEW | FALLBACK_ALLOWED |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fullName | Budget exacto: nombre; luego revisión Admin | Sí | No | Sí | No al formalizar | Validación de template pendiente | No |
| dni | Budget exacto: dni | Sí, con auditoría | No | Sí | No al formalizar | Validación de template pendiente | No |
| address | Solicitud exacta si existe, confirmable | Sí | No | Sí | No al formalizar | Validación de template pendiente | No |
| locality | Budget exacto: localidad | Sí | No | Sí | No al formalizar | Validación de template pendiente | No CABA |
| email | Solicitud exacta si existe, confirmable | Sí | No | Sí | No al formalizar | Validación de template pendiente | No email ficticio |
| whatsapp | Budget exacto: whatsapp | Sí | No | Sí | No al formalizar | Validación de template pendiente | No |
| cuil | Budget exacto si existe; módulo laboral | Sí | No | No | Sí | Uso documental a revisar | No DNI como CUIL |
| employerOrWorkName | Admin o submission revisada | Sí | No | No | Sí | Uso documental a revisar | No |
| workAddress | Admin o submission revisada | Sí | No | No | Sí | Uso documental a revisar | No |

CUIL_MODULE = EMPLOYMENT_DATA. EMPLOYMENT_DATA_REQUIRED = NO.
Fecha de nacimiento, código postal, provincia, garante y jurisdicción permanecen
hallazgos del audit previo cuando corresponden, no se añaden como campos nuevos
obligatorios ni como campos del formulario P5-B. Su tratamiento documental futuro
requiere revisión legal sin defaults ficticios ni ampliación silenciosa de PII.
La fuente mutable sólo prellena, no reemplaza evidencia histórica. Una submission
pública nunca se aplica sin revisión administrativa.

### Matriz restante para confección y formalización

| FIELD | SOURCE | EDITABLE | D | F | OPTIONAL | LEGAL_REVIEW | FALLBACK_ALLOWED |
| --- | --- | --- | --- | --- | --- | --- | --- |
| budgetId/version/aceptación/opción | Acceptance validada + Budget EMITIDO exacto | No | Sí | Sí | No | No | No |
| sourceCollection/solicitudId | Origen validado por servidor | No | Sí | Sí | No | No | No búsqueda por DNI/ID solo |
| Nombre/descripción/referenceId del bien | optionSnapshot.referenceSnapshot | No como origen | Sí para nombre/descripción; ID sólo si existe | Sí origen | referenceId puede faltar en manual | Cambio de bien: sí | No catálogo vivo |
| Imagen | Snapshot aceptado, sólo contexto | No refrescar origen | No | No | Sí | Si se quiere contractual | No imagen sustituta |
| SKU/EAN | Evidencia privada si existe | Sólo administración justificada | No | No por defecto | Sí | Uso documental a validar | No código desde DNI |
| Cantidad/condición/serie | Confirmación explícita del mismo bien | Sí según política | No | Política por aprobar | Serie condicional | Sí | No 1/Nuevo por omisión |
| Oferta completa/preferencia | Acceptance exacta | No | Oferta sí; preferencia no | Oferta sí | Preferencia sí | No | No preferencia inventada |
| Plan final | Selección contractual explícita | Sí | No | Sí bajo política aprobada | No | Política/diferencias | No 12 |
| Cuota/total/capital/servicio | Configuración contractual aprobada y confirmada | Sí antes de freeze | No | Sí según composición aprobada | No importes críticos implícitos | Sí | No factor/costo inferido |
| Anticipo, si se admite | Confirmación y política de imputación | Sí si habilitado | No | Condicional | Política pendiente | Sí | No cero que implique cobro |
| Cronograma completo | Propuesta validada y confirmada | Sí antes de freeze | No | Sí | No | Calendario a aprobar | No regeneración silenciosa |
| TNA/mora/CFT | Baseline transitorio actual, con revisión legal pendiente | Según política explícita | No | No resolver con defaults; rol a revisar | Por decidir | Sí | No valores silenciosos |
| Lugar/fechas/número visible | Servidor + configuración confirmada | Lugar según permisos; fechas de sistema no editables por cliente | No; ID técnico servidor | Sí según política | Por decidir | Sí | No fecha de firma actual |
| Revisión/autor/timestamps/hash | Servidor | No | Sí envelope | Sí | No | Retención a validar | No cliente confiado |
| Documentación disponible | Caso P4 autorizado | No desde contrato | No | No bloqueo automático | Sí, required=false | No nueva obligación | No copiar archivos |
| Confirmación de diferencias | Evidencia separada y política | Sí antes de freeze | No | Si política lo exige | Condicional | Sí | No aceptación presumida |

## 5. Política de plan y economía: decisiones abiertas

CONTRACT_PLAN_POLICY = ANY_PLAN_1_TO_18 — RESUELTA por P5-B.
CONTRACT_PLAN_RECALCULATED_AUTOMATICALLY = YES.
CONTRACT_FACTOR_SOURCE = ACCEPTED_BUDGET_REFERENCE_SNAPSHOT.
LIVE_CATALOG_RECALCULATION = NO.

El plazo definitivo puede no pertenecer a los ofrecidos. Tomar N entero 1..18,
costoProveedorSnapshot y factoresSnapshot[N] del snapshot aceptado, y ejecutar
exactamente calcularPlanReferenciaCatalogo en src/lib/catalogReference.ts,
el mismo helper que usa buildBudgetReferenceSnapshotV2. No existe un calculador
contractual paralelo ni fallback a factores vigentes/defaults. Si falta factor,
fallar cerrado y requerir revisión administrativa; no completar el snapshot.
PlanesActivosSnapshot documenta la oferta, no restringe la política contractual
1..18 aprobada. La preferencia no confirma selección ni condiciones.

CONTRACT_ECONOMIC_STRUCTURE = CURRENT_CONTRACT_BASELINE — RESUELTA.
Capital aplicado y servicio Cuenta Hogar se discriminan. Los detalles económicos
actuales que correspondan son baseline transitorio, no nueva fiscalidad.
LEGAL_TEMPLATE_REVIEW_REQUIRED = YES. No se reescriben cláusulas ni conceptos
legales. La autorización del baseline no significa permitir defaults silenciosos.
Ver P5-B para mapeo del helper, cuota redondeada, totales y conciliación pendiente
que el helper de referencia por sí solo no resuelve como cronograma contractual.

TNA_CONTRACT_ROLE = BUSINESS_DECISION_REQUIRED + LEGAL_VALIDATION_REQUIRED.
MORA_CONTRACT_ROLE = BUSINESS_DECISION_REQUIRED + LEGAL_VALIDATION_REQUIRED.
La TNA guardada/visible no es una justificación del texto ni cálculo actual.
Hay etiquetas legacy de mora diaria y PDFs con tasa mensual: debe definirse
unidad, base, período y eventual capitalización; no convertir ni conservar 0.5
por inercia. CFT monetario del template y CFT EA 75 del editor son conceptos
separados, también pendientes de validación. No se eliminan ni aprueban aquí.

## 6. ContractPaymentScheduleV2

Modelo propuesto: versión de schema, moneda ARS, política de calendario/version,
zona horaria explícita y filas `{numero, vencimiento, montoOriginal, observacion}`.
Importes expresados mediante Money con entero de unidades menores y escala
explícita; fechas de vencimiento de calendario YYYY-MM-DD, no medianoche UTC
inferida. La adopción técnica no cambia importes históricos.

Validar numeración única y consecutiva, cantidad acorde al plan, fechas válidas
y ordenadas, importes válidos y suma reconciliada contra total y anticipo según
política aprobada. No presuponer cuotas todas iguales: si se permite diferencia
por residuo, debe quedar explícita por fila y en la representación de cuota.
Aplicar la política aprobada detallada a continuación para primera fecha, día
mensual y fin de mes; no introducir tolerancias o reglas de cobro implícitas.

El cronograma confirmado se congela al formalizar. Cobros, mora calculada,
montos pagados y estados de cobranza pertenecen a registros posteriores
separados; nunca alteran montoOriginal ni vencimiento contractual histórico.
La entrega no genera ni reemplaza cronograma. Reprogramación requiere otro
instrumento/versionado explícito, fuera de P5-A.


### Política de vencimientos aprobada — actualización P5-B

FIRST_DUE_DATE_POLICY = EXPLICIT_FIRST_INSTALLMENT_DATE.
RECURRING_DUE_DAY_SOURCE = preferredMonthlyDueDay revisado y aprobado por Administración.
RECURRING_DUE_DAY_APPLIES_FROM_INSTALLMENT = 2.
MONTH_WITHOUT_SELECTED_DAY = LAST_CALENDAR_DAY_OF_MONTH.

ContractDraftV2 incorpora firstInstallmentDueDate (fecha calendario YYYY-MM-DD)
y preferredMonthlyDueDay (entero 1..31). Ambos pueden faltar durante DRAFT;
ambos deben existir y ser válidos antes de READY_TO_FORMALIZE, incluso para
un contrato de una cuota, donde el día recurrente no genera filas adicionales.
La primera fecha se define explícitamente al confeccionar el contrato por Admin;
no se deriva de acceptedAt, contractPreparedAt, fecha actual, fecha de entrega
ni new Date()+1 mes. El cliente no informa una fecha completa.

Cuota 1 vence exactamente en firstInstallmentDueDate. Para cada cuota i de 2..N,
calcular independientemente el año/mes calendario situado i−1 meses después del
mes de la primera cuota, y usar el menor entre preferredMonthlyDueDay y el último
día de ese mes. No sumar meses a la fecha anterior ni usar
previousDate.setMonth(previousDate.getMonth()+1). No arrastrar febrero al mes
siguiente ni perder el día preferido en meses posteriores. Son días calendario,
sin traslado automático por fines de semana o feriados.

Ejemplo contractual obligatorio: 8 cuotas, primera fecha 2026-12-15, día 30.

| Cuota | Vencimiento |
| --- | --- |
| 1 | 15/12/2026 |
| 2 | 30/01/2027 |
| 3 | 28/02/2027 |
| 4 | 30/03/2027 |
| 5 | 30/04/2027 |
| 6 | 30/05/2027 |
| 7 | 30/06/2027 |
| 8 | 30/07/2027 |

Día 31 en abril usa 30/04; día 31 en febrero bisiesto usa 29/02.
ContractSnapshotV2 congela firstInstallmentDueDate, preferredMonthlyDueDay y
paymentSchedule (el ContractPaymentScheduleV2 completo, denominado también
contractSchedule en P5-A). Es una única evidencia de cronograma, no dos listas
independientes. PAYMENT_SCHEDULE_IMMUTABLE_AFTER_FORMALIZATION = YES.
No regenerar por fecha actual, entrega o nueva preferencia después del freeze.

CLIENT_CAN_PROPOSE_DUE_DAY = YES.
CLIENT_DUE_DAY_AUTO_APPLIES_TO_CONTRACT = NO.
ADMIN_REVIEW_REQUIRED = YES.
El formulario WhatsApp incorpora “¿Qué día del mes te resulta más cómodo para
el vencimiento de tus cuotas?”, selector 1..31, sin pedir fecha completa.
La propuesta preferredMonthlyDueDay pertenece a ClientDataSubmissionV2 junto a
personalData y employmentData, no es una condición económica modificable por
el cliente. Puede omitirse en el envío; Admin puede completar el día en Draft.
Si se informa, validar entero 1..31; no asumir un día ante ausencia o error.

Revisión Admin muestra día actual del Draft, día solicitado por cliente y día
aprobado. APLICAR CAMPO/APLICAR TODO incluye esta preferencia con confirmación
explícita; antes/después, clientSubmissionId, appliedAt/By y revisión CAS quedan
auditados. Una recepción no modifica Draft ni cronograma automáticamente.
Aplicación en Draft exige recalcular y revisar la propuesta de cronograma con
la primera fecha explícita, sin alterar ninguna submission original. El snapshot
final conserva el día aprobado y las filas finales; submission y eventos conservan
el día originalmente solicitado aunque sea distinto del aprobado.

## 7. Diferencias y nueva confirmación

Conservar separadamente budgetOfferSnapshot completo de la opción, preferredPlan
y contractPlan definitivo. Comparación server-side incluye plazo, cuota, total,
capital/servicio aplicables, bien y calendario; guardar diferencias y motivo,
política vigente, autor y evidencia de confirmación. Ausencia de total comparable
en oferta es “no comparable”, no igualdad inventada ni total inferido escondido.

Recomendaciones de revisión, no reglas legales implementadas:

| CHANGE | REACCEPTANCE_RECOMMENDED | LEGAL_REVIEW_REQUIRED |
| --- | --- | --- |
| Plan distinto de preferencia pero ofrecido | Confirmar elección contractual; decidir si necesita nueva aceptación formal | Sí, alcance de estimación/confirmación |
| Plan no ofrecido | Selección permitida por ANY_PLAN_1_TO_18; reconfirmación adicional BUSINESS_DECISION_REQUIRED | Sí |
| Cuota diferente | Sí, mostrar antes/después y motivo | Sí |
| Total/composición diferente | Sí, mostrar diferencias comparables y nuevos conceptos | Sí |
| Bien diferente | Nuevo presupuesto/opción y aceptación como recomendación; no sustituir el origen | Sí |
| Corrección personal | Confirmación y auditoría; cambios de identidad requieren revisión específica | Sí según alcance |
| Serie asignada al mismo bien | Confirmar identidad logística sin cambiar oferta; política específica | Sí si altera identificación contractual |

Una confirmación nueva es evidencia vinculada al contrato: no sobrescribe
Acceptance. Si requiere otro presupuesto, emitir y aceptar otra versión mediante
sus comandos propios, nunca editar el presupuesto EMITIDO.

## 8. ContractSnapshotV2, ciclo de vida y documentos

Snapshot privado inmutable propuesto:

- schemaVersion, contractId opaco, contractVersion y número visible aprobado.
- budgetId, budgetVersion, acceptedOptionId, referencia exacta de aceptación,
  sourceCollection/solicitudId, evidencia de oferta/preferencia y sus huellas.
- customerSnapshot confirmado, goodSnapshot y condiciones/serie pertinentes.
- economicSnapshot con contractPlanCuotas, contractInstallmentAmount,
  contractTotal, capital aplicado, servicio y conceptos aprobados explícitos.
- ContractPaymentScheduleV2 íntegro, política/versiones económicas y calendario.
- diferencias, confirmaciones requeridas, decisiones vigentes, fecha/lugar,
  createdAt/By, finalizedAt/By, revisión congelada, versión anterior y hash.

Las fechas de confección, formalización, emisión documental y firma física son
eventos diferentes. Una fecha de firma desconocida permanece ausente.

BORRADOR: editable con CAS. LISTO_PARA_FORMALIZAR: validaciones aprobadas y
revisión identificada; cualquier edición invalida esa preparación. FORMALIZADO:
freeze atómico, sin edición in-place. No significa físicamente firmado.
Corrección posterior exige nueva versión o rectificación explícita, con motivo,
relación al original y confirmaciones según revisión legal; nunca reemplazarlo.

CONTRACT_AND_PROMISSORY_NOTE_SHARE_SNAPSHOT = YES, objetivo diseñado.
Contrato y Pagaré leen el mismo economicSnapshot y mismo hash/version, mediante
DTO allowlist cliente. No suman ítems, derivan capital, aplican factores o generan
cronograma cada uno por separado. El importe en letras se formatea desde el
mismo total validado, con pruebas de coincidencia numérica/textual futuras.
El contrato debe poder representar todo el cronograma confirmado; la semántica
y redacción del Pagaré, incluyendo su relación con vencimientos, requiere revisión
legal posterior. No se modifica ahora ningún generador ni texto congelado.

Artefactos futuros: tipo, templateVersion aprobado, contractVersion, snapshotHash,
contentHash, estado de generación y referencia privada. Una falla al generar no
convierte otro PDF/revisión en documento válido ni permite mutar el snapshot.
Ningún DTO de cliente recibe proveedor, factores, margen, tasas internas,
observaciones administrativas o evidencia documental privada por propagación.

Remito futuro: contractId/version y número público, operación, cliente y bien,
cantidad y serie si corresponden. Entrega/destinatario y sus eventos propios.
Sin TNA, mora, servicio ni plan financiero. No se genera remito ni entrega aquí.

## 9. Firma física y evidencia

PHYSICAL_SIGNATURE_MODEL_DEFINED = YES, sólo arquitectura.
Al formalizar: CONTRACT_CREATED y PHYSICAL_SIGNATURE_PENDING. El mandato y el
pagaré se firman físicamente en papel al recibir el producto. Modelar por
separado estado y fecha de firma de cada documento; PHYSICALLY_SIGNED conjunto
sólo cuando estén acreditados ambos. No inferir firma por entrega, descarga,
WhatsApp, aceptación de presupuesto o presencia de una imagen.

La futura constatación administrativa debe vincular contractVersion/hash,
fecha física conocida, registrador, fecha de registro y custodia de originales.
Eventos anexos auditables, sin alterar snapshot. Fotos posteriores son evidencia
de control, nunca sustituyen originales físicos. Política de custodia, acceso y
retención queda pendiente. No se implementa captura ni entrega ni firma en P5-A.
acceptedAt nunca se copia como contractSignedAt. El enlace digital legacy sigue
siendo un evento distinto y no activa PHYSICALLY_SIGNED de V2.

## 10. API, persistencia y concurrencia propuestas

Comandos futuros Admin server-side: crear/editar borrador, marcar listo y
formalizar. Cada uno usa verifyAdminAuth, runtime allowlist, commandId,
expectedRevision y CAS transaccional. Rechazar campos desconocidos, datos de
origen enviados por cliente y transiciones no permitidas. Validar origen desde
servidor y pertenencia de la opción a la aceptación emitida exacta.

En una transacción de formalización: leer revisión/origen/guardas, validar
políticas y confirmaciones, congelar snapshot, registrar resultado idempotente
y reservar identidad contractual. Mismo commandId y mismo payload devuelve el
mismo resultado; commandId reutilizado con otro payload se rechaza. Una revisión
obsoleta produce conflicto explícito, nunca sobreescritura silenciosa.

P4 garantiza aceptación por presupuesto/versión, no exclusividad contractual
global por operación. Diseñar una guarda contractual por aceptación exacta para
impedir dobles contratos activos por reintentos; exclusividad entre distintas
aceptaciones de una misma operación requiere política adicional aprobada.
No se altera aceptación P4 para añadir esa guarda.

Ubicación recomendada para evaluar en implementación:
`presupuestos_v2/{budgetId}/contracts/{contractId}` con metadata privada,
borrador separado, `versions/{contractVersion}` y comandos. Pros: vínculo explícito
con familia y control de acceso alineado; contras: búsquedas globales requieren
índices/consulta de grupo y presupuesto/version deben validarse igualmente.
Una colección raíz contracts_v2 facilita búsquedas globales pero exige mantener
vínculos y unicidad explícitos; no elimina CAS. La preferencia es el árbol de
presupuesto, sin crear documentos o reglas en esta fase.

Controlar tamaño serializado antes de persistir: las imágenes de opciones pueden
ser grandes; evitar duplicar Data URLs y snapshots completos en un único documento.
Evidencia histórica privada separada e inmutable con hashes y referencias
versionadas si hace falta, sin reemplazarla por catálogo vivo. Diseñar límites
y pruebas de bytes en implementación, no truncar evidencia silenciosamente.

Firestore y Storage no comparten transacción. Generación documental futura fuera
de transacción, artefactos privados idempotentes con estado y hash verificables;
fallos deben ser recuperables sin duplicar contratos ni anunciar documentos
inexistentes. Adoptar acceso Admin mediado y guardas Emulator para tests; nunca
URLs permanentes ni acceso directo de navegador a documentos privados.
No diseñar cobros, escrituras de producción ni mutar Storage en P5-A.

## 11. UI y compatibilidad

Flujo futuro: aceptación → Documentación → Confeccionar contrato.
La pantalla se actualiza según P5-B: A operación aceptada; B personales;
C laborales opcionales; D condiciones económicas; E plan de pagos; F cláusulas
baseline; G revisión. Los documentos futuros consumen la versión formalizada. Preferencia rotulada como referencia,
Guardar borrador separado de formalizar, y firma física como estado independiente.
No se agrega ahora ningún botón ni se reemplaza handleOpenContratoEditor.

Históricos permanecen en Validaciones. No recalcular, migrar ni reinterpretar
contratos legacy, cambiar sus flags de firma o regenerar sus PDFs con V2.
Nuevas rutas/DTOs/schema deben discriminar V2 explícitamente; no fallback automático
a legacy por falta de un snapshot. Falta de origen válido bloquea la transición
con error visible, sin crear una solicitud alternativa.

## 12. Registro de decisiones actualizado por P5-B

Resueltas: plan ANY_PLAN_1_TO_18; mismo calculador C1/P2 y NEXT_90_V1;
factores/costo del snapshot aceptado; estructura económica CURRENT_CONTRACT_BASELINE;
seis personales obligatorios al formalizar; tres laborales opcionales, incluido
CUIL; contractPreparedAt/contractDate generados por sistema, nunca por cliente
ni copiados de acceptedAt. ContractPreparedAt registra confección y contractDate
la fecha de formalización; ambos se conservan sin presumir firma física.

Registro de decisiones restantes y actualización de vencimientos:

1. FIRST_DUE_DATE_POLICY = EXPLICIT_FIRST_INSTALLMENT_DATE — RESUELTA; día
   recurrente aprobado 1..31 desde cuota 2, clamp al último día del mes.
   Esta decisión ya no está pendiente.
2. Cambio de plazo conservando snapshot: NO_NEW_PROPOSAL_REQUIRED, RESUELTO.
   Cambio de bien/capital/factor externo/override: NEW_PROPOSAL_REQUIRED.
3. TNA_CONTRACT_ROLE y MORA_CONTRACT_ROLE: unidad, base y uso jurídico; no adoptar
   ni eliminar tasas silenciosamente. Revisión legal de CFT y templates.
4. Conciliación RESUELTA: total = cuota NEXT_90_V1 × N; ajuste incluido en servicio.
   Anticipo y detalles legales futuros fuera de P5-C.
5. Numeración, exclusividad entre aceptaciones y rectificación contractual.
6. Custodia y constatación de originales físicos y retención.
7. CLIENT_DATA_LINK_EXPIRY_POLICY = 7_DAYS_REVOCABLE y
   CLIENT_RESUBMISSION_POLICY = ONE_SUBMISSION_PER_LINK, ambas RESUELTAS.

## 13. Verificación de esta fase y futuras pruebas

P5-A requiere revisión documental y git diff --check, sin build/browser ni tests
con escrituras. Este archivo no acredita suites de una implementación inexistente.

En implementación posterior: tests de origen sin catálogo vivo, ausencia de
defaults, oferta/preferencia/final separados, inmutabilidad de ancestros,
idempotencia/CAS y concurrencia, cronograma reconciliado, PDF/Pagaré del mismo
hash, DTO sin datos sensibles, firma física independiente y fallos distribuidos
de artefactos. Tests Firebase exclusivamente con Emulator explícito y proyecto
demo; no ejecutar los loaders legacy mutantes como lectores V2.

CONTRACT_DRAFT_V2_DEFINED = YES (diseño).
CONTRACT_SNAPSHOT_V2_DEFINED = YES (diseño).
PAYMENT_SCHEDULE_V2_DEFINED = YES (diseño).
BUSINESS_DECISIONS_REQUIRED = YES.
CODE_CHANGED = NO. RULES_CHANGED = NO.
PRODUCTION_DATABASE_MUTATIONS = 0. PRODUCTION_STORAGE_MUTATIONS = 0.

## Actualización operativa P5-C — decisiones finales

Estas reglas reemplazan recomendaciones previas de emisión, expiración, recepción
y conciliación. ONLY_ONE_ACTIVE_CLIENT_DATA_LINK = YES. Expiración exacta de
7 × 24 horas servidor. Crear enlace revoca atómicamente cualquier ACTIVE anterior.
Una submission por request, inmutable; retry exacto idempotente, payload diferente
rechazado. Corrección por Admin o nuevo enlace. No hay edición de evidencia.
No persistir raw token ni URL WhatsApp. RequestId opaco en path, secreto en
fragmento leído por cliente, removido de la barra y enviado sólo en header.
No se necesita intercambiarlo por sesión ni se transporta token en HTTP path.

El prefill sólo usa Budget/Acceptance congelados. No leer solicitudes mutables.
El formulario requiere preferredMonthlyDueDay entero 1..31. La recepción no muta
Draft; aplicación Admin explícita con CAS y evidencia antes/después.

Economía resuelta: capitalAmount = costoProveedorSnapshot; factorSnapshot =
factoresSnapshot[N]; calcularPlanReferenciaCatalogo produce factorComputedTotal
(valorTotalReferencia) y contractInstallmentAmount (cuotaExhibidaCatalogo).
contractTotal = contractInstallmentAmount × N; roundingAdjustment = contractTotal
− factorComputedTotal; serviceAmount = contractTotal − capitalAmount. No se duplica
la matemática del helper. Cronograma con N importes iguales suma exactamente total.
Cambiar sólo N dentro de 1..18 no exige nuevo presupuesto si mantiene snapshot;
producto/capital/factor externo/override se rechazan con NEW_PROPOSAL_REQUIRED.
La aceptación contractual final queda para firma física futura. Estas decisiones
ya no son BUSINESS_DECISION_REQUIRED. Primer vencimiento explícito permanece vigente.
