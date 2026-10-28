# Catálogo del vendedor afiliado y visibilidad pública

## Uso diario

- **Panel del vendedor afiliado → Catálogo**: productos publicados, imágenes, búsqueda por nombre/marca/modelo y selector de planes publicados. El importe mostrado es el guardado en la publicación; no se recalculan factores, tasas ni presupuestos.
- **Administración → Catálogo → Catálogo en el sitio público**: «Ocultar catálogo público» / «Mostrar catálogo público», con estado guardado y confirmación de resultado. El cambio se refleja en la siguiente carga de la principal y de Servicio de compra.
- Ocultar no borra productos, no despublica referencias y no afecta el catálogo de los vendedores. Ambas páginas conservan servicios, formularios de contacto y demás contenido.

El alcance del interruptor es **la presentación en `/` y `/servicio-de-compra`**. No convierte los productos publicados en información privada ni bloquea `/api/catalogo`, los detalles públicos. Para retirar una referencia pública se conserva la acción existente de despublicar.

## Permisos y datos

`GET /api/afiliado/catalogo` exige Auth vigente, correo verificado y un único perfil `vendedores` activo ligado al UID. Devuelve exclusivamente la proyección allowlist existente de `catalogo_publico`: nombre, descripción, imágenes y planes publicados. Nunca consulta ni entrega costo proveedor, márgenes, factores, stock privado o información de clientes. Invitados, clientes, perfiles inactivos, cuentas deshabilitadas y correos no verificados no acceden a este endpoint.

`GET /api/catalogo-visibilidad` expone sólo `{homeVisible:boolean}`, sin identidad administrativa. Respuesta `no-store`; si la configuración no puede comprobarse, ninguna de las dos páginas muestra el catálogo. Cuando la visibilidad está confirmada, se conservan los estados de carga/error del listado.

`GET/POST /api/admin/catalogo/visibilidad` usa la autenticación administrativa vigente. El POST recibe estado deseado explícito `homeVisible` y `expectedRevision`; transacción con control de concurrencia. Reintentar el mismo estado no invierte el interruptor ni duplica escrituras; una modificación opuesta desde una revisión desactualizada devuelve 409 y pide actualizar.

## Schema y compatibilidad

Documento de configuración existente: `configuracion_general/catalogo_visibilidad`.

| Campo | Tipo | Uso |
| --- | --- | --- |
| schemaVersion | número, 1 | Contrato de configuración |
| homeVisible | booleano | Visibilidad en la principal y Servicio de compra |
| revision | entero positivo | Control de concurrencia |
| updatedAt | fecha ISO en string | Momento del último cambio |
| updatedBy | string UID | Administrador que guardó |

Documento ausente conserva la conducta anterior: visible, revisión lógica 0. No requiere migración de productos. Documento incompatible o inválido falla sin asumir visibilidad. Las Rules existentes permiten escribir `configuracion_general` sólo a Administración; el endpoint también autoriza en servidor. No hay cambios de Rules, índices, configuración de App Hosting ni permisos Firebase.

No altera colecciones/productos existentes, snapshots financieros, comisiones, contratos, cuotas, pagos, CH ni documentos jurídicos. No depende del PR de invitaciones de clientes.

## Verificación reproducible

`scripts/testAffiliateCatalogVisibilityEmulator.ts`, con `CATALOG_VISIBILITY_BROWSER=1`, usa Auth, Firestore y Storage demo locales. Comprueba:

- Valor por defecto sin crear configuración; ocultar, persistir, reintentar, conflicto de revisiones y volver a mostrar.
- Permisos de administrador; vendedor activo/verificado; rechazo de clientes, anónimos, inactivos y deshabilitados.
- Ausencia de campos privados y preservación exacta de productos/publicaciones.
- Principal y Servicio de compra sin mostrar el catálogo ni pedir productos cuando se oculta; catálogo del vendedor disponible en ese estado; búsqueda sin distinguir mayúsculas/acentos y selección del importe publicado.
- Escritorio 1280 px y móviles 390/320 px sin desbordamiento horizontal. Capturas locales del panel del vendedor y control administrativo.

Ejecución: `firebase-tools emulators:exec --only auth,firestore,storage --project demo-cuenta-hogar`, con variables demo y hosts locales exigidos por AGENTS.md, Java 21 y `LOCAL_BROWSER_WEBPACK=1`. El correo del administrador sintético de Auth Emulator coincide con las Rules existentes, sin cambiarlas para la prueba. No se usaron registros ni escrituras productivas.

### Verificación original del control de visibilidad

| Comprobación | Resultado |
| --- | --- |
| `npx tsc --noEmit` | PASS |
| ESLint archivos nuevos | PASS, sin advertencias |
| ESLint diferencial de los tres archivos existentes | PASS, cero mensajes nuevos; nueve heredados |
| `npm run build` | PASS |
| `npm run test:safe` | PASS |
| `testAffiliateCatalogVisibilityEmulator.ts` con navegador | PASS |
| `testPublicCatalogEmulator.ts` | PASS |
| `testPublicCatalog.ts` | PASS |

Se inspeccionaron visualmente las capturas móviles de Administración y vendedor afiliado. También se comprobó mediante HTTP que un producto cuyo ID sea `visibilidad` conserva su URL pública: el nuevo endpoint utiliza `/api/catalogo-visibilidad`, separado de las rutas de detalles de producto.

No se desplegó ni se cambió la visibilidad productiva como parte de esta revisión.


### Corrección de alcance: Servicio de compra

Se conserva el campo `homeVisible`, su tipo y su control de revisión por compatibilidad. Ahora también lo consume `PublicCatalog`, usado en `/servicio-de-compra`, antes de solicitar productos. La sección completa de opciones, filtros y tarjetas permanece fuera del DOM hasta confirmar visibilidad. No cambia el formulario de consulta, la descripción del servicio, las publicaciones ni los accesos del afiliado. No requiere migración ni cambios de configuración productiva.


Validación de la corrección: `npx tsc --noEmit` y `npm run build` correctos; ESLint sin errores ni diagnósticos nuevos (14 advertencias heredadas en `PublicCatalog.tsx`, las mismas que en main); suite de visibilidad con Firebase Emulators y Chrome correcta en 1280/390/320. Se verificaron ocultar/restaurar ambas páginas, no solicitar productos cuando están ocultos, formularios disponibles, catálogo del afiliado independiente y respuesta 503 con catálogo fuera del DOM ante configuración inválida. Productos y publicaciones permanecieron idénticos. Sin cambios productivos ni deploy.
