# Vendedores afiliados: ventas, comisiones y rendiciones

Base actualizada: main `67b8c716db13b0047d9940890aefe1665f673983` (PR #102 publicado). Rama: `feature/affiliate-management`.

## Uso

1. En **Vendedores afiliados**, buscar por nombre, apellido, correo o localidad; filtrar activos/inactivos. **Agregar vendedor afiliado** y **Editar** usan el registro existente. El porcentaje se aplica a cobros futuros y no reescribe los movimientos anteriores.
2. En **Acceso al portal**, buscar la cuenta existente por su correo exacto y guardar para confirmar su vinculación. La cuenta debe estar activa y verificada; no se crean usuarios Auth ni se elevan roles. Una vinculación existente no puede reemplazarse con otra identidad.
3. **Ver operaciones y comisiones** abre la cuenta seleccionada. En **Operaciones → Asignar operación nueva o en curso**, buscar cliente/producto/CH y elegir una operación con aceptación. Confirmar la asignación. La custodia pendiente sigue impidiendo una reasignación incompatible.
4. En **Comisiones**, consultar movimientos y porcentajes históricos. La comisión se devenga sobre pagos efectivamente acreditados, con las reglas existentes.
5. En **Pagos**, consultar **Disponible**, **Reservado**, **Total pagado** y **A recuperar**. Preparar un importe, confirmar su reserva y, después de realizar el pago, registrar transferencia/efectivo y referencia. Cada paso requiere confirmación. Una reserva confirmada pendiente puede cancelarse con motivo. Preparar o reservar no marca un importe como pagado.
6. En **Efectivo y rendiciones**, ver cuánto dinero de cuotas tiene el vendedor afiliado y registrar lo que ya entregó o depositó, con importe, medio, referencia y observación opcional. La confirmación reduce el efectivo pendiente; no paga ni compensa automáticamente comisiones.
7. **Dar de baja / Reactivar** abre el registro para confirmar el estado. La baja impide nuevas asignaciones y acceso al portal. Las operaciones ya asignadas conservan su comisión y admiten cobros; para cambiar el beneficiario hay que reasignarlas. Administración conserva acceso a sus saldos, pagos y rendiciones.
8. El vendedor afiliado consulta sólo sus comisiones, pagos y efectivo registrado en su portal. Administración y portal actualizan al recuperar foco y cada 30 segundos mientras están visibles. No se crean cobros ni rendiciones por actualización.

El menú y el inicio ofrecen un único acceso **Vendedores afiliados**. `/admin/rendiciones` redirige al mismo panel; no quedan dos listas ni un enlace circular. Cada tarjeta muestra comisión disponible y efectivo en custodia; permite filtrar quienes tienen efectivo pendiente. Los saldos no verificables dicen **Sin verificar**.

## Correcciones y controles

- La consulta anterior aplicaba una guarda de Emulator a todos los movimientos V2, incluso los generados por el adaptador productivo; por eso fallaba una cuenta con comisiones reales. Ahora la lectura productiva exige contexto servidor autorizado y verifica snapshot íntegro, operación, pago, asignación de cuota y porcentaje histórico. Una cuenta no verificable no se presenta como saldo cero.
- Los archivos de las rutas antiguas de confirmar/anular contenían handlers copiados de otros recursos. Ahora sus POST delegan al mismo adaptador administrativo con beneficiario derivado en servidor.
- El adaptador reutiliza `crearBorradorLiquidacion`, `confirmarLiquidacion`, `anularLiquidacion`, `pagarLiquidacion` y `registrarRendicionEfectivo`, sus reservas FIFO y validaciones de incidencias. No cambia cálculo, base ni porcentajes de comisiones.
- Escrituras: administrador actual, activo, con correo verificado, email administrativo y UID en la allowlist del servidor; además `PRODUCTION_OPERATIONS_ENABLED=true`. La UI no puede aportar una bandera para evitar esos controles.
- Beneficiario e importe del pago se derivan de la liquidación persistida. El cliente no puede aportar un monto de pago distinto. Transferencia/efectivo y referencia son explícitos.
- Recibo de comando y transición del motor se guardan en la misma transacción. Repetir el comando devuelve el resultado original; cambiar su contenido produce conflicto. Un nuevo comando no vuelve a pagar una liquidación PAGADA.
- Una reversa de origen impide pagar reservas insuficientes. Si la comisión ya fue pagada, se conserva como importe a recuperar de comisiones futuras.
- La reasignación conserva los movimientos y sus beneficiarios originales. Los siguientes cobros utilizan la asignación vigente. No cambia expedientes económicos, contratos ni cuotas existentes.
- El selector ofrece únicamente perfiles activos, con UID único y Auth activo/verificado. Los controles existentes de transferencia física siguen vigentes.

## Compatibilidad y datos

Nuevo registro interno: `vendedores/{id}/settlementCommands/{commandId}`:

| Campo | Tipo | Uso |
|---|---|---|
| digest | string SHA-256 | Contenido exacto de actor, beneficiario, acción y datos |
| action | PREPARE / CONFIRM / CANCEL / PAY / REMIT | Acción explícita |
| actor | string UID | Administrador que confirma |
| at | string ISO UTC | Auditoría |
| result | objeto de liquidación o rendición existente | Resultado idempotente |

Las Rules existentes ya restringen recursivamente `vendedores` a Administración. No se modifican Rules. No hay migración ni modificación de liquidaciones históricas. Los comandos antiguos sin este recibo permanecen consultables; el estado PAGADA evita otro pago.

La respuesta de listado añade `cuentaVerificada` y permite `null` en saldos no verificables; registro/selector no usan esos saldos. La ficha obtiene una lectura verificada independiente. La vinculación nueva exige correo verificado coincidente; no reescribe vinculaciones históricas.

La acción `REMIT` exige importe entero positivo en centavos, medio `EFECTIVO_EN_MANO` o `EFECTIVO_DEPOSITO`, referencia no vacía (hasta 200 caracteres) y observación hasta 500 caracteres. Utiliza el mismo recibo atómico administrativo; el motor existente limita la rendición al saldo real bajo custodia. Registra en `rendiciones_efectivo` y `ledger_custodia_efectivo`, sin nueva colección ni migración.

El portal añade `cashHeldCents` y `remittances` con importe, fecha, medio y referencia propios. No expone movimientos de otros vendedores ni UIDs administrativos. El efectivo se deriva exclusivamente del ledger de custodia: no se atribuye un pago al vendedor sólo porque figure EFECTIVO o porque esté asignado a la venta.

La baja conserva el vínculo y la configuración de las ventas ya asignadas. `preparePaymentCommissions` sigue comprobando perfil, UID y configuración, pero deja de rechazar el cobro de esas ventas únicamente por el estado inactivo. No cambia bases, porcentajes históricos, fórmulas ni reversas. Nuevas asignaciones siguen exigiendo vendedor activo y cuenta verificada.

El harness local ahora resuelve rutas estáticas antes que parámetros dinámicos, como Next: `/vendedores/registro` no debe caer en `/vendedores/[id]`. Este ajuste sólo afecta pruebas.

## Verificación

| Comprobación | Resultado | Evidencia |
|---|---|---|
| TypeScript | PASS | `npx tsc --noEmit` |
| ESLint diferencial | PASS: 0 diagnósticos nuevos; 42 diagnósticos históricos de settlementsEngine idénticos a main | Comparación de mensajes/reglas contra main, incluyendo archivos históricos |
| Build | PASS | `npm run build`, manifiesto del renderer intacto |
| Suites seguras | PASS | `npm run test:safe` |
| Efectivo, rendición, permisos, doble clic, concurrencia y respuesta perdida | PASS | `scripts/testAffiliateCashUnifiedEmulator.ts`, navegador 1280/768/390/320, rutas reales y Emulator |
| Baja sin bloquear cobros y porcentajes/reversas históricos | PASS | `scripts/testAffiliateDeactivationEmulator.ts` |
| Alta, cuenta, reserva, pago y reasignación desde navegador | PASS | `scripts/testAffiliateManagementEmulator.ts`, `AFFILIATE_BROWSER=1` |
| Origen íntegro, permiso administrativo y revocación | PASS | Misma suite, rechazo de movimiento alterado y acceso sin contexto |
| Doble clic, concurrencia, respuesta perdida y reintento | PASS | Un solo pago, referencia conservada, conflicto si cambia el comando |
| Liquidaciones históricas | PASS: 64/64 | `scripts/testSettlementsEngine3B5B.ts` |
| Dos porcentajes, reasignación y reversas | PASS | `scripts/testAffiliateIntegrationV2Emulator.ts` |
| Portal unificado y aislamiento | PASS | `scripts/testAffiliateUnifiedEmulator.ts` |
| Asignación concurrente, transferencias y evidencias privadas | PASS | `scripts/testOperationCustodyV2Emulator.ts` |
| Desktop 1280×900, tablet 768 y móviles 390/320 | PASS, sin overflow | Capturas debajo |

Capturas con datos exclusivamente sintéticos:

- [Efectivo y rendiciones en escritorio](screenshots/affiliate-management/affiliate-unified-cash-1280.png).
- [Rendiciones en móvil](screenshots/affiliate-management/affiliate-unified-cash-390.png).
- [Registro unificado en móvil estrecho](screenshots/affiliate-management/affiliate-unified-registry-mobile.png).
- [Efectivo en el portal propio](screenshots/affiliate-management/affiliate-unified-own-cash-mobile.png).
- [Cuenta en escritorio](screenshots/affiliate-management/affiliate-account-desktop.png).
- [Cuenta en móvil](screenshots/affiliate-management/affiliate-account-mobile.png).
- [Asignación en móvil](screenshots/affiliate-management/affiliate-assign-mobile.png).
- [Cuenta propia del vendedor afiliado](screenshots/affiliate-management/affiliate-own-account-mobile.png).

La suite histórica fallaba también sobre una copia limpia de main `0363413`: creaba usuarios no verificados y esperaba `movimientos`/`vendedorAfiliadoId` y un switch que la ruta ya no usa. Se actualizó únicamente ese bloque para probar Auth verificada y la proyección vigente `movements`, comparando identidades, importes y etiquetas contra el ledger propio y comprobando ausencia de información interna. Se conservan las pruebas contables, de FIFO, reservas, concurrencia y Security Rules; ahora pasan sus 64 casos. No se debilitó el backend para aceptar el fixture antiguo.

La prueba de integración de afiliados actualiza una sola expectativa de negocio: dar de baja ya no rechaza un cobro de una venta asignada. Ahora verifica el cobro con el porcentaje vigente y mantiene las denegaciones del portal y custodia. Las pruebas de navegación reflejan 11 accesos y 9 módulos por la eliminación de Rendiciones duplicada; la prueba de documentos añade una aserción de ausencia del enlace duplicado.

Toda escritura funcional utiliza exclusivamente `demo-cuenta-hogar`, Auth 9099, Firestore 8080 y Storage 9199. No hay pagos ni operaciones de prueba en producción.

## Límite de una suite histórica

`testAdminCanonicalNavigationBrowser.ts` comprueba los 9 módulos y accesos actualizados, pero el recorrido completo se detiene después en `TIMEOUT operation index`: busca `[data-testid=canonical-operations]` en Cobranzas. Tanto esta rama como main publicado renderizan `collections-dashboard` y `collection-row`; ese módulo no cambia en el PR. No se declara PASS esa suite completa ni se cambia Cobranzas para satisfacer un selector antiguo. El primer intento con `admin@example.test` además recibió el rechazo esperado de Rules para alertas; el intento con una identidad Auth exclusivamente emulada coincidente con la configuración de Rules superó esa etapa y llegó al selector obsoleto.

La navegación de documentación y los cuatro pasos sí pasan en `testOperationDocumentUsabilityEmulator.ts`; la ausencia de Rendiciones duplicada y el redirect anterior se prueban en `testAffiliateCashUnifiedEmulator.ts`.

## Publicación y aceptación

PR para revisión; sin merge ni deploy automáticos. Después de revisar y autorizar el SHA mergeado, desplegar mediante App Hosting con el preflight habitual y sin modificar variables/Rules/permisos. La configuración productiva vigente se conserva.

Smoke productivo de lectura: registro, selección, cuenta, operaciones y pagos históricos en desktop/mobile. Alta, vinculación, asignaciones y registros de pago reales requieren la acción deliberada del administrador; no se ejecutan como smoke.
