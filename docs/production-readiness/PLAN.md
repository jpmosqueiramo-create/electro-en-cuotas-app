# Preparación productiva V2 — PR #80

Base: `70b47ef75ae94ba8decc61550b6ea98b096a72ee`. Rama: `feature/production-v2-activation`.

**Adaptador normal implementado y probado con datos sintéticos en Emulator. Activación real pendiente de aprobación documental exacta, configuración y autorizaciones independientes.** El catálogo de textos finales permanece vacío y los comandos productivos deshabilitados por defecto. Este PR no constituye una aprobación jurídica ni una autorización para operar con clientes reales.

## Alcance integrado

Se conserva la corrección de Solicitudes del primer commit: consultas paginadas por servidor, Auth inicializada, aislamiento de sesión y tratamiento de fallos parciales. El confeccionador de presupuestos reutiliza esas lecturas autorizadas y una API administrativa paginada de referencias privadas; un fallo de origen o catálogo ya no vacía el historial permitido. La preparación productiva continúa como consulta de requisitos, nunca como permiso de emisión.

El adaptador separado de `src/lib/productionV2/` conecta revisión READY, aprobación exacta del paquete jurídico y autorización por operación con numeración CH, snapshot íntegro, tres PDF privados, firmas, originales, entrega y ledger. Reutiliza los motores existentes de cálculo, custodia, cuotas, pagos, reversas y comisiones. El adaptador Emulator y el Laboratorio permanecen intactos.

El propietario autorizó específicamente conectar la ruta de invitaciones al nuevo control servidor. La ruta obtiene el contexto de la invitación persistida y exige Auth verificada del UID previamente vinculado, autorización de la operación y entrega con tres firmas. No permite convertir una invitación Emulator en productiva ni crear una cuenta real desde este circuito.

## Matriz de habilitación real

| Módulo | Código y comprobación | Condición para uso real |
|---|---|---|
| Administración | Auth y permisos existentes; nuevas consultas comprueban usuario activo y verificado | Cuenta administrativa autorizada |
| Solicitudes y presupuestos | Persistencia, cupo, idempotencia, catálogo/manual y Acceptance existentes; bandeja corregida | Sin cambio comercial ni migración |
| Datos, identidad y crédito | Motores existentes; origen explícito, revisión documental y conformidad | Identidad y aprobación crediticia vigentes |
| READY | Evidencia técnica y origen verificados | No equivale a firma ni emisión |
| Paquete jurídico final | Catálogo inmutable por hash + registro profesional exacto | **Pendiente: catálogo vacío** |
| Autorización de operación | Actor, revisión, fuente, paquete, alcances y vencimiento; revocación auditada | Confirmación administrativa independiente por operación |
| Congelamiento / CH | Adaptador normal transaccional; unicidad, replay y colisiones probados | Paquete aprobado + contador previamente autorizado + configuración habilitada |
| Mandato / pagaré / remito | Archivos privados inmutables, misma revisión, recuperación sin segundo pagaré | Autorización vigente; sólo texto final instalado y aprobado |
| Proveedor / logística / afiliado | Se conservan módulos y asignaciones existentes | Permisos y custodia vigentes |
| Firmas / originales / entrega | Motor existente comprueba documentos emitidos, tres firmas, evidencia, originales e incidencias | Custodia acreditada y autorización DELIVERY; no reemplaza controles por fixtures |
| Cliente | Invitación de un uso y revocable, UID existente explícito; ruta HTTP conectada | Auth activa/verificada + entrega + autorización CLIENT_ACTIVATION |
| Cuotas / pagos / recibos / reversas | Mismo ledger FIFO; activación única e importes persistidos; recibos privados | Autorización FINANCE, entrega y acreditación administrativa efectiva |
| Tres portales | Saldo único; cliente vinculado y afiliado asignado; revocación vigente | No se asignaron cuentas personales |
| Comisiones | Mismo devengamiento asociado al pago/reversa | Sin cambios de base/porcentaje; liquidaciones productivas siguen bloqueadas |
| ARCA | Separada, sin comunicación productiva | **No autorizada / no habilitada** |

## Aprobación jurídica que falta, exactamente

Los originales están identificados por bytes, sin sustituirlos por los borradores técnicos:

- Mandato `OWNER_ORIGINAL_MANDATE_V3`, SHA-256 `8e23a3734506a63920de1b75a3fdcb4f0c6fe88c13c1941b3357ebd9e1a3b4d6`.
- Pagaré `OWNER_ORIGINAL_NOTE_UNVERSIONED`, SHA-256 `6f22b6f9bae6fd75f989ed9fb33ef53052832a43fff5d3f52fd30db56c3253b6`.

La declaración del titular se conserva como `OWNER_REPORTED`. No se inventaron fecha, profesional ni referencia. No se pide repetir la revisión de los originales: falta identificar su evidencia y comprobar los cambios materiales de la plantilla derivada. La comparación existente está en [ORIGINALS_MATRIX.md](../integration-final-v2/ORIGINALS_MATRIX.md).

Entre los cambios documentados: irrevocabilidad/representación, factura del producto, composición económica, ausencia de anticipo, mora/intimación, garantías, renuncia de fuero y contenido del pagaré. Una entrada `VERIFIED` por sí sola no elimina los pendientes del texto ni habilita un renderer definitivo.

Además siguen pendientes: facultades de representación, jurisdicción aplicable, lugar y fecha efectiva de cada instrumento, aprobación exacta del texto y tratamiento del remito. El CUIT/domicilio societarios ya confirmados no resuelven esos campos. No se asignan porcentajes a gestión, logística ni asistencia técnica.

## Seguridad, compatibilidad y límites

- No se eliminaron controles de identidad, conformidad, READY, firma o integridad. Un flag no basta para emitir.
- No hay autorización recibida desde `production=true`, un ID arbitrario o un snapshot del navegador. El contexto es una capacidad opaca del servidor.
- No se modifican aceptación, presupuesto, hashes ni documentos históricos. No hay migración automática.
- El registro de aprobación del paquete no sustituye el permiso de cada operación. Los comandos comprueban estado y permisos nuevamente.
- No se modificaron Rules, IAM, secretos, Auth ni configuración productiva. No se crearon cuentas reales ni se asignaron los correos personales.
- La prueba local usa exclusivamente `demo-cuenta-hogar` y un paquete ficticio marcado sin validez; el factory de tests rechaza hosts no locales, credenciales y runtime productivo.
- Una aprobación caducada impide completar una emisión interrumpida. La renovación posterior al congelamiento no se automatiza en este PR; exige diseño/revisión y autorización antes de una recuperación real.
- La huella del renderer se debe comprobar contra el artefacto compilado a publicar. Diferencias de bundle/minificación bloquean el paquete; no se omiten para conseguir emisión.
- Los listados de aprobaciones/autorizaciones del panel son acotados (50/20); se deberá incorporar búsqueda/paginación si supera ese volumen.

## Despliegue propuesto — no ejecutado

1. Revisar y mergear manualmente este PR; verificar SHA exacto, gates y ausencia de diferencias de infraestructura. Autorizar separadamente el rollout del SHA mergeado.
2. Publicar inicialmente deshabilitado: `PRODUCTION_OPERATIONS_ENABLED` ausente/false y sin nuevos UID configurados. Verificar en lectura que los circuitos actuales permanecen operativos.
3. Identificar y aprobar el paquete final exacto de los tres documentos, incluyendo representación, jurisdicción y recursos. Incorporarlo al catálogo mediante revisión de código; verificar hashes del build y conservar las versiones anteriores.
4. Inventariar numeración existente y autorizar explícitamente la inicialización del contador CH con su referencia de autorización. No reiniciar ni adoptar numeración de pruebas.
5. Autorizar las cuentas existentes y sus roles, y únicamente entonces configurar en servidor `PRODUCTION_OPERATION_ADMIN_UIDS` y `PRODUCTION_OPERATIONS_ENABLED`. Conservar todos los overrides anteriores. No activar Laboratorio ni ARCA.
6. Registrar la aprobación documental identificada y autorizar una operación real concreta con alcances explícitos. No autorizar ni acreditar obligaciones por el solo hecho de desplegar.

## Aceptación del propietario

Desde Ficha de operación → Contrato, revisar requisitos, registrar el paquete aprobado, autorizar la operación READY y confirmar congelamiento y emisión. Abrir los tres PDF y comprobar identidad, importes y fechas persistidos. Registrar después evidencia auténtica de las tres firmas, originales y custodia; confirmar entrega sólo si cumple los controles. Activar cuotas una sola vez y vincular explícitamente un UID existente. El cliente inicia sesión con esa cuenta verificada antes de usar la invitación. Cliente y afiliado consultan su operación; únicamente Administración acredita o revierte pagos efectivamente comprobados.

Este recorrido está probado localmente con datos ficticios. Su ejecución real requiere las aprobaciones anteriores y autorización expresa; no se realizó en producción. Las instrucciones técnicas y recuperación están en [ADAPTER.md](ADAPTER.md); evidencias y límites en [TEST_RESULTS.md](TEST_RESULTS.md).

## Recuperación

Deshabilitar nuevos comandos o revocar la autorización bajo aprobación específica, conservando lectura y auditoría. Recuperar emisiones interrumpidas con los mismos identificadores/archivos mientras la autorización siga vigente; nunca emitir otro pagaré como reparación. Las reversas usan el ledger existente. No borrar instrumentos, reiniciar CH ni editar saldos. Un rollback requiere autorización y compatibilidad con snapshots ya emitidos; no deshace obligaciones.
