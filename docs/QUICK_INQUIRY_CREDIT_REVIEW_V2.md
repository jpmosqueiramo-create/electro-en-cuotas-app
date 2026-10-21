# Consulta mínima, documentación reutilizable y evaluación manual V2

## Alcance y decisiones aprobadas

Evolución posterior a la Ficha Única (PR #48/#49). No modifica decisiones históricas, presupuestos emitidos, Acceptance existentes ni schemas de submissions contractuales. Producción, Rules, IAM, secretos y Storage productivo no se modificaron. Sin migraciones, merge ni deploy.

Administración verifica expresamente la identidad documental antes de crear/vincular una carpeta. No existen búsquedas automáticas por DNI/email/nombre, deduplicación por coincidencia ni fusiones. La coincidencia estricta de los datos de identidad del borrador es un control adicional del servidor; no sustituye la verificación humana ni concede titularidad por sí misma. Una discrepancia bloquea la vinculación y requiere resolución administrativa fuera de cualquier migración automática.

Administración registra manualmente la fecha de vigencia de cada documento. No se inventan plazos legales, geográficos ni comerciales. Un documento observado puede quedar sin fecha; verificarlo sí exige registrar su vigencia. Fecha vencida, documento observado/eliminado o cambio de datos personales/laborales invalida la aprobación para preparar el contrato. No se altera el historial de la decisión previa.

## Auditoría del módulo existente y reutilización

- `publicSolicitudService.ts`: una fuente canónica `solicitudes_cuenta`, transacción idempotente, snapshot comercial, notificación secundaria separada y rate limit HMAC existente. Se reutiliza sin cambiar su motor de persistencia.
- `budgetAcceptanceV2Server.ts`: Acceptance de una sola alternativa, expediente documental por versión y operación determinística. Se agrega sólo un estado crediticio separado al registrar nuevas aceptaciones; replay no crea otro.
- `budgetDocumentationStorage.ts`: reserva idempotente, archivo privado, firma MIME, límite 10 MiB, hash e integridad, descarga administrativa sin URL permanente y compensaciones distribuidas existentes. Se reutiliza; no se agrega uploader ni bucket.
- `BudgetAcceptanceDocumentation.tsx`: reutilizado en modo documental dentro de Contrato. No duplica una aceptación ni copia archivos.
- `operationClientV2.ts`: vínculo Auth posterior a entrega; no se utiliza para adelantar activación de cuentas. La carpeta documental no es una cuenta Auth ni habilita acceso cliente.
- `ContractV2Composer` y `OperationUnifiedFrame`: mantienen las cinco secciones. La evaluación queda dentro de Contrato y actualiza próxima acción/responsable.

## Consulta inicial

Home, servicio/catálogo y `/solicitar` envían `tipo: consulta_v2`: producto/necesidad, nombre completo, WhatsApp y localidad. Catálogo agrega únicamente referencia pública, cantidad de cuotas preferida y cuota visualizada; el servidor valida contra el DTO público al primer guardado y preserva el snapshot en replays. El esquema nuevo rechaza DNI, CUIL, domicilio, datos laborales, nacimiento y documentación.

Los tipos anteriores `contacto_rapido` y `apertura_cuenta` siguen interpretándose igual para compatibilidad, incluidos sus payloads/digests/reintentos existentes. No se reescriben solicitudes históricas. Un plan consultado no es Acceptance. Las alertas nuevas `CONSULTA_PUBLICA_V2` enlazan explícitamente a la solicitud V2, sin tratar la consulta inicial como una evaluación crediticia ni enviarla a Validaciones legacy. Las alertas anteriores conservan su routing. WhatsApp se abre sólo tras persistencia confirmada, sin envío automático desde servidor. Rate limit 3/contacto/hora, Retry-After y deduplicación siguen en el mismo servicio.

## Persistencia y privacidad

Todo lo nuevo queda dentro del subárbol contractual ya mediado por servidor y denegado al SDK cliente por las Rules existentes:

- `presupuestos_v2/{budgetId}/contracts/v{version}/creditReview/current`: revisión y decisión de esa operación, nunca compartidas con otra.
- `.../clientProfiles/verified`: carpeta anclada a la operación donde se verificó la identidad por primera vez. Identidad opaca, digest de identidad, actor/fecha/evidencia y hasta cuatro referencias documentales revisadas.
- `.../creditCommands/{commandId}`: comando, digest, resultado, actor y fecha inmutables para replay/auditoría. Revisión esperada de evaluación y carpeta, control transaccional de concurrencia.

El vínculo guarda presupuesto/versión de la carpeta canónica verificada. No duplica un cliente por consulta ni copia documentos a cada operación. Cada documento conserva su referencia al attachment original, SHA256, metadata de revisión, fecha de vigencia y responsable. Se comprueba además que el attachment siga existiendo en el expediente de origen y no esté observado. Su eliminación no se confunde con documento vigente.

Las APIs nuevas son exclusivamente Admin mediante `verifyAdminAuth`; no aceptan un actor suministrado por el navegador. `credit-document/{type}` valida el vínculo del servidor y reutiliza la descarga privada con comprobación de bytes/hash. No retorna Storage URL ni token. La lista de carpetas es una consulta administrativa explícita, limitada a 100; no busca coincidencias ni vincula por sí sola. Una instalación con más carpetas necesitará paginación antes de ampliar ese límite.

Las observaciones son internas: no deben incluir copias innecesarias de DNI ni datos sensibles; no se agregan a PDF, WhatsApp público ni portales de cliente/afiliado. No se exponen costos ni decisiones crediticias a esos portales.

## Orden y transiciones

Presupuesto → Acceptance → formulario personal/laboral existente → revisión/aplicación explícita → identidad y documentación → evaluación manual propia → aprobado/rechazado → preparación contractual.

- PENDING_DATA: primero recibir/revisar/aplicar los datos del formulario. Crear borrador para recolectar datos no prepara condiciones económicas ni emite documentos.
- PENDING_DOCUMENTS: DNI frente, DNI dorso y domicilio obligatorios para evaluación. Ingresos opcionales.
- IN_REVIEW: datos y documentación completa/vigente; nunca equivale a aprobación automática.
- MORE_INFORMATION: solicitud administrativa de aclaración/actualización.
- APPROVED / REJECTED: decisión explícita sólo después de estar en evaluación; resolución y notas obligatorias, fecha/actor auditados.

La aprobación registra hashes de los datos y documentos revisados. Reutilizar documentación no reutiliza la decisión de otra operación. No se avanza a plan, fechas o READY de una operación enrolada sin aprobación y comprobación vigente. Las tres firmas, aprobación jurídica, congelamiento, numeración y formalización mantienen sus guardas anteriores: aprobación crediticia no los habilita.

## Compatibilidad

Nuevas aceptaciones crean evaluación pendiente de forma atómica. Aceptaciones anteriores sin estado crediticio siguen leyéndose sin escrituras ni migración silenciosa. Su incorporación a la evaluación es una acción administrativa explícita desde la ficha; no se cambia su presupuesto/submission/digest/updateTime. No se retroinvalida evidencia READY histórica por una lectura. Los bloqueos productivos globales siguen siendo obligatorios para todas las operaciones.

## Verificación y revisión visual

Suites: `testCreditReviewV2Emulator.ts`, `testOperationWorkspaceV2Emulator.ts` (ahora agrega la evaluación obligatoria antes de conservar las assertions económicas previas), regresiones de Contract V2/Acceptance/Operation y solicitudes/rate limit. Runner desktop/mobile: `runCreditReviewV2Browser.ts`. Todas las escrituras son en demo-cuenta-hogar, Auth 9099, Firestore 8080 y Storage 9199; nunca credenciales productivas.

Capturas sintéticas: `docs/review/credit-review-v2/` (consulta general/catálogo y evaluación desktop/mobile). Las capturas originales y logs de ejecución quedan fuera del repositorio en `/tmp/cuenta-hogar-credit-review-v2/` y `/tmp/ch-credit-*.log`.

## Límites

No hay scoring ni resolución automática, fusión automática, consulta a bureaus, invitación anticipada, cobro, numeración CH ni emisión definitiva. Resolver discrepancias de identidad requiere verificación humana; este módulo no convierte una coincidencia declarada en identidad legal. La revisión jurídica y de política de privacidad continúa fuera de esta implementación. No se despliega ninguna regla ni recurso productivo.

La auditoría de red C4 se actualiza al acceso mediado por servidor ya existente desde `9a95380`: exige ambas APIs de historiales y cero consultas directas a Firestore. Conserva los controles de respuestas públicas, datos sensibles y cero requests a productos. Los runners contractuales esperan la política asíncrona y verifican el fieldset contractual específico, sin eliminar assertions.

## Resultados verificados (2026-10-21)

| Validación | Resultado |
| --- | --- |
| Evaluación/identidad/documentos nuevos, recurrentes, vencidos, observados, discrepancias, API por rol y acceso privado | PASS en Emulator |
| Concurrencia de decisión y de carpeta compartida, replay sin updateTime adicional | PASS |
| Solicitud mínima, catálogo con/sin preferencia, persistencia/idempotencia/rate limit | PASS |
| Ficha Unificada, Contract V2, schemas históricos/digests | PASS |
| Acceptance P4, integridad y compensaciones Storage, Operation V2 | PASS |
| Browser nuevo 1280×800 / 390×844 | PASS; sin overflow ni requests Firebase externos |
| Browser contractual y READY | PASS; assertions económicas y bloqueos conservados |
| Browser de expediente/documentación privada | PASS, exclusivamente Emulator |
| Browser C4 | PASS; 19 respuestas públicas auditadas, cero leaks y cero requests a productos |
| ESLint | 0 errores; 24 warnings preexistentes, sin diagnósticos nuevos |

No se ejecutaron migraciones ni escrituras productivas. El script local `scripts/testBudgetV2HttpIdempotency.ts` no forma parte de esta implementación.
