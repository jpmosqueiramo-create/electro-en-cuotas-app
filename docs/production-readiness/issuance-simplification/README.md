# Emisión sin formularios manuales redundantes

Base revisada: `584931c84facf2e1d2be5fe99b7c692cf6af2ba8`.

## Resultado

El panel conserva un único botón «Emitir contrato y pagaré». Se retiraron los formularios visibles de autorización manual, aprobación separada del paquete y congelamiento manual. También se retiró de la ficha el workspace documental antiguo, que mostraba restricciones de etapas anteriores, y el botón separado de revisión técnica. El backend existente registra la confirmación administrativa, el paquete exacto y la revisión durante `ISSUE_EDITOR`.

Los pendientes se muestran junto al botón, con navegación directa. La conformidad pendiente abre su sección. El cronograma incompatible con el rango del texto instalado se informa antes de intentar emitir; las fechas guardadas no se corrigen automáticamente. Esta presentación utiliza el paquete que selecciona el motor existente; no modifica cláusulas ni el validador contractual.

El historial, los documentos privados, la recuperación de emisiones interrumpidas, las revocaciones y las correcciones previas a firma con el mismo CH se conservan. No se eliminaron registros ni rutas históricas.

## Validación

Resultado: **PASS** en TypeScript, ESLint diferencial, build, `test:safe` y los 18 grupos reportados por la suite Emulator (incluye suites importadas). El recorrido de emisión se ejecutó desde navegador real contra rutas locales y emuladores.

- TypeScript, ESLint diferencial, build (incluida integridad del renderer) y `test:safe`.
- `testSimpleContractIssuanceEmulator.ts`, con Auth, Firestore y Storage en `demo-cuenta-hogar`: controles previos a CH; permisos; conformidad vencida; idempotencia/concurrencia; documentos privados; evidencia de entrega; sustitución de PDF; edición de READY; ausencia de formularios antiguos; fechas incompatibles sin cambio automático ni consumo CH; navegación a conformidad; emisión desde navegador desktop/mobile; revisión posterior con el mismo CH e historial inmutable.
- Capturas: [desktop](desktop.png), [mobile](mobile.png), sólo datos sintéticos.
- El harness genera mandato y pagaré definitivos de prueba mediante los motores y rutas existentes. No se ejecutaron emisiones, conformidades, pagos ni cambios de configuración en producción.

Límite conocido del harness: el dashboard administrativo inicial registra una denegación de listado SDK bajo sus Rules locales; la ficha y las rutas administrativas de emisión se probaron por HTTP y completaron el recorrido. No se relajaron Rules para ocultar ese diagnóstico.

## Publicación

Merge y despliegue de este PR quedan pendientes de autorización. No requiere migración, instalación de catálogo, reinicialización CH ni cambio de variables, Rules, permisos o usuarios. La conformidad real del cliente debe corresponder a los datos guardados; no se presume ni se registra desde las pruebas.
