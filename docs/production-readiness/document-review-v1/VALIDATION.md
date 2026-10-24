# Validación del paquete propuesto

Baseline comprobado contra main remoto: `97c9bc0bc3095d95b6d68d2971888336bf3c176e`.

| Control ejecutado | Resultado |
|---|---|
| Cotejo SHA-256 de ambos PDF originales en Downloads contra el inventario histórico | PASS; hashes coincidentes |
| Lectura e inspección visual de las 3 páginas originales del mandato y 2 del pagaré | PASS |
| Reconstrucción completa y en orden de las transcripciones originales desde los bloques del catálogo | PASS |
| Preparador offline: sociedad canónica, fixture sin firma/aceptación/número, sumas y cronograma coherentes | PASS |
| `npx tsc --noEmit` | PASS |
| `npx eslint scripts/prepareOriginalDocumentReview.ts` | PASS, sin diagnósticos |
| `npm run build` | PASS; Next 16.2.1 Turbopack, compilación y páginas completadas |
| Manifiesto del renderer productivo (`prebuild`) | PASS, 17 fuentes/dependencias; no se regeneró ni modificó |
| `testOriginalDocumentReview.py` | PASS, **68 comprobaciones** |
| Segunda generación en directorio temporal independiente | PASS, los 3 PDF y el manifiesto idénticos byte a byte |
| Logo oficial por SHA, logo en todas las páginas de mandato/remito y cero imágenes en pagaré | PASS |
| Texto nativo seleccionable, cláusulas renderizadas completas, aviso en cada página, ausencia de CH/CUIT obsoleto | PASS |
| Capital $580.000 + servicios brutos $1.160.000 = total $1.740.000; mismo total en pagaré | PASS |
| Doce fechas exactas e importes de $145.000 transcritos al mandato | PASS |
| Competencia del pagaré pendiente independiente de la jurisdicción del mandato | PASS |
| Inspección visual de las **6 páginas propuestas**: mandato 4, pagaré 1, remito 1 | PASS; sin cortes, superposiciones ni texto fuera de página; firmas vacías con espacio |
| Nuevos documentos cargados en Firebase, firmas reales, numeración o aprobación jurídica | **No realizados** |

## Reproducibilidad

Entorno de la generación inspeccionada: Python 3.12.14, ReportLab 4.4.9, pypdf 6.10.0, pdfplumber 0.11.9, Pillow 12.3.0. Tipografía PDF estándar Helvetica con texto nativo. Logo original intacto; mismo encuadre de `pdfBranding.ts`. Renders visuales a 1,45× mediante pypdfium2.

Los hashes completos están en `output/pdf/document-review-v1/manifest.json`. Los scripts usan únicamente archivos locales. No se ejecutaron operaciones de Firebase ni se importaron credenciales. No se repitieron las suites integrales de Emulator/finanzas/entrega ya aprobadas: ningún motor, ruta, schema productivo, permiso o comportamiento financiero cambió.

El catálogo candidato no está conectado a las rutas productivas ni a la UI de aprobación. Los tests de artefactos no prueban la futura emisión de estas plantillas con el renderer productivo: esa integración y su cotejo exacto están explícitamente descritos como paso posterior a resolver los pendientes documentales. Tampoco constituyen validación jurídica.

El script local protegido `scripts/testBudgetV2HttpIdempotency.ts` conserva su SHA-256 `09fb398ff9c634f7c5ca32a3769518dbde67d8ebca3f1f59a930ccdfe6340881` y queda fuera del commit. El log local preexistente tampoco se incorpora.
