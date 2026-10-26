# Validación de integración final

Base comprobada: `f0254b7321bcf0fafa1cbbfeb45b9c5640f4fe7f` (main remoto). Catálogo reproducible: `e10550ef23e324c9972eb5a6a3a361a70483f4c855b3b8f0ea8d46d9086f548c`.

| Comprobación ejecutada | Resultado |
| --- | --- |
| `npx tsc --noEmit` | PASS |
| ESLint diferencial de todos los TS/TSX modificados | PASS, sin diagnósticos |
| `npm run build` (Next 16.2.1, Turbopack) | PASS |
| `npm run test:safe` | PASS |
| `node --import tsx scripts/testOwnerFinalCatalog.ts` | PASS: SHA de ambos originales, cobertura del texto completo, sustituciones explícitas, reproducibilidad, bloqueo de preview |
| `node --import tsx scripts/testProductionRendererManifest.ts` | PASS: 26 archivos, bundles minificado/no minificado |
| Propuestas históricas ZeroPenalty, CreditorPayment, ClientPaymentPlace | PASS: PDFs históricos sin cambios |
| `testOriginalDocumentReview.py` | PASS: 63 comprobaciones históricas |
| `testProductionAdapterEmulator.ts` con paquete instalado, propietario y entrega externa | PASS: 32 grupos, aislamiento, permisos, concurrencia, recuperación, emisión única, cuotas/pagos/reversa y sustitución de archivo |
| `testOriginalDocumentIntegrationEmulator.ts` | PASS: 6 grupos, preview real de servidor sin modificar fuentes ni consumir números |
| `testProductionAdapterBrowser.ts` con `SYNTHETIC_OWNER_APPROVAL_FOCUS=1` | PASS: Next y handlers reales, aprobación/autorizar/congelar/emitir en 1280 y 390 px |
| Inspección visual de PDFs sintéticos | PASS: mandato 3 páginas con logo; pagaré 1 página sin logo; todas las páginas revisadas |

Todas las suites Firebase se ejecutaron con proyecto `demo-cuenta-hogar`, Auth 9099, Firestore 8080 y Storage 9199, sin credenciales productivas. El CH-000001 visible en evidencias corresponde exclusivamente al contador del Emulator. No se ejecutó una emisión real, aprobación real ni cambio de configuración.

El runner de navegador fue acotado a la integración documental afectada; no se atribuye a esta corrida una nueva prueba visual de pagos ni de los tres portales. Los motores de entrega/finanzas se ejercitaron en los 32 grupos de Emulator.

La prueba histórica V3 detectó que su manifiesto archivado guardaba un rendererHash anterior. Se conservó el archivo y se agregó comprobación de su SHA completo (`8ab3b546e1fcf2d6ccf47775d5b073678048d69b795bc0fc24322c7e5bc5da58`), comparando el resto del manifiesto y los bytes PDF exactamente. El hash del renderer actual se verifica separadamente. No se regeneraron históricos ni se quitaron comprobaciones económicas.

La publicación sigue pendiente del merge manual y revisión del SHA resultante. No se incorporó `scripts/testBudgetV2HttpIdempotency.ts`, ni logs, configuración, Rules o el trabajo pendiente del PR #88.
