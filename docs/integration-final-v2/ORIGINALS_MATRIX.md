# Originales del titular y plantillas derivadas — PR75

## Procedencia comprobada

Archivos entregados por el propietario, conservados en su carpeta Downloads. SHA-256 de bytes recalculado y coincidente con `docs/OPERATION_CONTRACT_DRAFT_PREVIEWS.md`. No se suben originales a Git ni a Storage. No se selecciona otro archivo más reciente por su nombre.

| ID documental | Versión de registro | Archivo | SHA-256 de bytes |
|---|---|---|---|
| owner-original-mandate-v3 | OWNER_ORIGINAL_MANDATE_V3 | Contrato de Mandato Comercial - Cuenta Hogar SRL V3.pdf | 8e23a3734506a63920de1b75a3fdcb4f0c6fe88c13c1941b3357ebd9e1a3b4d6 |
| owner-original-note | OWNER_ORIGINAL_NOTE_UNVERSIONED | Pagaré a la Vista (Sin Garante) - Cuenta Hogar SRL.pdf | 6f22b6f9bae6fd75f989ed9fb33ef53052832a43fff5d3f52fd30db56c3253b6 |

UNVERSIONED es una etiqueta técnica: el pagaré no tiene número de versión documentado. No representa una fecha de aprobación. Ambos originales están aprobados **según declaración del propietario**. Profesional, fecha y referencia de validación no disponibles. No se requiere repetir esa revisión: se requiere identificar su evidencia y comprobar las diferencias de las plantillas derivadas. Las propuestas de `docs/legal-review/` no sustituyen estos originales.

## Matriz de diferencias de contenido

Comparación del texto de todas las páginas originales (mandato 3; pagaré 2) con `operationDraftTemplates.ts` y la proyección vigente. Esta matriz no aprueba modificaciones jurídicas.

| Clase | Original | Plantilla/proyección vigente | Tratamiento pendiente |
|---|---|---|---|
| Variable de operación | Cliente, DNI/CUIL, domicilio, contacto en blanco | Datos persistidos del borrador; faltantes explícitos | Completar mediante circuito autorizado, sin inferencias |
| Variable de operación | Cantidad, descripción y nuevo/usado | Snapshot aceptado y cantidad/condición guardadas | No inferir condición ni cambiar Acceptance |
| Variable económica | Casilleros de importes y fechas | Capital, servicios brutos, total y cronograma persistidos; pagaré por mismo total | Sin recalcular en PDF ni sumar IVA a cuotas |
| Tipografía | Letter; pagaré con datos del deudor en segunda página | A4, fuentes locales, tablas, texto seleccionable, paginado | No implica aprobación del texto |
| Presentación | Modelos originales | Mandato con logo oficial; pagaré sin logo; advertencia BORRADOR — NO VÁLIDO PARA FIRMA | Conservar advertencia y ninguna numeración definitiva |
| Contenido jurídico | Mandato irrevocable | Mandato específico, representación limitada, sin irrevocabilidad | Comprobar contra aprobación profesional; no equivalencia automática |
| Contenido jurídico | Factura supeditada a disponibilidad/origen | Factura a nombre del cliente para producto nuevo; tratamiento específico de usados | Validación de cambio de redacción |
| Contenido económico | Valor neto + gestión/logística, CFT, total a financiar | Capital + Servicios de Cuenta Hogar; no CFT; IVA contenido según modelo fiscal persistido | No inventar distribución entre gestión, entrega y asistencia técnica por tres años |
| Contenido económico | Anticipo opcional y cuotas del 1 al 10 | Sin anticipo; cronograma individual persistido | No trasladar anticipo ni fechas genéricas |
| Contenido jurídico | Una cuota impaga, punitorio mensual | Sin recargos automáticos; propuesta de dos cuotas, intimación y diez días | Cambio material pendiente de comprobación; no habilita ejecución |
| Contenido jurídico | Remito implica conformidad exterior y funcionamiento | Tres firmas, custodia, observaciones; no certificación técnica ni renuncia general | Comprobar texto y circuito legal |
| Contenido jurídico | Garantía exclusivamente proveedor, usado tal como está; exclusiones amplias | No se trasladan exclusiones generales; revisión según operación | Validación profesional de texto derivado |
| Pagaré jurídico | A quien designe, Art. 50, punitorios capitalizables, caducidad y renuncia de fuero | Beneficiario LOOP; sin intereses/capitalización; exigibilidad y coordinación pendientes | No atribuir aprobación del original a estas diferencias |
| Formal | CUIT y domicilio societario en blanco | LOOP GESTIÓN INTEGRAL S.R.L.; 30-71962686-2; Caracas 1101, CABA, CP1431 | Datos confirmados por titular, no sustituyen facultades de firma |
| Formal | Representante nombrado en original; jurisdicción/lugar/fecha en blanco | Facultades, jurisdicción y lugar/fecha efectivos pendientes | No inferir facultades ni jurisdicción desde domicilio |

## Estados y compatibilidad

- Original: `source.type=ORIGINAL_FILE`, `hashBasis=FILE_BYTES`, `OWNER_REPORTED` mientras sólo conste la declaración.
- Versión profesional identificada: `VERIFIED` exige fecha válida, profesional y referencia. Registro administrativo, no habilitación de emisión.
- Plantilla derivada: `TECHNICAL_TEMPLATE`, `CANONICAL_TEMPLATE`; comparación pendiente aunque el original esté aprobado.
- `source` agrega documento, referencia y semántica de hash a los nuevos registros. Los registros anteriores sin source permanecen legibles, con digest, fecha y updateTime intactos; no se migran. Replay exacto devuelve el registro existente antes de validar el catálogo actual, preservando comandos históricos.
- Nuevos comandos sólo aceptan combinaciones exactas del catálogo versionado del servidor. Referencias desconocidas o hash/version/archivo inconsistentes se rechazan. Historia append-only; actor y hora del servidor, sin actualización de registros.
- El registro no invoca numeración, snapshots, formalización, entrega, invitaciones ni cobranza. `productiveIssuanceEnabled` siempre false. Todas las futuras habilitaciones requieren aprobación independiente.

## Pendientes reales

Identificar evidencia de revisión ya realizada (fecha/profesional/referencia cuando estén disponibles); comprobar cambios materiales de las plantillas; confirmar facultades, jurisdicción y parámetros de emisión; resolver alcance/distribución de servicios sin porcentajes inventados. No se cambia economía ni se activa ARCA. No hubo escrituras productivas.
