# Storage: baseline de seguridad P4-S1

## Alcance y procedencia

Base: `86d2af417b0d70a55c9d92fc798a70404e77b481`.
Se incorpora el baseline auditado en P4-S0, sin consultar producción nuevamente,
sin implementar aceptación/documentación y sin desplegar reglas.

Buckets auditados mediante metadatos, sin listar ni leer objetos:

| Bucket | Ubicación | Public Access Prevention | Uniform bucket-level access |
| --- | --- | --- | --- |
| negocio-facil-page.firebasestorage.app | US-CENTRAL1 | inherited | false |
| negocio-facil-page-recovery-vault | SOUTHAMERICA-EAST1 | enforced | true |

En la auditoría no se encontraron principales públicos en IAM del bucket ni en
ACL de bucket/default object ACL. No se auditaron ACL de objetos ni IAM heredado.
Esto no reemplaza el análisis de las Firebase Storage Security Rules.

Release auditado:
`projects/negocio-facil-page/releases/firebase.storage/negocio-facil-page.firebasestorage.app`.
Ruleset: `projects/negocio-facil-page/rulesets/8bd564b0-2548-4f9c-879b-dd6d4b9272df`.
Actualización del release: `2026-03-30T11:50:47.900782Z`.
Fuente única: `/tmp/cuenta-hogar-storage-audit/deployed-storage.rules`.

SHA256 desplegado y local, byte-identical:
`d280ad25a0d3885fb93fe3286341839eeef1c5377010d1747d24cc2ad9b4db09`.
El archivo conserva incluso whitespace del original; no se alteraron permisos,
comentarios, expresiones ni matches. Diferencia semántica de permisos: **0**.

## Matriz vigente

| Path | Actor | Read | Create/update/delete |
| --- | --- | --- | --- |
| productos/{imageId} | anónimo o autenticado | ALLOW | sólo identidad admin por email definida en el baseline |
| comprobantes/** | anónimo | ALLOW | DENY |
| comprobantes/** | cualquier autenticado | ALLOW | ALLOW |
| budget-documentation-v2/** | anónimo | DENY | DENY |
| budget-documentation-v2/** | autenticado no admin | DENY | DENY |
| budget-documentation-v2/** | admin con Client SDK | DENY | DENY |

No se agregó match P4: no hay ninguna regla allow aplicable a ese prefijo.
Admin browser sigue sujeto a Rules. Admin SDK server-side opera por un canal
privilegiado y no demuestra que un cliente pueda acceder.

## Finding legacy separado: HIGH

`comprobantes/**` permite lectura pública y creación, modificación y eliminación
por cualquier autenticado, sin ownership. Los flujos documentales legacy usan
getDownloadURL y guardan URLs permanentes compartibles. Los ALLOW del test son
compatibilidad con el riesgo existente, no objetivos de seguridad deseables.
No se inspeccionaron documentos ni archivos reales para demostrar este hallazgo.

LEGACY_COMPROBANTES_HARDENING_REQUIRED = YES

LEGACY_COMPROBANTES_HARDENING_OUT_OF_SCOPE = YES

El endurecimiento futuro requiere inventario de consumidores, ownership,
migración gradual de upload/download, eliminación progresiva de URLs documentales
permanentes, cambios de Rules y regresión Cliente/Afiliado/Admin. No se propone
una migración big bang ni se cambia la política en P4-S1.

## Contrato para la siguiente fase P4

Browser Admin → API con verifyAdminAuth → Admin SDK → Storage.
La API deberá validar autorización sobre el presupuesto y mediar tanto uploads
como descargas. No se implementan endpoints, UI, uploads P4 ni documentos Firestore
en esta fase. No usar getDownloadURL, generar tokens de descarga ni persistir URLs
permanentes P4.

- MAX_ATTACHMENT_SIZE_BYTES = 10485760 (10 MiB por attachment).
- MIME: image/jpeg, image/png, image/webp, application/pdf.
- Path: `budget-documentation-v2/{budgetId}/v{version}/{documentType}/{attachmentId}`.
- Tipos: DNI_FRONT, DNI_BACK, ADDRESS_PROOF, PAYSLIP.
- IDs opacos; nunca nombre, apellido, DNI, CUIL, teléfono o email en el path.

Estos límites son política aprobada para la próxima fase; no se presentan como
validaciones de upload ya implementadas.

## Verificación local reproducible

`firebase.json` carga `storage.rules` y configura Storage en 9199; Auth 9099 y
Firestore 8080 se preservan. Hosting y Firestore Rules no cambian. La configuración
local no despliega ni modifica el release productivo.

```sh
GCLOUD_PROJECT=demo-cuenta-hogar \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cuenta-hogar \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199 \
npx firebase-tools emulators:exec --project demo-cuenta-hogar \
  --only auth,firestore,storage 'npx tsx scripts/testStorageSecurityBaseline.ts'
```

La suite valida hash exacto, baseline comprobantes mediante Client SDK, denegación
P4 para tres roles y cuatro operaciones, integridad tras intentos denegados y
upload/read/delete separados con Admin SDK. Todos los objetos son sintéticos;
sólo se crean usuarios Auth y objetos Storage locales, sin escrituras Firestore.
Las guardas rechazan proyecto/host incorrectos y credenciales productivas en env;
Admin SDK usa una clave RSA sintética efímera, generada sólo en memoria para
el emulador; no se guarda ni imprime y no se resuelve ADC.

Gates adicionales: `git diff --check`, `npx tsc --noEmit`,
`npx eslint scripts/testStorageSecurityBaseline.ts`, `npm run test:safe`,
`npm run build`. No se requiere smoke browser completo para este baseline.
