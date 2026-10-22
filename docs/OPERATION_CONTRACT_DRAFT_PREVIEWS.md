# Documentos de la operación — borradores V2

## Alcance y referencias

Base: `fdf05c50b83d1e20e8126f9faa14eea57a80ee6b`. Rama `feature/contract-operation-draft-previews`.

El usuario aportó finalmente PDF en sustitución de los DOCX inicialmente mencionados. Se extrajo el texto de todas las páginas y se revisó visualmente cada página. Los originales permanecen intactos y no se incorporan al repositorio:

| Referencia | Páginas / tamaño | SHA-256 |
| --- | --- | --- |
| Contrato de Mandato Comercial - Cuenta Hogar SRL V3.pdf | 3 / Letter | `8e23a3734506a63920de1b75a3fdcb4f0c6fe88c13c1941b3357ebd9e1a3b4d6` |
| Pagaré a la Vista (Sin Garante) - Cuenta Hogar SRL.pdf | 2 / Letter | `6f22b6f9bae6fd75f989ed9fb33ef53052832a43fff5d3f52fd30db56c3253b6` |

Son referencias de estructura y redacción, no instrucciones ejecutables ni aprobación jurídica. La salida usa A4, texto seleccionable, tablas con cabeceras repetidas, advertencia en todas las páginas y firmas reservadas. La muestra de 18 cuotas ocupa 3 páginas de mandato y 1 de pagaré; no se reproduce el salto accidental de los datos del deudor a la segunda página del pagaré de referencia. La extensión puede crecer con textos largos; no se trunca contenido para forzar un número de páginas.

## Identidad societaria y discrepancias

El borrador versionado usa exclusivamente la identidad expresamente aprobada por el propietario: **LOOP GESTIÓN INTEGRAL S.R.L., CUIT 30-71962686-2**, marca Cuenta Hogar. Esto no representa verificación documental externa ni aprobación jurídica.

Se encontraron valores distintos en `src/lib/pdfGenerator.ts` (CUIT `30-71829384-9`, domicilio Caracas 1101, CABA), `src/app/propuesta/page.tsx` y `src/app/firmar-contrato/[id]/FirmarContratoClient.tsx`. No se modifican esos generadores, pantallas ni configuraciones históricas. El perfil sintético congelado anterior tampoco es fuente de identidad real. Domicilio legal, representación y jurisdicción continúan pendientes: no se infieren del legacy.

## Correspondencia de cláusulas

Todas las propuestas siguientes permanecen **PENDIENTES DE REVISIÓN JURÍDICA**. La implementación no declara validez, aprobación o exigibilidad por generar un PDF. El texto completo versionado se encuentra en `src/lib/contractDocuments/operationDraftTemplates.ts`.

| Referencia original | Decisión aprobada | Incompatibilidad | Propuesta incorporada al borrador | Revisión |
| --- | --- | --- | --- | --- |
| Encabezados: LOOP GESTION INTEGRAL; CUIT y domicilio incompletos | LOOP GESTIÓN INTEGRAL S.R.L.; CUIT aprobado; Cuenta Hogar es marca | Título de archivo no constituye razón social; CUIT legacy diferente | Identidad aprobada, domicilio y representación pendientes | Pendiente documental/jurídica |
| PRIMERA: mandato irrevocable para gestionar, adquirir y abonar | Mandato específico, representación limitada | Irrevocabilidad por defecto no aprobada | Encargo específico de gestionar adquisición por cuenta y orden del cliente, representación limitada; sin calificación irrevocable | Pendiente |
| PRIMERA / facturación: factura supeditada a disponibilidad según origen | Nuevo: factura del proveedor a nombre del cliente, entrega y trazabilidad | Factura opcional para bien nuevo | Tratamientos diferenciados de nuevo/usado; sin factura ficticia ni elección automática de condición | Pendiente |
| SEGUNDA: valor neto + gestión/logística; CFT; total a financiar | Capital, Servicios de Cuenta Hogar y total persistidos | No existe desglose separado ni cálculo CFT validado | Tres conceptos vigentes; señalar desglose de gestión/logística pendiente, sin repartir porcentajes | Pendiente |
| TERCERA: anticipo, cuota 1, cuotas 2..N del 1 al 10 | Cronograma materializado V2, 1..18; sin anticipos vigentes | Fechas genéricas y anticipo no registrado | Cada cuota con importe y vencimiento guardados; sin anticipo inventado | Pendiente |
| CUARTA: una cuota impaga; porcentaje punitorio mensual | Sin intereses ni recargos; dos consecutivas; intimación y diez días corridos; continuidad si regulariza | Disparador, punitorios y exigencia inmediata incompatibles | Texto explícito de la decisión; mecanismo de intimación y vencimiento anticipado aún debe aprobarse | Pendiente |
| QUINTA: firma del remito implica conformidad con funcionamiento | Tres firmas físicas; revisión visual; observaciones, daños, custodia | Conformidad técnica/renuncia general no aprobadas | No entregar si falta firma; remito no es renuncia general ni certificación técnica | Pendiente |
| SEXTA: garantía exclusivamente proveedor, usado tal como está y exenciones generales | Tratamiento según origen/condición y normas aplicables, sin exenciones inventadas | No se traslada exclusión general de responsabilidad | Se explicitan los puntos pendientes sin afirmar exenciones definitivas | Pendiente |
| SÉPTIMA: tribunales [ciudad/provincia] y firma en fecha/lugar | No inventar jurisdicción ni parámetros de emisión | Falta aprobación de parámetros | Pendientes visibles y espacios de firma, sin fecha ni lugar ficticios | Pendiente |
| Pagaré: a la vista, sin protesto, a quien designe, Art. 50, lugar de pago abierto | Beneficiario LOOP; sin garante; total contractual en cifras/letras | Cesión, domicilio de pago y referencia normativa requieren revisión | Denominación conservada; importe exacto; lugar/fecha/domicilio pendientes; no se agrega aval | Pendiente |
| Pagaré: punitorio, capitalización y caducidad por cualquier obligación | Sin intereses; exigibilidad cambiaria separada del plan | Condiciones no aprobadas | Sin porcentajes ni capitalización; coordinación con el mandato expresamente pendiente; sin cantidad de cuotas ni cronograma | Pendiente |

## Variables, origen y pendientes

| Contenido | Fuente única | Tratamiento |
| --- | --- | --- |
| Cliente, DNI, domicilio, provincia, CP, contacto | `ContractDraftV2.personalData` guardado | Se valida formato; faltantes explícitos; no se toma la edición en pantalla |
| CUIL | `ContractDraftV2.employmentData.cuil` guardado | Pendiente si no consta; no se agrega otro formulario |
| Producto / descripción | Referencia aceptada, cotejada entre Budget, Acceptance y Draft | Sin catálogo vivo; sin proveedor interno, factores, margen o notas privadas |
| Capital, servicio, total | `economicTerms` guardados | Sólo proyección; validación de sumas, sin motor paralelo ni recálculo |
| Cuotas, importes y fechas | `paymentScheduleDraft` guardado | Orden, cantidades, fechas y sumatoria verificados; sin crear obligaciones |
| Cantidad y condición nuevo/usado | No disponibles en el modelo contractual actual | Pendientes. Ambos tratamientos documentales se explican; no se infiere condición del producto desde su nombre o recepción visual |
| Gestión vs logística separadas | No existe desglose validado | Se conserva Servicios de Cuenta Hogar; separación pendiente |
| Anticipo | No contemplado en V2 vigente | No se incorpora |
| Número contractual | Ninguno en el borrador | Ambos indican sin numeración definitiva; no se inventa CH ni se consulta contador |
| Snapshot definitivo | No existe con congelamiento productivo bloqueado | No se fabrica ni se congela un snapshot para previsualizar; se identifica explícitamente borrador persistido |

## Integración e integridad

`GET /api/admin/presupuestos-v2/{budgetId}/versions/{version}/contract/documents/preview` reutiliza `verifyAdminAuth`. Anónimo 401; cliente/afiliado 403. No acepta cuerpos, comandos ni parámetros de edición. Respuesta privada `no-store`.

La transacción sólo lee Budget, Acceptance, Draft, conformidad y fuentes de revisión de identidad existentes. Coteja colección e IDs, alternativa y referencia aceptadas. Fuera de la transacción genera **ambos PDF juntos** desde una sola proyección. No hay Storage, escrituras, reserva, archivo, firma, contador, congelamiento ni efectos financieros. Los documentos se devuelven en memoria y sólo se convierten en `blob:` después de verificar SHA-256 en el navegador.

La política de formato monetario conserva todos los decimales persistidos (también se prueba capital con tres decimales); no usa redondeo de presentación. El renderer nuevo no lee fuentes TS en runtime: el hash usa el código cargado, su versión, los formateadores y jsPDF, para ser compatible con standalone sin modificar el renderer histórico.

Se conservan hash del origen persistido, hash de proyección, versión/hash de plantilla, hash del renderer y SHA-256 de cada PDF. La versión es `OPERATION_DRAFT_REVIEW_V1`; una futura modificación publicada debe tener una nueva versión. No se alteran las plantillas anteriores ni los manifiestos/snapshots históricos.

Discrepancia de identidad no resuelta o conformidad requerida pendiente: se muestran los motivos y se bloquea el PDF. Los restantes faltantes se muestran como pendientes, sin valores ficticios. Al guardar una nueva revisión se descartan las vistas anteriores; la actualización manual también relee datos. Cambio de sesión, desmontaje y respuestas tardías invalidan la selección y revocan los blobs. No se crean enlaces públicos permanentes. En móvil se ofrece apertura en el visor nativo del dispositivo; se evita el iframe incrustado por su soporte irregular. En escritorio se mantiene iframe y enlace de apertura alternativo. Las capturas headless no certifican la rasterización del plugin PDF nativo; cada página se verifica adicionalmente mediante Poppler.

La ficha muestra `Documentos de la operación` directamente en la pestaña Contrato, antes del detalle de Documentación contractual, con los accesos de mandato y pagaré. Se reemplaza el acceso a ejemplos sintéticos antiguos. Las APIs históricas de muestra y de conservación quedan intactas y restringidas al Emulator como antes; no son la fuente de los nuevos documentos.

## Pruebas y evidencias

- `npx tsx scripts/testOperationDraftDocuments.ts`: 1..18 cuotas, reconciliación, decimal de capital conservado, parciales, identidad/conformidad bloqueadas, origen inconsistente, cambio guardado y PDF determinista.
- `scripts/verifyOperationDraftPdfs.py`: texto seleccionable, importes exactos y letras, dieciocho fechas, identidad societaria, aviso en todas las páginas, factura nuevos/usados, ausencia de tasas y cuotas en pagaré.
- `testOperationDraftDocumentsEmulator.ts`: acceso por rol, dos operaciones aisladas, perfil nuevo/recurrente explícito, conformidad e identidad, `updateTime` sin cambios por leer, cero snapshots/números/archivos creados por generador.
- `testContractDocumentsEmulator.ts` y `testContractV2Emulator.ts`: regresión de snapshots C1, formularios históricos/nuevos, cronograma, concurrencia e idempotencia. Los fixtures de congelamiento y de revisión pública anteriores tenían identidades sintéticas distintas entre presupuesto y datos, incompatibles con el control vigente de PR #65. Se alinea la identidad **antes de persistir la prueba**, sin quitar assertions ni modificar control productivo.
- `runOperationDraftDocumentsBrowser.ts`: Next localhost y Emulators demo; desktop/mobile, ambos PDF, edición no guardada excluida, actualización guardada, identidad bloqueada y cero peticiones productivas.
- `runContractDocumentWorkflowBrowser.ts`: regresión del confeccionador y dossier, READY/C1/archivo exclusivamente emulados. Aserciones de ejemplos genéricos adaptadas a vistas de la operación; controles de archivo, permisos y conservación preservados.
- Gates PASS: TypeScript, ESLint de todos los archivos modificados, build, `test:safe`, `git diff --check`.

Ejecución de suites con escrituras exclusivamente con `GCLOUD_PROJECT=demo-cuenta-hogar`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cuenta-hogar`, Firestore `127.0.0.1:8080`, Auth `127.0.0.1:9099` y Storage `127.0.0.1:9199`, mediante `firebase-tools emulators:exec --project demo-cuenta-hogar --config firebase.test-release.json --only auth,firestore,storage`. La identidad administrativa de cada runner es sólo emulada; no se usan tokens de sesiones reales.

Capturas y manifiesto: [evidencia](evidence/operation-contract-drafts/). PDF sintéticos: [mandato](../output/pdf/mandato-operacion-borrador.pdf) y [pagaré](../output/pdf/pagare-operacion-borrador.pdf). Los PDF no corresponden a un cliente real. El script local no versionado `scripts/testBudgetV2HttpIdempotency.ts` permanece fuera del commit.

## Preflight y publicación futura

No se necesitan migraciones, índices, nuevas colecciones, Storage, IAM, secretos, Rules ni cambios de configuración. Se reutiliza la identidad administrativa y ADC del backend existente. El código de preview permite revisión en runtime productivo autenticado, **no emisión definitiva**; las muestras históricas continúan exclusivamente en Emulator.

Antes de una publicación separadamente autorizada:

1. Revisión y merge manual del único PR. Confirmar su SHA resultante exacto de main, gates y diff de configuración vacío.
2. Revalidar en vivo App Hosting `negocio-facil-page / cuenta-hogar`, bucket `negocio-facil-page.firebasestorage.app`, Rules privadas, HMAC versión 1, rate limit y automatic rollouts deshabilitados. Esta tarea no cambia ni certifica nuevamente la configuración viva.
3. Ejecutar sólo después de autorización explícita del SHA:

```sh
npx firebase-tools apphosting:rollouts:create cuenta-hogar \
  --project negocio-facil-page \
  --git-commit <SHA_EXACTO_AUTORIZADO>
```

4. Confirmar READY/SUCCEEDED, SHA y 100 % de tráfico. Smoke de lectura con sesión Admin: abrir ficha, documentos, pendientes, ambas vistas y mobile; nunca guardar ni formalizar para probar.
5. Recuperación: volver al build previo sólo con autorización independiente, manteniendo las Rules privadas. El código anterior vuelve a mostrar muestras genéricas; no hay datos nuevos que migrar o borrar por generar vistas.

Bloqueos conservados: congelamiento productivo, número CH, emisión definitiva, FORMALIZED, entrega productiva, invitaciones y cobranza. No merge, deploy, mutaciones productivas ni modificaciones de los originales en esta entrega.

## Resultado final

TypeScript, ESLint diferencial (cero diagnósticos nuevos), build, test:safe, unitarias de documentos, extracción de texto PDF, Emulator y ambas suites browser: **PASS**. La suite browser comprueba el formulario vigente e histórico, READY, C1/archivo emulado y vistas por operación en desktop/mobile. El runner cierra explícitamente el visor PDF y utiliza un gesto de usuario CDP para aceptar la confirmación nativa de revisión; no sustituye el resultado de READY. Detalle reproducible: `docs/evidence/operation-contract-drafts/validation.json`.

La comprobación adicional `scripts/testOperationDraftStandalone.ts` inicia el paquete standalone local con proyecto demo y destinos Emulator. GET anónimo retorna **401**, antes de cualquier lectura Firebase: prueba la importación del renderer en el paquete real sin fuentes TS. No inicia usuarios ni escribe datos. Se comprobó además la preservación de capital con tres decimales y la representación en letras de todo entero seguro, sin imponer un tope comercial nuevo.
