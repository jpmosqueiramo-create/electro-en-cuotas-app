# Validación del ajuste

Fecha: 2026-10-25. Proyecto de todas las escrituras: **demo-cuenta-hogar**. Sin credenciales productivas; Auth 9099, Firestore 8080, Storage 9199 cuando corresponde. Navegador en localhost:3000. No hubo publicación, cambios de Rules, configuración, usuarios reales ni consumo CH productivo.

| Verificación | Resultado | Evidencia |
| --- | --- | --- |
| `npx tsc --noEmit` | PASS | `/tmp/ch-admin-removal/tsc.log`, salida 0 |
| ESLint de todos los TS/TSX modificados y nuevos | PASS, sin diagnósticos | `/tmp/ch-admin-removal/eslint.log`, `browser-eslint.log` |
| `npm run build` y manifiesto de renderer | PASS | `/tmp/ch-admin-removal/build.log`, salida 0 |
| `npm run test:safe` | PASS | `/tmp/ch-admin-removal/safe.log`, salida 0 |
| `testAdminRecordRemovalEmulator.ts` | PASS | `/tmp/ch-admin-removal/emulator.log` |
| `testBudgetV2DeletionEmulator.ts` | PASS | Misma ejecución; limpieza definitiva existente conservada |
| `testAdminRecordRemovalBrowser.ts`, 1280 y 390 px | PASS | `/tmp/ch-admin-removal/browser-final.log`, capturas adjuntas |
| `testSimpleOperationBrowser.ts`, 1280 y 390 px | PASS | `/tmp/ch-admin-removal/simple-browser.log` |
| `testProductionAdapterEmulator.ts`, originales y entrega externa | PASS, 31 grupos | `/tmp/ch-admin-removal/production-emulator.log` |
| `testOriginalDocumentIntegrationEmulator.ts` | PASS, 6 grupos | `/tmp/ch-admin-removal/document-emulator.log` |
| `git diff --check` | PASS | Sin errores de formato |

## Casos ejecutados

- Eliminación y restauración de solicitud, presupuesto y contrato, en ambos tamaños.
- Dos solicitudes con el mismo ID en colecciones diferentes no comparten marcador.
- Replay y doble clic: un solo efecto, sin segunda fecha de actualización. Conflicto de contenido rechazado.
- Concurrencia: mismo comando converge; intenciones diferentes con el mismo inventario no confirman ambas.
- Cambio entre PREVIEW y confirmación rechazado.
- Archivo con relaciones y conservación de documentos financieros; originales con `updateTime` inalterado.
- Contrato retirado: enlace privado, escritura contractual y congelamiento bloqueados; restauración recupera el flujo.
- API anónima 401, cliente/afiliado 403, administrador verificado autorizado. Registro de estado denegado incluso al SDK administrativo.
- Una sola acción principal en el encabezado; el botón de eliminación es secundario. Se conservan los cuatro pasos, datos locales no guardados, enlaces privados y vistas secundarias de logística, afiliado y cuotas.
- Acceso visible a emisión definitiva sin abrir detalles avanzados. La prueba visual no declara habilitada la emisión productiva.
- Adaptador productivo en Emulator: aprobación exacta, numeración concurrente única, emisión interrumpida y recuperación, un único pagaré, hashes/fechas inmutables, bloqueo de PDF sustituido, firmas/evidencias externas, activación financiera única, mismos saldos entre roles, pagos parciales, recibos, reversas y revocación.
- Proyección documental: mismos originales y orden de cláusulas, conciliación económica explícita, mandato y pagaré desde una fuente, sin remito interno ni numeración en preview.

## Ajustes de pruebas y controles preservados

La prueba antigua de ficha contaba todos los botones del encabezado como si fueran principales. Ahora cuenta explícitamente `.btn-primary`, manteniendo el requisito de una sola acción principal y permitiendo la eliminación secundaria.

La misma prueba esperaba siempre «Ir a documentación y evaluación». Ahora comprueba el acceso y destino correspondientes al pendiente real: datos o documentación. No se quitaron assertions ni se relajaron validaciones de producto.

La primera prueba de denegación SDK detectó que una colección raíz nueva heredaba permisos administrativos. Antes de entregar se trasladó el registro a un subespacio de servidor ya protegido por las Rules. La assertion 403 se conserva y pasó. No se modificaron Rules.

Para navegador, la copia temporal de Rules conserva la política y sustituye exclusivamente el correo administrativo por `admin@example.invalid` para usar una cuenta sintética. La regresión del adaptador utiliza las Rules versionadas. Ninguna de estas ejecuciones publica Rules.

## Límites

No se hizo una emisión real ni se habilitó producción. El catálogo final continúa vacío. El manifiesto técnico de renderer se actualizó por la nueva dependencia de validación administrativa; no cambia los textos jurídicos ni transfiere aprobaciones anteriores. Los hashes de documentos históricos no se reescriben.

Los logs detallados permanecen locales; las capturas del PR contienen exclusivamente datos sintéticos. Los archivos locales protegidos no forman parte del commit.

## Capturas

- [budget-1280](screenshots/budget-1280.png)
- [budget-390](screenshots/budget-390.png)
- [contract-1280](screenshots/contract-1280.png)
- [contract-390](screenshots/contract-390.png)
- [contract-restored-390](screenshots/contract-restored-390.png)
- [issuance-1280](screenshots/issuance-1280.png)
- [issuance-390](screenshots/issuance-390.png)
- [request-1280](screenshots/request-1280.png)
- [request-390](screenshots/request-390.png)

## Integración previa al merge con PR #89 y #90

Base actual: `2b37b930236753067b236c8db15d358c3259d1c7`. Se conserva la aprobación administrativa por el titular (sin volver a exigir un profesional), los originales finales, su logo y el acceso directo a emisión. El conflicto se limitó al selector de autorizaciones y su etiqueta; se mantiene la distinción de aprobaciones del titular y profesionales históricas.

La dependencia de retiro administrativo cambia el manifiesto técnico de 26 a 28 fuentes. Para no dejar el catálogo con un renderer incompatible, el paquete pasa a `loop-owner-final-20261025-v2` / `OWNER_FINAL_UPLOADED_20261025_V2`, hash `5a7649a57cdc4353c11c55f66c8b99b321c1f841c165c752f1423c7c52b069ce`. **Los textos, plantillas, sus hashes, economía y reglas de emisión permanecen idénticos.** El catálogo publicado anterior se conserva completo en `catalog-before-integration.json`. No se transfiere una aprobación anterior al nuevo hash técnico ni se reescriben aprobaciones, snapshots o instrumentos históricos. Si ya se registró la aprobación V1, debe confirmarse expresamente la revisión técnica V2 después de su publicación.

Esta integración no modifica variables, Rules, IAM, Auth, numeración CH ni registros productivos. La autorización actual comprende el merge; la publicación requiere autorización del SHA resultante.

Resultado de la integración: PASS TypeScript, ESLint diferencial (sin diagnósticos), build, test:safe, manifiesto de 28 fuentes, integridad del catálogo y 63 comprobaciones históricas. PASS Emulator: 32 grupos del adaptador con catálogo técnico V2 y aprobación del titular; retiro/restauración, concurrencia, idempotencia, permisos y denegación SDK; regresión de borrado seguro de presupuestos. PASS navegador real en localhost (1280 y 390 px): solicitud, presupuesto y contrato retirados/restaurados, doble clic, updateTime canónicos conservados y acceso visible a emisión. Las capturas se actualizaron con esa ejecución sintética. No se eliminaron assertions. Logs `/tmp/ch88-integration-{tsc,eslint,build,safe,emulator,browser,catalog,manifest,historical}.log`.
