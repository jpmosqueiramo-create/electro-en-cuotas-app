# Cierre de privacidad del catálogo — C5B-3A

## Entorno y alcance

Base: `fb2735fda7ce1b3e2b8c1a4cd5f3211620ddc163`.
Rama: `feature/catalogo-referencias-c5b3-rules`.
Aplicación productiva actualmente desplegada: ese mismo SHA, backend App Hosting
`cuenta-hogar`, proyecto `negocio-facil-page`, región `us-central1`, rollout
`build-2026-10-19-001`, tráfico 100%. Esta fase no ejecuta ningún rollout.
C5B-2 dejó seis referencias públicas sanitizadas y el horno excluido; no se repite
inventario ni publicación productiva. La autorización actual sólo aplica el patch
versionado y prueba Rules en Emulator `demo-cuenta-hogar` (Auth 9099, Firestore 8080).

## Rules exactas

Hash SHA-256 anterior:
`3a125750b2a0630853650e6080a24dbaeee4deecf93898a376b9f07a083f70f1`.
Hash SHA-256 objetivo:
`e5fff20af773ca68771d50b9f589ef4420b623dd01977d72d69d381e138f755b`.
Ambos coinciden con `CATALOGO_REFERENCIAS_RULES_C5B_PLAN.json`.
Se aplicó exactamente `CATALOGO_REFERENCIAS_RULES_C5B_PROPOSED.patch`.

Antes, `productos/{document=**}` permitía lectura pública y escritura Admin.
Ahora read/write requiere `isAdmin()` para documento y subcolecciones.
`catalogo_publico/{referenceId}` permite lectura Admin o `publicado == true`,
y deniega toda escritura de cliente/browser, incluso Admin.
El catchall excluye `collection == "catalogo_publico"`: las concesiones son aditivas,
por lo que un `false` específico no revocaría el grant Admin del catchall anterior.
Ninguna subcolección pública recibe permisos. Los otros bloques no cambian.
Estos cambios sólo están aplicados al archivo local y a Emulator; la exposición
legacy productiva no se declara cerrada hasta un deploy de Rules separado y aprobado.

| Operación | Anónimo | Cliente | Vendedor afiliado | Admin browser |
| --- | --- | --- | --- | --- |
| productos GET/LIST/query/subcolecciones | DENY | DENY | DENY | ALLOW |
| productos escritura | DENY | DENY | DENY | ALLOW |
| catálogo publicado GET | ALLOW | ALLOW | ALLOW | ALLOW |
| catálogo oculto GET | DENY | DENY | DENY | ALLOW |
| query catálogo `publicado == true` | ALLOW | ALLOW | ALLOW | ALLOW |
| catálogo LIST/query amplia | DENY | DENY | DENY | ALLOW |
| catálogo create/update/delete | DENY | DENY | DENY | DENY |
| catálogo subcolecciones read/write | DENY | DENY | DENY | DENY |

Admin SDK bypassa Rules; el publicador C2 conserva autenticación/autorización en
el servidor. Las Rules no sanitizan documentos. La proyección C2 y la allowlist C4
siguen siendo obligatorias; no se cambia pricing ni consumidores.

## Verificación

Entorno explícito de servidor/test: `GCLOUD_PROJECT=demo-cuenta-hogar`,
`NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cuenta-hogar`,
`FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`,
`FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`; Node 24.11.1 y Java 21.
Cada wrapper `firebase-tools emulators:exec --project demo-cuenta-hogar --only auth,firestore`
cargó el archivo versionado objetivo desde `firebase.json`, con instancia nueva sin
reutilizar datos de otra suite. Los runners browser fijan web config demo y E2E.
No se suministraron credenciales productivas ni se ejecutaron uploads.

- `node --import tsx scripts/testCatalogPrivacyRulesC5B.ts`: PASS. Cuatro identidades,
  productos GET/LIST/query con y sin filtro, subcolección GET/LIST/escritura;
  publicado/oculto, query pública filtrada/amplia y LIST; create/update/delete público
  denegado incluso Admin; subcolecciones públicas GET/LIST/update/delete denegadas.
  Publicación real C2 Admin SDK: PASS. Lecturas y escrituras inválidas/no autorizadas
  de las 18 colecciones ajenas enumeradas en el test, más ambos shipping_settings:
  PASS. Los creates públicos válidos conservan la cobertura de la suite general.
- `node --import tsx scripts/testFirestoreRules3B6A.ts`: PASS 36/36. Se reemplazó sólo
  la expectativa pública obsoleta de productos (403) y se agregó lectura Admin (200).
  Ninguna otra assertion se eliminó ni relajó.
- `npm run test:browser:catalog-c3`: PASS desktop 1280 y mobile 390. Lectura privada,
  creación/guardado privado sin publicación automática, estados/preview, publicación
  explícita C2, actualización y despublicación sólo en Emulator, compatibilidad legacy,
  apertura de stock y conservación de unidades. PREVIEW_SENSITIVE_FIELDS=0;
  STORAGE_UPLOADS=0; PRODUCTION_PROJECT_USED=NO. Runner/test C3 sin modificaciones.
- `npm run test:browser:catalog-c4`: PASS desktop/mobile. Home, catálogo, solicitar,
  cliente/afiliado ámbito catálogo, planes exactos, estados de error/vacío y overflow.
  BROWSER_PRODUCTS_REQUESTS=0; NETWORK_SENSITIVE_FIELD_LEAKS=0;
  PUBLIC_API_RESPONSES_AUDITED=20. Runner/test C4 sin modificaciones.
- Historial inicial de smoke, anterior al diagnóstico A/B: primera ejecución: 11/12; fallo exclusivo del gate logout de vendedor
  afiliado desktop1280, con auth/ruta/contenido/overflow/navegación aprobados.
  El runner verifica la redirección después de una espera fija de 1200ms; el log
  no distingue qué parte del gate combinado falló. No se atribuye una causa raíz
  demostrada ni se cambia el runner. Segunda ejecución intacta: FAIL por `[CDP TIMEOUT 15000ms] Page.navigate`,
  `navigate-to-login` del último escenario vendedor desktop, antes de evaluarlo.
  Tercera ejecución intacta en instancias nuevas: 11/12; fallo exclusivo de logout
  vendedor afiliado mobile390; desktop1280 pasó. En ese momento el gate quedó
  GENERAL_BROWSER_SMOKE=FAIL: no se obtuvo el 12/12 obligatorio. No se alteraron aplicación, smoke, tiempos,
  assertions ni criterios de éxito. La variación entre escenarios evidencia
  inestabilidad, pero no demuestra su causa ni permite declarar una regresión de
  Rules descartada por completo. Ese bloqueo se resolvió mediante el diagnóstico
  A/B y la corrida final sin cambios documentados a continuación.
- `git diff --check`: PASS; `npx tsc --noEmit`: PASS; `npm run build`: PASS.
- ESLint diferencial de los dos tests TS contra la base exacta: base=0, actual=0,
  nuevos=0, resueltos=0. Mismo ESLint/config/path, comparación multiset de archivo,
  regla, mensaje y cantidad; no se deshabilitaron reglas. Config y lock intactos.

Evidencia fuera de Git: `/tmp/c5b3-rules.log`, `/tmp/c5b3-c3-browser.log`,
`/tmp/c5b3-c4-browser.log`, `/tmp/c5b3-general-smoke.log`,
`/tmp/c5b3-general-smoke-retry.log`, `/tmp/c5b3-general-smoke-run3.log`,
`/tmp/c5b3-tsc.log`,
`/tmp/c5b3-build.log`, `/tmp/c5b3-eslint-differential.json`.


## Diagnóstico A/B posterior y gate final aprobado

Se ejecutaron seis suites completas intactas: el runner no admite filtrar sólo
los escenarios afiliado desktop1280/mobile390 sin editarlo. Código de aplicación,
runner, assertions, selectores, viewports y timeouts permanecieron idénticos.
Cada corrida utilizó Emulator Auth/Firestore nuevo y perfil Chrome temporal nuevo;
Chrome `155.0.8059.84` en las seis y en la corrida final. Las Rules base se copiaron
desde Git fuera del repositorio y se seleccionaron mediante configuración temporal;
el archivo de trabajo siempre conservó el hash target.

BASE_RUN_1 = PASS
BASE_RUN_2 = PASS
BASE_RUN_3 = PASS
TARGET_RUN_1 = PASS
TARGET_RUN_2 = PASS
TARGET_RUN_3 = PASS

Las seis suites completas terminaron 12/12 PASS. En los doce escenarios afiliado
seleccionados pasaron login, carga/ruta/contenido, navegación y logout, con redirect
real a `/login`. No hubo timeouts CDP.

BASE_SUCCESSFUL_LOGOUTS = 6
BASE_LOGOUT_FAILURES = 0
BASE_CDP_TIMEOUTS = 0
TARGET_SUCCESSFUL_LOGOUTS = 6
TARGET_LOGOUT_FAILURES = 0
TARGET_CDP_TIMEOUTS = 0

LOGOUT_FIRESTORE_DEPENDENCY = NO
RULES_CAUSE_LOGOUT_REGRESSION = NO
FLAKY_INFRASTRUCTURE_CONFIRMED = YES

El botón afiliado usa signOut(getAuth()) y router.push('/login'); el smoke invoca
el hook E2E de signOut(auth). Ninguno espera operaciones Firestore. El observador
externo pasivo registró tráfico Listen/channel durante la carga y cero requests
Firestore desde la navegación a /red-afiliados, donde el runner ejecuta logout,
hasta el siguiente escenario, en los doce casos seleccionados. No capturó cuerpos
de autenticación, tokens, headers ni query strings. Sólo habilitó Network/Page;
no alteró el runner ni sus assertions. No se reprodujo un fallo en A ni B.

La clasificación NO sigue el criterio solicitado: tres target aprobados, historial
intermitente y ausencia de dependencia Firestore. Se confirma intermitencia del
smoke browser/CDP/logout; no se aisló su causa técnica exacta ni se afirma haber
reproducido un fallo legacy.

Después del A/B se ejecutó UNA corrida completa adicional con Rules target,
emuladores/perfil nuevos y SIN observador externo: 12/12 PASS, exit 0.
FINAL_GENERAL_BROWSER_SMOKE = PASS 12/12
GENERAL_BROWSER_SMOKE = PASS 12/12

Evidencia fuera de Git: `/tmp/cuenta-hogar-c5b3-ab-5nsrf2kj/`:
`AB_DIAGNOSTIC_REPORT.md`, `results.json`, `source-evidence.json`, `integrity.json`,
logs/timelines/trazas por corrida y `final-smoke.log`. No se incorporan esos archivos
al commit. Los hashes de todos los tracked y del informe nuevo coincidieron antes
y después del diagnóstico. No se cambió código por la intermitencia.

## Límites conocidos

PREEXISTING_PERMISSION_DEFECT = YES; INTRODUCED_BY_C5B3 = NO.
Las consultas `/cliente` por clienteId y `/afiliado` por afiliadoEmail conservan el
defecto anterior respecto de las condiciones de titularidad. No se modifican en
esta fase; la prueba C4 verifica su ámbito catálogo por separado.

En el deploy anterior, ADMIN_CATALOG_READ_ONLY_CHECK fue PARTIAL por fallo del
control de Chrome al abrir stock. No se cambia código por ello. La apertura manual
productiva se repetirá sólo después de un deploy de Rules autorizado separadamente.

DNS registrado previamente: `www.cuentahogar.com.ar = ACTIVE`;
`cuentahogar.com.ar = ENOTFOUND`. ROOT_DOMAIN_FIX_DEFERRED = YES.
No se modifica DNS ni se interpreta esta fase como autorización para repararlo.

## Despliegue posterior y rollback seguro

Este documento no autoriza deploy. Antes de una fase productiva separada: revisión
humana del diff y evidencia, aprobación del SHA exacto que contenga estas Rules,
reconfirmar aplicación compatible desplegada y seis proyecciones sanitizadas,
revalidar hashes y ejecutar únicamente el despliegue expresamente aprobado.
Luego verificar denegación de lectura privada para no Admin, lectura pública
sanitizada, permisos Admin y apertura manual del modal de stock, sin mutaciones
productivas de prueba ni publicación automática.

ROLLBACK_REOPENS_PRODUCTS = NO. Una vez privado, productos no puede volver a
`allow read: if true`. Ante problema de aplicación, mantener productos privado,
reparar aplicación/API y conservar catálogo público sanitizado. Ante un defecto
específico de Rules, preparar una corrección igualmente privada y aprobarla por
separado; nunca restaurar la Rule legacy insegura como rollback.

PRODUCTION_RULES_DEPLOYED = NO; PRODUCTION_DATABASE_MUTATIONS = 0;
APP_DEPLOY_EXECUTED = NO; COMMITS_CREATED = 0; PUSH_EXECUTED = NO.

## Estado final de esta ejecución

TRACKED_DATALESS_TOTAL=0; C5B3_DATALESS=0; NODE_MODULES_DATALESS=0.
Sólo cuatro archivos C5B3 pendientes: firestore.rules, los dos tests de Rules y
este informe. Los logs generados por CLI se conservaron fuera del repositorio.
No hay cambios de aplicación, engines, Rules productivas, configuración ni lock.
Cierre de gates aprobado después del A/B y smoke final 12/12, preservando el historial
inicial de fallos. TSC/build y ESLint diferencial se reconfirman con su evidencia
acreditada: Rules y tests no cambiaron desde sus ejecuciones. El único cambio posterior
es esta actualización documental autorizada. El cierre autoriza commit/push de los
cuatro archivos, sin merge ni deploy. El deploy de Rules requiere aprobación separada.
