# Presupuestos V2 — editor P3

Base: `f2d4d061ce41086d3a4c559462fb54e120ab0454`. Rama `feature/presupuestos-p3-v2-editor`. Commit P3 previo: `3f36da922c110f9e07cafcb9ecb5b0bb305389f3`. Corrección posterior en la misma rama, sin amend, merge, deploy ni mutaciones productivas.

## Flujo y alcance

`/admin/presupuestos` ofrece Nueva confección V2 y mantiene el historial legacy con búsqueda/filtros y salidas históricas. Nuevo presupuesto requiere una solicitud existente identificada por **sourceCollection + solicitudId**; la selección muestra ambas colecciones y no fusiona IDs iguales. Parámetros del lead precargan datos si el origen es unívoco; en caso ambiguo exige selección explícita. Un nombre de bien solicitado es contexto, no una referencia válida. No crea una solicitud alternativa si el origen no existe.

V2 usa BudgetV2, BudgetOptionV2 y BudgetReferenceSnapshotV2, con GENERADO editable y EMITIDO inmutable. No produce nuevos CANONICAL_V1/MANUAL_FACTOR_V1/MIXED_V1. Los helpers/motores y snapshots históricos permanecen intactos. El historial de /admin/presupuestos conserva abrir para editar, reconstruir ítems, guardar, PDF y WhatsApp mediante el mapping y lifecycle históricos de la base. La procedencia del array persistido distingue un presupuesto real de una entrada sintética pendiente, independientemente de estado comercial o prefijo del ID. Las entradas pendientes abren V2 con colección/ID explícitos; ni el botón Nuevo ni las queries nuevas abren creación legacy. Un guard impide guardar sin identidad histórica y, si el presupuesto desapareció, no lo agrega silenciosamente a otro array. En Validaciones, los presupuestos históricos conservan cargar para editar, guardar edición, PDF, WhatsApp y aceptar/rechazar con sus estados y payloads originales. La inmutabilidad de P3 aplica solamente a BUDGET_V2. Las nuevas confecciones desde Validaciones muestran una acción hacia V2 antes de armar un borrador, con sourceCollection + solicitudId y una redirección defensiva que impide crear legacy. La aceptación legacy rechaza BUDGET_V2 y su tarjeta no ofrece acciones legacy. Alcance: NEW_LEGACY_CREATION_REDIRECT + V2_ACCEPTANCE_GUARD.

El configurador P2 recibe context CATALOG/BUDGET. Catálogo conserva su copy; Presupuesto muestra Descripción para la propuesta, Planes ofrecidos y el aviso de que cambios se aplican sólo al presupuesto. Mantiene 18 planes, defaults C1 y NEXT_90_V1. El componente continúa sin IO Firebase/Storage ni conocimiento de persistencia de presupuesto.

## Opciones e identidad

Cada opción nace con crypto.randomUUID, opaco y estable. Incorporar/editar usa buildBudgetOptionV2; edición conserva optionId, duplicación crea otro y eliminación no reindexa identidades. El orden visual se mantiene, sin sumas de cuota/costo/total entre alternativas. Una opción conserva todos los planes habilitados; no exige plan único ni define contrato. Referencia existente se copia a un draft independiente; ninguna edición de ese draft actualiza productos ni catalogo_publico. Referencia nueva es válida con referenceId=null, sin ficha privada obligatoria.

Nombre, DNI/CUIL, WhatsApp y localidad se copian en clienteSnapshot. Las salidas emitidas usan ese snapshot y la versión guardada. No vuelven a consultar productos para importes o presentación histórica.

## Persistencia privada y concurrencia

API `/api/admin/presupuestos-v2` verifica Admin en GET y POST. El servicio transaccional utiliza `presupuestos_v2/{budgetId}` para metadata de familia; `versions/{version}` para versión completa y `commands/{commandId}` para resultado durable. Son documentos privados bajo el catchall Admin-only vigente. No incrusta campos internos nuevos en solicitudes legibles por titular; no requiere cambiar Rules. Admin SDK omite Rules, por lo que el endpoint valida la autorización antes de invocar el servicio.

Una transacción verifica solicitud existente, origen completo, revisión esperada y estado. Guarda sólo el documento de esa versión; no reemplaza arrays de otros presupuestos. Compare-and-swap de revision evita lost updates: una sesión obsoleta recibe conflicto. CommandId estable más digest del comando evita duplicados/reintentos con contenido distinto. UI bloquea doble clic y conserva el mismo comando mientras una respuesta está pendiente/fallida. El ID de familia persiste durante el intento; reabrir datos obsoletos requiere recargar explícitamente.

El servidor valida snapshots al guardar (sin catálogo vivo), no acepta planes manipulados ni fuentes fuera de dominio. Emitir carga la versión persistida, rechaza cambios locales sin guardar y congela issuedAt/estado/revision. No recalcula al emitir ni al crear revisión. Emisión repetida con el mismo commandId devuelve el resultado original; otro comando no puede escribir sobre EMITIDO. Crear revisión exige versión emitida, incrementa lastVersion una vez y copia snapshots independientes a GENERADO, con revisionOf. Una versión posterior ya existente impide crear otra revisión paralela desde la anterior. La versión original permanece intacta.

## Alta privada opcional

Default OFF: guardar no escribe productos. ON sólo para NEW_REFERENCE: ID privado SHA256 de la tupla budgetId/optionId; create-if-absent con buildCatalogReferencePrivatePatch C3, activo=false y publicado=false. Guarda origen verificable. Retry o siguiente revisión reutiliza el ID sólo si coincide origen; una colisión ajena falla cerrado. Nunca sobrescribe una ficha que haya sido editada, su stock o sus flags. Alta privada y presupuesto se confirman en la misma transacción; no hay publicación ni llamadas C2.

El referenceId confirmado se vincula al snapshot sin reconstruir nombre, descripción, imágenes ni importes desde productos. La relación persiste como trazabilidad; el presupuesto sigue dependiendo de sus snapshots, no de la ficha viva. Duplicar una opción no duplica implícitamente el pedido de alta privada.

## Imágenes y salidas cliente

URLs y archivos hasta cuatro, con callbacks del configurador y validación antes de uploads. Se reutiliza el helper de referencia C3: Storage no está emulado y el helper rechaza uploads en demo. Tests sólo usan URL de logo local. No se cambiaron Storage Rules ni se realizaron uploads reales. Continúan las limitaciones legacy del helper de imágenes (fallback Data URL/posibles huérfanos); no se implementa limpieza de objetos ni documentos personales.

BudgetClientV2 es una allowlist comercial explícita que reutiliza toClientBudgetOptionV2. PDF/WhatsApp sólo se habilitan tras EMITIDO y leen fecha/cliente/opciones/planes de esa versión. No incluyen costo, proveedor, factores, SKU/EAN, stock, margen, TNA ni mora. No generan cuota combinada o total agregado. Los textos públicos se refieren a gestión de compra, alternativas y cuotas estimadas, con disponibilidad a confirmar.

PDF V2 separado de los PDFs legales: pagina líneas de todas las opciones/planes y puede incorporar la imagen principal por opción. URLs comerciales se intentan cargar sin credenciales, con timeout/tamaño/MIME acotados; si no se puede decodificar una imagen, conserva el contenido textual. URL congelada no garantiza bytes inmutables de una imagen remota, limitación ya identificada en P1. Preparar WhatsApp muestra el texto generado; abrir wa.me sólo prepara un mensaje, sin afirmar entrega ni cambiar el presupuesto a otro estado.

La allowlist de claves no detecta información interna escrita en texto libre: sigue siendo necesaria revisión comercial del nombre/descripción antes de emitir. No se comparten URLs de documentación personal. No se exponen snapshots raw mediante una API pública.

## Pruebas y evidencia

Pruebas nuevas:

```sh
npx tsx scripts/testBudgetV2.ts
# Con hosts locales, proyectos demo y guarda previa:
npx tsx scripts/testBudgetV2Emulator.ts
npx tsx scripts/runBudgetV2Browser.ts
```

Modelo: 1/3 opciones, edición/duplicación/eliminación con identidad, planes completos, DTO sin datos internos y PDF/WhatsApp con cuatro filas de planes sin suma. Emulador: alta privada OFF/ON, retry, reutilización sin overwrite, colisión ajena, fuente completa, inmutabilidad, revisión, dos saves concurrentes y ausencia de cambios en solicitudes/catalogo_publico. Browser: desktop 1280x800/mobile 390x844 con referencia existente+nueva, guardado, reapertura, emisión, PDF/WhatsApp, revisión y alta privada sin publicación. El helper Chrome recibe retry acotado sólo para limpiar su perfil temporal; no se eliminan assertions ni se convierte una excepción en PASS.

Regresión C1, C3 pura/Emulator/browser y test:safe (pricing, manuales, routing/lifecycle, ledger y guardas) conforme CODEX_RUNTIME. Todos los tests de escrituras usan demo-cuenta-hogar con Auth 9099/Firestore 8080; ningún test usa producción ni Storage real. Capturas en `/tmp/cuenta-hogar-p3/`, seis vistas mínimas solicitadas. Los resultados de ejecución se informan al entregar; esta descripción por sí sola no acredita PASS.

ESLint completo del archivo legacy Validaciones conserva **146 errores y 17 warnings previos**, medidos contra el archivo exacto de la base fija `f2d4d061ce41086d3a4c559462fb54e120ab0454` con el mismo ESLint/configuración y comparados por regla/mensaje/severidad. No se desactivan reglas ni se limpian áreas ajenas para ocultar deuda. El resultado completo debe reportarse como FAIL preexistente aunque los módulos nuevos pasen. La comparación final y el resto de gates se informan al entregar.

## Límite P4

P3 no implementa aceptación, preferencia de plan, Documentación, Contrato, Pagaré, Remito ni Entrega. V2 se almacena separado y además se rechaza expresamente en aceptación legacy. La aceptación futura elegirá exactamente una opción y podrá registrar preferencia opcional; el plan contractual definitivo pertenece a confección de contrato. Ningún Guardar/Emitir publica una referencia, crea deuda o salta etapas. No hay migración ni recálculo de históricos.

## Resultado final de esta ejecución

PASS: modelo, inmutabilidad, DTO cliente, PDF/WhatsApp, persistencia Emulator, browser P3 desktop/mobile (incluida edición y guardado legacy con escrituras exclusivamente demo), C1, C3 pura/Emulator/browser, test:safe, TypeScript, build y diff check. Se revisaron las seis capturas solicitadas. El browser C3 se reejecutó después de corregir una fixture de colisión incompleta que contaminaba el listado demo; no se cambió Catálogo para acomodar esa fixture.

ESLint completo: FAIL por los 146 errores históricos de Validaciones; 0 errores nuevos en la comparación diferencial. Los demás archivos P3 pasan ESLint. No se presenta este gate como PASS ni se desactivan reglas. El primer commit P3 fue publicado para revisión. La corrección se versiona por separado; no se realizaron PR/merge/deploy, cambios de Rules, uploads reales ni mutaciones productivas.


## Corrección de alcance en Validaciones

Alcance final: NEW_LEGACY_CREATION_REDIRECT + V2_ACCEPTANCE_GUARD. Los ocho hunks corresponden exclusivamente a la redirección defensiva de nueva confección, su acción de entrada antes del borrador legacy y las guardas V2 en aceptación, tarjeta y selección de presupuesto aceptado para el circuito legacy. No cambian payloads, estados ni cuerpos históricos de edición, PDF, WhatsApp, aceptación/rechazo o contrato; la suite compara esos handlers con el SHA fijo de base P3 y ejecuta sus salidas con dependencias simuladas.

Regresión de navegador en emuladores demo: desktop 1280x800 y mobile 390x844 PASS. Comprueba enlace con colección/ID explícitos, llegada a V2 sin escritura legacy, carga de edición histórica, cambio de notas y guardado, WhatsApp, PDF, rechazo, aceptación y ausencia de controles legacy para V2. La fixture adversarial que incluye un marcador V2 en un array legacy queda aislada de las otras pruebas; V2 real continúa en su colección separada. La prueba navega por los enlaces de la aplicación con la sesión autenticada. Todos los gates funcionales se mantienen. TypeScript, test:safe, build y diff check PASS; ESLint diferencial conserva 146 errores históricos y añade 0.


## Corrección post-commit: edición histórica y frontera runtime

El comando del servidor admite exactamente action, commandId, budget, expectedRevision y privateOptionIds. Rechaza claves extra, tipos incorrectos, revisión negativa, identidades inválidas y duplicados. SAVE, ISSUE y REVISE validan el mismo schema completo antes de acceder a Firestore; un cast TypeScript no sustituye esa validación.

Las allowlists son exactas en BudgetV2, clienteSnapshot, opción, referenceSnapshot y cada plan ofrecido. Cliente exige cinco strings acotados; referencias validan tipos, límites, mapas de planes 1–18, fechas ISO UTC e identidad de origen. El snapshot completo se reconstruye con los builders P2 y se compara canónicamente, incluyendo campos comerciales/internos y mapas; no se acepta sólo porque coincidan sus cuotas. No se modificaron P2, C1, motores ni defaults.

EXISTING_REFERENCE requiere referenceId válido. NEW_REFERENCE admite null o únicamente el SHA256 determinístico de budgetId/optionId. Un enlace no-null también exige que exista la ficha con originBudgetId/originOptionId coincidentes. Esa comprobación no toma importes de productos: el presupuesto conserva su snapshot. Se validan asimismo versiones persistidas y resultados idempotentes antes de reutilizarlos. El alta opcional sigue OFF por defecto, create-if-absent, sin overwrite ni publicación y con colisión ajena cerrada.

La API sólo expone mensajes controlados de dominio. Errores inesperados de SDK/Firestore/JSON devuelven “No se pudo completar la operación.”, sin stack ni rutas internas; GET también sanitiza fallos inesperados. No se expone información administrativa mediante salidas cliente.

Los tests adversariales cubren claves extra en los seis niveles, tipos/duplicados, ID arbitrario NEW rechazado, ID determinístico permitido sólo con confirmación de origen y EXISTING sin ID rechazado. La persistencia verifica que los rechazos no escriben. El test diferencial compara mapping, apertura y payload de guardado histórico con la base fija P3; navegador verifica edición real de notas, conservación de ID/importes, PDF/WhatsApp y solicitud pendiente dirigida a V2 con origen exacto. Validaciones permanece sin nuevos hunks.
