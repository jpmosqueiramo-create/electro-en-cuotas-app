# Verificaciones del cierre de PR #80

Sólo pruebas afectadas por los cambios; producción: **cero escrituras**. Firebase: `demo-cuenta-hogar`, Firestore `127.0.0.1:8080`, Auth `127.0.0.1:9099`, Storage `127.0.0.1:9199`. Variables de credenciales productivas removidas del proceso; factory de test valida estos límites. No se crearon cuentas reales ni nuevas funciones de laboratorio.

| Verificación ejecutada | Resultado | Evidencia |
|---|---|---|
| TypeScript | PASS, salida 0 | `tsc --noEmit` |
| ESLint diferencial de 9 TS/MJS del cierre | PASS, sin diagnósticos | Lista exacta en `quality-gates.json` |
| Build Next/Turbopack y gate de manifiesto | PASS, salida 0 | `npm run build`; 17 fuentes verificadas |
| `test:safe` | PASS, salida 0 | Suites existentes sin cambios |
| Manifiesto del renderer | PASS | Fuentes/dependencias, hash igual en tsx/bundle normal/minificado, datos finales separados sin ciclo |
| Adaptador normal en Emulator | PASS, 25 grupos | [Resultados](evidence/closure/adapter-results.json) |
| Auth revocada / deshabilitada / rol obsoleto / no admin / anónimo | PASS | `testAdminAuthRevocationEmulator.ts` |
| Navegador desktop/mobile, tres cuentas sintéticas independientes locales | PASS, 14 capturas revisadas | [HTTP y resultados](evidence/closure/browser-results.json) |
| Documentos sintéticos del adaptador, cuatro páginas | PASS de integridad/texto/importes/branding | [Hashes y páginas](evidence/closure/pdf-check.json) |
| Originales exactos y borradores actuales | Cotejados, sin aprobación transferida | [Paquete documental](legal-package/README.md) |
| Recuperación tras vencimiento de emisión | PENDIENTE: flujo no implementado | No se presenta como PASS |
| Emisión con textos jurídicos finales reales | BLOQUEADA: faltan paquete y evidencia | No se ejecutó ni simuló aprobación real |

Se reprodujo el error de custodia antes de corregirlo: `PRODUCTION_DELIVERY_REQUIRED` al intentar completar transferencia de originales posterior a entrega. Después del ajuste: lectura permitida, activación bloqueada durante la transferencia, participante incorrecto rechazado, entrega/recepción correctas completadas y evento original intacto.

Los 25 grupos incluyen hashes históricos y `updateTime` intacto; revocación de paquete y permiso; origen/identidad/conformidad; congelamiento único; concurrencia e interrupción de Storage; generación reemplazada; tres firmas y originales; activación única; pagos/replay/reversa; cliente revocado y aislamiento de cuentas. No se eliminaron assertions.

## Resultado económico exacto

Capital **$580.000** + servicios brutos con IVA incluido **$1.160.000** = total **$1.740.000**. Doce cuotas de **$145.000**. Primer vencimiento 2026-12-15; restantes al día 30, con febrero ajustado a 2027-02-28; último 2027-11-30. Comparadas las doce fechas e importes persistidos con el texto PDF. Pagaré por $1.740.000, sin sumar IVA.

Pago de $145.000 → saldo $1.595.000; reversa → saldo $1.740.000 en Administración, cliente y afiliado. Recibo de pago acreditado y referencia a reversa preservados. Comisiones separadas de deuda.

## Evidencias visuales

| Superficie | Escritorio | Móvil |
|---|---|---|
| Documentos | [Captura](evidence/closure/issued-documents-desktop.png) | [Captura](evidence/closure/issued-documents-mobile.png) |
| Administración | [Captura](evidence/closure/admin-paid-desktop.png) | [Captura](evidence/closure/admin-paid-mobile.png) |
| Cliente | [Captura](evidence/closure/client-paid-desktop.png) | [Captura](evidence/closure/client-paid-mobile.png) |
| Vendedor afiliado | [Captura](evidence/closure/affiliate-paid-desktop.png) | [Captura](evidence/closure/affiliate-paid-mobile.png) |

Se guardan ocho capturas representativas nuevas; se revisaron las catorce del runner. El navegador usa Next local y exports reales de rutas HTTP en un proceso de prueba aislado, sin endpoints de test desplegados. No demuestra comportamiento de infraestructura App Hosting ni uso de las cuentas del propietario. El recorrido se ejecutó antes de la separación final del JSON de catálogo; esa separación conserva el mismo catálogo vacío y no cambia interfaz/rutas. Se revalidó el adaptador completo después, sin repetir el navegador por ese movimiento de datos.

Muestras sintéticas, **no textos jurídicos finales**: [Mandato](evidence/closure/MANDATE.pdf), [Pagaré](evidence/closure/PAGARE.pdf), [Remito](evidence/closure/REMITO.pdf), [Recibo](evidence/closure/RECIBO.pdf). Todas con leyenda de prueba y texto seleccionable. Mandato/remito/recibo con logo; pagaré sin imágenes. Poppler local presentó sustitución incompleta de fuentes en dos renders; se contrastó con PDFium y extracción nativa, que mostraron el contenido completo. No se alteró el generador para ocultar esa limitación del visor local.

El listener SDK de alertas de la identidad sintética conserva una denegación preexistente; las APIs del recorrido pasan. Los 403 de acceso a custodia sin participación y enlace de invitación sin identidad son esperados. No se relajan Rules ni se declara consola completamente limpia.

Las regresiones jurídicas/fiscales/financieras/clientes y de solicitudes aprobadas previamente permanecen documentadas en [TEST_RESULTS.md](TEST_RESULTS.md), con su HEAD original. No se volvieron a ejecutar por los cambios exclusivamente documentales. [quality-gates.json](evidence/closure/quality-gates.json) conserva comandos, códigos de salida y hashes de los logs de esta revisión.
