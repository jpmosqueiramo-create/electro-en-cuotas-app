# Integración final: inventario y habilitación

Base `b95395fbe678de2033f46d078449e2eae7448808`. PR #73 mergeado. Se conserva `scripts/testBudgetV2HttpIdempotency.ts` local y sin versionar.

## Declaraciones y verificaciones

El titular declara aprobación profesional de «la última» versión de mandato y pagaré y confirma a LOOP como responsable inscripto en IVA. No informó fecha de aprobación, profesional, referencia, evidencia ni identificación inequívoca del archivo aprobado. No se atribuye aprobación verificable al texto del generador, a las propuestas de docs/legal-review ni a los originales históricos. No se completan representación, jurisdicción o lugares por inferencia.

La condición tributaria informada no verifica la inscripción ante ARCA, la habilitación de comprobantes/punto de venta ni las alícuotas de la operación. El capital por mandato y la distribución del importe agregado Servicios de Cuenta Hogar requieren criterio contable confirmado. No se descompone ni recalcula el snapshot.

## Inventario

| Módulo | Fuente vigente | Estado y brecha |
| --- | --- | --- |
| Solicitud, presupuesto, Acceptance | publicSolicitudService, budgetV2Persistence, budgetAcceptanceV2Server | Existente; no generar otra identidad/deuda |
| Borrador y READY | contractV2Server, contractReadyV2 | Existente: revisión, conformidad, producto, economía y calendario |
| PDF actual | contractDocuments/operationDraftTemplates.ts y operationDraftPdf.ts | Borrador, texto con pendientes; mandato con logo, pagaré sin logo |
| Referencias históricas | contractDocuments/templates.ts, pdf.ts | REFERENCE_FORMAT_REVIEW_V4; no equivalen a versión jurídica aprobada |
| Propuestas jurídicas | docs/legal-review | Material para revisión; no modifica las plantillas ni acredita firma profesional |
| Snapshot/numeración | contractFreezeIntegrationEmulator | Sólo puente demo; no habilitar contador productivo |
| Entrega | operationDeliveryV2Server | Tres firmas, evidencia y originales; sólo cierre demo |
| Activación financiera | operationFinancialV2Server | Snapshot + entrega + aprobación sintética; no existe activación real autorizada |
| Cuotas/pagos/reversas | operationFinancialV2 | Una fuente financiera; FIFO y calendario conservados |
| Comisiones | operationCommissionV2Server | Fuente separada de deuda del cliente; no cambiar política |
| Tres portales | OperationFinancialWorkspace | Componente y endpoints autorizados comunes; no tres saldos locales |
| Cliente ACTIVE | operationClientV2Server | Revocación explícita incorporada; rehabilitación futura no automática |
| Fiscal | financialEngine.ts legacy menciona IVA fijo | No reutilizar ese supuesto para V2; nuevo modelo explícito sin tasas por defecto |

## Condiciones de habilitación gradual

1. Asociar aprobación profesional al hash exacto del texto de cada instrumento y completar datos formales pendientes.
2. Confirmar por contador la condición fiscal, conceptos, bases, tasas/exenciones, vigencia, receptor y clases/puntos habilitados; definir si los servicios persistidos incluyen impuestos. No modificar el total aceptado por una regla fiscal nueva.
3. Revisar por separado los adaptadores de emisión, firma/entrega, invitación y finanzas. Las fixtures de Emulator no son habilitaciones productivas.
4. Homologar ARCA sólo con autorización y credenciales de homologación; los mocks no prueban conformidad del webservice.
5. Autorizar cada habilitación productiva, efectuar preflight y rollout de SHA exacto. Ningún PR implica merge o deploy automático.

## Fuentes fiscales oficiales consultadas

- https://www.arca.gob.ar/facturacion/regimen-general/comprobantes.asp — clase según emisor/receptor y habilitación. RI: A para RI/monotributista, B para consumidor final/exento; C corresponde a emisores monotributistas/exentos, no a LOOP con condición declarada RI.
- https://www.arca.gob.ar/facturacion/comprobantes/fe-vs-cf.asp — modalidades de comprobantes.
- https://www.arca.gob.ar/fe/ayuda/documentos/wsfev1-RG-4291.pdf — manual técnico WSFE. El enlace consultado muestra revisión de diciembre de 2026; no se toma esa fecha futura como vigencia al 22/10/2026. Antes de integrar SOAP se debe fijar una versión vigente/homologada y consultar catálogos del servicio.

Estas fuentes no determinan por sí solas la calificación tributaria del mandato concreto. No se consultaron credenciales fiscales ni se emitieron CAE.
