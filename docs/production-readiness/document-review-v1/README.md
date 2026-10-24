# Paquete documental propuesto desde originales — revisión 1

**Estado: PROPOSED_NOT_APPROVED. No instalable ni habilitado para emisión.**

Este PR prepara tres instrumentos completos para cotejo documental, sus fuentes, variables y hashes. No modifica cláusulas de los generadores actuales ni instala el candidato en `finalPackages.json` (continúa vacío). No genera snapshots, números CH, aceptaciones, firmas, entregas, cobros ni registros de aprobación. Los PDF son propuestas con datos ficticios y la advertencia **BORRADOR — NO VÁLIDO PARA FIRMA** en todas las páginas.

## Fuentes y evidencia

| Documento | Fuente principal | SHA-256 del original |
|---|---|---|
| Mandato | `Contrato de Mandato Comercial - Cuenta Hogar SRL V3.pdf`, 3 páginas | `8e23a3734506a63920de1b75a3fdcb4f0c6fe88c13c1941b3357ebd9e1a3b4d6` |
| Pagaré | `Pagaré a la Vista (Sin Garante) - Cuenta Hogar SRL.pdf`, 2 páginas | `6f22b6f9bae6fd75f989ed9fb33ef53052832a43fff5d3f52fd30db56c3253b6` |
| Remito | `src/lib/pdfGenerator.ts#renderRemitoModelo`, transcripción previamente preservada | `851708304b61d6e278303bb15e11bc79cc53edc4d276145ec0bd1a80207d30b5` |

Los dos originales se localizaron en Downloads y sus bytes se cotejaron con los hashes ya registrados. Las transcripciones históricas en `../legal-package/` permanecen sin cambios. Cada bloque del nuevo catálogo conserva `originalText` y `text` propuesto; el preparador exige que la concatenación del texto original de mandato/pagaré reconstruya **íntegramente y en orden** la extracción registrada, normalizando sólo espacios y rótulos de página. La comparación no sustituye la inspección visual de los cinco folios originales, también realizada.

Se conserva la declaración del titular de revisión previa por su abogado. No se conoce evidencia profesional identificada de aprobación de estas versiones derivadas exactas, ni se registra `VERIFIED`.

**Representación:** el titular confirmó Juan Pablo Mosqueira Morales, Socio Gerente; coincide con el texto del mandato original. Se inspeccionó `Estatuto Objeto Social propuesto por Ricardo.pdf` (SHA-256 `bfa6542380f0e4d5da1e066ffa7a31fd4296fafe5ff1e1ba92677c75a4f49136`). Contiene una propuesta de artículo de objeto social para “Cuenta Hogar S.R.L.”, no la designación ni las facultades del gerente de **LOOP GESTIÓN INTEGRAL S.R.L.** No se lo utiliza como acreditación de representación. Hace falta el instrumento societario vigente que documente designación/facultades, con su referencia verificable.

## Comparación propuesta vs. originales

| Parte | Decisión / diferencia exacta | Validación pendiente |
|---|---|---|
| Identificación de la empresa | Se completan CUIT `30-71962686-2` y domicilio `Caracas 1101, Ciudad Autónoma de Buenos Aires, CP 1431`; se normaliza la razón social a **LOOP GESTIÓN INTEGRAL S.R.L.**. Cuenta Hogar sólo es nombre comercial. | Datos confirmados por el titular; cotejo del paquete exacto. |
| Representante | Se conserva Juan Pablo Mosqueira Morales, Socio Gerente, ya presente en el original y ahora confirmado expresamente. | Evidencia societaria de designación vigente y facultades; no inferirlas de esta declaración. |
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
| Notas de revisión | Notas externas al clausulado distinguen pendientes y un anexo técnico del mandato expone los 12 importes/fechas guardados. No son cláusulas nuevas. | Las notas/advertencias son exclusivas del paquete de revisión; cualquier versión final sin ellas tendrá sus propios bytes y hashes para cotejo. |

No se ejecutó una valoración jurídica de exigibilidad ni se declararon cláusulas válidas. Se preservan los originales y se señalan diferencias que requieren validación.

## Matriz de variables y destino de integración

| Variable | Fuente canónica para una emisión futura | Destino / regla |
|---|---|---|
| Nombre, DNI, domicilio, localidad, provincia, CP, email, WhatsApp | `ContractSnapshotV2.personalData` y `addressInterpretation` tras validación | Mandato/pagaré/remito; no sustituir por solicitud o búsquedas de coincidencias. |
| CUIT/CUIL del cliente | `snapshot.employmentData.cuil` | Mandato y datos del pagaré. No inferirlo del DNI. |
| Razón social, CUIT, domicilio | `snapshot.issuer` del paquete aprobado; fuente de preparación `legalEntity.ts` | Mismo emisor en los tres instrumentos. No es el lugar de pago del pagaré. |
| Representante/cargo | `snapshot.issuer.representative` del paquete exacto | Declaración confirmada; evidencia pendiente antes de aprobar. |
| Producto, cantidad y condición | `snapshot.acceptedReference` + `snapshot.productDetails` con conformidad vigente | Mandato y remito; sin alterar snapshot aceptado. |
| Capital, servicios y total | `snapshot.economicTerms` | Total del mandato = pagaré; IVA incluido, sin sumarlo. |
| Cuotas/vencimientos | `snapshot.paymentSchedule.installments` | Filas exactas, sin cálculo dentro del PDF. |
| Lugar/fecha mandato | `snapshot.documentContext.contractIssuePlace/contractIssueDate` | Variables explícitas y autorizadas, distintas de timestamps UTC. |
| Lugar/fecha pagaré | `snapshot.documentContext.promissoryNoteIssuePlace/promissoryNoteIssueDate` | Independientes del mandato; conservar política argentina vigente. |
| Competencia del mandato | Política propuesta `CLIENT_DOMICILE_COMPETENT_COURTS` y domicilio validado | Texto propuesto confirmado por titular, pendiente validación exacta. |
| Competencia/lugar de pago pagaré | **Pendiente**, no copiar `jurisdiction` global | No completar hasta validar la regla específica. |
| CFT/desglose/punitorio | **Sin correspondencia aprobada en el modelo actual** | No completar con cálculos ni tasas nuevas; decidir el texto/variables antes de instalar. |
| Remito, origen/destino/serie/responsables | Contexto logístico validado de la misma operación | La muestra sólo ilustra el formulario. No afirma retiro/recepción. |
| Número CH | Reserva transaccional vigente | Nunca `TEST`, fecha o UUID como sustituto; muestra sin número. |

### Límite de integración deliberado

`src/lib/productionV2/proposedPackages/originals-v1.json` es un **catálogo candidato de revisión**, no un `FinalPackage` aprobable desde la interfaz actual. No tiene consumidores en rutas, comandos o motores productivos. `finalPackages.json`, el renderer productivo, su manifiesto de hashes y las guardas permanecen intactos.

El renderer productivo actual utiliza un `JURISDICTION` común y una allowlist que no incluye CUIL/contacto ni variables propias de CFT, punitorio o lugar de pago del pagaré. **No se fuerza esta propuesta dentro de esa interfaz ni se reutiliza el renderer offline como vía de emisión.** Después de validar los textos y reglas exactos habrá que adaptar explícitamente esos bindings, el esquema de paquete/snapshot si corresponde y el layout firmado, preservar lectura histórica, generar su manifiesto de renderer y cotejar ejemplares de ese renderer. Sólo entonces instalar un `FinalPackage` exacto con su evidencia profesional. No se puede saltar ese paso promoviendo este JSON ni renombrando sus hashes.

## Catálogo, hashes y reproducción

- Catálogo propuesto: `src/lib/productionV2/proposedPackages/originals-v1.json` (incluye textos íntegros, versiones, originales, decisiones y pendientes).
- Ejemplo único: `fixture.json` — capital $580.000; servicios brutos con IVA incluido $1.160.000; total $1.740.000; 12 cuotas de $145.000; del 05/12/2026 al 05/11/2027.
- `output/pdf/document-review-v1/manifest.json`: hashes SHA-256 del catálogo, de cada definición documental, fixture, emisor, fuentes, logo, scripts y **bytes exactos de cada PDF**. Se diferencian los hashes de contenido JSON canónico de los de archivo.
- Canonicalización de JSON: claves ordenadas recursivamente, arrays en orden, JSON compacto UTF-8 sin salto final. No confundir con `packageHash` de un paquete productivo aprobado.
- El generador usa recursos locales, metadata determinista y sin reloj de emisión. No tiene conexiones ni dependencias de Firebase.
- Entorno de reproducción de PDF: Python con `reportlab`, `pypdf`, `Pillow`; comprobación adicional con `pdfplumber`. Las versiones exactas utilizadas quedan en el informe de validación; no se añaden dependencias a la aplicación.

```sh
npx tsx scripts/prepareOriginalDocumentReview.ts /tmp/ch-document-review
python3 scripts/renderOriginalDocumentReview.py /tmp/ch-document-review/render-input.json --output output/pdf/document-review-v1
python3 scripts/testOriginalDocumentReview.py /tmp/ch-document-review/render-input.json output/pdf/document-review-v1
```

El preparador toma identificación societaria y representación económica desde helpers existentes; no recalcula planes. El fixture no representa un expediente aprobado y deliberadamente no tiene aceptación, firmas ni número. Los scripts no crean datos en Emulator ni producción.

## Numeración CH preparada, sin inicializar

Se conserva el procedimiento de `../LAUNCH_CONFIGURATION.md`. Destino: `contractNumberingV2/CONTRACT_NUMBERING_V1`. Antes de escribir: inventario en lectura del contador, `contractNumbersV2`, `contractOriginsV2` y `contractSnapshotsV2`; cotejo de secuencia máxima, colisiones y reservas. No se realizó ese inventario productivo en esta tarea ni se presupone secuencia inicial.

El manifiesto de una futura inicialización necesita la última secuencia decimal **inventariada y autorizada**, referencia de autorización, `executionMode: PRODUCTION`, política `CONTRACT_NUMBERING_V1` y precondición exacta de ausencia/updateTime. No se crea automáticamente desde el PDF ni desde el catálogo. Números reservados no se borran ni reutilizan. Publicación, configuración, aprobación jurídica y autorización por operación siguen siendo decisiones separadas. ARCA permanece fuera de alcance.

## Pendientes exactos para emitir

1. Instrumento societario de LOOP que acredite designación y facultades vigentes de Juan Pablo Mosqueira Morales.
2. Validación identificable de los textos/versiones/hashes exactos de mandato, pagaré y remito (profesional, fecha y referencia documental), incluidas las adaptaciones listadas.
3. Competencia y lugar de pago del pagaré; validar separadamente la jurisdicción del mandato elegida por el titular.
4. Resolver sin inventar la correspondencia de CFT/desglose y el punitorio/capitalización del original con el modelo económico actual. No hay porcentaje ni distribución aprobados.
5. Integración final del renderer/bindings descrita arriba y cotejo de sus ejemplares exactos; no basta aprobar estos PDF de revisión para emitir otros bytes.
6. Inventario/autorización de CH, configuración explícita del adaptador y autorización de cada operación con expediente válido, conformidad, lugares/fechas reales. Sin eso, ninguna emisión.
