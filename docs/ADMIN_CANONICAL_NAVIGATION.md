# Unificación de navegación administrativa

Base: `13670f41c22a08ea43f46f64e31d60d037604c81`.

## Rutas y decisiones

| Entrada anterior / consumidor | Destino vigente | Decisión |
| --- | --- | --- |
| Hoy → Solicitudes / Ver bandejas | `/admin/solicitudes` | Mismo destino que menú lateral y móvil. |
| Hoy → Información y documentación | `/admin/documentacion` | Bandeja vigente: operaciones aceptadas y archivos históricos. |
| Hoy → Presupuestos | `/admin/presupuestos` | Se conserva el único confeccionador V2. |
| Hoy / menú → Cartera | `/admin/cobranzas` | Nueva entrada de navegación al módulo financiero V2 **existente en la Ficha**, sin motor nuevo. |
| Hoy / menú → Remitos o Validaciones para logística | `/admin/logistica` | Nueva entrada de navegación a proveedor/logística V2 **existente en la Ficha**. |
| `/admin/validaciones` guardada | `/admin/solicitudes` | Redirección del servidor; no monta el formulario antiguo. |
| `/admin/validaciones?sourceCollection=…&solicitudId=…` | Detalle exacto de solicitud | Conserva colección e ID explícitos; nunca infiere por persona. |
| `/admin/validaciones?solicitudId=…` sin colección | Solicitudes, referencia y vista completa | Referencia opaca filtrada; no elige entre colecciones. |
| `/admin/validaciones?tab=documentacion` | Documentación | Contexto documental conocido. |
| `/admin/validaciones?tab=logistica` o `entregas` | Logística | Contexto logístico conocido. |
| `/admin/cartera`, `/admin/remitos` guardadas | Cobranzas, Logística | Redirecciones; identidad explícita de origen, si existe, abre detalle exacto. |
| Detalle de solicitud → Gestión avanzada | Retirado | No se ofrece una segunda pantalla antigua. Presupuestos V2 y consulta histórica permanecen. |
| Documentación → Gestionar documentos / Gestión avanzada | Retirado | Operaciones aceptadas abren sección Contrato de la Ficha; no se habilitan cargas anteriores. |
| Clientes → Ver Legajo | Solicitudes, etiqueta «Ver solicitudes» | No se presume un expediente por coincidencia de DNI/email. |
| Alertas crediticias | Detalle de solicitud explícito o bandeja vigente | Sin inferencia de colección ni selección de cliente por texto del aviso. |
| Alertas de presupuesto | Presupuestos V2 | Conserva colección explícita si está registrada. |
| URL administrativa en notificación de presupuesto | Presupuestos / Solicitudes vigentes | Sólo cambia el destino; no se invoca envío externo durante las pruebas. |

## Código retirado y servicios preservados

Se retiran las implementaciones de página de Validaciones, Cartera y Remitos y sus
handlers locales de edición, cálculo, emisión legacy, carga con URL permanente y
borrado. No tenían consumidores por importación: eran puntos de entrada de rutas.
Los tres archivos quedan únicamente como redirecciones.

No se modifican `financialEngine`, motores V2, ledger, `pdfGenerator`, servicios de
comisiones, APIs contractuales, APIs de pago, Rules ni colecciones. Esos módulos
mantienen consumidores en otros flujos y pruebas. Los portales de cliente y
vendedor afiliado no cambian. La ruta pública histórica de firma conserva su
implementación por ser un flujo contractual fuera del alcance; desaparecen sus
accesos de emisión/edición desde las tres pantallas retiradas.

`/admin/rendiciones`, `/admin/comisiones`, `/admin/clientes`, reportes, catálogo y
Envíos Low Cost se conservan: no hay una segunda implementación V2 equivalente que
permita retirarlos como simple navegación sin cambiar su operatoria. Rendiciones
sigue siendo el acceso existente a caja/custodia, no un segundo motor de cobranza V2.

## Históricos y permisos

Cobranzas conserva una consulta desplegable de `planPagos` de `solicitudes` y
`solicitudes_cuenta`: muestra importes, vencimientos y estados tal como están
almacenados, sin recalcular saldos, imputaciones ni generar recibos.
Logística conserva consulta de `remitos` registrados, sin emisión, descarga nueva,
edición de configuración ni borrado. Documentación mantiene su lector histórico.

Las consultas históricas usan permisos administrativos existentes y conservan los
resultados de las fuentes disponibles si otra falla. No hay migraciones ni
escrituras al abrir las bandejas. Los historiales permanecen en sus colecciones.
Los detalles históricos adicionales continúan en el detalle de solicitud; no se
convierte una referencia legacy en Acceptance o contrato V2.

Las bandejas de operaciones reutilizan GET administrativos de presupuestos y
contrato. Abren `?section=contract|logistics|payments` en la Ficha existente. Sólo
se altera la sección inicial visible; no se ejecuta un comando contractual. Si
falla una consulta operativa, se informa y no se presenta una lista parcial como
completa. El listado reutiliza la API existente sin paginación: su costo de lectura
crece con las versiones emitidas; no agrega índices ni infraestructura.

## Validación

- Pruebas puras de rutas, alertas, ausencia de escritura en aliases y entrada maliciosa.
- Browser Emulator: Hoy/menú, alertas exactas, redirects, secciones V2, históricos,
  roles no administrativos, desktop/mobile y comparación completa antes/después.
- Regresiones actualizadas de presupuesto, solicitudes y documentación: las
  assertions de formularios retirados se reemplazan por redirección segura y
  preservación de datos; no se restaura el formulario obsoleto para pasar tests.
- TypeScript, build, test:safe y lint diferencial. Clientes tiene dos errores
  `no-explicit-any` y seis warnings preexistentes; el cambio de enlace no los altera.

Sin merge, deploy, mutaciones productivas, cambios de Rules, IAM ni secretos.

### Resultados de esta rama

| Comprobación | Resultado |
| --- | --- |
| TypeScript y build | PASS |
| ESLint de cambios nuevos / diferencial de Clientes | PASS / 0 nuevos; 2 errores y 6 warnings anteriores sin cambios |
| `test:safe` | PASS |
| `testAdminCanonicalNavigation.ts` | PASS |
| `testBudgetV2.ts` | PASS |
| Modelos de solicitudes / documentación | PASS 21/21 / 23/23 |
| Browser canónico desktop/mobile: alertas, redirecciones, secciones, históricos y roles | PASS; comparación Firestore antes/después idéntica |
| Browser Presupuestos V2 desktop/mobile y cuatro recorridos | PASS |
| Browser Solicitudes desktop/mobile | PASS |
| Browser Documentación desktop/mobile | PASS |

Capturas sintéticas: `/tmp/cuenta-hogar-admin-canonical/today-{1280,390}.png`,
`cobranzas-{1280,390}.png` y `logistica-{1280,390}.png`.
Los primeros intentos de regresión señalaron expectativas del UI retirado y una
espera prematura tras redirección; las comprobaciones se actualizaron al alcance
aprobado y las suites completas finalizaron correctamente.
