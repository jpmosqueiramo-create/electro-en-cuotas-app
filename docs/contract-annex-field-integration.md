# Vinculación de anexos y logística

La serie/IMEI se registra opcionalmente en Proveedor y logística, al recibir el producto o mediante «Registrar serie o IMEI». No bloquea emisión si no se conoce. `productSerial?: string` (hasta 100 caracteres, sin controles ni etiquetas) es un campo aditivo de OPERATION_FULFILLMENT_V2. No migra ni escribe seguimientos antiguos al consultarlos. UPDATE_PRODUCT_SERIAL conserva estados, costo y fechas; usa autorización administrativa, revision/CAS, auditoría e idempotencia existentes. No se admite después de cerrar la entrega.

Al autorizar una nueva emisión LOOP, una lectura transaccional captura la serie y la referencia de la propuesta vinculada por `conformity.proposalCommandId`. Valida identidad operativa y digest vigente de la propuesta. El contexto sellado incorpora `loopAnnexFieldsVersion`, `loopProductSerial`, `loopAcceptedProposalReference`, `loopAcceptedProposalPdfHash` (strings). Consumidores: snapshot de autorización/emisión y renderer de anexos. Si la conformidad histórica no vincula una propuesta preparada, se identifica explícitamente el presupuesto y versión; no se inventa una referencia CH-PROP.

Anexo I y III: serie si existe, espacio manuscrito si no. Anexo I: referencia exacta de la propuesta aceptada. Anexo II: bien, referencia, canal y fecha de aceptación en cabecera. Anexo III: referencia y canal. Los datos de aceptación salen del expediente guardado; no se deducen de conversaciones. No cambia cláusulas, precios, tasas, aceptación o firmas. No incorpora automáticamente capturas del chat.

Remito previo a entrega: mantiene espacios para fecha/hora reales, responsable, inspección, observaciones y firmas. La sección «Remito firmado y entrega real» explica el circuito y permite consultar la foto firmada ya verificada, observaciones y la fecha real de entrega registrada. Reutiliza DELIVERY_RECEIPT y el cierre existentes; no presume firma por cargar un archivo, no marca entrega por programarla y no modifica PDF emitido ni archivo firmado. Sin un nuevo PDF que simule una firma o una entrega.

El paquete técnico loop-consolidated-20261030-v3-annex-fields se instala como nuevo, preservando todos los paquetes previos. No cambia Firestore Rules, Storage Rules, rutas de colecciones ni configuración productiva. Sin migración masiva.

Esta rama parte de main db116cef y es independiente del CFT pendiente en PR #118. Al integrar ambas se deben reconciliar el renderer/manifiesto y crear una versión técnica conjunta, preservando los paquetes y cambios de ambas; no reemplazar una implementación por la otra.
