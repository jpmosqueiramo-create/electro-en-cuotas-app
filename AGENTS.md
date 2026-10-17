# Cuenta Hogar — Development Instructions

Estas instrucciones aplican a todo el repositorio. Una instrucción del usuario puede
autorizar una excepción concreta; no extender esa autorización a otras acciones.

## Arquitectura

- Next.js 16 (actualmente 16.2.1), App Router; React 19; TypeScript.
- Firebase: Firebase Authentication, Firestore y Firebase App Hosting.
- Proyecto Firebase productivo: `negocio-facil-page`.
- Backend App Hosting: `cuenta-hogar`.
- `src/app/`: páginas públicas, portales, administración y rutas API.
- `src/components/`: componentes compartidos; `src/lib/`: lógica de dominio,
  motores, Firebase y documentos PDF; `scripts/`: suites de verificación.
- npm y `package-lock.json`. Next requiere Node >=20.9.0; el repositorio no fija
  una versión exacta de Node. No inferirla desde `@types/node`.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Git

- `main` representa producción estable. Confirmar el SHA remoto antes de trabajar;
  no asumir que el último commit de una feature está desplegado.
- Nunca force-push a main ni reescribir historia.
- Toda funcionalidad nueva parte de main actualizado y usa ramas `feature/*`.
- Cambios de infraestructura o gobierno usan ramas `chore/*` desde main.
- No borrar ramas de recuperación sin autorización.
- No incorporar commits pendientes de revisión por proximidad en la historia.

## Firebase

- Desarrollo y tests que impliquen escrituras deben usar Firebase Emulators.
- Nunca escribir en Firestore productivo durante tests.
- Nunca desplegar Firestore Rules sin autorización explícita.
- Producción usa Firebase App Hosting; no usar Firebase Classic Hosting para esta app.
- No modificar configuración productiva de Firebase salvo autorización explícita.
- `firebase.json` contiene configuración heredada de Hosting con `public: out`;
  su existencia no autoriza usarla. Next se configura con `output: standalone`.
- Reglas versionadas: `firestore.rules`. Leerlas antes de cambiar payloads:
  las restricciones de create y update pueden ser distintas, incluso para admin.

## Deploy

- Los despliegues son manuales por ahora; no hacer deploy automáticamente al
  completar una tarea ni activar automatic rollouts sin autorización.
- No push a main como parte de una tarea ordinaria. Antes de cualquier push
  autorizado a main, considerar su posible relación con rollouts configurados.
- Antes de deploy: tsc, eslint, tests relevantes, build y emulator tests cuando
  corresponda. Informar errores o bloqueos; no omitirlos silenciosamente.
- Deploy sólo de un SHA explícitamente aprobado. No sustituirlo por la punta de
  una rama. Verificar el SHA del rollout después del despliegue autorizado.

## Seguridad

- Nunca imprimir secretos ni incluir claves privadas en Git.
- Nunca copiar service accounts productivas, tokens ni archivos ADC productivos
  al entorno Codex. Usar identidades de mínimo privilegio cuando se autoricen.
- Firebase web config pública no equivale a credencial administrativa.
- Firebase Admin debe fallar de forma segura si faltan credenciales. ADC en App
  Hosting puede ser válido; un fallback al proyecto productivo no es aislamiento
  de tests. No relajar guardas ni añadir credenciales dummy en producción.
- Tests de Admin/Firebase deben usar emuladores salvo autorización específica.
- No imprimir `.env*`, claves, tokens o contenido de archivos de credenciales al
  diagnosticar; informar únicamente nombres, ubicaciones y estado.

## Pricing

- Flujo catálogo: `CANONICAL_V1`; flujo productos manuales: `MANUAL_FACTOR_V1`.
- No crear motores financieros alternativos.
- No modificar `src/lib/canonicalPricingEngine.ts` salvo autorización explícita.
- Factores manuales se derivan de `FACTORES_PREDETERMINADOS`.
- Productos manuales deben conservar snapshot y el alta opcional en catálogo
  debe seguir siendo idempotente.
- No reemplazar snapshots guardados por recálculos, valores por defecto o tasas
  inventadas. Validar compatibilidad de plazos antes de combinar opciones.

## Presupuestos

- Soportar productos de catálogo, productos manuales y múltiples opciones.
- Preservar `source`, `pricingMode` y snapshots al guardar, reabrir y aceptar.
- PDF y WhatsApp deben utilizar allowlist de datos cliente, como
  `toClientBudgetPayload`; revisar también notas y texto libre.
- Nunca exponer costo proveedor, proveedor interno, factores internos, margen,
  TNA interna, mora interna ni datos administrativos sensibles al cliente.
- Preservar vinculación determinística, confirmaciones de creación y controles
  de persistencia antes de compartir. No sustituir una solicitud faltante por
  otra nueva silenciosamente.
- Las transiciones deben ser explícitas, compatibles con el estado vigente e
  idempotentes. Evitar perder presupuestos por escrituras concurrentes.

## Datos / Firestore

- No cambiar nombres de colecciones sin auditoría.
- Mantener compatibilidad con `solicitudes` y `solicitudes_cuenta` cuando el flujo
  vigente lo requiera; transportar colección e ID sin depender del modal activo.
- No cambiar schemas productivos silenciosamente: documentar campos, tipos,
  consumidores, compatibilidad y estrategia de migración cuando corresponda.
- Conservar tipos Firestore al serializar. No convertir indiscriminadamente
  Timestamp, referencias o sentinels en objetos planos.
- Para operaciones con varios documentos, evaluar atomicidad y reintentos;
  IDs aleatorios y búsquedas en memoria no garantizan idempotencia.

## Legal

- No presentar públicamente a Cuenta Hogar como "vende electrodomésticos en
  cuotas", "financia electrodomésticos" u "otorga crédito", salvo revisión legal
  específica. Usar lenguaje compatible con gestión de compra / mandato.
- No modificar documentos legales congelados salvo pedido explícito.
- No introducir CUIT histórico u obsoleto.

## Vendedores afiliados

- Usar siempre "vendedor afiliado"; son colaboradores independientes.
- No describirlos como empleados.
- No alterar reglas de comisiones o liquidaciones sin tarea específica.

## Tests

Las suites se ejecutan desde el SHA bajo revisión. No hay script npm `test` ni
runner TypeScript declarado en package.json: comprobar la herramienta compatible
antes de ejecutarlas y no instalar dependencias ni cambiar configuración por
suposición. La clasificación no demuestra que una suite haya pasado.

| Suite en `scripts/` | Tipo / alcance |
| --- | --- |
| `testCanonicalPricingEngine.ts` | UNIT: cálculos y validaciones canónicas |
| `testEndToEndPricingFlow.ts` | INTEGRATION simulada: pricing, sin navegador real |
| `testBudgetAlertRoutingFlow.ts` | UNIT / INTEGRATION simulada: alertas y editor |
| `testManualBudgetProductsFlow.ts` | UNIT / INTEGRATION: manuales, catálogo y PDF |
| `testLedgerEngine3B2.ts` | UNIT: cálculos y escenarios simulados de ledger |
| `testProductionAuthEmulatorGuard.ts` | UNIT: fail-closed y guardas de emulador |
| `testLedgerEmulator3B2.ts` | FIREBASE_EMULATOR: ledger y autorización |
| `testEngine3B3.ts` | FIREBASE_EMULATOR: vencimientos y promesas |
| `testCommissionsEngine3B4B.ts` | FIREBASE_EMULATOR: comisiones |
| `testSettlementsEngine3B5B.ts` | FIREBASE_EMULATOR: liquidaciones y custodia |
| `testSellerAccountUI3B5C2.ts` | FIREBASE_EMULATOR / INTEGRATION: helpers y handlers |
| `testE2EThreePanels3B5D.ts` | FIREBASE_EMULATOR / INTEGRATION: roles y handlers |
| `testFirestoreRules3B6A.ts` | FIREBASE_EMULATOR: reglas mediante REST |
| `testAdminCommissionsUI3B5C1.ts` | PRODUCTION_UNSAFE sin emuladores impuestos: escribe con Admin y no fuerza hosts |
| `runMobileBrowserSmokeTest.ts` | BROWSER_SMOKE / FIREBASE_EMULATOR: Chrome DevTools Protocol |

Antes de suites Firebase, configurar explícitamente en el proceso servidor/test:
`GCLOUD_PROJECT=demo-cuenta-hogar`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cuenta-hogar`,
`FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` y
`FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`. Confirmar que ningún script sustituya
esas selecciones por otro proyecto. No suministrar credenciales productivas.

Para el cliente en desarrollo: `NEXT_PUBLIC_E2E_TEST_MODE=1` y
`NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`. Las conexiones E2E no se
habilitan en producción. Los emuladores requieren Firebase CLI, Java compatible
y sus binarios; usar un proyecto demo consistente. Storage no está emulado por
la configuración actual: no ejecutar uploads como si estuvieran aislados.

El smoke requiere Next dev en localhost:3000, Auth 9099, Firestore 8080, navegador
y soporte WebSocket/CDP. Tiene una ruta absoluta de Chrome para macOS: no asumir
que corre en Linux sin adaptación explícita. No usar datos productivos.

## Quality gates

Para cambios normales de código, ejecutar:

```sh
npx tsc --noEmit
npx eslint <archivos-modificados>
npm run build
```

Agregar suites específicas del área tocada y emuladores cuando corresponda.
Para documentación solamente, revisar contenido, formato y diff; no ejecutar
tests con escrituras sin necesidad. No modificar tests para hacerlos pasar
artificialmente. Registrar comando, resultado y límites de la verificación.

## Prohibiciones

- Force-push, reescribir historia o borrar ramas sin autorización.
- Deploy no solicitado o mutaciones productivas de prueba.
- Secrets en Git o credenciales productivas copiadas a Codex.
- Modificar motores financieros por conveniencia.
- Marcar un test PASS sin evidencia.
- Usar datos productivos para smoke destructivo.
