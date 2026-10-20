# Documentación contractual V2 — formatos de referencia

LEGAL_APPROVAL = PENDING
PRODUCTION_DOCUMENT_ISSUANCE = DISABLED

Corrección del PR #29, posterior a P5-C, P5-D1A, READY y C1. Reemplaza el diseño
genérico inicial por los dos modelos confirmados por el usuario en Descargas:
contrato de mandato comercial y gestión de compra (dos páginas A4) y pagaré a la
vista y sin protesto (una página A4). Los PDF personales originales no se agregan
a Git; se registran sus SHA-256 en templates.ts.

## Uso local

```sh
npx tsx scripts/previewContractDocuments.ts /tmp/cuenta-hogar-contract-documents-pr29
npx tsx scripts/previewContractDocuments.ts /tmp/cuenta-hogar-contract-documents-pr29 --serve
```

La CLI produce mandato.pdf, pagare.pdf, manifest.json y preview.html con datos
completamente sintéticos. El servidor opcional escucha en 127.0.0.1:4318 y sólo
sirve esos artefactos con GET/HEAD. No recibe datos de clientes ni conecta con
Firebase. No se agregan rutas o botones de emisión a la aplicación.

## Fidelidad y numeración

Se conservan Helvetica, tamaños, colores institucionales, márgenes de 15 mm,
títulos, recuadro superior derecho del legajo, tablas, orden y texto de las diez
cláusulas, salto antes de SEXTA, firmas del contrato y encabezado azul oscuro con
título dorado del pagaré. Las posiciones de las cláusulas de la segunda página
y las firmas se conservan respecto del original.

El único número contractual es contractNumber del ContractSnapshotV2. Se muestra
en el recuadro «N° de Contrato / Legajo» y como «Contrato N°» discreto en el pagaré.
El renderer verifica la identidad existente, pero nunca asigna números.

La tabla resumida mantiene sus columnas y filas agrupadas. Su altura se adapta
para mostrar cada fecha materializada del snapshot, en vez de la ventana legacy
«del 1 al 10 de cada mes». La descripción también puede ampliar su fila. Los
límites del formato se verifican: si un contenido no cabe, se rechaza con
REFERENCE_FORMAT_CONTENT_OVERFLOW, sin truncar, achicar ilegiblemente o agregar
páginas silenciosamente. Para revisar textos excesivamente largos se necesitará
una decisión explícita sobre el formato; no se modifica el snapshot.

En todas las páginas se añade, fuera del cuerpo de las cláusulas:

**BORRADOR — NO VÁLIDO PARA FIRMA — PENDIENTE DE REVISIÓN LEGAL.**

También se indican datos sintéticos, cláusulas de referencia no aprobadas y NO
FIRMAR. Estas marcas y los campos pendientes son diferencias intencionales.

## Mapeo e incompatibilidades pendientes

| Campo del modelo | Tratamiento V2 de revisión |
| --- | --- |
| Cliente, DNI, domicilio, localidad, provincia, CP, email y WhatsApp | Copia allowlist del snapshot, sin usar datos del ejemplo original. |
| CUIT/CUIL cliente | No existe en la proyección personal aprobada; NO CONSTA EN SNAPSHOT. Nunca se sustituye por DNI. |
| Nombre y descripción del bien | Copia del snapshot. Cantidad y condición nuevo/usado no se presumen: pendientes. |
| Capital aplicado a la compra | capitalAmount del snapshot, sin recalcular. |
| Servicios de Cuenta Hogar | serviceAmount del snapshot, sin distribución porcentual. |
| Total contractual | contractTotal del snapshot. |
| Cuotas e importes del contrato de mandato | Mismos valores y orden del cronograma materializado. Sin anticipo inventado ni ventana de fechas inferida. El detalle de cuotas corresponde exclusivamente al contrato de mandato. |
| Importe del pagaré en cifras y letras | Decisión comercial aprobada: exactamente contractTotal del ContractSnapshotV2, sin recálculo. Aplicación pendiente en la próxima actualización jurídica y operativa conjunta; el generador vigente aún lo muestra como referencia separada y mantiene el importe del título pendiente. Validez y exigibilidad sujetas a revisión profesional. |
| Lugar y fecha | Valores sintéticos del contexto congelado, con advertencia de parámetros legales pendientes. No acreditan emisión o firma. |
| Identidad LOOP, CUIT, domicilio legal y representación | LOOP se conserva como identidad propuesta; los parámetros no validados quedan pendientes. No se importa CUIT, domicilio o representante del modelo. |

Las referencias a financiación, la tasa de mora 0.5%, el pagaré por suma total
financiada, la jurisdicción BUENOS AIRES, las autorizaciones crediticias, cesiones,
soporte y demás cláusulas permanecen literales como texto de referencia aportado.
No son reglas económicas V2 ni decisiones jurídicas aprobadas. Su compatibilidad,
validez/exigibilidad del pagaré y eventual redacción definitiva requieren revisión
jurídica. No se efectúa cálculo alguno con esa tasa ni con el desglose legacy.
Las sustituciones de datos y parámetros pendientes no reescriben las cláusulas.

## Integridad, compatibilidad y privacidad

Una única proyección allowlist alimenta ambos documentos desde ContractSnapshotV2.
Valida hash, identidad, fechas y conciliación de valores almacenados; no consulta
catálogo ni reconstruye economía o cronograma. El formateo decimal no redondea.
Se excluyen costos/proveedores internos, factores, márgenes, datos laborales,
tokens, documentos privados y metadatos ajenos. Los originales no se distribuyen
con el código ni se usan como fondos que puedan conservar datos personales.

REFERENCE_FORMAT_REVIEW_V3 y CONTRACT_REFERENCE_REVIEW_PDF_V2 identifican la nueva
revisión. Las definiciones incluyen hashes de texto, referencias y paquete. Un
snapshot con otras definiciones se rechaza; nunca se actualizan digests o paquetes
congelados para hacerlo compatible. Reproducir el diseño genérico anterior exige
su revisión Git correspondiente. El manifest identifica snapshot, proyección y
PDF. La fecha técnica CreationDate se toma del freeze, no del reloj local, y no
es fecha jurídica de emisión.

Sólo se aceptan fixtures sintéticos y snapshots de integración READY/C1 en
Emulator con el paquete correspondiente. Generador y preview rechazan producción.
Los marcadores de fixture no son autenticación: no exponer este módulo local como
servicio para entradas arbitrarias. No se toca flujo productivo, contador,
TERMS_FROZEN productivo, Rules, IAM ni Storage.

## Pruebas y revisión visual

- testContractDocuments.ts: los 18 planes en formato 2/1 páginas; mismo número,
  proyección, determinismo, integridad, rechazo de paquete incompatible,
  privacidad, modo producción, exceso de texto y servidor local.
- verifyContractDocumentPdfs.py: A4, anclas de título y tipografía, cláusulas
  literales, salto de página, número compartido, todas las fechas del cronograma,
  importes congelados, ausencia de datos personales originales y NO FIRMAR.
  Requiere pypdf. PDF_REVIEW_PYTHON selecciona intérprete. La variable opcional
  PDF_REVIEW_REFERENCE_DIR permite comprobar hashes y transcripción contra los
  originales locales, sin copiar ni imprimir sus datos.
- testContractDocumentsBrowser.ts: preview desktop 1280/mobile 390, ambos PDF,
  sin overflow, botones de emisión ni red Firebase externa.
- testContractDocumentsEmulator.ts: generación desde snapshot obtenido por READY
  y C1, sin alterar snapshot ni contador por la generación.
- Regresiones de modelo: P5-C/P5-D1A, READY, C1 e infraestructura. Regresiones
  Emulator: READY, C1 y seguridad contractual. Además tsc, ESLint, test:safe y build.

Muestras y capturas comparativas fuera de Git:
/tmp/cuenta-hogar-contract-documents-pr29/.

## Límites

No se emiten documentos reales ni se incorpora aprobación legal. Las adaptaciones
jurídicas y las condiciones del pagaré indicadas arriba siguen pendientes. Los caracteres
fuera de Helvetica/WinAnsi se rechazan, sin corrupción o sustituciones silenciosas.
No hay merge, deploy, freeze ni mutaciones productivas autorizadas por este módulo.

## Decisión comercial aprobada: desglose V2

La cláusula SEGUNDA presenta únicamente una tabla de tres conceptos: Capital
aplicado a la compra, Servicios de Cuenta Hogar y Total contractual, copiados de
capitalAmount, serviceAmount y contractTotal del mismo snapshot. Se eliminan los
importes/etiquetas legacy y el bloque duplicado de referencia V2. No se modifican
las cláusulas jurídicas por esta decisión.

Referencias textuales que requieren adaptación y aprobación legal posterior:

- Título SEGUNDA: «Liquidación de Costos, Honorarios y Financiación» y su párrafo
  introductorio: menciones a honorarios, gastos logísticos y costo financiero.
  Deben armonizarse con los tres conceptos aprobados, sin decidir aquí su alcance.
- TERCERA: «Valor Total indicado en la Cláusula Segunda» y garantía mediante
  pagaré «por la suma total financiada». No fijan el importe del pagaré en V2.
- Aclaración de facturación, SEXTA, SÉPTIMA y texto justificativo del pagaré:
  referencias a gestión/financiación y facilidades de pago; revisión de su
  compatibilidad con Servicios de Cuenta Hogar.
- CUARTA y cláusula de mora del pagaré: tasa 0.5%, mora/exigibilidad; permanecen
  texto de referencia, nunca parámetros económicos V2 aplicados por el renderer.

El importe queda definido comercialmente por la decisión siguiente. La validez,
vencimiento/exigibilidad y restantes condiciones jurídicas siguen pendientes; no
hay emisión válida para firma ni cambio de seguridad productiva.

## Decisión comercial aprobada: pagaré V2 (2026-10-19)

Criterios para incorporar conjuntamente en la próxima actualización jurídica y
operativa, sin implementación aislada en esta revisión documental:

- Conservar el diseño original de una página A4 y la denominación exacta
  **PAGARÉ A LA VISTA Y SIN PROTESTO**, junto con sus cláusulas de referencia.
- El importe será exactamente contractTotal del ContractSnapshotV2, expresado
  en números y letras. No recalcular importes, distribuir porcentajes ni consultar
  catálogo vivo; la conversión a letras representa el mismo valor congelado.
- El pagaré no mostrará cantidad de cuotas, importe individual de las cuotas ni
  cronograma de vencimientos. Ese detalle pertenece exclusivamente al contrato
  de mandato, que no se modifica por esta decisión.
- Ambos documentos utilizarán el mismo contractNumber del snapshot, con formato
  correlativo CH-000001 y siguientes. El renderer no asigna numeración.

Esta decisión reemplaza la indefinición comercial del importe; no constituye
aprobación jurídica. La validez y exigibilidad del pagaré a la vista, su relación
con las obligaciones en cuotas y las demás condiciones siguen sujetas a revisión
profesional. Las referencias originales a financiación, suma total financiada y
mora requieren esa revisión; no se reescriben unilateralmente.

El generador, sus muestras, sus pruebas y las cláusulas permanecen sin cambios
en esta actualización de especificación. El importe exigible actualmente vacío
no se completa aquí. La futura adaptación deberá actualizar y verificar las
pruebas de contenido del pagaré conforme a estos criterios, conservando las del
cronograma del mandato. Continúan LEGAL_APPROVAL = PENDING y
PRODUCTION_DOCUMENT_ISSUANCE = DISABLED, con las marcas de borrador y NO FIRMAR.

## Actualización integral comercial V2 — revisión V5 (2026-10-19)

Esta implementación reemplaza los criterios pendientes de aplicación de la sección
anterior. Las descripciones V3/V4 anteriores registran el estado histórico; no se
reescriben ni reseallan snapshots, plantillas congeladas o PDFs existentes.

- `REFERENCE_FORMAT_REVIEW_V5`: mismos formatos 2/1 A4, encabezados, fuentes,
  colores y firmas. Se retira únicamente CUARTA y el párrafo punitorio del pagaré,
  conservando la numeración y el texto de las restantes cláusulas. No hay cláusula
  sustitutiva ni afirmación sobre eliminación de la mora jurídica.
- Perfil único `LOOP_COMMERCIAL_PROFILE_V1`: LOOP GESTIÓN INTEGRAL S.R.L., CUIT
  30-71962686-2, Caracas 1101, Ciudad Autónoma de Buenos Aires; Juan Pablo Mosqueira
  Morales, socio gerente; marca Cuenta Hogar. El perfil forma parte del hash del
  renderer. Identidad, documentos societarios y facultades siguen pendientes de
  validación jurídica; los datos de clientes de las muestras son sintéticos.
- El pagaré muestra exactamente `contractTotal`, en números y letras con centavos
  en pesos argentinos, sin cantidad/importe individual de cuotas ni cronograma.
  No reserva numeración. Validez, exigibilidad y relación con cuotas pendientes;
  no es un documento habilitado para firma.
- SEGUNDA conserva únicamente capital, servicios y total del snapshot. Los
  párrafos restantes que aluden a financiación y suma financiada requieren revisión
  profesional; no se armonizan automáticamente.
- Nuevos borradores admiten `goodsCondition` opcional, versión
  `GOODS_CONDITION_V1`, con valor explícito NUEVO/USADO; comando administrativo
  `SET_GOODS_CONDITION`, con CAS, idempotencia y evento. No se presume NUEVO.
  El campo entra en el digest READY sólo cuando existe. C1 exige coincidencia con
  `documentContext.parameters.goodsConditionVersion/goodsCondition`, ya soportados
  por el contexto versionado. Ausencia histórica conserva digests y muestra
  Pendiente. No se habilita emisión definitiva con información faltante.
- Las muestras no usan congelamiento ni fecha de generación como fecha de firma.
  El mandato identifica la residencia y deja pendiente lugar/fecha efectivos;
  el registro operativo conserva ambos por firma, incluyendo excepciones de lugar.
- Se mantiene el rechazo explícito de overflow: nunca se trunca para forzar páginas.

`OVERDUE_SURCHARGE_POLICY_V1 = NONE`: proyección pura de saldo contractual menos
pagos imputados; recargo cero, sin dependencia del paso del tiempo. No se encontró
consumo de ContractSnapshotV2 en los módulos ledger existentes. Por eso no se
modifican caja, ledger, recibos ni estadísticas legacy, ni se crea una cobranza
paralela. La política queda disponible y probada para la futura integración V2.

Ninguna actualización implica aprobación legal, freeze productivo o emisión real.
