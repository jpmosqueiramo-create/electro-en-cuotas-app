# Cuenta Hogar — Especificación de rediseño de los tres paneles

Fecha: 17 de octubre de 2026. Versión: propuesta de diseño 1.0.
Base: [Auditoría UX/UI](UX_UI_PANEL_AUDIT.md), código `32600ebd0ff3e691333a5b87499cc42b5ed9f7d2`.
Rama de trabajo existente: `design/panels-ux-audit`.

Documento de navegación, jerarquía y wireframes textuales de baja fidelidad. No implementa componentes, rutas, consultas, lógica, estados persistidos, pricing ni modificaciones legales. Los destinos propuestos son contratos de navegación, no rutas ya existentes. No acredita despliegue ni pruebas de navegador.

## 1. Principios del sistema

1. **Una identidad, tres arquitecturas:** paleta, tipografía, controles y estados visuales comunes; densidad, navegación y jerarquía adaptadas a cada rol.
2. **Próxima acción antes que estadística:** cada inicio responde qué resolver, sobre qué operación y por qué. Un contador sin fuente no se publica.
3. **Hechos separados:** solicitud, autorización, pago, entrega, rendición y liquidación tienen estados independientes. Leer un aviso no resuelve una tarea.
4. **Datos mínimos por rol:** componer vistas con proyecciones explícitas; no enviar documentos completos para ocultar propiedades con CSS. No presumir que toda respuesta API ya es apta para la interfaz.
5. **Contexto estable:** conservar colección e ID, operación, filtros, orden y retorno. Un error de vinculación nunca crea silenciosamente otra solicitud.
6. **Acciones reversibles y resultados visibles:** guardar, enviar, informar y confirmar tienen feedback específico; no prometer persistencia si sólo hay estado local.
7. **Móvil como entorno de trabajo:** acciones táctiles, lectura clara, formularios por etapas y navegación sin scroll horizontal global.
8. **Compatibilidad:** mantener snapshots, motores vigentes, reglas y permisos. Diseñar una vista de un estado no autoriza crear ese estado en Firestore.

Convenciones de wireframe: `[dato]` es un marcador sin valor ficticio; `[Acción]` es un control; `→` indica destino. “No disponible” significa fuente ausente o no validada, nunca cero. Orden propuesto de atención: tareas vencidas/bloqueantes, tareas de hoy y luego pendientes sin vencimiento, con antigüedad como desempate y referencia estable. Es una regla de presentación pendiente de validar con operación, no una transición de negocio.

## 2. Arquitectura Admin

### Diez destinos principales

| Destino | Agrupación de módulos actuales | Subvistas y acción principal |
| --- | --- | --- |
| Hoy | Inicio `/admin`, alertas y accesos contextuales actuales | Prioridades, pendientes y agenda; abrir la tarea exacta |
| Solicitudes | Análisis/aperturas/historial de Validaciones; directorio `/admin/clientes` | Bandejas por estado y Clientes como subdestino; expediente con Datos, Propuestas, Documentos y Actividad; revisar solicitud |
| Presupuestos | `/admin/presupuestos` y accesos desde Validaciones | Historial, borradores existentes y editor dedicado; continuar/crear con vínculo explícito |
| Documentación | Adjuntos y seguimiento de autorización en Validaciones | Faltantes, revisión y consulta; abrir documento en su operación; no editar modelos legales |
| Cobranzas | `/admin/cartera`, tab cobranzas de Validaciones y `/admin/rendiciones` | Vencimientos, pagos informados, promesas, recibos y Rendiciones; verificar un pago o gestionar una promesa |
| Logística | Tab logística de Validaciones, `/admin/remitos`, stock/traslados de Productos | Preparación, recepción, entrega, stock, traslados y remitos; resolver un bloqueo |
| Vendedores afiliados | Gestión de vendedores, comisiones y liquidaciones de `/admin/comisiones` | Directorio, asignaciones, cuentas y liquidaciones; consultar ficha o liquidación |
| Catálogo | Alta/edición/publicación de `/admin/productos` | Listado y editor de producto; stock accesible como vínculo a Logística |
| Reportes | `/admin/reportes` | Cobros, fletes y comisiones; exportar el resultado filtrado |
| Configuración | `/admin/envios` y configuración del emisor de Remitos | Localidades, cargas, tarifas, vista previa y datos de emisor; configuración separada de operación diaria |

Rendiciones tiene un destino canónico dentro de Cobranzas; Vendedores afiliados puede enlazar allí filtrado por persona. Clientes permanece accesible desde Solicitudes y búsqueda contextual, sin añadir un undécimo ítem. Comisiones actuales se reparten por responsabilidad, sin duplicar escrituras. Configuración empresarial no se convierte en permiso nuevo ni habilita alterar documentos congelados.

### Fuente y disponibilidad de “Hoy”

| Bloque | Fuente existente candidata | Límite y fallback |
| --- | --- | --- |
| Pendientes críticos | `alertas_admin` + referencias resueltas por `budgetAlertRouting` | Contar avisos no leídos sólo como avisos; la resolución depende de la entidad. Sin vínculo, mostrar contexto y acceso a bandeja, sin elegir otra operación |
| Solicitudes nuevas | `solicitudes` y `solicitudes_cuenta`, estados ya usados en Validaciones | Unión conserva colección/ID; no sumar dos veces una misma tarea al agrupar. Si el alcance no es completo, no rotularlo como total global |
| Información/documentación faltante | `REQUIERE_INFO`, mensaje autorizado y requisitos ya definidos para esa operación | No inferir faltante porque un campo opcional esté vacío; sin lista fiable, “Revisar información solicitada” |
| Presupuestos por continuar | Registros y estados que realmente maneja el editor actual | No inventar un estado BORRADOR; si no hay criterio fiable de continuación, ofrecer historial filtrado sin contador |
| Pagos informados | Reportes existentes `EN_REVISION` y recurso `/api/cliente/pagos-informados`, previa conciliación de fuentes | No sumar ambos como eventos independientes sin identidad verificable; mostrar error o fuente parcial si no hay conciliación |
| Promesas/vencimientos | Promesas y planes/estado financiero existentes | Fechas y cantidades según fuente vigente; no recalcular mora ni monto desde el dashboard |
| Entregas bloqueadas | Estado de entrega y requisitos operativos existentes en Validaciones | Bloqueo sólo con motivo acreditado; si sólo se sabe que falta entregar, “Entregas pendientes” |
| Accesos secundarios | Mapa de navegación | Sin métricas inventadas; Catálogo, Reportes y Configuración al final |

Cada bloque muestra alcance del filtro y fecha de actualización cuando estén disponibles. La especificación no asegura que ya exista una consulta agregada para alimentarlo; validar esa integración antes de implementarlo.

## 3. Arquitectura Cliente

Bottom navigation exacta: **Inicio / Operaciones / Cuotas / Más**.

| Destino | Contenido | Acción y contexto |
| --- | --- | --- |
| Inicio | Saludo, operación principal, próxima acción, vencimiento, entrega, documentos y soporte | CTA de la tarea seleccionada con operación visible |
| Operaciones | Listado, filtros y detalle con resumen, propuesta disponible, entrega y actividad permitida | Abrir operación; consultar documentación o continuar una acción ya autorizada |
| Cuotas | Operación seleccionada; próximas, informadas y confirmadas; recibos y estado de cuenta | Informar pago habilitado; revisar comprobante o descargar recibo confirmado |
| Más | Documentos, Mis datos, Soporte, Nueva solicitud y Cerrar sesión | Cada destino tiene encabezado y retorno propio; no intercalar formularios extensos en Inicio |

Entrega y documentos tienen atajos en Inicio y en el detalle. No añadir más ítems inferiores. En desktop se muestran Inicio, Operaciones, Cuotas, Documentos, Mis datos y Soporte en navegación superior compacta; Más agrupa nueva solicitud y sesión. Se conserva la misma arquitectura aunque la presentación permita accesos expandidos.

**Operación principal:** respetar selección explícita del usuario en la sesión. Sin selección, proponer una operación con acción disponible y vencimiento más próximo; si hay empate o no hay fechas fiables, mostrar selector sin afirmar prioridad. Con varias operaciones siempre indicar “Operación seleccionada” y ofrecer “Ver todas”; no mezclar vencimiento de una con CTA de otra. El resumen de pendientes global, cuando exista, aclara su alcance.

**Fuentes:** la página actual proporciona solicitudes/planes, `REQUIERE_INFO`, `estadoEntrega` y PDFs; las APIs de estado financiero/pagos informados son candidatas adicionales. No elegir una fuente financiera por conveniencia visual ni recalcular snapshots. El endpoint de estado financiero devuelve objetos de movimientos: requieren proyección por allowlist antes de usarse en el portal. Una nueva capacidad de completar documentación o revisar una propuesta requiere verificar ruta y permisos existentes; hasta entonces el CTA conduce a orientación/soporte, sin prometer un guardado inexistente.

## 4. Arquitectura Vendedor Afiliado

Bottom navigation exacta: **Tareas / Clientes / Solicitudes / Mi cuenta**.

| Destino | Contenido | Acciones principales |
| --- | --- | --- |
| Tareas | Hoy, vencidas, próximas; clientes a contactar, promesas, recepciones, entregas y faltantes | Abrir tarea contextual; accesos persistentes a Entregas y Cobranzas |
| Clientes | Directorio autorizado, ficha, operaciones, actividad y próxima acción | Contactar, abrir operación, registrar gestión/promesa si está permitido |
| Solicitudes | Listado y detalle; nueva solicitud en Datos → Bien → Documentos → Revisión → Envío | Continuar formulario o seguir solicitud enviada |
| Mi cuenta | Comisiones, movimientos, liquidaciones y rendiciones propias | Consultar periodo/detalle; Avisos en destino separado; acceso a sesión/ayuda |

Entregas y Cobranzas tienen encabezados propios y retorno a Tareas o ficha; no quedan escondidas sólo bajo un cliente. En desktop, sidebar con Tareas, Clientes, Solicitudes, Entregas, Cobranzas y Mi cuenta. Avisos es subdestino de Mi cuenta y acceso secundario en header.

**Disponibilidad real:** `/api/afiliado/operaciones` filtra operaciones vigentes y excluye rechazadas/canceladas y algunas saldadas. No puede alimentar por sí solo un historial completo del directorio. Un filtro “Históricas” exige una fuente autorizada ya disponible o una tarea funcional aparte; de otro modo, informar el alcance. Cuenta corriente exige vendedor vinculado y `mostrarCuentaCorrienteEnPanel === true`; el endpoint ofrece saldo, movimientos sanitizados y liquidaciones pagadas, no acredita acceso a todas las liquidaciones ni rendiciones. Diseñar estos últimos subdestinos con estado de disponibilidad pendiente de integrar, sin inventar saldos ni esquivar controles.

Tareas se deriva de asignaciones, promesas y estados permitidos. “Cliente a contactar” requiere un motivo verificable; no crear tareas por supuestos comerciales. El vendedor afiliado es colaborador independiente; esta interfaz no altera atribuciones de cobro, porcentajes ni liquidaciones.

## 5. Wireframe textual Admin

### A1 — AppShell desktop y Hoy

```text
┌─────────────────────┬─────────────────────────────────────────────────┐
│ Cuenta Hogar        │ Hoy              Alertas [disponibles]  Sesión  │
│ Administrador       ├─────────────────────────────────────────────────┤
│                     │ ¿Qué necesitás resolver ahora?                  │
│ ● Hoy               │ Alcance [filtro] · Actualizado [fecha si existe] │
│ Solicitudes         │                                                 │
│ Presupuestos        │ [Pendiente crítico: motivo y operación]         │
│ Documentación       │ [Resolver → expediente/tarea]                   │
│ Cobranzas           │                                                 │
│ Logística           │ Solicitudes nuevas    | Información faltante    │
│ Vendedores afiliados│ [cantidad disponible] | [cantidad disponible]   │
│                     │ [Revisar]             | [Ver faltantes]         │
│ Catálogo            │                                                 │
│ Reportes            │ Presupuestos por continuar | Pagos informados   │
│ Configuración       │ [Abrir]                    | [Verificar]        │
│                     │                                                 │
│ Ayuda               │ Agenda: promesas y vencimientos [lista]         │
│ Sesión / Salir       │ Entregas bloqueadas [motivo + Resolver]          │
│                     │ Secundarios: Catálogo · Reportes · Configuración│
└─────────────────────┴─────────────────────────────────────────────────┘
```

Jerarquía: alerta crítica → bandejas accionables → agenda → accesos secundarios. No usar una grilla de diez módulos de igual peso. Si no hay pendientes confirmados, “No hay pendientes en este alcance”; conservar accesos de trabajo. Si falla sólo una fuente, su bloque muestra error/reintento y el resto permanece utilizable.

### A2 — Bandeja y expediente

```text
Solicitudes > [bandeja]                         [Nueva, si permitido]
[Buscar] [Estado] [Fecha] [Responsable, si existe] [Limpiar]
Cliente | Operación/referencia | Motivo | Fecha | Estado | [Abrir]
[Abrir] → Detalle con referencia estable + retorno a filtros
Datos | Propuestas | Documentos | Actividad
Próxima acción: [motivo acreditado]                         [Acción]
```

Desktop: drawer para consulta breve; página dedicada para edición larga. PDF, vínculo y acciones sobre presupuesto conservan su contexto. Rechazar/eliminar/confirmar movimientos mantiene la confirmación vigente y resume el objeto exacto; no añadir acciones por rediseño.

### A3 — Equivalente mobile

```text
Cuenta Hogar · Admin                 [Alertas] [Sesión]
Hoy
[Pendiente crítico / Resolver]
[Solicitudes nuevas / Revisar]
[Información faltante / Revisar]
[Presupuestos / Continuar]
[Pagos informados / Verificar]
[Agenda y entregas / Abrir]
[Accesos secundarios]
────────────────────────────────────────────────────
Hoy | Solicitudes | Cobranzas | Más
```

Más abre menú con los diez destinos; marca el destino activo. Entrar en Logística mantiene Más seleccionado y título “Logística”.

## 6. Wireframe textual Cliente

### C1 — Inicio mobile

```text
Cuenta Hogar                         [Mi sesión]
Hola, [nombre disponible]
Operación seleccionada [bien · referencia] [Cambiar]
[Estado de la operación — descripción breve]

PRÓXIMA ACCIÓN
[Qué falta / qué podés hacer / a qué operación corresponde]
[Completar información / Ver pago / Consultar estado]

Próximo vencimiento
[fecha] · [importe y moneda de fuente válida] [Ver cuota]

Entrega [estado acreditado o sin información] [Ver detalle]
Documentos [pendientes verificables] [Ver documentos]
¿Necesitás ayuda? [Soporte]
───────────────────────────────────────────────────
Inicio | Operaciones | Cuotas | Más
```

No todas las acciones del wireframe aparecen simultáneamente. Si la operación requiere información, esa tarea toma el CTA primario; otras tareas permanecen visibles debajo. Si el pago de esa cuota está informado, “Ver pago informado” sustituye a “Informar pago” para ese objeto. Un pendiente en otra operación se muestra como alerta independiente con referencia.

### C2 — Cuotas e informar pago

```text
Cuotas   [Operación seleccionada / Cambiar]
[Próximas] [Informadas] [Confirmadas]
Cuota [número] · [fecha] · [importe/moneda] · [estado]
[Informar pago, sólo si habilitado]
  → Resumen de operación/cuota
  → Importe y medio, según flujo vigente
  → Adjuntar comprobante [formatos/límite del contrato real]
  → [Revisar] → [Informar pago]
  → Resultado con referencia: recibido / no enviado / no confirmado
```

Deshabilitar doble envío mientras se procesa. Si hay timeout después del envío, “No pudimos confirmar el resultado. Consultá el estado antes de volver a enviarlo”; no generar un nuevo pago como recuperación automática. Recibo emitido y comprobante aportado se presentan en grupos diferentes.

### C3 — Ocho estados de Inicio

| Estado | Contenido principal | Acción / comportamiento |
| --- | --- | --- |
| Sin operaciones | “Todavía no tenés operaciones vinculadas”; sin contadores de pago | “Solicitar una gestión de compra” y “Consultar por una operación existente”; usar vinculación vigente, sin alta silenciosa |
| Varias operaciones | Selector con bien/referencia y estado por ítem; tareas de otras operaciones debajo | Cambiar actualiza resumen, cuota, entrega y documentos juntos; no mezclar datos |
| Requiere información | “Necesitamos información para continuar”; mensaje destinado al cliente, revisado | “Ver qué falta”; completar sólo si hay flujo disponible, si no, soporte contextual |
| Pago informado | “Recibimos tu comprobante. Está en revisión”, sólo tras confirmación de recepción | “Ver comprobante”; sin afirmar acreditación ni ofrecer repetir ese reporte |
| Pago confirmado | “Pago acreditado” con monto, fecha y cuota de fuente financiera autorizada | “Ver recibo”, sólo si existe; entrega se muestra por separado |
| Entrega pendiente | “Entrega pendiente” o etapa verificable; fecha sólo si confirmada | “Ver entrega” / soporte; ninguna confirmación de pago derivada de este estado |
| Operación rechazada | “Esta solicitud no pudo continuar”; explicación aprobada si está disponible | “Consultar por esta solicitud”; no crear otra ni mostrar “Compra confirmada” |
| Error de carga | “No pudimos cargar tus operaciones”; sin cero ni estado vacío | “Reintentar” y soporte; mantener contexto y selección si se conocen |

Los estados se combinan por dominio: entrega pendiente puede coexistir con un pago confirmado. No sustituir unos por otros. La etiqueta técnica REQUIERE_INFO no se muestra literalmente al cliente.

## 7. Wireframe textual Vendedor Afiliado

### V1 — Tareas mobile

```text
Cuenta Hogar · Vendedor afiliado              [Avisos]
Tareas                         [Hoy] [Vencidas] [Próximas]
[Promesa vencida: cliente · operación · fecha]
[Registrar gestión → ficha / promesa]
[Tarea de hoy: motivo · cliente] [Abrir]
[Clientes a contactar: motivo verificable] [Ver]
[Recepciones asignadas] [Ver recepciones]
[Entregas asignadas] [Ver entregas]
[Solicitudes con información faltante] [Revisar]
Accesos: [Entregas] [Cobranzas] [Ayuda]
────────────────────────────────────────────────────
Tareas | Clientes | Solicitudes | Mi cuenta
```

Cada tarjeta identifica tarea y operación; deduplicar representaciones del mismo pendiente por su identidad real. Sin tareas confirmadas: “No tenés tareas en este alcance”; el directorio y las solicitudes siguen disponibles. Si una fuente falla, mostrar ese fallo sin convertirlo en ausencia de trabajo.

### V2 — Directorio y ficha

```text
Clientes                             [Buscar cliente]
[Asignados] [Otros filtros disponibles]
[Nombre · referencia permitida · próxima acción] [Abrir]
  → Ficha de cliente [Contacto permitido]
    Operaciones | Actividad
    [Operación seleccionada / Cambiar]
    [Estado] [Próxima acción + motivo]
    [Registrar gestión] [Ver cuotas] [Ver entrega]
    Historial autorizado con fecha y autor cuando corresponda
```

Mostrar “Sin operaciones vigentes” sin eliminar la identidad del cliente cuando la fuente permita conservarla. Si sólo se consultan vigentes, declararlo en el encabezado. El histórico completo es dependencia funcional pendiente, no una consulta implícitamente habilitada.

### V3 — Nueva solicitud

```text
Solicitudes > Nueva                    [Salir del formulario]
Datos → Bien → Documentos → Revisión → Envío
Datos: cliente, identidad/contacto/domicilio requeridos
Bien: catálogo/plan que el flujo autorizado ya soporte
Documentos: requisitos aplicables, archivo y resultado por campo
Revisión: resumen + [Editar sección] + aviso de campos faltantes
Envío: [Enviar solicitud] → procesando → referencia y siguiente paso
[Volver]                                      [Continuar / Enviar]
```

No ampliar a productos manuales o nuevos plazos sólo por usar el editor en etapas. La revisión muestra valores de la fuente/snapshot, sin recalcular pricing. Envío es una etapa de interacción, no un nuevo estado persistido. Conservar datos mientras se navega dentro del formulario; recuperación entre sesiones sólo si existe almacenamiento seguro autorizado. Salir con cambios abre ConfirmDialog; los archivos locales pueden requerir selección nuevamente tras recarga y debe informarse.

### V4 — Mi cuenta

```text
Mi cuenta [periodo y actualización si disponibles]
[Saldo autorizado · moneda] o [Cuenta no disponible]
Comisiones | Movimientos | Liquidaciones | Rendiciones
[Lista del subdestino · fecha · tipo · importe · estado]
[Detalle del movimiento / documento permitido]
────────────────────────────────────────────────────
Avisos [Abrir avisos]     Ayuda     Mi sesión
```

Avisos no integra el saldo ni representa una liquidación. “Marcar leído” sólo afecta la lectura. Liquidaciones distingue pagadas de otras etapas únicamente si la fuente las proporciona. Cuenta deshabilitada por configuración no muestra cero ni elude la restricción; ofrece orientación. Rendiciones sin fuente integrada muestra “Detalle no disponible en este panel” y ayuda, sin atribuir un importe.

## 8. Navegación desktop

| Rol | Estructura | Medidas y comportamiento propuestos |
| --- | --- | --- |
| Admin | Sidebar persistente + header compacto + contenido de trabajo | Sidebar 248 px; header mínimo 64 px, crece con zoom; margen contenido 24–32 px; diez destinos y sesión al pie |
| Cliente | Header con navegación compacta y sesión; contenido enfocado | Ancho lectura 720 px, hasta 1120 px en listados; Inicio con próxima acción arriba y panel secundario de entrega/documentos |
| Vendedor afiliado | Sidebar con seis destinos de trabajo + header | Sidebar 232–248 px; listas y ficha en dos columnas cuando sea útil; Mi cuenta con subnavegación local |

No usar dos navegaciones globales duplicadas a la vez. Breadcrumb o retorno identifica origen; al entrar por un enlace externo, ofrecer destino padre válido. Navegar a un detalle conserva filtro, página y posición de la bandeja; Volver del navegador restaura la vista. Rutas o query params futuros deben transportar referencias autorizadas, nunca secretos o notas sensibles. Recargar no debe mandar al tab inicial por defecto si hay contexto navegable válido.

## 9. Navegación mobile

| Rol | Barra inferior (4 ítems) | Destinos complementarios |
| --- | --- | --- |
| Admin | Hoy / Solicitudes / Cobranzas / Más | Más: mapa completo de diez destinos; contexto local para presupuesto, logística, documentación y configuración |
| Cliente | Inicio / Operaciones / Cuotas / Más | Más: Documentos, Mis datos, Soporte, Nueva solicitud, Sesión |
| Vendedor afiliado | Tareas / Clientes / Solicitudes / Mi cuenta | Entregas/Cobranzas desde Tareas y ficha; accesos en menú del header; Avisos separado dentro de Mi cuenta |

Barra con etiquetas visibles, estado actual y área táctil mínima 44×44 px por destino. Altura base 64 px más safe-area; contenido reserva ese espacio. El menú Más es una superficie de navegación con foco y cierre accesibles; no simula una acción de negocio. En detalle se conserva el ítem padre activo y el encabezado con retorno. En formularios extensos, acción de continuar/enviar queda antes de la barra, sin tapar campos; teclado abierto no debe ocultar el foco ni producir doble scroll. Un drawer modal oculta/inactiva la navegación de fondo hasta cerrarse.

## 10. Design System

### Paleta y tokens

| Token | Valor | Uso |
| --- | --- | --- |
| brand.primary | `#173E3B` | Identidad y acción primaria |
| brand.secondary | `#B44E2A` | Acento terracota, nunca error por defecto |
| background | `#F7F3EC` | Fondo general |
| surface | `#FFFDFC` | Cards, campos y superficies |
| text.primary | `#1F2928` | Lectura principal |
| text.secondary | `#68706E` | Ayuda y lectura secundaria |
| border.default | `#DED8CF` | Separadores decorativos; no garantiza contraste de control por sí solo |
| success.fg / bg | `#2F7D5C` / `#EAF5EF` | Resultado confirmado |
| warning.fg / bg | `#805500` / `#FFF4D6` | Atención o pendiente que requiere intervención |
| danger.fg / bg | `#B42318` / `#FEECEB` | Error y acción destructiva |
| info.fg / bg | `#175CD3` / `#EDF4FF` | Información y revisión en curso |
| focus.ring | `#173E3B` | Anillo de foco con separación de superficie |

Los pares semánticos adicionales son propuesta de especificación para dar significado estable a estados, sin cambiar la paleta de marca. Verificar contraste con la combinación real y tamaño en implementación. No usar color solo; peligro requiere texto/icono y confirmación según acción. Para identificar controles/foco se permite borde semántico más oscuro que el separador decorativo.

Manrope: títulos y acciones (600–800). Source Sans 3: lectura (400–600). Tamaños: título de página 24 móvil / 28 desktop, sección 20, cuerpo/control 16, secundario 14, metadato 12 px. Line-height 1.4 en títulos y 1.5–1.6 en lectura. Importes con cifras tabulares; formato local y moneda explícita; no alterar unidades financieras de origen. Espaciado 4/8/12/16/24/32; controles 44–48 px mínimo; radios 8/12/16 y pill para badges. Borde 1 px; sombra leve para elevación y sombra mayor sólo en overlays. Sin glows ni pulsos permanentes.

### Reglas de datos de todos los componentes

“Permitido” significa necesario, autorizado y proyectado antes de llegar al componente. **Prohibido común:** secretos, tokens, service accounts, documentos Firestore completos, campos de otro usuario/rol y texto interno sin revisión. Los componentes Cliente nunca reciben costo proveedor, proveedor interno, factores, margen, TNA interna, mora interna ni notas administrativas. Vendedor afiliado sólo recibe operaciones asignadas y datos de su cuenta habilitados; no hereda acceso de Admin. Admin recibe campos sensibles exclusivamente en herramientas específicas autorizadas, no en primitivas visuales. Un componente no consulta producción ni decide reglas financieras por su cuenta.

### Contratos de los 22 componentes

Cada contrato siguiente incluye objetivo, variantes, estados, responsive, accesibilidad y límites de datos. Las exclusiones comunes anteriores se suman a las particulares.

#### 1. AppShell

- **Objetivo/variantes:** estructura Admin operativa, Cliente enfocada y Vendedor afiliado de campo.
- **Estados:** sesión cargando, autorizada, vencida o acceso no disponible; no renderizar datos protegidos durante resolución de rol.
- **Responsive:** sidebar/navegación superior desktop; header y barra inferior móvil según rol.
- **Accesibilidad:** landmarks, enlace “Saltar al contenido”, título principal y foco tras cambio de ruta.
- **Recibe:** identidad visual, rol confirmado, nombre mínimo, destinos autorizados y contenido ya filtrado. **No recibe:** credenciales, claims brutos ni expedientes completos para construir navegación.

#### 2. Sidebar

- **Objetivo/variantes:** destinos Admin (10) y Vendedor afiliado (6); compacta sólo si etiquetas siguen accesibles.
- **Estados:** actual, disponible, carga de contador y error de contador sin bloquear el enlace.
- **Responsive:** persistente desde desktop; menú accesible en tamaños inferiores.
- **Accesibilidad:** nav nombrado, enlaces reales y `aria-current`; no depender de tooltip para comprender el destino.
- **Recibe:** etiqueta, icono, destino autorizado, contador/alcance opcional. **No recibe:** listas de clientes ni consultas/documentos para calcular contadores.

#### 3. MobileBottomNav

- **Objetivo/variantes:** cuatro destinos definidos para cada rol.
- **Estados:** activo, inactivo y navegación pendiente; Más representa su subárbol.
- **Responsive:** sólo bajo breakpoint desktop; safe-area y espacio reservado.
- **Accesibilidad:** etiquetas visibles, nombre de nav, foco y selección; área táctil de 44 px.
- **Recibe:** destinos, etiquetas y selección derivada de navegación. **No recibe:** permisos inferidos de localStorage, información financiera o identificadores de otros clientes.

#### 4. PageHeader

- **Objetivo/variantes:** orientar en bandeja, detalle o edición; una acción primaria contextual.
- **Estados:** listo, título/contexto cargando y acción bloqueada con explicación.
- **Responsive:** herramientas se apilan; metadatos secundarios pasan debajo del título.
- **Accesibilidad:** h1 único y retorno con nombre descriptivo.
- **Recibe:** título, subtítulo breve, referencia permitida y acciones autorizadas. **No recibe:** errores técnicos brutos, datos privados dentro de títulos o subtítulos con códigos de motor.

#### 5. MetricCard

- **Objetivo/variantes:** cantidad, importe o fecha; sólo métricas con fuente.
- **Estados:** cargando, valor cero real, valor disponible, parcial, no disponible y error.
- **Responsive:** 1–2 columnas móvil y 2–4 desktop según legibilidad.
- **Accesibilidad:** valor con unidad/periodo y enlace de alcance explícito; sin animar números obligatoriamente.
- **Recibe:** valor ya calculado, moneda/unidad, alcance, fecha y destino. **No recibe:** movimientos crudos para sumar, tasas o snapshots internos.

#### 6. ActionCard

- **Objetivo/variantes:** tarea normal, urgente o bloqueada con motivo.
- **Estados:** pendiente, ejecutando, resuelta tras respuesta y fallo; no resolver sólo por abrirla.
- **Responsive:** ancho completo móvil; listas/grilla corta desktop.
- **Accesibilidad:** título y botón/enlace reales; evitar card clicable con botones anidados.
- **Recibe:** identidad permitida de tarea/operación, motivo, fecha y acción habilitada. **No recibe:** reglas para aprobar o recalcular operaciones ni causas internas no comunicables.

#### 7. StatusBadge

- **Objetivo/variantes:** estado de solicitud, documento, pago, entrega, rendición o liquidación.
- **Estados:** etiqueta explícita, desconocido y sin información; no adivinar dominio.
- **Responsive:** permite wrap; nunca corta estado esencial.
- **Accesibilidad:** texto y símbolo opcional además de color; iconos decorativos ocultos al lector.
- **Recibe:** dominio, estado de fuente y etiqueta de presentación validada. **No recibe:** objeto de operación completo ni estado entrega para construir un badge de pago.

#### 8. AlertCard

- **Objetivo/variantes:** información, atención, peligro o éxito accionable.
- **Estados:** visible, procesando acción, fallo y lectura confirmada; resuelta sólo desde entidad.
- **Responsive:** CTA debajo del texto en móvil.
- **Accesibilidad:** aviso nuevo por región viva según urgencia; no anunciar listas completas al cargar.
- **Recibe:** mensaje filtrado, severidad, referencia y acción/destino permitido. **No recibe:** stack traces, notas internas en Cliente o payload arbitrario de notificaciones.

#### 9. DataTable

- **Objetivo/variantes:** listado operativo o reporte; selección sólo donde la operación vigente la admita.
- **Estados:** carga, filas, vacío, sin resultados, error, página parcial y actualización.
- **Responsive:** cards/lista móvil con campos esenciales; scroll local en matrices que necesitan comparación.
- **Accesibilidad:** caption, th/scope, orden anunciado, controles con nombre y lectura coherente por fila.
- **Recibe:** columnas allowlist, filas proyectadas, filtros/orden/página y acciones autorizadas. **No recibe:** columnas ocultas con datos sensibles ni totales financieros calculados por defecto.

#### 10. EmptyState

- **Objetivo/variantes:** sin registros, sin asignaciones o sin coincidencias.
- **Estados:** sólo ausencia confirmada después de carga correcta; error usa AlertCard.
- **Responsive:** ilustración opcional pequeña, texto y CTA sin alto fijo.
- **Accesibilidad:** encabezado descriptivo y acción inequívoca.
- **Recibe:** contexto, filtro y CTA permitido. **No recibe:** fallos de red convertidos en “sin datos” ni invitaciones automáticas a crear sustitutos de solicitudes.

#### 11. Modal

- **Objetivo/variantes:** decisión breve o formulario corto; no editor de presupuesto extenso.
- **Estados:** abierto, validando, procesando, error y cierre solicitado con cambios.
- **Responsive:** máximo 560–640 px desktop, pantalla adaptada móvil con scroll interno único.
- **Accesibilidad:** dialog nombrado, modal, foco inicial/atrapado/restaurado; Escape y cierre con protección de cambios.
- **Recibe:** contenido mínimo, título y callbacks de acciones ya autorizadas. **No recibe:** credenciales, documentos completos por comodidad o lógica de persistencia oculta.

#### 12. Drawer

- **Objetivo/variantes:** consulta rápida de expediente o menú de navegación.
- **Estados:** abierto, carga, listo, vacío permitido y error/reintento.
- **Responsive:** lateral 480–640 px desktop, ancho completo móvil; edición larga abre página.
- **Accesibilidad:** si bloquea fondo aplica contrato modal; retorno al disparador y nombre de superficie.
- **Recibe:** resumen/detalle proyectado o destinos autorizados. **No recibe:** datos de dominios no necesarios ni transiciones de negocio implícitas al cerrar.

#### 13. FormSection

- **Objetivo/variantes:** identidad, bien, documentos y revisión; editable o sólo lectura.
- **Estados:** intacta, editada, inválida, guardando y confirmada cuando realmente se guarda.
- **Responsive:** una columna móvil, hasta dos desktop; orden DOM conserva lectura.
- **Accesibilidad:** fieldset/legend cuando agrupa controles y resumen enlazado a errores.
- **Recibe:** campos explícitos, valores permitidos, reglas vigentes, ayuda y errores sanitizados. **No recibe:** modelo de negocio completo o defaults que sustituyan snapshots faltantes.

#### 14. Timeline

- **Objetivo/variantes:** hechos de operación, documentación o entrega según rol.
- **Estados:** eventos confirmados, sin eventos, carga y error; paso futuro sólo identificado como previsto.
- **Responsive:** vertical en móvil y desktop; sin depender de desplazamiento horizontal.
- **Accesibilidad:** lista ordenada, fecha textual y estado legible sin color.
- **Recibe:** eventos autorizados con identidad, fecha, título, fuente y descripción pública/interna según rol. **No recibe:** hechos inferidos, fechas inventadas ni actividad administrativa en Cliente.

#### 15. Button

- **Objetivo/variantes:** primario, secundario, textual y peligro; regular/compacto manteniendo blanco táctil.
- **Estados:** default, hover, focus, pressed, disabled y loading con nombre conservado.
- **Responsive:** CTA ancho completo en móvil cuando corresponda; no todos los botones lo necesitan.
- **Accesibilidad:** button para acción, enlace para navegación; nombre visible y explicación del bloqueo.
- **Recibe:** etiqueta, icono, tipo, disponibilidad y acción explícita. **No recibe:** decisiones de permiso inferidas, payloads de Firestore ni reglas financieras.

#### 16. FormField

- **Objetivo/variantes:** texto, contacto, fecha, importe, select y multilinea.
- **Estados:** vacío, completo, inválido, disabled, readonly y validación pendiente.
- **Responsive:** ancho disponible; fuente 16 px en móvil; ayuda debajo.
- **Accesibilidad:** label/id asociados, required, autocomplete/inputmode adecuados, error con describedby/invalid.
- **Recibe:** valor escalar permitido, opciones autorizadas, formato/unidad y error de campo. **No recibe:** credenciales administrativas, datos personales ajenos o reglas que inventen cuotas/tasas.

#### 17. FileUploadField

- **Objetivo/variantes:** documento individual, imagen o comprobante; cámara sólo si existe soporte real.
- **Estados:** sin archivo, seleccionado, validando, enviando, recibido confirmado, rechazado y resultado incierto.
- **Responsive:** botón/archivo en filas apiladas; nombre largo envuelve; preview opcional.
- **Accesibilidad:** input file con label, requisitos antes del control, progreso anunciado sin exceso.
- **Recibe:** archivo seleccionado, requisitos vigentes, estado/progreso real y referencia autorizada de descarga. **No recibe:** URL pública por defecto, token expuesto, ruta arbitraria de Storage o tamaño máximo inventado.

#### 18. SearchFilterBar

- **Objetivo/variantes:** búsqueda simple o filtros de bandeja/reporte.
- **Estados:** filtros aplicados, buscando, sin coincidencias y error; limpiar conserva destino.
- **Responsive:** búsqueda visible, filtros secundarios en drawer móvil con resumen de aplicados.
- **Accesibilidad:** labels, recuento anunciado tras resultado y controles de limpiar descriptivos.
- **Recibe:** query, opciones autorizadas, alcance y cantidad confirmada. **No recibe:** corpus completo con datos sensibles para filtrar en cliente ni queries con secretos en URL.

#### 19. ConfirmDialog

- **Objetivo/variantes:** confirmar acción relevante, destructiva o abandonar cambios.
- **Estados:** decisión pendiente, procesando, error y resultado; no cierre prematuro.
- **Responsive:** acciones apiladas móvil, cancelación fácilmente alcanzable.
- **Accesibilidad:** contrato Modal; foco inicial en opción segura para acción destructiva; verbos explícitos.
- **Recibe:** identidad del objeto, efecto real, resumen mínimo y callback autorizado. **No recibe:** consecuencias ficticias, credenciales o mutación implícita al abrir/cerrar.

#### 20. DocumentList

- **Objetivo/variantes:** documentos de operación, comprobantes aportados y recibos emitidos en grupos distintos.
- **Estados:** disponible, requerido por regla real, en revisión, sin archivo, acceso no disponible y error.
- **Responsive:** filas apiladas móvil; tabla compacta desktop.
- **Accesibilidad:** nombre/tipo/estado, botón de descarga específico; aviso de nueva pestaña y formato.
- **Recibe:** metadatos permitidos y acceso autorizado al archivo, con destino de revisión si existe. **No recibe:** documentos legales editables por defecto, carpetas completas, URLs de archivos ajenos o notas privadas.

#### 21. PaymentSummary

- **Objetivo/variantes:** cuota próxima, pago informado, pago acreditado; Admin puede tener contexto de revisión separado.
- **Estados:** cargando, confirmado por fuente, en revisión, no disponible, discrepancia y error.
- **Responsive:** importe/moneda y estado primero, detalle debajo; nunca tabla ancha obligatoria.
- **Accesibilidad:** etiquetas explícitas de importe, cuota, fecha y estado; no depender de signos/color.
- **Recibe:** proyección financiera autorizada con moneda, unidad, referencia, fecha y evidencia de estado. **No recibe:** costo/margen/factores, cálculo alternativo de saldo, entrega como prueba de acreditación ni payload bruto de ledger.

#### 22. OperationSummary

- **Objetivo/variantes:** tarjeta Cliente, ficha Vendedor afiliado y cabecera de expediente Admin.
- **Estados:** disponible, selección pendiente, carga, error y referencia inaccesible/no encontrada.
- **Responsive:** una columna móvil y metadatos en dos desktop; selector siempre visible con varias operaciones.
- **Accesibilidad:** nombre/referencia claros, encabezado y estados separados por dominio.
- **Recibe:** identidad estable autorizada, bien, estados específicos y próxima acción validada. **No recibe:** snapshots internos completos, datos de terceros o una “situación global” inventada que mezcle entrega/pago/rendición.

## 11. Estados comunes

| Estado de interacción | Presentación | Comportamiento |
| --- | --- | --- |
| Cargando | Skeleton del bloque con texto accesible | Sin ceros, sin acciones que dependan de datos no resueltos |
| Listo | Datos con alcance y actualización si disponible | Acciones habilitadas por contrato vigente |
| Vacío confirmado | EmptyState específico | CTA relevante sin crear sustitutos silenciosos |
| Sin coincidencias | Filtros visibles + “No hay coincidencias” | Limpiar filtros; no borrar selección de operación innecesariamente |
| Error total/parcial | Mensaje concreto del bloque afectado | Reintentar carga; resto de bloques sigue operativo si es seguro |
| Guardando/enviando | Etiqueta de acción y bloqueo de doble envío | Mantener datos y foco; progreso sólo si es real |
| Confirmado | Resultado persistido con referencia | Actualizar vista desde respuesta; no confundir guardado con envío externo |
| Resultado incierto | “No pudimos confirmar el resultado” | Consultar entidad antes de repetir mutación; sin reintento ciego |
| Cambios sin guardar | Aviso discreto y ConfirmDialog al salir | Continuar editando o descartar explícitamente |
| Sin permiso | Explicación breve y retorno seguro | No presentar cero ni ampliar acceso; no mostrar datos previos de otro usuario |
| Sesión vencida | Mensaje y reingreso | No enviar con sesión inválida; no guardar documentos sensibles en almacenamiento inseguro |
| Fuente discrepante | “Información pendiente de verificación” | No elegir un saldo por defecto ni recalcular para hacer coincidir cifras |

Estos son estados visuales/transitorios. No se crean enums, campos ni migraciones. `PENDIENTE`, `REQUIERE_INFO`, `EN_REVISION`, `PAGADO`, `ENTREGADO` y estados de liquidación conservan su significado vigente; cada dominio se mapea explícitamente en implementación. Fechas ausentes no equivalen a hoy. ARS y USD se presentan separadamente, sin sumar monedas ni convertirlas.

## 12. Copy propuesto

Alcance: interfaz y mensajes operativos. Se conserva toda documentación legal congelada. Donde el mecanismo de autorización requiera precisión, la etiqueta propuesta queda condicionada a evidencia; no se certifica firma digital mediante texto de UI. Referencias del código base auditado.

| PANEL | UBICACIÓN | COPY ACTUAL | COPY PROPUESTO | MOTIVO |
| --- | --- | --- | --- | --- |
| Admin | `admin/page.tsx:54–55` | Aprobación y firma digital de créditos / solicitudes de crédito | Revisión de solicitudes y documentación | Explica operación sin presentar otorgamiento de crédito |
| Admin | `admin/page.tsx:66` | Precios de venta en cuotas | Catálogo y planes de la propuesta | Compatible con gestión de compra |
| Admin | `admin/page.tsx:77`; `admin/cartera/page.tsx:338` | Créditos en calle | Operaciones y cuotas pendientes | Evita jerga y ambigüedad del modelo |
| Admin | `admin/page.tsx:98–104` | Red de ventas / Red Ventas | Red de vendedores afiliados | Rol consistente de colaboradores independientes |
| Admin | `admin/page.tsx:124` | Fuerza de venta | Vendedores afiliados | Nomenclatura uniforme |
| Admin | `admin/page.tsx:135`; `admin/clientes/page.tsx:119` | Historial crediticio / antecedentes crediticios | Historial de operaciones | Si el destino es historial operativo; datos técnicos de consulta se nombran con precisión aparte |
| Admin | `admin/validaciones/page.tsx:2099` | Solicitudes de crédito, análisis scoring DNI y firma digital | Solicitudes, verificación de información y documentación del mandato | Describe propósito de la pantalla |
| Admin | `admin/validaciones/page.tsx:1393` | Enlace de firma digital | Enlace para revisar y autorizar el mandato | Validar que describa el mecanismo real antes de aplicar |
| Admin | `admin/validaciones/page.tsx:3222` | Firmado Digitalmente | Autorización registrada | Sólo si hay evidencia de autorización; si no, “Autorización pendiente” o “Estado no disponible” |
| Admin | `admin/productos/page.tsx:530` | Multiplicador de financiamiento | Configuración interna de planes | No cambia factores ni fórmulas |
| Admin | `admin/validaciones/page.tsx:2950,3160` | Perfil Crediticio / Dictamen Crediticio | Información para revisión / Resultado de la revisión | Para la cabecera general; conservar nombre técnico de evaluaciones reales cuando sea necesario |
| Admin | `components/AdminNav.tsx:66` | Centro de Monitoreo Root | Operación diaria | Lenguaje orientado a la tarea |
| Admin | `admin/reportes/page.tsx:516,519` | Afiliado / Asesor; Monto Venta | Vendedor afiliado; Importe de la operación | Confirmar qué monto representa la columna; no alterar cálculo |
| Admin | `admin/reportes/page.tsx:300` | Descargar Excel (.CSV) | Descargar CSV (compatible con Excel) | Formato preciso |
| Admin | `admin/presupuestos/page.tsx:1093` | CANONICAL_V1 / MANUAL_FACTOR_V1 | Presupuestos de catálogo y productos manuales | Mantener códigos técnicos en diagnóstico cuando sean necesarios |
| Vendedor afiliado | `afiliado/page.tsx:325,366` | Portal del Afiliado | Panel de Vendedor Afiliado | Nombre del rol |
| Vendedor afiliado | `afiliado/page.tsx:417` | Cargar Nueva Venta (Presencial) | Nueva solicitud de gestión de compra | No describir una venta propia |
| Vendedor afiliado | `afiliado/page.tsx:418` | Evaluación crediticia de la mesa chica | Revisión de la solicitud por Cuenta Hogar | Evita jerga y afirmación incompatible |
| Vendedor afiliado | `afiliado/page.tsx:300,308` | Venta/solicitud ingresada; error al cargar la venta | Solicitud enviada [referencia]; No pudimos enviar la solicitud | Confirmación específica; si resultado incierto usar mensaje de §11 |
| Vendedor afiliado | `afiliado/page.tsx:510,653` | Expediente de Venta; ninguna venta | Enviar solicitud; Todavía no tenés solicitudes registradas | Consistencia en acción y vacío |
| Vendedor afiliado | `afiliado/page.tsx:777` | Clientes con financiación activa | Clientes con operaciones activas asignadas | Alcance verificable y modelo vigente |
| Vendedor afiliado | `afiliado/page.tsx:801` | MOROSO | Cuotas vencidas | Describe situación, no etiqueta a la persona |
| Vendedor afiliado | `afiliado/page.tsx:854,879,926` | Sin vector; Plan no regenerado; Registrar Voluntad | Plan no disponible; Registrar gestión / Registrar promesa de pago | Explica dato ausente y acción efectiva |
| Cliente | `cliente/page.tsx:907–910` | PAGO VERIFICADO POR CENTRAL | Entrega registrada, en bloque de entrega; Pago acreditado sólo en bloque financiero confirmado | Nunca derivar verificación de pago de una entrega |
| Cliente | `cliente/page.tsx:1007–1012` | AUDITANDO PAGO CON CENTRAL | Comprobante en revisión | Informado y acreditado son estados diferentes |
| Cliente | `cliente/page.tsx:1082–1091` | Subir Recibo | Informar pago / Adjuntar comprobante | Distingue archivo aportado del recibo emitido |
| Cliente | `cliente/page.tsx:890–897` | NO PROCEDE / EN EVALUACIÓN genérico | Esta solicitud no pudo continuar / Estamos revisando tu solicitud / Necesitamos información para continuar | Tratamiento separado según estado real |
| Transversal | `src/app/layout.tsx:30–37,49,66,109` | Financiación propia / a sola firma | Servicio de gestión de compra mediante mandato y logística | Revisar metadata heredada en tarea específica; no cambiar documentos legales |

Tono: voseo consistente, frases cortas, sin mayúsculas sostenidas en párrafos ni alarmas decorativas. Cuotas, comisión, compra y presupuesto siguen siendo términos válidos cuando describen el servicio. No reemplazar nombres técnicos internos indiscriminadamente ni cambiar estados persistidos para adaptar el copy.

## 13. Responsive

| Ancho propuesto | Shell y contenido | Formularios/listas |
| --- | --- | --- |
| 320–767 px | Header compacto, barra inferior de 4 destinos, margen 16 px | Una columna, labels arriba, CTA legible, listas en cards; no scroll horizontal de página |
| 768–1023 px | Navegación móvil equivalente; espacio extra para contenido | Dos columnas sólo en campos independientes; detalle sigue siendo una superficie única |
| Desde 1024 px | Sidebar Admin/Vendedor afiliado; header navegable Cliente | Tabla/lista con contexto, drawer lateral; formularios largos en página |

Medidas son decisiones de diseño futuras, no cambios de Tailwind realizados. Probar 320, 375, 768, 1024 y 1280 px, zoom 200% y reflow a 400%, etiquetas largas, orientación horizontal y teclado móvil. Header crece con texto, no recorta sesión ni controles. Barra inferior reserva safe-area; modal/drawer no hereda dobles barras fijas que oculten el final. Matrices de tarifas pueden tener scroll horizontal local nombrado; siempre ofrecer acceso a la celda y contexto de fila/columna.

## 14. Accesibilidad

- Objetivo de aceptación: WCAG AA en las superficies implementadas, con texto normal ≥4.5:1, texto grande ≥3:1 y controles/foco identificables ≥3:1 donde corresponda. No se certifica conformidad en este documento.
- Orden de lectura: header, título, próxima acción, contenido y navegación; cada pantalla tiene h1 y landmarks nombrados. “Saltar al contenido” evita recorrer navegación completa.
- Navegación usa enlaces; cambios de tab locales usan semántica de tabs sólo si implementan teclado completo, o botones de filtro con estado anunciado. Planes seleccionables usan radio group o controles equivalentes accesibles.
- Todos los campos tienen labels asociados, ayuda y errores enlazados. Error de envío mueve foco al resumen pertinente y conserva valores; no anunciar sólo color rojo.
- Overlays tienen título, foco inicial, contención del foco, fondo inactivo, Escape y retorno. Si hay cambios, Escape solicita confirmación de salida; no descarta silenciosamente.
- Cambios de estado relevantes se anuncian de forma breve; toast no es el único registro de fallo o éxito. Loading conserva nombre de la acción y evita múltiples envíos.
- Motion reducido desactiva pulsos, bounce y transiciones no esenciales; no usar parpadeos. No hay interacción crítica sólo en hover.
- Documentos identifican tipo, formato y destino. Botones de icono tienen nombre; datos truncados disponen de lectura completa por teclado y móvil, sin depender de title.

## 15. Orden de implementación

Esta secuencia es una propuesta para tareas futuras; este pedido sólo autoriza documentación.

| Orden | Trabajo | Dependencia / salida esperada |
| --- | --- | --- |
| 1 | Mapear estados y fuentes; revisar copy prioritario y discrepancias | Contrato de presentación que separa pago/entrega/rendición y mensajes comunicables |
| 2 | Resolver P0 de auditoría: estados engañosos, contraste crítico, controles y errores | Casos de pago informado/confirmado, REQUIERE_INFO y fallos definidos y verificables |
| 3 | Tokens, tipografía, controles y estados comunes | Muestras de componentes en todos sus estados con datos ficticios |
| 4 | AppShell/navegación por rol | Equivalencia desktop/mobile, sesión y accesos con contexto |
| 5 | Admin Hoy, bandejas y expediente; presupuesto dedicado | Fuentes agregadas validadas; mantener vínculo, snapshots, persistencia y allowlist |
| 6 | Cliente Inicio, cuotas y documentos/soporte | Próxima acción por operación; pagos sin doble envío y estados independientes |
| 7 | Vendedor afiliado Tareas, ficha y solicitudes por etapas | Asignaciones verificadas, recepción/entrega y gestiones sin cambiar atribuciones |
| 8 | Mi cuenta y subdestinos condicionados a datos reales | Respetar habilitación; no extrapolar liquidaciones pagadas a todo el historial |
| 9 | Tablas/timelines, refinamiento y pruebas de uso | Paridad funcional antes de retirar variantes anteriores |

Antes de implementar bloques dependientes de fuentes no integradas, registrar la dependencia funcional concreta. La falta de datos no se resuelve con defaults, acceso productivo de prueba o motores alternativos. Tests futuros con escritura usan exclusivamente emuladores demo según AGENTS.md y CODEX_RUNTIME.md; Storage no está emulado. Aplicar quality gates de código sólo cuando haya implementación. Deploy sigue requiriendo autorización de SHA específico.

## 16. Criterios de aceptación

### Revisión del diseño

| ID | Escenario / criterio verificable | Resultado exigido |
| --- | --- | --- |
| AC01 | Mapa de navegación | Admin conserva 10 destinos principales; Cliente y Vendedor afiliado exactamente 4 inferiores; todos los módulos auditados tienen hogar definido |
| AC02 | Inicio Admin | Los ocho bloques solicitados tienen lugar, destino y fuente/fallback; no hay números ficticios ni falsa equivalencia aviso=tarea |
| AC03 | Inicio Cliente | Saludo, operación, próxima acción, vencimiento, entrega, documentos y soporte tienen posición y jerarquía |
| AC04 | Varias operaciones | Cambiar operación actualiza juntos resumen/acción/cuotas/entrega; pendientes de otra operación conservan referencia propia |
| AC05 | Pago y entrega | Entregado + pago no confirmado jamás presenta Pago acreditado; pago confirmado + entrega pendiente muestra ambos estados separados |
| AC06 | Requiere información / rechazo | Mensajes y acciones diferentes; sólo se muestra contenido autorizado para el destinatario |
| AC07 | Vacío/error | Red caída o permiso denegado no produce cero operaciones; cada bloque fallido ofrece recuperación segura |
| AC08 | Doble envío / timeout | Se bloquea envío concurrente; resultado incierto conduce a verificar entidad antes de repetir |
| AC09 | Tareas Vendedor afiliado | Hoy, promesas, contacto, recepción, entrega y faltantes abren objeto asignado y tarea exacta |
| AC10 | Ficha/directorio | Alcance vigente/histórico explícito; no se promete histórico completo usando endpoint que lo excluye |
| AC11 | Formulario de solicitud | Datos/Bien/Documentos/Revisión/Envío, retorno sin pérdida dentro de sesión y salida con cambios confirmada; no nuevos planes/pricing |
| AC12 | Mi cuenta | Avisos separados; saldo sólo con habilitación; no confundir saldo desconocido con cero ni inventar rendiciones/liquidaciones |
| AC13 | Componentes | Los 22 contratos documentan objetivo, variantes, estados, responsive, accesibilidad, datos recibidos y excluidos |
| AC14 | Marca | Paleta base y tipografías se conservan; terracota no representa error; tokens semánticos tienen usos específicos |
| AC15 | Navegación y foco | Teclado completa acciones, overlays restauran foco, enlaces conservan contexto y retorno; foco visible sin obstrucción |
| AC16 | Responsive | Sin overflow global a anchos previstos; safe-area, zoom, texto largo y teclado no ocultan controles; matrices con scroll local accesible |
| AC17 | Información sensible | Cliente sin costo/proveedor/factores/margen/tasas/notas internas; vendedor afiliado limitado a su ámbito; componentes no reciben documentos brutos |
| AC18 | Presupuestos | Diseño conserva catálogo/manual/múltiples opciones, source/pricingMode/snapshots, vínculo y confirmación de guardado antes de compartir |
| AC19 | Copy | Tabla ubica texto actual, propuesta y motivo; rol nombrado vendedor afiliado; documentos legales congelados intactos |
| AC20 | Alcance de esta entrega | Sólo archivo de especificación nuevo; auditoría previa conservada; sin código, componentes, Firebase/Rules, lógica, estados persistidos, pricing, legales, commits, push ni deploy |

AC01–AC14 y AC17–AC19 se cubren como contratos documentales; su ejecución/render real queda pendiente de implementación. AC15–AC16 son requisitos futuros de verificación, no pruebas aprobadas. Probar con datos ficticios los ocho estados Cliente, fuentes parciales, varias operaciones por cliente, pago informado frente a acreditado, entrega sin rendición confirmada y cuenta de vendedor afiliado no habilitada.

### Control de esta entrega

Documento de 16 secciones con tres wireframes principales y variantes de flujos, 22 contratos de componentes, mapa de diez destinos Admin y cuatro destinos móviles por cada otro rol. Revisión estática de consistencia con la auditoría y comprobación puntual de APIs de operaciones/cuenta de vendedor afiliado y estado financiero Cliente; ninguna llamada a esos endpoints ni consulta a Firebase. Verificación de Markdown, estructura, whitespace y estado de Git; no se ejecutan tests, build o emuladores por ser documentación únicamente. La auditoría previa continúa sin commit y no se modifica como parte de este pedido.
