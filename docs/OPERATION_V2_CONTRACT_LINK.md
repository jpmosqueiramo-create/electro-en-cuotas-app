# Integración operativa V2 inicial

Base: main `0b94e230afc42320709cdde03b32c315f67ebf85`.

## Identidad y persistencia

Cada nueva Acceptance crea, en la misma transacción que la aceptación y el
expediente P4, un documento:

`presupuestos_v2/{budgetId}/contracts/v{version}/operation/identity`

`operationId = op_ + SHA256(JSON.stringify([budgetId, version, acceptedOptionId]))`.
Es un identificador técnico, no número contractual. El documento conserva sólo
schemaVersion, operationId, sourceCollection, solicitudId, budgetId,
budgetVersion, acceptedOptionId, contractDraftId y acceptedAt. No duplica datos
personales, importes, snapshots ni estados editables.

La unicidad corresponde a una Acceptance (presupuesto + versión + opción), no a
una persona ni a todas sus solicitudes. La ubicación única impide una segunda
identidad para esa aceptación. No se infieren vínculos por DNI, email o nombre.

Un replay del mismo commandId conserva el resultado. Otro comando que intente
aceptar nuevamente sigue siendo rechazado por la regla vigente. Una transacción
abortada no crea aceptación, documentación ni operación parcialmente. Acceptance
no crea automáticamente el borrador: éste sigue abriéndose por el flujo existente.

## Ficha administrativa

El GET contractual existente devuelve una proyección `operation` con la identidad,
registro persistido sí/no, estado del presupuesto, documentación y borrador.
Valida la relación presupuesto/Acceptance con las validaciones contractuales
existentes y compara todos los campos de la identidad registrada. Un vínculo
inconsistente falla cerrado.

El confeccionador muestra la ficha y un acceso a la solicitud exacta, incluyendo
colección e ID. El mismo espacio mantiene el expediente documental y las acciones
de generar enlace, revisar submissions, aplicar explícitamente y revisar READY.
No se incorpora un segundo formulario ni otra máquina de estados.

## Históricos

No se modifica el contenido de Acceptance, Budget ni Draft para introducir un
operationId. Sus hashes y digests originales permanecen intactos.
Si una Acceptance anterior no tiene registro operativo, GET devuelve su identidad
derivada con `registered=false`, claramente indicada como histórica. No guarda
el documento, no migra y no altera snapshots al leer. Abrir el confeccionador
conserva el comportamiento existente de creación explícita de Draft, pero no
backfillea identidades de aceptaciones anteriores.

## Permisos

El documento está dentro de `contracts`, subárbol ya reservado al servidor en las
Rules existentes. Lectura/escritura directa desde SDK cliente permanece denegada,
incluso para el administrador. El acceso administrativo usa Bearer Firebase y
verifyAdminAuth en la API existente. No se modifica ninguna Rule ni IAM.
La suite de seguridad incluye la identidad operativa y pruebas sin autenticación,
anónimas, usuario no administrador y administrador mediante SDK/REST cliente.

## Enlace contractual

Se reutilizan generación aleatoria, hash del token, plazo de siete días,
revocación y fragmento URL del módulo existente. El enlace se ofrece por WhatsApp
sólo por acción administrativa; no hay mensajes automáticos ni envíos en tests.
El token no se añade a la identidad, ficha, auditoría ni almacenamiento cliente.
Las pruebas de navegador comprueban que WhatsApp contiene el enlace completo sin
enviarlo. Recibir datos guarda una submission; aplicar requiere acción Admin y
revisión vigente. Se conservan compatibilidad de direcciones y submissions legacy.

La API pública contractual reutiliza la lista exacta de orígenes del hotfix #38,
sin confiar en Request.url, Host o X-Forwarded-Host. POST sigue exigiendo Origin;
GET puede omitirlo pero siempre exige token válido. Continúan rechazándose
querystrings, sec-fetch-site cross-site, token inválido, enlaces vencidos/revocados
y submits cruzados. No se amplía la política sin Origin de este formulario.

## Procesos posteriores

La ficha identifica proveedor, logística, vendedor afiliado, cliente y cobranza
como pendientes de integración. No crea documentos, permisos ni estados activos
para esos procesos. Sus futuros adaptadores deberán referenciar operationId y
los vínculos explícitos; no podrán sustituir la economía congelada.

No se modifica ledger, pricing, proveedor, logística, contratos históricos ni
schemas de snapshots. No se genera CH, TERMS_FROZEN productivo, FORMALIZED o PDF
definitivo. Este código no queda publicado hasta revisión, merge y rollout
independientemente autorizados.

## Verificación

- `testOperationV2Emulator.ts`: aceptación concurrente, replay, rollback,
  identidad única, lectura histórica sin escrituras, origen interno distinto,
  token, recepción/aplicación explícita, aislamiento, expiración y revocación.
- `testContractFirestoreSecurity.ts`: deny directo de la identidad y autorización
  administrativa por API; un origen corrupto responde conflicto.
- Regresiones Contract V2, READY, Budget V2, Acceptance/P4, documentación y freeze.
- Browser contractual: ficha visible, enlace WhatsApp, formulario y revisión,
  desktop/mobile, únicamente Emulator y sin enviar mensajes.
