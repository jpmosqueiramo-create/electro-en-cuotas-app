# Seguimiento interno de solicitudes V1

## Alcance y carga de datos

Una nota y un botón. Cambiar el seguimiento es opcional y usa la misma nota como
motivo; fecha y autor provienen del servidor. Estados: sin revisar → en revisión
→ esperando respuesta o cerrado. Se puede retomar desde esperando respuesta o
cerrado hacia en revisión. Agregar una nota no cambia el estado.

Este seguimiento no sustituye el estado operativo ni acredita aprobación,
aceptación, firma, entrega o pago. Esos estados siguen en los módulos existentes.
La bandeja muestra por separado el estado operativo y el seguimiento interno.
Los hitos históricos existentes siguen visibles. No se reconstruyen cambios de
estado anteriores para los que no hay auditoría.

## Persistencia y compatibilidad

Identidad exacta: colección (`solicitudes` o `solicitudes_cuenta`) + ID. No hay
fallback, réplica ni creación de solicitudes faltantes. No se cambian sus campos,
datos personales, presupuestos, snapshots, cuotas, importes ni Timestamps.

Nueva ruta dentro del subárbol privado existente:
`presupuestos_v2/_request_follow_up_v1/contracts/{sha256(JSON.stringify([source,id]))}`.
Las reglas vigentes excluyen `contracts` del acceso cliente, incluso Admin.
La API verifica el token y la identidad administrativa en cada lectura/escritura.
No requiere desplegar reglas, índices ni migración. Los lectores anteriores no
necesitan cambios: no hay versiones presupuestarias en este nodo reservado.

- Cabecera `REQUEST_FOLLOW_UP_V1`: `source`, `id` (strings), `state` (enum),
  `revision` (entero seguro positivo), `updatedAt` (Timestamp servidor),
  `lastCommandId` (string).
- Subcolección `events/{commandId}`, `REQUEST_FOLLOW_UP_EVENT_V1`: identidad,
  `revision`, `action` (`ADD_NOTE` o `CHANGE_STATE`), `fromState`, `toState`,
  `note` (1–2000 caracteres), `at` (Timestamp), `actor` (`uid`, `email`),
  `digest` (SHA256 de identidad, actor y comando normalizado).
- La API devuelve sólo una proyección explícita; serializa las fechas a ISO en
  HTTP y nunca transforma los Timestamps persistidos. No devuelve `digest`.
- Sin cabecera se presenta “Sin revisar”, revisión 0, sin escribir datos.
  El historial empieza con la primera gestión confirmada. Consumidores: sección
  Notas y seguimiento y resumen de bandeja; no se comparte con el cliente.

## Garantías y recuperación

Cabecera y evento se guardan en la misma transacción. `expectedRevision` impide
que una sesión pise a otra. `commandId` estable en los reintentos identifica una
sola gestión; reutilizarlo con otro contenido o actor da conflicto. Un replay de
una gestión antigua no retrocede el estado actual. Las solicitudes retiradas
conservan historial y rechazan nuevas gestiones hasta restaurarse.

Una respuesta incierta conserva el texto y el comando para reintentar. La interfaz
confirma sólo una respuesta exitosa del servidor, sin inserciones optimistas.
Ante conflicto mantiene la nota y exige actualizar/revisar antes de guardar.
Paginación por revisión descendente, 30 eventos por página, sin asumir total a
partir del tamaño de una página. Se validan continuidad y coherencia de estados
en las páginas leídas; los errores no se presentan como historiales vacíos.
No existe edición ni borrado de notas desde esta API. Una corrección se añade
como nueva nota, conservando el registro anterior.

## Verificación

`npx tsx scripts/testAdminSolicitudFollowUp.ts` valida payloads y transiciones.
La suite `scripts/testAdminSolicitudFollowUpEmulator.ts` requiere hosts locales
de Firestore y Auth, proyecto `demo-cuenta-hogar` y `NEXT_PUBLIC_ADMIN_EMAIL` de
pruebas. Prueba escrituras concurrentes, replay, conflicto, identidad entre
colecciones, retiro, paginación, fechas, auth de API y denegación cliente por
Rules, corrupción y preservación exacta de datos/importe/snapshots originales.
