# Verificación ejecutada — preparación productiva

Fecha: 2026-10-23. Base: `70b47ef75ae94ba8decc61550b6ea98b096a72ee`. Rama: `feature/production-v2-activation`.

**Resultado del alcance implementado: PASS. Habilitación productiva integral: BLOCKED / NO IMPLEMENTADA.** No se utilizó el Laboratorio como sustituto del circuito normal ni se amplió su funcionalidad. Las pruebas recorren los módulos normales en Emulator, pero congelamiento, entrega y activación todavía dependen de los adaptadores sintéticos existentes. Esto no certifica que esos pasos puedan ejecutarse productivamente.

## Matriz de pruebas ejecutadas

| Prueba | Resultado | Evidencia / alcance |
|---|---|---|
| TypeScript `npx tsc --noEmit` | PASS | Sin diagnósticos |
| ESLint diferencial | PASS | Todos los `.ts` / `.tsx` modificados; sin desactivar reglas |
| `npm run build` | PASS | Next 16.2.1, Turbopack; no publicación |
| `npm run test:safe` | PASS | Pricing, presupuestos, FIFO y guardas de producción existentes |
| `testProductionReadinessV2.ts` | PASS | 13 casos: originales vs derivados, aprobación exacta, pendientes y guardas |
| `testProductionReadinessV2Emulator.ts` | PASS | 9 casos: Auth, origen, revisión, conformidad, fechas, lectura sin cambios de hash/updateTime |
| `testAdminSolicitudesAuthorizedEmulator.ts` | PASS | 10 grupos: permisos, 103 solicitudes sintéticas paginadas 100+3, fechas, lecturas sin cambios, fallos parciales y revocación |
| `testLegalApprovalV2.ts` | PASS | Versión/hash exactos y declaración separada; emisión sigue bloqueada |
| `testLegalApprovalEmulator.ts` | PASS | Atomicidad, replay y permisos del registro jurídico |
| `testContractDeliveryFinancialControls.ts` | PASS | Tres firmas, originales, incidentes, entrega, activación única, FIFO, pagos, reversa y roles |
| `testFiscalV2.ts` | PASS | Extracción de IVA contenido sin incremento del total |
| `testFiscalV2Emulator.ts` | PASS | Simulación fiscal, concurrencia, idempotencia y guarda ARCA |
| `testV2IntegralJourney.ts` | PASS | 22 etapas; cliente nuevo y recurrente, HTTP real local, tres perfiles y navegador |
| `testProductionReadinessV2Browser.ts` | PASS | Desktop 1280px/mobile 390px, GET real, POST 405, cero escrituras al consultar y sin overflow |
| Revisión visual PDF | PASS | Todas las páginas del mandato (3) y pagaré (1) sintéticos; sin texto cortado ni superposición |
| Adaptadores productivos de emisión/entrega/finanzas | BLOCKED | Todavía no implementados; no inferir PASS por las pruebas de Emulator |
| Escrituras, roles personales o emisiones reales | NO EJECUTADAS | No autorizadas en esta etapa |

No se modificaron assertions para ocultar errores. En el primer recorrido la bandeja falló: leía directamente el SDK bajo Rules con identidad administrativa fija, mientras la API admitía el administrador sintético configurado. Se corrigió mediante servidor autorizado, sin ampliar Rules ni usar un correo real en los fixtures. En la primera prueba del panel, éste estaba dentro de una sección cerrada: se reubicó en el panel contractual visible y se mantuvieron las assertions de visibilidad. La cuenta Auth deshabilitada se verifica como rechazo 401, conforme al mecanismo existente; no se convirtió en éxito.

## Circuito y cifras persistidas

Los 22 resultados individuales y códigos HTTP están en [journey.json](evidence/journey.json). Los 401/403 y 409 de casos negativos son rechazos esperados, no fallos ocultos.

| Dato | Resultado sintético |
|---|---:|
| Capital aplicado | $580.000 |
| Servicios brutos, IVA incluido | $1.160.000 |
| Total contractual y pagaré | $1.740.000 |
| Cuotas | 12 × $145.000 |
| Primera cuota / última cuota | 15/12/2026 / 30/11/2027 |
| Pagos parciales que completan una cuota | $145.000 acreditados |
| Pago posterior del saldo restante | Saldo $0 |
| Reversa de ese pago posterior | Saldo $1.595.000; queda acreditada una cuota |

La prueba compara las vistas de Administración, cliente y vendedor afiliado contra la misma fuente financiera. Preserva los importes/fechas del snapshot y los hashes/updateTime históricos. El pagaré tiene el mismo total; no agrega IVA ni crea otra deuda. La fiscalidad fue simulada y no se comunicó con ARCA.

Limitación explícita del recorrido: `EMULATOR_FREEZE_DEPENDENCIES`, `CLIENT_ACTIVATION_FIXTURE` y `FINANCIAL_APPROVAL_FIXTURE` constan en el resultado. La numeración CH que aparece en capturas es de `demo-cuenta-hogar`, no de un contador productivo. Las firmas, entrega y aceptación de prueba no representan obligaciones ni conformidades reales.

## Evidencia visual

- Consulta administrativa corregida: [bandeja](evidence/02-bandeja.png).
- Requisitos: [desktop](evidence/readiness-1280.png) / [mobile](evidence/readiness-390.png).
- Administración financiera: [desktop](evidence/final-finanzas-1280.png) / [mobile](evidence/final-finanzas-390.png).
- Vendedor afiliado: [desktop](evidence/10-portal-afiliado.png) / [mobile](evidence/10-portal-afiliado-mobile.png).
- Cliente: [desktop](evidence/11-portal-cliente.png) / [mobile](evidence/11-portal-cliente-mobile.png).
- [Mandato sintético de revisión](evidence/mandato-borrador-operacion.pdf) y [pagaré sintético de revisión](evidence/pagare-borrador-operacion.pdf). BORRADOR — NO VÁLIDO PARA FIRMA. Mismo origen y revisión persistida; mandato con logo, pagaré sin logo.

Los formularios contractuales siguen siendo extensos en móvil. El panel nuevo conserva los requisitos secundarios plegados y enlaza a las secciones existentes. No se considera resuelta toda la experiencia de operación real por no haber overflow.

## Reproducción segura

Todas las suites con escrituras deben ejecutarse exclusivamente con Auth 9099, Firestore 8080 y Storage 9199 locales, proyecto `demo-cuenta-hogar`. No suministrar credenciales productivas. Usar un conjunto fresco de emuladores para la suite integral y para el browser; el grupo de regresiones se ejecutó secuencialmente en una instancia separada.

```sh
unset GOOGLE_APPLICATION_CREDENTIALS FIREBASE_SERVICE_ACCOUNT_JSON FIREBASE_SERVICE_ACCOUNT_KEY FIREBASE_CONFIG FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY GOOGLE_CLOUD_PROJECT
export GCLOUD_PROJECT=demo-cuenta-hogar
export NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cuenta-hogar
export NEXT_PUBLIC_ADMIN_EMAIL=production-review-admin@example.test
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
export FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
export NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-cuenta-hogar.appspot.com
# Sólo clave sintética para el cupo de la prueba local.
export PUBLIC_SOLICITUDES_RATE_LIMIT_ENABLED=true
export PUBLIC_SOLICITUDES_HMAC_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
node_modules/.bin/firebase emulators:exec --project demo-cuenta-hogar --config firebase.operations-lab.emulator.json --only auth,firestore,storage 'node_modules/.bin/tsx scripts/testV2IntegralJourney.ts'
```

El archivo de configuración existente se reutiliza únicamente para los puertos y servicios de Emulator; esta suite no recorre APIs de Laboratorio. Next local y Chromium son iniciados por los runners. El proyecto requiere Java compatible y los binarios de Emulator instalados. No hay script npm `test`; se ejecutó `test:safe` y los runners indicados.

Para el grupo adicional, sustituir sólo la última cadena por:

```sh
node_modules/.bin/tsx scripts/testProductionReadinessV2Emulator.ts && node_modules/.bin/tsx scripts/testAdminSolicitudesAuthorizedEmulator.ts && node_modules/.bin/tsx scripts/testLegalApprovalEmulator.ts && node_modules/.bin/tsx scripts/testContractDeliveryFinancialControls.ts && node_modules/.bin/tsx scripts/testFiscalV2Emulator.ts
```

Para las capturas del panel, ejecutar en otro conjunto fresco: `node_modules/.bin/tsx scripts/testProductionReadinessV2Browser.ts`.

## Integridad y pendientes

No se cambiaron Rules, Storage Rules, IAM, secretos, configuración, modelos contractuales ni fórmulas económicas. El script local protegido `scripts/testBudgetV2HttpIdempotency.ts` sigue sin versionar y con SHA-256 `09fb398ff9c634f7c5ca32a3769518dbde67d8ebca3f1f59a930ccdfe6340881`.

La matriz de habilitación, aprobación exacta pendiente, diseño del adaptador seguro, despliegue y aceptación están en [PLAN.md](PLAN.md). No hacer merge presentando este PR como habilitación integral. No hay evidencia que permita garantizar un lanzamiento completo en dos días.
