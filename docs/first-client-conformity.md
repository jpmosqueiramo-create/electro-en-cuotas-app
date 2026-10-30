# Primera conformidad del cliente

## Corrección

Un expediente sin `conformity/current` se presentaba como `clientConformity: null`. El bloque de revisión sólo mostraba el formulario si `required` era verdadero, mientras que la emisión requería una conformidad vigente. Además, el comando de registro exigía que ya existiera ese documento.

La lectura devuelve ahora `{required:true, confirmed:false, paymentAddressConfirmed:false, confirmedAt:null}` cuando existe un borrador pero falta el registro. La lectura no escribe. El formulario se muestra y el comando explícito `RECORD_CLIENT_CONFORMITY` puede crear el primer registro si hay condiciones y cronograma guardados y evidencia válida. Conserva transacción, revisión esperada, commandId, actor, fecha, digest de condiciones, hash del domicilio y evento de auditoría. La emisión sigue exigiendo conformidad vigente; abrir el formulario no la registra.

## Compatibilidad

Se conserva la ruta `presupuestos_v2/{id}/contracts/v{version}/conformity/current` y sus campos existentes. No hay nuevas colecciones, migraciones ni cambios de Rules. El contrato de lectura sustituye el null por un estado pendiente explícito; los consumidores existentes ya consultan `required` y `confirmed`. Los registros anteriores se siguen comprobando contra las condiciones y el domicilio actuales.

## Verificación

- TypeScript, ESLint de archivos modificados, build y diff-check correctos.
- `testFirstClientConformityEmulator.ts`: lectura sin escrituras, primera conformidad, evidencia inválida, datos incompletos, concurrencia/replay, revisión obsoleta, auditoría, invalidación y reconfirmación correctos.
- `testSimpleContractIssuanceEmulator.ts`, con paquete sintético y Auth/Firestore/Storage Emulators: correcto. El navegador parte sin registro de conformidad, abre el formulario, confirma y habilita emisión. Escritorio/móvil, documentos sintéticos, acceso por rol, reintentos, revisiones y conservación del número CH correctos.
- Proyecto exclusivo `demo-cuenta-hogar`. Sin registros de conformidad ni documentos emitidos en producción.

Pendiente de merge y deploy.
