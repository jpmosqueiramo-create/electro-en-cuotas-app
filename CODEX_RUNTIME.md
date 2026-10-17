# Runtime local y Codex Cloud

Usar Node 24 LTS (Next requiere >=20.9; Firebase CLI puede exigir una versión
mayor), npm y Java 21 para Firestore Emulator. Instalar dependencias reproducibles:

```sh
npm ci
npx firebase-tools --version
```

`tsx` y `firebase-tools` están fijados en devDependencies y package-lock.json.
No hace falta instalación global, login, gcloud ni service account. En entornos
con HOME de solo lectura, seleccionar cachés escribibles para npm y Firebase
CLI: `npm_config_cache=/tmp/cuenta-hogar-npm`,
`XDG_CONFIG_HOME=/tmp/cuenta-hogar-config` y
`FIREBASE_EMULATORS_PATH=/tmp/cuenta-hogar-emulators`.
Exportar esas variables antes de los comandos si son necesarias.
No cambiar HOME ni leer credenciales.
El primer inicio del emulador requiere acceso de red para descargar sus binarios.

## Suites sin emuladores

```sh
npm run test:safe
```

Incluye guardas de runtime, pricing, flujo simulado de pricing, routing de
presupuestos, productos manuales, cálculos de ledger y guardas cliente Firebase.
No hace escrituras Firebase. Comandos individuales: `test:pricing`,
`test:pricing-flow`, `test:budget-routing`, `test:manual-budget`, `test:ledger`,
`test:auth-guard`, `test:runtime-guards`.
Los comandos de suites en memoria fijan también un project ID demo. Los scripts
npm usan asignaciones de entorno POSIX, compatibles con Linux/Codex y macOS.

## Firebase Emulators

No usar credenciales productivas ni el proyecto productivo. El helper exige
explícitamente proyecto `demo-*`, hosts locales de Auth/Firestore, configuración
de proyecto consistente y ausencia de variables de service account. Se evalúa
antes de importar Firebase Admin. No asignar defaults que oculten variables
faltantes. Los datos de test son ficticios y las suites pueden crear/modificar
documentos locales. No usar una instancia con datos que se necesiten conservar.

```sh
export GCLOUD_PROJECT=demo-cuenta-hogar
export NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cuenta-hogar
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
npx firebase-tools emulators:exec --project demo-cuenta-hogar --only auth,firestore "npm run test:emulator:ledger"
npx firebase-tools emulators:exec --project demo-cuenta-hogar --only auth,firestore "npm run test:emulator:rules"
npx firebase-tools emulators:exec --project demo-cuenta-hogar --only auth,firestore "npm run test:emulator:commissions-ui"
```

También disponibles: `test:emulator:commissions`, `test:emulator:settlements`,
`test:emulator:expiration`, `test:emulator:seller`, `test:emulator:panels`.
`testAdminCommissionsUI3B5C1.ts` ahora exige la misma guarda antes de Admin.
Sin variables debe fallar con `REFUSED_UNSAFE_FIREBASE_TEST_ENVIRONMENT`.
Los tests de reglas no despliegan reglas: las cargan en el emulador local.
Storage no está emulado: no ejecutar uploads.

## Browser smoke real

Con las cuatro variables anteriores:

```sh
npx firebase-tools emulators:exec --project demo-cuenta-hogar --only auth,firestore "npm run test:browser-smoke"
```

El wrapper exige exactamente proyecto `demo-cuenta-hogar` y puertos 8080/9099.
Levanta su propio Next dev en localhost:3000, sin reutilizar un servidor ajeno,
y lo detiene al finalizar. Configura explícitamente `NEXT_PUBLIC_E2E_TEST_MODE=1`,
`NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` y web config ficticia.
No usar `next start` ni build de producción para este smoke.

Resolución del navegador: `CHROME_BIN`, comandos en PATH (`google-chrome`,
`google-chrome-stable`, `chromium`, `chromium-browser`), rutas Linux conocidas,
y finalmente ruta macOS. Se puede indicar `CHROME_BIN=/usr/bin/chromium`.
Sin ejecutable falla con `CHROME_NOT_FOUND` y lista los candidatos intentados.
Requiere WebSocket global (Node 24), CDP y Chromium compatible. Usa perfil temporal;
en Linux como root agrega `--no-sandbox` únicamente al navegador de test.
Se verifican autenticación, ruta, contenido, overflow, navegación y logout para
3 roles y 4 viewports; un fallo real produce exit code distinto de cero.

## Quality gates

```sh
npx tsc --noEmit
npx eslint <archivos-TypeScript-modificados>
npm run build
```

No alterar validación productiva para que el build pase. Si falta web config
productiva legítima o acceso a fuentes, informar el bloqueo sin inventar secretos.
Ninguno de estos comandos autoriza push, deploy ni cambios de Firebase productivo.

## Bloqueos observados en Codex Cloud

En la verificación inicial, el proxy rechazó con HTTP 403 la descarga de
`cloud-firestore-emulator-v1.22.0.jar` desde `storage.googleapis.com`.
Ledger, Admin con emuladores y browser smoke quedaron bloqueados antes de iniciar
sus suites. Requieren acceso permitido al binario oficial; no se validó su ejecución.
Chromium sí está disponible en `/usr/bin/chromium`.

El build compiló y pasó TypeScript, pero el prerender fue bloqueado por ausencia
de web config Firebase requerida en producción. No se relajó esa validación.
ESLint sobre scripts existentes conserva 50 errores de la base (principalmente
`no-explicit-any`); helpers y runners nuevos pasan lint. No se alteraron assertions
ni se desactivaron reglas para ocultar esos errores.
