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

# Contrato V2 — P5-B: confeccionador y datos del cliente

Base: `e34d948456ca2d0c177333e835886bc5a6934be1`.
Rama: `docs/contrato-v2-p5a-architecture`. Complementa y actualiza P5-A.
Estado: arquitectura exclusivamente. No se han creado modelos TypeScript, rutas,
colecciones, reglas, PDFs, enlaces reales ni mutaciones. Las rutas y contratos de
API siguientes son propuestas para una fase posterior, no endpoints existentes.

## 1. Decisiones cerradas y límites

CONTRACT_PLAN_POLICY = ANY_PLAN_1_TO_18.
CONTRACT_PLAN_RECALCULATED_AUTOMATICALLY = YES.
CONTRACT_FACTOR_SOURCE = ACCEPTED_BUDGET_REFERENCE_SNAPSHOT.
LIVE_CATALOG_RECALCULATION = NO.
CONTRACT_ECONOMIC_STRUCTURE = CURRENT_CONTRACT_BASELINE.
CAPITAL_AND_SERVICE_SEPARATE = YES.
LEGAL_TEMPLATE_REVIEW_REQUIRED = YES.

La aceptación elige una referencia, no un plan contractual. No se modifican
Budget EMITIDO, Acceptance, Documentation Case ni snapshots históricos. El
confeccionador no consulta productos/catalogo_publico por nombre o ID para
reconstruir condiciones. No se altera C1/P2, motor canónico ni factores legacy.
La firma física de mandato y pagaré al recibir el bien sigue el diseño P5-A:
formalizar no equivale a firmar, acceptedAt nunca es contractSignedAt.

## 2. Pantalla CONFECCIONAR CONTRATO

| Sección | Contenido y acciones |
| --- | --- |
| A. Operación aceptada | Sólo lectura: budgetId/version, acceptedOptionId, nombre, descripción, referenceId si existe, fecha aceptación, todos los planes ofrecidos y preferencia si existe |
| B. Datos personales | Seis campos editables; pendientes visibles; SOLICITAR DATOS AL CLIENTE; comparación de datos recibidos |
| C. Datos laborales | “Datos laborales — opcionales”; tres campos, sin bloqueo por ausencia |
| D. Condiciones económicas | Selector 1..18, cálculo compartido con snapshot, capital y servicio separados; diferencias frente a oferta |
| E. Plan de pagos | Cronograma propuesto completo, primer vencimiento y validaciones, sin fechas implícitas |
| F. Cláusulas | Referencia a CURRENT_CONTRACT_BASELINE, sin edición pública ni reescritura del texto legal; revisión legal pendiente señalada a Admin |
| G. Revisión | Datos faltantes, diferencias, revisión y preparación para formalizar; luego documentos de snapshot, no PDF desde estado suelto |

Copy de preferencia exacto: “Plan preferido informado por el cliente”. Nunca
“plan contractual” para preferredPlan. Si hay varios planes ofrecidos, no inventar
un único “plan presupuestado”. Mostrar lista completa y preferencia por separado.
Guardar borrador no formaliza ni acepta automáticamente cambios económicos.
No se implementa esta pantalla ni se agrega botón al workspace existente.

## 3. Modelos de datos personales y laborales

`ContractPersonalDataV2`: fullName, dni, address, locality, email, whatsapp.
El diseño admite ausencia mientras DRAFT; P5-C representa ausencia con string
vacío, sin inferir datos ni convertirlos a valores inventados. Todos requeridos antes de FORMALIZED.

`ContractEmploymentDataV2`: cuil, employerOrWorkName, workAddress. Todos
opcionales en creación y formalización. CUIL pertenece exclusivamente a este
módulo; no se fabrica desde DNI. No añadir fecha de nacimiento, código postal,
provincia, recibos u otros campos al formulario por similitud con legacy.

| FIELD | REQUIRED_TO_CREATE_DRAFT | REQUIRED_TO_FORMALIZE | Edición |
| --- | --- | --- | --- |
| fullName | NO | YES | Admin; cliente propone por submission |
| dni | NO | YES | Admin; cliente propone por submission |
| address | NO | YES | Admin; cliente propone por submission |
| locality | NO | YES | Admin; cliente propone por submission |
| email | NO | YES | Admin; cliente propone por submission |
| whatsapp | NO | YES | Admin; cliente propone por submission |
| cuil | NO | NO | Admin; cliente propone por submission |
| employerOrWorkName | NO | NO | Admin; cliente propone por submission |
| workAddress | NO | NO | Admin; cliente propone por submission |

Completitud es una regla de negocio aprobada, no una conclusión jurídica.
Validación técnica propuesta: Unicode normalizado NFC, trim exterior, sin HTML ni
caracteres de control; no eliminar espacios interiores significativos. Límites:
P5-C usa máximo 300 caracteres por string, excepto email 254;
email 254; DNI 7–8 dígitos como string, sin conversión a número; CUIL opcional
11 dígitos con o sin guiones, sin normalización destructiva; WhatsApp normalizado internacional con 8–15 dígitos,
solicitando país explícito sin presumirlo. Email validado sintácticamente sin
claim de titularidad. Restricciones identificatorias deben revisarse antes de
implementar para admitir excepciones reales sin truncar ni inventar datos.
Una entrada opcional presente pero inválida pide corrección o eliminación; una
ausencia laboral nunca bloquea formalización. El formulario exige los seis
personales para enviar y acepta los tres laborales vacíos.

Prellenado Admin: Budget exacto para nombre/DNI/WhatsApp/localidad/CUIL si existe;
solicitud identificada por colección+ID sólo para campos adicionales confirmables.
Guardar procedencia por campo. No sobrescribir datos confirmados al volver a
abrir. La página pública se muestra vacía y no expone PII previa del Draft.

## 4. ContractDraftV2: agregado privado

P5-B amplía el nombre del modelo para incluir envelope y contenido editable:

| Campo | Fuente/control |
| --- | --- |
| schemaVersion = CONTRACT_DRAFT_V2, contractDraftId | Servidor, ID opaco |
| budgetId, budgetVersion, acceptedOptionId | Acceptance exacta validada, sólo lectura |
| revision, status | CAS servidor; DRAFT, READY_TO_FORMALIZE, FORMALIZED |
| acceptedReferenceSnapshot | Copia/evidencia privada inmutable de optionSnapshot.referenceSnapshot; hash y versión |
| personalData, employmentData | Edición Admin validada y auditada |
| economicTerms | Resultado validado servidor del cálculo compartido y baseline explícito |
| firstInstallmentDueDate, preferredMonthlyDueDay | Admin, fecha explícita y día 1..31; requeridos antes de READY_TO_FORMALIZE |
| paymentScheduleDraft | Propuesta revisable, nunca regenerada tras freeze |
| clientDataRequestId, lastClientSubmissionId | Opcionales, referencias servidor, no fuente contractual automática |
| createdAt, createdBy, updatedAt, updatedBy | Servidor; timestamps Firestore preservados |
| contractPreparedAt, contractDate | Sistema, nunca cliente ni acceptedAt |

`contractPreparedAt` se fija al crear confección; `contractDate` se fija al
formalizar con zona horaria configurada y timestamp UTC de auditoría separado.
Mientras no se formaliza, contractDate es null, sin fecha de firma supuesta.
El payload editable no acepta IDs, snapshot origen, autor, revisión resultante,
estados, fechas de sistema o enlaces. No guardar token raw dentro del agregado.
Snapshot grande: conservar evidencia inmutable separada y hash si excede límites;
no duplicar imágenes Data URL ni truncar origen para caber en un documento.

## 5. Motor y condiciones económicas

Fuente real auditada:

- `src/lib/catalogReference.ts`: `calcularPlanReferenciaCatalogo` y
  `redondearCuotaCatalogo` (NEXT_90_V1).
- `src/lib/budgetReferenceV2.ts`: `buildBudgetReferenceSnapshotV2` llama ese helper.
- `src/lib/referenceConfigurator.ts`: reducer/validación compartidos C1/P2;
  el reset de factores del configurador no es una acción contractual autorizada.

El nombre conceptual factorPorCuotas corresponde realmente a **factoresSnapshot**;
el costo es **costoProveedorSnapshot**. No leer defaults del generador de planes
publicables: su fallback de factores no sirve para este contrato.

Al elegir N entero 1..18, el servidor toma exclusivamente:
`Acceptance.optionSnapshot.referenceSnapshot.costoProveedorSnapshot` y
`Acceptance.optionSnapshot.referenceSnapshot.factoresSnapshot[N]`.
Valida factor/costo finitos positivos y llama al mismo calcularPlanReferenciaCatalogo.
No se exige que planesActivosSnapshot[N] fuera true: la política permite planes
no ofrecidos, siempre que el factor congelado exista y sea válido. La validación
P2 de planes activos no garantiza por sí sola factor válido para todo N.
Si falta o es inválido: FAIL CLOSED, error administrativo visible, sin cálculo,
sin defaults 2.5/3.25, sin consulta viva y sin reparar el snapshot silenciosamente.

`ContractEconomicTermsV2` debe guardar capitalAmount, serviceAmount,
contractPlanCuotas, factorSnapshot, contractTotal, contractInstallmentAmount,
roundingStrategy, resultado íntegro del helper, identidad de algoritmo/release,
hash del origen y confirmaciones de composición. Valores sólo servidor desde
inputs permitidos, no resultados numéricos arbitrarios enviados por navegador.

El helper calcula valorTotalReferencia = round(costo × factor), cuotaBaseReferencia
= total/N y cuotaExhibidaCatalogo = NEXT_90_V1(base). Preserva miles exactos;
en otro caso sube a terminación 90 sin bajar. Se reutiliza exactamente, sin copiar
su fórmula a un calculador contractual. ContractInstallmentAmount utiliza la cuota
exhibida del helper para mantener la regla aprobada.

**Antecedente de conciliación (RESUELTO por P5-C, regla al inicio):**
valorTotalReferencia puede diferir de N × cuotaExhibidaCatalogo. Por ejemplo,
costo 580000, N=8, factor 2.31 produce total referencia 1339800, base 167475 y
cuota exhibida 167490; ocho cuotas suman 1339920. No anunciar ambos como el mismo
total. Conservar ambos valores y delta 120; la duda histórica era si el total contractual
es suma de cuotas iguales o si se permite una última cuota ajustada. La regla P5-C asigna el redondeo al servicio sin alterar capital. P5-C resuelve con cuotas iguales y total = cuota × N; no implementa formalización. Esto no bloquea
el diseño ni el recálculo de referencia con el helper existente.

CURRENT_CONTRACT_BASELINE conserva inicialmente capital separado del servicio
Cuenta Hogar y demás conceptos pertinentes. Auditoría P5-A identifica precioContado,
totalFinanciado, diferencia total-capital, división 60/40, IVA mostrado, anticipo,
TNA, mora y CFT EA; no todos son resultados del helper C1. Guardar los conceptos
aplicables con fuente/versionado, sin tratarlos como nuevos defaults autorizados.
La base de capital se identifica explícitamente con el costo congelado usado para
calcular; su representación contractual y servicio no exponen proveedor/factor
al público ni redefinen fiscalidad. La diferencia total-capital y el split actual
son baseline a mapear, no una autorización a recalcular impuestos o inventar
componentes adicionales. Una tasa ausente no se convierte en 60/0.5/75.

LEGAL_TEMPLATE_REVIEW_REQUIRED = YES; TNA/mora y discrepancia diaria/mensual
siguen pendientes de revisión. Cláusulas CURRENT_CONTRACT_BASELINE sólo como
baseline transitorio; no se modifica PDF, Pagaré o sus textos en P5-B.

### Ejemplo obligatorio: 12 → 8

Oferta aceptada: 12 cuotas × $X; preferencia informada: 12, si existe.
Admin selecciona 8. Mostrar plan contractual 8, factor snapshot de 8 (por ejemplo
2.31), cuota recalculada $Y del helper y total $Z con conciliación identificada.
Si catálogo actual tiene 2.40, se ignora. CONTRACT_DIFF_FROM_BUDGET = YES.
Mantener oferta original, preferencia y resultado contractual separados; no
modificar Acceptance. Nunca deducir que existía preferencia si estaba ausente.
MATERIAL_ECONOMIC_CHANGE_RECONFIRMATION = NO_NEW_PROPOSAL_FOR_SNAPSHOT_PLAN_CHANGE.
Permitir seleccionar otro plan no resuelve si necesita confirmación formal extra.

## 6. Cronograma, preparación y snapshot final

PaymentSchedule Draft parte de contractPlanCuotas, contractInstallmentAmount y
firstInstallmentDueDate explícito y preferredMonthlyDueDay aprobado. Mantiene modelo P5-A: número, fecha calendario, importe
original y observación por fila, validación de suma, fechas y cantidad. No usar
new Date()+1 mes como regla final. FIRST_DUE_DATE_POLICY = EXPLICIT_FIRST_INSTALLMENT_DATE.
Sin ambas entradas de calendario válidas y conciliación aplicable, puede existir borrador,
pero no afirmar que está listo. Primer pago, anticipo y excepciones requieren
reglas explícitas, sin cuotas ocultas ni regeneración al entregar.

DRAFT → READY_TO_FORMALIZE requiere seis personales completos, economics completos,
firstInstallmentDueDate y preferredMonthlyDueDay válidos,
cronograma válido, revisión vigente y políticas aplicables resueltas. Datos laborales,
submission del cliente y documentación P4 no son requisitos. No confundir esos
mínimos con aprobación de cuestiones comerciales todavía abiertas.

Sólo Draft revisado → ContractSnapshotV2 formalizado. Guardar IDs y hashes de
submission/aplicaciones que contribuyeron a campos finales, sin copiar todo el
formulario o evidencia descartada a PDFs. Contrato y Pagaré comparten el mismo
snapshot económico; firma física permanece independiente y pendiente. Employment
puede conservarse privadamente; no se incorpora automáticamente a textos legales.


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
el cliente. Es obligatoria al enviar; en Draft puede faltar hasta completarse.
Si se informa, validar entero 1..31; no asumir un día ante ausencia o error.

Revisión Admin muestra día actual del Draft, día solicitado por cliente y día
aprobado. APLICAR CAMPO/APLICAR TODO incluye esta preferencia con confirmación
explícita; antes/después, clientSubmissionId, appliedAt/By y revisión CAS quedan
auditados. Una recepción no modifica Draft ni cronograma automáticamente.
Aplicación en Draft exige recalcular y revisar la propuesta de cronograma con
la primera fecha explícita, sin alterar ninguna submission original. El snapshot
final conserva el día aprobado y las filas finales; submission y eventos conservan
el día originalmente solicitado aunque sea distinto del aprobado.

## 7. Solicitud y enlace WhatsApp

En datos, SOLICITAR DATOS AL CLIENTE crea una solicitud vinculada al Draft editable.
Luego ofrecer ABRIR WHATSAPP y COPIAR LINK. Abrir WhatsApp no acredita entrega,
lectura, identidad ni submission. Si falta WhatsApp, se puede copiar el enlace.

Mensaje sugerido exacto:
“Hola, necesitamos completar algunos datos para preparar la documentación de tu
operación con Cuenta Hogar. Podés cargarlos desde este enlace: {LINK}”.
No incluir DNI, CUIL, costos, factores, capital, servicio, cuotas o documentos.
Usar https://wa.me/ con teléfono validado y texto codificado, generado en memoria.
No persistir URL completa, mensaje con enlace ni teléfono duplicado en request.

`ContractClientDataRequestV2` privado: schemaVersion, requestId opaco,
contractDraftId, budgetId, budgetVersion, tokenHash, status, createdAt/By,
submittedAt, revokedAt, expiresAt. Campos de fechas no aplicables null.
Nunca token raw. expiresAt = createdAt + 7 × 24 horas exactas servidor.
CLIENT_DATA_LINK_EXPIRY_POLICY = 7_DAYS_REVOCABLE, RESUELTA.

Token técnico propuesto: 32 bytes CSPRNG (256 bits), base64url, SHA-256 de bytes
canónicos como índice hash servidor, comparación segura. No derivado de DNI,
budgetId, teléfono, reloj ni ID secuencial. Sólo se devuelve una vez al Admin
creador autenticado y nunca se vuelve a recuperar. Si se pierde, revocar y crear
otro, sin tocar evidencia anterior. No guardar en localStorage, historial de
aplicación ni logs. El token raw sólo existe transitoriamente en el enlace
necesario y memoria de emisión/uso, no en base de datos ni auditoría.

## 8. Persistencia privada y comandos propuestos

Bajo la familia P5-A de contrato, P5-C usa `requests/{requestId}`,
`submissions/{requestId}` y `events/{commandId}` para aplicaciones.
Lookup global sólo servidor `contractClientDataRequests/{requestId}` apunta a
budget/version; tokenHash permanece en el request privado, no en el índice. Esto permite resolver token sin query
por teléfono/DNI/budget y sin lecturas cliente Firestore. Son colecciones propuestas;
su acceso se auditará en implementación. No se crean ni se modifican Rules ahora.

Comandos Admin futuros autenticados con verifyAdminAuth y allowlist:
crear solicitud, revocar, aplicar todos los campos y editar manualmente.
Formalización y aplicación campo por campo quedan fuera de P5-C.
Todos con commandId y expectedRevision; results idempotentes y CAS transaccional.
Crear request+índice+registro de comando atómico, sin mutar Acceptance ni P4.
No permitir request de un contrato formalizado o de otra aceptación por IDs
manipulados. Repetir comando de emisión no recupera token almacenado: devolver
estado ya creado sin enlace; revocar y reemitir para obtener otro enlace. Ante
respuesta perdida, usar requestId conocido para cancelar antes de repetir emisión.

Crear otra solicitud revoca atómicamente el ACTIVE anterior; la UI informa
esta regla. ONLY_ONE_ACTIVE_CLIENT_DATA_LINK = YES.
La aplicación de una submission siempre vuelve a comprobar que Draft es editable.
Formalización invalida capacidad de envíos nuevos de todos sus requests, aunque
sus registros todavía indiquen ACTIVE; la comprobación de estado Draft es
obligatoria y el cierre de solicitudes debe quedar auditable.

## 9. Estados y envío público

ACTIVE: puede resolver formulario y aceptar envío si no venció y Draft editable.
SUBMITTED: conserva envío, no permite editarlo. REVOKED: revocación Admin,
no admite nuevos envíos. EXPIRED: vencido, no admite envíos. Vencimiento se
comprueba en servidor en cada GET/POST, sin depender de un job o TTL que elimine
pronto; TTL no es autorización. Revocar después de enviar inhabilita el enlace
sin borrar submission y registra evento, preservando submittedAt e historia.

CLIENT_RESUBMISSION_POLICY = ONE_SUBMISSION_PER_LINK.
Corrección = ADMIN_EDIT_OR_NEW_LINK. Una submission por request; reintento
idéntico normalizado idempotente. Payload diferente tras SUBMITTED se rechaza;
la evidencia histórica nunca se edita. Política RESUELTA por P5-C.

`ClientDataSubmissionV2`: schemaVersion, submissionId, requestId, contractDraftId,
submittedAt servidor, personalData, employmentData y preferredMonthlyDueDay
obligatorio (entero 1..31). Inmutable. No economics,
cláusulas ni storage. Vinculación budget/version resuelta por request servidor,
no aceptada del cliente. Auditoría de envío sin campos raw.

Ruta futura de entrada `/completar-datos/{requestId}#{secret}`. Sólo formulario mobile-first:
Cuenta Hogar; “Completá tus datos para preparar la documentación de tu operación.”;
DATOS PERSONALES (seis campos); DATOS LABORALES — OPCIONALES (tres campos);
selector preferredMonthlyDueDay 1..31 con la pregunta de vencimiento aprobada;
ENVIAR DATOS. Labels visibles, controles >=44px, errores por campo accesibles,
resumen accesible, sin analytics ni información económica. No autocompletar datos
privados del Draft desde el enlace.

Flujo público P5-C: página recibe sólo requestId opaco; JS lee secreto del
fragmento, lo conserva en memoria y borra hash de barra. API valida header
X-Client-Data-Token, no sesión ni query/path raw token. No intercambio de cookies.
GET no consume envío: previews WhatsApp no invalidan enlaces.

POST server-mediated acepta únicamente personalData, employmentData y
preferredMonthlyDueDay obligatorio, con claves
anidadas exactas. RequestId y digest normalizado permiten un envío único y retry
idéntico, sin contractId confiado del navegador. Transacción comprueba token,
expiración, revocación, Draft editable y política de envío; crea submission y
transición de request conjuntamente. Carrera revocar vs enviar serializada:
si revocación gana, no se acepta; si envío gana, evidencia queda y posterior
revocación no la borra. Reintento idéntico devuelve sólo confirmación genérica;
mismo request y distinto cuerpo se rechaza sin sobrescribir evidencia.

Respuesta correcta: “Gracias. Recibimos tus datos.” Sin contractId interno,
budgetId, paths, economics ni eco del formulario. Errores token inválido,
revocado, vencido o Draft cerrado genéricos: no confirmar existencia de otro
contrato. Errores de formato de campos sólo tras validar acceso al formulario.

## 10. Revisión y aplicación administrativa

CLIENT_SUBMISSION_AUTO_APPLIES_TO_CONTRACT = NO.
Recepción puede crear evidencia/estado del request pero no cambia revision,
personalData, employmentData, preferredMonthlyDueDay, cronograma ni
lastClientSubmissionId del Draft automáticamente.
Listar submissions por vínculo servidor; el puntero de última aplicación sólo
cambia mediante comando Admin. En la UI “DATOS RECIBIDOS DEL CLIENTE”, por campo:
valor actual Draft, valor informado, diferencia y procedencia. No dejar campos
preseleccionados que sobrescriban datos confirmados por omisión.

APLICAR CAMPO aplica una selección; APLICAR TODO muestra confirmación de todos
los cambios, incluidos vacíos. Vacío no elimina automáticamente valor actual;
requiere acción clara de limpiar campo. EDITAR permite corrección manual con
fuente Admin; DESCARTAR CAMBIO registra decisión sin borrar evidencia. Laborales
vacíos no generan errores de obligatoriedad. Una submission puede revisarse
parcialmente y conservar pendientes de revisión sin bloquear por su sola existencia.

Aplicación atómica: validar expectedRevision y campos allowlist, leer submission
original, capturar valores anteriores, copiar seleccionados y crear evento privado
append-only con clientSubmissionId, campos, antes/después, appliedAt, appliedBy,
baseRevision, resultingRevision, commandId y origen. Nunca aceptar del navegador
valores “enviados por cliente” sin cotejar con submission. Ediciones manuales
posteriores generan otro evento; no alteran submission ni aplicaciones anteriores.
Descartar registra reviewedAt/By y selección en evidencia separada.

Si otro Admin modificó Draft, devolver conflicto con comparación actualizada;
no aplicar sobre revisión obsoleta. Si ya está formalizado, rechazar aplicación:
una corrección futura requiere versión/rectificación P5-A, no mutación histórica.
Conservar A datos previos, B envío inmutable, C decisiones/eventos Admin y
D snapshot final con fuentes por campo. PII de auditoría permanece privada,
no se escribe en console/logs generales ni se replica a analytics.

## 11. Amenazas y controles técnicos

| Amenaza | Control propuesto, a verificar antes de implementar |
| --- | --- |
| Adivinar token | CSPRNG 256 bits, hash servidor, límites de intentos sin búsqueda por PII |
| Filtración de enlace | HTTPS, no-store/private, Referrer-Policy no-referrer, sin recursos terceros/analytics; redacción de token en proxy/App Hosting logs antes de habilitar |
| Enumeración | Sin consultas públicas por DNI/email/budget; respuestas genéricas; lookup privado |
| Replay | Nonce/idempotencia, estado request, expiración y política de envíos verificadas en transacción |
| Revocación concurrente | CAS/transacción y chequeo en cada operación, capacidad revocable junto al request |
| CSRF | POST JSON, Origin mismo origen, header secreto no ambiental, rechazo cross-site; CORS mismo origen, sin CORS comodín |
| Abuso/rate limiting | Límite compartido server-side por huella de request e IP seudonimizada; no sólo memoria de instancia; 429 y Retry-After; valores configurados y probados antes de habilitar |
| Payload grande | Máximo 16 KiB de cuerpo UTF-8, contando bytes también sin Content-Length; 413; sin archivos/base64 ni compresión aceptada |
| Claves inesperadas/prototype pollution | Allowlist exacta en todos niveles, rechazar desconocidas, arrays y tipos incorrectos; sin spread de JSON a modelos privados |
| XSS/inyección | Render como texto, sin HTML, validación servidor y consultas por IDs internos resueltos, no paths del cliente |
| PII en telemetría | Sin analytics ni logs raw, sin URLs PII, crash reporting y capturas de formulario deshabilitados/redactados |
| Enlace reenviado | Bearer token no prueba identidad; mostrar datos sólo tras revisión Admin, no usar como firma o aceptación económica |

No DNI, CUIL, dirección, email, WhatsApp, nombre/empresa o dirección laboral en
pathnames/query params. RequestId opaco puede estar en path; secreto sólo en
fragmento y header, no access-log del path. No logging de headers/cuerpos.


Formulario público sin Firebase SDK con escrituras directas, sin lector Admin
genérico ni parámetros de colección. API servidor sólo obtiene request y guarda
la allowlist; no expone economics, planes, TNA/mora, cláusulas, documentos P4,
Storage paths, presupuesto completo u otros contratos. Ningún upload de documentos.
Acceso token es capacidad acotada, no sesión Admin ni prueba de identidad del cliente.
Retención de PII, auditoría y evidencia requiere política aprobada antes de
producción; evitar IP raw persistida por defecto. No ampliar IAM ni Rules aquí.

## 12. Pendientes explícitos y criterio de entrega posterior

CLIENT_DATA_LINK_EXPIRY_POLICY = 7_DAYS_REVOCABLE: RESUELTA, 7 días exactos.
CLIENT_RESUBMISSION_POLICY = ONE_SUBMISSION_PER_LINK: RESUELTA; corrección Admin o nuevo link.
FIRST_DUE_DATE_POLICY = EXPLICIT_FIRST_INSTALLMENT_DATE (RESUELTA).
MATERIAL_ECONOMIC_CHANGE_RECONFIRMATION = NO_NEW_PROPOSAL_FOR_SNAPSHOT_PLAN_CHANGE.

Conciliación RESUELTA: total = N × cuota redondeada; ajuste va a servicio.
Otros pendientes para etapas posteriores: anticipo/componentes aplicables del baseline, rol TNA/mora/CFT y revisión legal,
numeración/exclusividad/rectificación, custodia física y retención de PII.
No reabrir decisiones ya resueltas de plan 1..18, factor congelado, seis datos
personales o laborales opcionales. Los pendientes se muestran como bloqueo de
la operación que los necesita, no como defaults silenciosos.

Pruebas futuras necesarias, no ejecutadas en esta fase: factor snapshot vs vivo,
plan no ofrecido con factor válido, factor ausente fail closed, NEXT_90_V1,
conciliación, personales completos y laborales ausentes, GET sin consumo,
expiración/revocación/carreras, replay, rate limit, claves/body maliciosos,
no PII/secretos en respuestas/logs, no lectura de economics/P4, submission sin
mutación Draft, aplicación CAS, trazabilidad hasta snapshot y firma independiente.
Firebase sólo en Emulator cuando se implemente; no producción.

## 13. Resultado de arquitectura

CLIENT_SELF_SERVICE_DATA_FORM = DESIGNED, NOT_IMPLEMENTED.
CLIENT_DATA_FORM_ENTRY_POINT = /completar-datos/{requestId}#{secret} (conceptual).
PUBLIC_FORM_CAN_EDIT_ECONOMICS = NO.
PUBLIC_FORM_CAN_ACCESS_DOCUMENTS = NO.
PUBLIC_FORM_CAN_ACCESS_OTHER_CONTRACTS = NO.
CLIENT_CAN_EDIT_CONTRACT_CLAUSES = NO.
TOKEN_RAW_STORED = NO. TOKEN_HASH_STORED = YES (diseño).
CLIENT_SUBMISSION_AUTO_APPLIES_TO_CONTRACT = NO.
ADMIN_REVIEW_BEFORE_APPLY = YES.
EMPLOYMENT_DATA_REQUIRED = NO.

Gate documental: git diff --check y comprobación de whitespace de ambos archivos
nuevos sin stagear. No build, suites, browser ni llamadas Firebase necesarias.
CODE_CHANGED = NO. RULES_CHANGED = NO.
PRODUCTION_DATABASE_MUTATIONS = 0. PRODUCTION_STORAGE_MUTATIONS = 0.
COMMITS_CREATED = 0. PUSH_EXECUTED = NO. DEPLOY_EXECUTED = NO.

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
