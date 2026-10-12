/**
 * Test Suite: Productos Fuera de Catálogo (Manuales) y Presupuestos Multi-Opción (Casos M1..M18)
 * Cuenta Hogar — Stage 3B Feature Verification
 */

import { FACTORES_PREDETERMINADOS } from "../src/lib/financialEngine";
import { calcularPricingCanonico } from "../src/lib/canonicalPricingEngine";
import {
    MANUAL_PLAZOS_DISPONIBLES,
    getDefaultManualFactores,
    getDefaultPlanesActivos,
    createInitialManualProductDraft,
    calculateManualProductPricing,
    buildCatalogPayloadFromManualProduct,
    createCatalogBudgetItem,
    duplicateBudgetItem,
    toClientBudgetPayload,
    buildClientWhatsAppMessage,
    sanitizeElementoPresupuestoPdf,
} from "../src/lib/manualBudgetProduct";
import {
    BudgetEditorLifecycleController,
    CatalogProductItem,
} from "../src/lib/budgetEditorLifecycle";

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string, details?: string) {
    if (condition) {
        passed++;
        console.log(`  ✅ PASS: ${description}`);
    } else {
        failed++;
        console.error(`  ❌ FAIL: ${description}${details ? ` — ${details}` : ""}`);
    }
}

async function runTests() {
    console.log("=================================================================");
    console.log(" SUITE M1..M18: PRODUCTOS FUERA DE CATÁLOGO Y MULTI-OPCIÓN");
    console.log("=================================================================\n");

    const mockCatalog: CatalogProductItem[] = [
        {
            id: "prod_cat_tv50",
            nombre: "Smart TV 50 4K Samsung",
            costoProducto: 600000,
            plazosHabilitados: [3, 6, 12],
            codigoProducto: "TV-SAM-50",
            descripcion: "Smart TV UHD 4K",
            proveedor: "Proveedor Mayorista TV S.A.",
        },
    ];

    // -------------------------------------------------------------------------
    // CASO M1 y M2: Lead solicita producto inexistente -> puede pulsar Agregar producto al presupuesto y nombre se precarga
    // -------------------------------------------------------------------------
    console.log("--- CASOS M1 y M2: Producto solicitado inexistente + Precarga de nombre ---");
    const controller = new BudgetEditorLifecycleController();
    const searchParams = new URLSearchParams({
        alertaId: "alert_lead_heladera",
        nombre: "Juan Pablo",
        dni: "30111222",
        telefono: "2355123456",
        localidad: "Lincoln",
        producto: "Heladera de 300 litros",
        notas: "Solicitud de Opciones: Juan Pablo - Busca: Heladera de 300 litros",
    });

    const initOk = controller.handleQueryOrDataChange({
        queryKey: searchParams.toString(),
        searchParams,
        dataLoaded: true,
        solicitudesPool: [],
        catalogoProductos: mockCatalog,
    });

    assert(initOk === true, "M1.1: Editor se inicializa con lead de producto inexistente en catálogo");
    assert(
        controller.getState().selectedProductoId === "",
        "M1.2: selectedProductoId queda vacío cuando el producto solicitado no existe en el catálogo"
    );
    assert(
        controller.getState().leadData.producto === "Heladera de 300 litros",
        "M1.3: El texto solicitado por el lead se preserva en leadData.producto"
    );

    // Simular click en "+ Agregar producto al presupuesto"
    controller.openManualProductEntry();
    const stateAfterOpenManual = controller.getState();
    assert(
        stateAfterOpenManual.sourceMode === "MANUAL_PRESUPUESTO",
        "M1.4: Al pulsar '+ Agregar producto al presupuesto', el editor cambia a modo MANUAL_PRESUPUESTO"
    );
    assert(
        stateAfterOpenManual.manualDraft.nombre === "Heladera de 300 litros",
        "M2.1: El nombre solicitado ('Heladera de 300 litros') se precarga automáticamente en manualDraft.nombre"
    );

    // -------------------------------------------------------------------------
    // CASO M3 y M4: Completar datos del producto manual y verificar factores predeterminados
    // -------------------------------------------------------------------------
    console.log("\n--- CASOS M3 y M4: Datos del producto manual y factores predeterminados ---");
    const defaultFactores = getDefaultManualFactores();
    const defaultPlanes = getDefaultPlanesActivos();

    for (const c of MANUAL_PLAZOS_DISPONIBLES) {
        assert(
             stateAfterOpenManual.manualDraft.factoresPlanes[c] === FACTORES_PREDETERMINADOS[c],
            `M4.${c}: Factor predeterminado para ${c} cuotas coincide con FACTORES_PREDETERMINADOS (${FACTORES_PREDETERMINADOS[c]})`
        );
        assert(
            stateAfterOpenManual.manualDraft.planesActivos[c] === true,
            `M4.activo.${c}: Plan de ${c} cuotas inicia activo por defecto`
        );
    }
    assert(
        Object.keys(defaultFactores).length === 12 && Object.keys(defaultPlanes).length === 12,
        "M4.total: Los 12 planes (1..12) tienen factores predeterminados y estado activo cargados"
    );

    controller.updateManualDraft({
        codigoProducto: "hel-300-drean",
        nombre: "Heladera de 300 litros Drean Cíclica",
        marca: "Drean",
        modelo: "HDR300",
        categoria: "Heladeras",
        costoProducto: 500000,
        proveedor: "Frío Mayorista SRL",
        descripcion: "Heladera cíclica 300L eficiencia A",
        imagenUrl: "https://cuentahogar.com.ar/img/heladera300.jpg",
        observacionesComerciales: "Entrega inmediata en Lincoln",
        observacionesInternas: "Costo especial compra directa depósito CABA - margen preferencial",
    });

    const stM3 = controller.getState();
    assert(stM3.manualDraft.costoProducto === 500000, "M3.1: Costo proveedor cargado ($500.000)");
    assert(stM3.manualDraft.proveedor === "Frío Mayorista SRL", "M3.2: Proveedor interno cargado");
    assert(
        stM3.manualDraft.guardarEnCatalogo === false,
        "M3.3: guardarEnCatalogo es false por defecto"
    );

    const calcDefault12 = calculateManualProductPricing({
        costoProducto: stM3.manualDraft.costoProducto,
        precioContado: stM3.manualDraft.precioContado,
        factoresPlanes: stM3.manualDraft.factoresPlanes,
        planesActivos: stM3.manualDraft.planesActivos,
        plazoSeleccionado: 12,
        anticipo: 0,
    });
    // Con costo 500.000 y factor 12 cuotas = 2.5 -> Total = 1.250.000, Cuota = round(1250000/12) = 104167
    assert(
        calcDefault12.pricingMode === "MANUAL_FACTOR_V1",
        "M3.4: El cálculo manual identifica explícitamente pricingMode = MANUAL_FACTOR_V1"
    );
    assert(
        calcDefault12.valorTotal === 1250000 && calcDefault12.cuotaMensual === 104167,
        "M4.calc: Con factor predeterminado 2.5 en 12 cuotas, valorTotal = $1.250.000 y cuotaMensual = $104.167"
    );

    // -------------------------------------------------------------------------
    // CASO M5: Administrador modifica un factor -> cálculo usa el factor modificado
    // -------------------------------------------------------------------------
    console.log("\n--- CASO M5: Modificación de factor por el administrador ---");
    controller.setManualFactorForPlan(12, 2.2);
    const stM5 = controller.getState();
    const calcModified12 = calculateManualProductPricing({
        costoProducto: stM5.manualDraft.costoProducto,
        precioContado: stM5.manualDraft.precioContado,
        factoresPlanes: stM5.manualDraft.factoresPlanes,
        planesActivos: stM5.manualDraft.planesActivos,
        plazoSeleccionado: 12,
        anticipo: 0,
    });
    // 500.000 * 2.2 = 1.100.000; 1.100.000 / 12 = 91.667
    assert(
        calcModified12.factorAplicado === 2.2 &&
            calcModified12.valorTotal === 1100000 &&
            calcModified12.cuotaMensual === 91667,
        "M5.1: Al modificar el factor de 12 cuotas a 2.20, valorTotal = $1.100.000 y cuotaMensual = $91.667"
    );

    // Confirmar Opción 1 en el presupuesto
    const item1 = controller.commitManualDraftToBudgetItems(true);
    assert(item1 !== null, "M5.2: Opción 1 incorporada exitosamente a budgetItems");
    assert(
        item1?.source === "MANUAL_PRESUPUESTO" && item1?.pricingMode === "MANUAL_FACTOR_V1",
        "M5.3: Opción 1 tiene source = MANUAL_PRESUPUESTO y pricingMode = MANUAL_FACTOR_V1"
    );

    // -------------------------------------------------------------------------
    // CASO M6 y M7: Agregar dos productos manuales al mismo presupuesto y aislar factores entre opciones
    // -------------------------------------------------------------------------
    console.log("\n--- CASOS M6 y M7: Dos productos manuales y aislamiento de factores entre opciones ---");
    controller.updateManualDraft({
        codigoProducto: "hel-320-patrick",
        nombre: "Heladera Patrick 320 Litros",
        marca: "Patrick",
        modelo: "HPK320",
        categoria: "Heladeras",
        costoProducto: 540000,
        proveedor: "Electro Distribución SA",
        descripcion: "Heladera 320L con dispenser",
        observacionesInternas: "Stock 2 unidades en proveedor Electro Distribución",
    });
    // En Opción 2 usamos un factor de 12 cuotas = 2.40 (distinto del 2.20 de Opción 1 y del 2.50 default)
    controller.setManualFactorForPlan(12, 2.4);
    controller.setManualPlazoSeleccionado(12);
    const item2 = controller.commitManualDraftToBudgetItems(true);

    const itemsAfterTwo = controller.getState().budgetItems;
    assert(itemsAfterTwo.length === 2 && item2 !== null, "M7.1: El presupuesto contiene 2 productos manuales");
    assert(
        itemsAfterTwo[0].factorAplicado === 2.2 &&
            itemsAfterTwo[0].manualProductSnapshot?.factoresAplicados[12] === 2.2,
        "M6.1: La Opción 1 conserva intacto su factor 2.20 después de modificar el factor de la Opción 2 a 2.40"
    );
    assert(
        itemsAfterTwo[1].factorAplicado === 2.4 &&
            itemsAfterTwo[1].manualProductSnapshot?.factoresAplicados[12] === 2.4,
        "M6.2: La Opción 2 utiliza su propio factor 2.40 ($540.000 * 2.4 = $1.296.000, 12 cuotas de $108.000)"
    );
    assert(
        itemsAfterTwo[1].valorCuota === 108000 && itemsAfterTwo[1].totalFinanciado === 1296000,
        "M7.2: Cálculos de Opción 2 exactos ($108.000/mes, total $1.296.000)"
    );

    // Probar duplicación de opción y edición independiente (M6 adicional)
    const duplicated = duplicateBudgetItem(itemsAfterTwo[0], "item-dup-test");
    if (duplicated.manualProductSnapshot) {
        duplicated.manualProductSnapshot.factoresAplicados[12] = 2.8;
    }
    assert(
        itemsAfterTwo[0].manualProductSnapshot?.factoresAplicados[12] === 2.2,
        "M6.3: Modificar el snapshot de una opción duplicada no muta el snapshot de la opción original"
    );

    // -------------------------------------------------------------------------
    // CASO M8 y M18: Mezclar 1 producto catálogo (CANONICAL_V1) + productos manuales (MANUAL_FACTOR_V1)
    // -------------------------------------------------------------------------
    console.log("\n--- CASOS M8 y M18: Mezcla de producto CATALOGO (CANONICAL_V1) + MANUAL_PRESUPUESTO (MANUAL_FACTOR_V1) ---");
    const canonicalSnap = calcularPricingCanonico({
        capitalCompraCentavos: 600000 * 100,
        plazoMeses: 12,
        tnaInterna: 95,
        alicuotaIva: 21,
        senaMontoCentavos: 0,
        plazosHabilitadosProducto: [3, 6, 12],
    });
    assert(
        canonicalSnap.pricingSchemaVersion === "CANONICAL_V1" &&
            canonicalSnap.valorTotalContractualCentavos > 60000000,
        "M18.1: El motor canónico CANONICAL_V1 sigue funcionando sin modificaciones"
    );

    const catalogBudgetItem = createCatalogBudgetItem({
        productoId: mockCatalog[0].id,
        nombre: mockCatalog[0].nombre,
        codigo: mockCatalog[0].codigoProducto,
        descripcion: mockCatalog[0].descripcion,
        proveedor: mockCatalog[0].proveedor,
        costoProveedor: mockCatalog[0].costoProducto,
        precioContado: mockCatalog[0].costoProducto,
        cuotas: canonicalSnap.plazoMeses,
        valorCuota: Math.round(canonicalSnap.cuotaMensualBaseCentavos / 100),
        anticipo: 0,
        totalFinanciado: Math.round(canonicalSnap.valorTotalContractualCentavos / 100),
        tnaNominalAnual: canonicalSnap.tnaInternaAplicada,
        pricingSnapshot: canonicalSnap as unknown as Record<string, unknown>,
    });

    controller.addOrUpdateBudgetItem(catalogBudgetItem, true);
    const mixedItems = controller.getState().budgetItems;
    assert(
        mixedItems.length === 3,
        "M8.1: Presupuesto admite mezclar opciones manuales y opciones de catálogo (3 opciones totales)"
    );
    assert(
        mixedItems[0].source === "MANUAL_PRESUPUESTO" &&
            mixedItems[0].pricingMode === "MANUAL_FACTOR_V1" &&
            mixedItems[2].source === "CATALOGO" &&
            mixedItems[2].pricingMode === "CANONICAL_V1",
        "M8.2: Cada opción preserva su source y pricingMode explícito sin etiquetar productos manuales como CANONICAL_V1"
    );

    // -------------------------------------------------------------------------
    // CASO M9 y M10: Aislamiento del catálogo por defecto y guardado opcional en catálogo
    // -------------------------------------------------------------------------
    console.log("\n--- CASOS M9 y M10: No contaminar catálogo por defecto + Checkbox Guardar en catálogo ---");
    assert(
        mixedItems[0].guardarEnCatalogo === false &&
            mixedItems[0].manualProductSnapshot?.guardarEnCatalogo === false &&
            mixedItems[1].guardarEnCatalogo === false,
        "M9.1: Por defecto los productos manuales tienen guardarEnCatalogo = false y productoId = null (no contaminan catálogo)"
    );

    const manualForCatalog = createInitialManualProductDraft("Lavarropas Automático 8Kg");
    manualForCatalog.codigoProducto = "lav-8kg-01";
    manualForCatalog.costoProducto = 420000;
    manualForCatalog.proveedor = "Importadora Blanca SA";
    manualForCatalog.descripcion = "Lavarropas carga frontal 1200 RPM";
    manualForCatalog.imagenUrl = "https://cuentahogar.com.ar/img/lav8kg.jpg";
    manualForCatalog.guardarEnCatalogo = true;

    const catalogPayload = buildCatalogPayloadFromManualProduct(manualForCatalog);
    const expectedCatalogKeys = [
        "codigoProducto",
        "nombre",
        "precioAnterior",
        "cuota12",
        "cuota8",
        "costoProducto",
        "precioContado",
        "tasaInteresTna",
        "tasaMora",
        "proveedor",
        "descripcion",
        "imagenUrl",
        "imagenUrls",
        "factoresPlanes",
        "planesActivos",
        "fechaCreacion",
    ];
    const actualCatalogKeys = Object.keys(catalogPayload);
    const allKeysMatch = expectedCatalogKeys.every((k) => actualCatalogKeys.includes(k));
    assert(
        allKeysMatch && actualCatalogKeys.length === expectedCatalogKeys.length,
        "M10.1: buildCatalogPayloadFromManualProduct genera exactamente el esquema de 16 campos del Gestor de Productos"
    );
    assert(
        catalogPayload.codigoProducto === "LAV-8KG-01" &&
            catalogPayload.costoProducto === 420000 &&
            catalogPayload.cuota12 === Math.round((420000 * 2.5) / 12) &&
            catalogPayload.cuota8 === Math.round((420000 * 2.12) / 8),
        "M10.2: El payload para colección 'productos' calcula cuota12, cuota8 y precioContado con la misma fórmula del Gestor de Productos"
    );

    // -------------------------------------------------------------------------
    // CASOS M11, M12, M13, M14: Sanitización por ALLOWLIST y generación de PDF sin datos sensibles
    // -------------------------------------------------------------------------
    console.log("\n--- CASOS M11, M12, M13, M14: Sanitización Allowlist Client DTO y PDF ---");
    const clientPayload = toClientBudgetPayload({
        nroPresupuesto: "PRES-9001",
        fechaEmision: "12/10/2026",
        clienteNombre: "Juan Pablo",
        clienteDni: "30111222",
        clienteTelefono: "2355123456",
        clienteLocalidad: "Lincoln",
        items: mixedItems,
    });

    assert(
        clientPayload.items.length === 3 &&
            clientPayload.items[0].nombre.includes("Heladera de 300 litros Drean") &&
            clientPayload.items[1].nombre.includes("Heladera Patrick 320 Litros"),
        "M11.1: El DTO de cliente contiene todas las opciones del presupuesto"
    );

    const serializedClientPayload = JSON.stringify(clientPayload);
    const forbiddenKeys = [
        "costoProveedor",
        "costoProducto",
        "capitalCompraCentavos",
        "proveedor",
        "linkProveedor",
        "factor",
        "factorAplicado",
        "factoresPlanes",
        "factoresAplicados",
        "margen",
        "margenEstimado",
        "tnaInternaAplicada",
        "observacionesInternas",
        "manualProductSnapshot",
        "pricingSnapshot",
    ];
    const leakedKeys = forbiddenKeys.filter((k) =>
        clientPayload.items.some((item) => k in (item as unknown as Record<string, unknown>))
    );
    assert(
        leakedKeys.length === 0,
        "M12.1 / M13.1 / M14.1: El mapper toClientBudgetItem funciona por allowlist estricta (0 propiedades internas presentes)"
    );
    assert(
        !serializedClientPayload.includes("500000") &&
            !serializedClientPayload.includes("540000") &&
            !serializedClientPayload.includes("Frío Mayorista SRL") &&
            !serializedClientPayload.includes("Electro Distribución SA") &&
            !serializedClientPayload.includes("Costo especial compra directa") &&
            !serializedClientPayload.includes("2.2") &&
            !serializedClientPayload.includes("2.4"),
        "M12.2 / M13.2 / M14.2: El JSON serializado para el cliente NO contiene costos ($500.000 / $540.000), proveedores, factores (2.2 / 2.4) ni notas internas"
    );

    // Verificar también sanitizeElementoPresupuestoPdf de pdfGenerator.ts
    const pdfSafeItems = mixedItems.map((it) =>
        sanitizeElementoPresupuestoPdf(it as unknown as Record<string, unknown>)
    );
    const pdfSerialized = JSON.stringify(pdfSafeItems);
    assert(
        pdfSafeItems.length === 3 &&
            pdfSafeItems[0].producto.includes("Heladera de 300 litros Drean") &&
            pdfSafeItems[1].producto.includes("Heladera Patrick 320 Litros"),
        "M11.2: Los items preparados para generarPdfPresupuesto incluyen ambas opciones propuestas"
    );
    assert(
        !pdfSerialized.includes("500000") && !pdfSerialized.includes("costoProveedor"),
        "M12.3: El payload de PDF NO contiene costo proveedor"
    );
    assert(
        !pdfSerialized.includes("2.2") && !pdfSerialized.includes("factor"),
        "M13.3: El payload de PDF NO contiene factores comerciales"
    );
    assert(
        !pdfSerialized.includes("Frío Mayorista SRL") && !pdfSerialized.includes("proveedor"),
        "M14.3: El payload de PDF NO contiene proveedor interno"
    );

    // -------------------------------------------------------------------------
    // CASOS M15 y M16: Mensaje de WhatsApp multi-opción y ausencia de datos sensibles
    // -------------------------------------------------------------------------
    console.log("\n--- CASOS M15 y M16: Mensaje de WhatsApp multi-opción sanitizado ---");
    const waMessage = buildClientWhatsAppMessage({
        nroPresupuesto: "PRES-9001",
        clienteNombre: "Juan Pablo",
        items: mixedItems,
    });

    assert(
        waMessage.includes("Te preparamos estas alternativas:") &&
            waMessage.includes("1. Heladera de 300 litros Drean") &&
            waMessage.includes("12 cuotas de $91.667") &&
            waMessage.includes("2. Heladera Patrick 320 Litros") &&
            waMessage.includes("12 cuotas de $108.000"),
        "M15.1: El mensaje de WhatsApp incluye el listado numerado de opciones comerciales y sus cuotas"
    );
    assert(
        !waMessage.includes("500000") &&
            !waMessage.includes("500.000") &&
            !waMessage.includes("540000") &&
            !waMessage.includes("540.000") &&
            !waMessage.includes("Frío Mayorista") &&
            !waMessage.includes("Electro Distribución") &&
            !waMessage.includes("2.2") &&
            !waMessage.includes("2.4") &&
            !waMessage.includes("Costo especial"),
        "M16.1: El mensaje de WhatsApp NO expone costos de proveedor, nombres de proveedor, factores, márgenes ni notas internas"
    );

    // -------------------------------------------------------------------------
    // CASO M17: Lead sin vinculación puede confeccionar pero no guardar sin decisión explícita
    // -------------------------------------------------------------------------
    console.log("\n--- CASO M17: Lead sin vinculación puede confeccionar pero guardado sigue fail-closed ---");
    const unlinkedState = controller.getState();
    assert(
        unlinkedState.resolvedSolicitudId === null && unlinkedState.confirmarCrearNueva === false,
        "M17.1: El lead continúa sin vinculación automática y sin confirmación explícita"
    );
    assert(
        unlinkedState.budgetItems.length === 3,
        "M17.2: El administrador pudo confeccionar 3 opciones (manuales y de catálogo) aún sin vinculación automática"
    );
    const canPersistSilently = Boolean(
        unlinkedState.resolvedSolicitudId || unlinkedState.confirmarCrearNueva
    );
    assert(
        canPersistSilently === false,
        "M17.3: El guardado definitivo permanece bloqueado (fail-closed) hasta vincular solicitud o marcar confirmarCrearNueva"
    );

    controller.setConfirmarCrearNueva(true);
    assert(
        controller.getState().confirmarCrearNueva === true,
        "M17.4: Al confirmar explícitamente 'Crear nueva solicitud para este lead', se habilita la persistencia controlada"
    );

    console.log("\n=================================================================");
    console.log(` RESULTADO SUITE M1..M18: ${passed} PASS / ${failed} FAIL`);
    console.log("=================================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch((err) => {
    console.error("Error fatal en testManualBudgetProductsFlow:", err);
    process.exit(1);
});
