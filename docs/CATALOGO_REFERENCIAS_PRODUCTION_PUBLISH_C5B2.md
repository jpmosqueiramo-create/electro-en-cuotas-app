# Publicación productiva controlada — C5B-2

Proyecto: `negocio-facil-page`.
Base: `0c0650b5be4891a67ef84be7717d89e3f9f631f2`.
Rama: `feature/catalogo-referencias-c5b2-production-publish`.

## Autorización y resultado

La autorización humana permite exclusivamente crear seis proyecciones públicas con
C2. Se ejecutaron seis intentos productivos, todos PUBLISHED; cero ALREADY_CURRENT,
cero fallos. No se ejecutó ninguna publicación fuera de la allowlist ni se cambiaron
privados, flags legacy, históricos, Rules, IAM o configuración Firebase.

Inicio del apply UTC: 2026-10-19T00:11:26.667Z.
Verificación terminada UTC: 2026-10-19T00:11:29.493Z.
ADC_AVAILABLE=YES; ADC_SECRET_OUTPUT=NO; proyecto de proceso y app Admin confirmado;
FIRESTORE_EMULATOR_HOST y FIREBASE_AUTH_EMULATOR_HOST ausentes en ambos comandos productivos.

## Plan protegido y preflight

C5B2_PLAN_IDENTITY = `bc9338d4d7cdb69caaf7979b384661682de02433f986117c4cb3471c91724cd8`.
Plan: `/private/tmp/cuenta-hogar-c5b2-plan-1792368651298.json`.
Evidencia preflight: `/private/tmp/cuenta-hogar-c5b2-plan-1792368651298.json.preflight.json`.
Journal: `/private/tmp/cuenta-hogar-c5b2-plan-1792368651298.json.execution.jsonl`.
Los tres archivos se crearon fuera de Git con wx, sin sobrescribir, y permisos 0600.
El plan sólo contiene proyecto/base, allowlist, nombres públicos, fingerprints, planes
estimados públicos, imageCount, action CREATE e identidad. No contiene privados raw.
La evidencia adicional conserva únicamente IDs/updateTime exactos (segundos/nanosegundos)
de las siete referencias privadas y metadatos sanitizados del preflight.

Primera y segunda pasada consecutivas entre 2026-10-19T00:10:55.034Z y 2026-10-19T00:10:56.547Z.
C5B2_PREFLIGHT_RUNS=2; C5B2_PREFLIGHT_STABLE=YES.
Precondición real: 7 privados, 0 públicos; REVIEW_REQUIRED=6 y NOT_ELIGIBLE=1;
las otras categorías en cero. Nombres comparados normalizando sólo whitespace;
planes, flags MISSING, cantidad de imágenes, elegibilidad y DTO válidos coincidieron
exactamente con la decisión aprobada. Los privados no se normalizaron ni modificaron.
PRE_APPLY_SENSITIVE_FIELD_LEAKS=0.

El apply exigió --production-apply, proyecto explícito, plan absoluto y --confirm-plan
idéntico. Rechaza planes fuera de la allowlist, duplicados, cardinalidad distinta de
seis, hashes erróneos y archivos inseguros. La evidencia expira a los diez minutos.
Además de las dos pasadas, inmediatamente antes de escribir se realizó una revalidación
read-only adicional de ambas colecciones contra el mismo plan y los siete updateTime.
No hubo lecturas de otras colecciones.

## Publicaciones productivas por referencia

| referenciaId | nombre | planes | status | fingerprint |
| --- | --- | --- | --- | --- |
| `313uufET7xOR1kXyPAG6` | KANJI LAVARROPAS AUTOMATICO 4K CARGA SUPERIOR  KJH-WMCVSL6K | 12 | PUBLISHED | `d8849a273d186ff68d42839280c13b10c365a676f8d40d89a5e9492c1f0052b3` |
| `5qYNJkPGWm4gGgISjH56` | LAVARROPAS INVERTER 8K Kanji KJH-WMCFWT8 | 12 | PUBLISHED | `593fdc86c14f6f91b6a2ff6536eac9ed4c2300b56c5394180312f5ae844fa94f` |
| `D6bStUjs0j5D5wknli8i` | HELADERA Kanji KJH-HD140B | 8, 12 | PUBLISHED | `563e6eb8844e3677fe75d135dae0bd7640b69ccedb6f5316e3c1398f223824bc` |
| `tXshmaQnIatZzM2ND8IS` | COLCHON CALM ORIGINAL 1 PLAZA 80X190X23 | 8, 12 | PUBLISHED | `d580306d67e8340be463d62049d8c3800c0e2b0018320b98359f86b6a41f0dab` |
| `tYuknm6Alau0GY8Ip6wD` | Heladera Kanji KJH-SBS400GE | 8, 12 | PUBLISHED | `f6c79335134835fc64fae6ebe2def1ac50a2c67a8ee6b04ddd0d88e537a43834` |
| `yPGtIX7i601rZdJtPLVo` | LAVARROPAS ENOVA INVERTER 6,5 K | 12 | PUBLISHED | `7e6c98187ae53e122abee13928489cab8d81c8d3ba279a5df19da88477f12dbd` |

ID excluido: `v5lxKCM7NOAHLf2EHUIT` — HORNO ELECTRICO.
EXCLUDED_REFERENCE_PUBLISHED=NO. No se alteró su documento privado.

## Frontera de escritura y concurrencia

Se reutilizó `publishCatalogReference(db, referenciaId, expectedFingerprint)` C2 sin
cambiar C1–C4. C2 relee privado y público dentro de su transacción y recomputa DTO y
fingerprint. La frontera C5B-2 sólo expone get/set para los paths de la referencia
aprobada en curso. No expone escrituras privadas, deletes, batches ni otras colecciones.
Exige coincidencia del updateTime privado, nombres y flags antes de dejar avanzar C2.
Si el público existe y es diferente, bloquea el set: no hay reemplazos autorizados en
esta fase. Si existe idéntico, C2 devuelve ALREADY_CURRENT sin escritura y el executor
se detiene antes del siguiente ID. Las seis escrituras fueron full replace C2 de
proyecciones nuevas (no merge), conservando ID y sin persistir fingerprints en Firestore.

Orden determinístico por referenciaId. Cada intento y resultado se registró en el
journal protegido. Ante error o conflicto: STOP inmediato, sin rollback automático ni
despublicación de las proyecciones anteriores. Esta ejecución no necesitó recuperación.
No se quitó ni invocó el guard `assertC5AApplyDisabled`; C5A y C5B-1 permanecen intactos.

## Verificación posterior real

POST_INVENTORY_RUNS=2; POST_INVENTORY_STABLE=YES.
Las dos pasadas posteriores confirmaron 7 privados y 6 públicos, IDs públicos iguales
a la allowlist, con el excluido ausente. Cada público cumple parser C4, publicado=true,
schemaVersion=1, referenciaId=document ID, fingerprint esperado, planes exactos y máximo
cuatro imágenes. Se verificaron también las claves completas, sin extras, con C2.
POST_APPLY_SENSITIVE_FIELD_LEAKS=0.
PRIVATE_PRODUCTS_MUTATED=0: updateTime exactos de los siete
privados idénticos al preflight; flags, costos, proveedor, factores y stock no cambiaron.

| Categoría post-apply | Cantidad |
| --- | ---: |
| READY_NEW | 0 |
| READY_UPDATE | 0 |
| ALREADY_CURRENT | 6 |
| NOT_ELIGIBLE | 1 |
| INVALID_PRIVATE | 0 |
| PUBLIC_ORPHAN | 0 |
| PUBLIC_MALFORMED | 0 |
| IDENTITY_CONFLICT | 0 |
| REVIEW_REQUIRED | 0 |

PUBLIC_PARITY_CURRENT=6; PUBLIC_PARITY_OUTDATED=0;
PUBLIC_PARITY_INVALID=0; DRY_RUN_SENSITIVE_FIELD_LEAKS=0.

PUBLIC_API_REFERENCE_COUNT=6; PUBLIC_API_SENSITIVE_FIELD_LEAKS=0.
Se usó el reader C4 `readPublicCatalog` localmente contra Firestore productivo en modo
sólo lectura. Devuelve IDs exactos y DTO sanitizados. Esta verificación no equivale a
un deploy ni a una prueba HTTP del frontend actualmente desplegado.

## Pruebas y gates anteriores al apply

- C5B2_GUARD_TESTS=PASS: allowlist exacta, menos/más IDs, duplicados, ID no autorizado,
  hash/proyecto/flags incorrectos, modo Emulator/producción y guardas previas intactas.
- C5B2_EMULATOR_TESTS=PASS en demo-cuenta-hogar: seis publicaciones C2; cambios después
  del plan rechazados por updateTime/fingerprint; segundo intento idempotente sin set;
  parada en primer ALREADY_CURRENT; público concurrente distinto no reemplazado;
  horno excluido, cero campos sensibles y privados sin cambios después del setup.
- C5A pure y C5B-1 guardas PASS. Ninguna guarda histórica debilitada.
- DIFF_CHECK=PASS; TSC=PASS; BUILD=PASS; ESLINT_NEW_ERRORS=0.
- Los cinco TS nuevos no existen en la base: errores ESLint base=0, actuales=0.
  Configuración ESLint, package.json y lock sin cambios. No hubo instalación.
- Evidencia: `/tmp/c5b2-guard.log`, `/tmp/c5b2-c5b1-guard.log`, `/tmp/c5b2-c5a-pure.log`,
  `/tmp/c5b2-emulator-final.log`, `/tmp/c5b2-tsc.log`, `/tmp/c5b2-build.log`,
  `/tmp/c5b2-eslint.log`, `/tmp/c5b2-eslint-differential.json`.

## Alcance final y siguiente fase

PRODUCTION_APPLY_EXECUTED=YES; PUBLISH_ATTEMPTS=6; PUBLISHED_COUNT=6;
ALREADY_CURRENT_COUNT=0; FAILED_COUNT=0.
PRODUCTION_PRODUCTS_DOCUMENTS_MUTATED=0;
PRODUCTION_PUBLIC_CATALOG_DOCUMENTS_CREATED=6;
OTHER_PRODUCTION_DOCUMENTS_MUTATED=0.
PRODUCTION_BACKFILL_EXECUTED=YES, limitado a las seis creaciones manuales autorizadas.
No se ejecutó un backfill global ni el helper genérico de apply C5A.
FIRESTORE_RULES_CHANGED=NO; PRODUCTION_RULES_DEPLOYED=NO; DEPLOY_EXECUTED=NO.
COMMITS_CREATED=0; PUSH_EXECUTED=NO; PR_CREATED=NO.

La lectura pública legacy de productos sigue abierta: PUBLIC_PRODUCT_EXPOSURE_FIXED=NO.
El cierre de Rules pertenece a C5B-3 y requiere una autorización independiente.
No se aplicó el patch de C5B ni se ejecutó la suite futura de Rules. La siguiente
acción es revisar estas seis publicaciones y autorizar separadamente C5B-3; no se
realizarán más mutaciones como parte de este cierre.

## Cierre aprobado de C5B-2

APPROVED_REFERENCE_COUNT=6; PUBLISHED_COUNT=6; FAILED_COUNT=0.
PRIVATE_REFERENCES=7; PUBLIC_REFERENCES=6.
El resultado productivo anterior fue revisado y aprobado. El cierre sólo versiona los
seis archivos de tooling, pruebas e informe sanitizado; no repite producción ni realiza
nuevas mutaciones.

Antes de cerrar la lectura legacy de productos, la aplicación desplegada debe
actualizarse a una versión compatible con C4/catalogo_publico. No se asume que main
esté desplegado. Este cierre no autoriza ese deploy ni cambios de Rules.
