# Corrección de transacciones y presentación

Código de aplicación: `d5a7939`. Base: `c433087`. Rama:
`feature/lifecycle-reliability`. Verificación del 24/11/2026, Node 24.11.1.
Sin despliegue ni escrituras productivas. No se agregaron campos para completar,
colecciones, cambios de schema, migraciones ni reglas financieras.

## Causa reproducida

Se reprodujo el fallo original **antes de corregirlo**, con el mismo envío de
informe ejecutado en paralelo y una base nueva de Firestore Emulator. La traza
mostró el error 3 `Transaction is invalid or closed` en la lectura del presupuesto
de `submitPaymentReport`, antes de guardar el informe.

El SDK instalado reintenta ABORTED y otros errores temporales; para
INVALID_ARGUMENT sólo reconoce el texto `transaction has expired`, que no es el
texto observado. No se cambió el SDK ni se actualizaron dependencias.
[Firebase documenta los reintentos por contención](https://firebase.google.com/docs/firestore/transaction-data-contention)
y [distingue INVALID_ARGUMENT de errores reintentables](https://firebase.google.com/docs/firestore/use-rest-api).

Además, las rutas de informes y pagos respondían 403 para un error de transporte.
El navegador interpreta un 4xx como rechazo definitivo y descarta el identificador
de envío. Eso es incorrecto cuando la respuesta se pierde después de guardar.

## Corrección

- `firestoreTransaction.ts` reconoce únicamente el error exacto de transacción
  cerrada **proveniente de una lectura** y vuelve a abrir una transacción nueva.
  Límite: tres intentos, con espera breve entre ellos. Los reintentos normales
  de contención siguen a cargo del SDK.
- Un fallo de lectura no puede ser absorbido por una comprobación opcional de
  permisos para continuar usando una transacción cerrada. Se conserva el primer
  fallo de lectura del intento.
- No se agrega un reintento de una respuesta incierta de commit. En ese caso la
  API devuelve 503 y el navegador conserva el mismo comando para consultar su
  resultado persistido al reintentar. No se generan nuevos identificadores de
  pago ni nuevas decisiones por ese reintento.
- Se usa la corrección en lectura de cuenta/recibos, cobros y decisiones de
  informes. No se cambian montos, asignaciones, comisiones, firmas ni snapshots.
- Un INVALID_ARGUMENT distinto, un permiso denegado o un conflicto de dominio no
  se convierten en el reintento especial de lectura cerrada.

## Presentación y carga

- Un informe de efectivo pendiente dice que fue **informado** y espera
  confirmación. Un rechazado aclara que no acredita pago ni genera rendición.
  Un revertido no se presenta como un cobro vigente.
- El cliente sólo ve el resumen anterior cuando tiene operaciones anteriores.
  Se conserva el historial, sus fechas y sus cuotas. No se muestran ceros de un
  circuito vacío debajo del plan vigente. Se mantiene un acceso directo a la
  solicitud pública existente.
- El vendedor afiliado ve la explicación de las comisiones revertidas junto al
  resumen: en el caso probado, $ 203.000 generados, $ 29.000 revertidos y
  $ 174.000 netos, ya pagados. Es presentación de datos existentes.
- Se tiparon los datos de la pantalla de historial y se limpiaron estados y
  dependencias de efectos sin uso. Se preserva la reconstrucción explícita del
  Timestamp; no se modifica su persistencia.

## Verificación

| Comprobación | Resultado |
| --- | --- |
| Matriz del circuito vigente | 21/21 suites, salida 0 |
| Firestore Rules, base predeterminada con reglas cargadas | 36/36, salida 0 |
| Repetición adicional de cobros | 5/5 corridas, salida 0 en todas |
| Recorrido solicitud → aprobación → documentación → emisión → entrega → cobros | PASS |
| Vida completa de 12 y 18 cuotas | PASS: 30 cuotas, 33 puntos de conciliación |
| Saldo final de cliente, rendiciones y comisiones | Cero en ambos casos |
| Pérdida de respuesta después del commit | 503 y reintento del mismo comando; un pago, recibo, comisión y custodia |
| Error exacto inyectado antes de guardar | Recuperación en una transacción nueva, sin duplicar informe/alerta |
| Fallo permanente de lectura | Agota tres intentos; 503 sin acreditar un pago |
| Permisos y errores de argumentos | Conservados; no reintentos especiales |
| Navegador: Administración, cliente y vendedor afiliado | Mensajes corregidos y mismo saldo; consultas a rutas reales |
| Navegador: cliente con historial anterior | Una pagada, una pendiente y fecha de creación conservadas |
| TypeScript, ESLint de modificados, build Next 16.2.1 | Salida 0 |

Las cinco corridas repiten también los fallos provocados, la concurrencia,
los duplicados, las referencias bancarias, las reversiones y las rendiciones.
Se conservaron el log fallido de la base anterior y los resultados posteriores;
no se eligió solamente una corrida exitosa.

Las tres suites históricas fuera del runner actual siguen documentadas en el
informe anterior: el adaptador de congelación con conexión propia a `(default)`,
el escritor de promesas retirado y el E2E con identidad administrativa fija. No
se alteraron sus expectativas para marcar PASS. La matriz vigente, el recorrido
completo y la compatibilidad visual con historial son los controles de esta
corrección.

## Alcance de las evidencias

Firestore/Auth/Storage locales: proyecto `demo-cuenta-hogar`, puertos
8080/9099/9199. Cada suite de servicios usa una base nombrada nueva. Esas bases
no validan Rules; la suite de Rules se ejecutó aparte en `(default)`.
No se limpiaron fixtures ajenos ni se copiaron credenciales productivas.

La simulación ejecuta servicios reales del servidor y rutas HTTP reales con
usuarios sintéticos. Los meses avanzan sólo en el proceso Node. El navegador
verifica vistas y sesiones, no cada carga y pago por formulario.

Se mantienen las limitaciones del harness para avisos generales que consultan
la base predeterminada directamente desde el navegador y para consultas de
custodia ajenas al rol. No se presenta cada 403 de esas consultas como fallo
financiero ni se afirma que todas las rutas del sitio devolvieran 200.

La mora V2 continúa registrando atraso sin agregar recargos automáticos. No se
probaron dinero, bancos o notificaciones reales ni concurrencia ilimitada.
Una prueba finita no garantiza ausencia de todo fallo futuro; si se agotan los
reintentos, la operación conserva un resultado incierto explícito y el mismo
comando para reconciliarlo.

## Reproducción

Con los emuladores activos y sin credenciales productivas:

```sh
GCLOUD_PROJECT=demo-cuenta-hogar \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cuenta-hogar \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
node --import tsx scripts/runLifecycleSimulation.ts
```

Para repetir el escenario que fallaba, agregar `LIFECYCLE_REPETITIONS=5` y
seleccionar `testPaymentReportsThreePanelsEmulator`. El runner conserva un log
diferente y una base nueva por corrida.

Evidencia: `output/correccion-circuito-2026-11-24/`, con manifiesto, resultados de
matriz y repeticiones, línea temporal, controles de calidad, registro HTTP y
capturas. El cierre del servidor local también se ajustó para cerrar sus
conexiones de desarrollo y finalizar correctamente; es código de prueba.
