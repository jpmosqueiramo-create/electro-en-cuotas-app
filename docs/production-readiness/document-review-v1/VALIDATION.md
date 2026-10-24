# Validación de la integración documental

Baseline remoto comprobado: `97c9bc0bc3095d95b6d68d2971888336bf3c176e`. PR #81 actualizado sobre su rama existente; no merge, deploy ni acceso de escritura a producción.

## Resultados ejecutados

| Control | Resultado |
|---|---|
| SHA-256 de los originales mandato V3 y pagaré | PASS; coinciden con el inventario previo |
| Reconstrucción íntegra y ordenada del texto original | PASS; transcripciones históricas intactas |
| `npx tsc --noEmit` | PASS |
| ESLint diferencial sobre los 17 archivos TS/TSX modificados/nuevos | PASS; sin diagnósticos, sin tocar reglas |
| `npm run build` | PASS; Next 16.2.1, Turbopack y manifiesto de 25 fuentes/dependencias |
| `npm run test:safe` | PASS; siete suites: runtime guards, pricing, pricing-flow, budget-routing, manual-budget, ledger, auth-guard |
| `testOriginalDocumentIntegrationEmulator.ts` | PASS, 6 grupos: servidor real de preview, reproducción idéntica, cero escrituras de lectura, conciliación, validación de política, autorización/replay/conflicto, texto fuente |
| `testProductionAdapterEmulator.ts`, `SYNTHETIC_ORIGINALS_SUITE=1` | PASS, 30 grupos con la nueva plantilla y política exclusivamente sintética |
| Misma suite, `SYNTHETIC_ORIGINALS_SUITE=0` | PASS, 30 grupos para el paquete anterior sin los nuevos campos opcionales |
| `testOperationDraftDocuments.ts` | PASS; proyección económica, planes de 1 a 18, datos faltantes y guardas |
| `testOperationDraftDocumentsEmulator.ts` | PASS; autorización administrativa, acceso cruzado, identidad/conformidad, updateTime inalterado, sin numeración/snapshot/Storage al consultar |
| `testProductionAdapterBrowser.ts` | PASS; desktop/mobile, tres perfiles, emisión privada, entrega, pago, reversa y recuperación por autorización vencida |
| `runOperationDraftDocumentsBrowser.ts` | PASS; tres vistas previas desktop/mobile, errores seguros, cambios sin guardar excluidos, revisión actualizada e identidad/conformidad bloqueantes |
| `testOriginalDocumentReview.py` | PASS, 63 comprobaciones: texto nativo, hashes, identidad societaria, cláusulas, branding, importes, 12 filas y límites de página |
| Inspección visual del paquete entregado | PASS; 5 páginas: mandato 3, pagaré 1, remito 1. Sin cortes, superposiciones ni desbordamiento; espacios de firma vacíos |
| Catálogo `finalPackages.json`, configuración, Rules, Auth productivo | Sin cambios; catálogo vacío, sin aprobación ni habilitación real |

Los grupos del adaptador cubren congelamiento concurrente, un número/snapshot/pagaré, archivos privados inmutables, recuperación P1, revocación, hashes y generaciones Storage, tres firmas, custodia y originales incluso después de entrega, activación financiera única, pagos parciales/completos, reversas, comisiones, recibos, invitaciones y aislamiento por UID. Las referencias históricas conservan sus hashes; un renderer antiguo no se usa para nuevas emisiones.

## Caso económico y navegador

- Capital persistido: **$580.000**; servicios brutos con IVA incluido: **$1.160.000**; total contractual y pagaré: **$1.740.000**.
- **12 cuotas de $145.000**, del 05/12/2026 al 05/11/2027 en la muestra documental. El renderer transcribe las filas guardadas, sin recalcular.
- Pago sintético de **$145.000**: saldo **$1.595.000** en Administración, cliente y vendedor afiliado. Reversa: **$1.740.000** en los tres.
- La clasificación original/CFT y punitorio utilizados para ejecutar el adaptador son valores **explícitamente sintéticos de prueba**, no una propuesta comercial ni una aprobación real. En los PDF entregados esos datos no aprobados permanecen pendientes.
- El navegador integral usa el harness existente: Next real y exports reales de rutas HTTP en un proceso local con capacidad opaca de test. No se agregó endpoint ni bypass productivo. La suite de preview usa directamente Next local.
- Capturas en [screenshots](screenshots/), resumen de solicitudes/estados en [browser-results.json](browser-results.json). No contienen sesiones ni datos de clientes reales.

## Reproducción segura

Ejecutar desde esta rama con `GCLOUD_PROJECT=demo-cuenta-hogar`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cuenta-hogar`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`, `FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199` y bucket demo. Definir `NEXT_PUBLIC_ADMIN_EMAIL=production-review-admin@example.test` para el adaptador; las suites de preview establecen su administrador sintético existente. Sin ADC, service accounts, claves ni tokens productivos. Los runners de navegador fuerzan las variables públicas E2E del cliente local.

Usar una instancia fresca de Auth/Firestore/Storage por suite para evitar colisiones de fixtures:

```sh
node_modules/.bin/firebase emulators:exec --project demo-cuenta-hogar \
  --config firebase.operations-lab.emulator.json --only auth,firestore,storage \
  'SYNTHETIC_ORIGINALS_SUITE=1 node_modules/.bin/tsx scripts/testProductionAdapterEmulator.ts'
```

La configuración existente se reutiliza sólo para levantar los tres emuladores; no se desarrolla ni activa otro laboratorio. Sustituir el comando interno por cada suite indicada en la tabla. Para el paquete anterior usar `SYNTHETIC_ORIGINALS_SUITE=0`. Para navegador se utilizó `LOCAL_BROWSER_WEBPACK=1`; selecciona el backend de desarrollo documentado de Next y no altera el build productivo, que pasó con Turbopack.

La generación entregable procede de `testOriginalDocumentIntegrationEmulator.ts`, mediante `readOperationDraftDocuments` real. Dos consultas de la misma revisión producen bytes idénticos y mantienen las fechas de actualización de presupuesto, Acceptance y borrador. `output/pdf/document-review-v1/manifest.json` conserva hashes de originales, candidato, versiones, renderer, recursos, proyección y archivos. Tipografía PDF Helvetica nativa; recursos y dependencias bloqueados por el manifiesto. Render visual con pypdfium2; comprobación de texto y geometría con pypdf/pdfplumber.

## Incidencias y límites registrados

- Dos intentos de navegador se interrumpieron por `ENOSPC` local. Se liberaron únicamente cachés regenerables de Next y se reejecutó el recorrido completo con éxito; no se eliminaron documentos ni assertions.
- El fixture usaba el día local de emisión como fecha de pago; después de las 21:00 de Argentina difería del día UTC que emplea el ledger existente. Se corrigió sólo la fecha sintética del test para respetar esa política. Las fechas de emisión continúan usando `America/Argentina/Buenos_Aires`; no se cambió el motor financiero.
- El listener legacy de alertas de la página Hoy registra una denegación Firestore con el administrador sintético (`src/app/admin/page.tsx:42`), que no coincide con el correo de las Rules existentes. No se relajaron Rules; las APIs y permisos del circuito probado pasaron. No se declara que ese listener haya pasado ni que no existan mensajes de consola.
- Los rechazos HTTP por rol, identidad, conformidad, texto no soportado y archivos alterados son escenarios negativos esperados, no aprobaciones omitidas.
- No se comprobó autenticidad externa de la documentación societaria. Las fotos se examinaron sin publicarlas; facultades completas y reforma de domicilio siguen pendientes.
- No se consultó el contador CH productivo ni se presupone su valor. Su inventario, inicialización y cualquier emisión requieren autorización independiente.
- Estas pruebas validan funcionamiento técnico con datos sintéticos. **No constituyen aprobación jurídica ni autorización comercial.**

El script local protegido `scripts/testBudgetV2HttpIdempotency.ts` conserva SHA-256 `09fb398ff9c634f7c5ca32a3769518dbde67d8ebca3f1f59a930ccdfe6340881` y queda fuera del commit, al igual que los logs locales. Cero escrituras productivas, nuevas cuentas reales, documentos finales reales, cambios de configuración o emisión ARCA.
