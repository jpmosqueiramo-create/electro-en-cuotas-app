# Proveedor y logística de la operación V2

Base: `d783da87fc3cece5a37c8e6175559d55ff605ba2` (PR #39 integrado).

## Persistencia y autorización

Se conserva la identidad de PR #39, sin generar otra solicitud o contrato.

- Identidad: `presupuestos_v2/{budgetId}/contracts/v{version}/operation/identity`.
- Seguimiento: mismo directorio, documento `fulfillment`.
- Comandos: `fulfillment/commands/{commandId}`.
- Eventos: `fulfillment/events/{commandId}`.

La API Admin existente por presupuesto/versión se amplía con `/fulfillment`
(GET/POST). Cada comando exige operationId exacto y expectedRevision; el servidor
revalida Budget emitido, Acceptance, alternativa y registro de identidad.
No busca operaciones por DNI/email/nombre ni intenta otra colección con el mismo ID.
No requiere Draft abierto, READY o contrato formalizado para pedir al proveedor.

Se reutilizan verifyAdminAuth, contractRefs, validación de origen aceptado,
operationRef, encabezados privados y parser contractual acotado. El subárbol
contracts ya es server-only: cliente, vendedor afiliado y SDK admin cliente no
pueden leer/escribir tracking, comandos o eventos. No cambia ninguna Rule.

La ficha existente del confeccionador incorpora la sección; no hay nueva
navegación, portal público ni segunda bandeja logística. Costos y proveedor sólo
se devuelven a Administración autenticada. Las aceptaciones históricas sin
identidad registrada conservan una vista no editable; GET nunca migra datos.

## Datos

Producto, referencia y costo presupuestado se toman del snapshot de la opción
aceptada, no de productos ni del catálogo vivo. Son inmutables en tracking.
El costo real se confirma/actualiza por comando; la diferencia se calcula en
centavos para evitar errores de punto flotante. No altera Budget, Acceptance,
ContractDraft, planes, cronogramas ni ledger.

Se registran proveedor seleccionado (nombre explícito), referencia de pedido,
fecha real de pedido, disponibilidad estimada y confirmada, retiro previsto/real
y responsable, recepción real, ubicación/custodio, inspección visual,
observaciones, referencia de viaje/fecha prevista/transportista, destino,
entrega estimada y responsable. No se crea un maestro de proveedores, inventario
ni sistema de planificación de flota paralelo.

Las referencias de viaje son datos operativos, no prueba de salida o arribo.
Las fechas reales no admiten futuro y deben respetar retiro/recepción. Las fechas
planificadas no registran hechos reales ni hacen avanzar estados por sí solas.
Proveedor confirmado no puede sustituirse mediante una edición genérica.

## Estados y comandos

Proveedor:
`PENDIENTE_PEDIDO → PEDIDO_REALIZADO → CONFIRMADO → LISTO_PARA_RETIRAR → RETIRADO`.

- UPDATE_ORDER: proveedor/referencia/estimación/observaciones, sin transición.
- PLACE_ORDER: fecha real del pedido y proveedor obligatorio.
- CONFIRM_ORDER: costo real y disponibilidad confirmada.
- READY_FOR_PICKUP: exige llegar a la disponibilidad confirmada.
- UPDATE_AVAILABILITY: requiere motivo y vuelve explícitamente a CONFIRMADO;
  obliga a verificar de nuevo LISTO_PARA_RETIRAR tras una corrección.
- UPDATE_COST: requiere motivo; no cambia condiciones del cliente.
- CANCEL_ORDER: antes del retiro, con motivo; guarda estado previo.
- REOPEN_ORDER: restitución explícita del estado previo, con motivo auditado.

Logística:
`PENDIENTE_RETIRO → RETIRADO → RECIBIDO → VIAJE_PROGRAMADO → ENTREGA_PROGRAMADA`.

- PLAN_PICKUP no cambia estado ni fecha real.
- RECORD_PICKUP exige proveedor LISTO_PARA_RETIRAR y registra simultáneamente
  RETIRADO en proveedor y logística, fecha real y responsable.
- RECEIVE registra recepción/custodia/inspección, incluso con daños; si no hay
  conformidad visual abre automáticamente una incidencia.
- PLAN_TRIP exige recepción física e incidencias resueltas. Permite actualizar
  la programación del viaje mientras siga en VIAJE_PROGRAMADO.
- PLAN_DELIVERY exige viaje programado e incidencias resueltas. Reprogramar es
  otro comando auditable; no modifica fechas reales.

No hay saltos o retrocesos genéricos ni asignación arbitraria de estados.

## Incidencias, rechazo y firmas

REPORT_INCIDENT/RESOLVE_INCIDENT conservan descripción, actor/fechas y resolución;
las incidencias no resueltas bloquean avances de disponibilidad, retiro, viaje y
entrega programada. Se permite registrar recepción física para conservar custodia.

REJECT_DAMAGED registra fecha real, daños, ubicación y responsable de custodia;
lleva a EN_CUSTODIA_POR_RECHAZO. No entrega ni libera el producto. Tras resolver
incidencias, RESUME_FROM_CUSTODY requiere motivo y retorna explícitamente a
RECIBIDO, eliminando sólo la programación vigente para reprogramar. Los valores
anteriores quedan en eventos. No cancela ni modifica obligaciones financieras.

No existe acción de cierre V2, ni siquiera aportando booleanos de firma. La
entrega permanece BLOCKED_PHYSICAL_SIGNATURES_REQUIRED. La interfaz exige la
futura verificación de firmas físicas del cliente en mandato, pagaré y remito.
La formalización y custodia documental de originales siguen fuera del alcance.

## Atomicidad, historial y límites

Estado, recibo de comando y evento se escriben en una sola transacción. Un replay
idéntico del mismo actor devuelve el resultado original sin nueva revisión;
reutilizar ID con contenido/actor distinto falla. expectedRevision evita perder
cambios concurrentes. La UI bloquea doble clic y conserva el ID ante respuesta
perdida. Una falla antes del commit no consume revisión ni deja eventos huérfanos.

GET devuelve estado e historial de 30 eventos por página; `before` permite leer
los anteriores. Cada evento conserva action, data, actor, fecha, revisiones y
estados anterior/posterior. La UI ofrece cargar historial anterior.
Las incidencias se conservan en el estado (máximo 100); no se borran para ocultar
problemas. No se implementan recepción parcial, devoluciones físicas al proveedor,
órdenes múltiples, reserva global de stock o prueba de transporte efectivo.
Cancelación después de retirar no está habilitada: debe registrarse incidencia y
custodia hasta diseñar el circuito correspondiente.

## Legacy e implementación futura

Los handlers legacy pedido-proveedor/recepcion-mercaderia/preparar-entrega y
cierres en Validaciones alternan colecciones por ID, usan aceptación legacy y
algunos regeneran planPagos. Se conservan intactos para históricos; no se invocan
para V2. Se adaptan sus conceptos de recepción, guía, costo, transportista y
custodia al agregado V2, reutilizando infraestructura segura existente.
No se duplican sus escrituras ni se espejan estados en solicitudes antiguas.

La integración no modifica Rules, IAM, secretos, contratos históricos, ledger,
pricing, numeración CH, TERMS_FROZEN productivo, emisión definitiva ni FORMALIZED.
No realiza migraciones o despliegue; el código requiere revisión e integración.

## Pruebas

- testOperationFulfillmentV2: transiciones, estimaciones/hechos, costos decimales,
  fechas futuras/cronología, bloqueo de entrega e inyección de estados.
- testOperationFulfillmentV2Emulator: Acceptance obligatoria, no exigir contrato,
  replay concurrente/CAS/abort, snapshots intactos, custodia, incidencias,
  paginación, roles Admin/cliente/afiliado, aislamiento e históricos sin migrar.
- testContractFirestoreSecurity: incluye tracking, comandos y eventos en deny
  directo para todos los roles de cliente (también admin).
- Browser contractual reutilizado + testOperationFulfillmentV2Browser:
  recorrido hasta entrega programada, desktop/mobile, sin overflow, sin cierre
  ni conexiones Firebase productivas. Capturas en /tmp/cuenta-hogar-provider-logistics-v2/.
