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
| Valor Neto del Bien | No se presupone equivalencia jurídica con capitalAmount; pendiente de mapeo. |
| Logística + soporte y CFT | El snapshot no separa estos importes. Pendientes, sin reparto 60/40 legacy. |
| Valor total a financiar | La etiqueta legacy necesita mapeo jurídico; no se equipara automáticamente con total contractual. |
| Capital, servicio y total V2 | Se muestran identificados como datos V2 del snapshot junto al bloque económico. No se recalculan. |
| Cuotas e importes | Mismos valores y orden del cronograma materializado. Sin anticipo inventado ni ventana de fechas inferida. |
| Importe del pagaré en cifras y letras | PENDIENTE. No se presume capital, total o cuota como importe del título. El total V2 aparece sólo como referencia separada. |
| Lugar y fecha | Valores sintéticos del contexto congelado, con advertencia de parámetros legales pendientes. No acreditan emisión o firma. |
| Identidad LOOP, CUIT, domicilio legal y representación | LOOP se conserva como identidad propuesta; los parámetros no validados quedan pendientes. No se importa CUIT, domicilio o representante del modelo. |

Las referencias a financiación, la tasa de mora 0.5%, el pagaré por suma total
financiada, la jurisdicción BUENOS AIRES, las autorizaciones crediticias, cesiones,
soporte y demás cláusulas permanecen literales como texto de referencia aportado.
No son reglas económicas V2 ni decisiones jurídicas aprobadas. Su compatibilidad,
importe/exigibilidad del pagaré y eventual redacción definitiva requieren revisión
jurídica. No se efectúa cálculo alguno con esa tasa ni con el desglose legacy.
Las sustituciones de datos y parámetros pendientes no reescriben las cláusulas.

## Integridad, compatibilidad y privacidad

Una única proyección allowlist alimenta ambos documentos desde ContractSnapshotV2.
Valida hash, identidad, fechas y conciliación de valores almacenados; no consulta
catálogo ni reconstruye economía o cronograma. El formateo decimal no redondea.
Se excluyen costos/proveedores internos, factores, márgenes, datos laborales,
tokens, documentos privados y metadatos ajenos. Los originales no se distribuyen
con el código ni se usan como fondos que puedan conservar datos personales.

REFERENCE_FORMAT_REVIEW_V2 y CONTRACT_REFERENCE_REVIEW_PDF_V2 identifican la nueva
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

No se emiten documentos reales ni se incorpora aprobación legal. La equivalencia
de campos económicos y jurídicos indicada arriba sigue pendiente. Los caracteres
fuera de Helvetica/WinAnsi se rechazan, sin corrupción o sustituciones silenciosas.
No hay merge, deploy, freeze ni mutaciones productivas autorizadas por este módulo.
