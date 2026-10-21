# Estabilización P1: solicitudes y portales históricos

Baseline: `97ab31f3d3e859a354b6a1f9c54cdf11ad35a1d4`.
Rama: `feature/p1-solicitudes-security-stabilization`.
Sin deploy, migraciones, cambios de Storage Rules, IAM, secretos ni datos productivos.

## Diff de Firestore Rules

Cambio de permiso exclusivamente en create de `solicitudes_cuenta`: exige
`isAdmin()` además de las validaciones existentes. Se conserva la compatibilidad
administrativa existente, incluido el match general de Admin. No se amplía
ninguna lectura ni se modifica el subárbol contractual privado.

Anónimo, cliente autenticado y afiliado ya no pueden crear documentos directamente
con SDK/REST. Las APIs usan Admin SDK después de validar identidad/payload/origen.
Las lecturas, updates y deletes administrativos existentes permanecen iguales.
Las solicitudes guardadas no se modifican ni eliminan.

Inventario de consumidores de altas:

| Consumidor | Acción después del cambio |
| --- | --- |
| Formulario público de inicio y `/solicitar` | Continúan usando `/api/public/solicitudes` y su servicio transaccional. |
| `publicSolicitudService.ts` | Único núcleo de persistencia compartido; conserva IDs `web_` y digest público anteriores. |
| Panel `/afiliado` | Nueva API autenticada `/api/afiliado/solicitudes`; una solicitud en `solicitudes_cuenta`. |
| `admin/presupuestos/page.tsx` | Alta manual confirmada mediante SDK cliente con administrador autenticado, conservada por Rules. |
| APIs legacy de propuestas/OTP/reservas | Leen o actualizan solicitudes existentes; no se convierten en altas públicas alternativas. |
| `/firmar-contrato` legacy | Lee/actualiza referencias existentes; no se modifica su circuito. |
| Conversiones en `admin/validaciones` | Crean solicitudes legacy bajo Administración; no crean altas públicas en `solicitudes_cuenta`. No se alteran en esta tarea. |

No se modifica el comportamiento de otras colecciones públicas como alertas,
arrepentimientos o solicitudes de localidad. No se afirma que el rate limit por
contacto proteja toda la aplicación ni que impida variar identidades declaradas.

## Historiales mediados por servidor

GET `/api/cliente/historial` y `/api/afiliado/historial` verifican token Firebase
con revocación, usuario no deshabilitado y email verificado. El navegador no elige
UID, colección, DNI, email ni afiliado para las consultas.

Cliente:

- `clienteAuthUid` explícito tiene prioridad absoluta.
- `clienteId` igual al UID autenticado conserva compatibilidad histórica.
- Un clienteId que corresponde a otro usuario Auth bloquea el fallback por email.
- Si no existe vínculo UID explícito, se admite la coincidencia de email verificado
  en los campos históricos clienteEmail/email/datosPersonales.email.
- Nunca se busca por DNI/CUIL ni se escribe una nueva titularidad al leer.

Afiliado:

- Debe existir exactamente un registro `vendedores.authUid` y estar activo.
- Se consultan sus UID/IDs explícitos y el email verificado de compatibilidad.
- Cualquier UID/ID explícito incompatible deniega el registro, aunque el email
  coincida. No se confía en localStorage ni en IDs enviados por el navegador.
- Notificaciones históricas se autorizan por los mismos vínculos.

Se consultan ambas colecciones de solicitudes, con identidad
`sourceCollection + id` y recordKey independiente. No se deduplican documentos
históricos por nombre/DNI/email. No se crea operación V2 ni se migra información.

Las consultas se realizan por filtros de titularidad; no hay escaneo general.
Cada filtro devuelve hasta 200 registros, obteniendo uno adicional para detectar
truncamiento y mostrar un aviso explícito. No se retiran esos límites. Los
registros adicionales requieren consulta administrativa; no se presentan como
historial completo si se detecta truncamiento.

Los filtros por email conservan variantes exacta y minúscula del usuario actual.
Un email histórico con otra capitalización o un vínculo ambiguo puede requerir
reconciliación administrativa. No se amplía la búsqueda por datos personales para
resolverlo automáticamente. Cambios de email no transfieren vínculos UID vigentes.

Una consulta fallida conserva resultados válidos de las demás y muestra advertencia.
Si todas fallan se devuelve error. En la UI un fallo no reemplaza silenciosamente
el último resultado por una lista vacía. El estado del portal se reinicia por UID
para evitar que una sesión nueva herede datos o formularios de otra cuenta.

La respuesta usa allowlist: identidad/origen, estado, producto, datos de contacto
necesarios y cuotas históricas guardadas. No entrega proveedores, costos, factores,
márgenes, snapshots privados ni enlaces permanentes a documentos. Las fechas se
serializan explícitamente en el DTO; sólo la fecha de creación se reconstruye como
Timestamp para la UI histórica. No se reescriben documentos ni tipos almacenados.

## Alta de vendedor afiliado

POST `/api/afiliado/solicitudes` exige origen público autorizado, Bearer válido,
email verificado y registro activo único asociado al UID. La vigencia del registro
se comprueba de nuevo dentro de la transacción, incluso para un replay.

Payload allowlist: nombre, DNI, contacto, dirección/localidad, email del cliente,
referencia pública, nombre, plan y cuota capturados. No admite afiliadoId, UID,
email de afiliado ni atribución libre. El email de contacto nuevo se normaliza a
minúsculas. El servidor obtiene atribución desde Auth + vendedores.

El nombre, plan y cuota se comparan con la publicación actual sin sustituir el dato
mostrado en pantalla: una diferencia devuelve 409. No se consultan costos privados.

Persistencia única: `solicitudes_cuenta/aff_{hashUID24}_{submissionId}`. Tipo nuevo
`solicitud_afiliado`, estado Pendiente y atribución `afiliadoAuthUid`, `afiliadoId`,
`afiliadoEmail`, `cargadoPorAfiliado`. Esos campos son opcionales para lectores
históricos; no se actualizan documentos anteriores. La elección del plan es una
preferencia, no Acceptance ni obligación contractual.

Se comparte la transacción de persistencia y el contador HMAC del endpoint público.
El mismo envío no consume otro cupo; IDs distintos son solicitudes nuevas y están
sujetos al límite vigente. No se añade una dependencia nueva de configuración ni
se crean secretos. El hash público preexistente y los IDs web no cambian.

La interfaz evita doble submit y conserva ID por UID+digest en memoria/sessionStorage,
sin guardar datos personales del formulario. Un error conserva el envío para retry.
La respuesta debe confirmar persistencia y la identidad correspondiente. El aviso
administrativo es secundario; si falla, se informa sin perder ni duplicar la solicitud.
No se abren chats ni se envían mensajes automáticamente.

No hay upload documental en esta alta: no crea URLs públicas ni hace obligatorio
un legajo legacy. La documentación se gestiona por Administración en el circuito
privado existente. No crea cuenta cliente, presupuesto, Acceptance, contrato,
cronograma ni ledger automáticamente. La asignación posterior de una operación V2
sigue siendo una decisión administrativa explícita.

## Acciones legacy corregidas o bloqueadas

| Portal | Acción | Resultado |
| --- | --- | --- |
| Cliente | Historial por UID/email del titular | Corregido con servidor y allowlist. |
| Cliente | Actualización masiva de datos personales | Bloqueada; gestión administrativa. |
| Cliente | Alta vieja con archivos obligatorios | Bloqueada; acceso al formulario público existente. |
| Cliente | Subir recibo y sobrescribir planPagos | Bloqueada; no modifica el ledger ni cuotas. |
| Cliente | PDFs legacy con cálculos/fallback de número | Bloqueados; solicitar comprobante a Administración. |
| Afiliado | Historial y notificaciones propios | Corregidos mediante servidor. |
| Afiliado | Alta de solicitud | Corregida mediante API autenticada y una colección. |
| Afiliado | Marcar entrega/recepción y costos de flete | Bloqueado en controles legacy. V2 mantiene su circuito autorizado. |
| Afiliado | Notas/promesas de cobranza | Bloqueadas en controles legacy, sin cambiar registros históricos. |
| Afiliado | Marcar notificaciones leídas | Bloqueado; se conserva lectura. |

Se eliminaron los escritores directos SDK/Storage de ambas páginas. Los controles
bloqueados tienen disabled, aviso y presentación atenuada. Incluso habilitándolos
manualmente no contienen escrituras remanentes. La navegación y lectura siguen
operativas; los módulos V2 se conservan separados.

## Validación y límites

Suites: `testPortalP1Emulator.ts`, `testPortalP1Browser.ts`, regresiones públicas,
rate limit, identidad operativa, Firestore 3B6A y seguridad contractual. Se mantienen
las suites browser V2; `--portal-p1-only` permite repetir únicamente P1 sin eliminar
assertions de las demás suites.

ESLint diferencial usa el SHA base exacto, mismos archivos/reglas/configuración y
compara multiconjuntos archivo+regla+mensaje. No se desactiva lint ni se oculta deuda
histórica. Logs y capturas permanecen fuera de Git en `/tmp`.

La estabilización no habilita congelamiento, numeración CH, emisión definitiva,
entrega final, invitaciones productivas ni cobranza V2. Tampoco resuelve la deuda
de crecimiento del ledger, Storage en transacciones o reservas fotográficas.

## Resultados ejecutados

- TypeScript, build, `test:safe` y `git diff --check`: PASS.
- ESLint diferencial: base 42 errores, actual 26 históricos, nuevos 0,
  resueltos 16; sin warnings nuevos. No se declara lint absoluto limpio.
- P1 Emulator y navegador desktop/mobile: PASS. Alta única, replay, atribución,
  permisos, historias sin cambios y ausencia de uploads públicos verificados.
- Persistencia pública, rate limit y operación V2: PASS.
- Firestore 3B6A: 36/36 PASS; matriz contractual: 2382 denegaciones y 115
  accesos legítimos verificados.
- READY, portal cliente V2 y finanzas V2 en Emulator: PASS.
- Regresiones browser contractuales, proveedor/logística, custodia, cliente,
  entrega y finanzas: PASS individualmente. El runner completo terminó con error
  en el nuevo test P1 durante su desarrollo; P1 se corrigió y repitió por separado
  con PASS, sin eliminar assertions.
- Smoke general: 12/12 PASS con identidad administrativa explícita en entorno
  demo. Intentos anteriores: fallo de lanzamiento CDP, logout afiliado a 430 px
  y configuración de identidad admin no fijada; se conserva ese historial en logs.
  No se modificó el runner ni se debilitaron sus assertions.

SHA256 de Rules revisadas:
`179df4acc739097a4dab8f77ebc899bf23f61dec42e1f3fffa138467d0fdfed2`.
No se ejecutaron despliegues ni escrituras productivas.

## Futuro despliegue controlado — NO ejecutado

Requiere PR aprobado/mergeado y aprobación explícita del SHA de main y de Rules.
Verificar antes proyecto, Rules activas, bucket, administrador, overrides HMAC y
rollouts automáticos deshabilitados. Registrar el SHA servido para rollback.

Después de autorización independiente de Rules, usar exclusivamente:

```sh
npx firebase-tools deploy --project negocio-facil-page --config firebase.test-release.json --only firestore:rules
```

Verificar el ruleset desplegado contra el archivo aprobado antes de continuar.
No usar `firebase deploy` general: no desplegar Hosting ni Storage Rules.

Sólo con autorización del SHA exacto integrado:

```sh
npx firebase-tools apphosting:rollouts:create cuenta-hogar --project negocio-facil-page --git-commit "$SHA_APROBADO"
```

`SHA_APROBADO` debe contener el SHA expresamente autorizado; no se sustituye por la
punta actual de una rama. Repetir smoke con datos ficticios mínimos. Un rollback
manual usa el SHA previo aprobado, conserva Rules privadas/cierre del SDK público
y no borra registros. No se habilitan rollouts automáticos.
