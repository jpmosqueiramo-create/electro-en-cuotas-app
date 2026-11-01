# CFT automático: intereses de financiación con IVA

Por instrucción del titular del 01/11/2026, para nuevas preparaciones se utiliza `FINANCE_ONLY_VAT_ACT365_V1`. Los tres servicios tienen precios reales de contado y en cuotas, según confirmó el titular: gestión del mandato, recepción/depósito/entrega y asistencia logística técnica. Esos precios, y otros servicios, integran el precio completo sin financiación. El único cargo financiero es la financiación bruta (intereses con IVA ya incluido).

Base CFT = precio completo sin financiación = adquisición + servicios. Cargos CFT = financiación bruta. Base + cargos = total contractual. La primera cuota se paga en entrega, en tiempo cero. Se reutiliza la TIR por fechas reales con año de 365 días existente; al no haber cargos financieros adicionales, el CFT efectivo anual coincide con la TEA implícita con IVA. TEM y TNA mantienen sus convenciones; no se fuerza un porcentaje objetivo ni se modifica el sistema de factores.

La tabla de tarifas existente en Catálogo permite preparar un aumento del 20 % en los tres importes de todas las categorías, tomando la revisión guardada (o referencias si no existe ninguna). Redondea a centavos, muestra los importes y exige Guardar tarifas de categorías. Repetir Preparar antes de guardar no acumula aumentos. No se ejecutan migraciones de precios ni escrituras automáticas al desplegar. Después de guardar, las nuevas operaciones usan esa revisión; los borradores previos pueden aplicar explícitamente tarifas vigentes y solicitar nueva conformidad.

Ejemplo de la captura: adquisición $400.000, servicios $40.000/$50.000/$25.000 pasan a $48.000/$60.000/$30.000. Precio completo de contado $538.000; con total contractual $1.200.000, financiación con IVA $662.000. Las 12 cuotas de $100.000 se conservan. El CFT resulta de sus vencimientos reales, no de dividir estos importes ni de sumar 21 puntos a una tasa.

## Compatibilidad y persistencia

Se conservan los mismos campos, colecciones y Rules. `commercialPreparation.loop.cftPolicy` acepta el nuevo valor versionado; `cftCalculation` mantiene `{baseCents, chargesCents, managementGrossCents, financeGrossCents}`. `managementGrossCents` representa honorarios incluidos como cargo del CFT: es cero con la política nueva; el precio real del servicio sigue en `tariff.managementCents` y `services`. Los importes están en centavos.

La política histórica `MANDATE_MANAGEMENT_FINANCE_VAT_ACT365_V1` conserva exactamente su cálculo y texto: base sin honorarios, cargos de honorarios más intereses, IVA incluido. Las preparaciones sin política conservan su CFT informado. No se recalculan snapshots o documentos emitidos al consultarlos. Al editar una preparación anterior, el editor avisa que el nuevo criterio requiere guardar y nueva conformidad. El servidor impone la política actual en SAVE_CONTRACT_EDITOR y recalcula sin confiar en tasas enviadas por el navegador.

Propuesta, contrato y Anexo II usan el desglose guardado. El rótulo de cargos distingue la política histórica y la nueva. Se instala un paquete técnico inmutable nuevo `loop-consolidated-20261101-v5-finance-cft`, sin modificar los paquetes anteriores ni los textos jurídicos aprobados. El manifiesto del renderer se regenera explícitamente y se valida en build.

## Verificación

`testLoopContractDisclosure` cubre política histórica, integridad, flujos con fechas reales, CFT igual a TEA con IVA, aumento de servicios sin modificar cuotas, conciliación de intereses/IVA y saldo final cero. `testLoopConsolidatedEmulator` prueba cálculo impuesto por servidor, configuración versionada, conservación de preparación previa, nueva conformidad, emisión sintética y descarga del paquete. Con LOOP_BROWSER=1 revisa preparación del aumento sin escrituras, doble clic sin acumulación, guardado y editor a 1280/390 px. Sólo Firebase Emulators con datos sintéticos.
