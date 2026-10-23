# Cierre técnico P1/P2 — PR #80

Referencia recibida: `918f3ea0ef3049c8ddd83f032218fa31f70f699a`; misma rama `feature/production-v2-activation`, base `70b47ef75ae94ba8decc61550b6ea98b096a72ee`. Esta revisión sustituye los pendientes técnicos P1/P2 del informe anterior; conserva su evidencia y la operatoria ya implementada. No hubo escrituras, lectura de expedientes, emisión, merge, deploy ni cambios de configuración en producción.

## Resultado y recomendación

**P1 PASS — recuperación de emisión vencida. P2 PASS — día local argentino.** Recomendación: revisión y merge manual del código, con ejecución productiva todavía cerrada. El despliegue requiere autorización separada del SHA mergeado. No habilitar emisión real hasta instalar el paquete exacto aprobado, autorizar numeración y configuración, y autorizar la operación concreta. El PR no registra aprobación jurídica ni asume que los originales aprueban textos derivados.

| Función | Estado técnico | Requisito antes de uso real |
|---|---|---|
| Solicitudes, presupuestos, Acceptance, ficha y evaluación | Conservadas | Permisos actuales; ninguna mutación automática |
| Emisión única, snapshot, número CH | PASS en motores normales sobre Emulator | Paquete exacto aprobado, contador inventariado/autorizado, administrador y operación autorizados |
| Recuperación de archivos con permiso vencido | PASS en Emulator y navegador | Nueva autorización específica de hasta 24 h; origen y paquete no revocados; mismo snapshot y renderer |
| Firmas, originales, transferencias y entrega | PASS; tres firmas y custodia obligatorias | Hechos y evidencias reales, sin aprobación jurídica inferida |
| Ledger, pagos parciales/completos, recibos, reversas | PASS; una fuente financiera | Entrega y autorización por operación; no se activó cobranza real |
| Cliente y vendedor afiliado | PASS; aislamiento y revocación | Vínculos UID y roles explícitamente autorizados; no se asignaron correos personales |
| Historial jurídico y de autorizaciones | PASS; páginas acotadas, sin índices nuevos | Cuenta administrativa vigente; las consultas no escriben |
| Catálogo jurídico definitivo | BLOQUEADO por documentación | Mandato/pagaré exactos derivados, remito, representación/facultades, jurisdicción y evidencia profesional identificada |
| ARCA real / liquidaciones productivas de comisiones | NO HABILITADAS | Fuera de este cierre |
| Defectos P1/P2 solicitados | RESUELTOS | No se identificó otro defecto bloqueante en el alcance ejercitado |

## P1: mismo instrumento, autorización nueva

`issuanceRecovery.ts` registra un permiso independiente, inmutable e idempotente ligado a operación, snapshot, número, autorización original, paquete, aprobación jurídica, renderer y recursos por hash. No actualiza la autorización vencida ni amplía sus otros alcances. Sólo una cuenta administrativa activa/verificada y expresamente habilitada puede autorizar; motivo, actor e instante UTC quedan auditados. Revocar el original o el paquete impide recuperar. La autorización de recuperación también vence y se puede revocar.

`documents.ts` revalida antes de cada escritura transaccional. Storage continúa fuera de transacciones; paths determinísticos y creación condicional por generación evitan otro pagaré. Se conservan bytes y metadatos de archivos ya comprometidos. Un manifiesto completo se devuelve como replay de lectura, sin cambiar `updateTime`, aunque el permiso haya vencido. No se reescriben fechas del instrumento; `issuedAt` es el instante UTC de finalización del manifiesto, distinto del día efectivo original.

La prueba interrumpe después de crear el mandato, deja el pagaré pendiente y vence el permiso sin editar su registro. Rechaza el intento normal, genera una nueva autorización, prueba revocación/caducidad, recupera con dos solicitudes concurrentes y compara snapshot, número, autorización original, fechas, hashes, generaciones y `updateTime`. Hay tres objetos, un solo manifiesto y un solo evento de emisión. El replay posterior a caducidad tampoco escribe. Se prueban HTTP 403 para anónimo/cliente/afiliado y 409 para IDs vacíos/nulos; los cursores inválidos o duplicados se rechazan.

La interfaz exige dos decisiones distintas: autorizar la recuperación y ejecutar con ese permiso. Cambiar campos invalida la confirmación. La primera corrida visual detectó que un refresco idéntico borraba una confirmación recién marcada; se corrigió comparando el contexto relevante y se repitió el recorrido, conservando las assertions.

## P2: fecha local, auditoría UTC

`businessDate.ts`: `AR_LOCAL_ISSUE_DATE_V1`, `America/Argentina/Buenos_Aires`. El congelamiento verifica las dos fechas autorizadas contra el día argentino del mismo instante que registra en `termsFrozenAt`. No sustituye fechas ni cronogramas. Un cambio de día exige otra autorización explícita antes de congelar. La recuperación nunca fija una nueva fecha.

Ocho casos cubren 21:00, 22:30, 23:59:59.999, 00:00, cambio de año y febrero bisiesto. Prueban ambas fechas, UTC intacto y ausencia de mutación. Se agregan identificadores de política/zona a los parámetros de nuevas autorizaciones; los snapshots históricos sin esos parámetros continúan validándose con sus hashes originales.

## Mejoras operativas y numeración

Historial de aprobaciones, autorizaciones y recuperaciones: 20 registros por tipo y un elemento adicional para detectar siguiente página; cursores por ID en colecciones fijas. Probado con más de 50 aprobaciones y más de 20 autorizaciones, sin omisiones ni duplicados. La interfaz permite volver a la primera página y seguir avanzando. No necesita índices compuestos ni migraciones.

[Procedimiento de numeración y anulación](LAUNCH_CONFIGURATION.md#anulación-de-una-reserva-ch-sin-reutilización): revocación auditada de la operatoria, conservación de reserva/snapshot/archivos y contador que nunca retrocede. No existe una función que declare extinguida jurídicamente la obligación; esa decisión requiere evidencia y procedimiento independiente. Originales posteriores a entrega mantienen emisor, receptor, ubicación e historia; la prueba confirma transferencia y evento de entrega intacto, bloqueando finanzas mientras está pendiente.

## Validaciones ejecutadas

| Comando / alcance | Resultado |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint` sobre 11 archivos TS/TSX modificados/nuevos | PASS, cero diagnósticos |
| `npm run build` | PASS, Next/Turbopack y verificación de manifiesto |
| `npm run test:safe` | PASS; no existe script npm `test` |
| `npx tsx scripts/testProductionIssueDate.ts` | PASS, ocho bordes de calendario y validaciones negativas |
| `npx tsx scripts/testProductionRendererManifest.ts` | PASS, 17 fuentes/dependencias, hash estable normal/minificado |
| `testProductionAdapterEmulator.ts` | PASS, 30 grupos; [resultados](evidence/technical-closure/adapter-results.json) |
| `testProductionAdapterBrowser.ts` | PASS, 17 capturas; tres perfiles y recuperación por API real; [resultados HTTP](evidence/technical-closure/browser-results.json) |
| Documentos sintéticos | PASS de texto nativo, hashes, branding, importes/fechas y revisión visual; [verificación](evidence/technical-closure/pdf-check.json) |

Firebase únicamente `demo-cuenta-hogar`: Auth 9099, Firestore 8080, Storage 9199; hosts locales y credenciales productivas excluidas por el launcher y la guarda del runtime. El navegador utiliza Next local más exports reales de las rutas existentes en el proceso de test; no se añade endpoint temporal. Las cuentas se crean sólo en Auth Emulator. El endurecimiento final de IDs vacíos se validó además por HTTP en Emulator; no cambia el recorrido visual válido ya ejecutado.

Se conserva la denegación preexistente del listener SDK de alertas del administrador sintético; no afecta las APIs del recorrido ni justifica relajar Rules. Se documenta como limitación del harness. Los rechazos de invitación/custodia sin autorización son esperados. Las regresiones jurídicas/fiscales previamente aprobadas no se vuelven a atribuir a este HEAD: sus motores/textos no cambiaron; se reejercitó la integración contractual/financiera/roles afectada.

## Economía y evidencias

Capital $580.000 + servicios brutos con IVA incluido $1.160.000 = **$1.740.000**, igual al pagaré. **12 × $145.000**; primeras cuotas 2026-12-15 y 2027-01-30; febrero 2027-02-28 y último vencimiento 2027-11-30. Los doce importes y fechas del PDF se compararon con el snapshot. Pago $145.000 → saldo $1.595.000; reversa → $1.740.000 en los tres perfiles. También se ejercitan pagos parciales y reversas exactas, sin IVA adicional ni segundo ledger.

| Evidencia | Escritorio | Móvil |
|---|---|---|
| Recuperación vencida | [Captura](evidence/technical-closure/recovery-pending-desktop.png) | [Captura](evidence/technical-closure/recovery-pending-mobile.png) |
| Recuperación completada | Flujo HTTP verificado | [Captura](evidence/technical-closure/recovery-completed-mobile.png) |
| Administración | [Captura](evidence/technical-closure/admin-paid-desktop.png) | [Captura](evidence/technical-closure/admin-paid-mobile.png) |
| Cliente | [Captura](evidence/technical-closure/client-paid-desktop.png) | [Captura](evidence/technical-closure/client-paid-mobile.png) |
| Vendedor afiliado | [Captura](evidence/technical-closure/affiliate-paid-desktop.png) | [Captura](evidence/technical-closure/affiliate-paid-mobile.png) |

[Muestra de mandato](evidence/technical-closure/MANDATE.pdf), [pagaré](evidence/technical-closure/PAGARE.pdf), [remito](evidence/technical-closure/REMITO.pdf) y [recibo](evidence/technical-closure/RECIBO.pdf): son pruebas con emisor/texto ficticios, sin validez; no son el paquete jurídico final. Mandato/remito/recibo tienen logo; pagaré no contiene imágenes. Se inspeccionaron las cuatro páginas, contrastando extracción nativa y render PDFium aislado ante resultados incompletos del renderer local reutilizado; no se modificó el generador ni el manifiesto de recursos.

## Catálogo y requisitos reales pendientes

Los hashes de los dos originales se volvieron a comprobar; siguen exactos y no se alteraron cláusulas. [Matriz y textos íntegros](legal-package/README.md). `finalPackages.json` sigue `[]`. La declaración permanece `OWNER_REPORTED`; no se creó un registro profesional ni se aprobó una plantilla derivada.

Faltan: versión final exacta de mandato y pagaré con evidencia de aprobación de las diferencias; modelo independiente de remito aprobado; representación/facultades y jurisdicción; catálogo final con hashes de texto/renderer/recursos y evidencia profesional identificada. Fecha/lugar efectivos, autorización de operación, inicialización CH y configuración administrativa son decisiones independientes posteriores. No se exige repetir la revisión ya hecha de un original; se necesita vincular la evidencia a los instrumentos exactos que se emitirían.

El script local `scripts/testBudgetV2HttpIdempotency.ts` sigue sin versionar y conserva SHA-256 `09fb398ff9c634f7c5ca32a3769518dbde67d8ebca3f1f59a930ccdfe6340881`. El adaptador Emulator anterior, fórmulas, cláusulas, Rules, IAM, secretos, configuración y datos productivos no se modificaron. Sin nueva infraestructura ni migraciones propuestas por este cierre.
