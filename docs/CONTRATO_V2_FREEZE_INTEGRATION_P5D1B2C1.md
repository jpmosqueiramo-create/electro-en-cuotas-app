# P5-D1B2-C1 — Integración técnica de congelamiento

Base: b93e6ab8737df898dfbd1d24c60d694670cecca4.
Rama: feature/p5-d1b2-c1-contract-freeze-integration.
Evolución posterior de P5-D1B1, A2 y READY B; no modifica sus decisiones históricas.

## Separación Emulator / producción

createContractFreezeIntegrationEmulator crea un cliente propio, projectId literal
 demo-cuenta-hogar, host literal 127.0.0.1:8080 y ssl=false. No acepta cliente,
proyecto ni endpoint del llamador. Reutiliza assertContractInfrastructureEmulator
sin modificarlo: antes de construir, antes de cada operación y en cada intento
transaccional. Rechaza producción, K_SERVICE/GAE_ENV, navegador, proyectos/hosts
incompatibles y variables de credenciales. Sin flag de activación productiva.
Actores limitados a synthetic-admin-a y synthetic-admin-b; no son autenticación
Admin productiva. Sólo expone execute, getSnapshot y close.

No hay imports desde src/app o src/components, endpoint, Server Action ni botón
nuevo. El dispatcher productivo no acepta FREEZE_READY_EMULATOR. No se modifican
sus guards ni el tipo productivo ContractDraftV2. No se invoca el factory del
harness anterior ni FREEZE_EMULATOR_FIXTURE. No se habilita un flujo real.

## READY real y agregado sintético

Los tests crean Budget/Acceptance sintéticos y pasan por OPEN_OR_CREATE,
UPDATE_PERSONAL_DATA, SET_CONTRACT_PLAN, SET_PAYMENT_DATES y
MARK_READY_TO_FORMALIZE del servicio existente. No siembran un flag READY.
El integrador valida estado/revisión, verifyReadyEvidence y las fuentes Budget y
Acceptance; exige además receipt y evento originales de MARK, digest histórico
sin reescribirlo, actor/fecha/revisiones y resultado durable idéntico al READY.
Se rechazan estado manipulado, evidencia ausente/adulterada, receipt ausente,
fuentes o términos alterados, revisión obsoleta y capacidades activas pendientes.

La preparación técnica sigue exigiendo ocho personales y laborales opcionales
válidos, opción/origen exactos, factores congelados, economía P5-C y calendario
completo. Los cálculos se verifican por igualdad; el snapshot copia los importes
y filas materializados, no los sustituye por un recálculo o por el reloj actual.

El agregado local evoluciona a TERMS_FROZEN, incrementa revisión y añade
emulatorFreeze: modo, versión de integración, receipt, revisión READY y ID de
dependencias. Es un tipo local del integrador, exclusivamente sobre documentos
demo. Los guards productivos actuales rechazan comandos nuevos sobre ese estado.
Un replay de un comando MARK previo puede devolver su resultado histórico pero
no reescribe el estado congelado. El GET Admin existente puede leer el agregado
sintético; no se añade presentación productiva de TERMS_FROZEN a la UI.

## Snapshot y dependencias

Se reutilizan ContractSnapshotV2 y CH_CONTRACT_JSON_V1/SHA-256. No hay modelo
paralelo ni cambio en la canonicalización histórica. EMULATOR_FIXTURE_ONLY_V1
conserva su forma exacta y validación anteriores. La nueva variante de freeze:

- readinessPolicyVersion=CONTRACT_TECHNICAL_REVIEW_V1;
- integrationPolicyVersion=READY_FREEZE_EMULATOR_V1;
- executionMode=EMULATOR_ONLY;
- readyEvidenceId, readyEvidenceHash y dependenciesHash;
- legalTemplateReviewRequired=true.

El snapshot contiene identidad, número/secuencia/política, origen, personales,
laborales, referencia aceptada privada, economía y cronograma completos, perfil
empresarial y definiciones documentales sintéticos, procedencia y hash verificable.
sourceDraft.readyDigest debe coincidir con el digest de los términos reconstruidos
desde el snapshot; se valida incluso ante un rehash de un payload inconsistente.
El integrador enlaza además revisión, evidencia real, fuentes y registro/evento.
No se cambian los digests P5-C/P5-D1A ni se reescriben evidencias READY.

Dependencias leídas transaccionalmente en:
contractNumberingV2/CONTRACT_NUMBERING_V1/dependencies/{dependenciesId}.
No se crea otra raíz de permisos. Schema CONTRACT_FREEZE_SYNTHETIC_DEPENDENCIES_V1,
executionMode=EMULATOR_ONLY y legalApproval=NOT_APPROVED_SYNTHETIC_ONLY.
Perfil y templates requieren identificadores synthetic-, identificador fiscal
SYNTHETIC_NOT_A_TAX_ID y legalApprovalId SYNTHETIC_NOT_A_LEGAL_APPROVAL.
Son datos proporcionados por el test, no defaults jurídicos ni aprobación legal.
No se inventan tasas, mora, jurisdicción, firmas o cláusulas.

## Transacción y numeración

FREEZE_READY_EMULATOR acepta commandId, budgetId, budgetVersion, expectedRevision
y dependenciesId. No admite overrides de términos ni selección de infraestructura.
Todas las lecturas preceden a todas las escrituras, también en replay/alias:
receipt, Draft, Budget, Acceptance, evidencia/receipt/evento READY, contador,
dependencias y destinos de snapshot/número/origen/evidencia/evento.

Un único commit crea snapshot, número, evidencia, origen, receipt y evento;
actualiza agregado y contador. No hay efectos externos, PDF, WhatsApp o Storage
dentro del callback ni después de él. READY ya revocó la capacidad activa y limpió
su puntero; freeze exige ese invariante y el estado final bloquea el acceso público
con el guard DRAFT actual. Submissions y requests históricos no se borran.

Contador: contractNumberingV2/CONTRACT_NUMBERING_V1, schema histórico de pruebas,
executionMode=EMULATOR_ONLY, active=true y lastAllocatedSequence decimal string.
Ausente/inactivo: rechazo sin inicialización. El servicio no exporta inicializador.
Secuencia global desde 1, mínimo seis cifras, sin reinicio anual, sin truncamiento
al pasar a CH-1000000. BigInt sólo transitorio; límite técnico de 1000 dígitos,
excederlo falla sin wrap. Ningún contador productivo creado o consultado.
Los tests siembran únicamente un contador demo y un high-water mark sintético.
No hay inventario ni dependencia de contratos antiguos.

Destinos: contractSnapshotsV2, contractNumbersV2, contractOriginsV2,
contractOriginEvidenceV2, contractInfrastructureCommandsV2 y
contractInfrastructureEventsV2. Colisión de cualquier destino: STOP, sin saltos.
Identidad/origen son los determinísticos P5-D1B1. No se decide exclusividad entre
operaciones/versiones diferentes más allá de esas identidades aprobadas.

## Idempotencia, concurrencia e integridad

Mismo comando/actor/payload: receipt original tras verificar snapshot, registro,
origen, evidencia READY, origen Budget/Acceptance, agregado congelado y evento.
Mismo ID con otro contenido/actor: conflicto. Otro ID para el mismo contrato,
revisión READY e ID de dependencias devuelve el original y crea sólo receipt
alias, sin otro número/evento. Otro intento/revisión/configuración: rechazo.
Cambiar después las dependencias vivas no sustituye el paquete ya congelado.

Dos contratos compiten por el contador y reciben secuencias diferentes. Dos
operadores/doble clic sobre el mismo contrato reciben un único instrumento.
RETURN puede ganar y dejar el freeze obsoleto; si freeze gana, los guards actuales
rechazan ediciones/aplicaciones/retorno. MARK sobre DRAFT debe comprometer READY
antes de que freeze pueda aceptarlo. Una lectura concurrente no modifica términos.
Timeout posterior al commit recupera el receipt; aborto previo no consume número.

El servicio sólo crea instrumentos y permite leerlos. No implementa update/delete,
reset, anulación ni rectificación. Un número ya asignado no se libera/reutiliza.
El hash detecta alteraciones pero no protege contra un administrador capaz de
reescribir todas las fuentes/registros; Firestore no se declara WORM.

## Privacidad, permisos y límites

Snapshot privado conserva los datos requeridos; evidencia de origen guarda READY,
hashes y receipt, sin otra copia de personales, payload P4 o tokens. Eventos y
comandos del integrador son metadatos/receipts, sin payload contractual completo.
El servicio no imprime datos ni hashes. No hay endpoint público ni URLs permanentes.
Las diez raíces y contracts/** están cubiertos por A2, incluidas las dependencias
bajo el contador. No se modifica ni despliega Rules; no se presume despliegue
productivo. Admin SDK omite Rules y requiere controles IAM adicionales futuros.

La integración sigue sin aprobación jurídica, sin generación de documentos, firma,
FORMALIZED, custodia, entrega, cobranza, anticipos, garantes o circuito legacy.
La futura activación exige otro servicio autorizado, identidad/paquetes jurídicos
aprobados, revisión IAM/Rules efectivas, operación de contador/backup conciliada y
tratamiento productivo del agregado/UI. No basta cambiar una variable.
SEC-STORAGE-1 permanece fuera de alcance.

## Pruebas ejecutadas

- npx tsc --noEmit: PASS.
- npx eslint sobre contractSnapshotV2.ts, contractFreezeIntegrationEmulator.ts,
  helpers/contractFreezeFixtures.ts y ambas suites C1: PASS.
- npm run build: PASS, incluida ejecución final del código revisado.
- npm run test:safe: PASS; git diff --check: PASS.
- npx tsx scripts/testContractFreezeIntegration.ts: PASS, schema nuevo/histórico,
  términos READY, tampering con rehash, 18 planes y ausencia de rutas productivas.
- npx tsx scripts/testContractFreezeIntegrationEmulator.ts: PASS en Emulator fresco;
  última ejecución incluye MARK sobre DRAFT concurrente con freeze, procedencia
  durable de READY y coherencia de metadata/registro/evento en replay.
  Verifica CH-000001, CH-000002, contratos/operadores concurrentes, doble clic,
  timeout simulado posterior al commit, conflicto de comando, aborto inyectado
  después de encolar escrituras, colisión STOP, contador ausente/inactivo,
  ausencia de huérfanos, conservación de números, cambio de año y CH-1000000.
  Se conservan decimales, cronograma, Budget/Acceptance/P4 y submissions.
  Guardas rechazan producción, otro proyecto, host remoto y credenciales incluso
  después de crear el servicio. Comandos de freeze rechazados por dispatcher real.
- npx tsx scripts/testContractReady.ts y testContractReadyEmulator.ts: PASS.
- npx tsx scripts/testContractInfrastructure.ts y
  testContractInfrastructureEmulator.ts: PASS; harness histórico sin cambios.
- npx tsx scripts/testContractV2.ts y testContractV2Emulator.ts: PASS, incluidos
  P5-D1A, requests/submissions seis/ocho campos y digests históricos intactos.
- npx tsx scripts/testBudgetV2.ts y testBudgetV2Emulator.ts: PASS.
- npx tsx scripts/testBudgetAcceptanceV2.ts y testBudgetAcceptanceV2Emulator.ts:
  PASS; aceptación, documentación P4, Storage, compensación, delete y API adversarial.
- npx tsx scripts/testContractFirestoreSecurity.ts: PASS; 1374 denegaciones,
  115 accesos legítimos y cero bypass observado. Rules compiladas en Emulator.
- npx tsx scripts/testFirestoreRules3B6A.ts: 36/36 PASS.
- npx tsx scripts/runContractReadyBrowser.ts: PASS; browser P5-C/P5-D1A,
  Admin desktop, público mobile, enlace histórico y READY/retorno/segunda revisión.
  No se agrega interfaz de freeze.

C1 se ejecutó con firebase-tools emulators:exec --project demo-cuenta-hogar --only
 auth,firestore; regresiones con auth,firestore,storage. En ambos:
GCLOUD_PROJECT/GOOGLE_CLOUD_PROJECT/NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cuenta-hogar,
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 y
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099; Storage9199 sólo en sus regresiones.
Sin credenciales productivas suministradas al proceso de pruebas.
Logs fuera de Git: /tmp/cuenta-hogar-c1-*.log. Capturas de regresión en
/tmp/cuenta-hogar-contract-ready/ y /tmp/cuenta-hogar-p5d1a/.
No se ejecutaron consultas, mutaciones, inicializadores o despliegues productivos.
Los cambios necesarios durante desarrollo fueron tipos de fixtures y refuerzo
de verificaciones; no se debilitaron assertions ni se cambiaron tests históricos.
