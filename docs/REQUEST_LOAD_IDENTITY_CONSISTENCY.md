# Carga de solicitudes y procedencia de identidad

Base: `186c526cf5584bdbbb6540df4b666dd72aacf1c9` (build productivo 2026-10-22-005).

## Diagnóstico

El detalle usaba `getDoc` del SDK de Firestore en el navegador. Su promesa no tenía
plazo ni cancelación del transporte: mientras permanecía pendiente, la pantalla
sólo mostraba «Cargando operación». La bandera local de efecto evitaba actualizar
un componente desmontado, pero no resolvía una lectura pendiente. El efecto tampoco
expresaba su dependencia de Auth. El shell administrativo ya espera Auth; no hay
pruebas para atribuir el incidente productivo específicamente a una carrera de
Auth ni para afirmar cuál fue el evento de red de Safari que lo desencadenó.

Se reemplaza esa dependencia por un GET administrativo mediado por servidor,
autenticado con la sesión habitual, colección/ID exactos, sin caché, deadline de
15 segundos (incluye obtención de token), cancelación al desmontar y error visible
con reintento local. No hay recarga automática, fallback de fuente ni escrituras.
El servidor vuelve a verificar Administración. El SDK lector compartido de la
bandeja e históricos se conserva para sus consumidores actuales.

En la operación `7281f136-8240-44b9-9488-13817cc18e97/1`, la inspección productiva
exclusivamente de lectura confirmó:

- Solicitud original y snapshot del presupuesto: mismo nombre.
- Único formulario recibido y borrador contractual aplicado: mismo nombre entre
  sí, diferente del origen. Formulario recibido el 22/10/2026 a las 03:41 UTC;
  aplicación administrativa a las 15:07 UTC.
- Acceptance: conserva alternativa/origen, no otra identidad personal separada.
- Carpeta vinculada: su hash de identidad coincide con los datos del borrador.
  El modelo no almacena un nombre independiente dentro de esa carpeta.

La cabecera elegía silenciosamente `draft.personalData.fullName` antes del nombre
del presupuesto; los directorios usaban el presupuesto. Esa precedencia explicaba
la diferencia visual. No se detectó ni se ejecutó una fusión automática.

## Presentación y controles

La cabecera conserva el cliente del presupuesto aceptado con etiqueta de origen.
Si el borrador difiere, muestra su nombre con etiqueta propia. «Ver origen de los
nombres» distingue solicitud, presupuesto, último formulario (aplicado por ID
exacto o pendiente), borrador, Acceptance y carpeta verificada.

La proyección `identityReview` es calculada en lectura: no crea documentos ni
modifica schemas persistidos, digests, fechas o estados. No devuelve DNI ni hashes
de identidad en esta proyección. Compara nombre/DNI sólo para detectar diferencias;
no busca ni vincula personas. Tolera valores históricos ausentes sin inventarlos.
La consulta del último formulario está acotada a un documento con orden por fecha.

Una discrepancia no aclarada bloquea en transacción la preparación de condiciones,
fechas, READY, revisión/aprobación crediticia y reutilización de documentos.
Permanecen disponibles revisión/aplicación explícita del formulario, solicitud de
aclaración y verificación/vinculación administrativa ya existentes. Una carpeta
incompatible nunca se sustituye por esta función. Una verificación explícita
compatible identifica el dato actualizado como verificado y actualiza la cabecera
sin recargar; el origen sigue intacto y su diferencia sigue visible.

Los replays de comandos ya ejecutados conservan su resultado sin nuevas escrituras.
Las aprobaciones y evidencias históricas no se invalidan ni reescriben por lectura.
Los bloqueos productivos jurídicos, contractuales, de entrega y cobranza permanecen.
No se cambian motores económicos, Rules, Auth, IAM, secretos ni infraestructura.

## Verificación

Todas las escrituras de fixtures/comandos se realizan en `demo-cuenta-hogar`, con
Auth 9099, Firestore 8080 y Storage 9199 locales. No se usan sesiones ni tokens
productivos en los runners. La inspección productiva fue sólo lectura y sus datos
personales no se incluyeron en fixtures, capturas ni este informe.

Suites:

- `testRequestIdentityConsistency.ts`: timeout de token, fallo de lectura,
  cancelación, proyección sin DNI, discrepancias, guardas, autorización admin,
  denegación anónima/otro rol, fuente exacta, lecturas y rechazos sin mutaciones.
- `runRequestIdentityConsistencyBrowser.ts`: desktop 1280×800 y móvil 390×844;
  primera apertura directa, Hoy/bandeja, ficha/retorno, error y reintento sin reload;
  procedencia, ausencia de overflow, snapshot íntegro durante navegación.
  Verificación explícita separada en Emulator: dos documentos nuevos
  (perfil/comando) y actualización auditada de la evaluación existente; presupuesto,
  Acceptance, submissions y borrador permanecen sin cambios, incluidos updateTime.
- `testCreditReviewV2Emulator.ts`: clientes nuevos/recurrentes, documentos privados,
  decisiones, roles, concurrencia, idempotencia e históricos.
- `testContractV2Emulator.ts` y `testContractReadyEmulator.ts`: transiciones,
  concurrencia, formularios, compatibilidad, digests, READY y auditoría. Sus fixtures
  de transiciones válidas ahora usan el mismo nombre sintético en presupuesto y
  datos contractuales. Ningún assertion fue eliminado; las discrepancias cuentan
  con pruebas específicas de rechazo.
- TypeScript, ESLint diferencial, build, `test:safe` y `git diff --check`.

Deuda ESLint preexistente sin alteración: `src/app/admin/clientes/page.tsx`, errores
`no-explicit-any` 12:44 y 19:43; seis warnings de imports sin uso en línea 9.
No se cambian reglas de lint ni se ocultan esos diagnósticos.

## Capturas sintéticas

- [Detalle escritorio](evidence/request-identity-consistency/detail-1280.png)
- [Detalle móvil](evidence/request-identity-consistency/detail-390.png)
- [Procedencia escritorio](evidence/request-identity-consistency/operation-1280.png)
- [Procedencia móvil](evidence/request-identity-consistency/operation-390.png)
- [Verificación resuelta escritorio](evidence/request-identity-consistency/resolved-1280.png)
- [Verificación resuelta móvil](evidence/request-identity-consistency/resolved-390.png)

Publicación pendiente de revisión. No se efectuó merge, deploy, migración,
actualización de datos productivos ni eliminación.

Resultado final: todas las suites anteriores PASS; TypeScript PASS, ESLint de
archivos modificados PASS (diferencial: cero errores nuevos), build PASS,
`test:safe` PASS y diff check PASS. Desktop/mobile y sincronización de verificación
PASS. No hubo escrituras productivas; los updateTime de las fuentes inspeccionadas
se conservaron. La validación visual de la corrección en producción queda para un
rollout futuro autorizado.
