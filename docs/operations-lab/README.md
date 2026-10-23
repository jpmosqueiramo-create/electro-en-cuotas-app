# Laboratorio integral de operaciones

El laboratorio permite recorrer desde el navegador un caso sintético completo: consulta,
presupuesto emitido, aceptación, datos y crédito simulados, borrador, conformidad, READY,
snapshot TEST, documentos, tres firmas simuladas, custodia, entrega, cuotas, pagos y reversas.
No habilita emisión contractual, entrega, cobranza ni facturación reales.

## Acceso y uso del propietario

Después de un despliegue y una activación expresamente autorizados:

1. Ingresar con la cuenta administrativa habilitada y abrir **Laboratorio de operaciones**.
2. Pulsar **Registrar sesión sintética** y **Abrir circuito**. Cada sesión tiene sus propios datos.
3. Crear la consulta ficticia, emitir el presupuesto y registrar la aceptación sintética.
4. Confirmar la revisión sintética de datos, documentos y crédito. Esta acción no declara una
   identidad documental real ni una aprobación jurídica.
5. Opcionalmente ajustar cantidad, condición, primera fecha y día mensual. Pulsar **Guardar
   ajustes del borrador de prueba**. Sólo lo guardado se incorpora al contrato.
6. Confirmar conformidad sintética y READY. Después congelar el snapshot de laboratorio.
   El número empieza con `TEST-`; no se consume el contador CH.
7. Preparar y descargar mandato, pagaré y remito. Todos muestran
   **DOCUMENTO DE PRUEBA — SIN VALIDEZ CONTRACTUAL O FISCAL**. Mandato y remito tienen logo;
   el pagaré no contiene imágenes. Se conserva además la advertencia de borrador.
8. Confirmar por separado las tres firmas simuladas y la custodia sintética. Sin ellas se
   rechaza la entrega. Confirmar la entrega y activar las cuotas una sola vez.
9. Registrar $145.000: el saldo pasa de $1.740.000 a $1.595.000. Las vistas de Administración,
   vendedor afiliado y cliente consultan la misma fuente. Revertir el pago recupera $1.740.000.
   También se permiten pagos parciales, limitados al saldo pendiente.
10. Descargar el recibo de prueba. No tiene CAE, no comunica con ARCA y no crea otra deuda.

**Actualizar circuito** sólo consulta datos. Ante una respuesta perdida, usar **Recuperar resultado
 del paso anterior**: conserva el comando original, incluso después de recargar la pestaña, y no genera un pago nuevo. Se usa `sessionStorage` sólo para ese payload sintético, separado por UID y sesión; no se guardan tokens ni saldos. Si el navegador bloquea ese almacenamiento, la protección se conserva mientras la pestaña siga abierta. Una vez congelado
el snapshot no se reescribe: para otro ensayo se crea otra sesión, conservando la anterior.

## Caso guiado y límites explícitos

El caso utiliza un cliente y un lavarropas ficticios generados en servidor. Capital $580.000,
servicios brutos $1.160.000, total $1.740.000 y doce cuotas de $145.000. Se utilizan los motores
vigentes para precios, calendario, READY, entrega, FIFO, saldos e IVA incluido.

Los datos personales y las evidencias de identidad son fixtures explícitamente sintéticos;
no se cargan DNI, fotografías ni firmas reales. El laboratorio no es una herramienta para
incorporar clientes reales. El pedido y la logística sintéticos se validan con las transiciones
existentes al confirmar la entrega; su resultado queda conservado como evidencia de prueba.

Las cláusulas actuales de mandato, pagaré y remito se conservan. El remito reutiliza su renderer;
se corrigió únicamente la distribución de su etiqueta de firma para evitar una superposición.
Representación, jurisdicción y demás pendientes jurídicos no se consideran aprobados. La leyenda de representación heredada del remito se conserva; esta entrega no valida su uso real.

La política fiscal es **sintética y explícita**: 21 % contenido en los servicios brutos. Para
$1.160.000 resulta neto $958.677,69 e IVA $201.322,31. No se agrega IVA al total ni a las cuotas,
ni se inventa una distribución entre gestión, logística u otros servicios.

Cada PDF se limita a 600.000 bytes; cada sesión admite hasta 48 pagos, incluidas sus reversas.
La lista administrativa muestra las veinte sesiones propias más recientes. No existe borrado
masivo ni una API de eliminación en este módulo.

## Tres vistas y cuentas independientes

El selector dentro de Administración es una **vista simulada**, no otra autenticación.
Para probar permisos reales, abrir **Cuentas sintéticas independientes** y autorizar una cuenta
Auth de prueba ya existente, activa, verificada y habilitada expresamente en la allowlist del
servidor. Elegir cliente o vendedor afiliado y abrir el enlace con esa cuenta en otro navegador
 o perfil. También puede revocarse su acceso desde ese mismo apartado.

No se crean usuarios Auth, vendedores comerciales, clientes, asignaciones normales ni
liquidaciones. La pertenencia es exclusiva de una sesión del laboratorio. El portal independiente
es de sólo lectura: muestra cuotas, pagos y recibos, sin costos, expedientes, referencias privadas
ni capacidad de acreditar o revertir. Se actualiza al recuperar conexión, enfocar la ventana y
cada cinco segundos; al denegarse el acceso elimina la proyección visible. La respuesta de una
consulta anterior no sustituye la más reciente. No se muestra la información de otro UID al
cambiar de cuenta. WhatsApp real no aparece dentro de estas páginas de prueba.

## Persistencia y contexto

Todos los registros están bajo:

`operationsLabV1/{sha256(ownerUid)}/sessions/{sessionUuid}`

| Colección relativa | Función |
| --- | --- |
| `requests/origin` | Consulta sintética |
| `contracts/workflow` | Estado y revisión del recorrido; presupuesto y aceptación del caso |
| `contracts/draft-settings` | Ajustes explícitos anteriores a READY |
| `contracts/{operationId}` | Fuente contractual validada y vínculo al snapshot |
| `contracts/numbering` | Contador exclusivo de esa sesión |
| `numberReservations/{operationId}` | Reserva TEST inmutable vinculada al hash de origen |
| `snapshots/{operationId}` | Snapshot íntegro e inmutable, schema `OPERATIONS_LAB_SNAPSHOT_V1` |
| `documents/{operationId}_{kind}` | PDF privado, hash y snapshot; inmutable |
| `delivery/{operationId}` | Firmas, custodia, evidencia y entrega exclusivamente sintéticas |
| `ledger/{operationId}` | Cronograma original, pagos y saldos del laboratorio |
| `receipts/{receiptId}` | Pago conciliado y situación de reversa |
| `participants/{uid}` | Membresía de lectura, rol y revocación |
| `commands/{commandId}`, `events/{commandId}` | Comprobante idempotente e historial inmutable |

El contexto se resuelve en servidor desde una identidad Auth verificada y la sesión persistida.
Su capacidad no serializable se registra en un `WeakMap`: copiar sus campos no otorga autoridad.
El adaptador sólo acepta colecciones permitidas e IDs sin rutas, no expone Firestore global,
batches o borrado, y revalida sesión y membresía dentro de cada transacción. Cada documento
lleva un sobre de procedencia; mezclar registros de otra sesión se rechaza.

El navegador no proporciona `operationId`, origen normal, snapshot ni una bandera para convertir
una operación real en sintética. La identidad se deriva de la aceptación generada en servidor.
Las rutas normales continúan leyendo sus colecciones originales y sus validadores rechazan el
schema de laboratorio. Los datos normales no se copian, migran ni reescriben.

## Controles compartidos y aislamiento

- READY verifica la fuente aceptada, condiciones, calendario y evidencia técnica con los
  validadores existentes. Se verifica además la procedencia del comando de revisión, identidad,
  documentación sintética vigente, aprobación crediticia y conformidad correspondientes.
- Snapshot y reserva TEST se confirman en una sola transacción. El número incorpora el hash de
  propietario/sesión y una secuencia local: no colisiona aunque dos propietarios elijan el mismo UUID.
- Los documentos se renderizan fuera de la transacción; el hash del snapshot se comprueba al
  persistirlos. No se hacen lecturas de Storage dentro de transacciones.
- La entrega utiliza el checklist vigente y las transiciones de proveedor/logística. Exige tres
  firmas y custodia. La activación financiera verifica documentos, firmas, entrega y snapshot.
- `allocateOperationPayment` es el adaptador FIFO compartido por el servicio financiero normal y
  el laboratorio. `financialSummary`, `contractEconomics`, `contractSchedule` y `fiscalProjection`
  mantienen una única lógica de cálculo. No se modifica `canonicalPricingEngine` ni el ledger histórico.
- Los recibos se comparan contra los pagos persistidos. El saldo y los importes se concilian
  contra el cronograma del snapshot, sin recalcular cuotas dentro de un PDF.
- Las guardas productivas normales de congelamiento, entrega, invitaciones, finanzas y emisión
  siguen intactas. El laboratorio no modifica `process.env` para eludirlas.
- No existen adaptadores de pago real, ARCA, correo o mensajería en este circuito.

## Seguridad y configuración futura, no aplicada

Variables sólo servidor:

- `OPERATIONS_LAB_ENABLED=true`: habilitación general; ausente o false deniega acceso.
- `OPERATIONS_LAB_ADMIN_UIDS=["UID_ADMIN_AUTORIZADO"]`: cuentas administrativas explícitas,
  además de la comprobación existente de administrador, Auth activa/verificada y token no revocado.
- `OPERATIONS_LAB_PARTICIPANT_UIDS=["UID_CLIENTE_SINTETICO","UID_AFILIADO_SINTETICO"]`:
  cuentas de prueba que Administración puede autorizar en sesiones. No concede acceso por sí sola.
  La membresía debe estar vigente; revocarla es una acción administrativa auditada.

No son secretos y no usan `NEXT_PUBLIC_`. No se configuró ningún UID real, no se crearon usuarios
productivos y no se modificaron IAM, secretos, bucket ni App Hosting.

El PR conserva su exclusión restrictiva de `operationsLabV1` en `firestore.rules`: ningún cliente
SDK, tampoco el administrador, puede leer o escribir esa raíz. **Antes de habilitar el laboratorio
hay que aprobar, desplegar y verificar esa restricción.** No habilitarlo con las Rules antiguas.
Los PDF se sirven con Auth y `private, no-store`; no se crean URLs públicas, tokens de descarga
ni objetos Storage. No se requieren índices, migraciones, nuevas credenciales o permisos IAM.

Deshabilitar `OPERATIONS_LAB_ENABLED` bloquea las nuevas llamadas y las comprobaciones sucesivas
sin afectar operaciones normales. Una transacción ya confirmándose puede terminar. No elimina
registros. Revocar un participante bloquea sus lecturas posteriores, incluso con URL conocida.

## Plan de publicación y recuperación

1. Revisar este mismo PR y sus evidencias. Merge manual; no se publicó desde esta tarea.
2. Confirmar el SHA mergeado que el propietario autorice. Mantener inicialmente el laboratorio apagado.
3. Autorizar por separado el despliegue de la restricción Firestore, si todavía no está vigente,
   y verificar denegación SDK de `operationsLabV1`. No cambiar Storage Rules ni otros permisos.
4. Autorizar las variables de servidor y UIDs concretos. Las cuentas de prueba independientes,
   si se necesitan fuera de Emulator, requieren su propia preparación autorizada; esta tarea no las crea.
5. Con preflight aprobado, publicar exclusivamente el SHA autorizado:
   `npx firebase-tools apphosting:rollouts:create cuenta-hogar --project negocio-facil-page --git-commit <SHA_APROBADO>`.
6. Verificar build, tráfico y aislamiento antes del ensayo del propietario. Mantener bloqueadas las
   operaciones reales. Las escrituras sintéticas del smoke desplegado requieren autorización expresa.
7. Ante una incidencia, detener nuevas pruebas y preparar desactivación del laboratorio. Cualquier
   cambio de configuración o rollback requiere la autorización correspondiente. Conservar las Rules
   restrictivas; nunca recuperar permisos inseguros para hacer funcionar el laboratorio.

Resultados y evidencias: [VALIDATION.md](VALIDATION.md).
