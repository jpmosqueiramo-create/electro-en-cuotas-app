# Verificación ejecutada — PR #80

Fecha: 2026-10-23. Base: `70b47ef75ae94ba8decc61550b6ea98b096a72ee`. Rama: `feature/production-v2-activation`.

**Adaptador normal en Emulator: PASS. Activación real: NO EJECUTADA / PENDIENTE DE AUTORIZACIONES.** El catálogo final sigue vacío y el código permanece deshabilitado por defecto. No se utilizó el Laboratorio como sustituto del circuito normal ni se cambió el adaptador de congelamiento Emulator.

## Matriz ejecutada

| Prueba | Resultado | Alcance |
|---|---|---|
| TypeScript `npx tsc --noEmit` | PASS | Sin diagnósticos |
| ESLint diferencial | PASS | Archivos TS/TSX del PR, sin desactivar reglas; script protegido excluido |
| `npm run build` | PASS | Next 16.2.1 / Turbopack local, sin publicación |
| `npm run test:safe` | PASS | Pricing, presupuestos, FIFO y guardas existentes |
| `testProductionAdapterEmulator.ts` | PASS, 22 grupos | Contexto, aprobación exacta, READY, CH/snapshot, emisión privada, entrega, ledger, invitación HTTP, roles, concurrencia y reversas |
| `testProductionAdapterBrowser.ts` | PASS | Interfaz real local + exports HTTP existentes, tres perfiles, desktop/mobile, pago y reversa |
| `testProductionReadinessV2.ts` | PASS, 13 casos | Originales vs derivados, aprobación exacta y requisitos |
| `testProductionReadinessV2Emulator.ts` | PASS, 9 casos | Auth, origen, revisión, conformidad y consulta sin cambios de hash/updateTime |
| `testAdminSolicitudesAuthorizedEmulator.ts` | PASS, 10 grupos | Permisos, 103 solicitudes 100+3, fechas, fallos parciales y revocación |
| `testProductionReadinessV2Browser.ts` | PASS | GET real, POST 405, cero escrituras al consultar, desktop/mobile |
| `testContractFreezeIntegrationEmulator.ts` | PASS | Adaptador anterior intacto |
| `testContractDeliveryFinancialControls.ts` | PASS | Firmas, originales, entrega, activación única, pagos y roles |
| `testOperationFinancialV2Emulator.ts` | PASS | Ledger, parcial/completo, FIFO, recibos, reversas y permisos |
| `testBudgetWorkspaceReadsEmulator.ts` | PASS | Lectura privada 103=100+3, 401/403 según Auth, cursores inválidos y updateTime intacto |
| `testOperationClientV2Browser.ts` | PASS | Runner existente sin retirar assertions: alta local, correo, múltiples servicios, uso único, revocación y desktop/mobile |
| `testOperationClientV2Emulator.ts` | PASS, repetida tras conectar HTTP | Compatibilidad, expiración, uso único, revocación, varias operaciones y UID |
| `testLegalApprovalV2.ts`, `testLegalApprovalEmulator.ts` | PASS | Hash/versiones, declaración separada, permisos y auditoría |
| `testFiscalV2.ts`, `testFiscalV2Emulator.ts` | PASS | IVA contenido, sin aumento de deuda; simulación e idempotencia; ARCA bloqueada |
| `testV2IntegralJourney.ts` | PASS, 22 etapas | Regresión completa de cliente nuevo/recurrente, HTTP local y navegador; conserva adaptadores sintéticos anteriores |
| PDF del adaptador | PASS, 4 documentos / 4 páginas | Texto nativo, importes/fechas persistidos, integridad, logo salvo pagaré |
| Publicación y operación real | NO EJECUTADAS | No autorizadas; sin escrituras ni roles reales |

Los resultados individuales del adaptador están en [adapter-results.json](evidence/adapter/adapter-results.json). El recorrido visual está en [browser-results.json](evidence/adapter/browser-results.json), con método, ruta y HTTP sin credenciales ni payloads personales. No se eliminaron assertions para conseguir PASS.

## Circuito del adaptador normal

1. Fixture sintético creado por los módulos de origen: solicitud, presupuesto, aceptación, datos, identidad documental, crédito, producto, economía, conformidad y READY.
2. Desde el navegador: registro del paquete ficticio exacto, autorización explícita por operación, congelamiento y emisión/recuperación de los tres archivos privados.
3. Preparación de entrega desde el manifiesto emitido; tres fotografías sintéticas verificadas como firmas, originales y custodio. Login del afiliado mediante su formulario real local y confirmación de entrega.
4. Activación financiera única. Cancelar la confirmación no envía POST; aceptar ejecuta el mismo ledger existente.
5. Vínculo explícito del UID del cliente sintético y preparación de invitación. El enlace anónimo devuelve 403 sin revelar el email; el cliente inicia sesión con su cuenta existente verificada, inspecciona y activa. No se crea una cuenta desde esa invitación.
6. Acreditación, consulta en los tres perfiles, recibo privado y reversa. Ninguna pantalla del cliente/afiliado permite acreditar ni muestra costos internos.

La regresión histórica `testOperationClientV2Browser` se invocó mediante un lanzador temporal que inicia el mismo servidor local y ejecuta su función exportada; no se modificó ese runner.

El runner utiliza Next local para la interfaz y un harness HTTP local que ejecuta los exports de las rutas existentes dentro del proceso que tiene el contexto opaco de test. No inventa respuestas ni agrega endpoints a la aplicación. La compilación de Next se comprueba aparte. Esto prueba el adaptador normal sobre servicios Emulator, no credenciales o infraestructura productivas.

## Valores comparados contra persistencia

| Dato | Valor |
|---|---:|
| Capital aplicado | $580.000 |
| Servicios brutos con IVA incluido | $1.160.000 |
| Total contractual / pagaré | $1.740.000 |
| Cronograma | 12 × $145.000 |
| Primera / última fecha | 15/12/2026 / 30/11/2027 |
| Pago acreditado | $145.000 |
| Saldo en los tres portales | $1.595.000 |
| Saldo después de reversa, tres portales | $1.740.000 |

Se verifican los doce importes y fechas exactos del snapshot. No se recalculan en el renderer ni se suma IVA. La suite adicional prueba pagos parciales y reversas exactas. La suite integral anterior conserva también pago completo y saldo cero. Las comisiones permanecen en su modelo separado y no aumentan la deuda del cliente.

## Pruebas negativas e integridad

- Contexto fabricado, proyecto/hosts incorrectos, credenciales o runtime productivo con factory de test: rechazo.
- Hash de paquete incorrecto, aprobación inválida, actor afiliado o administrador no verificado, conformidad alterada: rechazo.
- Contador CH ausente: rechazo sin snapshot. Congelamientos concurrentes idénticos: un número, un snapshot, un efecto. Replay: `updateTime` sin cambios. Segundo comando distinto: rechazo.
- Snapshot alterado: rechazo. Archivos interrumpidos: no manifiesto parcial; recuperación conserva tres archivos, sin segundo pagaré. Generación Storage reemplazada: rechazo.
- Firma u originales faltantes: no entrega. Activación financiera duplicada: rechazo; replay idéntico converge.
- Invitación HTTP: anónimo, UID ajeno, token inválido, cuenta sin verificar o deshabilitada: 403. Cuenta correcta: 200. Dos REDEEM concurrentes: un efecto; otra intención: 403. Invitación consumida: no vuelve a inspeccionarse.
- Cliente revocado, acceso cruzado y afiliado intentando acreditar: rechazo. Revocar autorización de escritura no borra el historial legítimo.
- Presupuesto/aceptación originales conservan hashes; no hay documentos de Laboratorio, migraciones, borrados ni acceso externo de Firebase durante el navegador.

## Evidencias del adaptador

- Emisión: [desktop](evidence/adapter/issued-documents-desktop.png) / [mobile](evidence/adapter/issued-documents-mobile.png).
- Firmas y custodia: [tres firmas](evidence/adapter/three-signatures-mobile.png) / [entrega del afiliado](evidence/adapter/delivery-affiliate-mobile.png).
- Administración: [desktop](evidence/adapter/admin-paid-desktop.png) / [mobile](evidence/adapter/admin-paid-mobile.png).
- Cliente: [desktop](evidence/adapter/client-paid-desktop.png) / [mobile](evidence/adapter/client-paid-mobile.png).
- Afiliado: [desktop](evidence/adapter/affiliate-paid-desktop.png) / [mobile](evidence/adapter/affiliate-paid-mobile.png).
- Reversa: [administrador](evidence/adapter/reversal-admin-desktop.png), [cliente](evidence/adapter/cliente-reversed-desktop.png), [afiliado](evidence/adapter/afiliado-reversed-desktop.png).
- PDF sintéticos: [mandato](evidence/adapter/MANDATE.pdf), [pagaré](evidence/adapter/PAGARE.pdf), [remito](evidence/adapter/REMITO.pdf), [recibo](evidence/adapter/RECIBO.pdf). [Hashes y comparación](evidence/adapter/pdf-check.json).

Se inspeccionaron todas las páginas renderizadas: sin recortes ni superposiciones. El pagaré tiene cero imágenes; los otros tres, el logo. Todos dicen DOCUMENTO DE PRUEBA — SIN VALIDEZ CONTRACTUAL O FISCAL. El número CH que se ve pertenece exclusivamente al contador local demo. Los textos y emisor del paquete son ficticios; no representan cláusulas aprobadas ni aprobación profesional real.

Las evidencias anteriores en `evidence/` se conservan identificadas como regresión del circuito existente: `journey.json` recorre los adaptadores Emulator anteriores, no demuestra por sí solo el adaptador nuevo.

## Incidencias y límites observados

- La regresión browser histórica detectó la misma dependencia SDK en el confeccionador de presupuestos: se sustituyeron las lecturas de solicitudes por la API existente y las referencias por una API administrativa paginada. Se separaron los fallos para conservar el historial autorizado. También detectó que el refresco Auth ocultaba transitoriamente el botón de verificación; se conserva la presentación de la cuenta coincidente mientras se revalida y se elimina ante rechazo. No se retiraron assertions.
- El listener SDK de alertas de `src/app/admin/page.tsx:42` muestra una denegación con la identidad administrativa sintética: las Rules existentes contienen su identidad administrativa fija. Se documenta; no se relajaron Rules ni se utilizó un correo productivo. La bandeja de Solicitudes usa su API autorizada.
- La raíz de custodia devuelve 403 cuando no hay una transferencia pendiente autorizada; el subrecurso de entrega mantiene su permiso propio. El 403 anónimo de invitación es ahora esperado. No se observaron HTTP 5xx en las rutas del recorrido del adaptador.
- Un primer agrupamiento de suites reutilizó datos donde `testProductionReadinessV2Emulator` exige estado vacío. Se repitió en emuladores frescos y pasó; no se suprimió la comprobación de aislamiento.
- Next dev emitió un aviso MaxListeners durante la regresión integral larga. No hubo fallo de assertions; no se cambió configuración para ocultarlo.
- Los formularios de firmas/custodia siguen siendo extensos en móvil. Se comprobó funcionamiento y ausencia de overflow, no una simplificación completa de esa experiencia.
- Quedan pendientes la aprobación exacta e instalación del paquete final, numeración inicial autorizada, configuración/roles y primera operación real. La recuperación de una emisión cuya autorización ya venció no se automatiza.

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


## Reproducción del nuevo adaptador

Con el mismo entorno demo anterior y emuladores frescos por ejecución, sustituir el comando final por:

```sh
node_modules/.bin/tsx scripts/testProductionAdapterEmulator.ts
```

Y en otra ejecución fresca:

```sh
node_modules/.bin/tsx scripts/testProductionAdapterBrowser.ts
```

La factoría adicional exige exactamente hosts 127.0.0.1:8080/9099/9199, proyecto demo, ningún secreto/credencial productiva y ausencia de `NODE_ENV=production`, `K_SERVICE` o `GAE_ENV`. No se expone por HTTP.

## Integridad de alcance

No hubo cambios de Rules, IAM, secretos, configuración, cláusulas existentes ni fórmulas. El script local protegido `scripts/testBudgetV2HttpIdempotency.ts` sigue fuera del commit con SHA-256 `09fb398ff9c634f7c5ca32a3769518dbde67d8ebca3f1f59a930ccdfe6340881`. El congelador Emulator conserva SHA-256 `dbee2959355d71db3886fb56a25d63f0358f9a399fa341a5af0bd344b77f50ef`.

No se hizo merge, deploy ni operación real. [PLAN.md](PLAN.md) distingue implementación y autorizaciones pendientes; [ADAPTER.md](ADAPTER.md) documenta persistencia, configuración y recuperación. No se certifica un lanzamiento integral en dos días sin completar esos requisitos.
