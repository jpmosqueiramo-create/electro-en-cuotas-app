# Firmas y entrega: operatoria diaria

Base: main `67b8c716db13b0047d9940890aefe1665f673983`. Rama `feature/simple-delivery-workspace`, separada del PR #101 de vendedores afiliados.

## Uso

1. **Documentos firmados**: abrir Mandato o Pagaré, adjuntar la imagen, consultar el archivo adjunto y guardar la verificación de la firma. Se seleccionan el documento y archivo correspondientes sin volver a pedir sus identificadores. La firma opcional de LOOP queda en un detalle secundario.
2. **Traslado y recepción**: registrar el documento externo en su tarjeta y luego la constancia firmada de recepción. Cada tarjeta abre su formulario en el mismo lugar y se cierra al guardar. Los archivos siguen privados.
3. **Originales y cierre**: registrar ubicación y referencia del paquete físico; el administrador puede confirmar su propia custodia o elegir otro responsable con evidencia. El responsable de entrega se obtiene de la custodia física ya acreditada, sin reescribir su UID. La entrega directa sigue correspondiendo al responsable; Administración puede registrar entrega con respaldo explícito mediante la regularización existente.

Al abrir la pantalla no se muestra ningún formulario de carga. Cada tarea tiene una acción y un estado; las acciones restantes, transferencias, recuperaciones e historial quedan agrupadas en secciones secundarias. El listado de pendientes indica qué falta para cerrar la entrega. Las fechas proponen el momento de apertura y son editables antes de confirmar lo ocurrido.

En móvil se compactan las cuatro pestañas de la operación para que Documentación no se corte en una letra aislada. Las acciones tienen altura táctil y los campos usan colores explícitos del tema administrativo.

## Integridad y compatibilidad

- Sólo cambia presentación y coordinación de acciones existentes. Sin nuevos campos persistidos, APIs, permisos, Rules, configuraciones o motores.
- Registrar una imagen no verifica ni presume la firma. Se conserva la confirmación explícita de identidad, legibilidad y firma física.
- Al asociar un documento emitido se reutilizan los datos del manifiesto actual, con sus hashes y versiones. El servidor conserva todos sus controles.
- El tipo y vínculo de la evidencia se obtienen del contexto del documento. Se mantienen reservas de carga, recuperación, reenvío del mismo archivo y acceso privado.
- La pérdida de respuesta conserva el identificador de carga o comando para reintentar sin duplicación. No se sustituyen evidencias, firmas ni datos históricos para obtener un resultado aprobado.
- Remito interno sólo se muestra donde corresponda por la política histórica; el circuito externo actual utiliza mandato, pagaré, documento de traslado y recepción firmada.
- Cobro, firma y entrega siguen siendo hechos separados. No se cambia el motor financiero ni su habilitación vigente para primera cuota antes de firma.

## Pruebas ejecutadas

| Comprobación | Resultado | Entorno |
|---|---|---|
| TypeScript, ESLint de los archivos modificados, build y test:safe | PASS | Código de esta rama |
| Recorrido completo de firmas, documento externo, recepción, originales, responsable y cierre | PASS | Chrome real local → handlers productivos → Emulator |
| Upload sin firma automática; pérdida de respuesta al subir y al guardar firma; reintentos sin duplicados | PASS | `scripts/testSimpleDeliveryWorkspaceEmulator.ts` |
| 1280 / 768 / 390 / 320 px, tareas inline sin overflow | PASS | Misma suite, capturas sintéticas |
| Primera cuota antes de firma, portales, saldos, revocación y documento alterado | PASS | `scripts/testFirstInstallmentBeforeDeliveryEmulator.ts` |
| Documentos históricos, tres firmas, custodia de originales, fotos privadas y concurrencia | PASS | `scripts/testOperationDeliveryV2Emulator.ts` |
| Adaptador productivo: paquete instalado, entrega externa y aprobación del propietario | PASS, 32 grupos | `scripts/testProductionAdapterEmulator.ts` |

La suite de primera cuota actualiza el texto del botón y exige además que el documento haya quedado preparado en el servidor; no debilita verificaciones financieras. Las pruebas del adaptador y entrega histórica se ejecutan con una instancia demo limpia por suite: un intento de encadenarlas compartiendo Auth encontró un correo sintético duplicado y se repitió aislado. No se modificaron sus aserciones para evitar ese rechazo.

Todas las escrituras usan únicamente `demo-cuenta-hogar`, Auth 9099, Firestore 8080 y Storage 9199. Las pruebas de navegador usan el harness local existente y no agregan endpoints desplegables. El tablero de alertas rechaza al correo demo que no coincide con el correo de las Rules; esa redirección transitoria no se incluye como validación del tablero ni se cambian Rules para ocultarla. Las rutas del recorrido de entrega no presentan errores 500. No hay nuevas emisiones ni cambios financieros en producción; el CH de los tests pertenece exclusivamente al Emulator.

## Capturas

- [Vista de escritorio](screenshots/simple-delivery/simple-delivery-overview-1280.png).
- [Vista móvil](screenshots/simple-delivery/simple-delivery-overview-390.png).
- [Firma en móvil estrecho](screenshots/simple-delivery/simple-delivery-signature-320.png).
- [Entrega completa en móvil](screenshots/simple-delivery/simple-delivery-complete-390.png).

Merge y despliegue pendientes de revisión del SHA exacto. No se incorpora el trabajo pendiente del PR #101.
