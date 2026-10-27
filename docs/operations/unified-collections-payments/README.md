# Cobranza unificada por cliente

Desde Administración → Cobranzas → **Gestionar cobranza** se abre la cuenta del cliente en un panel, sin pasar por Logística.

- Resumen: saldo, total cobrado, cuotas pagadas y vencidas, próximo vencimiento.
- **Registrar pago** abre importe, fecha, medio y referencia. El importe no se completa automáticamente; la acreditación se confirma explícitamente.
- **Cuotas**, **Pagos** y **Recibos** separan la consulta. El registro de contactos permanece disponible en el mismo panel.
- **Revertir pago** despliega únicamente el formulario de ese pago; requiere motivo y confirmación. El historial conserva los identificadores y la auditoría en detalles secundarios.
- El panel se cierra con Cerrar o Escape y devuelve el foco a su botón. No se cierra durante una escritura en curso.
- Fondos claros, texto oscuro y resumen móvil sin cortar importes.

La misma interfaz financiera se reutiliza en la ficha de operación y en los portales; sólo Administración conserva los controles de pago y reversa. Las rutas, autorización, recibos PDF, ledger FIFO, idempotencia y validadores no cambian.

## Datos y compatibilidad

`CollectionRow.operationId?: string` es un campo de composición local, tomado del GET autorizado del contrato. Permite registrar la primera cuota desde Cobranzas con la identidad existente; no modifica documentos, colecciones, payloads de comandos, Rules ni schemas guardados. Ante ausencia de identidad no se habilita esa acción.

## Validación

Entorno de escrituras: únicamente `demo-cuenta-hogar`; Auth 9099, Firestore 8080, Storage 9199. Navegador local con los handlers productivos reales y runtime de Emulator.

- `npx tsc --noEmit`.
- ESLint diferencial de los componentes, helper y suites afectadas.
- `npm run build` y `npm run test:safe`.
- `scripts/testUnifiedCollectionsPaymentsEmulator.ts`: panel desde Cobranzas, primera cuota $145.000 de total $1.740.000; saldo $1.595.000; pago parcial $72.500 y saldo $1.522.500; doble submit y respuesta perdida con retry único; reversa del parcial y saldo $1.595.000; recibo PDF autenticado; foco y Escape; desktop/móvil 390px sin desbordamiento.
- `scripts/runContractV2Browser.ts --financial-only`: regresión existente con selectores adaptados a la nueva navegación. Incluye tres perfiles, aislamiento, revocación, reconexión y paginación.

Capturas de datos sintéticos: [escritorio](desktop.png), [móvil](mobile.png).

No se realizaron escrituras productivas, merge, deploy ni cambios de configuración. El envío de WhatsApp continúa siendo manual.

## Resultado ejecutado

| Comprobación | Resultado | Entorno |
| --- | --- | --- |
| TypeScript, ESLint diferencial, build y test:safe | PASS | Local |
| Filtros, búsqueda y composición de Cobranzas | PASS | Suite pura |
| Primera cuota, pago parcial, doble submit, respuesta perdida/retry y reversa | PASS | Navegador + Emulator demo |
| Recibo PDF autenticado, foco y diseño desktop/móvil | PASS | Navegador + Emulator demo |
| Tres perfiles, acceso cruzado, revocación y reconexión | PASS | Navegador + Emulator demo |
| Paginación de 51 recibos, saldo y respuestas fuera de orden | PASS | Navegador + Emulator demo |
| Interfaz publicada de este cambio | PENDIENTE | Requiere merge y deploy autorizados |

La regresión histórica se adaptó a la navegación actual y a que el portal puede retirar por completo una ficha privada cuando pierde acceso. Se conservaron los asserts de HTTP 403, ausencia de saldos/recibos, integridad de fuentes y cero solicitudes Firebase productivas. Se mantuvieron las fechas UTC del fixture histórico y la validación original del servidor; no se añadió un límite de fecha nuevo al formulario.
