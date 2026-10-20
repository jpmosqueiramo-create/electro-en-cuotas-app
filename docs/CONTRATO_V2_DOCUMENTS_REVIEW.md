# Documentación contractual V2 — revisión jurídica

Evolución posterior a P5-C, P5-D1A, READY y C1. Este módulo produce dos PDF
sintéticos de revisión: contrato de mandato y pagaré. No constituye emisión
contractual ni aprobación jurídica. No modifica las decisiones históricas.

LEGAL_APPROVAL = PENDING
PRODUCTION_DOCUMENT_ISSUANCE = DISABLED

## Uso local

Desde la raíz del repositorio:

```sh
npx tsx scripts/previewContractDocuments.ts /tmp/cuenta-hogar-contract-documents
```

Genera `mandato.pdf`, `pagare.pdf`, `manifest.json` y `preview.html`, exclusivamente
con un fixture sintético. Para la vista previa administrativa local:

```sh
npx tsx scripts/previewContractDocuments.ts /tmp/cuenta-hogar-contract-documents --serve
```

Abrir `http://127.0.0.1:4318`. El servidor sirve únicamente esos artefactos y el
índice, admite GET/HEAD y no recibe datos de clientes. No se incorpora una ruta ni
un botón al portal productivo. No hay entrada CLI para snapshots reales.

Todos los documentos llevan en cada página:

**BORRADOR — NO VÁLIDO PARA FIRMA — PENDIENTE DE REVISIÓN LEGAL.**

## Fuente única e integridad

`projectContractReview` recibe un ContractSnapshotV2 sellado y crea una única
proyección allowlist para ambos documentos. Copia número contractual, datos
personales, referencia, importes y filas del cronograma materializado. No lee el
catálogo, no calcula precios ni reconstruye vencimientos. Comprueba hash,
identidad, consistencia de importes, orden de cuotas y fechas. El formateo decimal
no redondea los valores almacenados.

Se aceptan únicamente snapshots sintéticos de infraestructura histórica o de la
integración READY → freeze C1 en Emulator. El generador y la vista previa fallan
en NODE_ENV=production. Los marcadores sintéticos no sustituyen autenticación:
este módulo local no debe exponerse como servicio para datos arbitrarios.

Las definiciones de plantilla LEGAL_REVIEW_V1 están vinculadas al snapshot por
hash. El paquete identifica texto, versión, código del renderer y de proyección,
versión jsPDF y configuración de presentación. Un paquete distinto se rechaza;
no se reescriben definiciones congeladas ni digests históricos. Reproducir un
snapshot anterior requiere conservar su revisión y dependencias correspondientes.
Los hashes acreditan integridad técnica, nunca aprobación jurídica.

La fecha técnica CreationDate del PDF proviene del congelamiento del snapshot y
no significa fecha de emisión ni de firma. La salida es reproducible para la
misma entrada y paquete. El manifest incluye hashes de ambos PDF.

## Contenido jurídico pendiente

LOOP GESTIÓN INTEGRAL S.R.L. se identifica como propuesta pendiente de validación
documental. CUIT, domicilio legal, representación y facultades quedan pendientes;
no se copian identidades fiscales legacy o sintéticas como datos válidos.

Las plantillas reservan espacios para el texto aprobado del mandato y del
pagaré. No reutilizan cláusulas de pdfGenerator.ts ni inventan obligaciones,
tasas, jurisdicciones o declaraciones. El total contractual es referencia
informativa: no se presume el importe del pagaré ni se redacta una promesa de
pago. Beneficiario, importe del título, exigibilidad, lugar de pago, formalidades,
lugar/fecha de emisión y calidad/cantidad de firmantes requieren aprobación.
Los espacios de firma dicen NO FIRMAR y no acreditan consentimiento.

## Privacidad y aislamiento

La proyección excluye proveedores, factores, márgenes, datos laborales, tokens,
fuentes documentales y metadatos administrativos no necesarios. No existe
persistencia, consulta Firebase, correo, publicación o acceso Storage desde el
renderer. Los ejemplos se guardan fuera del repositorio. No se activan comandos
productivos, contadores productivos ni TERMS_FROZEN productivo. Rules, IAM,
Storage y los flujos existentes permanecen intactos.

La integración de prueba obtiene un snapshot mediante el servicio C1 real en
Emulator, genera ambos documentos y comprueba que snapshot y contador no cambian
por la generación. Las escrituras de preparación pertenecen únicamente al
proyecto demo-cuenta-hogar.

## Verificación

- testContractDocuments.ts: integridad, identidad, rechazo de paquete incompatible,
  18 planes, importes decimales sin redondeo, determinismo, allowlist, modo producción,
  servidor local y extracción PDF normal/extensa.
- verifyContractDocumentPdfs.py: contenido y cronograma en orden, advertencia y
  numeración en cada página, ausencia de campos sensibles y firmas interactivas.
  Requiere Python con pypdf; PDF_REVIEW_PYTHON permite seleccionar intérprete.
- testContractDocumentsEmulator.ts: snapshot READY/C1 real, mismos número y hash,
  cronograma idéntico y ausencia de escrituras del generador.
- testContractDocumentsBrowser.ts: preview desktop 1280 y mobile 390, ambos PDF,
  sin overflow ni botones de emisión y sin red externa Firebase.
- Regresiones de modelo P5-C/P5-D1A, READY, C1 e infraestructura; regresiones en
  Emulator READY, C1, seguridad Firestore, P5-C y aceptación/documentación P4;
  navegador READY/P5-C/P5-D1A. TypeScript, ESLint de archivos nuevos, test:safe y build.

Se revisaron visualmente las seis páginas de los dos ejemplos de 18 cuotas:
cronograma completo, texto legible y espacios de firma sin solapamientos.
Artefactos: /tmp/cuenta-hogar-contract-documents/.

## Límites

No hay documento definitivo, firma, numeración productiva ni distribución a
clientes. El texto jurídico permanece pendiente. Helvetica/WinAnsi admite el
texto español previsto; caracteres no soportados se rechazan explícitamente,
sin truncarlos ni sustituirlos. Un futuro soporte Unicode requerirá versionar
fuentes y renderer. Este cambio no autoriza despliegue ni endurece permisos.
