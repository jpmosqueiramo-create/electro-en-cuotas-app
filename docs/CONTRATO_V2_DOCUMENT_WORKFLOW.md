# Integración administrativa documental V2

Base: c193c3209b99dc0bb7c85a67b90093e6db93bb26.
Evolución de P5-C, P5-D1A, READY, C1 y formatos documentales aprobados. No modifica
sus decisiones históricas, cláusulas jurídicas, economía ni calendario.

PRODUCTIVE_FREEZE = DISABLED
LEGAL_APPROVAL = PENDING
DOCUMENT_ISSUANCE = REVIEW_ONLY
FORMALIZATION = DISABLED

## Interfaz y expediente

Documentación contractual se integra bajo el confeccionador existente de
Presupuestos V2. Reúne presupuesto/opción aceptada, planes ofrecidos, revisión del
borrador, evidencia READY verificada, resumen de documentación P4 opcional y,
cuando existe un freeze C1 demo verificado, número/hash del snapshot y registros
de conservación. No copia personales, laborales, adjuntos P4 ni tokens al índice.

GET /api/admin/presupuestos-v2/{budgetId}/versions/{version}/contract/documents
es una lectura transaccional con autorización Admin y Cache-Control private,
no-store. Verifica identidades y opción/origen, y rechaza evidencia READY o
snapshot inconsistente. DRAFT no implica READY. Un flag TERMS_FROZEN sin evidencia
no se acepta. El freeze C1 se reconoce sólo en Emulator; la vista no lo ejecuta.
No existe migración por lectura, escritura sobre Budget/Acceptance/P4 ni acción
nueva en el dispatcher contractual. El composer bloquea edición también cuando
lee TERMS_FROZEN de pruebas.

Estados documentales distintos:

- DRAFT: preparación editable por los comandos existentes.
- TECHNICAL_REVIEW: READY con evidencia vigente; no es firma ni freeze.
- TERMS_FROZEN: snapshot y evidencia C1 verificados, sólo demo en esta etapa.
- FORMALIZED: requiere aprobación jurídica y evidencia verificada de las firmas
  físicas del contrato y del pagaré. No hay comando/API/botón para establecerlo.
  Ni booleanos ni IDs de escaneos aislados autorizan la transición. El guard del
  módulo rechaza todas las transiciones documentales solicitadas, incluso cuando
  el llamador presenta una aprobación o firmas declaradas unilateralmente.

La verificación de firmas, custodia de originales y activación jurídica real no
se implementan mientras LEGAL_APPROVAL siga PENDING. No se afirma formalización
por guardar PDFs, tener READY o contar con términos congelados.

## Muestras y fuente única

GET /api/admin/contract-document-samples/{manifest|mandate|promissoryNote} exige
Admin y guardas de Emulator local; no admite IDs, payloads ni datos de clientes.
En producción responde 503, sin conexión Storage ni generación de documentos.
No hay POST de emisión ni activación mediante un flag productivo.

El payload sintético versionado se construyó con los fixtures existentes. Es un
ejemplo sin persistencia, con CH-000001 fijo del snapshot de prueba, no una reserva
real de número ni evidencia READY durable. Se sella en memoria con las definiciones
actuales; no altera snapshots históricos. La UI señala expresamente que no
corresponde al expediente real. No se archiva automáticamente en el legajo del
cliente ni se usa como fallback de un snapshot real ausente.

Los dos PDFs parten de una sola proyección del mismo ContractSnapshotV2. Se
conservan número, capitalAmount, serviceAmount, contractTotal y cronograma
materializado de 1–18 cuotas. El renderer no calcula precios ni consulta catálogo.
Se mantienen mandato de dos páginas y pagaré de una, formatos y cláusulas de
referencia. No hay anticipos o garantes. REFERENCE_FORMAT_REVIEW_V4 identifica
el cambio de copy del importe propuesto.

En la implementación vigente, contractTotal es únicamente el importe propuesto del pagaré como referencia
técnica PENDING_LEGAL_APPROVAL. enforceableAmount sigue null y el recuadro/importe
en letras del título permanecen PENDIENTES. No se presume exigibilidad. Identidad
LOOP, cláusulas, lugar/fecha y condiciones jurídicas siguen pendientes según
CONTRATO_V2_DOCUMENTS_REVIEW.md. Todos los PDF llevan advertencia de borrador y
NO FIRMAR.

La decisión comercial del 2026-10-19 define para la próxima actualización jurídica
y operativa conjunta el importe del pagaré como exactamente contractTotal,
mostrado en números y letras, conservando el diseño original y el título
PAGARÉ A LA VISTA Y SIN PROTESTO. El pagaré no mostrará cantidad de cuotas,
importe individual ni cronograma; ese detalle queda exclusivamente en el mandato.
Ambos conservarán contractNumber del mismo snapshot. Esta especificación no
modifica el renderer vigente, las cláusulas ni el contrato de mandato. La validez,
exigibilidad y relación con obligaciones en cuotas siguen pendientes de revisión
profesional; emisión productiva deshabilitada. Ver la decisión completa en
CONTRATO_V2_DOCUMENTS_REVIEW.md.

La UI obtiene PDFs mediante Bearer en headers, comprueba sus SHA-256 contra el
manifest y crea blobs de vida limitada. No pone tokens en URLs, localStorage o
links públicos. Cancela solicitudes al desmontar y revoca los blobs. El visor
nativo incluye enlaces alternativos para abrir cada PDF de muestra.

## Conservación privada: interfaz y adaptador demo

PrivateDocumentArchive define preserve/read/list/close. El único adaptador es
createPrivateDocumentArchiveEmulator; no existe adaptador productivo ni endpoint
de conservación. Puede integrarse desde tests de servidor, sin botones de
escritura o acceso directo desde el navegador.

El adaptador posee sus propios clientes con proyecto literal demo-cuenta-hogar,
Firestore 127.0.0.1:8080 y Storage http://127.0.0.1:9199. Revisa guardas al crear,
al ingresar a operaciones y en reintentos transaccionales. Rechaza producción,
credenciales, hosts/proyectos inconsistentes y runtime productivo. No acepta un
cliente/bucket/endpoint alternativo del llamador.

Exige que el snapshot íntegro ya exista y sea idéntico al almacenado por C1. Nunca
lo crea, modifica o reemplaza ni inicializa contadores. El manifest enlaza número,
snapshotHash, projectionHash, definiciones de plantilla y hashes de ambos PDF.

Metadatos, bajo una raíz ya protegida por Rules:

contractSnapshotsV2/{snapshotId}/documents/{documentSetId}

Objetos Storage:

contract-documents-v2/{snapshotId}/{documentSetId}/{mandate|promissoryNote}.pdf

Los paths no incluyen PII y nunca usan comprobantes/**. El documentSetId deriva
del hash del manifest. El registro conserva manifest, hashes, número, versiones,
renderer, tamaño/páginas y generación de cada objeto, sin copiar personales.
El snapshot conserva las fuentes; los PDF contienen sólo su proyección allowlist.

1. Una transacción verifica el snapshot y reserva PENDING con toda la intención.
2. Las cargas usan ifGenerationMatch=0, sin overwrite. Un objeto existente se
   reutiliza sólo si coinciden bytes/hash y no tiene download token permanente.
3. Se verifican ambos objetos y sus generaciones; otra transacción comprueba
   snapshot/reserva y registra COMPLETE. No hay Storage dentro del callback.

Dos llamadas concurrentes o replays producen el mismo set y sólo dos objetos.
Una carga parcial o fallo antes del commit final deja una reserva durable PENDING
para reconciliar por retry. No se borran objetos automáticamente ni se ocultan
fallos como PASS. Un objeto COMPLETE ausente, alterado o reemplazado se rechaza,
sin regenerarlo silenciosamente. Las lecturas verifican generación, tamaño/hash y
asociación exacta con snapshot/plantillas. La lectura del expediente comparte el
validador de registros, pero no afirma una auditoría Storage de cada lectura UI;
muestra la conservación registrada.

El versionado se vincula a las definiciones congeladas. Un paquete incompatible
se rechaza; no se reescribe un snapshot para imponerle otra plantilla. Los sets
son identificados por contenido y conservan sus versiones; el adaptador puede
leer lo ya archivado sin regenerarlo con un renderer nuevo. Una nueva versión
contractual futura necesita su flujo explícito aprobado, no reemplazar historia.

No hay URLs firmadas ni getDownloadURL. El lector devuelve bytes en el servidor;
no publica objetos ni los comparte con clientes. Las Rules versionadas existentes
niegan acceso directo (también Admin cliente) a la raíz contractual y al nuevo
prefix Storage. No se modifican Rules/IAM/configuración ni se presume deploy.
Admin SDK omite Rules: el aislamiento real de este adaptador es su endpoint demo
fijo y guardas. No se declara almacenamiento WORM ni inmutabilidad ante IAM Admin.

## Pruebas y artefactos

- testContractDocumentWorkflow: políticas, estados, fixture, hash y guardas de
  producción/credenciales/host; no Firebase writes.
- testContractDocumentWorkflowEmulator: READY real, retorno/revisión, freeze C1,
  archivo concurrente/replay, recuperación de carga parcial, objetos ausentes o
  alterados, versiones incompatibles, asociación incorrecta, Admin API, rechazo
  no-admin/anon y acceso directo Storage/Firestore denegado. Budget, Acceptance,
  P4, snapshot y contador no cambian por documentos.
- runContractDocumentWorkflowBrowser: regresión P5-C/P5-D1A primero; luego DRAFT,
  READY, muestras autenticadas, importes propuestos, freeze y conservación demo,
  composer bloqueado y expediente actualizado; desktop 1280 y mobile 390.
- testContractDocuments + verifyContractDocumentPdfs: contenido, 18 planes,
  formato 2/1 páginas, cláusulas, integridad, privacidad y advertencia del importe
  propuesto no exigible. Más modelos READY/C1/infraestructura y regresiones
  Emulator de seguridad contractual y P4.

Capturas y muestras sintéticas fuera de Git:
/tmp/cuenta-hogar-contract-document-workflow/.
Logs: /tmp/contract-workflow-*.log.

Las pruebas no autorizan emisión real, congelamiento productivo, firma,
formalización, merge o deploy. Las decisiones jurídicas siguen pendientes.

## Resultados ejecutados en esta rama

- TypeScript: PASS. ESLint de los 15 TS/TSX tocados, --max-warnings 0: PASS.
- Build final después de detener Next dev: PASS. test:safe: PASS.
- Modelo workflow, documentos/pypdf y cláusulas contra originales locales: PASS.
- Integración workflow Emulator: PASS, incluida la ejecución final con SDK cliente
  Storage real y read/create/update/delete denegados para los tres roles, con
  control positivo. Replays, concurrencia, recuperación parcial, versiones y
  asociación snapshot: PASS. Mutaciones productivas: 0.
- Browser contractual final: PASS, incluidos P5-C/P5-D1A, DRAFT/READY/freeze demo,
  archivo y reapertura congelada sin nuevos comandos, desktop/mobile.
- Seguridad Firestore: PASS, 1374 denegaciones y 115 accesos legítimos.
- Regresión aceptación/documentación P4 Emulator: PASS, compensación y delete.
- Modelos READY, C1 e infraestructura: PASS.
- Smoke general: primera ejecución 11/12 por logout Cliente 430 e IndexedDB;
  repetición en Emulator fresco 12/12 PASS, sin cambios al smoke, Auth o Cliente.
  El browser nuevo tuvo una espera de diálogo insuficiente: se corrigió con
  polling y timeout, sin modificar assertions ni convertir errores en PASS.
- git diff --check: PASS. Cláusulas jurídicas, Rules, configuración, pricing,
  Budget/Acceptance y servicios READY/C1 originales: sin cambios.

## Evolución comercial y operativa V5 (2026-10-19)

La revisión V5 aplica la decisión de importe del pagaré; la descripción V4 de
importe sólo propuesto queda como antecedente de implementación. Ver perfil,
plantillas, condición del bien y política económica en
CONTRATO_V2_DOCUMENTS_REVIEW.md, sección «Actualización integral comercial V2».

El expediente incluye un panel de seguimiento con estados independientes de
firma cliente/mandato, cliente/pagaré, representante, remito, entrega, custodia y
formalización. Las firmas registran fecha efectiva, localidad efectiva, referencia
opaca del original/evidencia y canal SYSTEM/WHATSAPP, con actor y timestamp técnico
separados. Las fotografías no sustituyen originales. No se suben fotografías a
Storage ni se generan URLs permanentes desde este panel; la referencia permite
trazabilidad del canal vigente sin duplicar imágenes ni datos personales.

Endpoint Admin privado `contract/operations`, GET sin escrituras. POST sólo admite
RECORD_SIGNATURE, RECORD_DELIVERY y RECEIVE_ORIGINALS con commandId, revisión
esperada y esquema exacto. Persiste en subcolecciones server-mediated existentes
del Draft: operationalEvidence/current, operationalCommands y operationalEvents.
No cambia el snapshot ni su digest. Reintentos idénticos devuelven el resultado
original; conflictos de revisión/commandId se rechazan. Evidencia existente nunca
se sobrescribe. No hay comando FORMALIZED ni aprobación jurídica inferida.

Entrega requiere firmas físicas registradas del cliente en contrato, pagaré y
remito. No espera validación fotográfica administrativa ni firma del representante;
esta última permanece PENDIENTE y puede registrarse luego. Recibir originales
requiere las firmas incluidas del representante; no equivale a formalización.
La entrega efectivamente registrada no se revierte por documentación pendiente.

Durante revisión jurídica, POST operativo exige Emulator demo con guardas locales,
sin flags de habilitación productiva. La UI productiva permite consultar pero no
registrar firmas/entregas nuevas. No se debe registrar firma de PDFs de muestra.
La activación operativa real requiere aprobación jurídica y autorización expresa;
las muestras, el almacenamiento de pruebas y el congelamiento continúan aislados.
El rol conductor/vendedor afiliado no obtiene permisos nuevos: la evidencia se
registra administrativamente desde el sistema o canal WhatsApp vigente. No se
expone un endpoint público ni se modifican Rules, IAM o datos productivos.
