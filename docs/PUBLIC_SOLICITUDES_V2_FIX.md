# Corrección de solicitudes públicas y continuidad V2

Base: `d927a1a0c2877e78b071b4b492e6274b06f4cbf2`.

## Causas y cambios

- La portada escribía una misma consulta en `solicitudes` y `solicitudes_cuenta`. Los envíos nuevos de portada, servicio de compra y catálogo usan únicamente `solicitudes_cuenta`. La lectura de ambas colecciones continúa; no hay deduplicación retrospectiva, migración ni borrados.
- Los formularios capturaban errores y redirigían en `finally` o incluso en `catch`. Ahora esperan una respuesta explícita `persisted: true` del endpoint `POST /api/public/solicitudes`. Un fallo presenta error y permite reintentar; no abre WhatsApp. No hay mensajes ni correos externos automáticos desde este endpoint. Se conserva una alerta administrativa interna por operación.
- El detalle y la bandeja omitían la selección comercial. Muestran producto, referencia, origen, fecha y preferencia de cuotas e importe capturados; no consultan el catálogo para sustituirlos. La preferencia no es Acceptance ni una obligación contractual.
- La tarjeta de presupuesto priorizaba dirección sobre localidad y atribuía toda consulta a la portada. Se muestran la localidad y el origen documentados; lo desconocido permanece sin registrar.

## Persistencia, seguridad y reintentos

El cliente genera un UUID v4 y lo conserva durante reintentos; sessionStorage guarda sólo el ID y un digest del formulario, sin sus valores personales. Volver a enviar datos idénticos en esa sesión reutiliza la identidad, incluso tras recargar. Un cambio de contenido es un envío distinto. Sin sessionStorage, la protección sobrevive mientras se conserve el componente. No deduplica entre dispositivos ni sesiones independientes.

El servidor valida una allowlist con límites de longitud, ID, tipos, contacto y selección. No acepta colección, estado, costos, factores ni proveedor del cliente. El ID canónico es `solicitudes_cuenta/web_{UUID}`. Una transacción crea la operación sólo si no existe; el mismo ID con otro contenido produce conflicto. El replay no sobrescribe estado administrativo, fechas, precio ni otros datos existentes.

Único campo nuevo: `publicSubmissionHash: string` (SHA-256 del payload normalizado), escrito por el servidor para detectar conflictos; no se devuelve al público ni se proyecta a UI. Los campos comerciales existentes mantienen sus nombres y tipos (`planElegido: string`, `montoCuota: number` en pesos). Los formularios nuevos no guardan placeholders de documentos inexistentes ni duplican localidad en domicilio.

La selección se contrasta con `catalogo_publico` dentro de la transacción inicial; si cambió respecto de lo visualizado se rechaza, sin recalcular. Los reintentos de una operación ya guardada usan su contenido original aunque el catálogo luego cambie. No se leen productos privados desde este endpoint.

La alerta usa el mismo ID en `alertas_admin` y una segunda transacción de creación condicional. Su fallo no revierte la solicitud. Un replay puede reparar la alerta sin duplicarla ni restablecer su estado de lectura. No se prometen entrega ni reintentos automáticos de notificaciones externas.

Endpoint público de escritura, sin lectura pública de solicitudes: comprueba origen cuando viene informado, valida tamaño y contenido, y sólo retorna ID, fuente y confirmación. Las Rules no se modifican. Admin SDK queda limitado por el código a las colecciones descritas; no hay endpoint de actualización ni borrado. La protección contra abuso masivo sigue siendo la de la infraestructura existente; no se incorpora CAPTCHA o rate limiting distribuido en este cambio.

## Históricos y Presupuestos V2

Se mantienen las identidades `sourceCollection + documentId`, los filtros y los lectores de ambas colecciones. No se fusionan documentos históricos por nombre o DNI. Si no existe evidencia del origen, cuota, referencia o localidad, se muestra como no registrado. Los valores históricos no se recalculan.

El detalle enlaza al confeccionador V2 con colección e ID; el usuario inicia explícitamente un presupuesto. Si el origen aún no cargó o no existe, no se sustituye silenciosamente. No hay Budget, Acceptance ni contrato automático; motores, Rules y documentos legales no cambian.

## Verificación

- `npx tsx scripts/testPublicSolicitudes.ts`: validación, errores de respuesta, doble clic, reintento tras respuesta perdida y compatibilidad histórica.
- `npx tsx scripts/testPublicSolicitudesEmulator.ts`, con las variables demo de CODEX_RUNTIME.md: concurrencia, una operación, estado preservado, conflicto, alerta secundaria, precios capturados, fallo de persistencia y cero presupuestos automáticos.
- Regresiones: `testAdminSolicitudesReadModel.ts` y `testAdminDocumentacionReadModel.ts`.
- TypeScript, ESLint de archivos tocados, build y `npm run test:safe`.
- Browser manual con Next local, Auth/Firestore Emulator demo: envío A desktop y B mobile, WhatsApp posterior a confirmación (sin enviar mensajes), persistencia tras recargar, detalle, bandeja y acceso V2 de ambos orígenes. Reintento idéntico de A mantiene una operación. Rechazo de datos muestra error y no redirige. Capturas en `/tmp/cuenta-hogar-public-solicitudes-fix/`, fuera de Git.

Ninguna prueba escribe en producción. No deploy, merge, Rules, IAM, limpieza histórica ni emisión contractual.
