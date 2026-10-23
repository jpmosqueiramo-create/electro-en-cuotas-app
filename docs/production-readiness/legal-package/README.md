# Paquete documental para cierre de PR #80

Estado: **preparado para decisión documental; no instalable ni aprobado para emisión**. El catálogo `approvedFinalPackages` sigue vacío. No se registró aprobación, no se creó numeración ni se modificaron documentos productivos. La declaración del propietario se conserva como `OWNER_REPORTED`.

## Fuentes exactas y textos íntegros

Los dos PDF entregados están localizados en Downloads. Se verificaron sus bytes, se extrajo el texto nativo y se inspeccionaron todas sus páginas (mandato: 3; pagaré: 2). Los PDF originales son la fuente; las extracciones normalizan espacios y no sustituyen sus bytes.

| Documento | Versión identificada | SHA-256 del PDF original | Texto íntegro |
|---|---|---|---|
| Contrato de Mandato Comercial - Cuenta Hogar SRL V3.pdf | OWNER_ORIGINAL_MANDATE_V3 | `8e23a3734506a63920de1b75a3fdcb4f0c6fe88c13c1941b3357ebd9e1a3b4d6` | [mandate-original.txt](mandate-original.txt) |
| Pagaré a la Vista (Sin Garante) - Cuenta Hogar SRL.pdf | OWNER_ORIGINAL_NOTE_UNVERSIONED | `6f22b6f9bae6fd75f989ed9fb33ef53052832a43fff5d3f52fd30db56c3253b6` | [pagare-original.txt](pagare-original.txt) |

La versión técnica actual es `OPERATION_DRAFT_REVIEW_V2`. Sus textos completos, campos y pendientes están exportados en [current-draft-text.json](current-draft-text.json). Los hashes canónicos del registro jurídico son:

- Mandato: `464e485acbf2d6bdcdbed9af8eed435d7c6d15425720655ecf5f8431a08388cd`.
- Pagaré: `0ec55226c57fec5790a422194ac27d57a8e96b5cbc9a0dd738fff6961ecbbf97`.

Las muestras sintéticas existentes [mandato](../evidence/mandato-borrador-operacion.pdf) y [pagaré](../evidence/pagare-borrador-operacion.pdf) se conservaron sin modificación. Se inspeccionaron sus cuatro páginas y se extrajo su texto completo en este directorio. Son borradores, no instrumentos finales. El manifiesto distingue hash del archivo PDF, hash del texto extraído, hash canónico de plantilla y hash del renderer: no son intercambiables.

El remito existente se documenta en [remito-existing-renderer.txt](remito-existing-renderer.txt), extracción de `pdfGenerator.ts#renderRemitoModelo`. Es una referencia técnica sin aprobación identificada. No se inventó un texto final. Los remitos completados encontrados en Downloads contienen registros y CUIT legacy; no se copiaron, adoptaron ni publicaron sus datos como plantilla final.

También existe un archivo local de mandato V5 (hash `a99415f02b847ce87af273dc6617cebe24acffe7a3879029bf36bb70258f84db`). Su nombre no demuestra que sea la versión aprobada: no sustituye automáticamente el V3 identificado. Las referencias V4 de `contractDocuments/templates.ts` tienen otros hashes (`0ff092…c64c4` y `d295df…e82b25`), diferentes de los originales cotejados; tampoco se adoptan como aprobación.

## Matriz de diferencias

Comparación textual/técnica; no constituye dictamen de validez jurídica.

| Tipo | Original identificado | Plantilla técnica actual / renderer final preparado | Evidencia o decisión pendiente |
|---|---|---|---|
| Variable societaria | LOOP; CUIT y domicilio con espacios pendientes | LOOP GESTIÓN INTEGRAL S.R.L., 30-71962686-2, Caracas 1101, Ciudad Autónoma de Buenos Aires, CP 1431; Cuenta Hogar es nombre comercial | Datos confirmados por el propietario; incluirlos en la versión exacta sometida a aprobación |
| Representación | El mandato nombra a Juan Pablo Mosqueira Morales como Socio Gerente | El borrador mantiene representación/facultades pendientes; el catálogo final exige datos explícitos | Instrumento o referencia vigente que acredite representación y facultades; no basta el nombre impreso |
| Mandato y alcance | Mandato irrevocable, producto y condición por completar | Alcance limitado a la operación; no reproduce automáticamente la irrevocabilidad | Confirmación profesional del texto derivado exacto |
| Factura del producto | Condicionada a las prácticas del proveedor | Propuesta de factura a nombre del cliente | Validación del cambio de contenido y su viabilidad operativa |
| Economía | Producto + gestión/logística, referencias a CFT y total financiado | Capital + servicios brutos con IVA incluido = total contractual; pagaré por el mismo total; no IVA adicional | Aprobar la redacción exacta compatible con el modelo vigente; no asignar porcentajes a servicios |
| Pago | Anticipo opcional y vencimiento genérico del 1 al 10 | Sin anticipo, cronograma persistido con importes y fechas individuales | Aprobar sustitución de cláusula; no cambiar datos aceptados ni generar mora nueva |
| Mora | Una cuota impaga, aceleración y punitorio porcentual en blanco | Sin recargo automático; borrador propone dos cuotas consecutivas y aviso de diez días, marcado pendiente | Aprobación expresa de ese cambio; la propuesta técnica no queda aprobada por este PR |
| Entrega/remito | Declaración de conformidad de apariencia y funcionamiento | Tres firmas, evidencia y custodia; el remito no implica una renuncia general | Texto exacto de entrega, alcance de conformidad, rechazo y custodia |
| Garantías | Remisión al proveedor, usado como está, exclusiones amplias y continuidad del pago | Redacción diferente sobre garantías y asistencia, con pendientes | Aprobar alcance, obligaciones y texto exacto; no inventar traslado/asistencia ni distribuir servicios |
| Pagaré | A la vista, sin protesto con referencia al art. 50, beneficiario o quien éste designe, punitorios/capitalización y renuncias | Borrador elimina o cambia varias de esas previsiones; usa total persistido y contexto formal pendiente | Aprobación de la versión exacta, exigibilidad, vencimiento, beneficiario, lugar, firma y diferencias; no trasladar la del original |
| Jurisdicción | Campos de ciudad/fuero pendientes | Pendiente; no se deriva de Caracas 1101 ni del domicilio del cliente | Jurisdicción contractual y del pagaré expresamente identificadas |
| Forma | Mandato 3 páginas; pagaré 2; campos en blanco | Tipografía/layout, tablas, texto seleccionable; logo en mandato/remito y sin logo en pagaré | Revisar el render final además del texto: extensión, firmas, márgenes, tablas, encabezados y pies forman parte del paquete |
| Remito | No se identificó un modelo independiente aprobado | Renderer existente y fixture de tests, ambos sin valor de aprobación | Archivo/texto exacto aprobado, campos, firmas y tratamiento documental/fiscal/traslado |

## Matriz de campos, fuente y edición

| Campo | Fuente canónica / destino | Edición y validación |
|---|---|---|
| Nombre, DNI, domicilio, localidad, provincia y CP | Borrador revisado → snapshot inmutable → variables del PDF | Sección existente de datos; acción administrativa explícita, identidad/conformidad vigentes. No fusionar por coincidencia |
| Producto | Alternativa aceptada y referencia guardada → snapshot | No reemplazar presupuesto emitido ni aceptación |
| Cantidad y condición | `productDetails` guardado → snapshot → mandato/remito | Guardado auditado antes de READY; nueva conformidad cuando corresponde |
| Capital, servicios, total | `economicTerms` persistido → snapshot → ambos instrumentos | Motor económico existente; PDF no recalcula ni añade IVA |
| Cuotas, importe, vencimientos | `paymentSchedule` persistido → tabla del mandato y ledger | Suma exacta/fechas/12 cuotas del caso de prueba; no recalcular desde legacy |
| Total en letras | Conversión lingüística del total persistido | No modifica el importe; pagaré por el mismo total |
| Empresa y representante | Paquete final versionado, todavía no instalado | Empresa confirmada; representación/capacidad deben acreditarse |
| Jurisdicción | Paquete final aprobado | No inferir del domicilio social ni del lugar de emisión |
| Lugar/fecha de ambos instrumentos | Contexto formal explícito autorizado por operación | Sin valores inventados; día local `America/Argentina/Buenos_Aires` para nueva emisión, instantes UTC en auditoría; una recuperación conserva la fecha congelada |
| Número CH, revisión y hashes | Contador autorizado + snapshot transaccional | No editables desde navegador; únicos, inmutables, auditados |
| Firmas y custodia | Evidencias privadas y eventos posteriores | No se completan desde el texto de la plantilla ni desde una declaración de aprobación |

El renderer final usa una allowlist cerrada de variables. Los campos personales/laborales que no formen parte de la versión legal aprobada no se agregan por disponibilidad. Costos internos, margen, notas de crédito y datos administrativos no se proyectan.

## Catálogo final preparado y aprobación faltante

[manifest.json](manifest.json) conserva tres entradas finales con ID/versión/hash/aprobación **nulos**, intencionalmente no instalables. No existe un hash de “documento final aprobado” que pueda completarse honestamente todavía.

Para cerrar cada entrada se necesita:

1. **Mandato**: archivo/texto final exacto y aceptación identificada de las diferencias anteriores; evidencia que vincule profesional y validación a esa versión/hash. No se solicita repetir la revisión ya realizada del original.
2. **Pagaré**: archivo/texto final exacto y evidencia de aprobación de sus cambios y campos formales, vinculada al hash.
3. **Remito**: modelo independiente aprobado o texto/layout exacto confirmado para esta operatoria, con firmas y alcance documental definidos.
4. **Comunes**: representación/facultades y jurisdicción; fecha y lugar efectivos se confirman por operación. Profesional, fecha o referencia sólo se registran cuando existan; nunca se rellenan por inferencia.
5. Revisión conjunta del texto y de los PDF renderizados, con hashes de plantillas, renderer, recursos y paquete. La autorización por operación sigue siendo independiente.

Ninguna declaración en este directorio habilita emisión, entrega, numeración, cobranza ni ARCA. Los PDF de revisión conservan `BORRADOR — NO VÁLIDO PARA FIRMA`; los del test del adaptador conservan su leyenda de prueba.


## Entrega del cierre técnico P1/P2

Los originales y las muestras jurídicas técnicas anteriores se conservan byte por byte. `evidence/technical-closure/` contiene los nuevos ejemplares **sintéticos del adaptador** para comprobar recuperación, maquetación y consistencia; sus textos ficticios no sustituyen el mandato original, el pagaré ni un remito aprobado. El catálogo final instalable continúa vacío, a la espera de los requisitos enumerados arriba. No se modificaron cláusulas ni se registró aprobación nueva.
