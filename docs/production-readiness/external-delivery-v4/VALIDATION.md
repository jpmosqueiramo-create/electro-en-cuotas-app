# Validación ejecutada

Sólo datos sintéticos en `demo-cuenta-hogar`. No se hicieron lecturas ni escrituras comerciales productivas, inicialización de CH, aprobación jurídica real ni despliegue.

| Comprobación | Resultado |
|---|---|
| TypeScript `npx tsc --noEmit` | PASS |
| ESLint diferencial, incluyendo archivos nuevos | PASS |
| `npm run build` y manifiesto del renderer | PASS |
| `npm run test:safe` | PASS |
| `node --import tsx scripts/testCreditorPaymentProposal.ts` | PASS: textos, hashes, invariantes y dos PDF reproducibles |
| `testOriginalDocumentIntegrationEmulator.ts` | PASS, 6 grupos |
| `testClientPaymentPlaceEmulator.ts` | PASS, 8 grupos: compatibilidad V3 histórica y conformidad vigente del preview actual |
| `testProductionAdapterEmulator.ts`, política histórica | PASS, 30 grupos |
| `testProductionAdapterEmulator.ts`, `SYNTHETIC_EXTERNAL_DELIVERY_SUITE=1` | PASS, 31 grupos |
| `testOperationDeliveryV2Emulator.ts` | PASS: firmas, daños, devolución, custodia, concurrencia e historia |
| `testProductionAdapterBrowser.ts`, `SYNTHETIC_EXTERNAL_DELIVERY_SUITE=1` | PASS: circuito HTTP/navegador desktop/mobile, tres perfiles, entrega, pago y reversa |
| Inspección visual de todas las páginas PDF | PASS: mandato 3 páginas, pagaré 1; sin texto cortado ni superpuesto |
| Extracción nativa de texto y conteo de imágenes | PASS; `output/pdf/document-review-creditor-payment-v4/text-verification.json` |
| Catálogo definitivo y archivos históricos | Sin instalación ni reescrituras |
| Numeración productiva | No consultada ni modificada en esta tarea; no se consume ni reinicializa |

El recorrido externo verifica documento de otro snapshot rechazado, acceso no administrativo rechazado, ausencia de constancia o firma rechazada, custodia posterior, activación única, $145.000 acreditados y saldo $1.595.000 idéntico para los tres roles, reversa a $1.740.000, pagos parciales, recibos, revocación, idempotencia y sustitución de archivo bloqueada. Las pruebas históricas mantienen las tres firmas y su remito interno.

La primera ejecución externa se detuvo en la expectativa antigua de tres archivos (se habían generado correctamente dos). La aserción se hizo dependiente de la política: exactamente dos para externa, exactamente tres para histórica; no se retiró la validación. Durante el cierre se corrigieron un tipo demasiado estrecho del emisor versionado y una importación faltante del test de restricción de paquetes históricos; TypeScript y build se repitieron después.

## Entorno reproducible

Antes de cada suite Firebase se inició un Emulator limpio:

```sh
env -u GOOGLE_APPLICATION_CREDENTIALS -u FIREBASE_CLIENT_EMAIL -u FIREBASE_PRIVATE_KEY \
 GCLOUD_PROJECT=demo-cuenta-hogar GOOGLE_CLOUD_PROJECT=demo-cuenta-hogar \
 NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cuenta-hogar \
 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199 \
 NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-cuenta-hogar.appspot.com \
 NEXT_PUBLIC_ADMIN_EMAIL=external-admin@example.invalid \
 SYNTHETIC_EXTERNAL_DELIVERY_SUITE=1 \
 JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home \
 node_modules/.bin/firebase emulators:exec --project demo-cuenta-hogar \
 --config firebase.operations-lab.emulator.json --only auth,firestore,storage \
 'node --import tsx scripts/testProductionAdapterEmulator.ts'
```

Para la variante histórica, omitir `SYNTHETIC_EXTERNAL_DELIVERY_SUITE`. Para navegador, usar `NEXT_PUBLIC_ADMIN_EMAIL=production-review-admin@example.test` y `scripts/testProductionAdapterBrowser.ts`. El harness ya existente usa Next local, Auth Emulator y las rutas reales con contexto de prueba exclusivamente local. No es un laboratorio nuevo ni un endpoint desplegable.

## Limitaciones observadas

La consola del navegador mostró una denegación de lectura en la escucha de alertas del panel administrativo del entorno sintético. El recorrido contractual, la documentación externa y las consultas financieras finalizaron. No se modificaron Rules para silenciarla; no se afirma ausencia absoluta de mensajes de consola.

Las capturas incluidas contienen sólo datos ficticios. No prueban autorización jurídica, aplicabilidad tributaria de un documento externo real ni un despliegue. La selección del tipo y su fundamento requieren cotejo administrativo: no se valida un comprobante sólo por decir «ARCA».
