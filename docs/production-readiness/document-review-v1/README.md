# Paquete documental propuesto desde originales — revisión 1

**Estado: PROPOSED_NOT_APPROVED. No instalable ni habilitado para emisión.**

Este PR integra los originales en el renderizador productivo PR #80. La misma composición genera las vistas previas de la operación y, únicamente después de la aprobación e instalación de un paquete exacto, los documentos emitidos. Se retiró el renderizador ReportLab offline del PR. `finalPackages.json` continúa vacío y no se habilita producción. Las muestras llevan datos sintéticos y **BORRADOR — NO VÁLIDO PARA FIRMA** en cada página.

## Fuentes y evidencia

| Documento | Fuente principal | SHA-256 del original |
|---|---|---|
| Mandato | `Contrato de Mandato Comercial - Cuenta Hogar SRL V3.pdf`, 3 páginas | `8e23a3734506a63920de1b75a3fdcb4f0c6fe88c13c1941b3357ebd9e1a3b4d6` |
| Pagaré | `Pagaré a la Vista (Sin Garante) - Cuenta Hogar SRL.pdf`, 2 páginas | `6f22b6f9bae6fd75f989ed9fb33ef53052832a43fff5d3f52fd30db56c3253b6` |
| Remito | `src/lib/pdfGenerator.ts#renderRemitoModelo`, transcripción previamente preservada | `851708304b61d6e278303bb15e11bc79cc53edc4d276145ec0bd1a80207d30b5` |

Los dos originales se localizaron en Downloads y sus bytes se cotejaron con los hashes ya registrados. Las transcripciones históricas en `../legal-package/` permanecen sin cambios. Cada bloque del nuevo catálogo conserva `originalText` y `text` propuesto; la suite de integración exige que la concatenación del texto original de mandato/pagaré reconstruya **íntegramente y en orden** la extracción registrada, normalizando sólo espacios y rótulos de página. La comparación no sustituye la inspección visual de los cinco folios originales, también realizada.

Se conserva la declaración del titular de revisión previa por su abogado. No se conoce evidencia profesional identificada de aprobación de estas versiones derivadas exactas, ni se registra `VERIFIED`.

**Representación:** nombramiento y aceptación como Gerente Titular observados en `IMG_1358.HEIC`; todavía no se dispone de la escritura íntegra para verificar firma individual, facultades y limitaciones. El domicilio original fotografiado es Charcas 1101; **se mantiene Caracas 1101** por confirmación expresa del titular. Reforma de domicilio pendiente de respaldo. Ver [evidencia societaria y hashes](CORPORATE_EVIDENCE.md).

## Comparación propuesta vs. originales

| Parte | Decisión / diferencia exacta | Validación pendiente |
|---|---|---|
| Identificación de la empresa | Se completan CUIT `30-71962686-2` y domicilio `Caracas 1101, Ciudad Autónoma de Buenos Aires, CP 1431`; se normaliza la razón social a **LOOP GESTIÓN INTEGRAL S.R.L.**. Cuenta Hogar sólo es nombre comercial. | Datos confirmados por el titular; cotejo del paquete exacto. |
| Representante | Se conserva Juan Pablo Mosqueira Morales, Socio Gerente, ya presente en el original y ahora confirmado expresamente. | Designación y aceptación observadas; facultades, firma individual y límites pendientes de escritura completa. |
| Mandato, PRIMERA | Íntegra: mandato irrevocable, intermediación, facturación del proveedor y obligación de pago. Se completan cantidad 1, producto ficticio y NUEVO. | Revisión exacta del paquete, sin sustituir por la redacción técnica simplificada. |
| Mandato, SEGUNDA | Íntegra, incluidos los rótulos `Valor Neto del Bien + Gastos de Gestión y Logística`, `Costo Financiero Total (CFT)` y `VALOR TOTAL A FINANCIAR`. Primeros dos importes pendientes: **no** se equiparan servicios al CFT ni se inventa un reparto. Total $1.740.000. | Correspondencia aprobada entre este desglose y el modelo vigente de capital + servicios brutos con IVA incluido. |
| Mandato, TERCERA | Íntegra: se conserva anticipo condicional (no previsto en el ejemplo), tabla original y compromiso de **un (1) pagaré**. Se completa cuota 1 y cuotas 2 a 12; se conserva “Del 1 al 10 de cada mes”. | Los 12 vencimientos de ejemplo son día 5. Una operación con días incompatibles no puede adaptar silenciosamente la cláusula. |
| Mandato, CUARTA | Íntegra: mora y exigibilidad del saldo. Porcentaje visible como pendiente, sin valor inventado. | Definición/validación del punitorio original. No activa recargos del motor. |
| Mandato, QUINTA | Íntegra: remito/acuse y conformidad exterior/funcionamiento inicial. | Validación conjunta con remito y procedimiento vigente de rechazo por daños. |
| Mandato, SEXTA | Íntegra: fabricante/proveedor, asistencia administrativa, bienes usados y obligación posterior a rotura/pérdida. | No se añaden servicios por tres años ni cláusulas de la plantilla V4. |
| Mandato, SÉPTIMA | La frase original “Tribunales Ordinarios de [CIUDAD/PROVINCIA]” se sustituye, por decisión expresa del titular, por **“tribunales competentes correspondientes al domicilio del cliente”**. | Es una adaptación jurídica explícita, no sólo tipográfica; requiere validación de la versión exacta. |
| Pagaré | Íntegros vista/sin protesto, referencia normativa, orden/cesión, valor recibido, mora, capitalización mensual, caducidad, renuncia de fuero y accesoriedad al mandato. Total $1.740.000 coincidente, también en letras. | Punitorio, capitalización, lugar de pago y competencia propios del pagaré. **No** hereda automáticamente la jurisdicción del mandato ni el domicilio social como lugar de pago. |
| Datos y fecha | Cliente, domicilio, producto, importes y fechas de una única fixture sintética. Las fechas y lugares de mandato/pagaré son variables independientes. | Para emisión: expediente validado y autorización explícita con lugares/fechas reales. No se usan fechas del reloj del generador. |
| Remito | Se mantienen ambas frases operativas y los campos existentes: origen, destino, destinatario, DNI/CUIT, contacto, dirección, producto, serie y dos firmas. Header con razón social/CUIT/domicilio confirmados. Firma del despachante identificada por su función, sin atribuir automáticamente representación societaria. | No existe un original de remito con aprobación profesional identificada. Cotejar esta versión y los controles de entrega; no declara recepción real. |
| Presentación | Logo oficial en mandato/remito; cero imágenes en pagaré. Tipografía y tablas reorganizadas, todos los textos nativos/seleccionables, firmas vacías, páginas numeradas y advertencia de revisión. | No se transfiere aprobación del original a esta versión por conservar cláusulas. |
| Presentación económica adicional | Se añaden el resumen de capital/servicios brutos/total y la tabla de los 12 importes/fechas persistidos, también en el layout de emisión propuesto. No se recalculan valores. | Cotejar estos agregados de presentación junto con el texto íntegro. La advertencia BORRADOR y los marcadores pendientes pertenecen a revisión; el paquete final tendrá hashes propios. |

No se ejecutó una valoración jurídica de exigibilidad ni se declararon cláusulas válidas. Se preservan los originales y se señalan diferencias que requieren validación.

## Matriz de variables y destino de integración

| Variable | Fuente canónica para una emisión futura | Destino / regla |
|---|---|---|
| Nombre, DNI, domicilio, localidad, provincia, CP, email, WhatsApp | `ContractSnapshotV2.personalData` y `addressInterpretation` tras validación | Mandato/pagaré/remito; no sustituir por solicitud o búsquedas de coincidencias. |
| CUIT/CUIL del cliente | `snapshot.employmentData.cuil` | Mandato y datos del pagaré. No inferirlo del DNI. |
| Razón social, CUIT, domicilio | `snapshot.issuer` del paquete aprobado; fuente de preparación `legalEntity.ts` | Mismo emisor en los tres instrumentos. No es el lugar de pago del pagaré. |
| Representante/cargo | `snapshot.issuer.representative` del paquete exacto | Designación observada en copia; facultades completas pendientes antes de aprobar. |
| Producto, cantidad y condición | `snapshot.acceptedReference` + `snapshot.productDetails` con conformidad vigente | Mandato y remito; sin alterar snapshot aceptado. |
| Capital, servicios y total | `snapshot.economicTerms` | Total del mandato = pagaré; IVA incluido, sin sumarlo. |
| Cuotas/vencimientos | `snapshot.paymentSchedule.installments` | Filas exactas, sin cálculo dentro del PDF. |
| Lugar/fecha mandato | `snapshot.documentContext.contractIssuePlace/contractIssueDate` | Variables explícitas y autorizadas, distintas de timestamps UTC. |
| Lugar/fecha pagaré | `snapshot.documentContext.promissoryNoteIssuePlace/promissoryNoteIssueDate` | Independientes del mandato; conservar política argentina vigente. |
| Competencia del mandato | Política propuesta `CLIENT_DOMICILE_COMPETENT_COURTS` y domicilio validado | Texto propuesto confirmado por titular, pendiente validación exacta. |
| Competencia/lugar de pago pagaré | **Pendiente**, no copiar `jurisdiction` global | No completar hasta validar la regla específica. |
| CFT/desglose/punitorio | **Sin correspondencia aprobada en el modelo actual** | No completar con cálculos ni tasas nuevas; decidir el texto/variables antes de instalar. |
| Remito, origen/destino/serie/responsables | Origen y serie explicitados por Administración en la autorización; destino/cliente/producto del snapshot | Se congelan bajo el mismo hash. Las firmas del formulario quedan vacías; el cierre exige además los controles existentes de entrega y custodia. |
| Número CH | Reserva transaccional vigente | Nunca `TEST`, fecha o UUID como sustituto; muestra sin número. |

## Integración implementada

- `productionV2/originals.ts`: transforma los bloques cotejados en plantillas versionadas. Los textos originales permanecen en `originalText`; las plantillas y el paquete se hashean con las funciones vigentes.
- `originalPdf.ts`: composición nativa jsPDF compartida, sin IO ni cálculos económicos. Logo en mandato/remito; pagaré sin imágenes. Presenta las 12 filas guardadas, firmas y texto íntegro. Normaliza sólo la viñeta negra a una viñeta WinAnsi para evitar el fallo tipográfico conocido.
- `pdf.ts`: selecciona este layout sólo para paquetes `OWNER_ORIGINALS_V1`, después de validar snapshot, paquete aprobado y hashes. Los paquetes anteriores sin este campo conservan su comportamiento. Lecturas históricas verifican sus propios hashes sin regenerar archivos.
- `operationDraftServer.ts`: la misma proyección administrativa autorizada, con identidad y conformidad vigentes, genera ahora los tres borradores originales. No crea snapshot, contador, archivo Storage ni auditoría de emisión al consultar.
- `OperationDocumentPreviews`: tres botones y comprobación SHA-256, vinculados a revisión/usuario/operación; respuestas antiguas no sustituyen la revisión actual.
- `OriginalsPolicy` es una extensión opcional **inmutable dentro del paquete aprobado**, con competencia/lugar de pago del pagaré independientes, porcentaje explícito, referencias de facultades y reforma de domicilio. No se instala ningún valor de ejemplo como política comercial.
- `originalBindings.ts` y formulario de autorización: clasificación explícita del importe original (Valor Neto + Gestión/Logística y CFT), referencia de conformidad específica y datos de despacho/serie. Se congela dentro de `documentContext.parameters`, bajo hash de autorización y snapshot. No modifica capital, servicios, total, cuotas, presupuesto ni aceptación. El desglose debe sumar exactamente el total guardado; campos ausentes y cronogramas fuera del 1 al 10 (desde cuota 2) rechazan autorización/congelamiento. No se distribuyen automáticamente servicios ni IVA.
- El catálogo candidato sigue **PROPOSED_NOT_APPROVED**. No es suficiente cambiar `installable`: la instalación futura exige un `FinalPackage` completo, revisión de código, hashes exactos y aprobación profesional registrada. El catálogo desplegable continúa vacío.

### Fuentes y compatibilidad

| Datos añadidos | Persistencia / consumidor | Compatibilidad |
|---|---|---|
| `FinalTemplate.layout/blocks`, `FinalPackage.originalsPolicy` | Catálogo inmutable de código; renderizador, registro de aprobación | Opcionales; paquetes viejos conservan su hash y layout. |
| `originalNetManagementLogistics`, `originalCft`, `originalAllocationConformity` | Autorización → `snapshot.documentContext.parameters` | Sólo paquetes nuevos; no migración ni edición de snapshots existentes. No duplican saldos: son una clasificación declarada que se concilia con el total. |
| `dispatchOrigin`, `productSerial` | Misma autorización y parámetros congelados | Explicitados por Administración; no copiar proveedor interno ni notas privadas. Destino/cliente/producto salen del expediente. |
| Pagaré: jurisdicción/lugar de pago/punitorio | Política del paquete exacto | No hereda jurisdicción del mandato ni domicilio social. Requiere revisión antes de instalar. |

## Reproducción y hashes

`output/pdf/document-review-v1/manifest.json` identifica renderer, recursos, plantillas, proyección sintética y bytes exactos de cada PDF. Se genera mediante `testOriginalDocumentIntegrationEmulator.ts` llamando al servidor real de lectura. Dos lecturas independientes deben devolver idénticos bytes y conservar updateTime de las fuentes. Los hashes no prometen igualdad entre distintas operaciones/revisiones.

Ejecutar con el entorno demo y los hosts Auth/Firestore/Storage definidos en `../TEST_RESULTS.md`, sin credenciales productivas:

```sh
node_modules/.bin/firebase emulators:exec --project demo-cuenta-hogar --config firebase.operations-lab.emulator.json --only auth,firestore,storage 'node_modules/.bin/tsx scripts/testOriginalDocumentIntegrationEmulator.ts'
python3 scripts/testOriginalDocumentReview.py
```

El fixture ilustrativo anterior queda como referencia del caso económico. Los PDF actuales se originan en un expediente sintético completo de Emulator. Los lugares/fechas no guardados se muestran pendientes; nunca se usa la fecha del renderizado como fecha contractual. Las pruebas de emisión completa utilizan otra política **sintética no instalable**, para verificar técnicamente el circuito sin declarar aprobación real.

## Numeración CH preparada, sin inicializar

Se conserva el procedimiento de `../LAUNCH_CONFIGURATION.md`. Destino: `contractNumberingV2/CONTRACT_NUMBERING_V1`. Antes de escribir: inventario en lectura del contador, `contractNumbersV2`, `contractOriginsV2` y `contractSnapshotsV2`; cotejo de secuencia máxima, colisiones y reservas. No se realizó ese inventario productivo en esta tarea ni se presupone secuencia inicial.

El manifiesto de una futura inicialización necesita la última secuencia decimal **inventariada y autorizada**, referencia de autorización, `executionMode: PRODUCTION`, política `CONTRACT_NUMBERING_V1` y precondición exacta de ausencia/updateTime. No se crea automáticamente desde el PDF ni desde el catálogo. Números reservados no se borran ni reutilizan. Publicación, configuración, aprobación jurídica y autorización por operación siguen siendo decisiones separadas. ARCA permanece fuera de alcance.

## Pendientes exactos para emitir

1. Folios completos de administración/representación y reformas vigentes para verificar facultades, firma individual y límites; instrumento de modificación del domicilio a Caracas 1101. La designación y aceptación ya fueron observadas en copia.
2. Validación identificable de los textos/versiones/hashes exactos de mandato, pagaré y remito (profesional, fecha y referencia documental), incluidas las adaptaciones listadas.
3. Competencia y lugar de pago del pagaré; validar separadamente la jurisdicción del mandato elegida por el titular.
4. Resolver sin inventar la correspondencia de CFT/desglose y el punitorio/capitalización del original con el modelo económico actual. No hay porcentaje ni distribución aprobados.
5. Instalar el paquete completo únicamente después de fijar los campos pendientes y aprobar sus versiones/hashes exactos. La integración técnica ya está implementada; las muestras no constituyen aprobación jurídica.
6. Inventario/autorización de CH, configuración explícita del adaptador y autorización de cada operación con expediente válido, conformidad, lugares/fechas reales. Sin eso, ninguna emisión.

## Publicación y habilitación pendientes

1. Revisar y mergear manualmente este PR. Verificar el SHA resultante; desplegarlo sólo con autorización, conservando `PRODUCTION_OPERATIONS_ENABLED=false`, catálogo final vacío y demás overrides.
2. Realizar smoke de lectura de las tres vistas previas. No emitir, firmar, entregar ni acreditar pagos reales para probar la publicación.
3. Completar las políticas y evidencias pendientes; cotejar el renderizado exacto con el profesional. Instalar el paquete aprobado en una revisión de código independiente, con sus hashes de texto, recursos y renderer. Una declaración administrativa no instala plantillas.
4. Inventariar CH y presentar su inicialización con precondición y autorización exactas. Nunca usar el contador del fixture ni presuponer secuencia 1.
5. Bajo autorización separada, configurar UIDs reales verificados y habilitar el adaptador. Registrar la aprobación profesional exacta y los alcances por operación. Entrega, finanzas e invitación mantienen sus requisitos propios. ARCA no se habilita.

[Pruebas y límites](VALIDATION.md) · [Capturas](screenshots/) · [Resultado del recorrido de tres perfiles](browser-results.json).
