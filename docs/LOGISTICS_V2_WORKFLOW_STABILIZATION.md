# Proveedor y logística V2: guardado y flujo administrativo

Base de desarrollo: main `fdf05c50b83d1e20e8126f9faa14eea57a80ee6b`.

## Diagnóstico reproducido

En una operación sintética aceptada, el panel original ofreció
`READY_FOR_PICKUP` en `PENDIENTE_PEDIDO`. Al confirmarla, la API existente respondió
409 «Transición de proveedor no permitida» y no creó estado ni eventos. Era una
acción inválida presentada como disponible, no una pérdida de persistencia.

Además, el panel mantenía seleccionada la acción después de ejecutarla, usaba un
botón genérico, no mostraba éxito confirmado y no notificaba a la consulta de
logística de la cabecera. Ante una respuesta perdida conservaba sólo la clave/ID,
no el payload completo: una recarga de seguimiento podía cambiar la revisión y
convertir el reintento en otro comando. Estos problemas se comprobaron en código.

No contamos con la solicitud HTTP exacta del incidente productivo original; no se
atribuye ese episodio a una pérdida de datos del servidor ni a otra hipótesis sin
evidencia. Las transacciones, precondiciones, snapshots e idempotencia del servidor
existente se conservaron y sus regresiones pasaron.

## Solución

- Estado actual: producto, proveedor, estados, próximo paso, fecha identificada
  como estimada/prevista/real y responsable disponible.
- Próxima acción: sólo campos de la siguiente acción válida. El botón describe
  la operación. Se valida con `nextFulfillment`, también validado de nuevo por el
  servidor. El selector de presentación no escribe ni crea estados alternativos.
- Más opciones: correcciones, costos, cancelación/reapertura, incidencias,
  responsables, historial y auditoría. No se retiran datos ni funciones válidas.
- La localidad se precarga del snapshot del presupuesto aceptado si todavía no
  existe destino logístico; no se persiste hasta confirmación administrativa.
- Las consultas tienen límite de espera y cancelación. No hay recarga automática.
- Un guardado bloquea envíos simultáneos, espera el POST y relee el estado vigente
  antes de mostrar «Cambio guardado correctamente».
- Si se pierde la respuesta del POST o falla su lectura posterior, se conserva el
  comando completo, incluidos ID, revisión y datos. «Reintentar confirmación»
  reenvía exactamente ese comando. Los campos quedan protegidos mientras se
  desconoce el resultado. Un replay no crea otro evento.
- Un rechazo definitivo conserva los campos. En conflictos de revisión se consulta
  el estado vigente y se explica que debe revisarse antes de confirmar de nuevo.
- El componente avisa al contenedor tras confirmar. Sólo se refrescan logística en
  la cabecera y su consulta relacionada de control documental/entrega, preservando
  los campos locales de ese componente; no se releen contrato, presupuestos ni evaluación por ese aviso.
  El seguimiento crediticio conserva su consulta y errores independientes.

No se modifica `operationFulfillmentV2.ts`, su servicio servidor, API, schemas,
transiciones, política de firmas, motor económico ni permisos. No hay migración,
índices nuevos, dependencias ni recursos adicionales.

## Pruebas y evidencia

Todas las escrituras se ejecutaron en Firebase Emulators, proyecto
`demo-cuenta-hogar`, Auth 9099, Firestore 8080 y Storage 9199.

| Verificación | Resultado |
| --- | --- |
| Reproducción de acción inválida del panel anterior | PASS: 409 y cero escrituras |
| `testFulfillmentPresentation.ts` | PASS |
| `testOperationFulfillmentV2Emulator.ts` | PASS |
| `testOperationCustodyV2Emulator.ts` | PASS |
| `testOperationDeliveryV2Emulator.ts` | PASS |
| `runFulfillmentWorkflowBrowser.ts`, 1280×900 y 390×844 | PASS |
| TypeScript / ESLint de cambios / build / `test:safe` / diff check | PASS |

El recorrido visual utiliza la Ficha de operación con un borrador contractual explícito y prueba proveedor, cancelación
y reapertura, pedido, costo/disponibilidad, listo para retirar, retiro previsto y
real, recepción/custodia, viaje, entrega programada, incidencia y resolución.
Reabre después de cada una de las 14 confirmaciones por pantalla: 28 verificaciones.
Comprueba campos conservados ante rechazo, fecha real futura sin escritura,
actualización inmediata de ambos estados de cabecera y ausencia de overflow.

La pérdida se inyecta mediante CDP en etapa de respuesta HTTP 200, después de la
persistencia: POST y GET posterior, en ambos tamaños. El GET se selecciona sólo
si comenzó después de confirmarse el POST. Los cuatro reintentos conservan cuerpo
y commandId; los eventos y comandos coinciden con la revisión persistida.

Una escritura concurrente de otro administrador produce 409 sin consumir evento;
la corrección siguiente requiere confirmación explícita. Las pruebas servidor
cubren también comandos simultáneos, abortos atómicos, roles, aislamiento,
históricos, rechazo por daños y custodia de producto/originales.

[Registro de persistencia por transición](evidence/logistics-v2-workflow/persistence.json):
revisión, estados y updateTime antes/después de reabrir. Se comparan Timestamp
completos en assertions; el artefacto muestra fecha ISO. Presupuesto y Acceptance
permanecen idénticos; no se recalculan importes del cliente.

ESLint diferencial: cero errores nuevos. Se conservan los dos errores
`no-explicit-any` de `src/app/admin/clientes/page.tsx` (12:44, 19:43) y seis warnings
de imports de línea 9, idénticos al baseline. Sin cambios de reglas ni assertions
eliminados.

## Capturas sintéticas

| Etapa | Escritorio | Celular |
| --- | --- | --- |
| Inicio | [Imagen](evidence/logistics-v2-workflow/initial-1280.png) | [Imagen](evidence/logistics-v2-workflow/initial-390.png) |
| Confirmación de guardado | [Imagen](evidence/logistics-v2-workflow/saved-1280.png) | [Imagen](evidence/logistics-v2-workflow/saved-390.png) |
| Preparación del retiro | [Imagen](evidence/logistics-v2-workflow/pickup-1280.png) | [Imagen](evidence/logistics-v2-workflow/pickup-390.png) |
| Entrega programada y bloqueada | [Imagen](evidence/logistics-v2-workflow/delivery-1280.png) | [Imagen](evidence/logistics-v2-workflow/delivery-390.png) |

## Preflight de publicación posterior

Consulta productiva exclusivamente de lectura, 22/10/2026:

- Backend `cuenta-hogar`, proyecto `negocio-facil-page`, us-central1.
- Build `build-2026-10-22-005`, READY/SUCCEEDED, 100 % del tráfico,
  SHA `186c526cf5584bdbbb6540df4b666dd72aacf1c9`.
- Bucket `negocio-facil-page.firebasestorage.app`; HMAC versión 1 ENABLED,
  permiso de lectura acotado al secreto y rate limit activo.
- Identidad administrativa configurada correctamente. Sin variables Emulator/E2E.
- Rollouts automáticos deshabilitados.
- Firestore Rules SHA256:
  `179df4acc739097a4dab8f77ebc899bf23f61dec42e1f3fffa138467d0fdfed2`.
- Storage Rules SHA256:
  `990218bc41510a0678318f7a8767fb2e9d6068839fc49496bc912a7f4553ba93`.
  Ambas versiones coinciden con los archivos privados del repositorio.

La rama no requiere cambios de Rules, IAM, secretos, bucket ni infraestructura.
Main ya incluye PR #65; el build publicado todavía no lo incluye. Un rollout de
un futuro main integrado incluirá ese cambio anterior además de esta corrección.
Debe revisarse el SHA definitivo después del merge manual y obtener autorización
expresa; no se sustituye por la punta de una feature.

```sh
npx firebase-tools apphosting:rollouts:create cuenta-hogar \
  --project negocio-facil-page \
  --git-commit <SHA_EXACTO_DE_MAIN_REVISADO_Y_AUTORIZADO>
```

Antes de ejecutarlo, revalidar configuración, Rules, guardas, SHA y tráfico actual.
El smoke posterior inicial será de lectura: abrir logística, verificar acciones y
estados sin confirmarlas, navegar y reabrir en desktop/mobile. Toda prueba de
persistencia productiva necesita autorización independiente.

No se habilitan cierre productivo de entrega, formalización, numeración, emisión
contractual definitiva, invitaciones ni cobranza. Las regresiones confirman las
firmas físicas obligatorias de mandato, pagaré y remito, evidencias privadas y
custodia de originales. No se cambiaron datos, recursos o permisos productivos.
No se hizo merge ni deploy. Un eventual rollback requiere autorización separada;
volver a build-005 restauraría también la interfaz logística anterior.
