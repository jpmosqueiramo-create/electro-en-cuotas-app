/**
 * Test Suite: Productos Fuera de Catálogo (Manuales) y Presupuestos Multi-Opción (Casos M1..M25)
 * Cuenta Hogar — Stage 3B Pre-Deploy Closure Verification
 */

import { jsPDF } from "jspdf";
import { FACTORES_PREDETERMINADOS } from "../src/lib/financialEngine";
import { calcularPricingCanonico } from "../src/lib/canonicalPricingEngine";
import { generarPdfPresupuesto } from "../src/lib/pdfGenerator";
import {
    MANUAL_PLAZOS_DISPONIBLES,
    PRODUCT_SCHEMA_MATRIX,
    getAvailableManualPlazos,
    getDefaultManualFactores,
    getDefaultPlanesActivos,
    createInitialManualProductDraft,
    calculateManualProductPricing,
    buildCatalogPayloadFromManualProduct,
    findExistingCatalogDuplicate,
    createManualBudgetItem,
    createCatalogBudgetItem,
    toClientBudgetPayload,
    buildClientWhatsAppMessage,
    buildSanitizedPdfDatosFromBudget,
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
    console.log(" SUITE M1..M25: PRODUCTOS FUERA DE CATÁLOGO Y MULTI-OPCIÓN");
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
    // CASO M3, M4 y M19: Todos los planes de FACTORES_PREDETERMINADOS (1..12, 18 y 24)
    // -------------------------------------------------------------------------
    console.log("\n--- CASOS M3, M4 y M19: Todos los planes de FACTORES_PREDETERMINADOS (1..12, 18, 24) ---");
    const expectedAllPlazos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24];
    const derivedPlazos = getAvailableManualPlazos(stateAfterOpenManual.manualDraft.factoresPlanes);
    const defaultFactores = getDefaultManualFactores();
    const defaultPlanes = getDefaultPlanesActivos();

    assert(
        JSON.stringify(MANUAL_PLAZOS_DISPONIBLES) === JSON.stringify(expectedAllPlazos) &&
            JSON.stringify(derivedPlazos) === JSON.stringify(expectedAllPlazos),
        `M4.plazos: Los plazos disponibles provienen dinámicamente de FACTORES_PREDETERMINADOS (${derivedPlazos.join(", ")})`
    );

    for (const c of expectedAllPlazos) {
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
        Object.keys(defaultFactores).length === 14 && Object.keys(defaultPlanes).length === 14,
        "M4.total: Los 14 planes (1..12, 18 y 24) tienen factores predeterminados y estado activo cargados"
    );
    assert(
        derivedPlazos.includes(18) && defaultFactores[18] === 3.25,
        "M19.1: PLAN_18_VISIBLE = PASS y PLAN_18_DEFAULT_FACTOR = 3.25"
    );
    assert(
        derivedPlazos.includes(24) && defaultFactores[24] === 4.0,
        "M19.2: PLAN_24_VISIBLE = PASS y PLAN_24_DEFAULT_FACTOR = 4.0"
    );

    // Probar overrides de plan 18 y plan 24
    const calc18Default = calculateManualProductPricing({
        costoProducto: 400000,
        factoresPlanes: defaultFactores,
        planesActivos: defaultPlanes,
        plazoSeleccionado: 18,
        anticipo: 0,
    });
    assert(
        calc18Default.factorAplicado === 3.25 &&
            calc18Default.valorTotal === 1300000 &&
            calc18Default.cuotaMensual === Math.round(1300000 / 18),
        "M19.3: Cálculo default de 18 cuotas con factor 3.25 exacto ($1.300.000 / 18 = $72.222)"
    );

    const calc18Override = calculateManualProductPricing({
        costoProducto: 400000,
        factoresPlanes: { ...defaultFactores, 18: 3.1 },
        planesActivos: defaultPlanes,
        plazoSeleccionado: 18,
        anticipo: 0,
    });
    assert(
        calc18Override.factorAplicado === 3.1 &&
            calc18Override.valorTotal === 1240000 &&
            calc18Override.cuotaMensual === Math.round(1240000 / 18),
        "M19.4: PLAN_18_OVERRIDE = PASS (factor 3.10 recalcula valorTotal = $1.240.000 y cuota = $68.889)"
    );

    const calc24Default = calculateManualProductPricing({
        costoProducto: 400000,
        factoresPlanes: defaultFactores,
        planesActivos: defaultPlanes,
        plazoSeleccionado: 24,
        anticipo: 0,
    });
    assert(
        calc24Default.factorAplicado === 4.0 &&
            calc24Default.valorTotal === 1600000 &&
            calc24Default.cuotaMensual === Math.round(1600000 / 24),
        "M19.5: Cálculo default de 24 cuotas con factor 4.0 exacto ($1.600.000 / 24 = $66.667)"
    );

    const calc24Override = calculateManualProductPricing({
        costoProducto: 400000,
        factoresPlanes: { ...defaultFactores, 24: 3.8 },
        planesActivos: defaultPlanes,
        plazoSeleccionado: 24,
        anticipo: 0,
    });
    assert(
        calc24Override.factorAplicado === 3.8 &&
            calc24Override.valorTotal === 1520000 &&
            calc24Override.cuotaMensual === Math.round(1520000 / 24),
        "M19.6: PLAN_24_OVERRIDE = PASS (factor 3.80 recalcula valorTotal = $1.520.000 y cuota = $63.333)"
    );

    // -------------------------------------------------------------------------
    // CASO M20: Semántica exacta de startNewAfter (true vs false), editBudgetItem y duplicateOption
    // -------------------------------------------------------------------------
    console.log("\n--- CASO M20: Semántica real de startNewAfter (true vs false), editBudgetItem y duplicateOption ---");
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
    controller.setManualFactorForPlan(12, 2.2);

    // B) startNewAfter = false -> confirma la opción y preserva el estado actual sin resetear ni duplicar
    const committedKeepState = controller.commitManualDraftToBudgetItems(false);
    const stAfterFalse = controller.getState();
    assert(
        committedKeepState !== null &&
            stAfterFalse.budgetItems.length === 1 &&
            stAfterFalse.manualDraft.nombre === "Heladera de 300 litros Drean Cíclica" &&
            stAfterFalse.manualDraft.costoProducto === 500000 &&
            stAfterFalse.editingItemId === committedKeepState.itemId,
        "M20.B1: startNewAfter = false incorpora la opción y preserva manualDraft intacto vinculando editingItemId"
    );

    // Si el usuario ajusta el factor mientras sigue en esa opción y vuelve a confirmar con startNewAfter = false, NO duplica la opción
    controller.setManualFactorForPlan(12, 2.25);
    const updatedInPlace = controller.commitManualDraftToBudgetItems(false);
    const stAfterSecondFalse = controller.getState();
    assert(
        stAfterSecondFalse.budgetItems.length === 1 &&
            updatedInPlace?.itemId === committedKeepState?.itemId &&
            stAfterSecondFalse.budgetItems[0].factorAplicado === 2.25,
        "M20.B2: Re-confirmar con startNewAfter = false actualiza la opción en el lugar sin duplicar items"
    );

    // Restaurar factor 2.20 y probar A) startNewAfter = true -> confirma y resetea el draft para cargar otro producto
    controller.setManualFactorForPlan(12, 2.2);
    const item1 = controller.commitManualDraftToBudgetItems(true);
    const stAfterTrue = controller.getState();
    assert(
        item1 !== null &&
            stAfterTrue.budgetItems.length === 1 &&
            stAfterTrue.budgetItems[0].factorAplicado === 2.2 &&
            stAfterTrue.manualDraft.nombre === "" &&
            stAfterTrue.manualDraft.costoProducto === 0 &&
            stAfterTrue.editingItemId === null,
        "M20.A: startNewAfter = true confirma la opción y resetea manualDraft y editingItemId para cargar un nuevo producto"
    );

    // C) editBudgetItem -> edita una opción existente sin duplicarla
    controller.editBudgetItem(stAfterTrue.budgetItems[0].itemId);
    const stEditing = controller.getState();
    assert(
        stEditing.editingItemId === stAfterTrue.budgetItems[0].itemId &&
            stEditing.manualDraft.nombre === "Heladera de 300 litros Drean Cíclica" &&
            stEditing.manualDraft.factoresPlanes[12] === 2.2,
        "M20.C1: editBudgetItem carga los datos e identifica editingItemId de la opción seleccionada"
    );
    controller.updateManualDraft({ descripcion: "Heladera cíclica 300L eficiencia A+" });
    controller.commitManualDraftToBudgetItems(true);
    assert(
        controller.getState().budgetItems.length === 1 &&
            controller.getState().budgetItems[0].descripcion === "Heladera cíclica 300L eficiencia A+",
        "M20.C2: Al guardar tras editBudgetItem se actualiza la opción existente sin crear duplicados"
    );

    // D) duplicateOption -> clona la opción existente y permite editarla independientemente
    const dupOption = controller.duplicateOption(controller.getState().budgetItems[0].itemId);
    assert(
        dupOption !== null &&
            controller.getState().budgetItems.length === 2 &&
            controller.getState().budgetItems[0].itemId !== controller.getState().budgetItems[1].itemId,
        "M20.D1: duplicateOption clona la opción como una nueva entrada con su propio itemId"
    );
    // Editar la opción duplicada para que sea otro modelo / plazo 18 cuotas
    controller.editBudgetItem(dupOption!.itemId);
    controller.updateManualDraft({
        codigoProducto: "hel-320-patrick",
        nombre: "Heladera Patrick 320 Litros",
        marca: "Patrick",
        modelo: "HPK320",
        costoProducto: 540000,
        proveedor: "Electro Distribución SA",
        descripcion: "Heladera 320L con dispenser",
        observacionesInternas: "Stock 2 unidades en proveedor Electro Distribución",
    });
    controller.setManualFactorForPlan(18, 3.25);
    controller.setManualPlazoSeleccionado(18);
    controller.commitManualDraftToBudgetItems(true);

    const itemsAfterTwo = controller.getState().budgetItems;
    assert(
        itemsAfterTwo.length === 2 &&
            itemsAfterTwo[0].nombre === "Heladera de 300 litros Drean Cíclica" &&
            itemsAfterTwo[0].cuotas === 12 &&
            itemsAfterTwo[0].factorAplicado === 2.2 &&
            itemsAfterTwo[1].nombre === "Heladera Patrick 320 Litros" &&
            itemsAfterTwo[1].cuotas === 18 &&
            itemsAfterTwo[1].factorAplicado === 3.25,
        "M20.D2: Editar la opción duplicada a 18 cuotas preserva intacta la Opción 1 (12 cuotas, factor 2.20)"
    );

    // -------------------------------------------------------------------------
    // CASO M8 y M18: Mezclar 1 producto catálogo (CANONICAL_V1) + 2 productos manuales (MANUAL_FACTOR_V1)
    // -------------------------------------------------------------------------
    console.log("\n--- CASOS M8 y M18: Mezcla de 2 opciones MANUAL_PRESUPUESTO (12 y 18 cuotas) + 1 CATALOGO (CANONICAL_V1) ---");
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
        mixedItems.length === 3 &&
            mixedItems[0].source === "MANUAL_PRESUPUESTO" &&
            mixedItems[0].cuotas === 12 &&
            mixedItems[1].source === "MANUAL_PRESUPUESTO" &&
            mixedItems[1].cuotas === 18 &&
            mixedItems[2].source === "CATALOGO" &&
            mixedItems[2].pricingMode === "CANONICAL_V1",
        "M8.1: Presupuesto contiene Opción 1 (MANUAL 12 cuotas), Opción 2 (MANUAL 18 cuotas) y Opción 3 (CATALOGO CANONICAL_V1)"
    );

    // -------------------------------------------------------------------------
    // CASO M21: Reapertura de presupuesto multi-opción (3 opciones)
    // -------------------------------------------------------------------------
    console.log("\n--- CASO M21: Guardado y Reapertura de presupuesto con 3 opciones mixtas ---");
    const reopenController = new BudgetEditorLifecycleController();
    reopenController.openExistingBudget(
        {
            id: "pres_mixed_3opts",
            solicitudId: "sol_test_3opts",
            solicitudTipo: "apertura",
            clienteNombre: "Juan Pablo",
            clienteDni: "30111222",
            clienteWhatsapp: "2355123456",
            clienteLocalidad: "Lincoln",
            producto: "Heladera de 300 litros Drean Cíclica (+2 opciones)",
            notas: "Cotización multi-opción",
            cuotas: 12,
            pricingSchemaVersion: "MIXED_V1",
            catalogoProductos: mockCatalog,
            items: mixedItems,
        },
        { id: "pres_mixed_3opts", items: mixedItems }
    );
    const reopenedState = reopenController.getState();
    assert(
        reopenedState.budgetItems.length === 3 &&
            reopenedState.budgetItems[0].itemId === mixedItems[0].itemId &&
            reopenedState.budgetItems[1].itemId === mixedItems[1].itemId &&
            reopenedState.budgetItems[2].itemId === mixedItems[2].itemId,
        "M21.1: Al reabrir el presupuesto se recuperan las 3 opciones en su orden exacto"
    );
    assert(
        reopenedState.budgetItems[0].source === "MANUAL_PRESUPUESTO" &&
            reopenedState.budgetItems[0].pricingMode === "MANUAL_FACTOR_V1" &&
            reopenedState.budgetItems[0].factorAplicado === 2.2 &&
            reopenedState.budgetItems[1].source === "MANUAL_PRESUPUESTO" &&
            reopenedState.budgetItems[1].pricingMode === "MANUAL_FACTOR_V1" &&
            reopenedState.budgetItems[1].cuotas === 18 &&
            reopenedState.budgetItems[1].factorAplicado === 3.25 &&
            reopenedState.budgetItems[2].source === "CATALOGO" &&
            reopenedState.budgetItems[2].pricingMode === "CANONICAL_V1" &&
            reopenedState.budgetItems[2].pricingSnapshot !== null,
        "M21.2: Al reabrir se preservan source, pricingMode, factores aplicados y snapshots internos de las 3 opciones"
    );

    // -------------------------------------------------------------------------
    // CASO M9, M10 y M22: Matriz de 16 campos de `productos` e idempotencia de guardarEnCatalogo
    // -------------------------------------------------------------------------
    console.log("\n--- CASOS M9, M10 y M22: Matriz de 16 campos de productos + Idempotencia de guardarEnCatalogo ---");
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
    assert(
        PRODUCT_SCHEMA_MATRIX.length === 16 &&
            expectedCatalogKeys.every((k) => PRODUCT_SCHEMA_MATRIX.some((row) => row.campo === k)),
        "M22.1: PRODUCT_SCHEMA_MATRIX documenta exactamente los 16 campos del Gestor de Productos"
    );

    const manualForCatalog = createInitialManualProductDraft("Lavarropas Automático 8Kg");
    manualForCatalog.codigoProducto = "lav-8kg-01";
    manualForCatalog.costoProducto = 420000;
    manualForCatalog.precioAnterior = 990000;
    manualForCatalog.tasaInteresTna = 65;
    manualForCatalog.tasaMora = 3.5;
    manualForCatalog.proveedor = "Importadora Blanca SA";
    manualForCatalog.descripcion = "Lavarropas carga frontal 1200 RPM";
    manualForCatalog.imagenUrl = "";
    manualForCatalog.guardarEnCatalogo = true;

    const catalogPayload = buildCatalogPayloadFromManualProduct(manualForCatalog);
    const actualCatalogKeys = Object.keys(catalogPayload);
    assert(
        expectedCatalogKeys.every((k) => actualCatalogKeys.includes(k)) &&
            actualCatalogKeys.length === expectedCatalogKeys.length,
        "M10.1: buildCatalogPayloadFromManualProduct genera exactamente los 16 campos de productos"
    );
    assert(
        catalogPayload.codigoProducto === "LAV-8KG-01" &&
            catalogPayload.costoProducto === 420000 &&
            catalogPayload.precioAnterior === 990000 &&
            catalogPayload.tasaInteresTna === 65 &&
            catalogPayload.tasaMora === 3.5 &&
            catalogPayload.imagenUrl === "/logo-cuenta-hogar-oficial.png" &&
            catalogPayload.factoresPlanes[18] === 3.25 &&
            catalogPayload.factoresPlanes[24] === 4.0,
        "M10.2: El payload respeta precioAnterior, tasaInteresTna, tasaMora, fallback de imagen y los 14 planes (incluyendo 18 y 24)"
    );

    // Simulación Caso A (checkbox OFF -> 0 docs) y Caso B (checkbox ON -> 1 doc, idempotente ante segundo guardado)
    const simulatedProductosCollection: Array<{
        id: string;
        codigoProducto?: string | null;
        nombre?: string | null;
        costoProducto?: number | null;
    }> = [];

    // Caso A: checkbox OFF
    const itemCheckboxOff = createManualBudgetItem({
        input: { ...manualForCatalog, guardarEnCatalogo: false },
        plazoSeleccionado: 12,
    });
    if (itemCheckboxOff.guardarEnCatalogo) {
        simulatedProductosCollection.push({ id: "should_not_happen" });
    }
    assert(
        simulatedProductosCollection.length === 0,
        "M22.2 (Caso A): Con guardarEnCatalogo = false, productos recibe 0 nuevos documentos"
    );

    // Caso B: checkbox ON (primer guardado crea 1 doc, segundo guardado detecta duplicado y NO crea otro)
    const dupBeforeInsert = findExistingCatalogDuplicate(simulatedProductosCollection, manualForCatalog);
    if (!dupBeforeInsert) {
        simulatedProductosCollection.push({
            id: "prod_new_1",
            codigoProducto: catalogPayload.codigoProducto,
            nombre: catalogPayload.nombre,
            costoProducto: catalogPayload.costoProducto,
        });
    }
    const dupOnRetry = findExistingCatalogDuplicate(simulatedProductosCollection, manualForCatalog);
    if (!dupOnRetry) {
        simulatedProductosCollection.push({
            id: "prod_new_2_duplicate",
            codigoProducto: catalogPayload.codigoProducto,
            nombre: catalogPayload.nombre,
            costoProducto: catalogPayload.costoProducto,
        });
    }
    assert(
        simulatedProductosCollection.length === 1 && dupOnRetry === "prod_new_1",
        "M22.3 (Caso B): Con guardarEnCatalogo = true, productos recibe exactamente 1 documento y evita duplicados ante doble click/reintento"
    );

    // -------------------------------------------------------------------------
    // CASO M23: PRUEBA EXHAUSTIVA DE DATOS SENSIBLES EN CLIENT PAYLOAD, WHATSAPP Y PDF REAL
    // -------------------------------------------------------------------------
    console.log("\n--- CASO M23: Verificación estricta de NO exposición de datos sensibles ---");
    const secretDraft = createInitialManualProductDraft("Aire Acondicionado Split 4500F");
    secretDraft.codigoProducto = "AA-4500-SEC";
    secretDraft.proveedor = "PROVEEDOR_SECRETO_XYZ";
    secretDraft.costoProducto = 987654;
    secretDraft.factoresPlanes[12] = 9.8765;
    secretDraft.tasaInteresTna = 77.77;
    secretDraft.tasaMora = 88.88;
    secretDraft.descripcion = "DESCRIPCION_PUBLICA_OK";
    secretDraft.observacionesInternas = "NOTA_INTERNA_SECRETA_999";

    const secretItem = createManualBudgetItem({
        input: secretDraft,
        plazoSeleccionado: 12,
        anticipo: 0,
        cantidad: 1,
    });

    const secretForbiddenTokens = [
        "PROVEEDOR_SECRETO_XYZ",
        "987654",
        "987.654",
        "9.8765",
        "9,8765",
        "77.77",
        "88.88",
        "NOTA_INTERNA_SECRETA_999",
    ];

    // 1. toClientBudgetPayload
    const secretClientPayload = toClientBudgetPayload({
        nroPresupuesto: "PRES-SEC-01",
        fechaEmision: "12/10/2026",
        clienteNombre: "Juan Pablo",
        clienteDni: "30111222",
        clienteTelefono: "2355123456",
        clienteLocalidad: "Lincoln",
        items: [secretItem, ...mixedItems],
    });
    const secretClientJson = JSON.stringify(secretClientPayload);
    const leakedInDto = secretForbiddenTokens.filter((tok) => secretClientJson.includes(tok));
    assert(
        secretClientJson.includes("DESCRIPCION_PUBLICA_OK") && leakedInDto.length === 0,
        "M23.1: En toClientBudgetPayload aparece DESCRIPCION_PUBLICA_OK y NINGÚN token sensible (PROVEEDOR_SECRETO_XYZ, 987654, 9.8765, 77.77, 88.88)"
    );

    // 2. Mensaje WhatsApp
    const secretWaMsg = buildClientWhatsAppMessage(secretClientPayload);
    const leakedInWa = secretForbiddenTokens.filter((tok) => secretWaMsg.includes(tok));
    assert(
        secretWaMsg.includes("DESCRIPCION_PUBLICA_OK") && leakedInWa.length === 0,
        "M23.2: En el mensaje de WhatsApp aparece DESCRIPCION_PUBLICA_OK y NINGÚN token sensible"
    );

    // 3. Payload enviado a generarPdfPresupuesto (buildSanitizedPdfDatosFromBudget)
    const { datosPdf, renderedTextLines } = buildSanitizedPdfDatosFromBudget({
        nroPresupuesto: "PRES-SEC-01",
        fechaEmision: "12/10/2026",
        clienteNombre: "Juan Pablo",
        clienteDni: "30111222",
        clienteTelefono: "2355123456",
        clienteLocalidad: "Lincoln",
        items: [secretItem, ...mixedItems] as unknown as Array<Record<string, unknown>>,
    });
    const datosPdfJson = JSON.stringify(datosPdf);
    const leakedInPdfInput = secretForbiddenTokens.filter((tok) => datosPdfJson.includes(tok));
    assert(
        datosPdfJson.includes("DESCRIPCION_PUBLICA_OK") && leakedInPdfInput.length === 0,
        "M23.3: En los datos enviados a generarPdfPresupuesto aparece DESCRIPCION_PUBLICA_OK y NINGÚN token sensible"
    );

    // 4. Texto real renderizado por generarPdfPresupuesto (interceptando jsPDF.API.text / save y renderedTextLines)
    const renderedPdfTexts: string[] = [...renderedTextLines];
    const jsPdfApi = (jsPDF as unknown as { API?: Record<string, (...args: unknown[]) => unknown> }).API;
    const targetProto: Record<string, (...args: unknown[]) => unknown> =
        jsPdfApi || (jsPDF.prototype as unknown as Record<string, (...args: unknown[]) => unknown>);
    const origText = targetProto.text;
    const origSave = targetProto.save;
    targetProto.text = function (
        text: unknown,
        x: unknown,
        y: unknown,
        options?: unknown,
        transform?: unknown
    ) {
        if (Array.isArray(text)) {
            renderedPdfTexts.push(...text.map(String));
        } else {
            renderedPdfTexts.push(String(text));
        }
        return origText ? origText.call(this, text, x, y, options, transform) : this;
    };
    targetProto.save = function () {
        return this;
    };
    try {
        generarPdfPresupuesto(datosPdf);
    } finally {
        targetProto.text = origText;
        targetProto.save = origSave;
    }

    const fullRenderedPdfText = renderedPdfTexts.join(" | ");
    const leakedInRenderedPdf = secretForbiddenTokens.filter((tok) =>
        fullRenderedPdfText.includes(tok)
    );
    assert(
        fullRenderedPdfText.includes("DESCRIPCION_PUBLICA_OK") &&
            fullRenderedPdfText.includes("Opción 1:") &&
            fullRenderedPdfText.includes("Opción 2:") &&
            fullRenderedPdfText.includes("Opción 3:") &&
            fullRenderedPdfText.includes("Opción 4:") &&
            leakedInRenderedPdf.length === 0,
        "M23.4: En el texto real renderizado del PDF aparece DESCRIPCION_PUBLICA_OK, todas las opciones y 0 filtraciones sensibles"
    );

    // Verificar también sanitizeElementoPresupuestoPdf directamente
    const singleSanitizedPdf = JSON.stringify(
        sanitizeElementoPresupuestoPdf(secretItem as unknown as Record<string, unknown>)
    );
    assert(
        singleSanitizedPdf.includes("DESCRIPCION_PUBLICA_OK") &&
            secretForbiddenTokens.every((tok) => !singleSanitizedPdf.includes(tok)),
        "M23.5: sanitizeElementoPresupuestoPdf incluye descripción pública y bloquea el 100% de campos internos"
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
    console.log(` RESULTADO SUITE M1..M25: ${passed} PASS / ${failed} FAIL`);
    console.log("=================================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch((err) => {
    console.error("Error fatal en testManualBudgetProductsFlow:", err);
    process.exit(1);
});
