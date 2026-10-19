# Contrato V2 — P5-C: borrador y autocarga de datos

Base: e34d948456ca2d0c177333e835886bc5a6934be1.
Rama: feature/contrato-v2-p5c-composer-client-data. Sin stage, commit, push o deploy.

## Alcance implementado

Acceptance V2 → OPEN_OR_CREATE → confeccionador → recálculo/cronograma → solicitud
WhatsApp → formulario público → submission inmutable → aplicación explícita Admin.
Únicamente status DRAFT. No hay endpoint/botón de formalización, snapshot final,
PDF, Pagaré V2, firma, entrega, remito o cobranza. Validaciones legacy, Rules,
engines financieros y cláusulas no se modificaron.

## Modelos y origen

`src/lib/contractV2.ts` contiene ContractDraftV2, ContractPersonalDataV2,
ContractEmploymentDataV2, ContractEconomicTermsV2, ContractPaymentInstallmentV2,
ContractClientDataRequestV2 y ClientDataSubmissionV2. El helper contractSchedule
representa el cronograma de ContractPaymentScheduleV2 definido en P5-A.

Un contrato inicial por budgetId+budgetVersion: ID determinístico v{version},
servidor valida versión EMITIDO y Acceptance exacta, opción y snapshot. Budget/
Acceptance son leídos en transacción; no se escriben ni se altera Documentación.
No hace falta un caso P4 para abrir borrador. Sólo personal snapshot V2 para
prefill (nombre, DNI, localidad, WhatsApp y CUIL laboral). Dirección/email/trabajo
vacíos, sin leer solicitudes mutables. No consulta catálogo ni productos.

acceptedReferenceSnapshot conserva campos comerciales congelados, factores y
oferta; omite imagenUrls para no copiar bytes/Data URLs. El origen completo queda
en Acceptance. El servidor valida y deriva la copia; no acepta snapshot del browser.
preparedAt/createdAt/updatedAt son ISO UTC de servidor, no acceptedAt ni inputs.
Todos los personales pueden faltar en DRAFT; laborales siempre opcionales.
Completeness exige seis personales, economía, ambas fechas/día y cronograma
conciliado; la UI añade aviso de cambios locales sin guardar. No formaliza.

## Persistencia y API

Paths privados propuestos en P5-A y usados aquí:

- presupuestos_v2/{budgetId}/contracts/v{version}: Draft.
- .../commands/{commandId}: digest de actor/payload y resultado durable.
- .../events/{commandId}: antes/después, autor/fecha y submission aplicada.
- .../requests/{requestId}: hash y estado, no raw token.
- .../submissions/{requestId}: un envío inmutable por request.
- contractClientDataRequests/{requestId}: índice servidor con budget/version.
- contractClientDataLimits: contadores servidor sin PII ni secretos.

API Admin específica `/api/admin/presupuestos-v2/{budgetId}/versions/{version}/contract`:
GET devuelve borrador, requests sin hash/digest y submissions sólo tras
verifyAdminAuth. POST acepta exactamente action, commandId, expectedRevision para
updates y campos específicos. OPEN_OR_CREATE no exige revisión; las acciones son
UPDATE_PERSONAL_DATA, UPDATE_EMPLOYMENT_DATA, SET_CONTRACT_PLAN,
SET_PAYMENT_DATES, CREATE_CLIENT_DATA_REQUEST, REVOKE_CLIENT_DATA_REQUEST y
APPLY_CLIENT_SUBMISSION. Cualquier clave/acción ajena se rechaza; errores inesperados
sanitizados. No confundir permisos Admin de API con permiso de portador público.

Comandos durables, actor/payload digest y compare-and-swap transaccional: revisión
obsoleta rechazada, cada update incrementa revisión. Comando repetido devuelve su
resultado previo sin repetir escrituras; la UI recarga el estado actual. La
respuesta de CREATE repetido no contiene secreto; para compartir de nuevo crear
otro enlace, revocando el anterior. Ningún raw token en comandos/eventos/logs.

## Economía aprobada

No cálculo financiero paralelo: contractEconomics llama calcularPlanReferenciaCatalogo
real de C1/P2 con costoProveedorSnapshot y factoresSnapshot[N] de Acceptance.
N explícito 1..18, sin seleccionar 12 ni preferencia automáticamente. Que N no
fuera ofrecido no lo bloquea si existe factor congelado válido. Factor ausente
falla cerrado. No overrides de referencia/capital/factor/importes ni nueva
propuesta automática. Mensaje NEW_PROPOSAL_REQUIRED para operación ajena.

Del resultado compartido: factorComputedTotal = valorTotalReferencia;
contractInstallmentAmount = cuotaExhibidaCatalogo (NEXT_90_V1). Luego composición
contractual aprobada, sin duplicar el cálculo del helper:

- capitalAmount = costoProveedorSnapshot.
- contractTotal = contractInstallmentAmount × N.
- roundingAdjustment = contractTotal − factorComputedTotal.
- serviceAmount = contractTotal − capitalAmount.

Capital no absorbe redondeo. Sumatoria del cronograma igual al total y
capital+servicio=total. El modelo conserva capital snapshot incluso con decimales y rechaza totales
fuera de rango seguro o composición que no satisfaga exactamente la invariante
capital+servicio=total, sin truncar ni aplicar recálculo oculto. No nuevo motor, fiscalidad, TNA, mora ni cambio NEXT_90_V1.

Caso demostrado: capital 580000, preferencia 12, elección explícita 8, factor
congelado 2.31 → total por factor 1339800, cuota 167490, total contractual 1339920,
ajuste 120, servicio 759920. Presupuesto y Acceptance intactos. Cambio económico
sólo de plazo bajo este snapshot no exige nueva propuesta; firma física futura
constituirá la aceptación contractual definitiva, fuera de P5-C.

## Cronograma

firstInstallmentDueDate pura YYYY-MM-DD, sin default. preferredMonthlyDueDay 1..31.
Cuota 1 exacta, cuotas 2..N en meses calendario siguientes, cada una calculada
independientemente con clamp al último día. Usa calendario UTC sólo como helper,
sin convertir fecha contractual en DateTime ni encadenar setMonth.

8 cuotas, primera 2026-12-15 y día30: 15/12/2026, 30/01/2027, 28/02/2027,
30/03/2027, 30/04/2027, 30/05/2027, 30/06/2027, 30/07/2027.
Cada importe es cuota contractual; no regeneración posterior formalizada (P5-D).

## Enlace, token y submission

32 bytes crypto.randomBytes, base64url: 256 bits. SHA-256(token) únicamente en
Firestore. URL `/completar-datos/{requestId}#{secret}`, requestId opaco sin PII.
Fragmento no viaja al servidor en navegación; cliente lo mueve a memoria y limpia
barra con history.replaceState. Header X-Client-Data-Token en API únicamente,
sin query/path. No localStorage/cookies ni URL WhatsApp persistida. Página recargada
sin fragmento requiere nuevo enlace; no recuperar el secreto perdido.

Expira createdAt + 7×24 horas. CREATE transaccional revoca ACTIVE previo y actualiza
activeClientDataRequestId. REVOKE inhabilita. Estado EXPIRED soportado; expiración
se verifica en cada operación sin depender de job ni escritura de estado.

API pública `/api/public/contract-data/{requestId}`: GET sólo {available:true}, POST
sólo {received:true}. Toda falla genérica “El enlace no está disponible.”.
Header capacidad, hash constante tiempo, estado/expiración/Draft validado por
servidor. Token inválido, revocado, expirado y request desconocido no filtran modelo.
POST requiere Origin del mismo origen, JSON y ausencia de query; rechaza cross-site.
GET no consume enlace, para no invalidarlo por previews de WhatsApp.

Body máximo 16 KiB medido en stream, sin Content-Encoding, archivos ni HTML.
Allowlist exacta en raíz/personal/laboral. Seis personales y día mensual obligatorios;
laborales vacíos válidos. Strings NFC/trim, límites y validación no destructiva
para identidad/contacto. Valores inválidos rechazados, nunca truncados o inventados.
Rate limiting durable por request (60/min) y global (300/min), sin IP/PII; incluye
credenciales inválidas de formato válido. Límites y expiración no son TTL de datos.

Primera submission crea evidencia y SUBMITTED en una transacción, sin editar Draft.
Retry idéntico normalizado devuelve confirmación sin duplicar; payload diferente
rechazado. GET de enlace ya enviado no abre otro envío. Corrección por Admin o
nuevo enlace. Nunca token, economics, documentos P4 o paths Storage en submission.

## Revisión y privacidad

Composer compara diez campos actual/recibido. Aplicar todos con confirmación:
valida vínculo submission→request→Draft→budget/version, CAS, copia personales,
laborales y día; recalcula propuesta de cronograma si está completo. Escribe
lastClientSubmissionId/AppliedAt/AppliedBy y evidencia antes/después. Primera
fecha contractual no viene de formulario. Posterior edición Admin no altera
submission. Ninguna recepción aplica datos ni día automáticamente.

Headers página/API: no-store, no-referrer, nosniff, noindex/nofollow/noarchive.
Formulario sin SDK Firestore/Storage ni datos previos; el AuthProvider global
preexistente permanece, no se usa como autorización pública. WhatsApp flotante
se oculta exclusivamente en este formulario. Sin eventos analytics ni logs de
payload, header secreto o PII en el código nuevo. No almacenar token raw, URLs de
descarga, archivos/base64 o documentos P4. UI sólo usa memoria temporal para el
link y wa.me; el clic no prueba envío/lectura ni identidad ni firma.

Limitaciones: enlace portador reenviable, no autenticación de identidad; datos
son propuestas a revisar. Retención de PII y auditoría debe aprobarse antes de
producción. No habilitar standalone como formalización: P5-D debe resolver revisión
legal, documento final, custodia/firma y política de versiones, sin reabrir legacy.

## Verificación

Suites nuevas: testContractV2.ts (modelo/schedule), testContractV2Emulator.ts
(persistencia, requests y API adversarial), runContractV2Browser.ts con
 testContractV2Browser.ts (Admin desktop, público 390px, aplicación Admin).
Todos los tests Firebase con demo-cuenta-hogar y Auth9099/Firestore8080/Storage9199.
Sin credenciales productivas ni escrituras productivas. El formulario real se
prueba con requestId#token Emulator, confirmación, no overflow y sin datos privados.

Capturas fuera de Git: /tmp/cuenta-hogar-p5c/, 01..08. Evidencia y resultados finales
se informan al cerrar gates; ningún test se considera PASS por su clasificación.
P4, P3/históricos, C1, C3 y Storage baseline son regresiones separadas; correr
fixtures Auth que cambian el mismo usuario de forma secuencial, no en paralelo
con browser. No se modificó la suite histórica por esa colisión de fixtures.

## Resultado verificado del cierre local

TSC, ESLint tocados (0 errores), test:safe y build: PASS sobre código final.
ESLint diferencial contra e34d948: baseline tocado 0, errores nuevos 0.
Modelo/schedule (también TZ Pacific/Kiritimati y America/Los_Angeles): PASS.
P5-C persistencia, requests y API adversarial: PASS; incluye carrera CAS de enlaces
con un único ganador y lectura Firestore anónima denegada. Browser Admin desktop,
público mobile y revisión/aplicación Admin: PASS, ocho capturas generadas.
P4 modelo, acceptance/documentation Storage Emulator y API adversarial: PASS.
P3 modelo/persistencia e históricos: PASS. C1 y C3 puro/Emulator: PASS.
Storage security baseline: PASS tras aislar usuarios demo con email compartido.
No se ejecutó browser C3 ni un smoke general adicional como parte de ese rótulo.
DOCUMENTATION_CLIENT_LEAKS = 0; PUBLIC_CONTRACT_DATA_LEAKS = 0 en las pruebas.
Los logs de Emulator generados se movieron fuera del repositorio, a
/tmp/cuenta-hogar-p5c-logs/, sin incorporar archivos de runtime en Git.

### Inventario exacto de alcance

Creados durante P5-C (14):

- docs/CONTRATO_V2_IMPLEMENTATION_P5C.md
- scripts/runContractV2Browser.ts
- scripts/testContractV2.ts
- scripts/testContractV2Browser.ts
- scripts/testContractV2Emulator.ts
- src/app/api/admin/presupuestos-v2/[budgetId]/versions/[version]/contract/route.ts
- src/app/api/public/contract-data/[requestId]/route.ts
- src/app/completar-datos/[requestId]/page.tsx
- src/app/completar-datos/[requestId]/public-form.tsx
- src/components/admin/contracts/ContractDataFields.tsx
- src/components/admin/contracts/ContractV2Composer.tsx
- src/lib/contractV2.ts
- src/lib/contractV2Http.ts
- src/lib/contractV2Server.ts

Modificados durante P5-C (5):

- docs/CONTRATO_V2_ARCHITECTURE_P5A.md (ya existía sin versionar).
- docs/CONTRATO_V2_COMPOSER_CLIENT_DATA_P5B.md (ya existía sin versionar).
- next.config.ts (headers únicamente para formulario público).
- src/components/FloatingWhatsApp.tsx (ocultar sólo en formulario de datos).
- src/components/admin/budgets/BudgetAcceptanceDocumentation.tsx (entrada al composer).

Estado Git esperado al cierre: 3 tracked modificados + 16 untracked de alcance,
ninguno stageado. Sin cambios en Validaciones, firestore.rules o storage.rules.
Sin formalización ni PDFs nuevos; revisión legal requerida hacia P5-D.
