# Límite distribuido por contacto declarado

Base: `2a0943a0e9ffcf872381ba7676d597ebbfb57e71`. Complementa PR #36; no cambia Budget, Acceptance ni Contrato V2.

## Política y activación

`CONTACT_3_PER_HOUR_V1`: máximo tres solicitudes nuevas por contacto en una ventana de 3.600.000 ms, anclada al primer envío permitido. El cuarto devuelve HTTP 429 y `Retry-After` en segundos hasta el vencimiento. No es una ventana móvil: en el límite entre dos ventanas puede haber una ráfaga de envíos. No hay control por IP ni lectura de headers de IP.

La política está versionada en código. Cambiar límite, duración o normalización requiere revisar y versionar la política; no se aceptan estos parámetros del cliente.

Configuración exclusivamente servidor:

- `PUBLIC_SOLICITUDES_RATE_LIMIT_ENABLED`: ausente o `false` conserva exactamente el comportamiento anterior, sin contadores. `true` activa la protección.
- `PUBLIC_SOLICITUDES_HMAC_KEY`: clave aleatoria de 256 bits, codificada como 64 caracteres hexadecimales. Obligatoria sólo si se activa el límite. Nunca usar prefijo `NEXT_PUBLIC_` ni incluir el valor en Git, logs, comandos registrados o informes.

Con activación explícita y clave inválida/ausente, los envíos nuevos fallan con 503 y un mensaje general; no se crean solicitudes ni contadores. Los replays válidos existentes siguen funcionando y los conflictos de ID siguen rechazándose. No hay inicialización que afecte al resto de la aplicación o al build. **La configuración publicada no se modifica y la protección queda desactivada por defecto. No presentar el PR como protección ya activa.**

## Mecanismo seguro disponible en App Hosting

Verificado antes de implementar: App Hosting permite adjuntar secretos existentes de Secret Manager como variables de entorno, con disponibilidad exclusivamente RUNTIME. Referencia oficial: https://firebase.google.com/docs/app-hosting/configure#secret-parameters

Procedimiento futuro, sujeto a autorización independiente:

1. Crear mediante un procedimiento seguro una clave aleatoria de 32 bytes y conservarla en Secret Manager del proyecto de destino. No reutilizar otras credenciales. No se creó ni se leyó un secreto real en esta tarea.
2. Autorizar al backend a acceder únicamente a ese secreto según el mecanismo de App Hosting. Los permisos necesarios requieren aprobación separada; no se modificaron IAM ni infraestructura.
3. Adjuntar una versión fija del secreto como `PUBLIC_SOLICITUDES_HMAC_KEY` con disponibilidad RUNTIME. No adjuntarla a BUILD. Declaración ilustrativa (no aplicada):

   ```yaml
   - variable: PUBLIC_SOLICITUDES_HMAC_KEY
     secret: <secreto-aprobado>@<version-aprobada>
     availability:
       - RUNTIME
   - variable: PUBLIC_SOLICITUDES_RATE_LIMIT_ENABLED
     value: "true"
     availability:
       - RUNTIME
   ```

4. Verificar proyecto, versión y precedencia de overrides del backend antes de publicar un SHA aprobado. No mostrar el valor. Habilitar el flag sólo junto con la clave ya validada. No hay despliegue en esta tarea.
5. Para desactivar el límite, cambiar expresamente el flag a `false` mediante el procedimiento autorizado; no es una acción automática ante fallos.

La rotación de clave o versión de política cambia los IDs y reinicia de hecho los cupos. Coordinarla; mantener una sola versión de clave durante un rollout y evitar versiones mixtas con contadores distintos. Los registros anteriores vencen y son candidatos a limpieza.

## Normalización y privacidad

Se usa el WhatsApp declarado. Se eliminan espacios, paréntesis, puntos, guiones y `+`; el prefijo internacional `00` se normaliza. Se admiten 6–15 dígitos resultantes. No se inventa país ni se equiparan automáticamente formatos nacionales con internacionales.

ID: HMAC-SHA256 con separación de dominio por versión y propósito. Colección nueva: `public_solicitud_contact_limits/{hmac}`. Contenido: `policy: string`, `count: int` y `expiresAt: Timestamp`. No guarda teléfono, IP, email, nombre, ID de solicitud ni hash sin clave del contacto. No se devuelve el HMAC ni el contador al cliente. Las Rules existentes niegan acceso no-admin a esta colección; no se modifican Rules.

El límite **no impide abuso mediante contactos diferentes**, identidades falsas, variantes de marcación no equivalentes o tráfico distribuido. No acredita titularidad del teléfono y puede afectar a personas que compartan contacto. Tampoco bloquea las escrituras directas legacy permitidas por las Rules actuales: esta protección cubre únicamente `POST /api/public/solicitudes`. No es protección DDoS ni límite global de gasto.

## Atomicidad e idempotencia

Se conserva la transacción de PR #36. Primero se consulta exclusivamente el recibo del ID actual: un replay idéntico retorna sin leer ni consumir cupo; un mismo ID con otro contenido sigue en conflicto. Para un envío nuevo se validan los datos/catálogo, se lee el contador HMAC y se escriben contador y solicitud en la **misma transacción**. Una colisión concurrente reintenta; un aborto no confirma ninguna escritura. La alerta permanece secundaria e idempotente y no consume cupo adicional. No se consultan colecciones contractuales ni se recorren solicitudes históricas.

El cliente de PR #36 ya presenta el error 429 de forma simple y no abre WhatsApp sin `persisted: true`; no se cambian los formularios ni la integración V2.

## Vencimiento, limpieza y costo

Un contador vencido se reinicia atómicamente al siguiente envío del mismo contacto. Tras una solicitud nueva confirmada se buscan hasta diez controles vencidos y se elimina cada uno mediante transacción, revalidando su vencimiento. Así una limpieza concurrente no elimina una ventana renovada. Sólo se eliminan documentos de la colección de control, nunca solicitudes, alertas, históricos o documentos contractuales. El fallo de limpieza no revierte el envío.

Es limpieza oportunista, sin scheduler ni TTL desplegado: sin nuevos envíos los registros pueden permanecer vencidos; tampoco hay garantía de plazo ante errores continuados de limpieza. No genera un documento por ventana para un mismo contacto. El backlog se procesa en lotes al regresar el tráfico. Si se requiere retención temporal garantizada, deberá aprobarse aparte una política TTL o tarea programada. No se creó infraestructura para ello.

Costo incremental habitual por envío nuevo aceptado: una lectura y una escritura de contador, más una consulta de limpieza (mínimo facturable de lectura incluso sin resultados). Cada contador vencido encontrado agrega lectura de consulta, relectura transaccional y borrado; máximo diez por invocación. Los reintentos transaccionales y cuotas de Secret Manager pueden agregar costo. Un replay no añade operaciones de contador o limpieza. No se ofrece una cifra mensual sin volumen/región; la referencia es costo por operación, sin recursos nuevos ni costos productivos generados por estas pruebas.

## Pruebas ejecutadas

- `scripts/testPublicSolicitudRateLimit.ts`, sólo Emulator demo: tres permitidas, cuarta 429 con Retry-After, normalización, ocho intentos concurrentes, replay/respuesta perdida, conflicto, alerta fallida sin recargo, aborto después de preparar escrituras, ventana vencida, limpieza, configuración ausente, privacidad y cero escrituras productivas.
- Regresiones PR #36: `scripts/testPublicSolicitudes.ts` y `scripts/testPublicSolicitudesEmulator.ts`. Incluyen confirmación cliente antes de éxito, persistencia única, captura comercial y cero presupuestos automáticos.
- TypeScript, ESLint de archivos tocados, build y `npm run test:safe`.

No se ejecutaron pruebas de carga ni despliegues reales. Sin merge, deploy, cambios de Rules/IAM, creación de secretos o borrados productivos.
