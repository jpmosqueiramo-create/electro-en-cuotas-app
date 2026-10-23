# Validación del laboratorio integral — PR #78

Fecha local: 23 de octubre de 2026. Base main `474008785bed09e7a085ece138d814bfb876c2d7`;
inicio del incremento `6ddcb7a37f9b5558105c1c053855f25a1a4114ba`.
Node 24.11.1, Next 16.2.1, Java 21, Chrome headless/CDP, Auth/Firestore/Storage Emulators.
Todas las escrituras se realizan exclusivamente en `demo-cuenta-hogar`.

## Matriz de ejecución

| Verificación | Resultado | Evidencia |
| --- | --- | --- |
| Sesiones: Auth, allowlist, replay, concurrencia, SDK denegado | PASS | `testOperationsLabEmulator.ts` |
| Capacidad no falsificable, aislamiento, rollback, TEST único, kill switch | PASS | `testOperationsLabContextEmulator.ts` |
| READY, origen, identidad, crédito, conformidad, calendario y snapshot alterado | PASS | `testOperationsLabFreezeEmulator.ts` |
| Snapshot y número atómicos, replay inmutable y contador CH intacto | PASS | Misma suite de congelamiento |
| Consulta, presupuesto, aceptación y revisión sintética | PASS | `testOperationsLabCircuitEmulator.ts` |
| Ajustes guardados del borrador, revisión y bloqueo posterior | PASS | Suite de circuito y navegador |
| Mandato, pagaré y remito privados y consistentes | PASS | Suite de circuito y PDF nativos |
| Tres firmas, custodia y rechazo si faltan requisitos | PASS | Suite de circuito |
| Entrega sintética y activación única | PASS | Suite de circuito |
| 12 cuotas, pago, saldo, recibo y reversa | PASS | Suite de circuito |
| Pago parcial, importe inválido, exceso y replay concurrente | PASS | Suite de circuito |
| Cliente y afiliado independientes: lectura, acceso cruzado y escritura denegada | PASS | Auth Emulator + rutas HTTP |
| Revocación y desaparición del saldo visible | PASS | API y navegador |
| IVA contenido en servicios sin aumentar cuotas | PASS | `fiscalProjection` + circuito |
| Rutas normales sin acceso a registros sintéticos y raíces normales intactas | PASS | Suite de circuito |
| Navegador integral, doble clic, respuesta perdida y recuperación | PASS | Runner versionado |
| Desktop/mobile, cuentas independientes, conexión, PDF y errores JS | PASS | Runner versionado |
| Regresión del circuito normal de cliente nuevo y recurrente | PASS | `testV2IntegralJourney.ts` |
| Regresión de congelamiento normal y documentos | PASS | `testContractFreezeIntegrationEmulator.ts`, `testContractDocumentsEmulator.ts` |
| TypeScript, build y `test:safe` finales | PASS | Gates del repositorio |
| ESLint diferencial | PASS | Cero diagnósticos nuevos; ver diagnóstico heredado debajo |
| Publicación y prueba productiva | NO EJECUTADO | Fuera del alcance autorizado |

El generador compartido `src/lib/pdfGenerator.ts` conserva **7 errores y 4 advertencias preexistentes** de ESLint. Se compararon reglas y mensajes contra HEAD: cero diagnósticos adicionales, sin cambiar la configuración de lint. El resto de los archivos nuevos/modificados pasan ESLint sin diagnósticos.

La verificación independiente [de PDF](evidence/pdf-verification.json) ejecutó **68 comprobaciones**, incluyendo los doce importes y vencimientos del manifest persistido.

## Importes verificados

| Concepto | Importe |
| --- | ---: |
| Capital aplicado | $580.000,00 |
| Servicios brutos con IVA incluido | $1.160.000,00 |
| Total contractual y pagaré | $1.740.000,00 |
| Cronograma | 12 × $145.000,00 |
| Pago acreditado sintético | $145.000,00 |
| Saldo después del pago | $1.595.000,00 |
| Saldo después de la reversa | $1.740.000,00 |
| Pago parcial adicional de regresión | $72.500,00 |
| Servicios netos, política sintética 21 % incluido | $958.677,69 |
| IVA incluido simulado | $201.322,31 |

El PDF utiliza los importes y vencimientos persistidos, no otro cálculo. Se exporta el manifest
`evidence/persisted-economics.json` para compararlos. Los ejemplares no son instrumentos reales.

## Evidencia visual y PDF

Las capturas muestran sesiones Emulator y datos ficticios. El selector administrativo es una
simulación; las capturas `auth-client-*` y `auth-affiliate-*` corresponden a inicios de sesión
independientes, verificados por el servidor y con membresía revocable.

- [Administración desktop](screenshots/admin-desktop.png) / [mobile](screenshots/admin-mobile.png).
- [Borrador desktop](screenshots/draft-desktop.png) / [mobile](screenshots/draft-mobile.png).
- [Cliente autenticado desktop](screenshots/auth-client-desktop.png) / [mobile](screenshots/auth-client-mobile.png).
- [Afiliado autenticado desktop](screenshots/auth-affiliate-desktop.png) / [mobile](screenshots/auth-affiliate-mobile.png).
- [Mandato sintético](evidence/MANDATE.pdf), [pagaré](evidence/PAGARE.pdf),
  [remito](evidence/REMITO.pdf), [recibo](evidence/RECIBO.pdf).

Las capturas corresponden al caso ejecutado desde el navegador; los PDF y el manifest corresponden a otra ejecución fresca de la suite integral de servicios, con los mismos importes y fechas. Los cuatro PDF adjuntos pertenecen a una única operación sintética de esa suite.

Se inspeccionan todas las páginas: mandato 3, pagaré 1, remito 1 y recibo 1. Texto nativo
seleccionable; marca de prueba en cada página. Logo en mandato, remito y recibo, cero imágenes
en el pagaré. El único solapamiento observado en el remito fue corregido sin alterar su texto.

## Reproducción técnica

Usar un proceso limpio, sin variables de credenciales productivas, Node compatible, Java 21,
Firebase CLI y Chrome/CDP. Los runners abortan fuera del entorno demo/local. Configuración
versionada: `firebase.operations-lab.emulator.json` (no Hosting ni despliegues).

Establecer explícitamente en el proceso de pruebas:

```sh
export GCLOUD_PROJECT=demo-cuenta-hogar
export NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cuenta-hogar
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
export FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
export NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-cuenta-hogar.appspot.com
```

Ejecutar cada suite con Emulator nuevo, sin importar datos ni credenciales:

```sh
npx firebase-tools emulators:exec --project demo-cuenta-hogar \
  --config firebase.operations-lab.emulator.json --only auth,firestore,storage \
  "npx tsx scripts/testOperationsLabCircuitEmulator.ts"
```

Repetir con `testOperationsLabEmulator.ts`, `testOperationsLabContextEmulator.ts` y
`testOperationsLabFreezeEmulator.ts`. Para la suite inicial configurar también un correo
administrativo sintético compatible con `NEXT_PUBLIC_ADMIN_EMAIL`.

Para navegador, con el puerto 3000 libre:

```sh
npx firebase-tools emulators:exec --project demo-cuenta-hogar \
  --config firebase.operations-lab.emulator.json --only auth,firestore,storage \
  "npx tsx scripts/runOperationsLabBrowser.ts"
```

El runner inicia Next local con proyecto demo, E2E y las allowlists sintéticas. Crea cuentas
únicamente en Auth Emulator. No imprime tokens. El fallo de respuesta se inyecta en el cliente
sólo después de recibir la respuesta del commit; se recarga la pestaña y el retry conserva exactamente el comando. Se verificó un único pago persistido.
Las descargas usan un directorio temporal nuevo, evitando validar archivos de una prueba vieja.

## Alcance y pendientes reales

El caso es guiado y sus datos personales, documentación y firmas son sintéticos. Permite ajustar
producto y fechas antes de READY y realizar pagos parciales, sin editar los motores económicos.
No prueba firmas reales, exigibilidad jurídica, carga de documentos reales ni facturación ARCA.

La activación desplegada requiere aprobar configuración, UIDs y la restricción de Firestore
indicada en README. No se modificaron configuración, Rules desplegadas, IAM, secretos, Auth
productiva, expedientes ni datos financieros reales. No hubo merge ni deploy. El script local
`scripts/testBudgetV2HttpIdempotency.ts` permanece intacto y fuera del commit.

Verificación de los artefactos adjuntos, sin Firebase ni escrituras:

```sh
python3 scripts/verifyOperationsLabPdfs.py docs/operations-lab/evidence
```

Requiere Python 3 y `pypdf`; el resultado fue `LAB_PDF_PASS`, 68 comprobaciones.
