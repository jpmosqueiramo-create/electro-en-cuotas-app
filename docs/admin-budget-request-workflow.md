# Estados de Presupuestos y Solicitudes

La navegación comienza con Inicio, Presupuestos y Solicitudes en escritorio y móvil.
La aceptación existente de cada versión marca el presupuesto como Aceptado en su
editor e historial, sin sustituir el estado inmutable EMITIDO del snapshot. Los
filtros distinguen En preparación, Pendientes de aceptación y Aceptados. Al aceptar,
el historial se actualiza y ofrece acceso a la solicitud de origen.

Solicitudes agrega una proyección de lectura `workflow: AdminWorkflow[]`, tanto en
el listado paginado como en el detalle. Cada entrada contiene budgetId, version,
product, acceptedAt, stage y approval. El GET administrativo de presupuestos agrega
`workflows`, indexado por `budgetId:version`. Sólo cambia el DTO administrativo;
no hay nuevos campos persistidos, migración, índices compuestos ni cambios de Rules.

Las fuentes son aceptaciones, identidad de operación, borrador, evaluación vigente,
emisión de documentos y entrega. Una aceptación nueva muestra Pendiente de
aprobación. Datos incompletos o un pedido de datos pendiente muestran Pendiente de
datos personales; una respuesta recibida y aún no aplicada muestra Datos personales recibidos; datos
completos aplicados muestran Confección de contrato. La emisión
vigente avanza a Logística y la entrega productiva registrada a Entregado. Las
correcciones de documentos consultan la edición vigente. Una aprobación se muestra
por separado y su filtro requiere la evaluación actual validada por readCreditReview:
una resolución histórica invalidada por nuevos datos no se presenta como vigente.
Estos indicadores no otorgan permisos ni cambian requisitos del flujo.

Se conserva sourceCollection + solicitudId; no se vincula por nombre o DNI, ni se
crea otra solicitud por aceptar. Una consulta de origen aceptada se presenta como
Solicitud. Cuando hay varias operaciones se muestran todas con producto/versión;
los filtros encuentran cualquiera de sus etapas. Los estados originales se
conservan para registros sin operación. Los archivados y errores de consulta tienen
etiquetas explícitas. No se confunde una falla de lectura con una aprobación.

Los filtros actúan sobre las páginas cargadas, con aviso y Cargar más solicitudes.
Actualizar estados vuelve a consultar los datos autorizados. Los cambios de sesión
limpian las proyecciones. La búsqueda no se copia a la URL. Las lecturas tienen
paralelismo acotado y no escriben estados duplicados en solicitudes.
