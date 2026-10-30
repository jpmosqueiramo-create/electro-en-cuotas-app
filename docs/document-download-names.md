# Nombres de archivos de presupuestos y contratos

- Presupuesto: `Presupuesto-P-000123-Maria-Perez-Horno-Microondas-v1.pdf`.
- Contrato y anexos: `Contrato-CH-000123-Maria-Perez-Horno-Microondas.pdf`.
- Pagaré: `Pagare-CH-000123-Maria-Perez-Horno-Microondas.pdf`.

El presupuesto recibe un número correlativo al preparar por primera vez su PDF o
WhatsApp. Las revisiones de la misma familia conservan ese número y cambian `v1`,
`v2`, etc. Si hay alternativas, el nombre agrega `y-N-alternativas`. Los números
identifican documentos; no representan una numeración fiscal. No se renumeran
archivos previamente descargados.

La asignación es una transacción de Firestore. Nuevo registro aditivo:
`budgetPdfNumberingV1/budget_{budgetId}` y reserva única
`budgetPdfNumberingV1/number_{P-000123}`. Ambos tienen `schemaVersion` string
`BUDGET_PDF_NUMBER_V1`, `budgetId` string, `sequence` entero positivo, `number`
string, `createdAt` Timestamp y `createdBy` UID. Contador independiente:
`configuracion_general/budget_pdf_number_counter_v1`, con `schemaVersion`
`BUDGET_PDF_COUNTER_V1`, `lastSequence` entero y `updatedAt` Timestamp.

POST administrativo `.../versions/{version}/sharing` valida un snapshot emitido y
activo y devuelve únicamente el DTO permitido para cliente más `documentNumber`.
Sus consumidores son la descarga PDF y la preparación de WhatsApp. Las reglas
vigentes restringen estos registros a Administración; no se cambian Rules.
No requiere migración: los presupuestos históricos se numeran al compartirlos;
no se modifican sus snapshots, hashes, aceptación ni vínculos existentes.

Contrato y pagaré conservan el número CH ya emitido y toman cliente y producto
del mismo snapshot verificado que el archivo privado. Una edición corregida
agrega `r2`, etc., sin consumir otro CH. Los PDF anteriores no se reescriben.
La API envía Content-Disposition y cada documento tiene descarga explícita con
ese nombre, además de la apertura existente. No se incluyen DNI, costos,
proveedores ni factores internos en los nombres. Se eliminan acentos y caracteres
no aptos para archivos y se limita la longitud.
