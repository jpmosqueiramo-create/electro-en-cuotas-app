# Catálogo de referencias de compra — C0: auditoría y arquitectura

## 1. Estado actual

Base auditada: `967b29a6dea551840468f20c4bc0cd088a2eafd1`, coincidente con `origin/main` después de `git fetch --all --prune`, cambio a `main` y `git pull --ff-only origin main`. Se verificó árbol limpio antes de crear `design/catalogo-referencias-architecture`. Esta base no acredita el SHA desplegado.

Alcance: análisis estático y propuesta; únicamente este documento. No se consultaron datos productivos, ejecutaron escrituras, cambiaron aplicaciones, schemas, Rules, Storage, configuración o pricing. No hay commit, push ni deploy. Las rutas y líneas citadas corresponden a la base auditada. La exposición descrita se demuestra por código y reglas versionadas, no por inspección de documentos reales ni verificación de reglas desplegadas.

Fuentes de gobierno: `AGENTS.md`, `CODEX_RUNTIME.md`, `docs/UX_UI_PANEL_AUDIT.md` y `docs/PANEL_REDESIGN_SPEC.md`. Se conserva la organización operativa aprobada, el catálogo como herramienta secundaria, la identidad institucional, los controles táctiles de al menos 44 px y la separación de datos por rol. Se revisaron especialmente los seis archivos solicitados y las dependencias encontradas por búsqueda de los once términos indicados.

**Principio obligatorio:** Cuenta Hogar no vende los bienes publicados. Cada ficha representa una referencia de bien para solicitar un servicio de gestión de compra mediante mandato. Publicar una referencia no acredita disponibilidad de proveedor, reserva, propuesta aceptada ni contrato.

| Superficie actual | Comportamiento observado |
| --- | --- |
| `/admin/productos` | CRUD de fichas, costo, proveedor, factores, publicación, imágenes, stock unitario y traslado con remito en una página (`page.tsx:214–517`, formulario desde `:530`) |
| Home `/` | `HomeTechCatalog`, carga todo `productos`, filtra después; presenta hasta seis fichas (`:119–130`, `:613`), nombre, descripción recortada a dos líneas, sólo `imagenUrl` y plan de 12 cuotas recalculado |
| `/servicio-de-compra` | `PublicCatalog`, descarga completa equivalente (`:121–132`); búsqueda y filtro de cuotas locales; lista todas las coincidencias sin límite de seis; destaca `cuota12` persistida (`:670`) |
| `/productos` | Redirección a `/servicio-de-compra` (`src/app/productos/page.tsx`); no es otro lector |
| Persistencia | `productos` mezcla contenido publicable, configuración financiera, proveedor y stock; no existe un flujo de proyección pública en los consumidores auditados |

Home calcula con `costoProducto || precioAnterior || 100000` (`HomeTechCatalog.tsx:614`): el último valor es un importe inventado de fallback. Busca el plan 12 sin exigir `activo`; el helper devuelve los doce planes aunque estén deshabilitados. La imagen tiene fallback al logo; no usa la galería `imagenUrls`. La descripción se recorta visualmente, no se limita al descargarla. El `reverse()` del resultado no garantiza orden cronológico. El CTA “Solicitar cotización” abre WhatsApp con nombre en texto, sin ID estable ni plan (`:667–673`). PublicCatalog usa “Consultar por este producto”, también con nombre y sin identidad de ficha (`:719` aproximadamente). Sus filtros y el plan destacado pueden discrepar.

Objetivo público: nombre, descripción, hasta cuatro fotos aptas para publicación y sólo planes habilitados con importes resultantes. CTA “Solicitar gestión de compra” o “Solicitar propuesta”. No usar “Comprar”, “Precio de venta”, “Producto en venta” ni “Financiación del producto” para describir estas fichas. Se mantiene explícita su relación con el servicio de gestión de compra. Este documento no cambia metadata global ni documentos legales congelados.

## 2. Riesgos de exposición pública

La evidencia principal es `firestore.rules:40–43`: `match /productos/{document=**}` permite `read: if true` y restringe escritura a Admin. La lectura pública alcanza documentos completos y el patrón recursivo; las reglas no eliminan campos de un documento autorizado.

Home (`HomeTechCatalog.tsx:119–127`) y PublicCatalog (`PublicCatalog.tsx:121–129`) ejecutan consultas sin restricción de publicación, incorporan `...doc.data()` y filtran `activo !== false && publicado !== false` en el navegador. Un tipo TypeScript reducido no elimina propiedades de la respuesta. Ocultar un campo en JSX no lo protege. Incluso fichas ocultas llegan en la respuesta, y documentos sin ambos flags se consideran visibles.

| Dato | Evidencia de presencia potencial y exposición | Clasificación objetivo |
| --- | --- | --- |
| `codigoProducto` | Guardado en Admin `:477`; etiqueta actual EAN/SKU `:541`; descargable completo por los lectores públicos | ADMIN ONLY; significado legacy ambiguo |
| `costoProducto`, `proveedor` | Payload Admin `:482–488`; constructor manual `manualBudgetProduct.ts:524–532` | ADMIN ONLY |
| `factoresPlanes`, `planesActivos` | Payload Admin `:491–492`, lecturas públicas y cálculo cliente | Factores privados; publicar sólo resultados de planes habilitados |
| `tasaInteresTna`, `tasaMora` | Payload Admin `:484–486`; `/solicitar` los copia a solicitud (`:127–128`); Cliente vuelve a leerlos (`:441–447`) | Tasas internas privadas; conservar snapshots históricos sin reinterpretarlos |
| `stock` | Actualizaciones Admin `:299`, `:319` y Validaciones; descarga pública completa | ADMIN ONLY: unidades, localidades, series y asignaciones |
| `precioContado`, `precioAnterior` | Persistidos por varios escritores con semánticas diferentes; Home usa precio anterior como posible costo | No publicar por arrastre; sustituir por importes de referencia explícitos |
| SKU separado, EAN separado, link proveedor, margen, fiscalidad y notas internas | No se acredita que existan hoy como campos separados en los escritores principales. Si un documento los contiene, la regla pública actual también autoriza leerlos | ADMIN ONLY, exclusión explícita futura |

Se confirma exposición posible de los campos escritos y de cualquier campo adicional presente, no su existencia en cada ficha productiva. Los cinco consumidores no-admin de la sección 3 obtienen documentos completos. No se utilizó producción para demostrarlo.

Riesgos adicionales: texto libre público puede copiar datos internos; URLs pueden incorporar códigos o links de proveedor; una imagen puede mostrar etiquetas o metadatos internos. Una allowlist de claves requiere además revisar contenido. El cierre de Rules no recupera datos ya descargados, imágenes compartidas ni cachés anteriores.

## 3. Consumidores de productos

Inventario estático mediante `rg` en `src` y `scripts`, búsqueda de accesos Firestore y seguimiento de imports. **13 archivos contienen accesos directos a la colección**: cinco interfaces no-admin, tres interfaces Admin, tres APIs Admin y dos librerías. Incluye `stockUtils`, cuya función tiene acceso definido pero sin invocaciones encontradas en `src`; no se afirma que esté activa. No confundir cantidad de archivos con cantidad de consultas o usuarios.

| Archivo y ancla | Acceso / campos y uso | Tratamiento futuro |
| --- | --- | --- |
| `src/components/HomeTechCatalog.tsx:119` | No-admin; listado completo, imágenes, descripción, costo/precio anterior, factores y planes; helper de borradores | Migrar a proyección; quitar cálculo con costo y alta de catálogo pública |
| `src/components/PublicCatalog.tsx:121` | No-admin; listado completo; filtros `:251–263`, planesActivos y cuotas 8/12; imagen principal; helper borradores | Proyección y resultados habilitados, sin consulta privada de fallback |
| `src/app/solicitar/page.tsx:59` | No-admin; lectura por `id`, imágenes, precio, factores, planes, cuota8/12; copia tasas y precio a solicitud; helper borradores | Mantener enlace por identidad, leer público, adaptar consulta sin tasas internas |
| `src/app/cliente/page.tsx:88,441` | No-admin; ficha por ID para nueva solicitud, cuota8/12, precioContado, TNA/mora | Proyección para referencia vigente; operación histórica desde snapshot autorizado, nunca acceso privado |
| `src/app/afiliado/page.tsx:111` | No-admin; descarga todo para selector; cuota8/12 y monto de solicitud (`:265–285`, `:433–453`); no filtro de publicación en carga | Proyección o DTO de rol expresamente autorizado; nunca documento privado completo |
| `src/app/admin/productos/page.tsx:244,299,319,336,349,495,499,517` | Admin; lectura, alta, edición, flags, baja, unidades y traslado; todos los campos auditados | Conservar identidad y stock; incorporar publicación explícita y validación |
| `src/app/admin/presupuestos/page.tsx:426,801` | Admin; selección de catálogo y alta manual opcional con ID determinístico; costo, código, proveedor, descripción, imagen y plazos (`:430–451`) | Mantener CANONICAL_V1, MANUAL_FACTOR_V1 e idempotencia; alta manual inicialmente privada |
| `src/app/admin/validaciones/page.tsx:469,511,556,588,1022,1801,1925` | Admin; catálogo y reserva/liberación/asignación de stock por producto y unidad | Conservar referencias y handlers; no copiarlos a la nueva UI de catálogo |
| `src/lib/catalogManager.ts:19,35` | Librería cliente llamada por Home, PublicCatalog y Solicitar; busca por nombre y agrega borrador aleatorio, con cuota8/12 calculada por anualidad al 60% | Retirar de clientes después de reemplazar intake; no trasladar ese cálculo al catálogo nuevo |
| `src/lib/stockUtils.ts:20–32` | Helper servidor de detección de serie duplicada; escanea productos.stock y solicitudes; sin callers encontrados | Conservar y revisar antes de retirar; no necesita exposición pública |
| `src/app/api/admin/calcular-pricing/route.ts:42` | Admin SDK, ficha por ID; capital desde campos privados, plazos configurados; motor canónico | Conservar autorización servidor y fail-closed; no aceptar costo/plazos del cliente |
| `src/app/api/admin/reserva-stock/route.ts:56` | Admin SDK, referencia de producto y stock dentro de operación de reserva | Preservar comportamiento y vínculos |
| `src/app/api/admin/liberar-reserva/route.ts:38` | Admin SDK, referencia de producto y stock en liberación | Preservar comportamiento y vínculos |

`catalogManager` no es un sexto portal: es dependencia de tres de los cinco lectores no-admin. Su búsqueda por nombre en memoria y `addDoc` no garantiza idempotencia concurrente. Las reglas actuales niegan su alta a usuarios no-admin y el helper captura el error; no se debe interpretar el intento como escritura productiva exitosa. La consulta debe poder registrarse sin crear fichas privadas desde el navegador público.

La búsqueda de los once términos devuelve **39 archivos TS/TSX**; los otros 26 se clasifican para no omitir consumidores de campos ni contar copy como acceso a colección:

| Archivos adicionales | Alcance encontrado |
| --- | --- |
| `src/lib/financialEngine.ts` | Costo, factores, planes y resultados; dependencia de Home/Solicitar/Admin/manuales; no acceso Firestore |
| `src/lib/manualBudgetProduct.ts` | Matriz legacy, constructor de alta, ID determinístico, snapshots y mapper público por allowlist; códigos/costos/proveedor/factores privados |
| `src/lib/budgetEditorLifecycle.ts` | Estado y ciclo de editor; transporta identidad/código y snapshot; preservar al reabrir |
| `src/lib/pdfGenerator.ts` | Datos comerciales y remito; `codigoProducto` impreso en `:2016–2017`, con fallback artificial a prefijo 779 + DNI. Revisar destinatarios antes de separar SKU/EAN; no modificar documento legal en C0 |
| `src/app/admin/remitos/page.tsx` | Reimpresión usa `item.codigoProducto` (`:141`); conservar remitos históricos; evitar propagar nuevo SKU/EAN a salida cliente |
| `src/app/admin/cartera/page.tsx` | Precio/costo en snapshots de operaciones (`:250,534`); no lector de catálogo |
| `src/app/firmar-contrato/[id]/FirmarContratoClient.tsx` | `solicitud.precioContado` para documentación (`:154`); snapshot contractual, no catálogo vigente |
| `src/app/api/admin/pedido-proveedor/route.ts` | Proveedor, costo y estado de adquisición en solicitud; no acceso directo a productos |
| `src/app/api/admin/preparar-entrega/route.ts` | Flujo de entrega/operación; vocabulario de proveedor; no lector directo de productos |
| `src/app/api/propuesta/aceptar/route.ts` | Aceptación de propuesta y snapshots de operación; no lector directo de productos |
| `src/app/api/propuesta/consultar/route.ts:40` | Allowlist propia de propuesta; no usa automáticamente el mapper de presupuestos ni lee productos; revisar importes y texto por separado |
| `src/app/api/otp/generar/route.ts` | Proveedor de mensajería; coincidencia léxica, no proveedor de ficha |
| `src/components/admin/navigation.ts` | Destino `/admin/productos`; conservar ruta |
| `scripts/testEndToEndPricingFlow.ts`, `scripts/testBudgetAlertRoutingFlow.ts`, `scripts/testManualBudgetProductsFlow.ts` | Fixtures de costo/plazos, routing, matrices legacy, snapshots, sanitización e idempotencia; actualizar sólo por cambio funcional autorizado |
| `scripts/testFirestoreRules3B6A.ts:128–129` | Exige hoy lectura pública de `/productos` HTTP 200; en la fase de privacidad debe pasar a exigir denegación y añadir lectura pública sanitizada, sin debilitar autorización |
| `scripts/testSellerAccountUI3B5C2.ts` | Prohibición de costo en DTO de vendedor afiliado; conservar |
| `scripts/helpers/adminSolicitudesFixtures.ts:53` | Incluye productos en observación de escrituras; preservar cobertura |
| `src/components/InstagramSection.tsx`, `src/components/EnviosFaq.tsx`, `src/components/EnviosCalculator.tsx`, `src/components/FloatingWhatsApp.tsx`, `src/app/envios/page.tsx`, `src/app/nosotros/page.tsx`, `src/app/terms/page.tsx` | Copy de productos/proveedores, sin lectura de colección; términos legales fuera de modificación |

El mapa cubre los once términos: `productos` en accesos y reglas; `codigoProducto` en altas, snapshots y remitos; `costoProducto`, `proveedor` en cálculo y operaciones; `factoresPlanes`, `planesActivos` en catálogo/manuales; `imagenUrl`, `imagenUrls` en fichas, formularios y DTO; `cuota8`, `cuota12`, `precioContado` en listados, portales y snapshots. No hay evidencia de otros lectores de colección en las fuentes buscadas; integraciones externas y estado desplegado requieren inventario operativo antes del cierre de permisos.

## 4. Modelo privado objetivo

Mantener `productos/{referenciaId}` como colección privada de Administración. No renombrar colección ni regenerar IDs. Los nombres siguientes constituyen una propuesta futura de schema, no una migración aplicada.

| Campo / grupo | Tipo y contrato propuesto |
| --- | --- |
| `referenciaId` | Identidad del documento; estable, no SKU ni EAN |
| `skuInterno`, `codigoBarras` | Strings opcionales separados; sólo Admin; conservar ceros iniciales |
| `nombre`, `descripcion` | Texto público revisado; requerido nombre no vacío; no mezclar notas internas |
| `imagenUrls` | Lista ordenada de hasta cuatro URLs aptas para publicar; compatibilidad con imagen primaria legacy |
| `costoProveedor` | Número monetario positivo y finito para publicar; unidad ARS explícita en contrato; transición desde costoProducto sin conversión silenciosa |
| `proveedor`, `proveedorUrl` | Nombre y link internos; nunca salida pública |
| `factoresPlanes` | Mapa de claves 1–18 a números positivos finitos; editable por ficha |
| `planesActivos` | Mapa explícito de claves 1–18 a booleanos; ausencia no habilita automáticamente |
| `publicado` | Booleano explícito, false en altas nuevas; guardar no publica |
| `stock` | Estructura actual de unidades, series, localidades y asignaciones; privada, sin reinterpretar ni borrar |
| `notasInternas`, metadata fiscal, margen y tasas internas | Privados si existen o se incorporan con autorización; no crearlos por inferencia de esta auditoría |
| Revisión / auditoría | Versión privada monotónica y actualización para control de concurrencia; futuros nombres/tipos documentados antes de implementar |

Conservar campos canónicos de capital y plazos ya usados por la API. No derivar capital contractual de `precioContado`, ni reemplazar campos presentes por defaults. Para dos nombres de costo coexistentes, definir fuente autoritativa por versión y detectar discrepancias; no elegir el primero que sea truthy. Validación futura tanto en servidor como UI.

UX propuesta: conservar `/admin/productos`, título “Catálogo de referencias”. Secciones en orden: **Identificación** (SKU interno/EAN/nombre), **Información interna** marcada “Sólo Administración” (costo, proveedor, link, notas y acceso al stock vigente), **Planes** (1–18, habilitación/factor/preview), **Descripción**, **Imágenes**, **Publicación** (guardar privado, preview sanitizado y publicar/despublicar explícitos). Mantener shell, paleta y navegación aprobados; no trasladar lógica de stock, pricing o logística por una reorganización visual. Errores y cambios sin guardar deben ser visibles; controles de al menos 44 px.

## 5. Modelo público objetivo

`catalogo_publico/{referenciaId}`: documento generado en servidor por allowlist, jamás mediante spread del privado. Preferir el mismo ID determinístico que la referencia privada, previa comprobación de que los IDs existentes no codifican SKU/EAN u otra información interna. Si alguno lo hace, conservar su ID privado y definir un alias público opaco, determinístico y con correspondencia privada estable; nunca publicar el código ni regenerar relaciones históricas. En el caso normal, referenciaId coincide con el ID privado; con alias, el servidor resuelve la correspondencia. El identificador público no es una credencial para leer la ficha privada.

| Campo | Contrato público |
| --- | --- |
| `referenciaId` | String estable para navegación y origen de consulta |
| `nombre`, `descripcion` | Contenido exclusivamente publicable |
| `imagenUrls` | Hasta cuatro URLs revisadas; sin rutas o parámetros de proveedor/códigos internos |
| `planesPublicados` | Lista ordenada sólo de planes activos: cantidadCuotas entera 1–18, valorTotalReferencia y cuotaReferencia; importes con unidad inequívoca |
| `publicado` | true para los documentos disponibles públicamente |
| `moneda` | ARS, justificada para evitar ambigüedad de importes |
| `versionPublicacion`, `versionCalculoReferencia` | Metadata pública mínima para trazabilidad de importes y consulta; no versión que revele cambios internos ajenos a publicación |

No incluir SKU/EAN/codigoProducto, costo, proveedor/link, factores, margen, tasas internas, desglose fiscal, stock, notas ni snapshots privados, tampoco dentro de objetos anidados. No reutilizar `PlanCuotaDetalle` íntegro: contiene factor y datos fiscales. La proyección expone resultados orientativos, nunca parámetros internos. Revisar también strings, imágenes y URLs; no prometer imposibilidad de inferencias económicas externas.

Todos los consumidores no-admin leen este contrato o un DTO de rol igualmente acotado. Los importes ya vienen resueltos; el cliente no recibe costo ni factor para recalcular. Mostrar únicamente planes publicados, con selección que identifique el plazo; sin inventar plan destacado si 12 está inactivo. Sin costo válido o sin planes activos, no publicar una ficha con importes ficticios. Carga, vacío, error y referencia retirada deben distinguirse.

## 6. Compatibilidad legacy

Clases: **A conservar** como identidad/dato operativo o snapshot; **B migrar** mediante adaptación explícita; **C compatibilidad temporal** mientras existan consumidores; **D retirar posteriormente** sólo tras demostrar ausencia de dependencias. Un campo puede pasar de C a D en el catálogo vivo y seguir siendo A en historia.

| Campo | Clase y decisión |
| --- | --- |
| ID de productos, productoId, vinculoProductoId, IDs de unidad | A; conservar relaciones de presupuesto, solicitud, reserva, logística y remitos |
| `codigoProducto` | A en snapshots históricos; C en ficha viva, B a skuInterno/codigoBarras mediante clasificación humana; D sólo después de migrar lectores. Nunca exponer como ID público |
| `costoProducto` | A en snapshots; C para motor/API/escritores actuales; B a contrato privado de costoProveedor con unidad y versión. No retirar hasta migrar todos los lectores privados |
| `proveedor` | A privado; ampliar link sólo con tarea de schema; excluir público |
| `factoresPlanes` | A como configuración privada por referencia; B a dominio 1–18 explícito en catálogo; conservar mapas históricos y manuales sin sustituir valores |
| `planesActivos` | A intención de habilitación guardada; B normalización explícita 1–18. C para lectura legacy; no asumir true para claves ausentes |
| `cuota8`, `cuota12` | C en ficha para Home/PublicCatalog/Cliente/Solicitar/Afiliado y alta manual; B a planesPublicados; D del contrato de ficha nuevo tras migración; A en snapshots históricos |
| `precioContado` | C en ficha por portales/manuales, A en operación histórica; B a importes de referencia con semántica explícita; D como fuente pública ambigua. Nunca tomarlo automáticamente como costo |
| `precioAnterior` | C sólo si algún flujo legacy lo necesita; D del cálculo público basado en costo; no fabricar descuentos ni precios tachados |
| `imagenUrl` | C como alias de primera imagen; B a imagenUrls ordenado, conservando fallback sólo de presentación |
| `imagenUrls`, `nombre`, `descripcion` | A con validación pública; B a proyección, sin transportar el documento privado |
| `activo`, `publicado` | C doble flag; B a publicación explícita autoritativa. Resolver contradicciones conservadoramente; ausencia no autoriza publicar en migración |
| TNA/mora, capital/plazos canónicos, fiscalidad | A privados y en snapshots de operaciones; no renombrar ni quitar por esta tarea |
| `stock`, source/pricingMode y snapshots | A íntegros; mantener tipos Firestore e idempotencia de alta manual |

El alta manual en Presupuestos usa `buildDeterministicCatalogProductId` (`manualBudgetProduct.ts:549`) y `setDoc` (`admin/presupuestos/page.tsx:801`); preservar identidad de origen, detección de duplicado y política de reintentos. El constructor manual no fija flags de publicación: debe adaptarse en una fase autorizada para guardar privado, sin publicar por omisión.

## 7. Planes 1–18

Dominio futuro del catálogo: enteros de 1 a 18 inclusive; **24 queda excluido de esta funcionalidad**. Validar claves y números en servidor y UI. Un plazo habilitado requiere factor válido e importe válido. Cambiar el factor no debe activar el plan; cambiar habilitación no debe borrar el factor configurado.

Hoy el editor Admin y `calcularTablaTodosLosPlanes` ofrecen 1–12; el mapa global contiene además 18 y 24; `calcularOperacionFinanciera` admite hasta 24; el motor canónico admite hasta 18. No existe un único máximo homogéneo. El mapa con 24 puede persistirse desde defaults aunque no haya control visible para ese plazo.

No reinterpretar un registro con 24 como 18. Mantenerlo privado/legacy, marcar para revisión y excluirlo de la nueva publicación. No habilitar 13–18 en fichas existentes automáticamente; requieren revisión y guardado explícitos. Para una ficha nueva, la selección de planes será explícita antes de publicar; no heredar accidentalmente el default actual de doce planes activos.

## 8. Factores predeterminados

Defaults solicitados para nuevas referencias o inicialización explícita de campos sin configurar; no sustituyen overrides guardados. Cada referencia mantiene `factoresPlanes[n]` y `planesActivos[n]` individualmente y Admin puede modificar cualquier factor antes de guardar.

| Plazo | Default objetivo | Default global actual |
| --- | --- | --- |
| 1 | 1.10 | 1.10 |
| 2 | 1.27 | 1.25 |
| 3 | 1.45 | 1.40 |
| 4 | 1.62 | 1.55 |
| 5 | 1.79 | 1.70 |
| 6 | 1.96 | 1.85 |
| 7 | 2.14 | 2.00 |
| 8 | 2.31 | 2.12 |
| 9 | 2.48 | 2.22 |
| 10 | 2.65 | 2.32 |
| 11 | 2.83 | 2.42 |
| 12 | 3.00 | 2.50 |
| 13 | 3.17 | Sin clave |
| 14 | 3.35 | Sin clave |
| 15 | 3.52 | Sin clave |
| 16 | 3.69 | Sin clave |
| 17 | 3.86 | Sin clave |
| 18 | 4.04 | 3.25 |

El global actual incluye también 24 = 4.00 (`financialEngine.ts:7–22`). No reemplazar `FACTORES_PREDETERMINADOS` globalmente: lo consumen manuales y cálculos existentes. Proponer configuración acotada al catálogo de referencias, con procedencia y versión, sin introducir un motor contractual alternativo ni cambiar defaults de MANUAL_FACTOR_V1. La implementación de esa configuración requiere tarea posterior explícita.

## 9. Cálculo de referencia

Clasificación: **REFERENCIA COMERCIAL DE CATÁLOGO**. Base conceptual: `valorTotalReferencia = costoProveedor × factorDelPlazo`; `cuotaReferencia = valorTotalReferencia / cantidadCuotas`. No es cotización contractual, deuda, saldo, cuota emitida ni sustituto de CANONICAL_V1.

| Fuente actual | Fórmula, redondeo y conflicto |
| --- | --- |
| `financialEngine.ts:64–99` | Operación general: total redondeado a pesos, resta anticipo y redondea cuota; hasta 24; desglose fiscal con IVA fijo 21% y redondeos independientes |
| `financialEngine.ts:101` | Tabla 1–12: total = round(costo × factor), cuota = round(total / n), sin reconciliar residual; si hay mapa de planes no vacío, clave ausente queda inactiva |
| Admin Productos `:582–592`, `:701–704` | Guarda cuota8/12 con round(costo × factor / n), un solo redondeo; precioContado se genera como round(costo × factor12) al cambiar costo, pero no se actualiza allí al cambiar factor12; puede quedar desfasado |
| Editor de factores Admin `:654` | Interpreta clave ausente como activa, a diferencia del helper con mapa parcial; tabla preview usa doble redondeo |
| `catalogManager.ts:23–39` | Cuota por anualidad con TNA 60% y precioContado de entrada; semántica distinta de multiplicador y canónico |
| Home / PublicCatalog | Home recalcula incluso con fallback ficticio; PublicCatalog muestra cuota12 guardada. Una misma ficha puede mostrar importes distintos o un plazo deshabilitado |
| `manualBudgetProduct.ts:400–448` | MANUAL_FACTOR_V1 conserva total/cuota redondeados y cuotas legacy con redondeo directo; no alterar snapshots ni defaults por el catálogo |
| `canonicalPricingEngine.ts` | CANONICAL_V1: capital en centavos, plazo entero 1–18, TNA por plazo e IVA desde configuración; servicio bruto proporcional a plazo/12; distribución de capital/neto/IVA con residual en última cuota. No acepta factor editable como reemplazo de TNA |

La API `admin/calcular-pricing:42–98` obtiene costo/capital desde Firestore y exige arrays privados de plazos (`plazosHabilitados`, `plazosHabilitadosProducto` o `plazos`); no usa automáticamente planesActivos. Presupuestos sí construye fallback desde planesActivos (`:430–442`). Por eso una ficha editable puede no ser cotizable canónicamente: conservar error de configuración, nunca inventar TNA ni habilitación.

**Decisión propuesta de redondeo para publicación futura:** conservar la convención de la tabla orientativa: total en pesos `Math.round(costo × factor)`, cuota en pesos `Math.round(total / n)`, identificada por versión de cálculo de referencia. No afirmar que `n × cuota` coincide exactamente con total; mostrar importes estimados y total de referencia con esa precisión. Antes de implementar, probar bordes que distinguen redondeo directo/doble y definir copy de esa diferencia. No ajustar la última cuota pública como si fuera cronograma contractual. La propuesta formal conserva el redondeo en centavos y residual canónico vigente.

La proyección debe calcularse en servidor con datos privados válidos, sin costo alternativo inventado, sin admitir NaN/Infinity, cero, negativos ni plazos fuera de dominio. Un plan comercial consultado puede diferir de la propuesta formal: exige propuesta identificada y confirmación del cliente, no sobrescritura de snapshot ni aceptación implícita. No se agregan motores de pricing, cambios fiscales o legales en C0.

## 10. Publicación sanitizada

Flujo propuesto: guardar ficha privada → configurar/habilitar planes → previsualizar DTO público → publicar explícitamente → leer sólo catalogo_publico. Guardar borrador no publica. Validar nombre, costo/factores, al menos un plan y máximo de imágenes antes de publicar.

Preferir un comando servidor autenticado como Admin con transacción Firestore sobre ficha y proyección de identidad determinística, normalmente de igual ID. Leer la revisión privada vigente, validar revisión esperada y reconstruir por allowlist. Escritura pública por reemplazo completo, no merge que conserve claves antiguas sensibles. Ante error, no confirmar publicación parcial. Reintentar con misma identidad y revisión es idempotente: no crea otro documento público.

Cualquier escritor que cambie datos publicados debe participar del mismo protocolo. Esto incluye Admin Productos, alta/edición desde Presupuestos y futuros importadores: para ficha publicada, actualizar proyección con revisión consistente o despublicar de forma atómica hasta revisión explícita. No permitir dual writes independientes desde navegador con riesgo de ficha nueva/proyección vieja. Cambios exclusivamente internos de stock no deben publicar su contenido ni generar metadata pública innecesaria.

Despublicar: transacción fija publicado=false en privado y elimina proyección, sin borrar ficha, unidades, presupuestos ni historia. Si se opta por conservar proyección oculta, Rules debe denegar su lectura y los listados filtrar publicado=true; preferencia inicial: eliminarla para reducir persistencia pública. Borrar una ficha privada referenciada requiere política independiente; no reutilizar la baja destructiva actual para despublicar.

Si una fase elige trabajo asíncrono, necesita outbox/evento persistido, revisión esperada, relectura autoritativa y rechazo de eventos viejos, incluido publicar después de una despublicación más reciente; además reconciliación y estado pendiente visible. Un timestamp y dos escrituras sueltas no bastan. No implementar ambos mecanismos sin necesidad. La transacción síncrona evita esa ventana como primera opción.

Admin SDK omite Rules: el endpoint debe validar identidad/rol y payload; no confiar en importes o campos públicos enviados por el cliente. Restricción de escrituras SDK cliente sobre la proyección y revisión de reglas aditivas descritas en sección 14. Idempotencia de publicación no reemplaza idempotencia de alta manual ni de consulta.

## 11. Imágenes

Implementación actual en `admin/productos/page.tsx`:

- `:109–158`: compresión JPEG a ancho máximo 1200, calidad 0.8; si falla puede devolver archivo original; conversión Data URL disponible.
- `:426–437`: control de hasta cuatro entre existentes y nuevos al seleccionar archivos; `accept=image/*` es indicación del selector, no validación efectiva de contenido/tamaño.
- `:441–473`: URLs externas y uploads a Storage bajo `productos/` con nombre temporal/aleatorio. `Promise.race` de ocho segundos y fallback Data URL del archivo original; el timeout no cancela upload, por lo que puede dejar un objeto huérfano y un Data URL guardado.
- `:477–492`: primera URL como imagenUrl y lista en imagenUrls; logo si no hay ninguna. No hay validación final autoritativa de máximo cuatro ni normalización de URLs en servidor.
- Edición `:361–397` conserva URLs y suma archivos. Un array imagenUrls vacío es truthy y puede omitir imagenUrl legacy al precargar. Quitar imagen del formulario sólo cambia la lista; eliminar ficha (`:517`) sólo borra documento, no objeto Storage.
- UI `:750–823` limita slots pero una URL pendiente no cuenta igual que archivos; combinar URL pendiente y selección puede superar cuatro al guardar. El constructor manual (`manualBudgetProduct.ts:509–513`) tampoco impone máximo cuatro.

Riesgos: tamaño de documento y transferencia por Data URL, decodificación y memoria, archivos sin límite efectivo, URLs remotas y contenido cambiante, huérfanos, reutilización compartida y pérdida por limpieza indiscriminada. URLs públicas o con token siguen accesibles fuera del catálogo aunque se despublique; quitar la ficha no revoca una URL ya compartida. No se auditaron ACL efectivas de Storage ni se probaron uploads; Storage no está emulado según runtime.

Objetivo futuro: validar máximo cuatro en todos los escritores y servidor, orden estable y primera imagen definida; tipos reales, tamaño permitido y compresión con límites acordados; URLs aptas para publicación y nombres opacos sin SKU/EAN/proveedor. Revisión visual y de metadatos. Planificar migración de Data URLs mediante inventario y ejecución aparte, sin perder imágenes existentes. Limpieza sólo con comprobación de referencias/propiedad y política de retención; nunca borrar archivos por quitar una URL sin verificar uso. No se cambia Storage en C0.

## 12. SKU/EAN

Separar `skuInterno` de `codigoBarras`, ambos privados y opcionales. Tratar EAN como string, conservar ceros iniciales y validar formato/checksum sólo cuando se declare efectivamente como EAN. No asumir que todo código numérico sea EAN ni generar uno a partir de DNI.

`codigoProducto` hoy es un campo mixto EAN/SKU; no copiar automáticamente a ambos nuevos campos. Inventario futuro con clasificación confirmada: SKU, EAN o no determinado. Conservar original y trazabilidad de decisión; no sobrescribir ni renumerar IDs de documentos. Resolver unicidad y colisiones en una tarea autorizada; búsqueda por nombre no es identidad.

Compatibilidad interna temporal lee codigoProducto sólo cuando falta clasificación, con aviso de código legacy. Nuevo DTO público omite los tres campos, incluidos alt, URL, WhatsApp, logs de cliente y consulta. Remitos imprimen codigoProducto y un fallback inventado (`pdfGenerator.ts:2016`); revisar alcance/destinatario y separar identidad pública de códigos internos antes de cambiar ese circuito. No modificar PDFs legales congelados ni documentos históricos como efecto del catálogo.

## 13. Consulta del cliente

El CTA debe conservar `catalogReferenceId`, `nombreReferenciaSnapshot` y `planConsultado` opcional (plazo más importes públicos/unidad y versión de publicación, si se elige un plan). Identidad canónica es referenciaId; el nombre es snapshot de contexto, no clave de búsqueda. No enviar SKU/EAN, costo, proveedor o factores.

Resolver la proyección vigente al registrar consulta, verificar publicado y que el plan consultado pertenece a planesPublicados. Datos enviados por cliente son contexto no confiable para una cotización vinculante. Si cambió o se retiró la ficha, informar y pedir continuidad explícita; no crear otra ficha ni elegir otro plazo silenciosamente. Conservar el snapshot de consulta ya recibida aunque luego se despublique.

Las altas actuales de Home/PublicCatalog y Solicitar usan solicitudes_cuenta; algunas intentan también solicitudes y capturan fallos. La futura implementación debe elegir fuente de recepción según flujo vigente y transportar colección+ID exactos en confirmación/alerta, sin crear duplicados para compensar errores. Persistir y confirmar antes de compartir por WhatsApp; timeout requiere consultar resultado/idempotencia, no asumir éxito ni reintentar a ciegas.

Compatibilidad: no quitar productoId/productoNombre/planElegido/montoCuota históricos ni renombrarlos unilateralmente. Diseñar adaptador con versión y coexistencia controlada hacia los tres campos nuevos; registrar origen por ID estable. `firestore.rules:61–92` impone allowlist de create en solicitudes_cuenta y **no incluye los nuevos campos**: desplegar un writer que los envíe antes del cambio autorizado de reglas rompería recepción. Esta arquitectura no autoriza ese cambio ni altas reales. Consultas sin ficha siguen siendo libres, sin fabricar catalogReferenceId.

## 14. Firestore Rules

Estado versionado: productos públicamente legible; escritura Admin. `catalogo_publico` no tiene regla pública específica; la regla general final (`:171–173`) permite Admin. Las reglas son aditivas: una denegación específica no anula un grant público existente ni el grant Admin del catchall.

Objetivo futuro: productos lectura/escritura sólo Admin; catalogo_publico lectura pública sólo si publicado=true y escritura exclusivamente por mecanismo de publicación autenticado/validado. Eliminar el grant público anterior, no añadir simplemente otro match privado. Para impedir escritura directa cliente en la proyección, revisar también el catchall Admin: un `allow write: false` local no lo anula. Diseñar excepción del catchall o reglas exhaustivas sin alterar permisos de otras colecciones; suite de regresión obligatoria.

Una consulta pública debe incluir where(publicado == true) cuando las reglas dependan de ese campo; Rules no filtra resultados. Probar listado y get por ID, publicados/no publicados/inexistentes, anónimo/cliente/vendedor afiliado/Admin, subcolecciones, queries amplias y escrituras directas. Admin SDK requiere autorización en endpoint porque no está restringido por estas reglas.

Antes de cerrar productos migrar **Home, PublicCatalog, Solicitar, Cliente y Vendedor afiliado**, además de retirar dependencia cliente de catalogManager. Mantener Admin y servidor con acceso privado. No existe necesidad de permitir costos al vendedor afiliado para resolver su selector.

No cambiar ahora Rules de productos, allowlists de solicitudes, reglas Storage ni política de roles. La nueva proyección no debe almacenar campos sensibles confiando en ocultarlos mediante reglas a nivel de campo.

## 15. Migración incremental

| Paso | Cambio futuro y condición de salida |
| --- | --- |
| 1. Inventario | Clasificar fichas/flags/códigos/costos/plazos/imágenes y escritores, con dry-run primero en demo; no inferir publicación por ausencia de flags. Inventariar consumidores externos antes de cerrar permisos |
| 2. Contratos | Aprobar schema privado/público, unidad monetaria, redondeo, versión y consulta; mantener IDs y snapshots. Separar configuración de catálogo del motor canónico/manual |
| 3. Productor seguro | Publicador servidor idempotente, preview allowlist y transacción; adaptar todos los escritores. Privados sin datos válidos permanecen ocultos |
| 4. Proyección inicial | Backfill controlado por ID existente, sólo fichas expresamente elegibles; comparación y reconciliación sin borrado privado. Ejecución productiva futura requiere autorización específica |
| 5. Consumidores | Migrar uno por uno los cinco lectores no-admin y helper; pruebas de enlaces antiguos /solicitar?id=..., selector afiliado y solicitudes cliente. Sin fallback a productos si falta proyección |
| 6. Consulta | Adaptador de origen y persistencia confirmada; aprobar cambios necesarios de allowlist/schema antes de activar el writer. Mantener ambas fuentes históricas y sus identidades |
| 7. Cierre de permisos | Tras paridad y ausencia de lecturas privadas no-admin, autorizar y verificar cambio Rules por SHA; nueva suite exige denegación de productos público y publicación sanitizada |
| 8. Retiro | Eliminar lectores/alias/cuotas redundantes sólo tras demostrar cero dependencias; conservar snapshots y datos históricos. Limpieza de imágenes en tarea independiente |

Durante coexistencia, productos sigue siendo públicamente accesible hasta el paso de cierre: migrar UI por sí sola no corrige la exposición. Registrar esa ventana explícitamente y minimizar su duración; no prometer seguridad ya implementada. Después del cierre, rollback de UI debe seguir usando DTO/proyección; no reabrir productos para recuperar un cliente viejo. Preparar una versión compatible con permisos cerrados y conservar privado intacto. La nueva proyección puede reconstruirse sin regenerar identidad ni recalcular operaciones aceptadas.

## 16. Quality gates

**C0 documental:** revisar estructura de 17 secciones, matriz completa de consumidores/campos y consistencia de evidencias; `git diff --check` y comprobación de whitespace del nuevo archivo aún no agregado; `git status --short` debe mostrar sólo este documento. No se ejecutan tsc, ESLint, build, suites ni emuladores por documentación, ni se declaran PASS de implementación.

Gates para tareas futuras, no resultados de esta auditoría:

- Mapper puro: allowlist exacta y anidada; excluir códigos/costos/proveedor/factores/fiscalidad/notas; revisar texto libre y URLs. Publicación no muta el input ni snapshots.
- Planes: 1–18, rechazo de 24/fracciones/NaN/Infinity, overrides por ficha, missing vs false, cero planes, costo inválido y redondeos de borde; defaults no pisan valores guardados.
- Idempotencia y concurrencia: doble publish/retry, edición concurrente, evento fuera de orden, despublicar durante publicación, fallo parcial y reconciliación; mismo ID sin duplicados ni reaparición obsoleta.
- Firestore Emulator: privacidad por rol y subcolección, proyección publicada, prohibición de escritura cliente, allowlists de consulta y compatibilidad de operaciones históricas. Actualizar la expectativa de lectura pública legacy al cerrar, preservando los demás gates.
- Browser demo: inspeccionar respuestas/red para demostrar ausencia de documentos privados y borradores; Home y catálogo, selector afiliado, Cliente, Solicitar, detalle/enlaces antiguos, consultas por ficha exacta, plan deshabilitado/retirado, errores y confirmación antes de WhatsApp. Desktop 1280 y mobile 390, filtros, galería, overflow y controles ≥44 px. Smoke general 12/12 según runtime.
- Regresión pricing: CANONICAL_V1, MANUAL_FACTOR_V1, contratos, snapshots, presupuestos multopción, PDF/WhatsApp sanitizados, alta manual idempotente, stock/reservas/liberación y remitos; no recalcular historia.
- Código: `git diff --check`, `npx tsc --noEmit`, ESLint de archivos tocados, `npm run test:safe`, suites específicas y `npm run build`. No debilitar assertions ni ampliar permisos para pasar tests.

Todos los tests con escrituras usan demo-cuenta-hogar, Auth/Firestore locales y variables explícitas de CODEX_RUNTIME.md; no producción ni credenciales productivas. Storage no está emulado: no realizar uploads reales bajo apariencia de test aislado. Push, despliegue de Rules, deploy y rollout requieren autorización separada; no activar automatic rollouts.

## 17. Plan de implementación

| Fase futura | Entregable acotado | Criterio previo a avanzar |
| --- | --- | --- |
| C1 — Contratos y funciones puras | DTO privado/público, validador, configuración de defaults acotada y cálculo orientativo versionado | Aprobación de schema/redondeo y tests puros; sin cambiar motor contractual |
| C2 — Publicación | Comando autenticado, transacción, revisiones, preview y actualización de escritores privados | Idempotencia/concurrencia y pruebas emulator; sin publicación implícita de manuales |
| C3 — Admin | Formulario por seis secciones, planes 1–18, códigos separados y publicación explícita | Mantener ruta/shell, stock e historia; validación server/UI y regresión presupuestos |
| C4 — Público y roles | Home/PublicCatalog/solicitud/Cliente/Vendedor afiliado con DTO y origen exacto | Paridad de los cinco consumidores, sin consultas a productos ni factores en red |
| C5 — Privacidad y migración | Backfill revisado, consulta compatible y cierre autorizado de Rules | Inventario completo, pruebas negativas/positivas y plan de rollback sin reabrir privado |
| C6 — Consolidación | Retiro de compatibilidad temporal y limpieza de imágenes planificada aparte | Evidencia de cero dependencias; conservar operaciones y documentos históricos |

Cada fase requiere pedido y revisión de diff propios; ninguna está implementada por C0. La auditoría deja identificados los conflictos de motores, reglas, publicación, consultas y códigos que deben resolverse antes de tocar sus respectivos contratos. El único cambio de esta entrega es este archivo documental.
