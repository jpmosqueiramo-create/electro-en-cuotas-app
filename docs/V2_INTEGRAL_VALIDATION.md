# Validación integral V2 — 2026-10-21

Baseline: 7921587a4d8c1c26375ae7411c39cf2bfe32b8c9. Rama posterior: feature/v2-integral-stabilization.

## Resultado y límites

**PASS técnico integral en Emulator: 17 comprobaciones. NO habilita operación contractual ni cobranza productiva.**

Una consulta por un lavarropas conserva colección/ID, presupuesto, versión, alternativa y operationId hasta el snapshot y la cobranza simulada. Una segunda consulta por una heladera reutiliza expresamente documentos de la misma persona, pero no su evaluación.

El runner scripts/testV2IntegralJourney.ts utiliza Next local y Auth/Firestore/Storage de demo-cuenta-hogar. Los formularios público y contractual se completan desde Chromium; los comandos administrativos invocan las APIs HTTP existentes y se comprueban en Firestore, Storage y pantallas reales. No es una medición manual completa de todos los clics del operador. El JSON registra 83 respuestas del cliente HTTP de pruebas y 19 auditorías de pantallas, sin incluir todas las peticiones internas del navegador.

No se usaron datos, credenciales, recursos o servicios productivos. La navegación externa a WhatsApp quedó bloqueada. No se enviaron mensajes ni se cambiaron Rules, IAM, secretos o configuración productiva. El script local testBudgetV2HttpIdempotency.ts permanece fuera del commit.

## Matriz del recorrido

| Etapa | Resultado | Evidencia |
| --- | --- | --- |
| Consulta por lavarropas | PASS | Cuatro campos; fuente canónica; replay sin cambio de updateTime |
| Bandeja administrativa | PASS | Producto y persona sintéticos visibles |
| Presupuesto, emisión y Acceptance | PASS | SAVE repetido; aceptación concurrente con un solo efecto |
| Identidad operativa | PASS | Colección/ID, presupuesto/versión/alternativa y operationId explícitos |
| Formulario contractual | PASS | Datos personales/laborales; payload económico rechazado con 400 |
| Revisión y aplicación | PASS | Envío no modifica borrador por lectura; aplicación explícita; replay sin cambio de updateTime |
| Documentos y evaluación | PASS | Frente, dorso y domicilio obligatorios; ingresos opcionales; aprobación manual sintética |
| Plan, fechas y conformidad | PASS | Sólo Admin; cambio 12→8 exige nueva conformidad; READY no acredita firma |
| Recurrente | PASS | Nuevo presupuesto, Acceptance y formulario; vínculo explícito; archivos no copiados; evaluación propia |
| Identidad incompatible | PASS | Vínculo rechazado; no se fusionan personas |
| Vigencia documental | PASS | Vencido/observado exige actualización e invalida aprobación |
| Congelamiento desactualizado | PASS después de corrección | Rechazo antes de consumir contador |
| PDFs y conservación | PASS | Mandato A4 de 2 páginas, pagaré A4 de 1; manifiesto, snapshot/hash y replay |
| Proveedor y logística | PASS | Pedido, confirmación, retiro, recepción, viaje y entrega prevista separados |
| Afiliado, custodia y firmas | PASS | UID y dos confirmaciones; faltantes bloquean entrega |
| Cliente y cobranza | PASS con puentes explícitos | Entrega simulada, activación sintética, pagos parciales/completos y tres recibos |
| Roles e integridad | PASS | Accesos cruzados rechazados, descarga privada, Storage anónimo denegado, enlace revocado, históricos intactos |

Control económico: capital sintético $580.000; 12 cuotas de $145.000 = $1.740.000; cambio explícito a 8 cuotas de $167.490 = $1.339.920. Servicios del segundo plan: $759.920. Primer vencimiento 15/12/2026 y día habitual 30, con febrero ajustado al calendario. Costo real proveedor de $610.000 sin alterar presupuesto, Acceptance ni cronograma. No se modificó ningún motor.

Ambos PDFs utilizan el mismo snapshot y CH-000001 **exclusivamente en Emulator**. Se revisaron las tres páginas renderizadas: tabla, vencimientos y firmas legibles, sin superposición. El pagaré conserva importe exigible pendiente y total propuesto como referencia técnica; cláusulas e identidad de LOOP siguen pendientes de aprobación. No se reescribieron textos jurídicos.

## Defectos y correcciones

1. **Integridad:** READY podía congelarse en Emulator aunque la documentación compartida hubiera vencido/observado después. Reproducción anterior: Missing expected rejection. Se reutiliza assertCreditPreparation dentro de la transacción, antes de asignar numeración. Replays de un snapshot ya congelado preservan integridad.
2. **Defensa adicional de entorno:** invitaciones aceptaban configuración DEMO local con NODE_ENV=production. El proyecto productivo ya era rechazado; no se acreditó acceso productivo. Ahora también se rechazan production, K_SERVICE y GAE_ENV.
3. **UX crediticia:** una aprobación seguía indicando registrar la evaluación. Ahora la acción refleja el estado.
4. **UX custodia:** se ofrecía registrar incidencias después de entregar, sin custodia vigente. La API deriva canReportIncident del UID, custodia, transferencia y cierre; la interfaz respeta esa capacidad.
5. **UX ficha:** entrega simulada dirige a cuotas/pagos sin duplicar estados persistidos.

La fixture financiera anterior a PR #50 omitía evaluación crediticia. Se actualizó para completar formulario, documentos y decisión sintética antes del plan. No se eliminaron assertions ni se desactivaron guardas.

## Experiencia y prioridades

- Consulta: 4 campos y un envío. Formulario contractual: 8 personales obligatorios y 3 laborales opcionales, sin economía.
- Cliente nuevo: verificación de identidad, 3 cargas, 3 revisiones y decisiones de inicio/resolución. Son comandos de dominio, no un número de clics manuales medido.
- Cinco secciones evitan volver al listado por cada módulo. Documentación y logística siguen largas: aproximadamente 4.200 y 5.600 px en 390×844. P2: resumir pendientes y separar evidencia/historial sin quitar controles.
- Afiliado aún muestra algunos estados técnicos y fechas ISO; cliente conserva un resumen legacy separado que puede mostrar ceros junto al servicio V2. P2: labels cotidianos y resumen contextual, preservando ambos modelos.
- La acción principal depende de lecturas asíncronas; el runner espera su carga. P2: estado de carga explícito para evitar un mensaje transitorio anterior.
- Sin overflow horizontal ni errores que impidieran completar el recorrido final.

## Requisitos para clientes reales

**P0 — mantener bloqueos:**

- Aprobación profesional de identidad/representación de LOOP, cláusulas, pagaré, importe exigible y parámetros de emisión. Revisar correspondencia de CUIL y campos pendientes.
- Autorizar procesos productivos de congelamiento/numeración, documentos definitivos, firmas físicas y entrega. READY, fotos sintéticas y aprobación crediticia no equivalen a formalización ni aprobación jurídica.
- Sustituir puentes de prueba por integración aprobada: dependencias sintéticas de congelamiento, clientActivationFixture y financialApprovalFixture. Se crean sólo después de verificar antecedentes simulados y no constituyen eventos jurídicos. Invitaciones todavía dependen del fixture, no consumen por sí mismas el evento real de entrega.
- Probar futura activación y cobranza con permisos/consentimiento aprobados; no habilitarlas mediante variables o relajando Rules para reutilizar fixtures.

**P1 — antes de habilitar volumen:**

- operationFinancialV2Server.activationProof descarga Storage dentro de transacciones Firestore. Requiere una estrategia de validación/reintentos entre servicios que evite I/O externo prolongado dentro de la transacción.
- paymentHistory lee pagos/recibos completos por consulta/comando. Definir paginación/proyección verificable o checkpoints sin perder integridad ni idempotencia.
- Reservas fotográficas PENDING: existe retry con la misma identidad, pero falta detección y recuperación operativa de abandonadas. Cualquier limpieza debe inventariarse/aprobarse; esta tarea no borra objetos.

Congelamiento, CH real, emisión definitiva, FORMALIZED, cierre de entrega, invitaciones y cobranza productivas permanecen bloqueados. Sin migraciones ni cambios de modelos económicos/contractuales.

## Validaciones

| Suite | Resultado |
| --- | --- |
| TypeScript | PASS |
| ESLint de archivos tocados | PASS |
| Build | PASS |
| test:safe | PASS |
| testV2IntegralJourney.ts | 17/17 PASS; HTTP + desktop/mobile; fuentes Firebase externas observadas: 0 |
| testOperationClientV2Emulator.ts | PASS: uso único, vencimiento, revocación, concurrencia, múltiples servicios y guardas |
| testOperationCustodyV2Emulator.ts | PASS: asignación, concurrencia, confirmaciones, fotos privadas y aislamiento |
| testOperationWorkspaceV2Emulator.ts | PASS |
| testContractV2Emulator.ts | PASS: schemas, reintentos, privacidad, digests y metadatos históricos |
| testContractReadyEmulator.ts | PASS: CAS, idempotencia, revocación y origen intacto |
| testOperationFinancialV2Emulator.ts | PASS tras actualizar fixture: parciales/completos, FIFO, reversas, abortos, mora y cronograma |
| testContractFreezeIntegration.ts | PASS |
| testContractDocuments.ts | PASS |
| Browser específicos de custodia y finanzas | PASS: interacción, incidencias, pagos, recibos, roles, reload y overflow |

El fallo inicial de hidratación del runner y ajustes de ruta/fixture no se clasifican como defectos productivos. Crédito obsoleto y guarda de invitaciones están cubiertos por assertions que fallaron antes de corregir.

## Reproducción

Usar Node 24, Java 21 y dependencias fijadas. Preparar un JSON temporal fuera de Git con firestore.rules y storage.private.rules mediante rutas absolutas y puertos Auth 9099, Firestore 8080 y Storage 9199. No usar la regla legacy de Storage para esta verificación.

Exportar GCLOUD_PROJECT y NEXT_PUBLIC_FIREBASE_PROJECT_ID como demo-cuenta-hogar; FIRESTORE_EMULATOR_HOST=127.0.0.1:8080; FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099; FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199. Quitar credenciales/ADC del proceso. Activar el límite sólo en este proceso local con PUBLIC_SOLICITUDES_RATE_LIMIT_ENABLED=true y una clave HMAC ficticia hex de 64 caracteres.

NEXT_PUBLIC_ADMIN_EMAIL debe coincidir con la identidad de política de las Rules versionadas para las lecturas del navegador; el runner crea una cuenta independiente de Auth Emulator con la contraseña de fixture, nunca usa la cuenta/credenciales productivas. Las suites de regresión por servicios usan admin-v2@example.invalid cuando exigen un dominio sintético.

Ejecutar firebase-tools emulators:exec --project demo-cuenta-hogar --config /tmp/config-integral.json --only auth,firestore,storage con npx tsx scripts/testV2IntegralJourney.ts como comando hijo. Requiere instancia fresca y localhost:3000/9227 libres. El runner levanta y detiene su propio Next y Chromium. Build y Next dev se ejecutan secuencialmente.

## Artefactos

[Capturas y metadatos sintéticos versionados](review/v2-integral/). Los dos PDFs de muestra revisados se conservan fuera de Git en /tmp/cuenta-hogar-v2-integral/mandato-sintetico.pdf y /tmp/cuenta-hogar-v2-integral/pagare-sintetico.pdf. journey.json contiene ambos IDs/vínculos, resultados, HTTP y auditorías sin tokens ni credenciales. Originales/logs en /tmp/cuenta-hogar-v2-integral/ y /tmp/ch-v2-integral-*.log.

Sin merge, deploy, cambios de Rules ni escrituras productivas.
