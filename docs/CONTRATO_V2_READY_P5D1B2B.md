# P5-D1B2-B — Preparación técnica contractual

Base: e20b2dfa5b53327b3596b7f0b9fe59272a0606ed.
Evolución posterior de P5-C, P5-D1A, P5-D1B1 y seguridad A2; no reescribe sus decisiones históricas.

## Estados y límites

Se implementa exclusivamente DRAFT ↔ READY_TO_FORMALIZE. READY acredita revisión
técnica de datos, origen, economía y calendario. No acredita aprobación jurídica,
firma, emisión, snapshot definitivo, congelamiento ni entrega.
LEGAL_TEMPLATE_REVIEW_REQUIRED = YES.
No hay comandos TERMS_FROZEN/FORMALIZED, PDFs nuevos, numeración ni contador.
Contratos antiguos y numeración legacy permanecen fuera de este circuito.
No se modifican Rules, Storage, IAM, configuración productiva ni motores.

## Guarda integral

MARK_READY_TO_FORMALIZE exige Draft existente, DRAFT y revisión CAS coincidente.
Valida Budget emitido y Acceptance exacta con una opción, referencia contractual
idéntica, ocho personales normalizados/válidos y versión provincial vigente,
laborales opcionales válidos, plan explícito 1..18 y factores del origen aceptado.
Conserva las fórmulas P5-C: capital=costo aceptado; helper compartido C1;
total=cuota*N; servicio=total-capital; ajuste=total-factorComputedTotal.
Valida fecha inicial y día mensual, N filas consecutivas, fechas/importe exactos
del calendario mensual con clamp y suma reconciliada. Rechaza claves ajenas,
overrides, anticipos y garantes. No usa completeness como autoridad ni consulta
catálogo vivo o solicitudes legacy. No escribe Budget, Acceptance o P4.
Reutiliza validateContractSnapshotSource con proyección explícita del estado
DRAFT y exclusión del puntero de revisión; no cambia el validador del harness.
Errores administrativos acotados, sin interpolar PII o secretos.

## Evidencia durable

presupuestos_v2/{budgetId}/contracts/v{version}/readyReviews/{commandId}
contiene CONTRACT_READY_EVIDENCE_V1: identidad cv2 determinística, budgetId,
budgetVersion, contractDraftId, acceptedOptionId, draftRevision (revisión resultante
READY), termsDigest, originHashes de Budget/Acceptance, reviewedAt, reviewedBy,
commandId y readinessPolicyVersion=CONTRACT_TECHNICAL_REVIEW_V1.
legalTemplateReviewRequired=true, sin fingir dependencias legales aprobadas.

CH_CONTRACT_JSON_V1 y SHA-256 son los de P5-D1B1. termsDigest incluye identidad,
referencia, personales, laborales, economía, calendario y preparedAt. Excluye
estado, puntero/evidencia, metadatos de edición y capacidades de enlaces para
impedir autorreferencia. No altera stable ni los digests históricos P5-C/P5-D1A.
La evidencia no copia datos personales, documentos P4 ni tokens. Los hashes de
origen son privados y no son prueba de identidad ni firma.

El Draft agrega readyEvidenceId opcional; ausencia histórica permanece válida.
GET en READY verifica transaccionalmente evidencia/origen/términos/revisión y
metadatos del revisor. Los comandos sobre READY también la verifican (salvo
replay exacto de receipt ya comprometido, que conserva su resultado histórico).
No hay escritura por lectura. No se migra ningún Draft existente.

## Comandos, transacción y concurrencia

Se conserva la API Admin y verifyAdminAuth. Actor UID y fechas son servidor;
reviewedAt/reviewedBy arbitrarios en el payload se rechazan.
MARK_READY_TO_FORMALIZE incrementa revisión y crea evidencia/evento/receipt en
la misma transacción que cambia estado y revoca el enlace activo.
El evento de transición guarda estados, revisiones y referencia de evidencia;
no duplica PII ni before/after completos. Los receipts mantienen la semántica
idempotente existente. Un replay no implica que el agregado siga en ese estado:
la UI recarga el estado vigente después de cada comando.

RETURN_TO_DRAFT exige READY, CAS, evidencia vigente y motivo breve. Invalida el
puntero vigente, incrementa revisión y registra evento sin borrar la evidencia
anterior. La UI ofrece motivos acotados; no deben ingresarse PII ni secretos.
No duplica el Draft. No permite editar estando READY. Una segunda preparación
crea otra evidencia, nunca sobrescribe la anterior.

Doble clic con mismo commandId/actor/payload devuelve receipt original; payload
o actor distinto provoca conflicto. Comandos distintos concurrentes sobre la
misma revisión tienen un ganador. RETURN/edición/aplicación y MARK utilizan el
mismo agregado CAS. Sin efectos externos dentro del callback transaccional.
Cambios personales/laborales no regeneran cronograma: sólo cambios explícitos
de plan, fechas o aplicación del día recibido lo reconstruyen con el helper vigente.

## Requests y submissions

Política elegida: revocar el request ACTIVE al marcar READY y limpiar el puntero.
La revocación es atómica con READY. No se amplía la capacidad pública: su guard
continúa exigiendo DRAFT. El enlace no revive al volver a DRAFT.
Si una recepción gana la carrera, su submission queda conservada; si READY gana,
la recepción se rechaza. Ninguna recepción modifica automáticamente términos.
Una submission SUBMITTED permanece intacta; puede aplicarse administrativamente
tras RETURN_TO_DRAFT. No se permite crear requests o aplicar submissions en READY.
Se conservan formatos seis/ocho, hashes, expiración, revocación, límites y retry
idempotente existentes. Su regresión incluye enlaces históricos de P5-C.

## UI y privacidad

Composer conserva estructura. Muestra estado y revisión, confirmación técnica,
fecha/responsable y advertencia: “Datos y condiciones revisados. La emisión
contractual definitiva continúa pendiente de aprobación.” En READY el fieldset
editable está deshabilitado y existe acción explícita de retorno con motivo.
Sin botones posteriores, nuevos datos de proveedor o nuevas capacidades públicas.
El servidor sigue devolviendo requests sin tokenHash/submissionDigest; la nueva
evidencia sólo se entrega por API Admin. No hay endpoints nuevos.

## Seguridad y activación

readyReviews está dentro del subárbol protegido por A2. No se cambian Rules y
no se presume que estén desplegadas. Admin SDK/IAM privilegiado no está sujeto
a Rules; no se afirma inmutabilidad absoluta. Hash no sustituye autorización.
El harness Emulator conserva guardas y endpoint demo fijo; READY no lo invoca.
Cualquier futura congelación requiere otra fase, autorizaciones y revisión legal.
SEC-STORAGE-1, firmas, custodia, entrega y recuperación productiva no se implementan.

## Verificación

Los comandos y resultados reales se registran al finalizar esta fase. Suites:
testContractReady (guarda y hashes), testContractReadyEmulator (CAS, replay,
concurrencia, evidencias, enlaces y ausencia de asignaciones), runContractReadyBrowser
(regresión browser P5-C/P5-D1A más READY/retorno desktop/mobile), seguridad A2,
Rules existente, Budget V2, P4 y P5-D1B1. Todas las escrituras sólo en
Firebase Emulators demo-cuenta-hogar con hosts explícitos Auth9099,
Firestore8080 y Storage9199. Sin credenciales productivas.

### Resultados ejecutados

- npx tsc --noEmit: PASS.
- npx eslint sobre los ocho archivos TS/TSX nuevos/modificados: PASS.
- npm run build: PASS; npm run test:safe: PASS; git diff --check: PASS.
- npx tsx scripts/testContractReady.ts: PASS (guarda adversarial, ocho personales,
  economía/calendario, 18 planes y evidencia/manipulación).
- npx tsx scripts/testContractReadyEmulator.ts: PASS; última ejecución en Emulator
  fresco incluye recepción pública concurrente con MARK, revisiones distintas,
  conservación/aplicación determinística de submission y replay de RETURN.
- npx tsx scripts/testContractV2.ts: PASS; validación P5-D1A incluida.
- npx tsx scripts/testContractInfrastructure.ts y testContractInfrastructureEmulator.ts:
  PASS; guardas, canonicalización y transacciones exclusivamente sintéticas.
- npx tsx scripts/testBudgetV2.ts y testBudgetV2Emulator.ts: PASS.
- npx tsx scripts/testBudgetAcceptanceV2.ts y testBudgetAcceptanceV2Emulator.ts:
  PASS, incluidos Storage, compensación, delete distribuido y API P4.
- npx tsx scripts/testContractV2Emulator.ts: PASS; P5-C y compatibilidad P5-D1A,
  sin migración por lectura, hashes/submissions preservados y cero tokens raw.
- npx tsx scripts/testContractFirestoreSecurity.ts: PASS; 1374 denegaciones,
  115 accesos legítimos, sin bypass observado.
- npx tsx scripts/testFirestoreRules3B6A.ts: 36/36 PASS.
- npx tsx scripts/runContractReadyBrowser.ts: PASS; ejecuta primero el browser
  P5-C/P5-D1A sin modificarlo, incluidos enlaces históricos, y luego READY
  desktop/mobile, controles bloqueados, retorno, edición y segunda evidencia.
  Overflow y conexiones Firebase externas: sin incidencias en las assertions.

Las suites Emulator se ejecutaron con firebase-tools emulators:exec --project
 demo-cuenta-hogar --only auth,firestore,storage; la última suite READY usó sólo
Auth/Firestore. Variables GCLOUD_PROJECT/GOOGLE_CLOUD_PROJECT/
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cuenta-hogar, hosts 127.0.0.1:8080/9099/9199;
variables de credenciales deshabilitadas en el proceso de pruebas.
Capturas fuera de Git: /tmp/cuenta-hogar-contract-ready/.
Logs fuera de Git: /tmp/cuenta-hogar-ready-*.log.
Sin pruebas productivas ni cambios de permisos productivos.
