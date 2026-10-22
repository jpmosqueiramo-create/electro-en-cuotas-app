# Vista previa contractual — corrección del HTTP 409

## Causa reproducida

Baseline: `28f0cf55bc0123f5a7e6da5220d767b2b5786459`, build productivo `build-2026-10-22-006`. Diagnóstico autorizado de la operación `7281f136…/1` mediante lecturas administrativas; no se guardaron datos personales, documentos ni tokens en fixtures o informes.

El presupuesto está emitido; IDs y versiones coinciden. La alternativa aceptada coincide íntegramente con la del presupuesto y su referencia coincide con la del borrador. El borrador está en DRAFT, sin condiciones económicas confirmadas ni cronograma. La identidad tiene verificación documental vigente y no existe conformidad pendiente. Esos campos incompletos ya admitían una proyección de borrador.

El renderer anterior rechaza `•` (U+2022), presente en la descripción de producto guardada. Reproducción local con las lecturas autorizadas: proyección correcta → `UNSUPPORTED_DOCUMENT_TEXT` en generación PDF. El catch de la ruta convertía cualquier excepción en HTTP 409, ocultando esta incompatibilidad técnica. No es un rechazo crediticio ni un requisito de aprobación jurídica.

Con la corrección, el pipeline completo ejecutado localmente sobre lecturas de la misma operación produce ambos PDF **sólo en memoria**, con `available: true` y `DOCUMENT_DATA_PENDING`. Los siete documentos leídos mantuvieron sus updateTime antes/después. No se reparó, sobrescribió ni migró el expediente. La consulta REST de diagnóstico no constituye una certificación de publicación: el endpoint desplegado seguirá con el código anterior hasta aprobar otro rollout.

## Cambio

- Se acepta el repertorio WinAnsi de la fuente existente, incluida la viñeta. NFC, CRLF y tabulaciones se normalizan exclusivamente en la copia destinada al render. No se modifica el texto jurídico ni se inventan importes.
- Los campos personales omitidos en estructuras históricas se presentan vacíos/pendientes sólo en la proyección. Tipos inválidos, valores malformados y discrepancias de origen siguen bloqueados.
- Los importes y fechas siguen siendo los persistidos; no se consulta catálogo vivo ni se recalcula el motor económico.
- Se conserva el hash del origen; el hash del renderer cambia al cambiar su implementación. No se alteran hashes, fechas ni documentos previamente persistidos.
- La UI muestra mensajes de una allowlist local, nunca texto arbitrario de excepciones o respuestas del servidor.

| Categoría | HTTP / disponibilidad | Comportamiento |
| --- | --- | --- |
| DOCUMENT_DATA_PENDING | 200, disponible | Ambos borradores con marcadores y lista de pendientes |
| DOCUMENT_IDENTITY_REVIEW_REQUIRED | 200, no disponible | Sin PDF; requiere revisión de identidad |
| DOCUMENT_CONFORMITY_PENDING | 200, no disponible | Sin PDF; requiere nueva conformidad |
| DOCUMENT_ORIGIN_INCONSISTENT | 409 | Rechaza vínculos, importes o cronograma inconsistentes |
| DOCUMENT_RENDER_FAILED | 500 | Falla técnica al producir PDF; sin resultado parcial |
| DOCUMENT_SERVER_ERROR | 500 | Falla inesperada de lectura/servidor, diferenciada del render |

Los bloqueos funcionales mantienen la semántica existente de `available:false`, ahora con categoría explícita. Las excepciones generan únicamente el evento administrativo `CONTRACT_DOCUMENT_PREVIEW_FAILED` y tres valores de vocabulario cerrado: code, stage y reason. Sin datos personales, contenido contractual, tokens, rutas documentales ni stack traces. Se mantienen autenticación administrativa y `private, no-store`.

## Verificación

- Unitarias: reproducción sintética equivalente (viñetas, CRLF, nombre con acento combinado, dirección con comillas), campos incompletos/omitidos, economía pendiente, cronograma ausente con/sin economía, histórico sin provincia/CP, identidad y conformidad bloqueadas, origen/cronograma inconsistente, caracteres no soportados y fallo de renderer.
- HTTP en Emulator: 200 con dos PDF y pendientes; replay determinista sin cambios de updateTime; categorías de identidad/conformidad; 409 de origen; 500 de render sin datos sensibles; autenticación y aislamiento en regresión existente.
- PDF: texto seleccionable y viñetas legibles; identidad societaria; valores pendientes; advertencia en cada página; sin número CH. Regresión de planes 1–18 y capital fraccional conserva importes/vencimientos.
- Browser local desktop 1280×900 y mobile 390×844: ambas vistas, pendientes, datos no guardados excluidos, revisión guardada actualizada, bloqueo por identidad, error de render, recuperación y conformidad pendiente. Sin Firebase externo ni Storage writes.
- TypeScript, ESLint de archivos modificados, `test:safe`, build, suites contractuales/documentales y paquete standalone local.

Comandos específicos:

```sh
npx tsx scripts/testOperationDraftPreviewErrors.ts
npx tsx scripts/testOperationDraftDocuments.ts
python3 scripts/verifyOperationDraftPreviewErrors.py
python3 scripts/verifyOperationDraftPdfs.py
```

Las suites Firebase exigen `demo-cuenta-hogar`, Auth 9099, Firestore 8080 y Storage 9199. Ejecutar `scripts/testOperationDraftPreviewErrorsEmulator.ts` junto con las regresiones documentales y contractuales mediante `firebase emulators:exec`. Navegador: `scripts/runOperationDraftDocumentsBrowser.ts`, sólo localhost + Emulator. No usar credenciales productivas.

## Publicación propuesta y límites

Un único PR desde main. Merge manual y rollout separados, pendientes de revisión. No hacen falta migraciones, cambios de Rules, índices, bucket, IAM, secretos o configuración. Tras merge, verificar el SHA exacto aprobado y ejecutar sólo bajo autorización:

```sh
npx firebase-tools apphosting:rollouts:create cuenta-hogar \
  --project negocio-facil-page --git-commit <SHA_MERGE_APROBADO>
```

Confirmar READY/SUCCEEDED, SHA y 100 % de tráfico. Smoke de lectura en la operación afectada: ambas vistas disponibles con pendientes, identificación societaria y advertencia, sin guardar ni formalizar. Recuperación de aplicación a build anterior sólo con autorización; no restaurar permisos inseguros ni modificar datos.

Limitación explícita: no se incorpora una fuente Unicode completa. Caracteres fuera del repertorio de la fuente (p. ej. emojis) se rechazan con `DOCUMENT_RENDER_FAILED`; no se eliminan o sustituyen silenciosamente. Mandato sintético con pendientes: 3 páginas A4; pagaré: 1. En móvil se abre el visor nativo por el enlace existente; el runner comprueba el PDF binario y ausencia de desbordamientos, y Poppler verifica el diseño independientemente del plugin PDF del navegador.

No se habilitan numeración CH, congelamiento, emisión definitiva, firmas, FORMALIZED, entrega ni cobranza productivas. La aprobación jurídica sigue pendiente. Script local `testBudgetV2HttpIdempotency.ts` preservado y excluido del PR.

## Evidencias y resultado

PASS: unitarias, HTTP Emulator, regresiones de documentos y contratos, extracción de texto PDF, browser desktop/mobile, TypeScript, ESLint diferencial, test:safe y build. La primera ejecución conjunta detectó una colisión del usuario administrativo sintético entre suites; el runner nuevo ahora inicia sesión si esa identidad ya existe, sin omitir assertions. La ejecución conjunta final pasó.

Evidencias exclusivamente sintéticas: [desktop](evidence/contract-preview-409/desktop.png), [mobile](evidence/contract-preview-409/mobile.png), [mandato](evidence/contract-preview-409/mandato-sintetico.pdf), [pagaré](evidence/contract-preview-409/pagare-sintetico.pdf) y [manifest](evidence/contract-preview-409/validation.json).
