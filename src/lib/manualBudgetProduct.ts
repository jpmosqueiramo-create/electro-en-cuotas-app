import { FACTORES_PREDETERMINADOS } from "./financialEngine";

export type BudgetItemSource = "CATALOGO" | "MANUAL_PRESUPUESTO";
export type BudgetPricingMode = "CANONICAL_V1" | "MANUAL_FACTOR_V1";

/**
 * Obtiene dinámicamente la lista de plazos disponibles ordenada numéricamente
 * a partir de `FACTORES_PREDETERMINADOS` (`src/lib/financialEngine.ts`) y cualquier
 * mapa de factores provisto.
 * Con el `FACTORES_PREDETERMINADOS` actual retorna: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].
 */
export function getAvailableManualPlazos(
    customSource?: Record<number | string, number>
): number[] {
    const keys = new Set<number>();
    for (const k of Object.keys(FACTORES_PREDETERMINADOS)) {
        const n = Number(k);
        if (Number.isFinite(n) && n > 0) {
            keys.add(n);
        }
    }
    if (customSource && typeof customSource === "object") {
        for (const k of Object.keys(customSource)) {
            const n = Number(k);
            if (Number.isFinite(n) && n > 0) {
                keys.add(n);
            }
        }
    }
    return Array.from(keys).sort((a, b) => a - b);
}

export const MANUAL_PLAZOS_DISPONIBLES: number[] = getAvailableManualPlazos();

export interface ManualPlanResult {
    cuotas: number;
    factor: number;
    activo: boolean;
    valorTotal: number;
    baseImponible: number;
    anticipo: number;
    saldoAFinanciar: number;
    cuotaMensual: number;
    margenEstimado: number;
}

/**
 * Esquema exacto reutilizado del Gestor de Productos (`src/app/admin/productos/page.tsx`).
 */
export interface CatalogProductFirestorePayload {
    codigoProducto: string | null;
    nombre: string;
    precioAnterior: number | null;
    cuota12: number;
    cuota8: number;
    costoProducto: number | null;
    precioContado: number | null;
    tasaInteresTna: number | null;
    tasaMora: number | null;
    proveedor: string;
    descripcion: string;
    imagenUrl: string;
    imagenUrls: string[];
    factoresPlanes: Record<number, number>;
    planesActivos: Record<number, boolean>;
    fechaCreacion: Date;
}

/**
 * Matriz campo por campo entre Alta de Catálogo (`src/app/admin/productos/page.tsx`),
 * Producto Manual en Presupuesto (`ManualProductInput` / `ManualProductSnapshot`)
 * y Guardado Opcional en Catálogo (`buildCatalogPayloadFromManualProduct`).
 */
export interface ProductSchemaMatrixRow {
    campo: keyof CatalogProductFirestorePayload;
    altaCatalogo: string;
    manualPresupuesto: string;
    guardarEnCatalogo: string;
    derivadoOEditable: "EDITABLE" | "DERIVADO" | "DERIVADO_O_EDITABLE";
}

export const PRODUCT_SCHEMA_MATRIX: ProductSchemaMatrixRow[] = [
    {
        campo: "codigoProducto",
        altaCatalogo: "codigoProducto.trim() || null",
        manualPresupuesto: "manualDraft.codigoProducto -> snapshot.codigo",
        guardarEnCatalogo: "input.codigoProducto.trim() || null",
        derivadoOEditable: "EDITABLE",
    },
    {
        campo: "nombre",
        altaCatalogo: "nombre.trim()",
        manualPresupuesto: "manualDraft.nombre (precargado desde leadData.producto) -> snapshot.nombre",
        guardarEnCatalogo: "input.nombre.trim()",
        derivadoOEditable: "EDITABLE",
    },
    {
        campo: "precioAnterior",
        altaCatalogo: "precioAnterior ? Number(precioAnterior) : null",
        manualPresupuesto: "manualDraft.precioAnterior -> snapshot.precioAnterior",
        guardarEnCatalogo: "input.precioAnterior > 0 ? Number(input.precioAnterior) : null",
        derivadoOEditable: "EDITABLE",
    },
    {
        campo: "cuota12",
        altaCatalogo: "Math.round((costoProducto * factor12) / 12)",
        manualPresupuesto: "pricing.cuota12Referencia (resultadosCalculados[12].cuotaMensual)",
        guardarEnCatalogo: "pricing.cuota12Referencia",
        derivadoOEditable: "DERIVADO",
    },
    {
        campo: "cuota8",
        altaCatalogo: "Math.round((costoProducto * factor8) / 8)",
        manualPresupuesto: "pricing.cuota8Referencia (resultadosCalculados[8].cuotaMensual)",
        guardarEnCatalogo: "pricing.cuota8Referencia",
        derivadoOEditable: "DERIVADO",
    },
    {
        campo: "costoProducto",
        altaCatalogo: "costoProducto ? Number(costoProducto) : null",
        manualPresupuesto: "manualDraft.costoProducto -> snapshot.costoProveedor",
        guardarEnCatalogo: "input.costoProducto > 0 ? Number(input.costoProducto) : null",
        derivadoOEditable: "EDITABLE",
    },
    {
        campo: "precioContado",
        altaCatalogo: "precioContado ? Number(precioContado) : Math.round(costoProducto * factor12)",
        manualPresupuesto: "manualDraft.precioContado ?? Math.round(costoProducto * factor12) -> snapshot.precioContado",
        guardarEnCatalogo: "pricing.precioContadoCalculado > 0 ? pricing.precioContadoCalculado : null",
        derivadoOEditable: "DERIVADO_O_EDITABLE",
    },
    {
        campo: "tasaInteresTna",
        altaCatalogo: "tasaInteresTna ? Number(tasaInteresTna) : null",
        manualPresupuesto: "manualDraft.tasaInteresTna -> snapshot.tasaInteresTna",
        guardarEnCatalogo: "input.tasaInteresTna > 0 ? Number(input.tasaInteresTna) : null",
        derivadoOEditable: "EDITABLE",
    },
    {
        campo: "tasaMora",
        altaCatalogo: "tasaMora ? Number(tasaMora) : null",
        manualPresupuesto: "manualDraft.tasaMora -> snapshot.tasaMora",
        guardarEnCatalogo: "input.tasaMora > 0 ? Number(input.tasaMora) : null",
        derivadoOEditable: "EDITABLE",
    },
    {
        campo: "proveedor",
        altaCatalogo: "proveedor.trim()",
        manualPresupuesto: "manualDraft.proveedor -> snapshot.proveedor (interno ADMIN)",
        guardarEnCatalogo: "input.proveedor.trim()",
        derivadoOEditable: "EDITABLE",
    },
    {
        campo: "descripcion",
        altaCatalogo: "descripcion.trim()",
        manualPresupuesto: "manualDraft.descripcion -> snapshot.descripcion",
        guardarEnCatalogo: "input.descripcion.trim()",
        derivadoOEditable: "EDITABLE",
    },
    {
        campo: "imagenUrl",
        altaCatalogo: 'totalUrls[0] || "/logo-cuenta-hogar-oficial.png"',
        manualPresupuesto: "manualDraft.imagenUrl -> snapshot.imagen",
        guardarEnCatalogo: 'primaryImagenUrl || "/logo-cuenta-hogar-oficial.png"',
        derivadoOEditable: "EDITABLE",
    },
    {
        campo: "imagenUrls",
        altaCatalogo: 'totalUrls (fallback ["/logo-cuenta-hogar-oficial.png"])',
        manualPresupuesto: "manualDraft.imagenUrls -> snapshot.imagenUrls",
        guardarEnCatalogo: 'finalUrls.length > 0 ? finalUrls : ["/logo-cuenta-hogar-oficial.png"]',
        derivadoOEditable: "DERIVADO_O_EDITABLE",
    },
    {
        campo: "factoresPlanes",
        altaCatalogo: "factoresPlanes (FACTORES_PREDETERMINADOS + overrides)",
        manualPresupuesto: "manualDraft.factoresPlanes -> snapshot.factoresAplicados",
        guardarEnCatalogo: "sanitizedFactores (todos los planes de FACTORES_PREDETERMINADOS)",
        derivadoOEditable: "EDITABLE",
    },
    {
        campo: "planesActivos",
        altaCatalogo: "planesActivos (Record<number, boolean>)",
        manualPresupuesto: "manualDraft.planesActivos -> snapshot.planesActivos",
        guardarEnCatalogo: "sanitizedPlanesActivos (todos los planes de FACTORES_PREDETERMINADOS)",
        derivadoOEditable: "EDITABLE",
    },
    {
        campo: "fechaCreacion",
        altaCatalogo: "new Date()",
        manualPresupuesto: "snapshot.fechaCotizacion (ISO string)",
        guardarEnCatalogo: "fechaCreacion (Date)",
        derivadoOEditable: "DERIVADO",
    },
];

export interface ManualProductInput {
    codigoProducto: string;
    nombre: string;
    marca?: string;
    modelo?: string;
    categoria?: string;
    descripcion: string;
    imagenUrl: string;
    imagenUrls: string[];
    costoProducto: number;
    precioContado: number | null;
    precioAnterior: number | null;
    tasaInteresTna: number | null;
    tasaMora: number | null;
    proveedor: string;
    observacionesComerciales?: string;
    observacionesInternas?: string;
    factoresPlanes: Record<number, number>;
    planesActivos: Record<number, boolean>;
    guardarEnCatalogo: boolean;
}

export interface ManualProductPricingResult {
    pricingMode: "MANUAL_FACTOR_V1";
    costoProveedor: number;
    precioContadoCalculado: number;
    cuota12Referencia: number;
    cuota8Referencia: number;
    plazoSeleccionado: number;
    factorAplicado: number;
    anticipo: number;
    valorTotal: number;
    saldoAFinanciar: number;
    cuotaMensual: number;
    margenEstimado: number;
    resultadosPorPlan: Record<number, ManualPlanResult>;
}

export interface ManualProductSnapshot {
    nombre: string;
    codigo: string | null;
    marca: string | null;
    modelo: string | null;
    categoria: string | null;
    descripcion: string;
    imagen: string;
    imagenUrls: string[];
    costoProveedor: number;
    precioContado: number;
    precioAnterior: number | null;
    proveedor: string;
    tasaInteresTna: number | null;
    tasaMora: number | null;
    observacionesComerciales: string | null;
    observacionesInternas: string | null;
    factoresAplicados: Record<number, number>;
    planesActivos: Record<number, boolean>;
    resultadosCalculados: Record<number, ManualPlanResult>;
    plazoSeleccionado: number;
    anticipo: number;
    pricingMode: "MANUAL_FACTOR_V1";
    fechaCotizacion: string;
    guardarEnCatalogo: boolean;
}

export interface InternalBudgetItem {
    itemId: string;
    source: BudgetItemSource;
    pricingMode: BudgetPricingMode;
    productoId: string | null;
    nombre: string;
    codigo?: string | null;
    marca?: string | null;
    modelo?: string | null;
    categoria?: string | null;
    descripcion?: string;
    imagenUrl?: string;
    imagenUrls?: string[];
    cantidad: number;
    precioContado: number;
    cuotas: number;
    valorCuota: number;
    anticipo: number;
    totalFinanciado: number;
    observacionesComerciales?: string | null;
    // Campos estrictamente internos (ADMIN ONLY - NUNCA SALEN AL CLIENTE)
    costoProveedor?: number | null;
    proveedor?: string | null;
    linkProveedor?: string | null;
    factorAplicado?: number | null;
    margenEstimado?: number | null;
    tnaInternaAplicada?: number | null;
    tasaMoraAplicada?: number | null;
    observacionesInternas?: string | null;
    guardarEnCatalogo?: boolean;
    pricingSnapshot?: Record<string, unknown> | null;
    manualProductSnapshot?: ManualProductSnapshot | null;
}

/**
 * DTO público para cliente (PDF / WhatsApp / Vista pública).
 * Construido estrictamente por ALLOWLIST.
 */
export interface ClientBudgetItemDTO {
    opcionNumero: number;
    nombre: string;
    marca: string | null;
    modelo: string | null;
    categoria: string | null;
    descripcion: string;
    imagenUrl: string;
    cantidad: number;
    cuotas: number;
    valorCuota: number;
    anticipo: number;
    totalComercial: number;
    precioContado: number;
    observacionesComerciales: string | null;
    alternativasCuotas?: Array<{
        cuotas: number;
        valorCuota: number;
        totalComercial: number;
    }>;
}

export interface ClientBudgetPayloadDTO {
    nroPresupuesto: string;
    fechaEmision: string;
    validezDias: number;
    cliente: {
        nombre: string;
        dni: string;
        telefono: string;
        localidad: string;
    };
    items: ClientBudgetItemDTO[];
    notasComercialesPublicas: string | null;
}

/**
 * Retorna una copia limpia de todos los factores predeterminados canónicos
 * definidos dinámicamente en `FACTORES_PREDETERMINADOS` (`src/lib/financialEngine.ts`).
 */
export function getDefaultManualFactores(): Record<number, number> {
    const plazos = getAvailableManualPlazos();
    const result: Record<number, number> = {};
    for (const c of plazos) {
        result[c] = FACTORES_PREDETERMINADOS[c] ?? Number((1 + c * 0.125).toFixed(2));
    }
    return result;
}

/**
 * Retorna el mapa de planes activos predeterminado para todos los plazos de `FACTORES_PREDETERMINADOS`.
 */
export function getDefaultPlanesActivos(): Record<number, boolean> {
    const plazos = getAvailableManualPlazos();
    const result: Record<number, boolean> = {};
    for (const c of plazos) {
        result[c] = true;
    }
    return result;
}

/**
 * Inicializa un borrador de producto manual precargando el nombre solicitado por el lead.
 */
export function createInitialManualProductDraft(prefillNombre = ""): ManualProductInput {
    return {
        codigoProducto: "",
        nombre: prefillNombre.trim(),
        marca: "",
        modelo: "",
        categoria: "",
        descripcion: "",
        imagenUrl: "",
        imagenUrls: [],
        costoProducto: 0,
        precioContado: null,
        precioAnterior: null,
        tasaInteresTna: null,
        tasaMora: null,
        proveedor: "",
        observacionesComerciales: "",
        observacionesInternas: "",
        factoresPlanes: getDefaultManualFactores(),
        planesActivos: getDefaultPlanesActivos(),
        guardarEnCatalogo: false,
    };
}

/**
 * Calcula los resultados comerciales de un producto manual para todos los planes de `FACTORES_PREDETERMINADOS`
 * reutilizando exactamente la fórmula histórica del Gestor de Productos (`src/app/admin/productos/page.tsx`)
 * y `src/lib/financialEngine.ts`:
 * - valorTotal = Math.round(costoProducto * factor)
 * - baseImponible = Math.max(0, valorTotal - costoProducto)
 * - saldoAFinanciar = Math.max(0, valorTotal - anticipo)
 * - cuotaMensual = Math.round(saldoAFinanciar / cuotas)
 * - precioContado = precioContadoExplicito || Math.round(costoProducto * factor12)
 * - cuota12 = Math.round((costoProducto * factor12) / 12)
 * - cuota8 = Math.round((costoProducto * factor8) / 8)
 */
export function calculateManualProductPricing(params: {
    costoProducto: number;
    precioContado?: number | null;
    factoresPlanes: Record<number, number>;
    planesActivos: Record<number, boolean>;
    plazoSeleccionado: number;
    anticipo?: number;
}): ManualProductPricingResult {
    const costo = Math.max(0, Number(params.costoProducto) || 0);
    const anticipo = Math.max(0, Math.round(Number(params.anticipo) || 0));
    const defaults = getDefaultManualFactores();
    const plazos = getAvailableManualPlazos(params.factoresPlanes);

    const resultadosPorPlan: Record<number, ManualPlanResult> = {};
    for (const c of plazos) {
        const rawFactor = Number(params.factoresPlanes?.[c]);
        const fallbackFactor = defaults[c] ?? FACTORES_PREDETERMINADOS[c] ?? 2.5;
        const factor = Number.isFinite(rawFactor) && rawFactor > 0 ? rawFactor : fallbackFactor;
        const activo = params.planesActivos?.[c] !== false;

        const valorTotal = Math.round(costo * factor);
        const baseImponible = Math.max(0, valorTotal - costo);
        const saldoAFinanciar = Math.max(0, valorTotal - anticipo);
        const cuotaMensual = c > 0 ? Math.round(saldoAFinanciar / c) : 0;

        resultadosPorPlan[c] = {
            cuotas: c,
            factor,
            activo,
            valorTotal,
            baseImponible,
            anticipo,
            saldoAFinanciar,
            cuotaMensual,
            margenEstimado: baseImponible,
        };
    }

    const factor12 = resultadosPorPlan[12]?.factor ?? defaults[12] ?? 2.5;
    const factor8 = resultadosPorPlan[8]?.factor ?? defaults[8] ?? 2.12;
    const cuota12Referencia = costo > 0 ? Math.round((costo * factor12) / 12) : 0;
    const cuota8Referencia = costo > 0 ? Math.round((costo * factor8) / 8) : 0;

    const explicitContado = Number(params.precioContado);
    const precioContadoCalculado =
        Number.isFinite(explicitContado) && explicitContado > 0
            ? Math.round(explicitContado)
            : costo > 0
              ? Math.round(costo * factor12)
              : 0;

    let plazo = Math.round(Number(params.plazoSeleccionado) || 12);
    if (!resultadosPorPlan[plazo] || !resultadosPorPlan[plazo].activo) {
        const activePlans = plazos.filter((c) => resultadosPorPlan[c]?.activo);
        plazo = activePlans.includes(12)
            ? 12
            : activePlans.length > 0
              ? activePlans[activePlans.length - 1]
              : plazos[plazos.length - 1] || 12;
    }

    const selectedPlan = resultadosPorPlan[plazo];

    return {
        pricingMode: "MANUAL_FACTOR_V1",
        costoProveedor: costo,
        precioContadoCalculado,
        cuota12Referencia,
        cuota8Referencia,
        plazoSeleccionado: plazo,
        factorAplicado: selectedPlan.factor,
        anticipo: selectedPlan.anticipo,
        valorTotal: selectedPlan.valorTotal,
        saldoAFinanciar: selectedPlan.saldoAFinanciar,
        cuotaMensual: selectedPlan.cuotaMensual,
        margenEstimado: selectedPlan.margenEstimado,
        resultadosPorPlan,
    };
}

/**
 * Construye el payload exacto de colección `productos` a partir de un producto manual,
 * respetando 100% los 16 campos del Gestor de Productos (`src/app/admin/productos/page.tsx`).
 */
export function buildCatalogPayloadFromManualProduct(
    input: ManualProductInput,
    fechaCreacion: Date = new Date()
): CatalogProductFirestorePayload {
    const plazos = getAvailableManualPlazos(input.factoresPlanes);
    const pricing = calculateManualProductPricing({
        costoProducto: input.costoProducto,
        precioContado: input.precioContado,
        factoresPlanes: input.factoresPlanes,
        planesActivos: input.planesActivos,
        plazoSeleccionado: 12,
        anticipo: 0,
    });

    const sanitizedFactores: Record<number, number> = {};
    const sanitizedPlanesActivos: Record<number, boolean> = {};
    for (const c of plazos) {
        sanitizedFactores[c] = pricing.resultadosPorPlan[c].factor;
        sanitizedPlanesActivos[c] = pricing.resultadosPorPlan[c].activo;
    }

    const validUrls = (input.imagenUrls || []).filter((u) => u && u.trim() !== "");
    const primaryImagenUrl =
        input.imagenUrl && input.imagenUrl.trim() !== ""
            ? input.imagenUrl.trim()
            : validUrls[0] || "/logo-cuenta-hogar-oficial.png";
    const finalUrls =
        validUrls.length > 0 ? validUrls : [primaryImagenUrl];

    return {
        codigoProducto: input.codigoProducto.trim()
            ? input.codigoProducto.trim().toUpperCase()
            : null,
        nombre: input.nombre.trim(),
        precioAnterior:
            input.precioAnterior !== null && Number(input.precioAnterior) > 0
                ? Number(input.precioAnterior)
                : null,
        cuota12: pricing.cuota12Referencia,
        cuota8: pricing.cuota8Referencia,
        costoProducto: input.costoProducto > 0 ? Number(input.costoProducto) : null,
        precioContado: pricing.precioContadoCalculado > 0 ? pricing.precioContadoCalculado : null,
        tasaInteresTna:
            input.tasaInteresTna !== null && Number(input.tasaInteresTna) > 0
                ? Number(input.tasaInteresTna)
                : null,
        tasaMora:
            input.tasaMora !== null && Number(input.tasaMora) > 0 ? Number(input.tasaMora) : null,
        proveedor: input.proveedor.trim(),
        descripcion: input.descripcion.trim(),
        imagenUrl: primaryImagenUrl,
        imagenUrls: finalUrls,
        factoresPlanes: sanitizedFactores,
        planesActivos: sanitizedPlanesActivos,
        fechaCreacion,
    };
}

/**
 * Construye el ID de documento determinístico en la colección `productos` para un item manual
 * con `guardarEnCatalogo = true`, garantizando que `(sourceBudgetId, sourceBudgetItemId)`
 * produzca como máximo 1 documento en `productos` ante doble click, reintento o re-ejecución,
 * mientras que una nueva opción con distinto `itemId` sí puede crear otro producto.
 */
export function buildDeterministicCatalogProductId(
    sourceBudgetId: string,
    sourceBudgetItemId: string
): string {
    const cleanBudget = String(sourceBudgetId || "pres")
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanItem = String(sourceBudgetItemId || "item")
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "_");
    return `prod_${cleanBudget}__${cleanItem}`;
}

/**
 * Verifica de manera determinística si un item manual ya fue dado de alta en `productos`
 * exclusivamente por su identidad de origen (`productoId` o par `sourceBudgetId + sourceBudgetItemId`),
 * sin usar el nombre del producto como identidad.
 */
export function findExistingCatalogDuplicate(
    existingProducts: Array<{
        id: string;
        sourceBudgetId?: string | null;
        sourceBudgetItemId?: string | null;
    }>,
    input: {
        productoId?: string | null;
        sourceBudgetId?: string | null;
        sourceBudgetItemId?: string | null;
    }
): string | null {
    if (!Array.isArray(existingProducts) || !input) return null;

    if (input.productoId) {
        const byId = existingProducts.find((p) => p.id === input.productoId);
        if (byId) return byId.id;
    }

    if (input.sourceBudgetId && input.sourceBudgetItemId) {
        const deterministicId = buildDeterministicCatalogProductId(
            input.sourceBudgetId,
            input.sourceBudgetItemId
        );
        const byDetId = existingProducts.find(
            (p) =>
                p.id === deterministicId ||
                (p.sourceBudgetId === input.sourceBudgetId &&
                    p.sourceBudgetItemId === input.sourceBudgetItemId)
        );
        if (byDetId) return byDetId.id;
    }

    return null;
}

/**
 * Construye un `InternalBudgetItem` con `source = "MANUAL_PRESUPUESTO"` y `pricingMode = "MANUAL_FACTOR_V1"`
 * incluyendo su `manualProductSnapshot` inmutable y aislado por copias profundas de mapas.
 */
export function createManualBudgetItem(params: {
    itemId?: string;
    productoId?: string | null;
    input: ManualProductInput;
    plazoSeleccionado: number;
    anticipo?: number;
    cantidad?: number;
    fechaCotizacion?: string;
}): InternalBudgetItem {
    const { input } = params;
    const cantidad = Math.max(1, Math.round(Number(params.cantidad) || 1));
    const anticipo = Math.max(0, Math.round(Number(params.anticipo) || 0));
    const plazos = getAvailableManualPlazos(input.factoresPlanes);

    const factoresCopy: Record<number, number> = { ...getDefaultManualFactores() };
    const planesCopy: Record<number, boolean> = { ...getDefaultPlanesActivos() };
    for (const c of plazos) {
        if (
            input.factoresPlanes &&
            Number.isFinite(Number(input.factoresPlanes[c])) &&
            Number(input.factoresPlanes[c]) > 0
        ) {
            factoresCopy[c] = Number(input.factoresPlanes[c]);
        }
        if (input.planesActivos && typeof input.planesActivos[c] === "boolean") {
            planesCopy[c] = input.planesActivos[c];
        }
    }

    const pricing = calculateManualProductPricing({
        costoProducto: input.costoProducto,
        precioContado: input.precioContado,
        factoresPlanes: factoresCopy,
        planesActivos: planesCopy,
        plazoSeleccionado: params.plazoSeleccionado,
        anticipo,
    });

    const resultadosCopy: Record<number, ManualPlanResult> = {};
    for (const c of plazos) {
        resultadosCopy[c] = { ...pricing.resultadosPorPlan[c] };
    }

    const validUrls = (input.imagenUrls || []).filter((u) => u && u.trim() !== "");
    const primaryImagenUrl =
        input.imagenUrl && input.imagenUrl.trim() !== ""
            ? input.imagenUrl.trim()
            : validUrls[0] || "";
    const finalUrls =
        validUrls.length > 0 ? [...validUrls] : primaryImagenUrl ? [primaryImagenUrl] : [];

    const fechaIso = params.fechaCotizacion || new Date().toISOString();

    const snapshot: ManualProductSnapshot = {
        nombre: input.nombre.trim(),
        codigo: input.codigoProducto.trim() ? input.codigoProducto.trim() : null,
        marca: input.marca?.trim() || null,
        modelo: input.modelo?.trim() || null,
        categoria: input.categoria?.trim() || null,
        descripcion: input.descripcion.trim(),
        imagen: primaryImagenUrl,
        imagenUrls: finalUrls,
        costoProveedor: pricing.costoProveedor,
        precioContado: pricing.precioContadoCalculado,
        precioAnterior:
            input.precioAnterior !== null && Number(input.precioAnterior) > 0
                ? Number(input.precioAnterior)
                : null,
        proveedor: input.proveedor.trim(),
        tasaInteresTna:
            input.tasaInteresTna !== null && Number(input.tasaInteresTna) > 0
                ? Number(input.tasaInteresTna)
                : null,
        tasaMora:
            input.tasaMora !== null && Number(input.tasaMora) > 0 ? Number(input.tasaMora) : null,
        observacionesComerciales: input.observacionesComerciales?.trim() || null,
        observacionesInternas: input.observacionesInternas?.trim() || null,
        factoresAplicados: factoresCopy,
        planesActivos: planesCopy,
        resultadosCalculados: resultadosCopy,
        plazoSeleccionado: pricing.plazoSeleccionado,
        anticipo: pricing.anticipo,
        pricingMode: "MANUAL_FACTOR_V1",
        fechaCotizacion: fechaIso,
        guardarEnCatalogo: Boolean(input.guardarEnCatalogo),
    };

    const generatedId =
        params.itemId || `item-manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    return {
        itemId: generatedId,
        source: "MANUAL_PRESUPUESTO",
        pricingMode: "MANUAL_FACTOR_V1",
        productoId: params.productoId ?? null,
        nombre: snapshot.nombre,
        codigo: snapshot.codigo,
        marca: snapshot.marca,
        modelo: snapshot.modelo,
        categoria: snapshot.categoria,
        descripcion: snapshot.descripcion,
        imagenUrl: snapshot.imagen,
        imagenUrls: [...snapshot.imagenUrls],
        cantidad,
        precioContado: pricing.precioContadoCalculado * cantidad,
        cuotas: pricing.plazoSeleccionado,
        valorCuota: pricing.cuotaMensual * cantidad,
        anticipo: pricing.anticipo * cantidad,
        totalFinanciado: pricing.valorTotal * cantidad,
        observacionesComerciales: snapshot.observacionesComerciales,
        costoProveedor: pricing.costoProveedor * cantidad,
        proveedor: snapshot.proveedor || null,
        linkProveedor: null,
        factorAplicado: pricing.factorAplicado,
        margenEstimado: pricing.margenEstimado * cantidad,
        tnaInternaAplicada: snapshot.tasaInteresTna,
        tasaMoraAplicada: snapshot.tasaMora,
        observacionesInternas: snapshot.observacionesInternas,
        guardarEnCatalogo: Boolean(input.guardarEnCatalogo),
        pricingSnapshot: null,
        manualProductSnapshot: snapshot,
    };
}

/**
 * Construye un `InternalBudgetItem` con `source = "CATALOGO"` y `pricingMode = "CANONICAL_V1"`
 * preservando el flujo canónico certificado.
 */
export function createCatalogBudgetItem(params: {
    itemId?: string;
    productoId: string;
    nombre: string;
    codigo?: string | null;
    descripcion?: string;
    imagenUrl?: string;
    proveedor?: string | null;
    costoProveedor?: number | null;
    cantidad?: number;
    precioContado?: number;
    cuotas: number;
    valorCuota: number;
    anticipo: number;
    totalFinanciado: number;
    tnaNominalAnual?: number | null;
    pricingSnapshot: Record<string, unknown>;
    observacionesComerciales?: string | null;
}): InternalBudgetItem {
    const cantidad = Math.max(1, Math.round(Number(params.cantidad) || 1));
    const generatedId =
        params.itemId || `item-cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const totalComercial = Math.round(params.totalFinanciado);

    return {
        itemId: generatedId,
        source: "CATALOGO",
        pricingMode: "CANONICAL_V1",
        productoId: params.productoId,
        nombre: params.nombre.trim(),
        codigo: params.codigo || null,
        marca: null,
        modelo: null,
        categoria: null,
        descripcion: params.descripcion?.trim() || "",
        imagenUrl: params.imagenUrl || "",
        imagenUrls: params.imagenUrl ? [params.imagenUrl] : [],
        cantidad,
        precioContado: totalComercial,
        cuotas: Math.round(params.cuotas),
        valorCuota: Math.round(params.valorCuota),
        anticipo: Math.round(params.anticipo),
        totalFinanciado: totalComercial,
        observacionesComerciales: params.observacionesComerciales || null,
        costoProveedor: params.costoProveedor ?? null,
        proveedor: params.proveedor ?? null,
        linkProveedor: null,
        factorAplicado: null,
        margenEstimado:
            typeof params.costoProveedor === "number" && params.costoProveedor > 0
                ? Math.max(0, Math.round(totalComercial - params.costoProveedor))
                : null,
        tnaInternaAplicada: params.tnaNominalAnual ?? null,
        tasaMoraAplicada: null,
        observacionesInternas: null,
        guardarEnCatalogo: false,
        pricingSnapshot: { ...params.pricingSnapshot },
        manualProductSnapshot: null,
    };
}

/**
 * Duplica una opción del presupuesto con copia profunda e independiente de sus snapshots y factores,
 * garantizando que editar la opción duplicada nunca modifique la original (Caso M6).
 */
export function duplicateBudgetItem(
    item: InternalBudgetItem,
    newItemId?: string
): InternalBudgetItem {
    const id =
        newItemId || `${item.itemId}-dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const clonedManualSnapshot: ManualProductSnapshot | null = item.manualProductSnapshot
        ? {
              ...item.manualProductSnapshot,
              imagenUrls: [...(item.manualProductSnapshot.imagenUrls || [])],
              factoresAplicados: { ...item.manualProductSnapshot.factoresAplicados },
              planesActivos: { ...item.manualProductSnapshot.planesActivos },
              resultadosCalculados: Object.fromEntries(
                  Object.entries(item.manualProductSnapshot.resultadosCalculados || {}).map(
                      ([k, v]) => [Number(k), { ...v }]
                  )
              ),
          }
        : null;

    return {
        ...item,
        itemId: id,
        productoId: item.source === "CATALOGO" ? item.productoId : null,
        imagenUrls: item.imagenUrls ? [...item.imagenUrls] : [],
        pricingSnapshot: item.pricingSnapshot ? { ...item.pricingSnapshot } : null,
        manualProductSnapshot: clonedManualSnapshot,
        guardarEnCatalogo: false,
    };
}

/**
 * Reconstruye un `ManualProductInput` desde un `InternalBudgetItem` manual existente para edición en el confeccionador.
 */
export function extractManualInputFromItem(item: InternalBudgetItem): {
    input: ManualProductInput;
    plazoSeleccionado: number;
    anticipo: number;
} {
    const snap = item.manualProductSnapshot;
    if (!snap) {
        return {
            input: createInitialManualProductDraft(item.nombre),
            plazoSeleccionado: item.cuotas || 12,
            anticipo: item.anticipo || 0,
        };
    }

    const mergedFactores = {
        ...getDefaultManualFactores(),
        ...(snap.factoresAplicados || {}),
    };
    const mergedPlanes = {
        ...getDefaultPlanesActivos(),
        ...(snap.planesActivos || {}),
    };

    return {
        input: {
            codigoProducto: snap.codigo || "",
            nombre: snap.nombre,
            marca: snap.marca || "",
            modelo: snap.modelo || "",
            categoria: snap.categoria || "",
            descripcion: snap.descripcion || "",
            imagenUrl: snap.imagen || "",
            imagenUrls: [...(snap.imagenUrls || [])],
            costoProducto: snap.costoProveedor,
            precioContado: snap.precioContado,
            precioAnterior: snap.precioAnterior,
            tasaInteresTna: snap.tasaInteresTna,
            tasaMora: snap.tasaMora,
            proveedor: snap.proveedor || "",
            observacionesComerciales: snap.observacionesComerciales || "",
            observacionesInternas: snap.observacionesInternas || "",
            factoresPlanes: mergedFactores,
            planesActivos: mergedPlanes,
            guardarEnCatalogo: Boolean(item.guardarEnCatalogo ?? snap.guardarEnCatalogo),
        },
        plazoSeleccionado: snap.plazoSeleccionado || item.cuotas || 12,
        anticipo: snap.anticipo ?? item.anticipo ?? 0,
    };
}

/**
 * Mapper client-facing por ALLOWLIST ESTRICTA.
 * Garantiza que costoProveedor, proveedor, factores, margen, TNA interna, tasaMora, notas internas,
 * referencias internas o snapshots administrativos NUNCA salgan hacia PDF, WhatsApp o vistas públicas.
 */
export function toClientBudgetItem(
    internalItem: InternalBudgetItem | ClientBudgetItemDTO | Record<string, unknown>,
    index = 0
): ClientBudgetItemDTO {
    const raw = internalItem as Record<string, unknown>;
    const nombre = String(raw.nombre || raw.producto || "Producto").trim();
    const marca = typeof raw.marca === "string" && raw.marca.trim() ? raw.marca.trim() : null;
    const modelo = typeof raw.modelo === "string" && raw.modelo.trim() ? raw.modelo.trim() : null;
    const categoria =
        typeof raw.categoria === "string" && raw.categoria.trim() ? raw.categoria.trim() : null;
    const descripcion = typeof raw.descripcion === "string" ? raw.descripcion.trim() : "";
    const imagenUrl = typeof raw.imagenUrl === "string" ? raw.imagenUrl.trim() : "";
    const cantidad = Math.max(1, Math.round(Number(raw.cantidad) || 1));
    const cuotas = Math.max(1, Math.round(Number(raw.cuotas) || 1));
    const valorCuota = Math.max(0, Math.round(Number(raw.valorCuota) || 0));
    const anticipo = Math.max(0, Math.round(Number(raw.anticipo) || 0));
    const totalComercial = Math.max(
        0,
        Math.round(
            Number(raw.totalFinanciado ?? raw.totalComercial ?? cuotas * valorCuota + anticipo) || 0
        )
    );
    const costoInterno = Number(raw.costoProveedor ?? raw.costoProducto ?? 0);
    const rawContado = Number(raw.precioContado ?? raw.contado ?? totalComercial) || 0;
    // Jamás exponer el costo interno de proveedor como precioContado
    const precioContado =
        costoInterno > 0 && rawContado === costoInterno ? totalComercial : Math.max(0, Math.round(rawContado));

    const observacionesComerciales =
        typeof raw.observacionesComerciales === "string" && raw.observacionesComerciales.trim()
            ? raw.observacionesComerciales.trim()
            : null;

    return {
        opcionNumero: index + 1,
        nombre,
        marca,
        modelo,
        categoria,
        descripcion,
        imagenUrl,
        cantidad,
        cuotas,
        valorCuota,
        anticipo,
        totalComercial,
        precioContado,
        observacionesComerciales,
    };
}

/**
 * Construye el payload completo sanitizado para el cliente (PDF y WhatsApp) por ALLOWLIST.
 */
export function toClientBudgetPayload(internalBudget: {
    nroPresupuesto?: string;
    fechaEmision?: string;
    validezDias?: number;
    clienteNombre?: string;
    clienteDni?: string;
    clienteTelefono?: string;
    clienteLocalidad?: string;
    cliente?: {
        nombre?: string;
        dni?: string;
        telefono?: string;
        localidad?: string;
    };
    items?: Array<InternalBudgetItem | ClientBudgetItemDTO | Record<string, unknown>>;
    notasComercialesPublicas?: string | null;
}): ClientBudgetPayloadDTO {
    const rawItems = Array.isArray(internalBudget.items) ? internalBudget.items : [];
    const sanitizedItems = rawItems.map((item, idx) => toClientBudgetItem(item, idx));

    return {
        nroPresupuesto: String(internalBudget.nroPresupuesto || "S/N"),
        fechaEmision: String(
            internalBudget.fechaEmision || new Date().toLocaleDateString("es-AR")
        ),
        validezDias: Math.max(1, Math.round(Number(internalBudget.validezDias) || 2)),
        cliente: {
            nombre: String(
                internalBudget.cliente?.nombre ?? internalBudget.clienteNombre ?? "Cliente"
            ).trim(),
            dni: String(internalBudget.cliente?.dni ?? internalBudget.clienteDni ?? "").trim(),
            telefono: String(
                internalBudget.cliente?.telefono ?? internalBudget.clienteTelefono ?? ""
            ).trim(),
            localidad: String(
                internalBudget.cliente?.localidad ?? internalBudget.clienteLocalidad ?? ""
            ).trim(),
        },
        items: sanitizedItems,
        notasComercialesPublicas:
            typeof internalBudget.notasComercialesPublicas === "string" &&
            internalBudget.notasComercialesPublicas.trim()
                ? internalBudget.notasComercialesPublicas.trim()
                : null,
    };
}

/**
 * Genera el mensaje comercial para WhatsApp EXCLUSIVAMENTE a partir del DTO público sanitizado (`toClientBudgetPayload`).
 * Nunca accede al objeto interno completo ni expone costos, factores, proveedores, márgenes, TNA ni mora interna.
 */
export function buildClientWhatsAppMessage(
    internalBudgetOrClientPayload:
        | ClientBudgetPayloadDTO
        | {
              nroPresupuesto?: string;
              fechaEmision?: string;
              validezDias?: number;
              clienteNombre?: string;
              clienteDni?: string;
              clienteTelefono?: string;
              clienteLocalidad?: string;
              items?: Array<InternalBudgetItem | ClientBudgetItemDTO | Record<string, unknown>>;
              notasComercialesPublicas?: string | null;
          }
): string {
    const payload: ClientBudgetPayloadDTO = toClientBudgetPayload(internalBudgetOrClientPayload);
    const nombreSaludo = payload.cliente.nombre.split(" ")[0] || "Cliente";

    if (payload.items.length === 0) {
        return `Hola *${nombreSaludo}*, te escribimos de *Cuenta Hogar* por tu presupuesto *#${payload.nroPresupuesto}*.`;
    }

    if (payload.items.length === 1) {
        const item = payload.items[0];
        const baseLabel = [item.nombre, item.marca, item.modelo].filter(Boolean).join(" ");
        const descSuffix = item.descripcion ? ` (${item.descripcion})` : "";
        const senaText =
            item.anticipo > 0 ? ` (Seña inicial: $${item.anticipo.toLocaleString("es-AR")})` : "";
        return (
            `Hola *${nombreSaludo}*, te preparamos tu presupuesto oficial *#${payload.nroPresupuesto}* en *Cuenta Hogar*:\n\n` +
            `• *${baseLabel}*${descSuffix} — ${item.cuotas} cuotas de *$${item.valorCuota.toLocaleString("es-AR")}*${senaText}\n\n` +
            `Vigencia de la propuesta: ${payload.validezDias} días. ¡Quedamos a tu disposición para avanzar!`
        );
    }

    const lines = payload.items.map((item, idx) => {
        const baseLabel = [item.nombre, item.marca, item.modelo].filter(Boolean).join(" ");
        const descSuffix = item.descripcion ? ` (${item.descripcion})` : "";
        const senaText =
            item.anticipo > 0 ? ` (Seña: $${item.anticipo.toLocaleString("es-AR")})` : "";
        return `${idx + 1}. ${baseLabel}${descSuffix} — ${item.cuotas} cuotas de $${item.valorCuota.toLocaleString("es-AR")}${senaText}`;
    });

    return (
        `Hola *${nombreSaludo}*, desde *Cuenta Hogar* (Presupuesto *#${payload.nroPresupuesto}*):\n\n` +
        `Te preparamos estas alternativas:\n\n` +
        `${lines.join("\n")}\n\n` +
        `Vigencia de la propuesta: ${payload.validezDias} días. Contanos cuál opción preferís para reservarla.`
    );
}

/**
 * Sanitiza un elemento individual para el generador de PDF de presupuesto por ALLOWLIST estricta.
 * Nunca incluye proveedor, linkProveedor, costoProveedor, factor, margen, TNA ni mora.
 */
export function sanitizeElementoPresupuestoPdf(raw: Record<string, unknown>): {
    producto: string;
    contado: number;
    cuotas: number;
    valorCuota: number;
    imagenUrl?: string;
} {
    const clientItem = toClientBudgetItem(raw, 0);
    const baseLabel = [clientItem.nombre, clientItem.marca, clientItem.modelo]
        .filter(Boolean)
        .join(" ");
    const producto = clientItem.descripcion ? `${baseLabel} (${clientItem.descripcion})` : baseLabel;
    return {
        producto,
        contado: clientItem.precioContado,
        cuotas: clientItem.cuotas,
        valorCuota: clientItem.valorCuota,
        ...(clientItem.imagenUrl ? { imagenUrl: clientItem.imagenUrl } : {}),
    };
}

/**
 * Construye el payload exacto para `generarPdfPresupuesto` a partir del DTO sanitizado del cliente,
 * registrando las líneas comerciales públicas para trazabilidad y verificación.
 */
export function buildSanitizedPdfDatosFromBudget(
    internalBudgetOrClientPayload:
        | ClientBudgetPayloadDTO
        | {
              nroPresupuesto?: string;
              fechaEmision?: string;
              validezDias?: number;
              clienteNombre?: string;
              clienteDni?: string;
              clienteTelefono?: string;
              clienteLocalidad?: string;
              items?: Array<InternalBudgetItem | ClientBudgetItemDTO | Record<string, unknown>>;
              notasComercialesPublicas?: string | null;
          }
): {
    datosPdf: {
        nroPresupuesto: string;
        fecha: string;
        clienteNombre: string;
        clienteDni: string;
        clienteWhatsapp: string;
        clienteLocalidad: string;
        items: Array<{
            producto: string;
            contado: number;
            cuotas: number;
            valorCuota: number;
            imagenUrl?: string;
        }>;
        notas?: string;
    };
    renderedTextLines: string[];
} {
    const payload = toClientBudgetPayload(internalBudgetOrClientPayload);
    const isMulti = payload.items.length > 1;
    const renderedTextLines: string[] = [];

    const pdfItems = payload.items.map((ci, idx) => {
        const baseLabel = [ci.nombre, ci.marca, ci.modelo].filter(Boolean).join(" ");
        const producto = ci.descripcion ? `${baseLabel} (${ci.descripcion})` : baseLabel;
        const labelProd = isMulti ? `Opción ${idx + 1}: ${producto}` : producto;
        renderedTextLines.push(
            `${labelProd} | ${ci.cuotas} cuotas de $${ci.valorCuota.toLocaleString("es-AR")} | Total: $${ci.totalComercial.toLocaleString("es-AR")}`
        );
        return {
            producto,
            contado: ci.precioContado,
            cuotas: ci.cuotas,
            valorCuota: ci.valorCuota,
            ...(ci.imagenUrl ? { imagenUrl: ci.imagenUrl } : {}),
        };
    });

    const datosPdf = {
        nroPresupuesto: payload.nroPresupuesto,
        fecha: payload.fechaEmision,
        clienteNombre: payload.cliente.nombre,
        clienteDni: payload.cliente.dni,
        clienteWhatsapp: payload.cliente.telefono,
        clienteLocalidad: payload.cliente.localidad,
        items: pdfItems,
        ...(payload.notasComercialesPublicas ? { notas: payload.notasComercialesPublicas } : {}),
    };

    if (typeof window !== "undefined") {
        (window as unknown as Record<string, unknown>).__LAST_GENERATED_BUDGET_PDF__ = {
            renderedTextLines,
            items: pdfItems,
            notas: datosPdf.notas || "",
        };
    }

    return { datosPdf, renderedTextLines };
}
