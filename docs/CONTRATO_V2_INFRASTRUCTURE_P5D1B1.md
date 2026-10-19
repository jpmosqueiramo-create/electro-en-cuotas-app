# P5-D1B1 — Infraestructura contractual aislada

Base: `9937b02bc8518009abaf8358db2247bb57199643`.
Rama: `feature/p5-d1b1-contract-infrastructure`.

## Alcance y límite productivo

Implementa identidad, modelo de snapshot con validación runtime, integridad y
asignación transaccional de CONTRACT_NUMBERING_V1 exclusivamente sobre fixtures
sintéticos de Emulator. No implementa READY productivo, freeze productivo,
FORMALIZED, PDF, pagaré, firmas, entrega, custodia, anulación o rectificación.
No hay rutas, Server Actions, botones ni imports desde src/app o src/components.
No modifica P5-C, P5-D1A, P4, Budget, Acceptance, motores, catálogo ni Rules.
No crea ni inicializa un contador productivo. No migra datos por lectura.

`createContractInfrastructureEmulator` construye su propio cliente Firestore con
projectId literal demo-cuenta-hogar, host literal 127.0.0.1:8080 y ssl=false.
No acepta clientes, endpoints ni proyectos proporcionados por el llamador.
La guarda se ejecuta antes de crear el cliente y en execute, cada intento de
transacción y getSnapshot: rechaza NODE_ENV=production, navegador, K_SERVICE,
GAE_ENV, selección de proyecto incompatible, ausencia de hosts Emulator locales
y variables de credenciales. Si FIREBASE_CONFIG existe, debe ser JSON con el
projectId demo (la CLI puede generarlo); nunca se imprime su contenido.
Auth requiere 127.0.0.1:9099. No existe flag de habilitación productiva.
Incluso un proceso manipulado para superar variables de entorno sólo obtiene
un cliente fijado al endpoint local y al proyecto demo. La autorización futura
requiere cambio de código revisado y una fase separada, no cambiar una variable.
El actor es procedencia sintética del harness, no autenticación Admin real.
Esta interfaz no debe conectarse a una ruta productiva. La futura integración
necesitará verifyAdminAuth, READY y todas las dependencias legales aprobadas.

## Modelo y compatibilidad

ContractSnapshotV2 explicita moneda ARS y guarda identidad, número/política/secuencia, origen completo
budgetId+budgetVersion+contractDraftId+acceptedOptionId y revisión exacta, hashes
Budget/Acceptance/Draft, referencia aceptada sin imágenes, personales completos,
laborales opcionales (tres strings que pueden estar vacíos, como P5-C), economía
P5-C, cronograma materializado, perfil/contexto legal proporcionado, versiones y
hashes de templates/renderer/recursos, evento de congelamiento e integridad.
Aceptación conserva acceptedBy string y planes {cuotas, cuotaEstimada}; no se
inventa un total ofrecido. Se conservan los discriminantes EXISTING_REFERENCE /
NEW_REFERENCE y la referencia privada determinística cuando corresponda.
Proveedor/factores de la referencia son evidencia privada, nunca un DTO público.
Se preservan descripciones multilinea válidas del schema anterior.

El validador exige claves exactas anidadas, tipos, formatos, valores personales
normalizados según P5-D1A, versión de jurisdicciones, identidad consistente,
N 1..18, factores congelados, economía idéntica a contractEconomics y filas
idénticas a contractSchedule. Ambos son los helpers P5-C existentes; no se añade
un motor ni se cambia su matemática. Se validan los 18 planes, incluido uno no
ofrecido que tenga factor congelado válido. Capital decimal se conserva sin
truncamiento ni cuantización nueva. No se recalculan digests históricos.

El origen se contrasta con validateBudgetV2 y newContractDraft; se comprueba
Acceptance/opción y copia de referencia. Se conservan los ocho personales
revisados y laborales del Draft, sin consultar solicitudes ni catálogo vivo.
El schema del origen coincide con los campos actuales de ContractDraftV2.
Un origen histórico incompleto no se completa ni se migra: debe actualizarse
mediante el flujo Admin P5-D1A antes de ser elegible en una fase posterior.

No se inventan mora, jurisdicción, fechas de firma, empresa o textos legales.
Perfil, lugares/fechas de emisión y paquetes deben proporcionarse explícitamente.
Las referencias de aprobación son estructurales: un SHA/ID no acredita revisión
jurídica. Los valores sintéticos están sólo en scripts/helpers y en Emulator.
Los parámetros legales tienen tipos escalares acotados y un parameterSchemaId;
su allowlist jurídica efectiva se deberá resolver con templates aprobados.
El schema técnico actual utiliza readinessPolicyVersion=EMULATOR_FIXTURE_ONLY_V1:
readyDigest vincula el contenido de un fixture y NO representa READY real.

## Identidad, versiones e integridad

contractId = cv2_ + SHA-256 versionado de los cuatro identificadores canónicos.
Se valida contractDraftId=v{budgetVersion}, sin alterar IDs históricos. Dos
familias v1 producen identidades distintas. No se usan datos personales.
contractSnapshotId = contractId + _s1, snapshotVersion=1. No hay actualización de
snapshot ni incremento implícito para sustituir un instrumento. La guarda de
origen usa budgetId+budgetVersion para impedir otro original para esa aceptación.
No decide exclusividad entre aceptaciones de distintas versiones/operaciones.

Canonicalización CH_CONTRACT_JSON_V1:

- Claves ordenadas por unidades UTF-16 con sort sin localeCompare.
- Arrays densos conservan orden, sin propiedades adicionales.
- Sólo objetos planos, propiedades propias enumerables de datos y JSON escalar.
- null explícito; campos ausentes siguen ausentes; undefined se rechaza siempre.
- Sin toJSON, getters, proxies, Date, Timestamp, Map, funciones o símbolos.
- Sin normalización Unicode; se rechazan surrogates incompletos.
- Se rechazan NaN, infinitos, BigInt y -0; se preserva el valor Number P5-C.
- JSON.stringify define escapes y representación numérica. No nueva aritmética.
- Profundidad máxima 64, representación canónica máxima 900000 bytes UTF-8.
- Snapshot máximo 600000 bytes; sin truncamiento silencioso.

Hash = SHA-256(UTF8("CH_CONTRACT_JSON_V1" + NUL + canonicalJSON)).
Para integridad se excluye exclusivamente integrity.payloadHash; se conservan
canonicalizationVersion y hashAlgorithm dentro del contenido hasheado. Los demás
hashes forman parte del payload. validateContractSnapshot verifica el resultado.
sealContractSnapshot clona, calcula y valida; no muta el origen. No utiliza el
helper stable histórico como canonicalizador nuevo.

## Persistencia y transacción

Todos los paths siguientes se utilizan sólo en demo por el harness:

- contractInfrastructureFixturesV2/{contractId}: staging editable sintético,
  revisión, Budget/Acceptance/Draft copiados y contexto legal de prueba.
- contractNumberingV2/CONTRACT_NUMBERING_V1: contador explícitamente sembrado
  por tests; schema, modo EMULATOR_ONLY, active y lastAllocatedSequence.
- contractNumbersV2/{contractNumber}: registro único y receipt.
- contractSnapshotsV2/{snapshotId}: contenido inmutable de creación exclusiva.
- contractOriginsV2/{originId}: identidad de origen, digest y receipt único.
- contractOriginEvidenceV2/{contractId}: evidencia privada congelada y digest.
- contractInfrastructureCommandsV2/{commandId}: digest actor/comando y receipt.
- contractInfrastructureEventsV2/{commandId}: evento de asignación de prueba.

El único comando aceptado es FREEZE_EMULATOR_FIXTURE, con commandId, contractId
y expectedRevision. No es el futuro comando productivo. Ningún método reserva
números por separado, actualiza snapshots, los borra o reinicia el contador.
Los comandos UPDATE, DELETE, ANNUL, RESET_COUNTER y FORMALIZED se rechazan.

La transacción lee primero comando, fixture/origen, contador y destinos. Valida
origen, revisión y contenido; después crea snapshot, registro, evidencia,
guarda de origen, comando y evento; consume la revisión del fixture y avanza el
contador en el mismo commit. No escribe en los agregados P5-C ni en entidades
Budget/Acceptance/P4 actuales. No hay efectos externos ni operaciones Storage.
La fecha termsFrozenAt es tiempo del servidor de la ejecución ganadora, no
fecha de firma ni garantía de equivalencia con el commitTime de Firestore.

Mismo commandId+actor+payload devuelve receipt original tras verificar snapshot,
registro, origen y evidencia. ID reutilizado con otro payload/actor falla.
Otro commandId para la misma revisión e intención consumida devuelve el mismo
snapshot/número y registra sólo otro receipt de comando; no otro evento de
asignación. Fuente diferente o revisión obsoleta falla. La creación exclusiva
usa tx.create; colisión de número, snapshot, evidencia o evento produce STOP.

El contador ausente/inactivo falla; no hay fallback a cero. La secuencia es
string decimal canónico y la suma usa BigInt transitorio. Formato CH- más mínimo
seis cifras, sin reinicio anual ni truncamiento al superar 999999. Existe un
límite técnico de 1000 dígitos para mantener paths acotados; superarlo falla
antes de escribir, sin wrap ni reutilización. No se exporta inicializador.

## Inmutabilidad: garantías y límites

El servicio sólo crea snapshots/registros/evidencia y rechaza mutaciones. Hash
verificable y comprobación de vínculos detectan alteraciones/inconsistencias;
no son una protección criptográfica contra todos los administradores.
firestore.rules:176-177 mantiene el catch-all Admin para colecciones distintas
de catalogo_publico: alcanza a nuevas raíces y a presupuestos_v2. Un deny
específico no anularía otro allow coincidente. Admin SDK además omite Rules.
No se modifican ni despliegan Rules, IAM ni permisos en esta fase. No se declara
inmutabilidad productiva ni se instala una configuración de Rules de prueba.
La protección probada es la del servicio aislado, no WORM ni autorización real.

Antes de activar producción: auditoría read-only autorizada de numeración legacy,
control de escritores CH, revisión de Rules/permisos/credenciales, identidad legal,
templates/recursos aprobados, READY real y revisión legal. Contador y registros
no deben restaurarse/reinicializarse independientemente; recuperación necesita
conciliación con contratos emitidos. No se consulta producción en esta fase.
SEC-STORAGE-1 continúa fuera de alcance.

## Pruebas y comandos

Puras: npx tsx scripts/testContractInfrastructure.ts.
Emulator: npx tsx scripts/testContractInfrastructureEmulator.ts.
Requiere entorno seguro con proyecto demo-cuenta-hogar, Auth 9099 y Firestore
8080; ejecutar en Emulator fresco. Las suites P5-C/browser además usan Storage
9199 conforme a su runner existente. No instalar dependencias ni usar ADC.

La suite nueva prueba primer número, contador ausente/inactivo, dos contratos
en paralelo, dos Admin para un contrato, doble clic, replay/ID conflictivo,
respuesta perdida tras commit, abort después de encolar todas las escrituras,
CAS, colisión STOP, referencias sin huérfanos, no reutilización tras un hecho de
anulación sintético y crecimiento a CH-1000000. Cambio de año se simula sólo en
el proceso de test, restaurando Date; no cambia el contador. La anulación no
es una operación implementada: se siembra un hecho de ciclo de vida de prueba.
El caso >999999 siembra historia/high-water sintéticos, no crea millones de
contratos. Ninguna siembra se incluye en el servicio ni se ejecuta en producción.

Puras cubren canonicalización, tipos inválidos/getters, identidad, schema,
manipulación con/sin rehash, todos los personales, laborales vacíos, planes
1..18, capital decimal y ausencia de imports desde rutas/componentes. Guardas
rechazan producción incluso con hosts Emulator y después de construir el
servicio. Regresión: suites P5-C/P5-D1A sin cambios, incluido browser real.
Los resultados ejecutados se registran al cierre; una descripción de pruebas
no constituye PASS ni acredita revisión legal.

## Resultados verificados de P5-D1B1

- TypeScript: PASS; ESLint sobre los seis archivos TS nuevos: PASS.
- Modelo, canonicalización/integridad y bloqueo productivo: PASS.
- Transacciones Emulator finales: PASS, incluidos cambio de año, dos contratos,
  dos Admin, doble clic, replay/timeout, abort, colisión STOP y CH-1000000.
- Regresión pura P5-C/P5-D1A: PASS.
- Regresión Emulator P5-C/P5-D1A: PASS (concurrencia, datos históricos, digests,
  submissions inmutables, aislamiento de origen y tokens).
- Browser P5-C/P5-D1A: PASS (Admin desktop, público mobile, aplicación y enlace
  histórico conservando provincia/código postal).
- npm run test:safe: PASS; npm run build: PASS; diff check: PASS.

Una ampliación del fixture multilinea produjo temporalmente IDs de opción
repetidos; la validación P4 lo rechazó. Se corrigió únicamente la selección del
fixture y se reejecutaron las suites nuevas, conservando sus assertions.
No se modificó ningún archivo previamente versionado. Logs/capturas están fuera
de Git; servidores de test detenidos. No se ejecutó inventario productivo ni
se inicializó contador productivo, ni hubo contratos reales, PR merge o deploy.
LEGAL_TEMPLATE_REVIEW_REQUIRED = YES. PRODUCTIVE_FREEZE_AUTHORIZED = NO.
