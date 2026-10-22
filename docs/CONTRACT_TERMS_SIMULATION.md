# Simulación económica y sincronización crediticia

La preparación definitiva ya estaba correctamente protegida por `assertCreditPreparation`: para operaciones incorporadas a evaluación, `SET_CONTRACT_PLAN`, `SET_PAYMENT_DATES` y READY exigen aprobación manual vigente, datos aplicados y documentos verificados, vigentes e íntegros. READY y términos congelados también bloquean edición. No se modifican esas validaciones ni la compatibilidad histórica de operaciones no incorporadas a evaluación.

## Corrección de interfaz

- Las secciones 4 y 5 permiten simular antes de aprobar, incluso con datos/documentos pendientes o resolución rechazada. Se identifica el estado, el siguiente paso y el acceso a datos o evaluación.
- `ContractTermsFields` llama directamente a `contractEconomics` y `contractSchedule` sobre el snapshot aceptado. Sus controles informativos usan estado local: no cambian el draft ni envían comandos. No se recalculan presupuestos históricos ni se consultan precios vivos.
- La simulación no confirma condiciones ni genera obligaciones. Tras aprobar, se selecciona explícitamente el plan definitivo mediante el comando existente; las fechas sólo se guardan con el botón correspondiente. Se conservan las reglas de conformidad del cliente cuando cambian condiciones.
- Las condiciones ya guardadas se conservan cuando una aprobación deja de estar vigente.

La habilitación anterior sólo se consultaba al montar el panel o ejecutar comandos de evaluación. Podía quedar desactualizada tras guardar datos del borrador o cargar/observar documentos. Ahora:

- La aprobación consultada queda asociada a la revisión del borrador. Una revisión diferente bloquea el guardado hasta volver a comprobarla.
- Las revisiones documentales y resoluciones siguen consultando inmediatamente el estado servidor. El módulo de carga documental avisa a la evaluación después de actualizar su información.
- Se consulta también al volver a la pestaña y cada minuto mientras está visible, para detectar vencimientos y cambios de otras sesiones. El servidor revalida cada escritura aunque la pantalla todavía no haya detectado un cambio externo.
- Las respuestas antiguas se descartan y un fallo de consulta no habilita guardados.

No se añaden estados persistidos, campos, colecciones, APIs, migraciones, Rules ni permisos. No cambian factores, fórmulas, calendario o vencimientos. La ausencia histórica de evaluación mantiene la política previa del servidor; no se presenta como una aprobación nueva ni se migra silenciosamente.

## Bloqueos conservados

La preparación técnica cerrada exige volver explícitamente a borrador con motivo. Congelamiento, numeración CH, emisión definitiva, formalización, entrega, invitaciones y cobranza productivas siguen bloqueados. La aprobación crediticia no constituye aprobación jurídica.

## Verificación

Las suites `testCreditReviewV2Emulator.ts` y `runCreditReviewV2Browser.ts` cubren estados pendientes, revisión, rechazo, aprobación vigente e invalidación por datos/documentos/vencimiento, simulación sin escrituras, guardas de plan/fechas y sumatoria/calendario. El runner de navegador obtiene capturas de ambas secciones antes y después de aprobar en desktop y mobile bajo `/tmp/cuenta-hogar-credit-review-v2/`. Las pruebas utilizan únicamente `demo-cuenta-hogar` y Emulators; no modifican producción.
