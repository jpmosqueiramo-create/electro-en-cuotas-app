# Vendedores afiliados: operaciones, comisiones y pagos

Base: main `0363413f744619902f90104e41d18d07e255df44`. Rama: `feature/affiliate-management`.

## Uso

1. En **Vendedores afiliados**, buscar por nombre, apellido, correo o localidad; filtrar activos/inactivos. **Agregar vendedor afiliado** y **Editar** usan el registro existente. El porcentaje se aplica a cobros futuros y no reescribe los movimientos anteriores.
2. En **Acceso al portal**, buscar la cuenta existente por su correo exacto y guardar para confirmar su vinculación. La cuenta debe estar activa y verificada; no se crean usuarios Auth ni se elevan roles. Una vinculación existente no puede reemplazarse con otra identidad.
3. **Ver operaciones y comisiones** abre la cuenta seleccionada. En **Operaciones → Asignar operación nueva o en curso**, buscar cliente/producto/CH y elegir una operación con aceptación. Confirmar la asignación. La custodia pendiente sigue impidiendo una reasignación incompatible.
4. En **Comisiones**, consultar movimientos y porcentajes históricos. La comisión se devenga sobre pagos efectivamente acreditados, con las reglas existentes.
5. En **Pagos**, consultar **Disponible**, **Reservado**, **Total pagado** y **A recuperar**. Preparar un importe, confirmar su reserva y, después de realizar el pago, registrar transferencia/efectivo y referencia. Cada paso requiere confirmación. Una reserva confirmada pendiente puede cancelarse con motivo. Preparar o reservar no marca un importe como pagado.
6. El vendedor afiliado consulta sus propios movimientos y pagos en su portal. La rendición del efectivo del cliente conserva su circuito separado y tiene un enlace específico.

## Correcciones y controles

- La consulta anterior aplicaba una guarda de Emulator a todos los movimientos V2, incluso los generados por el adaptador productivo; por eso fallaba una cuenta con comisiones reales. Ahora la lectura productiva exige contexto servidor autorizado y verifica snapshot íntegro, operación, pago, asignación de cuota y porcentaje histórico. Una cuenta no verificable no se presenta como saldo cero.
- Los archivos de las rutas antiguas de confirmar/anular contenían handlers copiados de otros recursos. Ahora sus POST delegan al mismo adaptador administrativo con beneficiario derivado en servidor.
- El adaptador reutiliza `crearBorradorLiquidacion`, `confirmarLiquidacion`, `anularLiquidacion` y `pagarLiquidacion`, sus reservas FIFO y validaciones de incidencias. No cambia cálculo, base ni porcentajes de comisiones.
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
| action | PREPARE / CONFIRM / CANCEL / PAY | Acción explícita |
| actor | string UID | Administrador que confirma |
| at | string ISO UTC | Auditoría |
| result | objeto de liquidación existente | Resultado idempotente |

Las Rules existentes ya restringen recursivamente `vendedores` a Administración. No se modifican Rules. No hay migración ni modificación de liquidaciones históricas. Los comandos antiguos sin este recibo permanecen consultables; el estado PAGADA evita otro pago.

La respuesta de listado añade `cuentaVerificada` y permite `null` en saldos no verificables; registro/selector no usan esos saldos. La ficha obtiene una lectura verificada independiente. La vinculación nueva exige correo verificado coincidente; no reescribe vinculaciones históricas.

El harness local ahora resuelve rutas estáticas antes que parámetros dinámicos, como Next: `/vendedores/registro` no debe caer en `/vendedores/[id]`. Este ajuste sólo afecta pruebas.

## Verificación

| Comprobación | Resultado | Evidencia |
|---|---|---|
| TypeScript | PASS | `npx tsc --noEmit` |
| ESLint diferencial | PASS: 21 archivos, 0 diagnósticos nuevos | Comparación de mensajes/reglas contra main, incluyendo archivos históricos |
| Build | PASS | `npm run build`, manifiesto del renderer intacto |
| Suites seguras | PASS | `npm run test:safe` |
| Alta, cuenta, reserva, pago y reasignación desde navegador | PASS | `scripts/testAffiliateManagementEmulator.ts`, `AFFILIATE_BROWSER=1` |
| Origen íntegro, permiso administrativo y revocación | PASS | Misma suite, rechazo de movimiento alterado y acceso sin contexto |
| Doble clic, concurrencia, respuesta perdida y reintento | PASS | Un solo pago, referencia conservada, conflicto si cambia el comando |
| Liquidaciones históricas | PASS: 64/64 | `scripts/testSettlementsEngine3B5B.ts` |
| Dos porcentajes, reasignación y reversas | PASS | `scripts/testAffiliateIntegrationV2Emulator.ts` |
| Portal unificado y aislamiento | PASS | `scripts/testAffiliateUnifiedEmulator.ts` |
| Asignación concurrente, transferencias y evidencias privadas | PASS | `scripts/testOperationCustodyV2Emulator.ts` |
| Desktop 1280×900 y móvil 390×844 | PASS, sin overflow | Capturas debajo |

Capturas con datos exclusivamente sintéticos:

- [Cuenta en escritorio](screenshots/affiliate-management/affiliate-account-desktop.png).
- [Cuenta en móvil](screenshots/affiliate-management/affiliate-account-mobile.png).
- [Asignación en móvil](screenshots/affiliate-management/affiliate-assign-mobile.png).
- [Cuenta propia del vendedor afiliado](screenshots/affiliate-management/affiliate-own-account-mobile.png).

La suite histórica fallaba también sobre una copia limpia de main `0363413`: creaba usuarios no verificados y esperaba `movimientos`/`vendedorAfiliadoId` y un switch que la ruta ya no usa. Se actualizó únicamente ese bloque para probar Auth verificada y la proyección vigente `movements`, comparando identidades, importes y etiquetas contra el ledger propio y comprobando ausencia de información interna. Se conservan las pruebas contables, de FIFO, reservas, concurrencia y Security Rules; ahora pasan sus 64 casos. No se debilitó el backend para aceptar el fixture antiguo.

Toda escritura funcional utiliza exclusivamente `demo-cuenta-hogar`, Auth 9099, Firestore 8080 y Storage 9199. No hay pagos ni operaciones de prueba en producción.

## Publicación y aceptación

PR para revisión; sin merge ni deploy automáticos. Después de revisar y autorizar el SHA mergeado, desplegar mediante App Hosting con el preflight habitual y sin modificar variables/Rules/permisos. La configuración productiva vigente se conserva.

Smoke productivo de lectura: registro, selección, cuenta, operaciones y pagos históricos en desktop/mobile. Alta, vinculación, asignaciones y registros de pago reales requieren la acción deliberada del administrador; no se ejecutan como smoke.
