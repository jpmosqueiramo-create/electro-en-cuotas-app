# Unificación del sistema de vendedores afiliados

Base: `a36f3d0cb022c5957843bfbb7609e9e26fd61f32` (PR #53).

## Circuito activo

El vendedor afiliado es un colaborador independiente. No crea solicitudes, clientes, presupuestos ni operaciones. Las vías de ingreso son la consulta pública y Administración. La asignación se realiza en la Ficha Única, con identidad de operación y UID verificado.

`/admin/comisiones` reúne registro, vinculación explícita de acceso, porcentajes, cuenta corriente, operaciones asignadas, liquidaciones y rendiciones. `/admin/rendiciones` redirige a esta pantalla; se retira su enlace duplicado. Los perfiles se desactivan, nunca se borran desde esta interfaz. El motivo es obligatorio y el porcentaje 0 % es válido. Las vigencias comienzan al guardar y conservan la auditoría del registro existente; no hay recálculo retroactivo.

`/afiliado` reúne operaciones asignadas, resumen de cuotas autorizadas, gestiones, comisiones y liquidaciones. No consulta catálogo ni contiene formularios comerciales. Mantiene custodia, incidencias y controles documentales existentes. El detalle financiero utiliza la API financiera existente y sólo aparece cuando corresponde. El resumen advierte consultas parciales; las promesas se cuentan sobre las últimas 30 gestiones por operación, sin presentarlas como pendientes conciliados. Registrar una promesa o un próximo contacto no acredita pagos.

## Una fuente económica

No se modifica el cálculo financiero ni el motor de comisiones. Administración y afiliado consultan `ledger_comisiones_movimientos` y `liquidaciones_comision`, con el mismo motor de cuenta corriente y disponibilidad. Los ítems de liquidación relacionan cada comisión con los importes liquidados y pagados. Sólo se proyectan medio de pago y referencia bancaria autorizada, nunca notas internas arbitrarias ni enlaces de Storage.

Se conserva la política aprobada en PR #53: base efectivamente acreditada e imputada a cuotas; beneficiario y porcentaje vigentes al acreditar; las reasignaciones no trasladan devengamientos anteriores. Las reversas pagadas se recuperan contra comisiones futuras con importe a recuperar separado. Esta política debe ratificarse comercialmente antes de habilitar liquidaciones reales. No se generan comisiones por presupuestos, mora o promesas.

## Interfaces y endpoints retirados

| Anterior | Resultado |
|---|---|
| Carga comercial, catálogo y cuatro pestañas antiguas del afiliado | Retirados de `/afiliado`; único seguimiento V2 |
| Sender de solicitudes del afiliado | Eliminado; ningún consumidor activo |
| `POST /api/afiliado/solicitudes` | 403 incondicional, sin lectura de payload ni escritura |
| Servicio `persistAffiliateSolicitud` | Falla cerrada para consumidores antiguos |
| `POST /api/afiliado/promesas` | 403; se utiliza la gestión autorizada por operación V2 |
| `GET /api/afiliado/operaciones` | Consulta histórica mediada por servidor, UID y titularidad |
| `GET /api/afiliado/cuenta-corriente` | Alias de la misma proyección segura de comisiones |
| Contador y pagos basados en notificaciones | Sin controles activos; consulta histórica secundaria, excluida del saldo actual |
| Borrados y pagos directos desde la vieja pantalla administrativa | Retirados; sin escrituras SDK desde estas pantallas |

Las operaciones financieras históricas de otros módulos administrativos no se reescriben ni se convierten en movimientos V2. Las notificaciones históricas siguen disponibles como consulta; no se importan al ledger.

## Permisos

| Acción | Administrador | Afiliado | Anónimo |
|---|---|---|---|
| Registro y porcentajes | API administrativa | Denegado | Denegado |
| Presupuestos y propuestas | API administrativa | Denegado | Denegado |
| Alta comercial del afiliado | Endpoint retirado | Denegado | Denegado |
| Operaciones / finanzas del afiliado | Consulta autorizada | Sólo asignación vigente y UID activo | Denegado |
| Comisiones ya devengadas | Consulta administrativa | Sólo beneficiario, incluso tras reasignación | Denegado |
| Acreditar pagos / liquidar | Sólo controles existentes y guardas Emulator para V2 | Denegado | Denegado |
| Creación SDK en solicitudes y solicitudes_cuenta | Permisos administrativos existentes | Denegado | Denegado |

No se cambian Firestore Rules ni Storage Rules. Las Rules actuales ya deniegan las altas comerciales directas de afiliados. El formulario público sigue siendo público: una persona puede consultar como cliente; esto no le concede atribución de vendedor ni acceso para crear presupuestos. No se promete impedir el uso anónimo de ese canal por una persona que también tenga cuenta de afiliado.

Las APIs verifican Firebase Auth y asignación; el navegador no elige el beneficiario de comisiones. Desactivar revoca consultas; reasignar revoca el acceso al expediente, conservando la consulta de remuneración propia. Los controles V2 de pagos, liquidaciones, cierre de entrega, invitaciones, numeración CH, TERMS_FROZEN y formalización permanecen bloqueados productivamente.

## Persistencia y compatibilidad

No hay colecciones nuevas, migraciones, fusiones de identidad ni escrituras por abrir el panel. En la subcolección de gestiones existente se añade `nextContactDate: string|null` (fecha calendario). Registros anteriores sin campo se leen como `null`, sin reescritura. Los reintentos conservan el digest original del comando: el campo ausente no se añade retroactivamente al payload. Un replay válido puede recuperar su resultado aunque su fecha ya haya pasado.

Las proyecciones de consulta incorporan resúmenes y estados de asignación / liquidación, sin duplicar datos persistidos. El límite de 50 movimientos visibles y 30 gestiones se informa. El cálculo de saldo aún utiliza el historial completo del motor existente: medir coste y volumen antes de habilitar liquidaciones reales.

## Verificación

Resultados y comandos reproducibles en el informe de entrega del PR. Suites relevantes: `testAffiliateUnifiedEmulator`, `testAffiliateIntegrationV2Emulator`, `testPortalP1Emulator` y `runAffiliateIntegrationV2Browser`, siempre con proyecto `demo-cuenta-hogar` y Auth/Firestore/Storage Emulators. Incluyen bloqueo de altas y propuestas, SDK/REST, formulario público con rate limit y replay, dos afiliados, asignación/reasignación, 0 %, concurrencia, promesas, pagos parciales, reversas, transferencia/efectivo, histórico intacto y desktop/mobile.

Las expectativas antiguas de runners legacy que exigían alta comercial o promesas por endpoints retirados ya no definen la política vigente; no se declaran ejecutadas ni PASS. Se conservan las pruebas del motor y las regresiones V2. El runner P1 se actualiza para exigir 403 sin escrituras en el alta retirada, conservando sus assertions de privacidad y formulario público.

No hubo cambios productivos de identidad, negocio, Rules, IAM, secretos ni despliegue. El script local `scripts/testBudgetV2HttpIdempotency.ts` se conserva fuera del commit.

## Resultados de esta implementación

| Comprobación ejecutada | Resultado |
|---|---|
| `git diff --check` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run test:safe` | PASS |
| `npm run build` | PASS |
| ESLint diferencial del conjunto tocado | PASS: 50 errores base, 5 actuales, 0 nuevos, 45 resueltos |
| ESLint completo de archivos tocados | FAIL histórico: 5 `no-explicit-any` en `testSellerAccountUI3B5C2.ts`; sólo se cambia su import del helper retirado de la página |
| `testAffiliateUnifiedEmulator.ts` | PASS: altas/propuestas/porcentajes/liquidaciones rechazados para afiliado, alias de cuenta consistente, selector elegible, resumen y contactos, concurrencia y cero efecto económico de promesas |
| `testAffiliateIntegrationV2Emulator.ts` | PASS: dos porcentajes, 0 %, reasignación, pagos parciales, liquidaciones en efectivo/transferencia, reversa y recuperación futura, histórico intacto |
| `testPortalP1Emulator.ts` | PASS: SDK/REST denegados, alta administrativa conservada, canal público 3/h y replay, consultas históricas aisladas |
| `testOperationCustodyV2Emulator.ts` | PASS: asignación concurrente, permisos, custodia, evidencias privadas y cierre productivo bloqueado |
| `testOperationFinancialV2Emulator.ts` | PASS: FIFO, pagos, recibos, reversas, concurrencia, roles y cronograma original |
| `runAffiliateIntegrationV2Browser.ts` | PASS: Administración, dos afiliados sintéticos, desktop/mobile, rechazo de alta directa, reasignación y desactivación; 0 overflow, 0 peticiones Firebase productivas |

Entorno de todas las suites Firebase: `GCLOUD_PROJECT=demo-cuenta-hogar`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cuenta-hogar`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`, `FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199`. El browser utiliza identidad administrativa sintética `admin.affiliate@example.test`. El runner P1 usa en su proceso la identidad requerida por las Rules locales existentes, sin modificar estas Rules ni crear usuarios reales.

Capturas verificadas visualmente: `docs/screenshots/affiliate-v2-unified/` (7 imágenes sintéticas). Se revisaron jerarquía, lectura de saldos, acciones, menú y ausencia de desbordamiento. El resumen de contactos es una agenda de fechas registradas en las últimas 30 gestiones, no un estado nuevo de resolución de tareas.

Riesgos pendientes: autorización específica para vincular la cuenta de prueba real y definir su porcentaje; eventual limpieza exacta de los cinco perfiles, no ejecutada; ratificación comercial y jurídica previa a liquidaciones reales; coste de lectura del historial completo del motor existente y límites explícitos de las vistas recientes. No hay infraestructura adicional requerida ni despliegues incluidos.
