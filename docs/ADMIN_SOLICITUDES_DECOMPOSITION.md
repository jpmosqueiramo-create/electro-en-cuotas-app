# Cuenta Hogar — Descomposición funcional de Admin Validaciones

Base exacta: `273b293ae3dc114312f7c83b0d75e69f425a3ca3`. Rama: `design/admin-solicitudes-decomposition`. Fecha: 17 de octubre de 2026.
Fuentes rectoras leídas: `AGENTS.md`, `CODEX_RUNTIME.md`, `docs/UX_UI_PANEL_AUDIT.md` y `docs/PANEL_REDESIGN_SPEC.md`. Archivo principal: `src/app/admin/validaciones/page.tsx` (en adelante **V**). Referencias `V:línea` corresponden a esta base. Análisis estático: no se importó/ejecutó la página ni sus helpers, no se abrió el módulo en navegador, no se consultó Firebase ni BCRA.

## 1. Resumen ejecutivo

La separación segura comienza por una bandeja y un detalle **de sólo lectura**, con identidad `(colección, documentId)` conservada hasta el destino. No es seguro reutilizar los loaders actuales como simples consultas: `fetchAperturas` crea réplicas y planes en `solicitudes`; `obtenerVendedores` puede sembrar `vendedores` y escribir localStorage. Abrir Validaciones puede escribir sin una acción de guardado.

Persistencia, presupuestos legacy, generación legal, cobranza y logística deben quedar inicialmente en `/admin/validaciones` y en los módulos especializados existentes. Fase 2B no debe montar esa página dentro del nuevo detalle, copiar sus handlers ni disparar sus efectos de inicialización. La continuidad de negocio se resuelve mediante acceso explícito a gestión avanzada y un adaptador de navegación acotado, no duplicando mutaciones.

### Método y conteos reproducibles

Se recorrió el TSX completo y se contrastó con un inventario AST de TypeScript guardado temporalmente fuera del repositorio. Los números siguientes son **sitios de llamada estáticos**, no cantidades de solicitudes de red ni documentos escritos en producción:

- Líneas: `wc -l` = **4982** saltos de línea; **4983 líneas lógicas** por la última línea sin salto final.
- **74 useState** (71 en AdminValidacionesPage y 3 en BcraScoringPanel local), **2 useEffect**, **0 useMemo**, **0 useRef**, **0 useCallback**.
- **57 funciones nombradas/declaradas**: 2 componentes y 55 funciones auxiliares/handlers. Además, **160 atributos de eventos JSX** inventariados individualmente; callbacks internos se detallan por ubicación.
- **18 llamadas de lectura directas/invocaciones de loader**: 11 getDocs + 3 getDoc + 1 getDownloadURL + 1 fetch BCRA + 2 obtenerVendedores. Las dos últimas son invocaciones al mismo helper, no dos implementaciones de lectura. Hay además lectura Firestore y localStorage dentro de ese helper, y Auth indirecto en el shell/guardas.
- **54 sitios de escritura directos**: 42 updateDoc + 5 addDoc + 6 deleteDoc = **53 Firestore**, más **1 uploadBytes**. Están distribuidos en **26 unidades de persistencia** (24 funciones nombradas y 2 handlers inline). No hay setDoc, writeBatch ni runTransaction en V. El helper obtenerVendedores añade un sitio addDoc en bucle y uno localStorage.setItem; no se suman a los 54 directos.
- **39 unidades con efectos externos directos** en V: las 26 de persistencia más 13 de PDF, apertura de sitios, portapapeles o consulta BCRA. Las 2 useEffect llaman además a loaders con efectos indirectos. Alert/confirm/prompt y setters locales no inflan este conteo; sí se documentan.
- El mapa de §7 tiene **38 pares campo/valor** (37 entradas de texto y 1 booleano verdadero): incluye estados leídos, escritos y el sentinel documental; no equivale a 38 strings únicos ni a enums nuevos.
- **16 acoplamientos** en §8 y **20 unidades de persistencia directa de riesgo ALTO** en §4. El sembrado indirecto de vendedores es un riesgo alto adicional.

### Dependencias auditadas y límite de alcance

`financialEngine.ts`: factores y funciones puras; sólo FACTORES_PREDETERMINADOS se usa en V; calcularOperacionFinanciera/calcularTablaTodosLosPlanes están importadas sin invocación. V contiene cálculos propios legacy. No se modifica ni se legitima ese pricing como motor alternativo.

`vendedoresManager.ts`: obtenerVendedores lee, filtra activos, puede sembrar defaults y devuelve defaults si falla; otras funciones CRUD exportadas no son llamadas desde V. `firebase.ts`: inicialización cliente, Auth/Firestore/Storage y conexión explícita a emuladores sólo en desarrollo E2E; no conecta Storage a emulador. No se leyó ninguna credencial ni `.env`.

`pdfGenerator.ts`: contratos de entrada, transformaciones, consumos de campos y descargas de generarContratoModelo, generarPagareModelo, generarRemitoTipoR, generarPdfPresupuesto, generarComprobantePago y generarEstadoCuenta; son generación local jsPDF con doc.save, sin persistencia Firebase propia. generarRemitoModelo está importada sin invocación desde V. Dependencias transitivas de dibujo: jsPDF y logoBase64 estático; no se reproduce ni modifica contenido legal. Se revisaron también AdminNav/PageHeader, AdminProtectedRoute, AuthProvider, layout/AdminAppShell, reglas versionadas, routing de alertas y rutas consumidoras de autorización/presupuestos para explicar límites de integración. No se considera auditado todo el sistema financiero por esa revisión puntual.

## 2. Estado local

### 2.1 Todos los useState

Tipo explícito cuando existe; de lo contrario tipo inferido de la inicialización. Se incluye el setter para no perder estados menores. `any` conserva la falta de contrato del código actual; no se reemplaza por un schema inventado.

| Ubicación | Nombre / setter | Tipo | Inicial | Responsabilidad | Dominio |
| --- | --- | --- | --- | --- | --- |
| V:72 | [solicitudes, setSolicitudes] | Solicitud[] | [] | Snapshot local de solicitudes, base de análisis/logística/cobros/historial | COMPARTIDO |
| V:73 | [empresaRemitosConfig, setEmpresaRemitosConfig] | any | null | Datos del emisor para PDF de remito | DOCUMENTACION |
| V:74 | [cargando, setCargando] | boolean | true | Bloqueo inicial; sólo fetchSolicitudes lo termina | COMPARTIDO |
| V:76 | [nuevosEstados, setNuevosEstados] | Record<string, string> | {} | Dictamen aún no guardado por ID | SOLICITUDES |
| V:77 | [nuevosMensajes, setNuevosMensajes] | Record<string, string> | {} | Mensaje al usuario aún no guardado por ID | SOLICITUDES |
| V:78 | [guardandoId, setGuardandoId] | string \| null | null | Solicitud en guardado | SOLICITUDES |
| V:79 | [entregaActiva, setEntregaActiva] | string \| null | null | Operación con confirmación de cierre abierta | LOGISTICA |
| V:80 | [nserie, setNserie] | string | "" | Serie de unidad seleccionada/manual | LOGISTICA |
| V:81 | [montoAbonado, setMontoAbonado] | string | "" | Adelanto de entrega; puede regenerar plan y rendición | COMPARTIDO |
| V:82 | [metodoPago, setMetodoPago] | string | "Efectivo" | Medio de adelanto en entrega | COBRANZAS |
| V:83 | [comentarioEntrega, setComentarioEntrega] | string | "" | Nota del cierre | LOGISTICA |
| V:84 | [activeTab, setActiveTab] | "analisis" \| "logistica" \| "cobranzas" \| "historial" \| "aperturas" | "analisis" | Tab analisis/logistica/cobranzas/historial; aperturas está declarado pero sin botón propio | COMPARTIDO |
| V:85 | [expandedId, setExpandedId] | string \| null | null | Clave de grupo expandido (DNI/CUIL/ID), no necesariamente ID documental | COMPARTIDO |
| V:86 | [aperturas, setAperturas] | any[] | [] | Documentos de solicitudes_cuenta; usados también para inferir colección | COMPARTIDO |
| V:87 | [contratoAEditar, setContratoAEditar] | any \| null | null | Editor legal, importes y cronograma; solId/originalSolicitud/isApertura | COMPARTIDO |
| V:90 | [budgetProd, setBudgetProd] | string | "" | Nombre de ítem | PRESUPUESTOS |
| V:91 | [budgetContado, setBudgetContado] | string | "" | Referencia contado editable | PRESUPUESTOS |
| V:92 | [budgetCuotas, setBudgetCuotas] | string | "12" | Plazo como string | PRESUPUESTOS |
| V:93 | [budgetFactor, setBudgetFactor] | string | "2.5" | Factor local | PRESUPUESTOS |
| V:94 | [mostrarTabla12Cuotas, setMostrarTabla12Cuotas] | boolean | false | Visibilidad de tabla de planes | PRESUPUESTOS |
| V:95 | [budgetCuotaValor, setBudgetCuotaValor] | string | "" | Cuota editable | PRESUPUESTOS |
| V:96 | [budgetTna, setBudgetTna] | string | "60" | TNA local; defaults legacy | PRESUPUESTOS |
| V:97 | [budgetMora, setBudgetMora] | string | "0.5" | Mora local; defaults legacy | PRESUPUESTOS |
| V:98 | [budgetNotas, setBudgetNotas] | string | "" | Texto libre para presupuesto/PDF | PRESUPUESTOS |
| V:99 | [budgetProveedor, setBudgetProveedor] | string | "" | Proveedor interno del ítem | PRESUPUESTOS |
| V:100 | [budgetLinkProveedor, setBudgetLinkProveedor] | string | "" | Enlace interno del ítem | PRESUPUESTOS |
| V:101 | [budgetCostoProveedor, setBudgetCostoProveedor] | string | "" | Costo usado en cálculos locales | PRESUPUESTOS |
| V:102 | [draftItems, setDraftItems] | any[] | [] | Ítems del borrador único compartido entre grupos | PRESUPUESTOS |
| V:103 | [editandoPresupuestoId, setEditandoPresupuestoId] | string \| null | null | Presupuesto legacy en edición | PRESUPUESTOS |
| V:104 | [selectedItemsMap, setSelectedItemsMap] | Record<string, number[]> | {} | Índices elegidos por solId_presId; sin colección | PRESUPUESTOS |
| V:105 | [comisionistaEditId, setComisionistaEditId] | string \| null | null | Registro de transporte en edición | LOGISTICA |
| V:106 | [proveedorEditId, setProveedorEditId] | string \| null | null | Pedido a proveedor en edición | LOGISTICA |
| V:107 | [proveedorNombre, setProveedorNombre] | string | "" | Nombre de proveedor | LOGISTICA |
| V:108 | [proveedorGuia, setProveedorGuia] | string | "" | Guía de origen | LOGISTICA |
| V:109 | [proveedorCosto, setProveedorCosto] | string | "" | Costo de pedido como string | LOGISTICA |
| V:110 | [proveedorFechaPedido, setProveedorFechaPedido] | string | "" | Fecha del pedido | LOGISTICA |
| V:111 | [proveedorFechaEstimada, setProveedorFechaEstimada] | string | "" | ETA | LOGISTICA |
| V:112 | [proveedorEstado, setProveedorEstado] | string | "SOLICITADO" | Estado del pedido | LOGISTICA |
| V:113 | [proveedorFacturaTicket, setProveedorFacturaTicket] | string | "" | Factura/ticket duplicado en payload de origen | LOGISTICA |
| V:116 | [remitoEditId, setRemitoEditId] | string \| null | null | Seguimiento de despacho en edición | LOGISTICA |
| V:117 | [remitoTransporte, setRemitoTransporte] | string | "" | Flete del destinatario | LOGISTICA |
| V:118 | [remitoGuiaLocal, setRemitoGuiaLocal] | string | "" | Guía de despacho | LOGISTICA |
| V:119 | [remitoCostoLocal, setRemitoCostoLocal] | string | "" | Costo de despacho | LOGISTICA |
| V:120 | [remitoFechaSalida, setRemitoFechaSalida] | string | "" | Fecha cargada al abrir edición; sin input de cambio identificado | LOGISTICA |
| V:121 | [remitoEstadoEnvio, setRemitoEstadoEnvio] | string | "REMITO_EMITIDO" | Estado del despacho | LOGISTICA |
| V:124 | [remitoNombreMap, setRemitoNombreMap] | Record<string, string> | {} | Nombre editable por ID; usa getters al persistir | LOGISTICA |
| V:125 | [remitoDocMap, setRemitoDocMap] | Record<string, string> | {} | Documento editable por ID | LOGISTICA |
| V:126 | [remitoTelMap, setRemitoTelMap] | Record<string, string> | {} | Teléfono editable por ID | LOGISTICA |
| V:127 | [remitoDireccionMap, setRemitoDireccionMap] | Record<string, string> | {} | Domicilio editable por ID | LOGISTICA |
| V:148 | [comisionistaNombre, setComisionistaNombre] | string | "" | Transportista interno | LOGISTICA |
| V:149 | [comisionistaCosto, setComisionistaCosto] | string | "" | Costo transporte interno | LOGISTICA |
| V:150 | [comisionistaFechaEnvio, setComisionistaFechaEnvio] | string | "" | Fecha salida interna | LOGISTICA |
| V:151 | [selectedDestino, setSelectedDestino] | string | "Lincoln" | Sucursal seleccionada; fallback Lincoln | LOGISTICA |
| V:152 | [remitoDestinatarioNombre, setRemitoDestinatarioNombre] | string | "" | Destinatario usado por PDF, distinto de remitoNombreMap | LOGISTICA |
| V:153 | [remitoDestinatarioDireccion, setRemitoDestinatarioDireccion] | string | "" | Domicilio usado por PDF | LOGISTICA |
| V:154 | [remitoDestinatarioDoc, setRemitoDestinatarioDoc] | string | "" | Documento usado por PDF | LOGISTICA |
| V:155 | [remitoDestinatarioTel, setRemitoDestinatarioTel] | string | "" | Teléfono usado por PDF | LOGISTICA |
| V:156 | [pagoAConfirmar, setPagoAConfirmar] | any \| null | null | Contexto solId/índice/medio/importe/isClientApprove | COBRANZAS |
| V:157 | [pagoMonto, setPagoMonto] | string | "" | Importe a acreditar | COBRANZAS |
| V:158 | [pagoComprobante, setPagoComprobante] | string | "" | Referencia de transacción | COBRANZAS |
| V:159 | [pagoCuentaDestino, setPagoCuentaDestino] | string | "Caja Efectivo" | Cuenta seleccionada | COBRANZAS |
| V:160 | [vendedoresList, setVendedoresList] | Vendedor[] | [] | Activos para sucursales/comisión; loader con sembrado | COMPARTIDO |
| V:161 | [pagoVendedorDestino, setPagoVendedorDestino] | string | "ADMINISTRADOR" | Destino comisión; setter declarado sin uso JSX, queda ADMINISTRADOR | COBRANZAS |
| V:164 | [activeProductSolId, setActiveProductSolId] | Record<string, string> | {} | ID de operación seleccionada por grupo; no contiene colección | COMPARTIDO |
| V:185 | [editingId, setEditingId] | string \| null | null | Registro con datos en edición | SOLICITUDES |
| V:186 | [editFields, setEditFields] | any | objeto de campos de identidad vacío | Nombre/DNI/CUIL/email/teléfono/dirección/localidad editables | SOLICITUDES |
| V:1015 | [productos, setProductos] | any[] | [] | Catálogo y stocks completos en memoria; también inferencia de costos del editor legal | LOGISTICA |
| V:1016 | [selectedProductId, setSelectedProductId] | string | "" | Producto seleccionado | LOGISTICA |
| V:1017 | [selectedProductStock, setSelectedProductStock] | any \| null | null | Objeto de producto/stock seleccionado | LOGISTICA |
| V:1018 | [selectedStockUnitId, setSelectedStockUnitId] | string | "" | Unidad seleccionada o sentinel manual | LOGISTICA |
| V:1831 | [searchTerm, setSearchTerm] | string | "" | Búsqueda local compartida por tabs | SOLICITUDES |
| V:4879 | [data, setData] | any | null | BcraScoringPanel: respuesta remota de deudas | SOLICITUDES |
| V:4880 | [loading, setLoading] | boolean | false | BcraScoringPanel: consulta en curso | SOLICITUDES |
| V:4881 | [error, setError] | string | "" | BcraScoringPanel: error localizado | SOLICITUDES |

### 2.2 Effects y valores derivados

| Nombre | Tipo / dependencias | Responsabilidad | Dominio |
| --- | --- | --- | --- |
| effect V:1851 | useEffect, `[]` | obtenerVendedores, fetchSolicitudes, configuración empresa, fetchAperturas y fetchProductos. No cleanup/cancelación; disparos paralelos no coordinados. Puede escribir por dos loaders indirectos | COMPARTIDO |
| effect V:1861 | useEffect, `[expandedId, solicitudes, productos]` | vuelve a obtener vendedores; busca solicitud por `s.id === expandedId`, empareja producto por nombre y carga selección/destinatario/sucursal. expandedId normalmente es clave DNI/CUIL del grupo: puede no encontrar registro | COMPARTIDO |
| listaSucursales V:162 | expresión, sin memo | únicas localidades de vendedores activos o sucursales estáticas | LOGISTICA |
| combinedRequests V:2036 | array derivado por render | selecciona estados de ambas colecciones, alias de contacto rápido, isApertura y fechaSort | SOLICITUDES |
| filteredCombined V:2081 | filter local | búsqueda distinta por fuente | SOLICITUDES |
| afiliadoesActivos V:2091 | Set derivado | email fijo + afiliadoEmail de solicitudes; no usa vendedoresList como directorio completo | SOLICITUDES |
| cleanCuit V:4883 | string derivado | quitar no dígitos, habilitar consulta sólo con 11 | SOLICITUDES |

No hay memoización ni referencias React. Maps, reductions, callbacks de promesas y handlers de inputs no constituyen hooks. Los IDs de estados locales son insuficientes para dos colecciones: no deben convertirse directamente en claves del nuevo detalle.

### 2.3 Todas las funciones nombradas

Tipo: componentes, helpers síncronos y handlers async según declaración. Se incluye código definido aunque no tenga control visible; no se presenta como flujo activo.

| Ubicación | Nombre | Tipo | Responsabilidad | Dominio |
| --- | --- | --- | --- | --- |
| V:71 | AdminValidacionesPage | Componente | Componente principal: lectura, edición y todos los dominios | COMPARTIDO |
| V:129 | getDestinatarioNombre | función síncrona | Getter de destinatario: map local → campos guardados → identidad del cliente | LOGISTICA |
| V:134 | getDestinatarioDoc | función síncrona | Getter de destinatario: map local → campos guardados → identidad del cliente | LOGISTICA |
| V:139 | getDestinatarioTel | función síncrona | Getter de destinatario: map local → campos guardados → identidad del cliente | LOGISTICA |
| V:144 | getDestinatarioDireccion | función síncrona | Getter de destinatario: map local → campos guardados → identidad del cliente | LOGISTICA |
| V:166 | groupSolicitudes | función síncrona | Agrupa por DNI/CUIL/id; mezcla fuentes y elige una operación por ID | COMPARTIDO |
| V:196 | calcularTnaDesdeCuota | función síncrona | Búsqueda binaria de tasa local; helper invocado por cálculo manual sin control visible | PRESUPUESTOS |
| V:217 | calcularCuotaDesdeTna | función síncrona | Cuota local por tasa; sin persistencia propia | PRESUPUESTOS |
| V:227 | handleRecalcularDesdeCosto | función síncrona | Recalcula cuota/referencia local por costo, plazo y factor | PRESUPUESTOS |
| V:242 | handleCambiarCostoProveedor | función síncrona | Actualiza costo, cuota y referencia local | PRESUPUESTOS |
| V:260 | handleCambiarCuotas | función síncrona | Cambia plazo/factor y cuota local | PRESUPUESTOS |
| V:274 | handleCambiarFactor | función síncrona | Cambia factor y cuota local | PRESUPUESTOS |
| V:286 | handleCambiarCuotaDirecta | función síncrona | Infiera costo/referencia desde cuota editable | PRESUPUESTOS |
| V:301 | handleManualCalcularCuota | función síncrona | Cuota desde tasa; definido pero sin invocación JSX | PRESUPUESTOS |
| V:313 | handleManualCalcularTna | función síncrona | Tasa desde cuota; definido pero sin invocación JSX | PRESUPUESTOS |
| V:325 | startEditing | función síncrona | Carga campos editables según isApertura | SOLICITUDES |
| V:350 | handleEditCuilChange | función síncrona | Normaliza/máscara CUIL en edición | SOLICITUDES |
| V:362 | handleGuardarDatosEditados | async | Persiste identidad por fuente y refresca ambos conjuntos | SOLICITUDES |
| V:414 | handleSubirDocumentoManual | async | Sube comprobante e inserta URL según fuente | DOCUMENTACION |
| V:450 | handleGuardarComisionista | async | Guarda transportista/costo/fecha de solicitud | LOGISTICA |
| V:467 | handleTransferirStockUnidad | async | Cambia ubicación stock + solicitud; definido sin invocación JSX | LOGISTICA |
| V:506 | handleReservarStock | async | Marca unidad Reservado y vincula solicitud | LOGISTICA |
| V:552 | handleLiberarReserva | async | Libera unidad y limpia vínculo | LOGISTICA |
| V:586 | handleConfirmarArriboSucursal | async | Actualiza ubicación y recepción interna | LOGISTICA |
| V:616 | handleProcesarPagoFinal | async | Pago legacy, diferencia a próxima cuota, PDF y aviso de comisión | COBRANZAS |
| V:740 | handleAgregarItemAlBorrador | función síncrona | Valida nombre/cuota y agrega item temporal | PRESUPUESTOS |
| V:766 | handleQuitarItemDelBorrador | función síncrona | Elimina item temporal | PRESUPUESTOS |
| V:770 | handleCargarPresupuestoParaEditar | función síncrona | Carga items y defaults de un presupuesto histórico | PRESUPUESTOS |
| V:787 | handleCancelarEdicionPresupuesto | función síncrona | Limpia borrador/editor y restaura defaults | PRESUPUESTOS |
| V:801 | handleEnviarPresupuesto | async | Reemplaza array presupuestos en apertura y abre WhatsApp | PRESUPUESTOS |
| V:869 | handleDescargarPdfPresupuestoBorrador | función síncrona | PDF sin exigir persistencia del borrador | PRESUPUESTOS |
| V:884 | handleDescargarPdfPresupuestoHistorial | función síncrona | PDF histórico con fallback de producto único | PRESUPUESTOS |
| V:902 | toggleItemSelection | función síncrona | Mantiene al menos un índice seleccionado | PRESUPUESTOS |
| V:918 | isItemSelected | función síncrona | Consulta selección; si falta map considera todos | PRESUPUESTOS |
| V:925 | handleAceptarPresupuesto | async | Acepta opciones y reescribe importes/producto/estado del legajo | PRESUPUESTOS |
| V:993 | handleRechazarPresupuesto | async | Rechaza un presupuesto en solicitudes_cuenta | PRESUPUESTOS |
| V:1020 | fetchProductos | async | Lee todo catálogo para stock e inferencias financieras | LOGISTICA |
| V:1031 | handleOpenEntregaModal | función síncrona | Abre cierre y busca producto por nombre parcial | LOGISTICA |
| V:1063 | handleGuardarEdicionContrato | async | Reescribe datos/importes/plan y replica entre fuentes | COMPARTIDO |
| V:1129 | handleOpenContratoEditor | función síncrona | Construye editor con defaults, inferencia de costo y plan si no existe | COMPARTIDO |
| V:1301 | handleConfirmarYEnviarWhatsApp | async | Crea/actualiza solicitud, plan y pendiente de firma; abre enlace | COMPARTIDO |
| V:1406 | fetchAperturas | async | Lee ambas fuentes y auto-migra aprobadas sin réplica | COMPARTIDO |
| V:1503 | handleActualizarEstadoApertura | async | Actualiza apertura y crea solicitud/plan si aprobada sin réplica | COMPARTIDO |
| V:1591 | handleEliminarApertura | async | Borra apertura; etiqueta puede decir Rechazar y Archivar | SOLICITUDES |
| V:1603 | handleActualizarEstadoDespachoRemito | async | Actualiza despacho y espejos asociados | LOGISTICA |
| V:1647 | handleGuardarDespachoRemito | async | Guarda despacho, espejos y agrega registro remitos | LOGISTICA |
| V:1716 | handleGuardarPedidoProveedor | async | Persiste pedido de origen y espejos | LOGISTICA |
| V:1763 | handleEliminarPedido | async | Borra ambas fuentes/replicas y libera stock con errores parciales tolerados | COMPARTIDO |
| V:1833 | fetchSolicitudes | async | Lectura completa y orden local; libera cargando | SOLICITUDES |
| V:1898 | handleActualizarEstadoProducto | async | Persiste estadoProducto; definido sin invocación JSX | LOGISTICA |
| V:1905 | handleConfirmarEntregaAdmin | async | Entrega/cierre, rendición automática, venta de unidad y regeneración de plan | COMPARTIDO |
| V:1986 | handleAsignarAfiliado | async | Guarda email de vendedor afiliado o null | SOLICITUDES |
| V:1998 | handleEstadoChange | función síncrona | Draft de estado por ID | SOLICITUDES |
| V:2001 | handleMensajeChange | función síncrona | Draft de mensaje por ID | SOLICITUDES |
| V:2005 | guardarCambios | async | Valida motivos y guarda estado/mensaje de solicitud | SOLICITUDES |
| V:4878 | BcraScoringPanel | Componente | Componente local de consulta BCRA; no usa src/components/BcraScoringPanel.tsx | SOLICITUDES |
| V:4885 | handleFetch | async | Consulta API BCRA y maneja fallo/CORS local | SOLICITUDES |

### 2.4 Todos los eventos JSX

Cada fila corresponde a un atributo real del archivo, incluidos setters aparentemente menores. La expresión identifica el handler/campo exacto; el cuerpo completo se localiza en la línea. Las expresiones largas se resumen sólo en esta columna; sus efectos se desarrollan en §4–§5.

| Ubicación | Nombre | Tipo | Responsabilidad / expresión | Dominio |
| --- | --- | --- | --- | --- |
| V:2103 | onClick | evento JSX | {() => setActiveTab('analisis')} | SOLICITUDES |
| V:2106 | onClick | evento JSX | {() => setActiveTab('logistica')} | SOLICITUDES |
| V:2109 | onClick | evento JSX | {() => setActiveTab('cobranzas')} | SOLICITUDES |
| V:2112 | onClick | evento JSX | {() => setActiveTab('historial')} | SOLICITUDES |
| V:2124 | onChange | evento JSX | {(e) => setSearchTerm(e.target.value)} | SOLICITUDES |
| V:2145 | onClick | evento JSX | {() => { setExpandedId(isExpanded ? null : group.key); setDraftItems([]); }} | SOLICITUDES |
| V:2184 | onClick | evento JSX | {(e) => { e.stopPropagation(); setActiveProductSolId(prev => ({ ...prev, [group.key]: item.id })); }} | SOLICITUDES |
| V:2231 | onChange | evento JSX | {e=>setBudgetProd(e.target.value)} | PRESUPUESTOS |
| V:2243 | onChange | evento JSX | {e=>handleCambiarCostoProveedor(e.target.value)} | PRESUPUESTOS |
| V:2254 | onChange | evento JSX | {e=>handleCambiarCuotas(e.target.value)} | PRESUPUESTOS |
| V:2273 | onChange | evento JSX | {e=>handleCambiarFactor(e.target.value)} | PRESUPUESTOS |
| V:2284 | onChange | evento JSX | {e=>handleCambiarCuotaDirecta(e.target.value)} | PRESUPUESTOS |
| V:2297 | onChange | evento JSX | {e=>setBudgetContado(e.target.value)} | PRESUPUESTOS |
| V:2303 | onClick | evento JSX | {() => handleRecalcularDesdeCosto()} | PRESUPUESTOS |
| V:2336 | onChange | evento JSX | {e=>setBudgetProveedor(e.target.value)} | PRESUPUESTOS |
| V:2340 | onChange | evento JSX | {e=>setBudgetLinkProveedor(e.target.value)} | PRESUPUESTOS |
| V:2349 | onClick | evento JSX | {() => setMostrarTabla12Cuotas(!mostrarTabla12Cuotas)} | PRESUPUESTOS |
| V:2368 | onClick | evento JSX | {() => { setBudgetCuotas(String(n)); setBudgetFactor(String(factor)); setBudgetCuotaValor(String(vCuota)); }} | PRESUPUESTOS |
| V:2391 | onClick | evento JSX | {handleAgregarItemAlBorrador} | PRESUPUESTOS |
| V:2413 | onClick | evento JSX | {() => handleQuitarItemDelBorrador(item.id)} | PRESUPUESTOS |
| V:2421 | onChange | evento JSX | {e=>setBudgetNotas(e.target.value)} | PRESUPUESTOS |
| V:2427 | onClick | evento JSX | {() => handleEnviarPresupuesto(req)} | PRESUPUESTOS |
| V:2435 | onClick | evento JSX | {handleCancelarEdicionPresupuesto} | PRESUPUESTOS |
| V:2443 | onClick | evento JSX | {() => handleDescargarPdfPresupuestoBorrador(req)} | PRESUPUESTOS |
| V:2499 | onChange | evento JSX | {() => toggleItemSelection(req.id, p.id, idx, p.items.length)} | PRESUPUESTOS |
| V:2563 | onClick | evento JSX | {() => handleDescargarPdfPresupuestoHistorial(req, p)} | PRESUPUESTOS |
| V:2571 | onClick | evento JSX | {() => handleAceptarPresupuesto(req, p.id)} | PRESUPUESTOS |
| V:2577 | onClick | evento JSX | {() => handleRechazarPresupuesto(req, p.id)} | PRESUPUESTOS |
| V:2583 | onClick | evento JSX | {() => handleCargarPresupuestoParaEditar(req, p)} | PRESUPUESTOS |
| V:2607 | onClick | evento JSX | {() => handleOpenContratoEditor(req)} | SOLICITUDES |
| V:2616 | onClick | evento JSX | {() => handleEliminarApertura(req.id)} | SOLICITUDES |
| V:2633 | onClick | evento JSX | {() => startEditing(req)} | SOLICITUDES |
| V:2645 | onChange | evento JSX | {e => setEditFields({...editFields, nombreCompleto: e.target.value})} | SOLICITUDES |
| V:2650 | onChange | evento JSX | {e => setEditFields({...editFields, numeroDni: e.target.value})} | SOLICITUDES |
| V:2654 | onChange | evento JSX | {e => handleEditCuilChange(e.target.value)} | SOLICITUDES |
| V:2659 | onChange | evento JSX | {e => setEditFields({...editFields, email: e.target.value})} | SOLICITUDES |
| V:2663 | onChange | evento JSX | {e => setEditFields({...editFields, telefono: e.target.value})} | SOLICITUDES |
| V:2667 | onChange | evento JSX | {e => setEditFields({...editFields, direccion: e.target.value})} | SOLICITUDES |
| V:2670 | onClick | evento JSX | {() => handleGuardarDatosEditados(req)} | SOLICITUDES |
| V:2671 | onClick | evento JSX | {() => setEditingId(null)} | SOLICITUDES |
| V:2701 | onClick | evento JSX | writeText / window.open; campos: https | SOLICITUDES |
| V:2715 | onClick | evento JSX | writeText / window.open; campos: https | SOLICITUDES |
| V:2801 | onChange | evento JSX | {async (e) => { if (e.target.files && e.target.files[0]) { await handleSubirDocumentoManual(req, e.target.files[0], "domicilio"); } }} | DOCUMENTACION |
| V:2814 | onChange | evento JSX | {async (e) => { if (e.target.files && e.target.files[0]) { await handleSubirDocumentoManual(req, e.target.files[0], "ingresos"); } }} | DOCUMENTACION |
| V:2831 | onChange | evento JSX | {(e) => handleActualizarEstadoApertura(req.id, e.target.value)} | SOLICITUDES |
| V:2838 | onClick | evento JSX | {() => handleOpenContratoEditor(req)} | SOLICITUDES |
| V:2841 | onClick | evento JSX | {() => handleEliminarApertura(req.id)} | SOLICITUDES |
| V:2861 | onClick | evento JSX | {() => setExpandedId(isExpanded ? null : group.key)} | SOLICITUDES |
| V:2926 | onClick | evento JSX | {(e) => { e.stopPropagation(); setActiveProductSolId(prev => ({ ...prev, [group.key]: item.id })); }} | SOLICITUDES |
| V:2953 | onClick | evento JSX | {() => startEditing(req)} | SOLICITUDES |
| V:2965 | onChange | evento JSX | {e => setEditFields({...editFields, nombreCompleto: e.target.value})} | SOLICITUDES |
| V:2970 | onChange | evento JSX | {e => setEditFields({...editFields, numeroDni: e.target.value})} | SOLICITUDES |
| V:2974 | onChange | evento JSX | {e => handleEditCuilChange(e.target.value)} | SOLICITUDES |
| V:2979 | onChange | evento JSX | {e => setEditFields({...editFields, email: e.target.value})} | SOLICITUDES |
| V:2983 | onChange | evento JSX | {e => setEditFields({...editFields, telefono: e.target.value})} | SOLICITUDES |
| V:2988 | onChange | evento JSX | {e => setEditFields({...editFields, direccion: e.target.value})} | SOLICITUDES |
| V:2992 | onChange | evento JSX | {e => setEditFields({...editFields, localidad: e.target.value})} | SOLICITUDES |
| V:2996 | onClick | evento JSX | {() => handleGuardarDatosEditados(req)} | SOLICITUDES |
| V:2997 | onClick | evento JSX | {() => setEditingId(null)} | SOLICITUDES |
| V:3019 | onClick | evento JSX | writeText / window.open; campos: https | SOLICITUDES |
| V:3033 | onClick | evento JSX | writeText / window.open; campos: https | SOLICITUDES |
| V:3106 | onChange | evento JSX | {async (e) => { if (e.target.files && e.target.files[0]) { await handleSubirDocumentoManual(req, e.target.files[0], "domicilio"); } }} | DOCUMENTACION |
| V:3119 | onChange | evento JSX | {async (e) => { if (e.target.files && e.target.files[0]) { await handleSubirDocumentoManual(req, e.target.files[0], "ingresos"); } }} | DOCUMENTACION |
| V:3136 | onClick | evento JSX | {() => handleAsignarAfiliado(req.id, "")} | SOLICITUDES |
| V:3146 | onClick | evento JSX | handleAsignarAfiliado; campos: afiliado | SOLICITUDES |
| V:3166 | onChange | evento JSX | {(e) => handleEstadoChange(req.id, e.target.value)} | SOLICITUDES |
| V:3184 | onChange | evento JSX | {(e) => handleMensajeChange(req.id, e.target.value)} | SOLICITUDES |
| V:3190 | onClick | evento JSX | {() => guardarCambios(req)} | SOLICITUDES |
| V:3203 | onClick | evento JSX | {() => handleOpenContratoEditor(req)} | SOLICITUDES |
| V:3204 | onClick | evento JSX | {() => handleOpenContratoEditor(req)} | SOLICITUDES |
| V:3254 | onClick | evento JSX | writeText; campos: https | DOCUMENTACION |
| V:3263 | onClick | evento JSX | updateDoc / fetchSolicitudes; campos: estado | DOCUMENTACION |
| V:3310 | onClick | evento JSX | {() => setExpandedId(isExpanded ? null : group.key)} | SOLICITUDES |
| V:3356 | onClick | evento JSX | {(e) => handleEliminarPedido(e, sol)} | SOLICITUDES |
| V:3380 | onClick | evento JSX | {(e) => { e.stopPropagation(); setActiveProductSolId(prev => ({ ...prev, [group.key]: item.id })); }} | SOLICITUDES |
| V:3427 | onClick | evento JSX | {() => handleAsignarAfiliado(sol.id, "")} | SOLICITUDES |
| V:3437 | onClick | evento JSX | handleAsignarAfiliado; campos: afiliado | SOLICITUDES |
| V:3459 | onChange | evento JSX | {(e) => handleEstadoChange(sol.id, e.target.value)} | SOLICITUDES |
| V:3477 | onChange | evento JSX | {(e) => handleMensajeChange(sol.id, e.target.value)} | SOLICITUDES |
| V:3483 | onClick | evento JSX | {() => guardarCambios(sol)} | SOLICITUDES |
| V:3500 | onClick | evento JSX | {(e) => handleEliminarPedido(e, sol)} | LOGISTICA |
| V:3582 | onClick | evento JSX | setRemitoEditId / setRemitoTransporte / setRemitoGuiaLocal / setRemitoCostoLocal / setRemitoFechaSalida / setRemitoEstadoEnvio | LOGISTICA |
| V:3605 | onChange | evento JSX | {e => setRemitoNombreMap(prev => ({ ...prev, [sol.id]: e.target.value }))} | LOGISTICA |
| V:3616 | onChange | evento JSX | {e => setRemitoDocMap(prev => ({ ...prev, [sol.id]: e.target.value }))} | LOGISTICA |
| V:3626 | onChange | evento JSX | {e => setRemitoTelMap(prev => ({ ...prev, [sol.id]: e.target.value }))} | LOGISTICA |
| V:3637 | onChange | evento JSX | {e => setRemitoDireccionMap(prev => ({ ...prev, [sol.id]: e.target.value }))} | LOGISTICA |
| V:3649 | onChange | evento JSX | {e => { setRemitoEditId(sol.id); setRemitoTransporte(e.target.value); }} | LOGISTICA |
| V:3660 | onChange | evento JSX | {e => { setRemitoEditId(sol.id); setRemitoCostoLocal(e.target.value); }} | LOGISTICA |
| V:3670 | onChange | evento JSX | {e => { setRemitoEditId(sol.id); setRemitoGuiaLocal(e.target.value); }} | LOGISTICA |
| V:3680 | onChange | evento JSX | {e => { const val = e.target.value; setRemitoEditId(sol.id); setRemitoEstadoEnvio(val); handleActualizarEstadoDespachoRemito(sol, val); }} | LOGISTICA |
| V:3697 | onClick | evento JSX | {() => { const st = remitoEditId === sol.id ? remitoEstadoEnvio : (sol.remitoDespachoEstado \|\| "REMITO_EMITIDO"); handleActualizarEstadoDespachoRemito(sol, st); }} | LOGISTICA |
| V:3707 | onClick | evento JSX | generarRemitoTipoR / handleGuardarDespachoRemito; campos: u, empresaConfig, facturaProveedorOriginal, codigoProducto, nroRemito, fechaEmision, nroContratoInterno, clienteNombre, clienteDni, clienteDomicilio, clienteTelefono, productoDescripcion, nserie, cantidad | LOGISTICA |
| V:3755 | onClick | evento JSX | setComisionistaNombre / setComisionistaCosto / setComisionistaFechaEnvio / setComisionistaEditId | LOGISTICA |
| V:3767 | onClick | evento JSX | {() => handleConfirmarArriboSucursal(sol.id, sol.vinculoProductoId \|\| selectedProductId, sol.vinculoUnidadId \|\| "", destino)} | LOGISTICA |
| V:3783 | onChange | evento JSX | {e => { setComisionistaEditId(sol.id); setComisionistaNombre(e.target.value); }} | LOGISTICA |
| V:3794 | onChange | evento JSX | {e => { setComisionistaEditId(sol.id); setComisionistaCosto(e.target.value); }} | LOGISTICA |
| V:3804 | onChange | evento JSX | {e => { setComisionistaEditId(sol.id); setComisionistaFechaEnvio(e.target.value); }} | LOGISTICA |
| V:3810 | onClick | evento JSX | {() => handleGuardarComisionista(sol.id)} | LOGISTICA |
| V:3866 | onClick | evento JSX | {() => handleLiberarReserva(sol.id, sol.vinculoProductoId \|\| selectedProductId, sol.vinculoUnidadId \|\| "")} | LOGISTICA |
| V:3883 | onChange | evento JSX | {e => setSelectedDestino(e.target.value)} | LOGISTICA |
| V:3897 | onChange | evento JSX | setSelectedProductId / setSelectedProductStock / setSelectedStockUnitId / setNserie | LOGISTICA |
| V:3920 | onChange | evento JSX | setSelectedStockUnitId / setNserie; campos: u | LOGISTICA |
| V:3956 | onChange | evento JSX | {e=>setNserie(e.target.value)} | LOGISTICA |
| V:3964 | onClick | evento JSX | {() => handleReservarStock(sol.id, selectedProductId, selectedStockUnitId, nserie, selectedDestino)} | LOGISTICA |
| V:4005 | onClick | evento JSX | setProveedorEditId / setProveedorNombre / setProveedorGuia / setProveedorCosto / setProveedorFechaPedido / setProveedorFechaEstimada / setProveedorEstado | LOGISTICA |
| V:4034 | onChange | evento JSX | {e => { setProveedorEditId(sol.id); setProveedorFacturaTicket(e.target.value); }} | LOGISTICA |
| V:4044 | onChange | evento JSX | {e => { setProveedorEditId(sol.id); setProveedorNombre(e.target.value); }} | LOGISTICA |
| V:4056 | onChange | evento JSX | {e => { setProveedorEditId(sol.id); setProveedorCosto(e.target.value); }} | LOGISTICA |
| V:4066 | onChange | evento JSX | {e => { setProveedorEditId(sol.id); setProveedorGuia(e.target.value); }} | LOGISTICA |
| V:4079 | onChange | evento JSX | {e => { setProveedorEditId(sol.id); setProveedorFechaPedido(e.target.value); }} | LOGISTICA |
| V:4088 | onChange | evento JSX | {e => { setProveedorEditId(sol.id); setProveedorFechaEstimada(e.target.value); }} | LOGISTICA |
| V:4098 | onChange | evento JSX | {e => { setProveedorEditId(sol.id); setProveedorEstado(e.target.value); }} | LOGISTICA |
| V:4109 | onClick | evento JSX | {() => handleGuardarPedidoProveedor(sol.id)} | LOGISTICA |
| V:4126 | onChange | evento JSX | {e=>setMontoAbonado(e.target.value)} | LOGISTICA |
| V:4130 | onChange | evento JSX | {e=>setMetodoPago(e.target.value)} | LOGISTICA |
| V:4138 | onChange | evento JSX | {e=>setComentarioEntrega(e.target.value)} | LOGISTICA |
| V:4141 | onClick | evento JSX | {() => setEntregaActiva(null)} | LOGISTICA |
| V:4142 | onClick | evento JSX | {() => handleConfirmarEntregaAdmin(sol.id, "ENTREGADO", false, sol.vinculoProductoId \|\| "", sol.vinculoUnidadId \|\| "")} | LOGISTICA |
| V:4148 | onChange | evento JSX | {e => { const val = e.target.value; if (val === "ENTREGADO") { handleOpenEntregaModal(sol); } else { handleConfirmarEntregaAdmin(sol.id, val, true); } }} | LOGISTICA |
| V:4183 | onClick | evento JSX | {() => handleOpenContratoEditor(sol)} | SOLICITUDES |
| V:4184 | onClick | evento JSX | {() => handleOpenContratoEditor(sol)} | SOLICITUDES |
| V:4239 | onClick | evento JSX | generarEstadoCuenta; campos: nroLegajo, fechaEmision, clienteNombre, clienteDni, productoNombre, totalPlan, totalAbonado, totalPendiente, planPagos | COBRANZAS |
| V:4312 | onClick | evento JSX | generarComprobantePago; campos: nroRecibo, fecha, clienteNombre, clienteDni, productoNombre, cuotaNumero, montoAbonado, metodoPago, nroComprobante, cuentaDestino, esPagoParcial | COBRANZAS |
| V:4342 | onClick | evento JSX | updateDoc / fetchSolicitudes; campos: Ej, planPagos | COBRANZAS |
| V:4352 | onClick | evento JSX | setPagoAConfirmar / setPagoMonto / setPagoComprobante / setPagoCuentaDestino; campos: solId, metodo, originalAmount, isClientApprove | COBRANZAS |
| V:4367 | onClick | evento JSX | setPagoAConfirmar / setPagoMonto / setPagoComprobante / setPagoCuentaDestino; campos: solId, metodo, originalAmount, isClientApprove | COBRANZAS |
| V:4378 | onClick | evento JSX | setPagoAConfirmar / setPagoMonto / setPagoComprobante / setPagoCuentaDestino; campos: solId, metodo, originalAmount, isClientApprove | COBRANZAS |
| V:4419 | onClick | evento JSX | {() => setPagoAConfirmar(null)} | COBRANZAS |
| V:4428 | onChange | evento JSX | {e => setPagoMonto(e.target.value)} | COBRANZAS |
| V:4438 | onChange | evento JSX | {e => setPagoComprobante(e.target.value)} | COBRANZAS |
| V:4447 | onChange | evento JSX | {e => setPagoCuentaDestino(e.target.value)} | COBRANZAS |
| V:4462 | onClick | evento JSX | {() => setPagoAConfirmar(null)} | COBRANZAS |
| V:4468 | onClick | evento JSX | {handleProcesarPagoFinal} | COBRANZAS |
| V:4488 | onClick | evento JSX | {() => setContratoAEditar(null)} | COMPARTIDO |
| V:4500 | onChange | evento JSX | {e => setContratoAEditar({...contratoAEditar, nombreComprador: e.target.value})} | COMPARTIDO |
| V:4504 | onChange | evento JSX | {e => setContratoAEditar({...contratoAEditar, dni: e.target.value})} | COMPARTIDO |
| V:4508 | onChange | evento JSX | {e => setContratoAEditar({...contratoAEditar, domicilio: e.target.value})} | COMPARTIDO |
| V:4512 | onChange | evento JSX | {e => setContratoAEditar({...contratoAEditar, email: e.target.value})} | COMPARTIDO |
| V:4516 | onChange | evento JSX | {e => setContratoAEditar({...contratoAEditar, whatsapp: e.target.value})} | COMPARTIDO |
| V:4520 | onChange | evento JSX | {e => setContratoAEditar({...contratoAEditar, nroContrato: e.target.value})} | COMPARTIDO |
| V:4529 | onChange | evento JSX | {e => setContratoAEditar({...contratoAEditar, producto: e.target.value})} | COMPARTIDO |
| V:4533 | onChange | evento JSX | {e => setContratoAEditar({...contratoAEditar, nserie: e.target.value})} | COMPARTIDO |
| V:4542 | onChange | evento JSX | setContratoAEditar; campos: c, montoOriginal, precioContado, totalFinanciado, importeCuota, cuotasPlan | COMPARTIDO |
| V:4569 | onChange | evento JSX | setContratoAEditar; campos: c, montoOriginal, factorFinanciado, totalFinanciado, importeCuota, cuotasPlan | COMPARTIDO |
| V:4596 | onChange | evento JSX | setContratoAEditar; campos: c, montoOriginal, totalFinanciado, factorFinanciado, importeCuota, cuotasPlan | COMPARTIDO |
| V:4625 | onChange | evento JSX | setMonth / setContratoAEditar; campos: p, 25, numero, vencimiento, montoOriginal, observacion, cuotas, totalFinanciado, importeCuota, factorFinanciado, cuotasPlan | COMPARTIDO |
| V:4693 | onChange | evento JSX | setContratoAEditar; campos: c, montoOriginal, importeCuota, totalFinanciado, factorFinanciado, cuotasPlan | COMPARTIDO |
| V:4722 | onChange | evento JSX | {e => setContratoAEditar({...contratoAEditar, tnaComp: e.target.value})} | COMPARTIDO |
| V:4726 | onChange | evento JSX | {e => setContratoAEditar({...contratoAEditar, tnaPun: e.target.value})} | COMPARTIDO |
| V:4730 | onChange | evento JSX | {e => setContratoAEditar({...contratoAEditar, cftEa: e.target.value})} | COMPARTIDO |
| V:4734 | onChange | evento JSX | {e => setContratoAEditar({...contratoAEditar, lugarFecha: e.target.value})} | COMPARTIDO |
| V:4811 | onChange | evento JSX | {e => { const newPlan = [...contratoAEditar.cuotasPlan]; newPlan[index].vencimiento = e.target.value; setContratoAEditar({...contratoAEditar, cuotasPlan: newPlan}); }} | COMPARTIDO |
| V:4819 | onChange | evento JSX | {e => { const newPlan = [...contratoAEditar.cuotasPlan]; newPlan[index].montoOriginal = Number(e.target.value); setContratoAEditar({...contratoAEditar, cuotasPlan: newPlan}); }} | COMPARTIDO |
| V:4827 | onChange | evento JSX | {e => { const newPlan = [...contratoAEditar.cuotasPlan]; newPlan[index].observacion = e.target.value; setContratoAEditar({...contratoAEditar, cuotasPlan: newPlan}); }} | COMPARTIDO |
| V:4842 | onClick | evento JSX | {handleGuardarEdicionContrato} | COMPARTIDO |
| V:4848 | onClick | evento JSX | {() => handleConfirmarYEnviarWhatsApp(contratoAEditar)} | COMPARTIDO |
| V:4853 | onClick | evento JSX | {() => generarContratoModelo(contratoAEditar)} | COMPARTIDO |
| V:4856 | onClick | evento JSX | {() => generarPagareModelo(contratoAEditar)} | COMPARTIDO |
| V:4859 | onClick | evento JSX | {() => setContratoAEditar(null)} | COMPARTIDO |
| V:4925 | onClick | evento JSX | {handleFetch} | SOLICITUDES |

### 2.5 Todos los callbacks internos restantes

**151 callbacks** anónimos de efectos, promesas, sort/filter/map/find/forEach/reduce y setters funcionales. Excluyen las funciones nombradas y las flechas de eventos JSX directas de §2.3–2.4. “…” acorta la vista del cuerpo, no omite el sitio: la línea y el contenedor permiten inspeccionarlo íntegro. Los dos effects ya explicados figuran también aquí por completitud de callbacks.

| Ubicación | Nombre/contexto | Tipo | Responsabilidad / cuerpo resumido | Dominio |
| --- | --- | --- | --- | --- |
| V:162 | vendedoresList.map en AdminValidacionesPage | callback (v) | v.localidad | SOLICITUDES |
| V:168 | items.forEach en groupSolicitudes | callback (item) | { const dni = (item.datosPersonales?.numeroDni \|\| item.numeroDni \|\| item.dni \|\| "").trim().replace(/\D/g, ""); const … | SOLICITUDES |
| V:359 | setEditFields en handleEditCuilChange | callback (prev: any) | ({ ...prev, cuil: formatted }) | SOLICITUDES |
| V:470 | productos.find en handleTransferirStockUnidad | callback (p) | p.id === prodId | LOGISTICA |
| V:474 | (currentProd.stock \|\| []).map en handleTransferirStockUnidad | callback (u: any) | { if (u.id === unitId) { origen = u.localidad \|\| "Depósito Central"; return { ...u, localidad: nuevaSucursal }; } ret… | LOGISTICA |
| V:512 | productos.find en handleReservarStock | callback (p) | p.id === prodId | LOGISTICA |
| V:519 | (currentProd.stock \|\| []).map en handleReservarStock | callback (u: any) | { if (u.id === unitId) { origen = u.localidad \|\| "Depósito Central"; return { ...u, estado: "Reservado" }; } return u… | LOGISTICA |
| V:557 | productos.find en handleLiberarReserva | callback (p) | p.id === prodId | SOLICITUDES |
| V:559 | (currentProd.stock \|\| []).map en handleLiberarReserva | callback (u: any) | { if (u.id === unitId) { return { ...u, estado: "Disponible" }; } return u; } | SOLICITUDES |
| V:589 | productos.find en handleConfirmarArriboSucursal | callback (p) | p.id === prodId | LOGISTICA |
| V:592 | (currentProd.stock \|\| []).map en handleConfirmarArriboSucursal | callback (u: any) | { if (u.id === unitId) { return { ...u, localidad: destino }; // physically update stock location to destination sucu… | LOGISTICA |
| V:627 | solicitudes.find en handleProcesarPagoFinal | callback (s) | s.id === solId | COBRANZAS |
| V:648 | newPlan.findIndex en handleProcesarPagoFinal | callback (c, i) | i > idx && c.estado === "PENDIENTE" | COBRANZAS |
| V:696 | vendedoresList.find en handleProcesarPagoFinal | callback (v) | v.id === pagoVendedorDestino | COBRANZAS |
| V:767 | draftItems.filter en handleQuitarItemDelBorrador | callback (item) | item.id !== itemId | PRESUPUESTOS |
| V:807 | (sol.presupuestos \|\| []).map en handleEnviarPresupuesto | callback (p: any) | { if (p.id === editandoPresupuestoId) { return { ...p, items: draftItems, tna: Number(budgetTna) \|\| 60, mora: Number(… | PRESUPUESTOS |
| V:843 | draftItems.forEach en handleEnviarPresupuesto | callback (item) | { itemsListText += `\n- *${item.producto}*: ${item.cuotas} cuotas de $${item.valorCuota}`; } | PRESUPUESTOS |
| V:904 | Array.from en toggleItemSelection | callback (_, i) | i | PRESUPUESTOS |
| V:911 | current.filter en toggleItemSelection | callback (i) | i !== itemIdx | PRESUPUESTOS |
| V:913 | [...current, itemIdx].sort en toggleItemSelection | callback (a, b) | a - b | PRESUPUESTOS |
| V:915 | setSelectedItemsMap en toggleItemSelection | callback (prev) | ({ ...prev, [key]: updated }) | PRESUPUESTOS |
| V:926 | (sol.presupuestos \|\| []).find en handleAceptarPresupuesto | callback (p: any) | p.id === presId | PRESUPUESTOS |
| V:931 | rawItems.map en handleAceptarPresupuesto | callback (_: any, i: number) | i | PRESUPUESTOS |
| V:934 | rawItems.filter en handleAceptarPresupuesto | callback (_: any, i: number) | selectedIndices.includes(i) | PRESUPUESTOS |
| V:947 | itemsSeleccionados.reduce en handleAceptarPresupuesto | callback (sum: number, it: any) | sum + (Number(it.valorCuota) \|\| 0) | PRESUPUESTOS |
| V:948 | itemsSeleccionados.map en handleAceptarPresupuesto | callback (it: any) | it.producto | PRESUPUESTOS |
| V:949 | itemsSeleccionados.reduce en handleAceptarPresupuesto | callback (sum: number, it: any) | sum + (Number(it.contado \|\| it.precioContado \|\| it.costoProveedor \|\| 0)) | PRESUPUESTOS |
| V:951 | itemsSeleccionados.reduce en handleAceptarPresupuesto | callback (sum: number, it: any) | sum + ((Number(it.valorCuota) \|\| 0) * (Number(it.cuotas) \|\| numCuotas)) | PRESUPUESTOS |
| V:959 | (sol.presupuestos \|\| []).map en handleAceptarPresupuesto | callback (p: any) | { if (p.id === presId) { return { ...p, estado: "Aceptado", itemsSeleccionados }; } return { ...p, estado: "Rechazado… | PRESUPUESTOS |
| V:966 | aperturas.some en handleAceptarPresupuesto | callback (a) | a.id === sol.id | PRESUPUESTOS |
| V:995 | (sol.presupuestos \|\| []).map en handleRechazarPresupuesto | callback (p: any) | { if (p.id === presId) { return { ...p, estado: "Rechazado" }; } return p; } | PRESUPUESTOS |
| V:1024 | snap.forEach en fetchProductos | callback (d) | results.push({ id: d.id, ...d.data() }) | LOGISTICA |
| V:1040 | productos.find en handleOpenEntregaModal | callback (p: any) | p.nombre.toLowerCase().includes(searchName) \|\| searchName.includes(p.nombre.toLowerCase()) | SOLICITUDES |
| V:1049 | (matched.stock \|\| []).filter en handleOpenEntregaModal | callback (u: any) | u.estado === "Disponible" | SOLICITUDES |
| V:1067 | aperturas.some en handleGuardarEdicionContrato | callback (a) | a.id === solId | COMPARTIDO |
| V:1103 | solSnap.forEach en handleGuardarEdicionContrato | callback (d) | { if (d.data().clienteId === "aperturado_" + solId) { updateDoc(doc(db, "solicitudes", d.id), payload).catch(console.… | COMPARTIDO |
| V:1113 | setSolicitudes en handleGuardarEdicionContrato | callback (prev) | prev.map((s) => (s.id === solId \|\| s.clienteId === "aperturado_" + solId ? { ...s, ...payload } : s)) | COMPARTIDO |
| V:1114 | prev.map en handleGuardarEdicionContrato | callback (s) | (s.id === solId \|\| s.clienteId === "aperturado_" + solId ? { ...s, ...payload } : s) | COMPARTIDO |
| V:1116 | setAperturas en handleGuardarEdicionContrato | callback (prev) | prev.map((a) => (a.id === solId \|\| "aperturado_" + a.id === contratoAEditar.originalSolicitud?.clienteId ? { ...a, ..… | COMPARTIDO |
| V:1117 | prev.map en handleGuardarEdicionContrato | callback (a) | (a.id === solId \|\| "aperturado_" + a.id === contratoAEditar.originalSolicitud?.clienteId ? { ...a, ...payload } : a) | COMPARTIDO |
| V:1140 | (sol.presupuestos \|\| []).find en handleOpenContratoEditor | callback (p: any) | p.estado === "Aceptado" | COMPARTIDO |
| V:1145 | itemsContratoList.map en handleOpenContratoEditor | callback (it: any) | it.producto | COMPARTIDO |
| V:1147 | itemsContratoList.reduce en handleOpenContratoEditor | callback (sum: number, it: any) | sum + (Number(it.valorCuota) \|\| 0) | COMPARTIDO |
| V:1169 | sol.planPagos.filter en handleOpenContratoEditor | callback (c: any) | c.numero > 0 | COMPARTIDO |
| V:1169 | sol.planPagos.filter((c: any) => c.numero > 0).map en handleOpenContratoEditor | callback (c: any) | ({ numero: c.numero, vencimiento: c.vencimiento ? (c.vencimiento.includes("T") ? c.vencimiento.split("T")[0] : c.venc… | COMPARTIDO |
| V:1214 | (productos \|\| []).find en handleOpenContratoEditor | callback (p: any) | { if (!p.nombre) return false; const pName = p.nombre.toLowerCase().trim(); return pName === solProdName \|\| pName.inc… | COMPARTIDO |
| V:1249 | itemsContratoList.map en handleOpenContratoEditor | callback (it: any) | { const c = Number(it.cuotas) \|\| Number(planElegido) \|\| 12; const v = Number(it.valorCuota) \|\| (c > 0 ? Math.round((N… | COMPARTIDO |
| V:1267 | itemsFinalList.reduce en handleOpenContratoEditor | callback (sum, it) | sum + (it.precioContado \|\| 0) | COMPARTIDO |
| V:1268 | itemsFinalList.reduce en handleOpenContratoEditor | callback (sum, it) | sum + (it.totalFinanciado \|\| 0) | COMPARTIDO |
| V:1311 | c.cuotasPlan.map en handleConfirmarYEnviarWhatsApp | callback (cuota: any) | ({ numero: cuota.numero, montoOriginal: Number(cuota.montoOriginal), montoAbonado: 0, estado: "PENDIENTE", vencimient… | SOLICITUDES |
| V:1411 | solSnap.forEach en fetchAperturas | callback (d) | currentSols.push({ id: d.id, ...d.data() }) | COMPARTIDO |
| V:1415 | snap.forEach en fetchAperturas | callback (d) | results.push({ id: d.id, ...d.data() }) | COMPARTIDO |
| V:1416 | results.sort en fetchAperturas | callback (a: any, b: any) | { const timeA = a.fecha?.seconds \|\| a.fechaCreacion?.seconds \|\| 0; const timeB = b.fecha?.seconds \|\| b.fechaCreacion?… | COMPARTIDO |
| V:1427 | currentSols.some en fetchAperturas | callback (s: any) | s.clienteId === "aperturado_" + req.id | COMPARTIDO |
| V:1486 | snap2.forEach en fetchAperturas | callback (d) | results2.push({ id: d.id, ...d.data() } as Solicitud) | COMPARTIDO |
| V:1494 | snap2.forEach en fetchAperturas | callback (d) | results.push({ id: d.id, ...d.data() }) | COMPARTIDO |
| V:1495 | results.sort en fetchAperturas | callback (a, b) | (b.fecha?.seconds \|\| 0) - (a.fecha?.seconds \|\| 0) | COMPARTIDO |
| V:1528 | aperturas.find en handleActualizarEstadoApertura | callback (ap: any) | ap.id === id | COMPARTIDO |
| V:1530 | solicitudes.some en handleActualizarEstadoApertura | callback (s: any) | s.clienteId === "aperturado_" + id | COMPARTIDO |
| V:1606 | aperturas.some en handleActualizarEstadoDespachoRemito | callback (a) | a.id === solId | LOGISTICA |
| V:1621 | solSnap.forEach en handleActualizarEstadoDespachoRemito | callback (d) | { if (d.data().clienteId === "aperturado_" + solId) { updateDoc(doc(db, "solicitudes", d.id), payload).catch(console.… | LOGISTICA |
| V:1631 | setSolicitudes en handleActualizarEstadoDespachoRemito | callback (prev) | prev.map((s) => (s.id === solId \|\| s.clienteId === "aperturado_" + solId ? { ...s, ...payload } : s)) | LOGISTICA |
| V:1632 | prev.map en handleActualizarEstadoDespachoRemito | callback (s) | (s.id === solId \|\| s.clienteId === "aperturado_" + solId ? { ...s, ...payload } : s) | LOGISTICA |
| V:1634 | setAperturas en handleActualizarEstadoDespachoRemito | callback (prev) | prev.map((a) => (a.id === solId \|\| "aperturado_" + a.id === sol.clienteId ? { ...a, ...payload } : a)) | LOGISTICA |
| V:1635 | prev.map en handleActualizarEstadoDespachoRemito | callback (a) | (a.id === solId \|\| "aperturado_" + a.id === sol.clienteId ? { ...a, ...payload } : a) | LOGISTICA |
| V:1650 | aperturas.some en handleGuardarDespachoRemito | callback (a) | a.id === solId | LOGISTICA |
| V:1677 | solSnap.forEach en handleGuardarDespachoRemito | callback (d) | { if (d.data().clienteId === "aperturado_" + solId) { updateDoc(doc(db, "solicitudes", d.id), payloadDespacho).catch(… | LOGISTICA |
| V:1718 | aperturas.some en handleGuardarPedidoProveedor | callback (a) | a.id === solId | LOGISTICA |
| V:1740 | solSnap.forEach en handleGuardarPedidoProveedor | callback (d) | { if (d.data().clienteId === "aperturado_" + solId) { updateDoc(doc(db, "solicitudes", d.id), payload).catch(console.… | LOGISTICA |
| V:1746 | solicitudes.find en handleGuardarPedidoProveedor | callback (s) | s.id === solId | LOGISTICA |
| V:1781 | solSnap.forEach en handleEliminarPedido | callback (d) | { const data = d.data(); if (data.clienteId === "aperturado_" + sol.id \|\| d.id === sol.id) { deleteDoc(doc(db, "solic… | COMPARTIDO |
| V:1795 | deleteDoc(doc(db, "solicitudes_cuenta", sol.id)).catch en handleEliminarPedido | callback () | {} | COMPARTIDO |
| V:1806 | stockActual.map en handleEliminarPedido | callback (u: any) | { if (u.id === sol.vinculoUnidadId) { return { ...u, estado: "Disponible", asignadoA: null, fechaAsignacion: null }; … | COMPARTIDO |
| V:1820 | setSolicitudes en handleEliminarPedido | callback (prev) | prev.filter((s) => s.id !== sol.id && s.clienteId !== "aperturado_" + sol.id) | COMPARTIDO |
| V:1820 | prev.filter en handleEliminarPedido | callback (s) | s.id !== sol.id && s.clienteId !== "aperturado_" + sol.id | COMPARTIDO |
| V:1821 | setAperturas en handleEliminarPedido | callback (prev) | prev.filter((a) => a.id !== sol.id && "aperturado_" + a.id !== sol.clienteId) | COMPARTIDO |
| V:1821 | prev.filter en handleEliminarPedido | callback (a) | a.id !== sol.id && "aperturado_" + a.id !== sol.clienteId | COMPARTIDO |
| V:1837 | snap.forEach en fetchSolicitudes | callback (d) | results.push({ id: d.id, ...d.data() } as Solicitud) | SOLICITUDES |
| V:1838 | results.sort en fetchSolicitudes | callback (a: any, b: any) | { const timeA = a.fechaCreacion?.seconds \|\| a.fechaCreacion?.toMillis?.() \|\| 0; const timeB = b.fechaCreacion?.second… | SOLICITUDES |
| V:1851 | useEffect en AdminValidacionesPage | callback () | { obtenerVendedores().then(setVendedoresList).catch(console.error); fetchSolicitudes(); getDoc(doc(db, "configuracion… | COMPARTIDO |
| V:1854 | getDoc(doc(db, "configuraciones", "empresa_remitos")).then en AdminValidacionesPage | callback (snap) | { if (snap.exists()) setEmpresaRemitosConfig(snap.data()); } | SOLICITUDES |
| V:1861 | useEffect en AdminValidacionesPage | callback () | { obtenerVendedores().then(setVendedoresList).catch(console.error); if (expandedId) { const sol = solicitudes.find(s … | COMPARTIDO |
| V:1864 | solicitudes.find en AdminValidacionesPage | callback (s) | s.id === expandedId | SOLICITUDES |
| V:1867 | productos.find en AdminValidacionesPage | callback (p) | p.nombre.toLowerCase().trim() === (sol.productoDeseado \|\| "").toLowerCase().trim() | SOLICITUDES |
| V:1907 | solicitudes.find en handleConfirmarEntregaAdmin | callback (s: any) | s.id === id | COMPARTIDO |
| V:1929 | (pData.stock \|\| []).map en handleConfirmarEntregaAdmin | callback (u: any) | { if (u.id === selectedUnitId) { return { ...u, estado: "Vendido" }; } return u; } | COMPARTIDO |
| V:1999 | setNuevosEstados en handleEstadoChange | callback (prev) | ({ ...prev, [id]: val }) | SOLICITUDES |
| V:2002 | setNuevosMensajes en handleMensajeChange | callback (prev) | ({ ...prev, [id]: val }) | SOLICITUDES |
| V:2038 | aperturas       .filter en AdminValidacionesPage | callback (ap: any) | { const st = (ap.estado \|\| "Pendiente").toLowerCase(); return st === "pendiente" \|\| st === "aprobado_presupuesto" \|\| … | SOLICITUDES |
| V:2042 | aperturas       .filter((ap: any) => {         const st = (ap.estado \|\| "Pendiente").toLowerCase();         return st === "pendiente" \|\| st === "aprobado_presupuesto" \|\| st === "solicitante" \|\| st === "aperturado";       })       .map en AdminValidacionesPage | callback (ap: any) | { let sortTime = Date.now(); if (ap.fecha?.seconds) sortTime = ap.fecha.seconds * 1000; else if (ap.fechaCreacion?.se… | SOLICITUDES |
| V:2068 | solicitudes       .filter en AdminValidacionesPage | callback (sol: any) | sol.estado === "PENDIENTE" \|\| sol.estado === "REQUIERE_INFO" \|\| sol.estado === "PENDIENTE_FIRMA" | SOLICITUDES |
| V:2069 | solicitudes       .filter((sol: any) => sol.estado === "PENDIENTE" \|\| sol.estado === "REQUIERE_INFO" \|\| sol.estado === "PENDIENTE_FIRMA")       .map en AdminValidacionesPage | callback (sol: any) | { let sortTime = Date.now(); if (sol.fechaCreacion?.seconds) sortTime = sol.fechaCreacion.seconds * 1000; else if (so… | SOLICITUDES |
| V:2078 | combinedRequests.sort en AdminValidacionesPage | callback (a, b) | b.fechaSort - a.fechaSort | SOLICITUDES |
| V:2080 | combinedRequests.filter en AdminValidacionesPage | callback (req: any) | { if (!searchTerm) return true; const term = searchTerm.toLowerCase(); if (req.isApertura) { const searchStr = `${req… | SOLICITUDES |
| V:2092 | solicitudes.map en AdminValidacionesPage | callback (s: any) | s.afiliadoEmail | SOLICITUDES |
| V:2135 | groupSolicitudes(filteredCombined).map en AdminValidacionesPage | callback (group: any) | { const isExpanded = expandedId === group.key; const activeId = activeProductSolId[group.key] \|\| group.items[0].id; c… | SOLICITUDES |
| V:2138 | group.items.find en AdminValidacionesPage | callback (x: any) | x.id === activeId | SOLICITUDES |
| V:2178 | group.items.map en AdminValidacionesPage | callback (item: any) | { const isActive = item.id === req.id; return ( <button key={item.id} type="button" onClick={(e) => { e.stopPropagati… | SOLICITUDES |
| V:2186 | setActiveProductSolId en onClick@2184 | callback (prev) | ({ ...prev, [group.key]: item.id }) | SOLICITUDES |
| V:2257 | Array.from en AdminValidacionesPage | callback (_, i) | i + 1 | PRESUPUESTOS |
| V:2257 | Array.from({ length: 12 }, (_, i) => i + 1).map en AdminValidacionesPage | callback (n) | ( <option key={n} value={n}> {n} {n === 1 ? "Cuota" : "Cuotas"} (Factor {FACTORES_PREDETERMINADOS[n] \|\| 2.5}) </optio… | PRESUPUESTOS |
| V:2359 | Array.from en AdminValidacionesPage | callback (_, i) | i + 1 | PRESUPUESTOS |
| V:2359 | Array.from({ length: 12 }, (_, i) => i + 1).map en AdminValidacionesPage | callback (n) | { const factor = FACTORES_PREDETERMINADOS[n] \|\| 2.5; const vTotal = Math.round(Number(budgetCostoProveedor) * factor)… | PRESUPUESTOS |
| V:2404 | draftItems.map en AdminValidacionesPage | callback (item) | ( <div key={item.id} className="flex justify-between items-center bg-[#F7F3EC] p-2.5 rounded-lg border border-[#DED8C… | PRESUPUESTOS |
| V:2463 | req.presupuestos.map en AdminValidacionesPage | callback (p: any) | ( <div key={p.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#FFFDFC] p-4 r… | PRESUPUESTOS |
| V:2486 | p.items.map en AdminValidacionesPage | callback (item: any, idx: number) | { const checked = isItemSelected(req.id, p.id, idx, p.items.length); return ( <div key={idx} className={`p-2.5 rounde… | PRESUPUESTOS |
| V:2535 | p.items.some en AdminValidacionesPage | callback (it: any) | it.costoProveedor > 0 | PRESUPUESTOS |
| V:2537 | p.items.reduce en AdminValidacionesPage | callback (sum: number, it: any) | sum + (it.costoProveedor \|\| 0) | PRESUPUESTOS |
| V:2605 | (req.presupuestos \|\| []).some en AdminValidacionesPage | callback (p: any) | p.estado === "Aceptado" | SOLICITUDES |
| V:2879 | group.items.map en AdminValidacionesPage | callback (x: any) | x.productoDeseado \|\| x.producto \|\| "Apertura" | SOLICITUDES |
| V:2920 | group.items.map en AdminValidacionesPage | callback (item: any) | { const isActive = item.id === req.id; return ( <button key={item.id} type="button" onClick={(e) => { e.stopPropagati… | SOLICITUDES |
| V:2928 | setActiveProductSolId en onClick@2926 | callback (prev) | ({ ...prev, [group.key]: item.id }) | SOLICITUDES |
| V:3143 | afiliadoesActivos.map en AdminValidacionesPage | callback (v) | <option key={v} value={v}>{v}</option> | SOLICITUDES |
| V:3289 | solicitudes.filter en AdminValidacionesPage | callback (sol) | { const searchStr = `${sol.datosPersonales?.nombreCompleto \|\| ''} ${sol.datosPersonales?.numeroDni \|\| ''} ${sol.clien… | SOLICITUDES |
| V:3295 | sol.planPagos.some en AdminValidacionesPage | callback (p) | p.estado === 'EN_REVISION' \|\| p.estado === 'PENDIENTE' | SOLICITUDES |
| V:3297 | groupSolicitudes(solicitudes.filter(sol => {                 const searchStr = `${sol.datosPersonales?.nombreCompleto \|\| ''} ${sol.datosPersonales?.numeroDni \|\| ''} ${sol.clienteEmail \|\| ''} ${sol.productoDeseado \|\| ''}`.toLowerCase();                 if (searchTerm && !searchStr.includes(searchTerm.toLowerCase())) return false;                                  const estadoUpper = (sol.estado \|\| "").toUpperCase();                 if (activeTab === 'logistica') return estadoUpper === 'APROBADO' && sol.estadoEntrega !== 'ENTREGADO';                 if (activeTab === 'cobranzas') return estadoUpper === 'APROBADO' && sol.estadoEntrega === 'ENTREGADO' && sol.planPagos && sol.planPagos.some(p => p.estado === 'EN_REVISION' \|\| p.estado === 'PENDIENTE');                 return true; // Historial               })).map en AdminValidacionesPage | callback (group: any) | { const isExpanded = expandedId === group.key; const activeId = activeProductSolId[group.key] \|\| group.items[0].id; c… | SOLICITUDES |
| V:3300 | group.items.find en AdminValidacionesPage | callback (x: any) | x.id === activeId | SOLICITUDES |
| V:3325 | group.items.map en AdminValidacionesPage | callback (x: any) | x.productoDeseado \|\| x.producto \|\| "Apertura" | SOLICITUDES |
| V:3374 | group.items.map en AdminValidacionesPage | callback (item: any) | { const isActive = item.id === sol.id; return ( <button key={item.id} type="button" onClick={(e) => { e.stopPropagati… | SOLICITUDES |
| V:3382 | setActiveProductSolId en onClick@3380 | callback (prev) | ({ ...prev, [group.key]: item.id }) | SOLICITUDES |
| V:3434 | afiliadoesActivos.map en AdminValidacionesPage | callback (v) | <option key={v as string} value={v as string}>{v as string}</option> | SOLICITUDES |
| V:3517 | ParenthesizedExpression en AdminValidacionesPage | callback () | { // Find unit in selected product stock or general catalog const unit = selectedProductStock ? (selectedProductStock… | LOGISTICA |
| V:3520 | (selectedProductStock.stock \|\| []).find en AdminValidacionesPage | callback (u: any) | u.id === sol.vinculoUnidadId | LOGISTICA |
| V:3605 | setRemitoNombreMap en onChange@3605 | callback (prev) | ({ ...prev, [sol.id]: e.target.value }) | LOGISTICA |
| V:3616 | setRemitoDocMap en onChange@3616 | callback (prev) | ({ ...prev, [sol.id]: e.target.value }) | LOGISTICA |
| V:3626 | setRemitoTelMap en onChange@3626 | callback (prev) | ({ ...prev, [sol.id]: e.target.value }) | LOGISTICA |
| V:3637 | setRemitoDireccionMap en onChange@3637 | callback (prev) | ({ ...prev, [sol.id]: e.target.value }) | LOGISTICA |
| V:3709 | (selectedProductStock.stock \|\| []).find en onClick@3707 | callback (u: any) | u.id === sol.vinculoUnidadId | LOGISTICA |
| V:3886 | listaSucursales.map en AdminValidacionesPage | callback (suc) | ( <option key={suc} value={suc}>{suc}</option> ) | LOGISTICA |
| V:3900 | productos.find en onChange@3897 | callback (p) | p.id === pId | LOGISTICA |
| V:3908 | productos.map en AdminValidacionesPage | callback (p) | ( <option key={p.id} value={p.id}>{p.nombre}</option> ) | LOGISTICA |
| V:3926 | (selectedProductStock?.stock \|\| []).find en onChange@3920 | callback (u: any) | u.id === unitId | LOGISTICA |
| V:3933 | (selectedProductStock.stock \|\| []).filter en AdminValidacionesPage | callback (u: any) | u.estado === "Disponible" | LOGISTICA |
| V:3933 | (selectedProductStock.stock \|\| []).filter((u: any) => u.estado === "Disponible").map en AdminValidacionesPage | callback (u: any) | ( <option key={u.id} value={u.id}> [{u.localidad}] - {u.nserie ? `IMEI/Serie: ${u.nserie}` : "Sin número registrado"}… | LOGISTICA |
| V:4197 | ParenthesizedExpression en AdminValidacionesPage | callback () | { const plan = sol.planPagos \|\| []; const paidCuotas = plan.filter((c: any) => c.estado === "PAGADO"); const pendingC… | COBRANZAS |
| V:4199 | plan.filter en AdminValidacionesPage | callback (c: any) | c.estado === "PAGADO" | COBRANZAS |
| V:4200 | plan.filter en AdminValidacionesPage | callback (c: any) | c.estado === "PENDIENTE" \|\| c.estado === "EN_REVISION" | COBRANZAS |
| V:4202 | paidCuotas.reduce en AdminValidacionesPage | callback (sum: number, c: any) | sum + (c.montoAbonado \|\| c.montoOriginal \|\| 0) | COBRANZAS |
| V:4203 | plan.reduce en AdminValidacionesPage | callback (sum: number, c: any) | sum + (c.montoOriginal \|\| 0) | COBRANZAS |
| V:4204 | pendingCuotas.reduce en AdminValidacionesPage | callback (sum: number, c: any) | sum + (c.montoOriginal \|\| 0) | COBRANZAS |
| V:4262 | sol.planPagos.map en AdminValidacionesPage | callback (cuota: any, idx: number) | ( <div key={idx} className="bg-[#FFFDFC] border border-green-900/50 p-4 rounded-lg flex flex-col gap-3"> <div classNa… | COBRANZAS |
| V:4551 | (contratoAEditar.cuotasPlan \|\| []).map en onChange@4542 | callback (c: any) | ({ ...c, montoOriginal: newImp }) | COMPARTIDO |
| V:4578 | (contratoAEditar.cuotasPlan \|\| []).map en onChange@4569 | callback (c: any) | ({ ...c, montoOriginal: newImp }) | COMPARTIDO |
| V:4605 | (contratoAEditar.cuotasPlan \|\| []).map en onChange@4596 | callback (c: any) | ({ ...c, montoOriginal: newImp }) | COMPARTIDO |
| V:4631 | (productos \|\| []).find en onChange@4625 | callback (p: any) | { if (!p.nombre) return false; const pName = p.nombre.toLowerCase().trim(); return pName === solProdName \|\| pName.inc… | COMPARTIDO |
| V:4682 | Array.from en AdminValidacionesPage | callback (_, i) | i + 1 | COMPARTIDO |
| V:4682 | Array.from({ length: 12 }, (_, i) => i + 1).map en AdminValidacionesPage | callback (n) | ( <option key={n} value={n}> {n} {n === 1 ? "Cuota" : "Cuotas"} (Factor {FACTORES_PREDETERMINADOS[n] \|\| 2.5}) </optio… | COMPARTIDO |
| V:4703 | (contratoAEditar.cuotasPlan \|\| []).map en onChange@4693 | callback (c: any) | ({ ...c, montoOriginal: numImp }) | COMPARTIDO |
| V:4740 | ParenthesizedExpression en AdminValidacionesPage | callback () | { const cProd = Math.round(parseFloat(contratoAEditar.precioContado?.toString().replace(/[^0-9.-]/g, "") \|\| "0") \|\| 0… | COMPARTIDO |
| V:4806 | contratoAEditar.cuotasPlan.map en AdminValidacionesPage | callback (c: any, index: number) | ( <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#F7F3EC] p-3 rounded-xl border border-[#DED8C… | COMPARTIDO |
| V:4957 | data.periodos[0].entidades.map en BcraScoringPanel | callback (ent: any, idx: number) | { const sit = Number(ent.situacion); let badgeColor = "bg-green-500/20 text-[#2F7D5C] border-green-500/30"; if (sit =… | SOLICITUDES |


## 3. Lecturas

### Catálogo de lecturas directas

“Render inicial” describe la implementación actual, no una necesidad de Solicitudes V1. Las colecciones se leen completas salvo donde se indica; filtros por cliente, estado y réplica se realizan en memoria. No hay onSnapshot, consultas a APIs internas ni lectura localStorage directa en V.

| ID | Ubicación | Función | Fuente | Filtros | Campos consumidos | Dominio | Render inicial | Fallo parcial | UI dependiente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R01 | V:1022 | fetchProductos | productos | Sin where/orderBy | id, nombre, codigoProducto, stock[].id/localidad/estado/nserie; costos y factoresPlanes para editor | LOGISTICA | Sí: inicial; necesidad real sólo stock/editor | Sí: catch conserva []/dato anterior | Select stock, matching y editor legal |
| R02 | V:1102 | handleGuardarEdicionContrato | solicitudes | Completa; clienteId === aperturado_+solId en memoria | id, clienteId | COMPARTIDO | No, tras guardar | Sí: guardado principal puede quedar y espejo fallar | Sincronización de contrato/plan entre documentos |
| R03 | V:1409 | fetchAperturas | solicitudes | Completa; réplica por clienteId en memoria | id, clienteId | COMPARTIDO | Sí | Sí: si falla toma fallback R06; no ejecuta migración pendiente | Evitar réplica duplicada; no garantía transaccional |
| R04 | V:1413 | fetchAperturas | solicitudes_cuenta | Completa; sort fecha.seconds/fechaCreacion.seconds | Todos en memoria: identidad, tipo/necesidad, fechas, estado, presupuestos, docs y valores del plan | COMPARTIDO | Sí | Sí: setAperturas ocurre antes de migrar; fallback relee | Bandeja de aperturas/contacto rápido y editor |
| R05 | V:1484 | fetchAperturas | solicitudes | orderBy fechaCreacion desc; sólo hasMigrated | Todos campos Solicitud y extensiones | COMPARTIDO | Condicional durante inicial | Sí: apertura ya cargada y réplica creada | Actualizar lista tras auto-migración |
| R06 | V:1492 | fetchAperturas catch | solicitudes_cuenta | Completa; orden fecha.seconds | Mismos documentos; no migración en fallback | SOLICITUDES | Condicional al fallo inicial | Sí: segundo fallo sólo console.error | Aperturas parciales; no muestra error persistente |
| R07 | V:1620 | handleActualizarEstadoDespachoRemito | solicitudes | Completa; clienteId comparado en callback | id, clienteId | LOGISTICA | No | Sí: espejo no await individual | Seguimiento reflejado en solicitud asociada |
| R08 | V:1676 | handleGuardarDespachoRemito | solicitudes | Completa; clienteId comparado en callback | id, clienteId | LOGISTICA | No | Sí: despacho principal/espejos/remito independientes | Sincronización de despacho |
| R09 | V:1739 | handleGuardarPedidoProveedor | solicitudes | Completa; clienteId comparado en callback | id, clienteId | LOGISTICA | No | Sí: espejo puede fallar después del principal | Pedido a proveedor reflejado |
| R10 | V:1780 | handleEliminarPedido | solicitudes | Completa; clienteId o d.id en memoria | id, clienteId | COMPARTIDO | No | Sí: borrados previos pueden haberse aplicado | Descubrir réplicas a borrar |
| R11 | V:1802 | handleEliminarPedido | productos/{vinculoProductoId} | getDoc exacto | stock[].id, estado, asignadoA, fechaAsignacion | LOGISTICA | No | Sí: catch interno no revierte borrado | Liberar unidad del pedido eliminado |
| R12 | V:1835 | fetchSolicitudes | solicitudes | Completa; sort fechaCreacion.seconds o toMillis | Todos en memoria: identidad/datosPersonales/documentos, estado/mensaje, afiliado, producto, presupuestos, planPagos, contrato y logística | COMPARTIDO | Sí: sólo este loader libera cargando | Sí: catch + finally; puede mostrar vacío aparente | Tres bandejas posteriores y solicitudes estándar |
| R13 | V:1854 | effect inicial | configuraciones/empresa_remitos | getDoc exacto | Objeto empresa: razón social, fantasía, domicilio, CUIT, IVA, IIBB, inicio, email/teléfono | DOCUMENTACION | Se carga al iniciar; no necesario para bandeja | Sí: null y defaults del PDF | Emisor de remito PDF |
| R14 | V:1926 | handleConfirmarEntregaAdmin | productos/{selectedProdId} | getDoc exacto | stock[].id, estado y resto de unidad conservado | LOGISTICA | No | Sí: unidad puede venderse y fallar solicitud después | Venta de stock en cierre |
| R15 | V:422 | handleSubirDocumentoManual | Storage: storageRef recién subido | getDownloadURL exacto | URL descargable | DOCUMENTACION | No | Sí: upload puede quedar huérfano sin URL/Firestore | Legajo con comprobante nuevo |
| R16 | V:4894 | BcraScoringPanel.handleFetch | https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/{cleanCuit} | CUIT/CUIL de 11 dígitos; petición manual | status/results.denominacion/periodos[0].periodo/entidades[].entidad,situacion,monto; errorMessages | SOLICITUDES | No | Sí: loading/error/data propios; reconoce red/CORS y 503 | Panel scoring en apertura estándar y solicitud de análisis |
| R17 | V:1852 | effect inicial → obtenerVendedores | vendedores; localStorage indirecto | Sin where; filtro activo !== false | id,nombre,email,localidad,porcentajeComision,activo | COMPARTIDO | Sí; innecesario para nueva bandeja | Sí: devuelve defaults al fallar y no ids fiables | listaSucursales y asignación comisión del pago |
| R18 | V:1862 | effect expansión → obtenerVendedores | Mismo helper anterior | Repetida con cambios de expandedId/solicitudes/productos | Mismos campos | COMPARTIDO | También se dispara al montar | Sí, igual a R17 | Refresco de vendedores y selección logística |

### Fuentes indirectas y lecturas de interfaz

- `vendedoresManager.ts:24–51`: getDocs vendedores; si lista vacía lee `localStorage.getItem("vendedores_initial_seeded")`. Sin marca puede escribir la marca **antes** de sembrar. No importarlo en un loader nuevo de sólo lectura. La lectura de la marca puede fallar y terminar devolviendo defaults.
- Auth se lee en AuthProvider vía onAuthStateChanged; AdminProtectedRoute consume user/isAdmin/loading y redirige a login. V no obtiene tokens ni lee Auth directamente. Layout → AdminAppShell añade la misma guarda sin quitar la de V. No sustituir autorización por un parámetro de ruta.
- Catálogo, aperturas, solicitudes, estados de editor, Date/Date.now y Math.random son fuentes locales usadas en cálculos, fechas y referencias; no son una prueba de evento persistido. El orden de fetchSolicitudes mezcla segundos con milisegundos en su fallback. combinedRequests utiliza Date.now si no hay fecha: no copiarlo como fecha real al nuevo detalle.
- `document.getElementById("seller_"+id).value` en V:3147 y V:3438; prompt para email y motivos (V:1506,3149,3440,4343). Son lecturas de controles, no Firestore; conservar el motivo de acción al separar.
- Los anchors de documentos abren las URLs ya guardadas (V:2768–2789,3084–3095,3415–3418,4301–4340), no usan listAll/getBlob ni descargan Storage mediante SDK adicional. Links de proveedor y consultas externas también navegan a terceros; ver §5.
- `logoBase64` es recurso estático de PDF. Los generadores reciben parámetros del estado local/documentos y no vuelven a leer Firebase.
- V **no consume** `useSearchParams`, `location.search`, `tab`, `dni` ni `solicitudId` de la URL. Que budgetAlertRouting construya esos parámetros no demuestra que se aplique el filtro o la expansión.

## 4. Escrituras

### Contratos completos por unidad de persistencia

Cada ficha contiene handler, dominio, objeto, colección/API, campos, precondiciones, postcondiciones, efectos y riesgo. Las llamadas alternativas/espejos se localizan una por una en §4.2. No hay transacciones ni batch; refrescar puede encadenar la auto-migración de fetchAperturas. Las precondiciones son las que implementa el handler/UI, no garantías añadidas por este informe.

#### W01 — handleGuardarDatosEditados V:362

- DOMINIO = SOLICITUDES
- OBJETO = Identidad de req
- COLECCION/API = solicitudes_cuenta/{id} si isApertura; si no solicitudes/{id}
- CAMPOS_MUTADOS = Apertura: nombreCompleto,numeroDni,cuil,email,whatsapp,direccion,localidad; contacto_rapido añade nombre,dni. Solicitud: clienteEmail y datosPersonales.nombreCompleto/numeroDni/cuil/telefono/direccion/localidad
- PRECONDICIONES = Nombre y DNI no vacíos; CUIL vacío o XX-XXXXXXXX-X
- POSTCONDICIONES = Actualización en una fuente; no sincroniza identidad de todas las réplicas
- SIDE_EFFECTS = Cierra editingId y refresca solicitudes/aperturas; refresh puede migrar
RIESGO = MEDIO

#### W02 — handleSubirDocumentoManual V:414

- DOMINIO = DOCUMENTACION
- OBJETO = Archivo y vínculo del legajo
- COLECCION/API = Storage comprobantes/cuenta_solicitudes/{Date.now}_manual_{tipoDoc}_{file.name}; después colección según req.isApertura
- CAMPOS_MUTADOS = Archivo binario; comprobanteDomicilioURL/comprobanteURL en apertura, documentos.servicio/documentos.reciboSueldo en solicitud
- PRECONDICIONES = Confirm nativo; UI entrega File y tipo domicilio/ingresos. accept del input no es validación de contenido en handler
- POSTCONDICIONES = URL vinculada si completa todos los pasos; upload no se revierte al fallar Firestore
- SIDE_EFFECTS = getDownloadURL, alerta y refetch doble; posible archivo huérfano, no hay deleteObject
RIESGO = ALTO

#### W03 — handleGuardarComisionista V:450

- DOMINIO = LOGISTICA
- OBJETO = Transporte de solId
- COLECCION/API = solicitudes/{solId}
- CAMPOS_MUTADOS = comisionistaNombre, comisionistaCosto=Number||0, comisionistaFechaEnvio
- PRECONDICIONES = Sin guardas de campos adicionales en handler
- POSTCONDICIONES = Datos guardados en solicitud
- SIDE_EFFECTS = Cierra editor y refresca solicitudes
RIESGO = MEDIO

#### W04 — handleTransferirStockUnidad V:467

- DOMINIO = LOGISTICA
- OBJETO = Unidad y solicitud
- COLECCION/API = productos/{prodId}; solicitudes/{solId}
- CAMPOS_MUTADOS = stock completo: localidad de unitId; estadoProducto=Traslado entre Puntos de Venta, historialRecepcion
- PRECONDICIONES = Producto existe en array local; no comprueba que unidad haya sido encontrada. No tiene invocación JSX en V
- POSTCONDICIONES = Stock y solicitud actualizados por separado
- SIDE_EFFECTS = Refetch productos/solicitudes + selectedProductStock local; sin rollback
RIESGO = ALTO

#### W05 — handleReservarStock V:506

- DOMINIO = LOGISTICA
- OBJETO = Reserva/unidad/operación
- COLECCION/API = productos/{prodId}; solicitudes/{solId}
- CAMPOS_MUTADOS = stock completo con unidad estado=Reservado si unitId no manual; vinculoProductoId,vinculoUnidadId,numeroSerie,sucursalDestino,estadoProducto=En stock (Afiliado) o En viaje,historialRecepcion
- PRECONDICIONES = prodId y destino presentes; producto en memoria; no exige unidad válida ni disponible en handler
- POSTCONDICIONES = Dos escrituras secuenciales; vínculo creado incluso con unidad manual
- SIDE_EFFECTS = Refetch doble; reserva no transaccional ni idempotencia documentada
RIESGO = ALTO

#### W06 — handleLiberarReserva V:552

- DOMINIO = LOGISTICA
- OBJETO = Reserva de operación
- COLECCION/API = productos/{prodId} condicional; solicitudes/{solId}
- CAMPOS_MUTADOS = stock[].estado=Disponible; vinculoProductoId/vinculoUnidadId/numeroSerie/sucursalDestino=""; estadoProducto=En depósito (Central), historialRecepcion
- PRECONDICIONES = prodId presente; modifica unidad sólo si existe producto y unitId no manual
- POSTCONDICIONES = Reserva despejada en solicitud; no limpia asignadoA/fechaAsignacion en stock aquí
- SIDE_EFFECTS = Refetch doble; puede liberar vínculo aunque no cambie unidad
RIESGO = ALTO

#### W07 — handleConfirmarArriboSucursal V:586

- DOMINIO = LOGISTICA
- OBJETO = Unidad y arribo
- COLECCION/API = productos/{prodId}; solicitudes/{solId}
- CAMPOS_MUTADOS = stock[].localidad=destino; estadoProducto=En stock (Afiliado),comisionistaFechaRecepcion ISO,historialRecepcion
- PRECONDICIONES = Producto en memoria; no valida pertenencia/estado de unidad en handler
- POSTCONDICIONES = Ubicación y marca de recepción en operaciones separadas
- SIDE_EFFECTS = Refetch doble
RIESGO = ALTO

#### W08 — handleProcesarPagoFinal V:616

- DOMINIO = COBRANZAS
- OBJETO = Cuota por solId e índice
- COLECCION/API = solicitudes/{solId}; notificaciones si vendedor no admin y con email
- CAMPOS_MUTADOS = planPagos completo: cuota.estado=PAGADO,montoAbonado,fechaPago,nroComprobante,cuentaDestino,metodoPagoManual si manual; diferencia modifica montoOriginal de próxima PENDIENTE. Notificación: afiliadoEmail,vendedorId,vendedorNombre,mensaje,fecha,leida=false,comisionAsociada,estadoPago=PENDIENTE,cuotaAsociada,clienteNombre
- PRECONDICIONES = pagoAConfirmar; monto numérico >=0 (permite cero); solicitud encontrada; asume índice existente. Comisión condicionada a pagoVendedorDestino, cuyo setter no tiene UI
- POSTCONDICIONES = Guarda plan antes de PDF/notificación. Campos vendedorId/vendedorNombre/porcentajeComision/comisionMonto se agregan después en memoria sin un nuevo updateDoc
- SIDE_EFFECTS = PDF de recibo, diferencia futura, eventual notificación con ID aleatorio, refresh; no ledger ni transacción
RIESGO = ALTO

#### W09 — handleEnviarPresupuesto V:801

- DOMINIO = PRESUPUESTOS
- OBJETO = Array de propuestas de apertura
- COLECCION/API = solicitudes_cuenta/{sol.id}
- CAMPOS_MUTADOS = presupuestos completo: id pres_Date.now,items,tna,mora,notas,fecha ISO,estado=Enviado; edición conserva resto del item
- PRECONDICIONES = draftItems.length>0; no confirma existencia de editandoPresupuestoId dentro del array
- POSTCONDICIONES = Array sustituido; edición restablece Enviado; otras propuestas conservadas según copia local
- SIDE_EFFECTS = WhatsApp tras guardar, alert, limpia borrador y refetch aperturas. No mapper toClientBudgetPayload en este handler
RIESGO = ALTO

#### W10 — handleAceptarPresupuesto V:925

- DOMINIO = COMPARTIDO
- OBJETO = Presupuesto, legajo y estructura financiera
- COLECCION/API = Colección inferida por aperturas.some(a.id===sol.id)
- CAMPOS_MUTADOS = presupuestos: elegido Aceptado + itemsSeleccionados, resto Rechazado; itemsContrato,productoDeseado,precioContado,costoProducto,costoBien,montoCuota,totalFinanciado,planElegido,estado=Aprobado_Presupuesto
- PRECONDICIONES = Presupuesto existe; >=1 item seleccionado/fallback producto único; confirm. No valida compatibilidad de cuotas entre ítems; toma plazo del primero
- POSTCONDICIONES = Una actualización reescribe presupuesto y valores del legajo; no crea planPagos aquí
- SIDE_EFFECTS = Suma importes locales, defaults y costos como fallback; refetch doble; identidad por ID desnudo
RIESGO = ALTO

#### W11 — handleRechazarPresupuesto V:993

- DOMINIO = PRESUPUESTOS
- OBJETO = Presupuesto en apertura
- COLECCION/API = solicitudes_cuenta/{sol.id}
- CAMPOS_MUTADOS = presupuestos completo, item target.estado=Rechazado
- PRECONDICIONES = Confirm nativo; no cambia si ID presupuesto no aparece
- POSTCONDICIONES = Array actualizado; solicitud principal no cambia de estado por este código
- SIDE_EFFECTS = Alerta y fetchAperturas; no escribe motivo
RIESGO = MEDIO

#### W12 — handleGuardarEdicionContrato V:1063

- DOMINIO = COMPARTIDO
- OBJETO = Datos legales y plan; posibles réplicas
- COLECCION/API = Colección inferida por ID; espejo en solicitudes o solicitudes_cuenta
- CAMPOS_MUTADOS = nroContrato,nombreCompleto,numeroDni,direccion,localidad,codigoPostal,email,whatsapp,productoDeseado,itemsContrato,numeroSerie,precioContado,costoProducto,costoBien,totalFinanciado,planElegido,montoCuota,tasaInteresTna,tasaMora,lugarFechaFirma,planPagos=c.cuotasPlan
- PRECONDICIONES = contratoAEditar presente; parseos y defaults, sin validación de coherencia de plan o protección de pagos ya guardados
- POSTCONDICIONES = Payload escribe campos planos incluso en solicitud con datosPersonales; espejos no await individual
- SIDE_EFFECTS = Actualiza arrays locales y refresca; reemplazo completo de plan puede perder atributos de pago
RIESGO = ALTO

#### W13 — handleConfirmarYEnviarWhatsApp V:1301

- DOMINIO = COMPARTIDO
- OBJETO = Solicitud de autorización y plan
- COLECCION/API = Si c.isApertura: addDoc solicitudes y update apertura; si no update solicitud
- CAMPOS_MUTADOS = Nueva: clienteId=aperturado_+solId,clienteEmail,datosPersonales(nombre,DNI,teléfono,dirección,localidad vacía),documentos(DNI frente/dorso; recibo/servicio vacíos),productoDeseado,costoProducto,precioContado,factorFinanciado,montoCuota,planElegido,tasaInteresTna,tasaMora,estado=PENDIENTE_FIRMA,estadoEntrega=PENDIENTE_ENTREGA,fechaCreacion,cargadoPorAfiliado=false,afiliadoEmail,planPagos. Apertura: estado=Aprobado. Rama existente: estado/costos/factor/cuota/plazo/tasas,datosPersonales fusionado,planPagos
- PRECONDICIONES = NroContrato,nombreComprador,dni,whatsapp presentes; requiere cuotasPlan convertible a fechas. handleOpenContratoEditor inicializa isApertura:true incondicionalmente
- POSTCONDICIONES = Puede crear documento con ID nuevo incluso al abrir editor de solicitud estándar; mapea cuotas con estado PENDIENTE y borra metadata de pago en rama de reemplazo
- SIDE_EFFECTS = URL productiva hardcodeada /firmar-contrato/{targetId}, WhatsApp, cierre editor y refetch; no guarda explícitamente todos los datos legales del editor en esta acción ni verifica contratoFirmado
RIESGO = ALTO

#### W14 — fetchAperturas V:1406

- DOMINIO = COMPARTIDO
- OBJETO = Auto-migración de apertura aprobada sin réplica
- COLECCION/API = addDoc solicitudes en bucle
- CAMPOS_MUTADOS = clienteId,clienteEmail,datosPersonales(nombre,DNI,teléfono,dirección,localidad,cuil),documentos desde URLs de apertura,productoDeseado,montoCuota,planElegido,tasaInteresTna,tasaMora,estado=APROBADO,estadoEntrega=PENDIENTE_ENTREGA,fechaCreacion,cargadoPorAfiliado=false,afiliadoEmail,planPagos nuevo
- PRECONDICIONES = req.estado exactamente Aprobado y ningún currentSols.clienteId coincidente leído al inicio
- POSTCONDICIONES = Crea réplica aprobada con cuotas PENDIENTE y fechas desde hoy; no autorización nueva; sin bloqueo concurrente ni ID determinístico
- SIDE_EFFECTS = Lecturas y UI pueden preceder al fallo; si migró relee solicitudes; catch vuelve a leer aperturas; al montarse o refrescar puede escribir
RIESGO = ALTO

#### W15 — handleActualizarEstadoApertura V:1503

- DOMINIO = COMPARTIDO
- OBJETO = Decisión de apertura y creación derivada
- COLECCION/API = update solicitudes_cuenta/{id}; addDoc solicitudes condicional
- CAMPOS_MUTADOS = Apertura: estado=nuevoEstado y motivoRechazo sólo Rechazado. Nueva solicitud: mismos campos de réplica de fetchAperturas, estado APROBADO/entrega PENDIENTE_ENTREGA/plan cuotas PENDIENTE
- PRECONDICIONES = Si Rechazado exige prompt no cancelado y texto no vacío. Si Aprobado busca apertura en memoria y réplica ausente en solicitudes local
- POSTCONDICIONES = Apertura puede quedar Aprobado sin réplica si falla creación; nuevo plan/fechas no usa snapshot completo
- SIDE_EFFECTS = Refetch solicitudes y aperturas; auto-migración puede reintentar; sin atomicidad
RIESGO = ALTO

#### W16 — handleEliminarApertura V:1591

- DOMINIO = SOLICITUDES
- OBJETO = Apertura
- COLECCION/API = delete solicitudes_cuenta/{id}
- CAMPOS_MUTADOS = Documento completo eliminado
- PRECONDICIONES = Confirm nativo
- POSTCONDICIONES = No borra sus réplicas ni libera stock
- SIDE_EFFECTS = Alert y fetchAperturas; UI de contacto rápido lo llama Rechazar y Archivar aunque elimina
RIESGO = ALTO

#### W17 — handleActualizarEstadoDespachoRemito V:1603

- DOMINIO = LOGISTICA
- OBJETO = Seguimiento de destinatario y espejos
- COLECCION/API = Colección por aperturas.some ID; espejo por clienteId aperturado_
- CAMPOS_MUTADOS = remitoDespachoEstado,remitoDespachoTransporte,remitoDespachoGuia,remitoDespachoCosto,remitoDespachoFecha
- PRECONDICIONES = sol recibido; valores de editor sólo si remitoEditId coincide; fecha por defecto hoy
- POSTCONDICIONES = Principal actualizado; espejos best effort. En onChange se setea estado local y se invoca inmediatamente: closure puede usar datos anteriores
- SIDE_EFFECTS = Setters optimistas + refetch doble; no cambia estadoEntrega ni remitos existentes
RIESGO = ALTO

#### W18 — handleGuardarDespachoRemito V:1647

- DOMINIO = LOGISTICA
- OBJETO = Despacho y registro remito
- COLECCION/API = Colección por ID; espejos; addDoc remitos
- CAMPOS_MUTADOS = Principal/espejos: remitoDespachoNro,Destinatario,Doc,Direccion,Tel,Transporte,Guia,Costo,Fecha,Estado. Remitos: nroRemito,fechaEmision,fechaCreacion,tipoRemito=REMITO_TIPO_R,nroContratoInterno,clienteNombre/Dni/Domicilio/Telefono,transporteLocal,costoLocal,guiaLocal,estadoEnvio,productoDescripcion,nserie,cantidad
- PRECONDICIONES = sol; nro existente o 7777-prefijoID; getters toman maps locales; sin check de remito previo
- POSTCONDICIONES = Un nuevo remito con ID aleatorio por cada ejecución aunque se reutilice número. No actualiza registro previo al cambiar seguimiento
- SIDE_EFFECTS = Cierra editor, refetch; UI genera PDF antes de esta persistencia usando otros campos de destinatario
RIESGO = ALTO

#### W19 — handleGuardarPedidoProveedor V:1716

- DOMINIO = LOGISTICA
- OBJETO = Pedido origen y espejos
- COLECCION/API = Colección por aperturas.some ID + réplicas
- CAMPOS_MUTADOS = proveedorNombre,proveedorGuia,proveedorCosto,proveedorFechaPedido,proveedorFechaEstimada,proveedorEstado,proveedorFacturaTicket,facturaProveedorOriginal; proveedorFechaRecepcion si RECIBIDO
- PRECONDICIONES = solId; parsea strings/defaults; no requiere costo/proveedor no vacíos
- POSTCONDICIONES = Pedido persistido; no crea stock automáticamente por RECIBIDO
- SIDE_EFFECTS = Espejos sin await, refetch doble y cierre. Formulario Editar no precarga proveedorFacturaTicket en su callback
RIESGO = ALTO

#### W20 — handleEliminarPedido V:1763

- DOMINIO = COMPARTIDO
- OBJETO = Solicitud/apertura, réplicas y reserva
- COLECCION/API = delete ambas colecciones según flags/vínculo; productos getDoc/update
- CAMPOS_MUTADOS = Elimina documentos completos; stock[].estado=Disponible,asignadoA=null,fechaAsignacion=null para unidad vinculada
- PRECONDICIONES = stopPropagation y confirm; fuente de origen isApertura o clienteId. Puede borrar solicitudes_cuenta/{sol.id} aunque solicitud no proviniera de apertura
- POSTCONDICIONES = Varios deletes con catches locales; borrados disparados en forEach no await; stock liberado best effort; UI optimista no prueba éxito total
- SIDE_EFFECTS = Refetch doble y alerta de éxito; IDs iguales entre colecciones pueden borrar objeto ajeno; no borra remitos/notificaciones ni hace transacción
RIESGO = ALTO

#### W21 — handleActualizarEstadoProducto V:1898

- DOMINIO = LOGISTICA
- OBJETO = Estado producto de solicitud
- COLECCION/API = solicitudes/{id}
- CAMPOS_MUTADOS = estadoProducto=nuevoEstado
- PRECONDICIONES = No enum validado en handler; definido sin invocación JSX en V
- POSTCONDICIONES = Sólo cambia campo
- SIDE_EFFECTS = Refetch solicitudes; error sólo consola
RIESGO = MEDIO

#### W22 — handleConfirmarEntregaAdmin V:1905

- DOMINIO = COMPARTIDO
- OBJETO = Entrega, unidad, adelanto, rendición y plan
- COLECCION/API = productos/{selectedProdId} condicional; solicitudes/{id}
- CAMPOS_MUTADOS = Siempre estadoEntrega. ENTREGADO && !esDirecto: numeroSerie desde solObj; montoAbonado,metodoPago,comentarioEntrega opcional,fechaEntrega. Si monto>0: estadoRendicion=CONFIRMADO,fechaRendicionReal,historialRendicion. Stock[].estado=Vendido. Si planElegido: reemplaza planPagos; cuota1 PAGADO si hay adelanto y resto PENDIENTE
- PRECONDICIONES = UI currentEstado=APROBADO; handler no verifica autorización contractual ni estado vigente. Cierre exige monto truthy y numérico; no rechaza negativo explícitamente. Stock requiere IDs y unidad !=manual
- POSTCONDICIONES = Puede sustituir plan anterior y marcar primera cuota pagada; rama esDirecto sólo cambia estadoEntrega
- SIDE_EFFECTS = Unidad escrita antes de solicitud; sin transacción/ledger; cierre local y refetch
RIESGO = ALTO

#### W23 — handleAsignarAfiliado V:1986

- DOMINIO = SOLICITUDES
- OBJETO = Asignación de solicitud
- COLECCION/API = solicitudes/{id}
- CAMPOS_MUTADOS = afiliadoEmail=email lowercase/trim o null
- PRECONDICIONES = Email vacío o contiene @; no valida contra directorio
- POSTCONDICIONES = Asigna/desasigna; no actualiza apertura ni notificaciones
- SIDE_EFFECTS = Alert y refetch solicitudes
RIESGO = MEDIO

#### W24 — guardarCambios V:2005

- DOMINIO = SOLICITUDES
- OBJETO = Dictamen de solicitud
- COLECCION/API = solicitudes/{sol.id}
- CAMPOS_MUTADOS = estado=nuevosEstados[id]||sol.estado; mensajeAdmin=draft o existente
- PRECONDICIONES = REQUIERE_INFO y RECHAZADO exigen motivo no vacío; UI bloquea si sin cambios
- POSTCONDICIONES = Guarda sólo esos dos campos; aprobar no crea plan aquí ni confirma autorización
- SIDE_EFFECTS = guardandoId, alert y refetch solicitudes; selección local APROBADO puede mostrar logística antes de guardarse
RIESGO = MEDIO

#### W25 — onClick V:3263

- DOMINIO = DOCUMENTACION
- OBJETO = Paso manual a logística
- COLECCION/API = solicitudes/{req.id}
- CAMPOS_MUTADOS = estado=APROBADO
- PRECONDICIONES = UI muestra en PENDIENTE_FIRMA sin contratoFirmado; confirm nativo del operador
- POSTCONDICIONES = No escribe contratoFirmado/estadoContrato/fechaFirmaDigital ni adjunta evidencia de contrato/pagaré
- SIDE_EFFECTS = Alert y fetchSolicitudes; copy afirma firma aunque sólo cambia estado
RIESGO = ALTO

#### W26 — onClick V:4342

- DOMINIO = COBRANZAS
- OBJETO = Rechazo de comprobante de cuota
- COLECCION/API = solicitudes/{sol.id}
- CAMPOS_MUTADOS = planPagos completo: idx.estado=PENDIENTE,comprobanteUrl=null
- PRECONDICIONES = UI cuota EN_REVISION; prompt cancelado aborta, motivo vacío permitido y no guardado
- POSTCONDICIONES = Vuelve cuota a pendiente; no borra archivo Storage ni conserva motivo en payload
- SIDE_EFFECTS = Refetch solicitudes y alert, sin catch local en callback
RIESGO = ALTO


### 4.2 Todos los sitios de escritura directa

Los payloads nombrados se expanden en la ficha del handler anterior. Distintos sitios bajo el mismo handler son ramas alternativas o pasos sucesivos, no acciones independientes seguras. Cada fila hereda pre/postcondiciones y riesgo de su ficha.

| Sitio | Handler / ficha | Operación | Objeto / campos o payload |
| --- | --- | --- | --- |
| V:391 | handleGuardarDatosEditados | updateDoc | updateDoc(docRef, updates) |
| V:394 | handleGuardarDatosEditados | updateDoc | updateDoc(docRef, { clienteEmail: editFields.email, "datosPersonales.nombreCompleto": editFields.nombreCompleto, "datosPersonales.numeroDni": editFields.numeroDni, "datosPersonales.cuil": editFields.cuil, "datosPersonales.telefono": editFields.telefono, "datosPersonales.direccion": editFields.direccion, "datosPersonales.localidad": editFields.localidad }) |
| V:421 | handleSubirDocumentoManual | uploadBytes | uploadBytes(storageRef, file) |
| V:428 | handleSubirDocumentoManual | updateDoc | updateDoc(docRef, { comprobanteDomicilioURL: downloadUrl }) |
| V:430 | handleSubirDocumentoManual | updateDoc | updateDoc(docRef, { comprobanteURL: downloadUrl }) |
| V:435 | handleSubirDocumentoManual | updateDoc | updateDoc(docRef, { "documentos.servicio": downloadUrl }) |
| V:437 | handleSubirDocumentoManual | updateDoc | updateDoc(docRef, { "documentos.reciboSueldo": downloadUrl }) |
| V:453 | handleGuardarComisionista | updateDoc | updateDoc(docRef, { comisionistaNombre: comisionistaNombre, comisionistaCosto: Number(comisionistaCosto) \|\| 0, comisionistaFechaEnvio: comisionistaFechaEnvio }) |
| V:482 | handleTransferirStockUnidad | updateDoc | updateDoc(prodRef, { stock: updatedStock }) |
| V:486 | handleTransferirStockUnidad | updateDoc | updateDoc(doc(db, "solicitudes", solId), { estadoProducto: "Traslado entre Puntos de Venta", historialRecepcion: msg }) |
| V:528 | handleReservarStock | updateDoc | updateDoc(prodRef, { stock: updatedStock }) |
| V:534 | handleReservarStock | updateDoc | updateDoc(doc(db, "solicitudes", solId), { vinculoProductoId: prodId, vinculoUnidadId: unitId, numeroSerie: numSerie, sucursalDestino: destino, estadoProducto: origen === destino ? "En stock (Afiliado)" : "En viaje", historialRecepcion: msg }) |
| V:565 | handleLiberarReserva | updateDoc | updateDoc(prodRef, { stock: updatedStock }) |
| V:568 | handleLiberarReserva | updateDoc | updateDoc(doc(db, "solicitudes", solId), { vinculoProductoId: "", vinculoUnidadId: "", numeroSerie: "", sucursalDestino: "", estadoProducto: "En depósito (Central)", historialRecepcion: "Reserva de stock liberada. Unidad devuelta a disponibles." }) |
| V:599 | handleConfirmarArriboSucursal | updateDoc | updateDoc(prodRef, { stock: updatedStock }) |
| V:601 | handleConfirmarArriboSucursal | updateDoc | updateDoc(doc(db, "solicitudes", solId), { estadoProducto: "En stock (Afiliado)", comisionistaFechaRecepcion: new Date().toISOString(), historialRecepcion: `El comisionista entregó el producto al afiliado en la sucursal de destino: ${destino}. Ruteo interno finalizado.` }) |
| V:662 | handleProcesarPagoFinal | updateDoc | updateDoc(doc(db, "solicitudes", solId), { planPagos: newPlan }) |
| V:717 | handleProcesarPagoFinal | addDoc | addDoc(collection(db, "notificaciones"), { afiliadoEmail: vendedorInfo.email, vendedorId: vendedorInfo.id, ven … Campos explícitos: afiliadoEmail, vendedorId, vendedorNombre, mensaje, asignada, fecha, leida, comisionAsociada, estadoPago, cuotaAsociada, clienteNombre |
| V:836 | handleEnviarPresupuesto | updateDoc | updateDoc(doc(db, "solicitudes_cuenta", sol.id), { presupuestos: updatedPresupuestos }) |
| V:983 | handleAceptarPresupuesto | updateDoc | updateDoc(doc(db, colName, sol.id), payloadActualizacion) |
| V:1003 | handleRechazarPresupuesto | updateDoc | updateDoc(doc(db, "solicitudes_cuenta", sol.id), { presupuestos: updatedPresupuestos }) |
| V:1099 | handleGuardarEdicionContrato | updateDoc | updateDoc(doc(db, colName, solId), payload) |
| V:1105 | handleGuardarEdicionContrato | updateDoc | updateDoc(doc(db, "solicitudes", d.id), payload) |
| V:1110 | handleGuardarEdicionContrato | updateDoc | updateDoc(doc(db, "solicitudes_cuenta", apId), payload) |
| V:1326 | handleConfirmarYEnviarWhatsApp | addDoc | addDoc(collection(db, "solicitudes"), { clienteId: "aperturado_" + c.solId, clienteEmail: c.email \|\| "no-email … Campos explícitos: clienteId, clienteEmail, datosPersonales, nombreCompleto, numeroDni, telefono, direccion, localidad, documentos, dniFrente, dniDorso, reciboSueldo, servicio, productoDeseado, costoProducto, precioContado, factorFinanciado, montoCuota, planElegido, tasaInteresTna, tasaMora, estado, estadoEntrega, fechaCreacion, cargadoPorAfiliado, afiliadoEmail, planPagos |
| V:1360 | handleConfirmarYEnviarWhatsApp | updateDoc | updateDoc(doc(db, "solicitudes_cuenta", c.solId), { estado: "Aprobado" }) |
| V:1363 | handleConfirmarYEnviarWhatsApp | updateDoc | updateDoc(doc(db, "solicitudes", c.solId), { estado: "PENDIENTE_FIRMA", costoProducto: Number(c.precioContado) … Campos explícitos: estado, costoProducto, precioContado, factorFinanciado, montoCuota, planElegido, tasaInteresTna, tasaMora, datosPersonales, nombreCompleto, numeroDni, telefono, direccion, planPagos |
| V:1447 | fetchAperturas | addDoc | addDoc(collection(db, "solicitudes"), { clienteId: "aperturado_" + req.id, clienteEmail: req.email \|\| "no-emai … Campos explícitos: clienteId, clienteEmail, datosPersonales, nombreCompleto, numeroDni, telefono, direccion, localidad, cuil, documentos, dniFrente, dniDorso, reciboSueldo, servicio, productoDeseado, montoCuota, planElegido, tasaInteresTna, tasaMora, estado, estadoEntrega, fechaCreacion, cargadoPorAfiliado, afiliadoEmail, planPagos |
| V:1524 | handleActualizarEstadoApertura | updateDoc | updateDoc(doc(db, "solicitudes_cuenta", id), updateData) |
| V:1549 | handleActualizarEstadoApertura | addDoc | addDoc(collection(db, "solicitudes"), { clienteId: "aperturado_" + id, clienteEmail: reqObj.email \|\| "no-email … Campos explícitos: clienteId, clienteEmail, datosPersonales, nombreCompleto, numeroDni, telefono, direccion, localidad, cuil, documentos, dniFrente, dniDorso, reciboSueldo, servicio, productoDeseado, montoCuota, planElegido, tasaInteresTna, tasaMora, estado, estadoEntrega, fechaCreacion, cargadoPorAfiliado, afiliadoEmail, planPagos |
| V:1594 | handleEliminarApertura | deleteDoc | deleteDoc(doc(db, "solicitudes_cuenta", id)) |
| V:1617 | handleActualizarEstadoDespachoRemito | updateDoc | updateDoc(doc(db, colName, solId), payload) |
| V:1623 | handleActualizarEstadoDespachoRemito | updateDoc | updateDoc(doc(db, "solicitudes", d.id), payload) |
| V:1628 | handleActualizarEstadoDespachoRemito | updateDoc | updateDoc(doc(db, "solicitudes_cuenta", apId), payload) |
| V:1673 | handleGuardarDespachoRemito | updateDoc | updateDoc(doc(db, colName, solId), payloadDespacho) |
| V:1679 | handleGuardarDespachoRemito | updateDoc | updateDoc(doc(db, "solicitudes", d.id), payloadDespacho) |
| V:1684 | handleGuardarDespachoRemito | updateDoc | updateDoc(doc(db, "solicitudes_cuenta", apId), payloadDespacho) |
| V:1687 | handleGuardarDespachoRemito | addDoc | addDoc(collection(db, "remitos"), { nroRemito: nroRemitoGenerado, fechaEmision: new Date().toLocaleDateString( … Campos explícitos: nroRemito, fechaEmision, fechaCreacion, tipoRemito, nroContratoInterno, clienteNombre, clienteDni, clienteDomicilio, clienteTelefono, transporteLocal, costoLocal, guiaLocal, estadoEnvio, productoDescripcion, nserie, cantidad |
| V:1736 | handleGuardarPedidoProveedor | updateDoc | updateDoc(doc(db, colName, solId), payload) |
| V:1742 | handleGuardarPedidoProveedor | updateDoc | updateDoc(doc(db, "solicitudes", d.id), payload) |
| V:1749 | handleGuardarPedidoProveedor | updateDoc | updateDoc(doc(db, "solicitudes_cuenta", apId), payload) |
| V:1777 | handleEliminarPedido | deleteDoc | deleteDoc(doc(db, "solicitudes_cuenta", sol.id)) |
| V:1784 | handleEliminarPedido | deleteDoc | deleteDoc(doc(db, "solicitudes", d.id)) |
| V:1788 | handleEliminarPedido | deleteDoc | deleteDoc(doc(db, "solicitudes", sol.id)) |
| V:1793 | handleEliminarPedido | deleteDoc | deleteDoc(doc(db, "solicitudes_cuenta", aperturaId)) |
| V:1795 | handleEliminarPedido | deleteDoc | deleteDoc(doc(db, "solicitudes_cuenta", sol.id)) |
| V:1812 | handleEliminarPedido | updateDoc | updateDoc(prodRef, { stock: stockModificado }) |
| V:1900 | handleActualizarEstadoProducto | updateDoc | updateDoc(doc(db, "solicitudes", id), { estadoProducto: nuevoEstado }) |
| V:1935 | handleConfirmarEntregaAdmin | updateDoc | updateDoc(prodRef, { stock: updatedStock }) |
| V:1979 | handleConfirmarEntregaAdmin | updateDoc | updateDoc(doc(db, "solicitudes", id), dataToUpdate) |
| V:1989 | handleAsignarAfiliado | updateDoc | updateDoc(doc(db, "solicitudes", id), { afiliadoEmail: email ? email.toLowerCase().trim() : null }) |
| V:2018 | guardarCambios | updateDoc | updateDoc(doc(db, "solicitudes", sol.id), { estado: estadoToSave, mensajeAdmin: mensajeToSave }) |
| V:3266 | JSX onClick@3263 | updateDoc | updateDoc(doc(db, "solicitudes", req.id), { estado: "APROBADO" }) |
| V:4348 | JSX onClick@4342 | updateDoc | updateDoc(doc(db, "solicitudes", sol.id), { planPagos: newPlan }) |

### Escritura indirecta de un módulo importado

`obtenerVendedores` (`vendedoresManager.ts:31–43`) — DOMINIO: COMPARTIDO; OBJETO: catálogo de vendedores; COLECCION/API: vendedores + localStorage; CAMPOS_MUTADOS: por cada default nombre/email/localidad/porcentajeComision/activo/fechaCreacion; marca vendedores_initial_seeded="true"; PRE: lectura vacía y sin marca de navegador; POST: lista con los defaults cuya inserción haya funcionado; SIDE_EFFECTS: inserciones con IDs aleatorios, marca previa al resultado, excepciones internas ignoradas; RIESGO: ALTO. Se invoca en ambos effects, no hay exclusión concurrente; la marca es por navegador, no una garantía de idempotencia de base de datos. No se contaron los otros CRUD del archivo, porque V no los llama.

No hay escritura directa a `alertas_admin`, `presupuestos` como colección, `ledger_movimientos`, `pagos_informados` ni APIs internas desde V. Las notificaciones de comisión sí se crean en `notificaciones`. No confundir alert/confirm del navegador con documentos de alertas.

## 5. Side effects

### Los 13 handlers externos que completan las 39 unidades directas

| Handler / ubicación | Dominio | Efecto y precondición | Resultado / riesgo |
| --- | --- | --- | --- |
| handleDescargarPdfPresupuestoBorrador V:869 | PRESUPUESTOS | draftItems no vacío → PDF con referencia aleatoria, items y notas | No exige guardado; descarga sin persistencia; MEDIO |
| handleDescargarPdfPresupuestoHistorial V:884 | PRESUPUESTOS | presupuesto de la apertura, fallback de item único → PDF | Datos históricos y notas libres; MEDIO |
| onClick V:2701 | SOLICITUDES | copia CUIT/DNI y abre web BCRA | Portapapeles sin await/catch; ventana externa; MEDIO |
| onClick V:2715 | SOLICITUDES | copia DNI y abre Padrón CNE | Igual límite de clipboard/ventana; MEDIO |
| onClick V:3019 | SOLICITUDES | equivalente BCRA para datosPersonales | Misma operación, otra rama de UI; MEDIO |
| onClick V:3033 | SOLICITUDES | equivalente Padrón para datosPersonales | Misma operación, otra rama de UI; MEDIO |
| onClick V:3254 | DOCUMENTACION | copia URL de autorización por req.id | Dominio productivo hardcodeado y sin source; no ejecutado aquí; MEDIO |
| onClick V:3707 | COMPARTIDO | unidad reservada → generarRemitoTipoR y llama handleGuardarDespachoRemito | PDF antes del guardado; payload destinatario distinto del persistido por getters; ALTO de la cadena |
| onClick V:4239 | COBRANZAS | plan presente → generarEstadoCuenta | Totales locales desde planPagos, no ledger; MEDIO |
| onClick V:4312 | COBRANZAS | cuota PAGADO → generarComprobantePago | Recrea recibo; defaults internos de generador si falta desglose; MEDIO |
| onClick V:4853 | DOCUMENTACION | editor abierto → generarContratoModelo(contratoAEditar) | Genera desde cambios locales, sin exigir guardado; ALTO documental |
| onClick V:4856 | DOCUMENTACION | mismo editor → generarPagareModelo | Documento legal desde borrador; ALTO documental |
| BcraScoringPanel.handleFetch V:4885 | SOLICITUDES | CUIT limpio de 11 caracteres → fetch manual | No guarda resultado; red/CORS/503 local; MEDIO |

Las 20 fichas de persistencia marcadas ALTO en §4 no incluyen estos riesgos documentales adicionales ni el helper importado; el conteo final declara ese alcance.

### Otros efectos y cadenas

- PDF y WhatsApp de handleProcesarPagoFinal, handleEnviarPresupuesto y handleConfirmarYEnviarWhatsApp ya se incluyen en sus fichas; no duplicar conteos. Los 8 sitios de generación PDF son 2 recibos + 2 presupuestos + contrato + pagaré + remito R + estado de cuenta. generarRemitoModelo tiene 0 llamadas.
- WhatsApp también existe como anchor en V:2600,2826,3244; sólo el último lleva texto y enlace de autorización. No realiza envío API ni acredita entrega de mensaje. Ventana/popup bloqueado no revierte el guardado.
- Consultas de terceros: CUIT Online, Google y Dateas incorporan identificadores en la URL; BCRA/Padrón abren sitios después de copiar al portapapeles. No trasladar esos datos a una pantalla Cliente.
- Alert, confirm y prompt son feedback/confirmaciones bloqueantes locales. Un texto de éxito no acredita que espejos disparados sin await hayan terminado. Rechazo de pago solicita motivo, pero no lo persiste.
- `fetchSolicitudes` es lectura; `fetchAperturas` **no** lo es. Cualquier handler que lo refresca puede activar migración adicional. Ambos effects llaman obtenerVendedores, con el sembrado indicado. No ejecutar esos helpers para producir este informe.
- Cálculos/transiciones locales del editor legal (V:4542,4569,4596,4625,4693,4811,4819,4827) regeneran montos/cronograma en memoria, luego pueden persistirse con Guardar o Confirmar. No son cambios meramente cosméticos que se puedan extraer sin proteger snapshots.
- No existe transacción de aprobación + plan + stock + documento. En handleProcesarPagoFinal la primera persistencia de planPagos ocurre **antes** de añadir vendedorId/vendedorNombre/porcentajeComision/comisionMonto al array; no hay segundo updateDoc de ese array en el handler. No afirmar que esos cuatro campos queden guardados.

## 6. Flujos reales actuales

No hay un wizard único: las acciones se distribuyen entre análisis, otras tabs, editor modal y ruta de autorización. El cambio de tabs no equivale a una transición persistida.

### A. Solicitud nueva

- ENTRADA = documento existente en `solicitudes`; V no implementa un formulario de alta estándar en blanco.
- ESTADO INICIAL = `PENDIENTE`, `REQUIERE_INFO` o `PENDIENTE_FIRMA` entra en combinedRequests.
- ACCIONES DISPONIBLES = búsqueda, expansión/selector de operación, editar identidad, consultar documentación/BCRA, asignar vendedor afiliado, preparar dictamen y editor legal.
- MUTACIONES = W01/W02/W23/W24 si el operador las invoca; sólo abrir la página puede disparar W14 o sembrado de vendedores por otros datos.
- ESTADO FINAL = sin acción permanece; dictamen guarda el valor elegido.
- DEPENDENCIAS = fetchSolicitudes + fuentes auxiliares; no presupone un presupuesto aceptado.
RUTA/TAB ACTUAL = `/admin/validaciones`, analisis, rama `!req.isApertura`.

### B. Apertura / solicitudes_cuenta

- ENTRADA = documento en solicitudes_cuenta; tipo contacto_rapido se transforma a nombreCompleto=nombre,numeroDni=dni,productoNombre=necesidad sólo en memoria.
- ESTADO INICIAL = estado normalizado a minúsculas en pendiente/aprobado_presupuesto/solicitante/aperturado. Aprobado no se incluye en esta bandeja.
- ACCIONES DISPONIBLES = estándar: editar datos, documentos, selección Pendiente/Aprobado/Rechazado, contrato y borrar. Contacto rápido: armar propuesta, aceptar/rechazar, asesoramiento, confeccionar y “Rechazar y Archivar”.
- MUTACIONES = W01/W02/W09/W10/W11/W15/W16; fetchAperturas migra Aprobado sin réplica incluso sin interacción.
- ESTADO FINAL = aprobación de apertura deja Aprobado y puede crear otra solicitud APROBADO; rechazo guarda Rechazado y motivo; “Archivar” del contacto rápido elimina físicamente.
- DEPENDENCIAS = dos snapshots y detección de réplica por clienteId prefijado; sin transacción.
RUTA/TAB ACTUAL = analisis. `aperturas` es un valor del tipo activeTab, pero no hay botón ni lector de query que lo seleccione.

### C. Revisión de información

- ENTRADA = registro expandido.
- ESTADO INICIAL = datos guardados + drafts nuevosEstados/nuevosMensajes.
- ACCIONES DISPONIBLES = en solicitudes editar identidad con startEditing/W01; dictamen W24; aperturas estándar editan datos y tienen resolución W15 distinta.
- MUTACIONES = identidad según fuente; en solicitud REQUIERE_INFO/RECHAZADO exige mensaje. Aperturas no tienen el mismo enum de requerimiento.
- ESTADO FINAL = datos actualizados y/o estado/mensaje persistidos, sin evidencia de notificación automática desde V.
- DEPENDENCIAS = bandera isApertura y keys por ID; distintos schemas de identidad.
RUTA/TAB ACTUAL = analisis; dictamen también en ramas no-analisis. Una selección APROBADO no guardada puede habilitar visualmente panel logístico porque currentEstado usa draft.

### D. Revisión documental

- ENTRADA = URLs de DNI/ingresos/domicilio guardadas o sentinel “Pendiente envío WhatsApp”.
- ESTADO INICIAL = presencia/ausencia de campos, no un enum de documento validado.
- ACCIONES DISPONIBLES = abrir archivo en otra pestaña; cargar manualmente ingresos o domicilio (W02) en análisis.
- MUTACIONES = upload y URL; no se guarda “documento revisado/aprobado” ni se crea alerta documental en V.
- ESTADO FINAL = archivo accesible por URL si ambas operaciones terminan; no acredita revisión.
- DEPENDENCIAS = Storage real no emulado por la configuración actual; source del registro.
RUTA/TAB ACTUAL = apertura estándar y solicitud de analisis; otras tabs muestran links sin control de carga equivalente.

### E. Presupuesto

- ENTRADA = contacto_rapido de solicitudes_cuenta, borrador local o presupuesto histórico embebido.
- ESTADO INICIAL = draftItems vacío o array cargado, propuesta Enviado/Aceptado/Rechazado.
- ACCIONES DISPONIBLES = añadir/quitar items, editar valores con factores locales, PDF de borrador/histórico, guardar/enviar, seleccionar opciones, aceptar/rechazar. El PDF de borrador no exige persistencia.
- MUTACIONES = W09 guarda array y abre WhatsApp; W10 acepta opciones, rechaza las demás y actualiza estructura del legajo con Aprobado_Presupuesto; W11 rechaza una propuesta.
- ESTADO FINAL = presupuesto Enviado/Aceptado/Rechazado, y eventualmente legajo Aprobado_Presupuesto.
- DEPENDENCIAS = defaults locales de costo/plazo/TNA/mora; no importa canonicalPricingEngine ni budgetEditorLifecycle/toClientBudgetPayload. Este flujo no es equivalente al módulo moderno `/admin/presupuestos`.
RUTA/TAB ACTUAL = analisis → contacto_rapido. No migrar este editor en Fase 2B ni mezclar snapshots modernos con sus fallbacks legacy.

### F. Aprobación / decisión

- ENTRADA = solicitud estándar o apertura estándar; no hay un único handler compartido.
- ESTADO INICIAL = resolución previa + selección local.
- ACCIONES DISPONIBLES = Registrar Dictamen en solicitud; select inmediato en apertura; confirmar paso de pendiente de firma en rama de solicitud.
- MUTACIONES = W24 sólo estado/mensaje en solicitud; W15 puede crear solicitud y plan; W25 sólo estado APROBADO.
- ESTADO FINAL = APROBADO/RECHAZADO/REQUIERE_INFO/PENDIENTE en solicitud o Aprobado/Rechazado/Pendiente en apertura.
- DEPENDENCIAS = validaciones distintas y consistencia entre autorización y decisión no centralizada.
RUTA/TAB ACTUAL = analisis, y dictamen en ramas restantes. No afirmar que toda aprobación genera plan: depende del handler.

### G. Autorización / mandato

- ENTRADA = handleOpenContratoEditor; en contacto rápido se muestra tras al menos un presupuesto Aceptado. En solicitud estándar también puede abrirse desde Editar Contrato/Pagaré.
- ESTADO INICIAL = editor local, con isApertura:true fijado para cualquier sol.
- ACCIONES DISPONIBLES = editar, guardar W12, generar PDF, Confirmar Legajo/WhatsApp W13; con PENDIENTE_FIRMA, reenviar/copiar link o confirmar manualmente W25.
- MUTACIONES = W13 crea solicitud/plan y marca apertura Aprobado cuando c.isApertura; rama alternativa actualiza solicitud pero no es la que prepara el abridor actual. W25 cambia sólo estado.
- ESTADO FINAL = solicitud PENDIENTE_FIRMA; aparte, la ruta `/firmar-contrato/[id]` escribe contratoFirmado=true,estadoContrato=AUTORIZADO,fechaFirmaDigital,ipFirmaDigital,metodoFirma,dispositivoFirma,nroContrato. No cambia por sí sola estado a APROBADO en ese payload.
- DEPENDENCIAS = ruta externa busca solicitudes primero y fallback a solicitudes_cuenta sólo si no existe; no conserva source en URL; reglas pueden impedir lectura/escritura pública. No se probó firma real ni se certifica categoría jurídica.
RUTA/TAB ACTUAL = editor modal + tarjeta de autorización en analisis + ruta externa. Si contratoFirmado es truthy, la UI muestra contrato autorizado y oculta la rama manual de PENDIENTE_FIRMA; no inferir que esa combinación siempre avance automáticamente a Logística.

### H. Pagaré

- ENTRADA = mismo contratoAEditar y botón Editar Pagaré; no hay editor separado.
- ESTADO INICIAL = datos legales y cronograma local.
- ACCIONES DISPONIBLES = editar/guardar junto con contrato y descargar generarPagareModelo.
- MUTACIONES = W12 o W13 si se eligen, no por descargar el PDF. No existe campo de estado de pagaré firmado/revisado en este flujo.
- ESTADO FINAL = PDF local o datos del legajo reemplazados; un PDF generado no demuestra firma.
- DEPENDENCIAS = generador legal y valores del editor; cantidades/tasas/calendario modificables.
RUTA/TAB ACTUAL = modal legal desde analisis/otras tabs. Mantener legal congelado fuera de Fase 2B.

### I. Preparación logística

- ENTRADA = solicitud con estado normalizado APROBADO y no entregada en tab logistica; panel interno usa currentEstado, que puede venir de draft.
- ESTADO INICIAL = sin vínculo de stock o con unidad asignada; proveedor/despacho pueden tener estado propio.
- ACCIONES DISPONIBLES = reservar/liberar stock, elegir sucursal/serie, registrar transporte interno, confirmar arribo, editar proveedor/estado, confeccionar destinatario y despacho/remito.
- MUTACIONES = W03/W05/W06/W07/W17/W18/W19; W04 y W21 existen pero sin invocación JSX, no se describen como botones disponibles.
- ESTADO FINAL = vínculo y estados de producto/proveedor/despacho actualizados; no equivale a entrega o pago.
- DEPENDENCIAS = catálogo/stock en memoria, vendedores/sucursales y empresa remitos.
RUTA/TAB ACTUAL = logistica y panel de solicitud aprobada en historial/otras ramas no-analisis.

### J. Entrega

- ENTRADA = selector de estado final de entrega.
- ESTADO INICIAL = PENDIENTE_ENTREGA por fallback, ENTREGADO o ANULADO.
- ACCIONES DISPONIBLES = elegir ENTREGADO abre handleOpenEntregaModal; importe/medio/nota, cancelar o guardar cierre; otras selecciones llaman W22 con esDirecto=true.
- MUTACIONES = W22: cierre puede vender stock, registrar adelanto/rendición y sustituir planPagos por uno nuevo con primera cuota PAGADO; actualización directa sólo cambia estadoEntrega.
- ESTADO FINAL = ENTREGADO y eventualmente CONFIRMADO en rendición; o estado elegido. No hay guardas de transición/idempotencia en el handler.
- DEPENDENCIAS = sol.planElegido,montoCuota, stock elegido y estado del formulario; no ledger.
RUTA/TAB ACTUAL = panel Logística y Entrega en ramas no-analisis.

### K. Cobranza / pagos

- ENTRADA = solicitudes APROBADO entregadas con alguna cuota EN_REVISION o PENDIENTE para tab cobranzas; historial puede mostrar planes fuera de ese filtro.
- ESTADO INICIAL = cuota PENDIENTE, EN_REVISION o PAGADO.
- ACCIONES DISPONIBLES = comprobante, rechazar reporte W26, aprobar vía modal W08, cobro manual efectivo/transferencia, recibo/estado de cuenta PDF.
- MUTACIONES = W08 reescribe plan y ajusta diferencia en cuota posterior; W26 vuelve a PENDIENTE y limpia URL. No se crean movimientos ledger.
- ESTADO FINAL = cuota PAGADO o PENDIENTE; la notificación de comisión puede quedar PENDIENTE si se activa su rama.
- DEPENDENCIAS = solId+idx, monto original local, lista vendedores y PDF; no se usa API canónica de pagos desde V.
RUTA/TAB ACTUAL = cobranzas/historial y cualquier rama no-analisis con plan. No equiparar este handler al motor ledger cubierto por otras suites.

### L. Historial

- ENTRADA = tab historial y búsqueda actual.
- ESTADO INICIAL = cualquier solicitud de la colección solicitudes; no incluye todas las aperturas de solicitudes_cuenta.
- ACCIONES DISPONIBLES = mismas tarjetas agrupadas con dictamen, borrado, logística si aprobado y pagos si hay plan; no es sólo lectura ni un log inmutable.
- MUTACIONES = las de esos controles; no se agrega una entrada universal de actividad.
- ESTADO FINAL = depende de la acción, historial no define transición propia.
- DEPENDENCIAS = fetchSolicitudes, grouping y drafts compartidos; no existe timeline de eventos completa.
RUTA/TAB ACTUAL = `/admin/validaciones` → Archivo Completo.

## 7. Estados persistidos

Tabla por **campo y dominio**: los valores de casing distinto no se unifican en almacenamiento. Las entradas reconocidas sólo después de toLowerCase se identifican como tales; su capitalización persistida real no puede certificarse sin datos. “No escribe V” no significa que nadie lo escriba en el repositorio. No se introducen enums.

| Dominio | Campo | VALOR_PERSISTIDO | SIGNIFICADO_ACTUAL | DONDE_SE_ESCRIBE | DONDE_SE_LEE | COPY_ACTUAL | RIESGO_DE_CONFUSION |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SOLICITUD | solicitudes.estado | PENDIENTE | Solicitud pendiente de dictamen | guardarCambios V:2018 (valor del selector) | combinedRequests V:2068; selectores V:3174/3467 | Pendiente | No confundir con Pendiente de apertura ni cuota |
| SOLICITUD | solicitudes.estado | APROBADO | Decisión favorable principal | fetchAperturas V:1447; handleActualizarEstadoApertura V:1549; inline V:3263; guardarCambios | Logística/cobranzas y badges V:3294 en adelante | Aprobado / APROBAR VENTA | Varios escritores con postcondiciones distintas; no acredita firma ni plan válido |
| SOLICITUD | solicitudes.estado | RECHAZADO | Dictamen negativo | guardarCambios V:2018, exige motivo | Selectores/badge e historial | Rechazado | Distinto casing de apertura; no borra |
| SOLICITUD | solicitudes.estado | REQUIERE_INFO | Solicita completar información | guardarCambios V:2005–2029, exige mensajeAdmin | combinedRequests V:2068 y selectores | Requiere información / etiqueta del estado | No equivale a revisión documental aprobada |
| SOLICITUD | solicitudes.estado | PENDIENTE_FIRMA | Operación preparada para autorización | handleConfirmarYEnviarWhatsApp V:1301–1404 | combinedRequests V:2068; tarjeta V:3235 | Pendiente de Firma | Confirmación manual sólo cambia estado principal; firma pública no lo cambia |
| SOLICITUD | solicitudes_cuenta.estado | Pendiente | Apertura pendiente | handleActualizarEstadoApertura V:1503; botón V:2834 | Filtro V:2040 normaliza a minúsculas; fallback de lectura | Pendiente | Fallback de ausencia no prueba persistencia; distinto de PENDIENTE |
| SOLICITUD | solicitudes_cuenta.estado | Aprobado | Apertura aprobada | handleActualizarEstadoApertura; handleConfirmarYEnviarWhatsApp | fetchAperturas V:1427 compara literal | Aprobado | Puede crear réplica y plan; no aparece en filtro pendiente de aperturas |
| SOLICITUD | solicitudes_cuenta.estado | Rechazado | Apertura rechazada | handleActualizarEstadoApertura, prompt de motivo | Filtro de aperturas la excluye; controles de decisión | Rechazado | Botón Rechazar y Archivar en contacto rápido en cambio elimina |
| SOLICITUD | solicitudes_cuenta.estado | Aprobado_Presupuesto | Propuesta aceptada en flujo legacy | handleAceptarPresupuesto V:981 | Filtro V:2040 como aprobado_presupuesto | Presupuesto aceptado / apertura visible | No es APROBADO de solicitud ni prueba de autorización |
| SOLICITUD | solicitudes_cuenta.estado | solicitante (normalizado) | Valor admitido por filtro | No escribe V; casing persistido no establecido | combinedRequests V:2040, tras toLowerCase | Tarjeta de apertura | Sólo evidencia de lectura; no inventar literal con mayúscula |
| SOLICITUD | solicitudes_cuenta.estado | aperturado (normalizado) | Valor admitido por filtro | No escribe V; casing persistido no establecido | combinedRequests V:2040, tras toLowerCase | Tarjeta de apertura | No confundir con clienteId aperturado_ que es un vínculo |
| DOCUMENTO | campos URL de documentos | Pendiente envío WhatsApp | Sentinel de documento pendiente | No escribe V en flujo examinado | Tarjeta documental V:2768–2789 | Pendiente envío WhatsApp | No es URL ni aprobación; upload reemplaza URL sin evaluación documental |
| PRESUPUESTO | solicitudes_cuenta.presupuestos[].estado | Enviado | Propuesta enviada | handleEnviarPresupuestoWhatsApp V:816/830 | Lista de propuestas y disponibilidad de controles V:2440–2600 | Enviado | Array embebido legacy; no equivale a lifecycle del editor moderno |
| PRESUPUESTO | solicitudes_cuenta.presupuestos[].estado | Aceptado | Propuesta elegida | handleAceptarPresupuesto V:961 | Lista de propuestas y disponibilidad de controles V:2440–2600 | Aceptado | Array embebido legacy; no equivale a lifecycle del editor moderno |
| PRESUPUESTO | solicitudes_cuenta.presupuestos[].estado | Rechazado | Propuesta rechazada o alternativa descartada | handleAceptarPresupuesto / handleRechazarPresupuesto | Lista de propuestas y disponibilidad de controles V:2440–2600 | Rechazado | Array embebido legacy; no equivale a lifecycle del editor moderno |
| AUTORIZACION | contratoFirmado | true (booleano) | Marca de firma digital | FirmarContratoClient.tsx:120; no escribe V | V:3219 por truthiness; receptor de firma | Autorización / firma confirmada | Puede coexistir con PENDIENTE_FIRMA principal y ocultar confirmación manual |
| AUTORIZACION | estadoContrato | AUTORIZADO | Estado específico de autorización | FirmarContratoClient.tsx:121; no escribe V | FirmarContratoClient.tsx:57; V no consulta este campo | Autorizado en receptor externo | No confundir con estado principal APROBADO; reglas pueden impedir escritura |
| ENTREGA | solicitudes.estadoEntrega | PENDIENTE_ENTREGA | Entrega pendiente | Creación V:1351/1470/1572; handleConfirmarEntregaAdmin por parámetro | Filtros logísticos y control de entrega | Pendiente de entrega | ENTREGADO puede reemplazar plan y registrar anticipo; no acredita remito conforme |
| ENTREGA | solicitudes.estadoEntrega | ENTREGADO | Entrega registrada | handleConfirmarEntregaAdmin V:1905 | Filtros logística/cobranzas; controles de entrega | Entregado | ENTREGADO puede reemplazar plan y registrar anticipo; no acredita remito conforme |
| ENTREGA | solicitudes.estadoEntrega | ANULADO | Entrega anulada | handleConfirmarEntregaAdmin desde selector | Selector de entrega | Anulado | ENTREGADO puede reemplazar plan y registrar anticipo; no acredita remito conforme |
| ENTREGA | solicitudes.estadoProducto | Traslado entre Puntos de Venta | Situación logística declarada del producto | handleTransferirStockUnidad V:487 (sin invocación UI) | Tipo/handlers; UI de ruteo deriva también localidad y vínculos | Traslado entre Puntos de Venta | No es estadoEntrega; varias fuentes pueden discrepar; setter admite string libre |
| ENTREGA | solicitudes.estadoProducto | En stock (Afiliado) | Situación logística declarada del producto | handleReservarStock V:539 / handleConfirmarArriboSucursal V:602 | Tipo/handlers; UI de ruteo deriva también localidad y vínculos | En stock (Afiliado) | No es estadoEntrega; varias fuentes pueden discrepar; setter admite string libre |
| ENTREGA | solicitudes.estadoProducto | En viaje | Situación logística declarada del producto | handleReservarStock V:539 | Tipo/handlers; UI de ruteo deriva también localidad y vínculos | En viaje | No es estadoEntrega; varias fuentes pueden discrepar; setter admite string libre |
| ENTREGA | solicitudes.estadoProducto | En depósito (Central) | Situación logística declarada del producto | handleLiberarReserva V:573 | Tipo/handlers; UI de ruteo deriva también localidad y vínculos | En depósito (Central) | No es estadoEntrega; varias fuentes pueden discrepar; setter admite string libre |
| ENTREGA | productos.stock[].estado | Disponible | Disponibilidad de unidad de inventario | handleLiberarReserva; handleEliminarPedido | Selección de stock/producto en logística | Disponible | Array completo actualizado sin transacción; reserva no garantiza exclusión concurrente |
| ENTREGA | productos.stock[].estado | Reservado | Disponibilidad de unidad de inventario | handleReservarStock | Selección de stock/producto en logística | Reservado | Array completo actualizado sin transacción; reserva no garantiza exclusión concurrente |
| ENTREGA | productos.stock[].estado | Vendido | Disponibilidad de unidad de inventario | handleConfirmarEntregaAdmin | Selección de stock/producto en logística | Vendido | Array completo actualizado sin transacción; reserva no garantiza exclusión concurrente |
| ENTREGA | solicitudes.proveedorEstado | SOLICITADO | Estado de pedido al proveedor | handleGuardarPedidoProveedor V:1727; selector V:4097 | Badge V:3979–3985 y precarga V:4012 | Pedido Solicitado | RECIBIDO además cambia ubicación/recepción; no equivale a entrega al cliente |
| ENTREGA | solicitudes.proveedorEstado | EN_TRANSITO | Estado de pedido al proveedor | handleGuardarPedidoProveedor V:1727; selector V:4097 | Badge V:3979–3985 y precarga V:4012 | En Tránsito | RECIBIDO además cambia ubicación/recepción; no equivale a entrega al cliente |
| ENTREGA | solicitudes.proveedorEstado | RECIBIDO | Estado de pedido al proveedor | handleGuardarPedidoProveedor V:1727; selector V:4097 | Badge V:3979–3985 y precarga V:4012 | Recibido | RECIBIDO además cambia ubicación/recepción; no equivale a entrega al cliente |
| ENTREGA | solicitudes.remitoDespachoEstado / remitos.estadoEnvio | REMITO_EMITIDO | Estado de despacho de remito | handleGuardarDespachoRemito V:1670 y alta remitos; selector V:3688–3690 | Badge V:3557–3561 y selector | REMITO EMITIDO (EN PREPARACIÓN) | Dos documentos sin atomicidad; ENTREGADO_CONFORME no es estadoEntrega ENTREGADO |
| ENTREGA | solicitudes.remitoDespachoEstado / remitos.estadoEnvio | EN_CAMINO | Estado de despacho de remito | handleGuardarDespachoRemito V:1670 y alta remitos; selector V:3688–3690 | Badge V:3557–3561 y selector | EN CAMINO AL AFILIADO / CLIENTE | Dos documentos sin atomicidad; ENTREGADO_CONFORME no es estadoEntrega ENTREGADO |
| ENTREGA | solicitudes.remitoDespachoEstado / remitos.estadoEnvio | ENTREGADO_CONFORME | Estado de despacho de remito | handleGuardarDespachoRemito V:1670 y alta remitos; selector V:3688–3690 | Badge V:3557–3561 y selector | ENTREGADO EN DESTINO (CONFORME) | Dos documentos sin atomicidad; ENTREGADO_CONFORME no es estadoEntrega ENTREGADO |
| PAGO | solicitudes.planPagos[].estado | PENDIENTE | Cuota pendiente | Creación de planes; rechazo inline V:4342 | Tarjetas de cuotas, contadores y filtro cobranzas | Pendiente | Plan completo reemplazado; estado no prueba ledger ni rendición |
| PAGO | solicitudes.planPagos[].estado | PAGADO | Cuota acreditada | handleProcesarPagoFinal; anticipo en handleConfirmarEntregaAdmin | Tarjetas de cuotas, contadores y filtro cobranzas | Acreditado / pago confirmado | Plan completo reemplazado; estado no prueba ledger ni rendición |
| PAGO | solicitudes.planPagos[].estado | EN_REVISION | Comprobante pendiente de decisión | No escribe V; recibe plan desde otras fuentes | Tarjetas de cuotas, contadores y filtro cobranzas | En revisión / aprobar o rechazar comprobante | Plan completo reemplazado; estado no prueba ledger ni rendición |
| PAGO | notificaciones.estadoPago | PENDIENTE | Notificación de pago para vendedor afiliado | handleProcesarPagoFinal V:616–738, condicional email | No lee V; consumidor fuera del módulo | Alerta externa, sin estado propio visible en V | No es cuota pendiente: la cuota puede estar PAGADO |
| RENDICION | solicitudes.estadoRendicion | CONFIRMADO | Marca de rendición del anticipo registrado por admin | handleConfirmarEntregaAdmin V:1918 si monto > 0 | No lectura operativa de este campo en V | Mensaje de entrega/anticipo, sin vista de rendición independiente | No demuestra liquidación ledger; acción de entrega escribe otro dominio |

Los vacíos/ausencias, `null`, “Sin DNI”, “Sin Recibo”, “Tránsito Requerido”, “Listo para entrega”, “Pendiente de Firma”, “Acreditado”, “PAGADA” del PDF y los textos de botón son presentaciones o datos ausentes, no nuevos valores persistidos de estado. La cadena “Pendiente envío WhatsApp” vive en campos URL: es un sentinel legacy, no URL válida ni enum documental. Las fechas y método de autorización son metadatos, no se cuentan como estados. Un false/ausente en contratoFirmado se interpreta con truthiness; no se encontró escritura de false en el flujo examinado.

## 8. Acoplamientos

Clasificación: A = extracción con comportamiento intacto; B = adapter compartido explícito; C = mantener unido inicialmente; D = futura tarea funcional separada. No se autoriza corregirlos en esta fase documental.

| ID | Acoplamiento real y evidencia | Clase | Corte seguro |
| --- | --- | --- | --- |
| X01 | fetchAperturas lee + migra + crea plan (V:1406) | D | Loader nuevo puro; auto-migración legacy requiere tarea funcional propia |
| X02 | obtenerVendedores lee + localStorage + siembra (vendedoresManager:24) | D | No importarlo desde bandeja/detalle de lectura |
| X03 | Colección inferida por aperturas.some ID en presupuesto/contrato/proveedor/despacho | B | Identidad source+id explícita en read model y adaptador; no copiar inferencia |
| X04 | groupSolicitudes/expandedId/activeProductSolId mezclan DNI/CUIL/ID y fuentes | B | Filas de operación con clave compuesta; agrupación de persona sólo visual |
| X05 | Aceptar presupuesto reescribe importes/legajo y rechaza resto (W10) | C | Mantener aceptación legacy; resumen de propuestas sólo lectura |
| X06 | Editor legal infiere costos/genera cronograma y reemplaza planes (W12/abridor) | C | No extraer editor ni calcular preview en detalle nuevo |
| X07 | Confirmar legajo crea otra solicitud/plan + apertura + WhatsApp (W13) | C | Acceso explícito a gestión avanzada; revisar isApertura en tarea separada |
| X08 | Entrega vende stock + acredita adelanto/rendición + regenera plan (W22) | C | No convertir en un botón simple del detalle de solicitud |
| X09 | Pago modifica cuotas futuras + recibo + comisión (W08) | C | Mantener handler legacy aislado; ledger no sustituye este flujo por diseño |
| X10 | Proveedor y despacho reflejan payload entre dos colecciones (W17–19) | C | No duplicar handlers ni deducir una sola fuente canónica sin auditoría |
| X11 | Borrado de solicitud borra otras fuentes y libera stock (W20) | C | No mover eliminación a Solicitudes V1 |
| X12 | PDF remito + addDoc remitos y destinatarios de fuentes locales diferentes (V:3707) | C | Conservar cadena; posible discrepancia requiere futura corrección funcional |
| X13 | effect expansión busca ID aunque expandedId es clave de persona (V:1861) | B | Navegación nueva por identidad compuesta; no copiar selección derivada defectuosa |
| X14 | Draft global de presupuesto/legal/pago/logística compartido entre operaciones | B | Estado de lectura del detalle aislado; estados mutables permanecen en legacy |
| X15 | Fechas faltantes → Date.now y orden seconds/toMillis mezclado | D | Definir fecha desconocida y orden determinístico en reader nuevo; no reinterpretar persistencia |
| X16 | Identidad/datos/docs y StatusBadge reutilizables sin ejecutar loaders (V:325,2036,2765) | A | Extraer presentación pura/proyección explícita; normalización por fuente sin efectos |

## 9. Riesgos y límites

1. **Alto al abrir:** cargas con escrituras implícitas; efectos de expansión también pueden sembrar vendedores. Una sección nueva de lectura no debe importar funciones ni montar V para reutilizar su estado.
2. **Alto de identidad:** bare IDs en maps, selección de colección y borrado cruzado. ID coincidente en ambas colecciones puede actualizar/eliminar otro objeto. El prefijo clienteId enlaza réplicas pero no demuestra unicidad ni autorización.
3. **Alto financiero/documental:** W08/W10/W12/W13/W22 usan arrays completos y defaults; cambios concurrentes y snapshots pueden perderse. W12 asigna un plan de editor sin metadata completa de pagos; W13/entrega regeneran planes. No corregir motores ni tasas como parte de una extracción UI.
4. **Alto de duplicación:** addDoc para migración/confirmación/remitos y búsquedas en memoria no garantizan idempotencia. No copiar esa estrategia a nueva UI ni ejecutar doble mutación al navegar.
5. **Parcialidad:** espejo/delete en forEach sin await y catches locales permiten éxito parcial. Las alertas de éxito y el UI optimista no acreditan todas las postcondiciones.
6. **Autorización no equivale a decisión:** W25 APROBADO no registra evidencia; contratoFirmado/estadoContrato externos no cambian estado en su payload. Un estado no debe inferir el otro.
7. **Datos cliente:** presupuesto legacy pasa items con costo/proveedor al generador sin mapper explícito. El generador usa campos concretos para dibujo, lo cual no implica filtración automática de toda propiedad; las notas y nombre de producto libres sí se imprimen sin una allowlist de contenido. No declarar fuga total sin evidencia, pero no copiar el payload administrativo a una nueva vista pública.
8. **Rules:** solicitudes_cuenta diferencia create (allowlist de campos) de update admin; en esta base un match genérico también concede escritura admin. No asumir que un nuevo payload público tiene los mismos permisos de update. No cambiar reglas ni usar Admin SDK para esquivar fallos del cliente.
9. **Legacy profundo:** parámetros tab/dni/solicitudId construidos por routing no son leídos por V. Un enlace que los incluya hoy no garantiza abrir el registro; resolverlo exige adapter de navegación en una tarea de implementación.
10. **Visibilidad:** historial no incluye todas las aperturas y grouping puede ocultar operaciones tras una tarjeta de persona. Falta de fecha/plan no debe reemplazarse por hoy/cero en una vista nueva.
11. **Fuentes externas:** BCRA/CORS, Storage y URLs productivas hardcodeadas no se probaron; no simular aislamiento de uploads con emuladores que no incluyen Storage. No se valida aquí ejecución legal de firma ni acceso público a documentos.

Las 20 unidades ALTO de §4: W02,W04,W05,W06,W07,W08,W09,W10,W12,W13,W14,W15,W16,W17,W18,W19,W20,W22,W25,W26. Son unidades con persistencia; riesgos documentales de PDF puro y sembrado indirecto quedan consignados aparte.

## 10. Arquitectura Solicitudes V1 (Fase 2B)

### Ruta y alcance exactos

`/admin/solicitudes`: bandeja de operaciones/aperturas, search local, filtro de fuente y estado vigente, identidad de cliente, referencia de operación, origen, fecha conocida o “Sin fecha registrada”, próxima acción de lectura y acceso al detalle. Incluir selector Pendientes/Todas para no replicar el ocultamiento de aperturas aprobadas; conservar estado original en cada fila. “Todas” sólo significa documentos cargados correctamente de ambas fuentes, no un historial empresarial garantizado.

Lecturas nuevas propuestas: lectores puros de solicitudes y solicitudes_cuenta, sin fetchAperturas/obtenerVendedores. Inicialmente pueden reutilizar el patrón de getDocs de ambas colecciones para mantener equivalencia de cobertura, pero no sus efectos; evaluar paginación en otra etapa si el volumen lo exige. Error parcial muestra qué fuente falló y permite reintentar; no presenta un total global fiable mientras falte una fuente. No cargar productos, stock, vendedores, configuración del emisor ni BCRA en el render inicial.

La proyección de lectura debe conservar al menos sourceCollection e id separados, tipo/origen, identificadores/nombre/contacto necesarios, producto/necesidad, estadoOriginal, fechas reales y vínculo clienteId cuando existe. SourceCollection deriva de la colección consultada, nunca de un campo manipulable del documento o del modal activo. La clave de fila se construye desde ambos valores. El DNI agrupa personas opcionalmente; no sustituye la identidad de operación.

### Filtros y próxima acción

Filtros V1: fuente, estado literal, tipo de apertura/contacto cuando exista y búsqueda por nombre/DNI/email/teléfono/bien/referencia permitida. La agrupación Pendientes se documenta por fuente con los valores del mapa (§7); mostrar estado original y no normalizar al guardar. Valores desconocidos siguen en Todas con etiqueta literal segura, no se eliminan por falta de enum.

Próxima acción es de presentación, no una decisión automática:

| Evidencia | Copy / acceso permitido en V1 |
| --- | --- |
| Solicitud REQUIERE_INFO | “Consultar información solicitada” → detalle con mensajeAdmin autorizado |
| Solicitud PENDIENTE_FIRMA | “Consultar autorización” → detalle; no afirmar que ya está firmada |
| Solicitud PENDIENTE o apertura pendiente | “Revisar solicitud” → resumen/datos/documentos en lectura |
| Contacto rápido con propuesta guardada | “Consultar propuestas” → resumen de propuestas; edición queda en módulo existente |
| Estado aprobado con entrega pendiente | “Consultar seguimiento” → detalle; acción de logística permanece en legacy |
| Rechazada o estado no reconocido | “Ver detalle” y estado literal; no iniciar otra solicitud automáticamente |

No inferir cliente con mora, bloqueo documental o presupuesto faltante por un campo opcional vacío. No agregar métricas ni crear estados; los contadores, si se agregan en otra tarea, deben aclarar fuente/alcance.

### Fuera de Fase 2B

Editor/aceptación/rechazo de presupuestos; cálculos financieros y mapeo fiscal; aprobación/dictamen/asignación; carga/reemplazo de documentos; contratos/pagaré/mandato; pagos/recibos; migraciones; stock/reservas; proveedor/despacho/entrega/rendición; borrado; notificaciones; cambios de schemas o permisos. No se traslada ninguna de W01–W26 como handler nuevo en Solicitudes V1. Los documentos legales tampoco se regeneran desde el detalle: sólo se muestran referencias existentes cuando estén autorizadas.

## 11. Detalle de solicitud

Ruta recomendada: **`/admin/solicitudes/[source]/[id]`**, con source allowlist exacta `solicitudes` o `solicitudes_cuenta`; ejemplo conceptual `/admin/solicitudes/solicitudes_cuenta/ID`. Es más explícita que `[id]` solo y evita colisiones. Alternativa válida: `[id]?source=...` únicamente si source obligatorio y validado en cada entrada; la ruta compuesta reduce olvidos. No crear esta ruta ahora.

- Validar source antes de consultar; source inválido → error/404 seguro. Hacer getDoc exacto de esa colección/ID; inexistente → no encontrado, sin fallback a la otra colección, sin búsqueda por DNI ni alta sustitutiva.
- Colección/ID no sustituyen autorización. Mantener el shell y la protección Admin actuales y el control de reglas; no usar localStorage como autoridad de rol. No ampliar permisos como efecto del nuevo reader.
- La réplica vinculada puede mostrarse como vínculo separado si está verificada por clienteId y es inequívoca; no reemplazar silenciosamente el origen ni combinar snapshots/planes de ambos registros.
- Retorno a bandeja conserva fuente, filtros, búsqueda, orden y selección navegable; no guardar datos personales de más en URL/localStorage. Si el registro desaparece, mostrar no encontrado sin redirigir a otro cliente.

| Sección | Datos de V1 | Modo en 2B / límite |
| --- | --- | --- |
| Resumen | Referencia compuesta, fuente/tipo, cliente/bien, estado original, fecha real y próxima acción de lectura | Sólo lectura; referencia corta visual no reemplaza el ID completo transportado |
| Datos | Identidad/contacto/domicilio por proyección de fuente; datos ausentes explícitos | Sólo lectura; sin guardar/asignar/dictaminar |
| Propuestas | Presupuestos embebidos y resumen de opciones/snapshots disponibles; distinguir formato legacy y moderno | Sólo lectura; sin cálculo, defaults inventados, aceptación o mezcla de plazos; no asumir colección independiente |
| Documentos | URLs existentes por fuente y estado de disponibilidad; autorización registrada sólo con sus campos reales | Lectura de metadatos y abrir archivo permitido; sin upload, firma, cambio de estado, edición legal o PDF nuevo |
| Actividad | Sólo fechas/hechos explícitamente almacenados (creación, entrega, firma u otro hecho con su fuente) | Sólo lectura; no hay event log universal. Sin fecha real, no inventar evento; informar “Sin actividad registrada” tras carga correcta |

Estado de carga/error por registro y sección; el detalle no bloquea su identidad por una consulta auxiliar fallida. Reusar presentación pura de datos permitidos, no un objeto completo pasado a componentes públicos. En una vista Admin pueden existir datos internos legítimos, pero no se añaden al payload de PDF/WhatsApp ni se exponen por compartir enlaces.

## 12. Convivencia legacy

`/admin/validaciones` conserva todas sus funcionalidades actuales. La nueva bandeja/detalle no la sustituye inicialmente y no duplica ninguna mutación. El nuevo destino Solicitudes del shell se cambiará sólo durante una implementación autorizada; Documentación/Logística mantienen sus compatibilidades hasta sus fases propias. Este documento no modifica navigation.ts.

### Límite actual de enlaces contextuales

Hoy no basta con `/admin/validaciones?tab=...&solicitudId=...&source=...`: V ignora esos parámetros. No venderlo como enlace determinístico. Tampoco usar DNI como fallback automático: puede haber varias operaciones y dos colecciones con el mismo ID.

### Adapter mínimo propuesto para Fase 2B

1. Nueva vista construye un destino sólo con source validado, documentId y tab solicitado de allowlist; etiqueta “Continuar en gestión avanzada”. El operador debe conocer que entra a un módulo legacy con efectos existentes de carga.
2. En una modificación acotada y autorizada del legacy, añadir un receptor de identidad **de navegación**, tras resolución de Auth y carga de la fuente pertinente. Comprueba existencia exacta y source, sin crear registros ni ejecutar un handler de guardado para localizar.
3. Para una solicitud visible en el tab, calcula la clave de grupo actual y selecciona la operación exacta (no la primera por nombre). activeProductSolId sólo guarda ID hoy; el receptor debe evitar resolver por ID en un grupo mixto ambiguo. Si no puede representar la fuente sin colisión, muestra limitación y no selecciona otro registro.
4. Para una apertura excluida de la bandeja actual (p. ej. Aprobado/Rechazado), no prometer expansión que el render no permite. Mostrar estado de incompatibilidad o un enlace explícito a una réplica verificada y elegida por el operador, con su identidad propia; nunca cambiar source silenciosamente.
5. Resultado: operación exacta expandida o mensaje “No se pudo abrir esta operación en gestión avanzada”; ningún fallback de mutación. El `tab=aperturas` legacy construido por alertas necesita traducción explícita a analisis, ya que no hay tab visible propio.
6. Ante identidad inexistente, parámetros incompletos, fuente rechazada, doble coincidencia o carga fallida, mantener fail-closed. Volver conserva contexto de la bandeja nueva.

Si ese adapter exige alterar agrupación o comportamiento funcional más allá de navegación, separarlo en una tarea previa; en 2B ofrecer acceso general al módulo, claramente rotulado como general y sin fingir localización. Abrir V seguirá pudiendo disparar sus migraciones actuales: eliminarlas requiere tarea funcional independiente; la garantía de cero escrituras al abrir aplica a las **vistas nuevas**, no se puede prometer para el legacy intacto.

## 13. Plan incremental

| Paso | Alcance futuro | Criterio de salida |
| --- | --- | --- |
| 2B.0 | Contrato de identidad/proyección y loaders puros | Dos documentos con mismo ID conviven; loaders no siembran ni migran |
| 2B.1 | Bandeja `/admin/solicitudes` con búsqueda/filtros | Cobertura de ambas fuentes y error parcial explícito; ninguna mutación al navegar |
| 2B.2 | Detalle source/id y cinco secciones de lectura | Referencia consistente, unknown/no encontrado sin fallback ni defaults financieros |
| 2B.3 | Adapter de continuidad legacy, si cabe como navegación acotada | Abre objeto exacto o declara limitación; no duplica mutaciones |
| 2B.4 | Cambio acotado del enlace Solicitudes en shell y regresión | Todas las rutas anteriores disponibles, guardas Admin conservadas |
| Posterior | Documentación, presupuestos, cobranzas y logística como módulos propios | Extracción por contrato y pruebas específicas; no big-bang de las 4983 líneas lógicas |
| Separada funcional | Auto-migración/sembrado, idempotencia, espejos, firma, planes y ledger legacy | Autorización explícita de alcance, diseño de atomicidad y pruebas; no esconder correcciones bajo refactor UI |

No confundir extraer componentes con hacer seguro un handler que escribe varios documentos. La primera fase puede entregar una lectura útil sin trasladar mutaciones delicadas.

## 14. Quality gates propuestos

### Inventario de protección existente

| Área | Suites actuales | Qué cubren / qué no prueban |
| --- | --- | --- |
| Validaciones | No se encontró suite que monte V ni invoque sus handlers locales | Las funciones están cerradas dentro del componente; no hay evidencia de cobertura de auto-migración, borrado cruzado, firma manual o regeneración de plan de entrega |
| Routing y presupuestos | testBudgetAlertRoutingFlow.ts | Helpers de alertas, resolución y lifecycle del editor, simulaciones de persistencia/race y límites antes de compartir. Verifica construcción de URL hacia Validaciones, no que V consuma query; no protege sus handlers legacy |
| Productos manuales / PDF | testManualBudgetProductsFlow.ts | CANONICAL_V1 + MANUAL_FACTOR_V1, opciones, snapshots, idempotencia de alta catálogo, payload cliente y PDF renderizado. No valida el borrador local de V por usar palabras similares |
| Pricing | testCanonicalPricingEngine.ts, testEndToEndPricingFlow.ts | Cálculos/validaciones canónicas e integración simulada; no navegador y no certifica los cálculos locales del editor legal |
| Ledger | testLedgerEngine3B2.ts; testLedgerEmulator3B2.ts | Cálculos en memoria; persistencia/autorización de motor ledger en emulador. No equivale a handleProcesarPagoFinal que escribe planPagos directo |
| Panels | testE2EThreePanels3B5D.ts; testSellerAccountUI3B5C2.ts | Handlers API/roles y cuenta/operaciones en emuladores; no monta JSX de Validaciones |
| Rules / seguridad | testFirestoreRules3B6A.ts; testProductionAuthEmulatorGuard.ts; testRuntimeGuards.ts | Reglas REST en emulador y guardas fail-closed; no despliegue ni permiso a ampliar schemas |
| Browser smoke | runBrowserSmoke.ts → runMobileBrowserSmokeTest.ts | Tres roles y cuatro viewports con auth/ruta/contenido/overflow/navegación/logout. Admin abre `/admin` y `/admin/comisiones`; no recorre decisiones/stock/legal de V ni la futura ruta Solicitudes |
| Comisiones/liquidaciones | suites emulator de commissions, settlements y commissions-ui | Regresión de motores/handlers propios; no evidencia de ejecución de la notificación local de W08 |

### Comandos de Fase 2B

Obligatorios ante código: `git diff --check`, `npx tsc --noEmit`, ESLint sólo archivos tocados/nuevos, `npm run test:safe`, `npm run build`. Ejecutar emuladores para la nueva lectura/identidad y reglas, más `test:emulator:panels` si se toca integración de rol/API. Mantener browser smoke completo 12/12 y añadir pruebas específicas de bandeja/detalle/continuidad; no sustituir los gates existentes por nuevas expectativas más débiles.

Entorno explícito para servidor/tests con Firebase: `GCLOUD_PROJECT=demo-cuenta-hogar`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cuenta-hogar`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`. Cliente desarrollo: `NEXT_PUBLIC_E2E_TEST_MODE=1` y `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`, más configuración web demo del wrapper. Node 24 y Java 21, comandos del runtime fijados; no instalar runner por suposición. Storage no está emulado: V1 no debe cargar archivos durante estas pruebas. No copiar credenciales productivas ni relajar guardas para ejecutar.

### Nueva cobertura necesaria

Proponer `testAdminSolicitudesReadModel.ts` (nombre futuro, no creado): prueba de proyección/identidad para dos colecciones con mismo ID, variantes de campos y casing, múltiples operaciones de una persona, fechas ausentes/Timestamp preservados, estados desconocidos, filtros/búsqueda sin perder source y cero inferencias financieras. No importar V para ejecutar estas pruebas.

Complementar con integración demo y browser: fixtures en ambas fuentes, detalle que lee sólo source/id exacto, source inválido/inexistente y permisos denegados, error parcial/reintento sin vacío engañoso, carga obsoleta de A que no pisa B, retorno con filtros, y contador de escrituras **cero tras el setup** al cargar/buscar/abrir detalle de una apertura Aprobado sin réplica y con vendedores vacío. Esto detecta accidental reutilización de fetchAperturas/obtenerVendedores. La continuidad legacy se verifica con colección+ID, ID duplicado, fuente excluida de filtros y enlace general declarado cuando no sea localizable; no dispara aprobación para hacer visible un registro.

Si se autoriza editar el receptor de navegación legacy, añadir prueba sobre el consumidor real, no sólo sobre la URL generada. La suite de ledger sigue siendo regresión; no usar su PASS como prueba de W08/W22. No modificar assertions para hacer pasar fallos funcionales.

### Verificación de esta entrega documental

Sólo se creó `docs/ADMIN_SOLICITUDES_DECOMPOSITION.md`. Lectura estática, inventario AST y comprobación de cobertura de tablas/referencias y whitespace; no se ejecutaron tests, build, navegador, imports con Firebase, llamadas BCRA ni consultas productivas. Conteos verifican sitios de código, no resultados de ejecución. No se modificó el archivo auditado, dependencias, reglas, schemas, estados, pricing o documentos legales. No hubo commit, push ni deploy. No se reporta ninguna suite como PASS en esta tarea.
