# Seguimiento de Cobranzas y carga simple del catálogo

Base funcional: SHA aprobado y publicado `01af134`. Se implementan los dos pedidos
sobre esa base, sin incorporar las ediciones pendientes del checkout principal.

## Cobranzas: información visible, misma carga

Cada caso muestra último contacto, fecha/hora de Argentina, comentario, última
promesa registrada, próximo contacto programado y próximo paso sugerido. Los avisos
de pago por confirmar tienen prioridad antes de contactar. Ante datos financieros
o de seguimiento no verificados se indica actualizar/verificar, sin inventar un
saldo ni mostrar ausencia de contactos.

Las promesas son declaraciones: no acreditan cuotas ni se clasifican automáticamente
como cumplidas/incumplidas por su fecha. Si el plan está saldado, la ficha lo informa.
Los casos con promesa o próximo contacto guardados pueden aparecer sin cuotas
vencidas mientras tengan saldo pendiente; no se agrega ese saldo a las tres tarjetas
financieras. El filtro Seguimiento de clientes excluye los pendientes de entrega del
vendedor afiliado, cuyo próximo paso sigue siendo revisar y confirmar la rendición.

Guardar un contacto actualiza la bandeja. Actualizar saldos conserva las notas en
edición y las fichas con identidad estable. Los saldos anteriores quedan sin verificar
mientras se completa la lectura. Las consultas periódicas no cancelan una lectura
en curso; pagos, rendiciones y contactos guardados sí fuerzan una lectura nueva.

Se mantienen comentario y dos fechas opcionales del formulario existente. No se
agregan campos de carga, estados de promesa ni escrituras financieras.

### Compatibilidad de datos y API

- Firestore conserva `custody/engagements` en su ruta actual; sin nuevos campos ni
  colecciones. Se mantiene la identidad de presupuesto/versión/operación.
- GET de `gestiones`, administrativo y de vendedor afiliado asignado, añade
  `latestPromise: CollectionContact | null`. `records` sigue conteniendo los últimos
  30 contactos y conserva `historyTruncated`. Los consumidores anteriores ignoran
  el campo adicional; POST conserva payload y resultado existentes.
- Si la promesa quedó fuera de esos 30 registros, se consulta por `kind == PROMISE`
  y se elige la más reciente por fecha/ID. Es una consulta de un solo campo, sin
  nuevo índice compuesto. Un contacto común no borra la promesa del historial.
- La proyección conserva únicamente datos de contacto ya autorizados; no añade UID,
  costos, datos financieros privados ni visibilidad al portal del cliente.
- Las lecturas se limitan a cuatro operaciones simultáneas. Los fallos parciales
  se informan por separado; el historial no consultado no equivale a historial vacío.
- Se utiliza la recuperación de transacciones cerradas ya existente. No se amplían
  los reintentos a commits inciertos ni se relajan permisos o guardas.

## Catálogo: carga simple y repetición de configuración

El editor abre en Carga simple. Nombre y costo son los únicos campos obligatorios
para guardar una ficha privada. Proveedor, categoría, fotos y descripción siguen
siendo opcionales en el borrador. Los 18 plazos se eligen con controles compactos;
los importes usan el motor C1 existente y los factores guardados.

Edición completa conserva marca/tipo, SKU/EAN, factores y demás controles. Cambiar
de vista no reinicia el borrador. No cambia el configurador de presupuestos.

Guardar y cargar otro conserva proveedor, categoría y los mapas independientes de
plazos/factores. Vacía nombre, costo, marca/tipo, SKU/EAN, descripción e imágenes;
no copia identidad, stock ni publicación. La pantalla explica qué se conserva.

Los controles de guardado están al pie; en pantallas grandes acompañan el scroll.
En móvil permanecen en el flujo para evitar tapar los campos. La carga masiva
Excel/CSV, el stock y el traslado siguen usando los circuitos existentes.

### Persistencia y publicación

- El alta reserva un único ID en `productos` por intento y guarda con transacción
  del SDK cliente. Si se reintenta un resultado perdido, verifica ese mismo ID y
  los mismos valores, incluido Timestamp, y reconoce el alta existente.
- Si la ficha cambió, no la sobrescribe: abre su versión actual para revisión.
  Una respuesta incierta conserva el intento y bloquea cambios hasta reintentarlo.
- La identidad confirmada se conserva antes de la lectura posterior. Un fallo de
  esa lectura no lleva a crear otro producto. Hay guarda sincrónica contra doble envío.
- Este mecanismo corresponde al intento de la sesión del editor; no deduplica altas
  independientes iniciadas en otras pestañas ni impone unicidad comercial de nombres.
- Los campos guardados y sus tipos son los existentes. Se conservan stock, precio
  legacy y códigos al editar. No se añaden colecciones de comandos ni migraciones.
- Guardar no publica. Se mantiene preview allowlist, fingerprint y publicación
  explícita. Para publicar siguen siendo necesarios los datos públicos válidos.
- No se cambian motores financieros, reglas de comisión, Rules, Storage Rules,
  documentos legales congelados ni configuración productiva.

## Verificación

Nuevas suites: `testCollectionsFollowup.ts`, `testCatalogQuickEntry.ts` y
`testCatalogQuickEntryEmulator.ts`; ampliación de `testCollectionsInboxEmulator.ts`.
Incluyen fuente parcial, prioridades, promesa fuera de los últimos 30 contactos,
plan saldado, casos programados, centavos, dos campos obligatorios, mapas sin alias,
reintento/doble envío, conflicto concurrente, tipos Timestamp, permisos de las Rules
actuales del emulador y publicación explícita sin datos internos.

La revisión de navegador usa CUA sobre Next y rutas reales locales: contactos
compartidos, actualización de la bandeja, nota en edición conservada, alta mínima,
guardar/cargar otro, cambio de vista, factores persistidos, edición de ficha anterior
y preview pública. Las pruebas de escritura se hacen exclusivamente en emuladores.
Las bases nombradas prueban dominio/rutas, no Firestore Rules; la suite cliente del
catálogo usa la base default con las Rules actuales. No se limpian fixtures ajenas.

Artefactos y resultados de ejecución: `output/seguimiento-catalogo-2026-11-25/` en
el workspace principal. Este documento describe el alcance; el informe y los logs
acreditan los resultados del SHA bajo revisión. No hay despliegue autorizado de este
cambio hasta que se apruebe su SHA explícito.
