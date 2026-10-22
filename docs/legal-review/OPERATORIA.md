# Operatoria auditada y procedencia

**BORRADOR — NO VÁLIDO PARA FIRMA. Revisión jurídica pendiente.**

## Secuencia real y límites

Consulta simplificada → presupuesto emitido y alternativa aceptada → operationId explícito → formulario privado de datos personales/laborales → revisión y aplicación administrativa → identidad y documentación verificadas → evaluación crediticia manual por operación → preparación de condiciones y cronograma → conformidad cuando cambian condiciones materiales → revisión técnica READY.

READY no significa firma ni aprobación jurídica. Proveedor y logística pueden gestionarse después de una Acceptance válida, sin exigir formalización. La compra y factura para producto nuevo se proyectan por cuenta y orden del cliente. Retiro, recepción, custodia y programación tienen fechas previstas y reales separadas. La entrega requiere tres firmas físicas, evidencia privada y custodia de originales. Su cierre, activación y cobranza están limitados a Emulator; no son capacidades productivas aprobadas. El ledger de ensayo consume el snapshot congelado sintético y registra pagos acreditados, imputaciones y reversas, sin modificar el plan original.

## Matriz de origen / destino

| Campo | Fuente canónica actual | Destino de revisión y regla |
| --- | --- | --- |
| Sociedad | `contractDocuments/legalEntity.ts` | Ambos documentos; datos confirmados por propietario, representación pendiente |
| Identidad operativa | `operationV2.ts`, Budget/Acceptance | Vínculos explícitos; nunca unir por nombre/DNI |
| Cliente | `ContractDraftV2.personalData`, `employmentData.cuil` | Misma revisión guardada; no incluir ingresos/documentos privados innecesarios |
| Producto | `Acceptance.optionSnapshot.referenceSnapshot`, cotejado con Budget y Draft | Nombre/descripción; nunca catálogo vivo |
| Cantidad/condición | `ContractDraftV2.productDetails` | Nulos históricos permanecen pendientes; condición no inferida |
| Capital/servicios/total | `ContractDraftV2.economicTerms` | Transcripción exacta, sin recálculo PDF |
| Cuotas/fechas | `paymentScheduleDraft` y primera fecha persistida | Todas las filas, sumas y correspondencia validadas |
| Snapshot definitivo | `ContractSnapshotV2` únicamente cuando exista emisión habilitada | Hoy no se fabrica para previews; la proyección usa Draft guardado |
| Identidad/conformidad | `operationDraftServer.ts` y revisiones vinculadas | Bloquean previews si incompatibles o pendientes |
| Documento | `operationDraft.ts`, `operationDraftPdf.ts` | Una proyección/revisión común, hashes de fuente/proyección/plantilla/render/PDF |
| Firmas/originales | `operationDeliveryV2.ts`, `operationDeliveryV2Server.ts` | Tres documentos y custodios; cierre sólo Emulator |
| Pagos | `operationFinancialV2Server.ts` | Sólo simulación habilitada; no crear deuda desde el pagaré |

`operationDraft.ts` verifica sumas e integridad; no es un segundo motor de precios. `economicTerms` ya contiene las condiciones guardadas; la referencia de revisión no es un snapshot productivo congelado. Moneda, datos de proveedor/factura y lugares pendientes no se inventan.

## Referencias históricas

`docs/OPERATION_CONTRACT_DRAFT_PREVIEWS.md` registra los PDF originales: mandato V3 de 3 páginas y pagaré de 2, sus hashes y diferencias. Su título de archivo no acredita razón social. No se confunden con formatos anteriores de 2/1 páginas.

`src/lib/pdfGenerator.ts`, `src/app/propuesta/page.tsx`, `src/app/firmar-contrato/[id]/FirmarContratoClient.tsx` conservan datos y redacciones legacy distintos. No son fuentes para este paquete ni se reactivan. No se transfieren irrevocabilidad, exención general, anticipo, punitorios o jurisdicción legacy.

La observación histórica de cantidad/condición no disponibles en la documentación de PR #67 fue superada por Etapa 1: actualmente existen en `productDetails`, con compatibilidad para borradores que los omiten. No se modifica la documentación histórica para simular que existían antes.
