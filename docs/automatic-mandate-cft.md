# CFT automático: honorarios e intereses

Política solicitada por el titular: MANDATE_MANAGEMENT_FINANCE_VAT_ACT365_V1. Incluye como cargos del CFT los honorarios de gestión de mandato y los intereses de financiación, ambos con IVA ya incluido. Recepción, entrega, asistencia y otros servicios permanecen en el precio de contado/base financiada; no se agregan como cargos financieros. No se modifica el precio contractual, los factores, las cuotas, el IVA ni la amortización existentes.

Base CFT = capital aplicado al producto + recepción/entrega + asistencia + otros servicios = precio completo sin financiación menos honorarios. Cargos CFT = honorarios brutos + financiación bruta. Base + cargos = total contractual. La primera cuota se paga en entrega (tiempo cero). Se resuelve la TIR de todos los pagos con fechas reales y año de 365 días; se informa como tasa efectiva anual porcentual. La TEM equivalente y TNA de referencia existentes siguen representando los flujos de financiación sobre el precio de contado completo y se identifican como IVA incluido. No deben igualarse artificialmente al CFT que incluye honorarios.

Si el primer pago agota la base del CFT o no existe tiempo para anualizar un costo positivo, se rechaza con explicación; no se inventa una tasa. Se conserva el rango máximo existente de CFT.

Cada SAVE_CONTRACT_EDITOR con servicios LOOP recalcula en servidor, sin confiar en un CFT manual remitido por el navegador. El editor calcula una vista informativa inmediata y guarda sólo mediante acción explícita. Guardar un cambio de desglose mantiene el flujo de nueva conformidad vigente.

Schema aditivo: commercialPreparation.loop.cftPolicy (string versionado) y cftCalculation {baseCents, chargesCents, managementGrossCents, financeGrossCents} (enteros en centavos). cftAnnualPercent y cftBasis existentes se calculan automáticamente. Consumidores: editor, validación de integridad, propuesta/PDF y Anexo II emitido. Sin nuevas colecciones, reglas ni migración masiva. Los snapshots congelados y las propuestas históricas sin cftPolicy conservan su criterio y validación anteriores; no se recalculan al consultarlos. Un borrador anterior adopta la política al guardar nuevamente.

Paquete técnico nuevo: loop-consolidated-20261030-v3-auto-cft. Se conserva el paquete V2 completo en el catálogo inmutable; no se sustituye ni se altera su hash. La nueva instalación liga explícitamente el renderer actualizado.
