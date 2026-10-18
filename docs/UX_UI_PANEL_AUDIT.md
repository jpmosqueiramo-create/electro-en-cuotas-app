# Cuenta Hogar — Auditoría UX/UI de los tres paneles

Fecha: 17 de octubre de 2026. Rama: `design/panels-ux-audit`.
Base revisada: `32600ebd0ff3e691333a5b87499cc42b5ed9f7d2`, coincidente con `origin/main` después de fetch y pull. Esto no acredita qué SHA está desplegado.

## 1. Resumen ejecutivo

La aplicación reúne buena parte de las funciones necesarias para operar, pero la experiencia se organiza alrededor de módulos técnicos y páginas extensas, más que de la próxima tarea del usuario. Admin ya adopta mayormente la identidad institucional; Cliente y Vendedor Afiliado mantienen una identidad oscura anterior. La prioridad es corregir mensajes y estados que pueden inducir a error, asegurar legibilidad y acceso por teclado, y después reorganizar la navegación y compartir patrones visuales.

No se modificó código, estilos, lógica, Firebase, reglas ni documentos legales. El único entregable es este informe. Se leyeron completamente `AGENTS.md` y `CODEX_RUNTIME.md`; se inventariaron las 11 rutas Admin y las dos rutas de los otros roles, sus estructuras JSX, estados, acciones y dependencias relacionadas. La revisión es estática del repositorio: no se inició sesión, no se consultaron datos productivos y no se ejecutó navegador. Responsive y accesibilidad se evalúan por clases y marcado; no se certifican render, contraste global, tiempos, permisos efectivos ni usabilidad con personas. Los recorridos descritos son inferidos del código, sin métricas de uso ni conteos de clics medidos.

**Hallazgos prioritarios:** texto blanco sobre superficie clara en Historial de Validaciones; confirmación de pago en Cliente condicionada sólo por entrega; solicitudes que requieren información sin una presentación específica; copy de venta/crédito en Vendedor Afiliado y Admin; navegación fragmentada y retroalimentación de errores desigual.

Las referencias `archivo:línea` corresponden a la base auditada y permiten localizar evidencia; no describen cambios realizados.

## 2. Problemas globales

| ID | Hallazgo y evidencia | Consecuencia | Dirección propuesta |
| --- | --- | --- | --- |
| G01 | `AdminNav.tsx:97` ofrece 11 destinos horizontales; Cliente y Vendedor Afiliado construyen encabezados propios | Orientación y acceso distintos entre roles; destinos fuera del área visible en móvil | AppShell por rol con navegación consistente |
| G02 | `admin/remitos/page.tsx:185` y `admin/reportes/page.tsx:275` dibujan encabezados propios aunque importan AdminNav | Navegación Admin cambia al entrar a esos módulos | Un único shell; título y herramientas por página |
| G03 | `globals.css:3` define tokens institucionales, pero los portales usan literales oscuros y acentos anteriores | La misma marca parece pertenecer a productos distintos | Tokens semánticos y variantes compartidas |
| G04 | Validaciones mezcla análisis, logística, cobranzas, historial y editor legal; comisiones mezcla vendedores, caja y liquidaciones | Sobrecarga y detalles difíciles de reencontrar | Bandejas por tarea y expediente con secciones |
| G05 | Uso frecuente de `alert`/`confirm`; errores de carga sólo en consola en Clientes, Reportes y Afiliado | Interrupciones y posible confusión entre fallo y vacío | Error persistente con reintento; confirmación contextual |
| G06 | Tablas, badges y formularios utilizan textos de 9–12 px y mayúsculas extensas | Lectura difícil, especialmente en campo | Tipografía operativa mayor y jerarquía acotada |
| G07 | Hay modales locales con `fixed inset-0`; búsqueda sin resultados de `role="dialog"` y `aria-modal` en los paneles revisados | Semántica de diálogo ausente; gestión de foco por validar | Modal compartido accesible y drawer para detalle |
| G08 | Cliente y Vendedor Afiliado usan estado local para filtros, formularios y tabs | No hay destino propio para retomar cada subvista; recargar reinicia selección | Rutas/subrutas o parámetros de navegación persistentes |
| G09 | `FloatingWhatsApp.tsx:45` oculta soporte flotante en los tres paneles | El portal Cliente no ofrece un acceso de soporte equivalente | Soporte explícito dentro del shell |
| G10 | Carga, vacío, error, bloqueo y éxito no siguen un contrato común | Falta claridad sobre resultado y próxima acción | Biblioteca de estados por contexto |

Una reorganización de UX no autoriza modificar reglas, estados persistidos, colecciones, motores, comisiones o documentos congelados. Las vistas compartidas deben recibir datos permitidos por rol, sin transportar información administrativa a Cliente.

## 3. Auditoría Admin

### Inventario de rutas y módulos

Todas las rutas siguientes se revisaron en `src/app/admin/`. Los tamaños son líneas del archivo, indicador de concentración, no prueba autónoma de mala UX.

| Ruta / líneas | Contenido, acciones y formularios | Listados, alertas, métricas y estados | Responsive y observación |
| --- | --- | --- | --- |
| `/admin` / 263 | Inicio con nueve tarjetas de módulos; abrir destino y marcar alerta leída | Alertas no leídas, tipo, mensaje y fecha; sin resumen consolidado de pendientes | Grid 1/2/3 columnas; navegación global horizontal; directorio pesa más que prioridades cuando no hay alertas |
| `/admin/validaciones` / 4982 | Análisis de solicitudes y aperturas, datos personales, documentación, consultas externas, asignación, presupuestos, dictamen, contrato/pagaré, logística, pagos, eliminación | Cuatro tabs visibles: análisis/logística/cobranzas/historial; aperturas integradas en la bandeja; tarjetas expandibles; aprobaciones, entrega y cuotas | Tabs con ancho mínimo y contenido extenso; múltiples niveles de expansión y overlays; mayor concentración de responsabilidades |
| `/admin/productos` / 1362 | Alta/edición de catálogo, imágenes, costos y planes; publicar/ocultar; unidades por localidad y traslado con remito | Inventario general y stock por unidad; estados de publicación y disponibilidad | Formulario amplio antes del inventario; modales de stock/traslado; separar catálogo, edición y logística |
| `/admin/cartera` / 787 | Planes, pagos/recibos, contacto, notas, promesas y eliminación | Alertas de promesas; resumen por operación, cuotas y bitácora; vacío | Tarjetas y detalle expandido; varias funciones coinciden con cobranzas en Validaciones |
| `/admin/comisiones` / 1314 | Vendedores, porcentajes, comisiones, pagos, rendiciones, resumen y custodia de fondos | Tabs comisiones/rendiciones/resumen; tablas e historiales; pendientes y modales de edición/pago | Tabs envueltos y tablas con scroll horizontal; administración de red y caja compiten en la misma vista |
| `/admin/rendiciones` / 7 | Reutiliza `AdminComisionesPage initialTab="rendiciones"` | Misma pantalla con tab inicial distinto | Reutilización real; dos destinos globales para una misma superficie operativa |
| `/admin/presupuestos` / 2261 | Búsqueda/estado, crear/reabrir, vincular solicitud o confirmar creación; catálogo, manuales, múltiples opciones; guardar, PDF y WhatsApp | Historial y editor modal; estados de carga, cálculo, persistencia y guardado | Modal largo con scroll; IDs técnicos en subtítulo; preservar controles antes de compartir |
| `/admin/clientes` / 251 | Directorio que combina aperturas y solicitudes, búsqueda y contactos/accesos relacionados | Tarjetas de identidad, documentos identificatorios, contacto, origen y contadores; carga/vacío | Grid adaptable; detalles dispersos respecto del expediente; error de carga queda en consola |
| `/admin/remitos` / 516 | Búsqueda/filtros, PDF, eliminación y configuración del emisor | Totales, remitos de mandato y traslado, registro con cliente/bien/serie/contrato | Encabezado propio con enlaces parciales; datos truncados; configuración empresarial junto a consulta diaria |
| `/admin/reportes` / 563 | Cobros, fletes, comisiones; búsqueda, CSV y copiar a Sheets | Totales por tipo y tablas de 8–10 columnas; carga y vacíos por reporte | Encabezado propio con retorno a inicio; tablas horizontales; “Excel (.CSV)” necesita precisión |
| `/admin/envios` / 1133 | Configuración de localidades, cargas, matriz de tarifas, preview y ajustes; guardar borrador/publicar | Activo/visible/manual, última publicación, edición de destinos y cargas | Matriz con mínimos de 200/150 px; scroll necesario; es configuración de servicio, no bandeja de entregas |

**Páginas monolíticas identificadas (7):** Validaciones, Presupuestos, Productos, Comisiones, Configuración de Envíos, Cliente y Vendedor Afiliado. Reúnen edición, consulta y varias subtareas con estado local en un archivo; Configuración de Envíos puede conservar un área única con secciones internas. Cartera también necesita revisar su detalle, sin contar su extensión por sí sola como un monolito adicional. Rendiciones es un wrapper, no otro monolito.

### Respuestas UX A–H

**A. Tarea principal:** resolver pendientes de solicitudes, documentación, presupuestos, cobros y entregas, manteniendo trazabilidad.

**B. Pantalla inicial:** responde parcialmente. Las alertas tienen enlaces contextuales mediante `resolveAlertAction` (`admin/page.tsx:201`), una base valiosa. Sin alertas, predominan nueve accesos equivalentes sin volumen, vencimiento o responsable. “Centro de Monitoreo Root” no explica la tarea diaria.

**C. Peso excesivo:** catálogo de módulos, explicación institucional repetida, títulos técnicos, submenús y métricas históricas mezcladas con trabajo pendiente.

**D. Información escondida:** logística y cobranzas bajo Validaciones; vendedores bajo Comisiones; estado documental dentro de expansiones; contexto de expediente fragmentado entre Clientes, Presupuestos y Validaciones.

**E. Duplicaciones:** accesos en tabs globales y tarjetas iniciales; dos rutas al centro de comisiones/rendiciones; cobros/recibos/bitácora en Cartera y Validaciones; perfiles/documentación repetidos para aperturas y solicitudes. La duplicación de UI no implica que sus reglas de negocio sean intercambiables.

**F. Recorridos largos:** desde inicio a Validaciones, cambiar tab, localizar cliente, expandir y buscar acción; para pagos, localizar la operación entre tarjetas y después abrir cuota/modal. Presupuestos puede volver a Validaciones por enlace genérico (`presupuestos/page.tsx:1292`), con pérdida de contexto potencial. Conservar enlaces de alerta ya específicos y ampliar navegación por identidad de solicitud.

**G. Separaciones:** Validaciones → Solicitudes, Documentación, Logística y acceso a Cobranzas; Comisiones → Red de vendedores afiliados, Liquidaciones y Rendiciones; Productos → catálogo/edición y stock/traslados; Presupuestos → historial y editor con destino propio. Separar por responsabilidad y estado, no por cantidad de líneas únicamente.

**H. Dashboard:** pendientes por antigüedad y próximo vencimiento, pagos informados a verificar, documentos faltantes, presupuestos por continuar y entregas bloqueadas. Cada contador abre su bandeja filtrada. Reportes y configuración quedan secundarios. No inventar indicadores ni cifras sin fuente.

## 4. Auditoría Cliente

Ruta única `src/app/cliente/page.tsx`, 1120 líneas. Usa AuthProvider, Firebase cliente, subida de documentos y generadores PDF; no importa AdminNav ni un shell compartido.

### Inventario actual

- Acceso: carga de portal, redirección si no hay usuario, verificación de correo, reenvío, recarga manual y cierre de sesión (`:489–535`).
- Encabezado: saludo, DNI enmascarado, Ver opciones, Mis datos y logout (`:539–575`).
- Métricas: operaciones, cuotas abonadas, cuotas pendientes/vencidas y próximo vencimiento/importe (`:580–648`).
- Formularios inline: contacto y solicitud de compra con bien, identidad, domicilio y cuatro adjuntos (`:651–750`). No son diálogos aunque los comentarios los llamen modal.
- Navegación: filtros Todas/Entregadas/En evaluación; CTA de solicitud; vacío y vinculación de operaciones por DNI (`:753–837`).
- Operación: producto, fecha, legajo, plan; badges Entregada/en curso, Compra confirmada, No procede y En evaluación (`:843–910`).
- Pagos: plan, importe/vencimiento, recibo PDF, comprobante externo, estado de cuenta PDF, monto y archivo para informar un pago; estado En revisión y bloqueo por cuota anterior (`:914–1101`).
- Entrega: resumen después de marcar entregado; no se identificó una timeline dedicada de preparación/traslado/entrega en esta vista.
- Responsive: `p-4 md:p-8`, resumen 2/4 columnas y filas de cuotas apiladas en móvil; planes con scroll vertical propio `max-h-80`; controles de archivo y etiquetas de 9–10 px requieren prueba en pantallas angostas.

### Respuestas UX A–H

**A.** Saber cómo va su operación y qué debe hacer, consultar cuotas, informar pagos y recuperar documentos.

**B.** Parcialmente: muestra resumen, pero la próxima acción compite con cuatro métricas y la captación de una nueva solicitud. Un vencimiento debería vincularse directamente a su operación y acción.

**C.** Contadores históricos, todos los planes expandidos y nueva compra tienen demasiado peso frente a un documento faltante o un pago pendiente.

**D.** Documentos y recibos están dentro de cuotas; no hay centro de documentos ni soporte visible propio. El tipo incluye `REQUIERE_INFO` y `mensajeAdmin` (`:20–21`), pero el badge final los engloba como En evaluación; falta un tratamiento que explique el dato solicitado.

**E.** Ver opciones y nueva solicitud representan entradas distintas hacia la intención de iniciar otra gestión; conviene unificar su propósito y conservar selección de producto. Los recibos se repiten por cuota correctamente, pero falta una vista agregada para encontrarlos.

**F.** Para informar un pago hay que recorrer operaciones y un plan con scroll propio, encontrar la cuota habilitada, completar monto, adjuntar y enviar. Proponer acceso contextual desde Inicio, manteniendo identidad de cuota y reglas actuales.

**G.** Separar Inicio, operación, cuotas/pago, documentos y perfil. Sacar los formularios extensos del medio del dashboard.

**H.** Una tarjeta principal por próxima acción: completar información, revisar propuesta cuando corresponda, informar pago o consultar entrega; después, resumen de operación y vencimiento. Con múltiples operaciones, selector explícito y alertas asociadas.

### Riesgos de comprensión

`cliente/page.tsx:902–910` muestra “PAGO VERIFICADO POR CENTRAL” dentro de la condición `estadoEntrega === "ENTREGADO"`, sin comprobar `estadoRendicion` en ese bloque. La interfaz puede afirmar una verificación que esa condición no acredita. Presentar entrega y verificación de pago como estados independientes; cualquier cambio futuro requiere revisar las fuentes autoritativas.

“Ingresar/Subir Recibo” debe distinguir el comprobante aportado por el cliente del recibo emitido tras acreditar un pago. Un pago informado no equivale a un pago confirmado. Tampoco se debe transformar “no cargó” en “no tiene operaciones”.

## 5. Auditoría Vendedor Afiliado

Ruta única `src/app/afiliado/page.tsx`, 939 líneas. AuthProvider, Firebase cliente, catálogo y documentos; encabezado, navegación y tarjetas propios.

### Inventario actual

| Sección | Contenido y acciones | Estados / límites UX |
| --- | --- | --- |
| Acceso y encabezado | Verificación de correo, reenviar, recargar, logout; catálogo oculto debajo de `sm` (`:366–373`) | Fondos oscuros y naranja; nombre del rol incompleto |
| Alertas globales | Promesas para hoy/vencidas; clic lleva a Clientes y expande la operación (`:376–392`) | Acceso contextual útil implementado con `div onClick`, sin semántica de botón |
| Carga | Catálogo, selección 12/8, email, nombre, DNI, teléfono, domicilio y cuatro adjuntos (`:415–510`) | Tarjetas de planes clicables con `div`; envío bloqueado sin plan/producto; sin progreso por archivo |
| Seguimiento, tab inicial | Entregas, confirmación de recepción física, serie, importes/método y observación; listado de solicitudes (`:515–713`) | Logística y seguimiento mezclados; no es una agenda de tareas |
| Comisiones | Notificaciones, estado de pago, importe asociado y marcar leída (`:718–769`) | Es “Mis Comisiones y Avisos”, no una cuenta corriente completa con movimientos y conciliación |
| Clientes | Agrupa operaciones entregadas por DNI/CUIL; selector de producto; cuotas pagadas/restantes/vencidas; últimos pagos, próximas cuotas, bitácora y promesa (`:773–933`) | Filtro de entregados limita el directorio; operación saldada puede desaparecer; textos técnicos y etiquetas estigmatizantes |

Responsive: contenedor `p-8` también en móvil; cuatro tabs apilados debajo de `sm`; formularios con 1/2 columnas; algunos resúmenes conservan tres columnas. No hay bottom nav ni shell persistente. En móvil, encabezado, alertas y cuatro botones consumen espacio antes del trabajo. Validar densidad real con teclado abierto, texto largo y varios productos.

### Respuestas UX A–H

**A.** Gestionar solicitudes de clientes asignados, realizar seguimiento, registrar recepción/entrega y gestiones de cobranza, consultar comisiones propias.

**B.** Parcialmente: inicia en Seguimiento y destaca promesas cuando existen, pero no reúne todas las tareas de hoy ni sus bloqueos.

**C.** Navegación numerada como si fuera un proceso obligatorio, alertas enfáticas, sombras brillantes y contadores de deuda; comisiones y avisos se confunden.

**D.** Entregas y recepciones están en Seguimiento; cobranza dentro de Clientes expandido; el directorio sólo considera entregados. Cuenta corriente no tiene una sección dedicada en esta página.

**E.** Un mismo cliente aparece en seguimiento y cartera con distinto contexto; el registro de notas/promesas repite patrones Admin. Mantener vistas por tarea con acceso a una ficha única, respetando permisos.

**F.** Clientes → cliente/producto → Abrir Panel y Pagos → bitácora → nota/fecha → Registrar Voluntad. Una promesa ya tiene atajo desde alerta: conservarlo y convertirlo en interacción accesible. Para nueva solicitud, formulario y adjuntos extensos sin etapas de revisión.

**G.** Separar Tareas, Clientes/ficha, Solicitudes, Entregas, Cobranzas y Mi cuenta. Comisiones y notificaciones deben tener entidades y filtros diferenciados.

**H.** Agenda con promesas exigibles, solicitudes con información faltante, recepciones y entregas asignadas. Saldo/comisiones como resumen secundario con fecha y acceso al detalle; no modificar reglas de liquidación.

## 6. Inconsistencias visuales

| ID | Elemento | Evidencia actual | Criterio objetivo |
| --- | --- | --- | --- |
| V01 | Colores/fondos | Admin `#F7F3EC/#FFFDFC`; Cliente `#111318/#1B2027/#FFD21A`; Afiliado `#121316/#181920/#fe5000` | Paleta institucional común; color semántico separado de marca |
| V02 | Residuos en Admin | Naranja `#fe5000` en Remitos `:190,225`; carga de AdminProtectedRoute `:18` oscura/naranja | Misma identidad también en carga, overlays y hover |
| V03 | Contraste | Historial en `validaciones/page.tsx:2112`: `bg-[#FFFDFC] text-white`; encabezados blancos en tarjetas claras en `:2159,2875,3321` | Auditar combinaciones reales; corregir texto/fondo antes del rediseño |
| V04 | Bordes y radios | Institucional `#DED8CF`; zinc/gris en portales; radios desde rounded hasta 3xl/full | Bordes y escala de radios por función |
| V05 | Sombras | Admin shadow-xs/2xs; portales shadow-2xl, shadow-black/80 y glows amarillos | Elevación discreta; reservar overlay para foco |
| V06 | Tipografía | Manrope + Source Sans 3 en layout; uso irregular de font-heading, font-black, mono y tracking-widest | Roles tipográficos estables; mono sólo en identificadores/valores si aporta |
| V07 | Botones | CSS global altura 50 px frente a botones locales de 9–12 px y padding variable; CTA verde, amarillo, azul y naranja | Primario institucional, secundario, textual y peligro; tamaños acordados |
| V08 | Badges | Pill/full, rectangulares, mayúsculas, emojis y pulsos; rol/estado/urgencia mezclados | Texto claro + icono opcional; no depender del color |
| V09 | Inputs | Placeholder global con `!important`, excepciones por fondo en globals.css, focus azul/amarillo/naranja; labels pequeños | FormField semántico con label asociado, ayuda, error y focus común |
| V10 | Cards | Inicio Admin, resumen Cliente y cartera Afiliado resuelven padding/jerarquía por separado | Variantes MetricCard y ActionCard, no una card universal sin semántica |
| V11 | Tablas | Reportes 8–10 columnas y tarifas con anchos mínimos; tipografía densa | Tabla desktop; resumen por fila en móvil y detalle accesible |
| V12 | Modales | Overlays claros en Productos, oscuros en Comisiones y Presupuestos; formularios inline llamados “modal” en comentarios Cliente | Diferenciar Modal, Drawer y página de edición |
| V13 | Navegación | Tabs horizontales Admin, enlaces sueltos Remitos, retorno Reportes, filtros Cliente y tabs apilados Afiliado | Shell estable y selección actual comunicada también con semántica |
| V14 | Movimiento/iconos | Lucide más emojis; bounce/pulse en alertas y estados | Lucide consistente; movimiento reducido para elementos operativos |

Se detectan 14 categorías visuales, no 14 ocurrencias totales. Las combinaciones estáticas de V03 son evidencia verificable; otros contrastes y tamaños táctiles requieren medición renderizada. `globals.css` sólo limita el marquee con reduced-motion; no establece una política equivalente para todos los pulsos de los paneles.

## 7. Inconsistencias de copy

Propuestas conceptuales de interfaz, sujetas a validar el significado del proceso. No constituyen dictamen jurídico ni autorizan cambios en contratos, pagarés, PDFs congelados o estados de base de datos. Las denominaciones internas de evaluación no deben sustituirse mecánicamente si describen una función técnica real.

| ID | Ubicación | Texto actual / contexto | Propuesta conceptual |
| --- | --- | --- | --- |
| C01 | `admin/page.tsx:54–55` | “Aprobación y firma digital de créditos”; “solicitudes de crédito” | “Revisión de solicitudes y documentación”; explicar la autorización del mandato según mecanismo real |
| C02 | `admin/page.tsx:66,77` | “precios de venta en cuotas”; “créditos en calle” | “Catálogo y planes de la propuesta”; “Operaciones y cuotas pendientes” |
| C03 | `admin/page.tsx:98–104,124,135` | “red de ventas”, “Red Ventas”, “fuerza de venta”, “historial crediticio” | “Red de vendedores afiliados”, “presupuestos preparados”, “historial de operaciones” donde corresponda |
| C04 | `admin/validaciones/page.tsx:2099` | “solicitudes de crédito, análisis scoring DNI y firma digital” | “Solicitudes, verificación de información y documentación del mandato” |
| C05 | `admin/validaciones/page.tsx:1393,3222` | Alerta de “firma digital”; “Firmado Digitalmente” | Nombrar el mecanismo efectivamente acreditado; no afirmar una categoría jurídica desde un badge |
| C06 | `admin/validaciones/page.tsx:2950,3160` | “Perfil Crediticio”, “Dictamen Crediticio” internos | Revisar con responsables si son términos técnicos necesarios; separar revisión interna del mensaje al cliente |
| C07 | `admin/productos/page.tsx:530`; `admin/cartera/page.tsx:338` | “multiplicador de financiamiento”; “créditos en calle” | “Configuración interna de planes”; “Seguimiento de operaciones y cobranzas”; conservar datos internos sólo en Admin |
| C08 | `admin/clientes/page.tsx:119`; `admin/reportes/page.tsx:516,519` | “antecedentes crediticios”, “Afiliado / Asesor”, “Monto Venta” | “Historial de operaciones”; “Vendedor afiliado”; nombre preciso del monto sin alterar cálculo |
| C09 | `afiliado/page.tsx:300,308,417,510,653` | Venta/solicitud, nueva venta, expediente de venta y vacío “ninguna venta” | “Solicitud de gestión de compra”; “Enviar solicitud”; confirmación con referencia y próximo paso |
| C10 | `afiliado/page.tsx:418` | “evaluación crediticia de la mesa chica” | “Revisión de la solicitud por Cuenta Hogar”; explicar información pendiente sin jerga |
| C11 | `afiliado/page.tsx:777` | “clientes con financiación activa” | “Clientes con operaciones activas asignadas” |
| C12 | `afiliado/page.tsx:325,366`; `AdminNav.tsx:31,66` | “Portal del Afiliado”; “Comisiones”; “Centro de Monitoreo Root” | “Panel de Vendedor Afiliado”; “Comisiones de vendedores afiliados”; “Operación diaria” |
| C13 | `afiliado/page.tsx:801,854,879,926` | “MOROSO”, “Sin vector”, “Plan no regenerado”, “Registrar Voluntad” | “Cuotas vencidas”; “Plan no disponible”; “Registrar gestión / promesa de pago” |
| C14 | `cliente/page.tsx:907–910,1007–1012,1082–1091` | “Pago verificado por central”, “Auditando pago”, “Subir Recibo” | Confirmación sólo con evidencia; “Comprobante en revisión”; “Informar pago”/“Adjuntar comprobante” |
| C15 | `admin/reportes/page.tsx:300` | “Descargar Excel (.CSV)” | “Descargar CSV (compatible con Excel)” |
| C16 | `admin/presupuestos/page.tsx:1093` | `CANONICAL_V1` y `MANUAL_FACTOR_V1` en subtítulo | “Presupuestos de catálogo y productos manuales”; identificadores técnicos en contexto diagnóstico si son necesarios |
| C17 | `src/app/layout.tsx:30–37,49,66,109` (transversal) | Metadata y JSON-LD con “financiación propia”, “a sola firma” y electrodomésticos en cuotas | Revisar metadata heredada contra lenguaje de gestión de compra/mandato; hallazgo transversal fuera de los tres cuerpos de panel |

Son 17 grupos de copy, con múltiples ocurrencias. “Compra”, “cuotas”, “presupuesto”, “comisión” y consultas internas no son incompatibles por sí mismas. No se encontró una razón para eliminar esos conceptos indiscriminadamente. En Cliente, “En evaluación” requiere explicar etapa y próxima acción, no sustituirse automáticamente por otra etiqueta genérica. Unificar voseo y evitar alternar “tenés”, “tienes” y “debes”.

## 8. Arquitectura objetivo Admin

Sidebar persistente en desktop con secciones por trabajo:

1. **Hoy:** pendientes y alertas priorizados, con filtros por responsable, antigüedad y bloqueo.
2. **Solicitudes:** bandejas de nuevas, requieren información y listas para revisión; expediente estable con datos, documentación, propuestas y actividad.
3. **Presupuestos:** historial y editor dedicado; catálogo/manuales/múltiples opciones y vinculación explícita.
4. **Documentación:** pendientes de revisión/autorización y consulta de archivos permitidos; acceso contextual al expediente.
5. **Cobranzas:** vencimientos, pagos informados, promesas y estado de cuenta; rendiciones como subárea con contexto propio.
6. **Logística:** preparación, recepciones, entregas y remitos; stock y traslados relacionados. Configurar tarifas Low Cost es una subárea diferenciada de operar entregas.
7. **Vendedores afiliados:** directorio, asignaciones y acceso a cuenta/comisiones/liquidaciones.
8. **Catálogo, Reportes y Configuración:** áreas secundarias, sin competir con urgencias del día.

En móvil, barra inferior Hoy/Solicitudes/Cobranzas/Más y drawer de destinos completos; evitar una barra de 11 ítems. Tablas operativas pasan a listas resumidas con detalle, conservando vistas densas cuando la tarea lo exige. El shell mantiene rol, ubicación, retorno y cierre de sesión. No cerrar un editor ni perder filtros al consultar un expediente.

Modelo de navegación propuesto: bandeja filtrada → expediente identificado por colección e ID → tarea contextual → confirmación → retorno a la misma bandeja. Preservar `solicitudes` y `solicitudes_cuenta`, y los enlaces ya determinísticos de alertas; no reemplazar una vinculación fallida por una solicitud nueva.

## 9. Arquitectura objetivo Cliente

Mobile-first: navegación inferior **Inicio / Operaciones / Cuotas / Más**; Más contiene Documentos, Mis datos y Soporte, con atajos contextuales desde Inicio. En desktop, shell lateral o navegación visible con la misma jerarquía.

- **Inicio:** estado de operación y próxima acción explícita; fecha/importe del próximo vencimiento; entrega y documentos pendientes como tarjetas secundarias.
- **Operación:** selector si hay varias, timeline verificable, propuesta y documentación accesible por rol; no inferir aceptación desde una aprobación interna.
- **Cuotas:** próximas, informadas en revisión y confirmadas; informar pago en vista enfocada con resumen de operación/cuota, monto, archivo y resultado. Mantener reglas de elegibilidad existentes hasta una revisión funcional específica.
- **Documentos:** comprobantes aportados separados de recibos emitidos y documentos del mandato que estén disponibles para ese rol.
- **Entrega:** preparación/traslado/entrega sólo cuando existan estados y datos confiables; mostrar “Sin información disponible” cuando corresponda.
- **Mis datos y soporte:** formularios cortos con resultado persistente y acceso a ayuda con referencia visible de operación, sin información interna.

No imponer un CTA a pagar si hay un comprobante en revisión. Una operación rechazada, una que requiere información y otra en revisión necesitan mensajes y acciones diferentes. El vacío debe distinguir cuenta sin operaciones de error de carga o vinculación pendiente.

## 10. Arquitectura objetivo Vendedor Afiliado

Mobile-first: barra inferior **Tareas / Clientes / Solicitudes / Mi cuenta**. Entregas y Cobranzas son destinos propios accesibles desde Tareas y el menú, sin crear seis o siete ítems inferiores. Desktop mantiene todos los destinos en sidebar.

- **Tareas:** agenda por hoy, vencidas y próximas; cada item indica cliente, operación, motivo y una acción disponible.
- **Clientes:** directorio de asignados con ficha única; operaciones en evaluación y saldadas siguen siendo consultables con filtros apropiados.
- **Solicitudes:** creación por etapas Datos/Bien/Documentos/Revisión; después del envío, referencia y estado. No ampliar planes disponibles desde una decisión visual.
- **Seguimiento:** estados de solicitudes y documentación dentro de la ficha; acceso directo desde notificaciones relevantes.
- **Entregas:** recepciones y entregas asignadas separadas, checklist y confirmación contextual; diferenciar mercadería recibida, entregada y fondos rendidos.
- **Cobranzas:** vencimientos/promesas, notas y acciones autorizadas; evitar describir a la persona por su deuda.
- **Mi cuenta:** comisiones, movimientos, liquidaciones y rendiciones propias con periodos y fuentes claras; Avisos en un área separada. La página actual no prueba que todos esos datos estén integrados: implementación futura requiere verificar APIs, permisos y disponibilidad.

El vendedor afiliado es colaborador independiente. La arquitectura no modifica relación contractual, porcentajes, reglas de comisión, custodia o facultades para acreditar pagos.

## 11. Design System propuesto

### Tokens y reglas

Conservar sin cambios la base: verde `#173E3B`, terracota `#B44E2A`, fondo `#F7F3EC`, superficie `#FFFDFC`, texto `#1F2928`. Ya coincide con `globals.css`; no hay justificación para sustituirla. Mantener como complementarios existentes texto secundario `#68706E`, borde `#DED8CF`, éxito `#2F7D5C` y acento `#E7B86A`. Peligro, aviso e información deben definirse como tokens semánticos y verificarse sobre sus superficies antes de aprobar valores; no usar terracota como sinónimo de deuda.

Manrope para títulos/acciones; Source Sans 3 para lectura. Propuesta: títulos 24/28/32 px según contexto, cuerpo 16 px, secundario 14 px, metadatos 12 px; evitar 9–10 px en información necesaria. Espaciado 4/8/12/16/24/32; borde 1 px; radios 8 px controles compactos, 12 px campos/botones y 16 px cards/overlays; pill sólo para badges/chips. Elevación leve en cards y mayor únicamente en overlays.

Botones/inputs de 44–48 px como base táctil; no convertir iconos pequeños en blancos táctiles pequeños. Contraste objetivo AA (4.5:1 texto normal, 3:1 texto grande y elementos no textuales relevantes), foco visible y soporte de zoom/reflow: criterios de aceptación futuros, no certificación de esta auditoría. Respetar reduced-motion en todos los componentes operativos.

### Contratos conceptuales

| Componente | Responsabilidad | Comportamiento requerido |
| --- | --- | --- |
| AppShell | Estructura por rol | Navegación, área principal, estado de sesión, soporte y responsive; ningún dato sensible por defecto |
| Sidebar | Destinos desktop | Grupos por tarea, estado actual, contadores con nombre y permisos |
| MobileBottomNav | Destinos frecuentes | Máximo 4–5, etiquetas visibles, safe-area y espacio reservado sin tapar acciones |
| PageHeader | Orientación | Título funcional, contexto/retorno y una acción primaria; no repetir branding completo |
| MetricCard | Magnitud resumida | Valor, unidad, periodo/fuente y enlace a filtro; cero distinto de dato no disponible |
| ActionCard | Próxima tarea | Motivo, vencimiento, objeto y CTA inequívoco; evita competencia entre acciones primarias |
| StatusBadge | Estado de una entidad | Dominio explícito: solicitud, pago, entrega o rendición; texto/icono y color; sin fusionar estados |
| AlertCard | Incidencia accionable | Severidad, contexto, causa y acción; leer no equivale a resolver |
| DataTable | Comparación y operación | Cabeceras semánticas, búsqueda/filtros, orden/paginación cuando corresponda, carga/vacío/error y alternativa móvil |
| EmptyState | Ausencia explicada | Diferenciar sin datos, sin coincidencias y sin asignaciones; CTA pertinente |
| Modal | Decisión breve | Nombre accesible, foco inicial/retorno, contención del foco, Escape y confirmación de salida cuando proceda |
| Drawer | Detalle contextual | Mantener contexto de bandeja; en móvil ancho completo; mismas garantías de foco |
| FormSection | Grupo de campos | Label asociado, obligatoriedad, ayuda/error, resumen de validación, conservación de datos y estado de guardado |
| Timeline | Secuencia del expediente | Hechos fechados y fuente; pasos desconocidos visibles como desconocidos; adaptación por rol |

Estados comunes: cargando, listo, vacío, sin coincidencias, error con reintento, guardando, guardado, cambios sin guardar y acceso no disponible. No usar un spinner eterno cuando falla la carga. Success/Alert deben anunciarse de forma accesible sin depender de un `alert()` bloqueante.

## 12. Componentes compartidos

**Propuesta:** los 14 componentes solicitados en la tabla anterior, más `Button`, `FormField`, `FileUploadField`, `SearchFilterBar`, `ConfirmDialog`, `DocumentList`, `PaymentSummary` y `OperationSummary`: **22 componentes conceptuales**, a validar antes de extraerlos. Los últimos son composiciones de dominio con presentación permitida por rol, no motores nuevos.

**Reutilización existente:** AdminNav en la mayoría de módulos; AdminProtectedRoute y AuthProvider para acceso; Comisiones reutilizado desde Rendiciones; utilidades PDF y routing de alertas. `toClientBudgetPayload` ya es parte del flujo de PDF/WhatsApp de Presupuestos (`:966–1031`); preservar ese límite. Header/Footer públicos no constituyen un shell de panel y no deberían importarse por conveniencia.

**Duplicación comprobada:** encabezados locales, contadores, badges, formularios/overlays, bitácoras y cuotas. Además existe `src/components/BcraScoringPanel.tsx` y una implementación local homónima al final de Validaciones (`:4874–4982`); no son idénticas, por lo que extraer exige comparar comportamiento y consultas externas. Las tarjetas locales de producto tampoco deben convertirse en catálogo público con campos internos.

Primero acordar contratos, luego extraer por patrón validado. Un componente visual compartido no sustituye autorización en servidor, no recibe un documento Firestore completo para ocultar campos con CSS y no recalcula snapshots.

## 13. Prioridades P0 / P1 / P2

Criterio: P0 afecta comprensión de estados o acceso a acciones esenciales; P1 organiza operación y coherencia; P2 optimiza después de asegurar las anteriores. Son propuestas para trabajo futuro, no cambios autorizados por esta auditoría.

### P0 — 5 paquetes

1. **P0-01 — Veracidad de estados:** separar entrega/pago/rendición en Cliente y dar tratamiento explícito a REQUIERE_INFO. Aceptación: cada mensaje se corresponde con evidencia de su dominio y presenta una próxima acción válida; nunca acredita sólo por entrega.
2. **P0-02 — Copy del modelo:** revisar C01–C12 y C17, priorizando textos visibles al cliente/vendedor afiliado y afirmaciones de firma. Aceptación: nomenclatura consistente de mandato/gestión y vendedor afiliado; mecanismo de autorización descrito con precisión; documentos legales congelados preservados.
3. **P0-03 — Legibilidad crítica:** V03 y controles esenciales ilegibles. Aceptación: Historial y encabezados se leen en todos sus estados; contrastes medidos con la UI renderizada.
4. **P0-04 — Acceso a acciones:** planes y alertas de Afiliado con controles semánticos, labels y diálogos accesibles. Aceptación: selección de plan y tareas críticas completables con teclado; foco de overlays validado.
5. **P0-05 — Fallo frente a vacío:** errores de carga distinguibles y reintentables en los tres roles. Aceptación: denegar red/permisos no muestra falsamente cero operaciones ni permite repetir un envío sin saber su resultado.

### P1 — 6 paquetes

1. **P1-01:** tokens institucionales, tipografía y controles compartidos; carga y errores incluidos.
2. **P1-02:** AppShell y navegación por rol; Sidebar desktop y navegación móvil; Remitos/Reportes dentro del shell.
3. **P1-03:** Admin Hoy y bandejas con accesos filtrados; separar solicitudes, documentos, cobranzas y logística.
4. **P1-04:** Cliente con próxima acción, cuotas enfocadas, documentos y soporte visible.
5. **P1-05:** Vendedor Afiliado con agenda, ficha de cliente, entregas/cobranzas y cuenta propia diferenciada de avisos.
6. **P1-06:** editor de presupuesto y expediente con destino estable, retorno/filtros y conservación de datos; preservar guardado, vínculo y allowlist.

### P2 — 4 paquetes

1. **P2-01:** tablas adaptadas, densidad configurable y búsqueda/filtros/orden consistentes según volumen real.
2. **P2-02:** timeline y centros documentales con historial y fuentes verificables por rol.
3. **P2-03:** refinamiento de copy C13/C15/C16, iconos, elevación y movimiento reducido.
4. **P2-04:** pruebas de usabilidad y medición de éxito de tarea, abandonos y tiempo para localizar pendientes; establecer línea de base sin datos sensibles.

## 14. Plan de implementación por fases

| Fase | Alcance futuro | Criterio de salida / dependencias |
| --- | --- | --- |
| 0. Validar evidencia | Prototipos de baja fidelidad y revisión del significado de estados/copy; mapa de fuentes por rol | Confirmar con operación las tareas frecuentes y qué estados son autoritativos; diseño no inventa datos |
| 1. Correcciones críticas | Los cinco paquetes P0 en cambios acotados | Pruebas de mensajes/condiciones, teclado, contraste y error con datos ficticios; preservar lógica y textos legales salvo autorización específica |
| 2. Fundaciones | Tokens, tipografía, componentes de interacción y AppShell | Galería de estados, navegación por rol y foco; validar 320/375/768/1280 px, zoom y texto largo |
| 3. Admin | Hoy, bandejas, expediente, separación logística/cobros y comisiones/rendiciones | Resolver una solicitud, revisar documentación, continuar presupuesto y verificar un pago sin perder el objeto ni filtros |
| 4. Cliente | Inicio accionable, operaciones/cuotas, documentos/perfil/soporte | Estado y próxima acción comprensibles; informar pago y localizar recibo en móvil; vacío/error y múltiples operaciones cubiertos |
| 5. Vendedor Afiliado | Tareas, ficha, solicitudes por etapas, entregas/cobros y cuenta | Seguir una promesa, registrar recepción/entrega y consultar comisión sin confundir avisos con saldo; permisos efectivos conservados |
| 6. Consolidación | Tablas, timelines, duplicaciones restantes y evaluación de uso | Validación de tareas por rol; retirar variantes sólo después de comprobar paridad funcional |

### Verificación exigida para las fases futuras

Aplicar tsc, eslint de archivos tocados, build y suites relevantes conforme a AGENTS.md y CODEX_RUNTIME.md. Usar exclusivamente emuladores demo para pruebas con escrituras. Storage no está emulado: no probar uploads productivos bajo apariencia de aislamiento. No alterar reglas, motores financieros, schemas, snapshots, estados o permisos como efecto colateral del rediseño. Los cambios funcionales necesarios deben tener alcance y autorización propios.

Casos de diseño a validar: sin operaciones; varias operaciones; información faltante; presupuesto catálogo/manual/múltiples opciones; vínculo inexistente; guardar fallido; comprobante en revisión; cuota pagada/vencida; entrega sin rendición confirmada; cliente con varias operaciones; promesa de hoy; red caída; sesión vencida; archivo rechazado y formulario con cambios sin guardar. Verificar que PDF/WhatsApp sólo reciban datos cliente permitidos y no expongan notas internas, costo, proveedor, factores, margen ni tasas internas.

### Verificación de esta entrega

- `git fetch --all --prune`, `git switch main`, `git pull --ff-only origin main`: completados; main ya actualizado.
- `git switch -c design/panels-ux-audit`: completado; base y origin/main coinciden en el SHA consignado.
- Lectura de instrucciones, inventario de rutas, extracción de estructuras/acciones/estilos y búsqueda de copy: completados sobre el código de la base.
- Revisión de contenido, 14 secciones y referencias: realizada. `git diff --check` sin errores; `git diff --no-index --check /dev/null docs/UX_UI_PANEL_AUDIT.md` sin diagnósticos de whitespace (código 1 por archivo nuevo). `git ls-files --others --exclude-standard` muestra únicamente este documento; no hay cambios en archivos versionados.
- Sin tests de aplicación, tsc, lint, build ni emuladores: entrega exclusivamente documental. Sin evidencia de browser smoke o pruebas con personas; no se reportan como aprobadas.
- Commits: 0. Push: NO. Deploy: NO. Mutaciones Firebase/Rules: NO.
