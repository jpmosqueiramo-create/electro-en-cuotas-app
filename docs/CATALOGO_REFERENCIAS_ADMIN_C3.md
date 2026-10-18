# Catálogo de referencias — Admin V2 (C3)

Base: `c772ae10db66a579c5919d3094980cb699a6c624`. Rama: `feature/catalogo-referencias-c3`. La ruta `/admin/productos`, AdminAppShell y navegación existentes se mantienen. Sin commit, push, PR o deploy; entrega para revisión visual.

## Editor y contratos

Seis secciones: Identificación, Información interna, Planes, Descripción, Imágenes y Publicación. SKU interno y EAN son opcionales y separados; codigoProducto se muestra como Código legacy de sólo lectura y no se interpreta automáticamente. Proveedor y costo se marcan SOLO ADMINISTRACIÓN. No se presentan TNA/mora ni desglose fiscal en el editor.

El borrador nuevo contiene los 18 factores C1 y todos los planes desactivados. Una ficha existente conserva overrides y habilitaciones explícitas; claves ausentes de factores usan defaults sólo en memoria, y planes ausentes permanecen desactivados. Restaurar factores sólo modifica el formulario local. La estimación usa calcularPlanReferenciaCatalogo y NEXT_90_V1, sin duplicar fórmula ni redondeo.

`buildCatalogReferencePrivatePatch` produce un patch para updateDoc. Guarda costoProveedor y costoProducto con el mismo importe; no recalcula ni incluye precioContado, codigoProducto, TNA/mora o stock. Las cuotas 8/12 de compatibilidad se actualizan por C1 únicamente si el plan correspondiente está activo; si está inactivo no se escriben, conservando valores anteriores. No se usan como fuente de verdad C3. Claves de mapas legacy fuera de 1–18 se conservan sin mostrarlas, activarlas o publicarlas mediante C3. No se modifican snapshots contractuales ni motores existentes.

Una referencia nueva recibe ID generado por Firestore y flags legacy activo/publicado=false para evitar publicación implícita en consumidores anteriores. Editar una ficha existente no modifica esos flags. No se cambia la semántica de publicación legacy: la autoridad C3 es preview/existencia de catalogo_publico de C2. Guardar no llama al comando Publicar ni escribe la proyección.

## Publicación explícita

El listado obtiene estados a través de preview C2: No publicada, Publicada, Cambios sin publicar, No válida para publicar. La indisponibilidad de esa consulta se presenta por separado, sin asumir un estado falso. Después de guardar, se actualiza el listado y se vuelve a consultar preview. Una vista previa de cambios locales exige guardarlos primero.

El componente `CatalogReferencePreview` recibe exclusivamente `{ reference: CatalogReferencePublic }`; no recibe productos, costos, factores ni callbacks privados. Sólo muestra nombre, descripción, imágenes y cuotas estimadas. El contenedor Admin conserva fingerprint y controles fuera del componente. Publicar envía exclusivamente expectedFingerprint al endpoint C2 autenticado. Un 409 cierra la preview obsoleta y exige revisarla nuevamente, sin reintento automático.

Despublicar usa ConfirmDialog con foco contenido, Escape y retorno de foco. C2 elimina sólo público. Eliminar mantiene la baja privada legacy, sin cascadas ni borrado de archivos; se bloquea si existe proyección pública o el estado es desconocido. Antes de la baja se vuelve a comprobar preview; la confirmación advierte que se pierde el registro privado de unidades. No se introduce una garantía transaccional nueva de baja frente a publicación concurrente.

## Stock e imágenes

Stock no condiciona referencia, planes, preview ni publicación. Son válidos stock=[] y stock=0. El DTO público omite stock. El stock se consulta desde Stock / unidades y el traslado desde Traslado interno; se conservaron handlers de alta/baja de unidades, selección, actualización de ubicación y generación de remito. Sólo se adaptaron tipos y contenedores/presentación. El formulario logístico no reemplaza el editor de referencia.

Máximo cuatro imágenes contando URLs existentes, URL pendiente y archivos nuevos antes de subir o guardar. Quitar del borrador no elimina objetos Storage. Se conserva upload comprimido con fallback Data URL legacy; su timeout no garantiza cancelación del upload y puede dejar huérfanos, sin limpieza física en C3. Un guard previo impide uploads en E2E o proyecto demo, porque Storage no está emulado. Las suites usan URLs locales/fixtures. Imágenes inaccesibles conservan fallback al logo existente.

## Seguridad transitoria

**PUBLIC_PRODUCT_EXPOSURE_FIXED = NO.** productos continúa públicamente legible por Rules legacy; por ello no desplegar C3 de forma aislada. SKU/EAN/costo/proveedor son campos internos por contrato y UI, pero la privacidad efectiva de la colección depende de C4/C5. STOCK_PUBLICLY_EXPOSED=NO se refiere al DTO nuevo, no a un cierre de lectura legacy ya realizado. No se modifican Firestore/Storage Rules, HomeTechCatalog, PublicCatalog, Solicitar, Cliente, Vendedor afiliado ni catalogManager.

## Verificación

- `npm run test:catalog-c3`: defaults, planes apagados, overrides, redondeo, alias de costo, cuotas legacy, precioContado/código/stock preservados, límite de imágenes y preview renderizada sin datos internos.
- `npm run test:emulator:catalog-c3`: alta y edición privada, A pública conservada al guardar B, estado pendiente, republicación, despublicación, conservación legacy y publicación con stock vacío/0. Importa primero la guarda compartida de entorno.
- `npm run test:browser:catalog-c3`: wrapper de Next dev propio en localhost:3000, Auth/Firestore demo y Chrome CDP temporal. Desktop 1280x800 y mobile 390x844; alta/edición, seis secciones, 18 planes, factor custom, estimación, preview sanitizada, conflicto 409 real, publicación, guardado B, republicación, ConfirmDialog, stock/traslado accesibles, overflow y logout. Revisa bodies de publicación y detecta conexiones Firebase externas y uploads. No hace pruebas de upload real.
- Regresión: C1, C2 pura y Emulator, test:safe y smoke general 12 escenarios conforme CODEX_RUNTIME.md. No cambiar expectativas ni debilitar gates existentes.
- Gates de código: git diff --check, tsc --noEmit, ESLint de archivos tocados/nuevos y npm run build. Browser y build se ejecutan secuencialmente para no competir por tipos/carpetas generadas de Next.

Todas las suites Firebase requieren GCLOUD_PROJECT=demo-cuenta-hogar, NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cuenta-hogar, FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 y FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099. Ejecutar mediante firebase-tools emulators:exec --project demo-cuenta-hogar --only auth,firestore. Ninguna configuración autoriza producción o despliegues.

Capturas fuera de Git: `/tmp/cuenta-hogar-catalogo-c3/`: listado-desktop.png, editor-desktop.png, planes-desktop.png, preview-desktop.png, listado-mobile.png, editor-mobile.png, planes-mobile.png y preview-mobile.png. Los resultados de ejecución se entregan en el informe final; esta enumeración no acredita PASS por sí sola.
