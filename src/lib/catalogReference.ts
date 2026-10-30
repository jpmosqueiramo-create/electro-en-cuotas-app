/**
 * REFERENCIA COMERCIAL DE CATÁLOGO, importes en pesos ARS.
 * Funciones puras: no crean propuestas, deuda, cronogramas ni cálculos fiscales.
 * La publicación futura no acredita stock o disponibilidad de proveedor.
 */
export const CATALOGO_REFERENCIA_FACTORES_DEFAULT: Readonly<Record<number, number>> =
  Object.freeze({
    1: 1.10, 2: 1.27, 3: 1.45, 4: 1.62, 5: 1.79, 6: 1.96,
    7: 2.14, 8: 2.31, 9: 2.48, 10: 2.65, 11: 2.83, 12: 3.00,
    13: 3.17, 14: 3.35, 15: 3.52, 16: 3.69, 17: 3.86, 18: 4.04,
  });

type Factores = Readonly<Record<string, number | undefined>>;
type PlanesActivos = Readonly<Record<string, boolean | undefined>>;

export interface CatalogReferencePrivate {
  id: string;
  categoriaLogistica?: import("./loopServiceTariffs").LoopCategory | null;
  skuInterno?: string | null;
  codigoBarras?: string | null;
  nombre: string;
  descripcion: string;
  imagenUrls: readonly string[];
  costoProveedor: number;
  proveedor: string;
  factoresPlanes: Factores;
  planesActivos: PlanesActivos;
  publicado: boolean;
  // Compatibilidad privada; no interpretar códigos ni recalcular historia.
  legacyCodigoProducto?: string | null;
  costoProducto?: unknown;
  imagenUrl?: unknown;
  cuota8?: unknown;
  cuota12?: unknown;
  precioContado?: unknown;
  stock?: unknown;
}

export interface CatalogReferencePublic {
  referenciaId: string;
  nombre: string;
  descripcion: string;
  imagenUrls: string[];
  planesPublicados: { cuotas: number; cuotaEstimada: number }[];
  publicado: boolean;
  schemaVersion: 1;
}

export interface CatalogReferencePlan {
  cuotas: number;
  factorInterno: number;
  valorTotalReferencia: number;
  cuotaBaseReferencia: number;
  cuotaExhibidaCatalogo: number;
  roundingStrategy: "NEXT_90_V1";
}

function assertPositive(value: number, field: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${field}: debe ser un número finito mayor a cero`);
  }
}

/** Conserva miles exactos; en otro caso, próxima terminación 90 sin bajar la base. */
export function redondearCuotaCatalogo(cuotaBaseReferencia: number): number {
  assertPositive(cuotaBaseReferencia, "cuotaBaseReferencia");
  if (Number.isSafeInteger(cuotaBaseReferencia) && cuotaBaseReferencia % 1000 === 0) {
    return cuotaBaseReferencia;
  }
  const result = Math.ceil((cuotaBaseReferencia - 90) / 100) * 100 + 90;
  if (!Number.isSafeInteger(result) || result < cuotaBaseReferencia) {
    throw new RangeError("cuotaExhibidaCatalogo: fuera del rango monetario seguro");
  }
  return result;
}

export function calcularPlanReferenciaCatalogo(input: {
  costoProveedor: number;
  cuotas: number;
  factor: number;
}): CatalogReferencePlan {
  assertPositive(input.costoProveedor, "costoProveedor");
  assertPositive(input.factor, "factor");
  if (!Number.isInteger(input.cuotas) || input.cuotas < 1 || input.cuotas > 18) {
    throw new RangeError("cuotas: debe ser un entero entre 1 y 18");
  }
  const valorTotalReferencia = Math.round(input.costoProveedor * input.factor);
  if (!Number.isSafeInteger(valorTotalReferencia) || valorTotalReferencia <= 0) {
    throw new RangeError("valorTotalReferencia: fuera del rango monetario seguro");
  }
  const cuotaBaseReferencia = valorTotalReferencia / input.cuotas;
  return {
    cuotas: input.cuotas,
    factorInterno: input.factor,
    valorTotalReferencia,
    cuotaBaseReferencia,
    cuotaExhibidaCatalogo: redondearCuotaCatalogo(cuotaBaseReferencia),
    roundingStrategy: "NEXT_90_V1",
  };
}

/** Ausente usa default; un override inválido nunca se sustituye silenciosamente. */
export function generarPlanesPublicablesCatalogo(input: {
  costoProveedor: number;
  factoresPlanes: Factores;
  planesActivos: PlanesActivos;
}): CatalogReferencePlan[] {
  assertPositive(input.costoProveedor, "costoProveedor");
  const planes: CatalogReferencePlan[] = [];
  for (let cuotas = 1; cuotas <= 18; cuotas++) {
    if (input.planesActivos[cuotas] !== true) continue;
    const factor = input.factoresPlanes[cuotas] === undefined
      ? CATALOGO_REFERENCIA_FACTORES_DEFAULT[cuotas]
      : input.factoresPlanes[cuotas]!;
    planes.push(calcularPlanReferenciaCatalogo({
      costoProveedor: input.costoProveedor, cuotas, factor,
    }));
  }
  return planes;
}

export function validarReferenciaParaPublicacion(
  reference: CatalogReferencePrivate,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (typeof reference.nombre !== "string" || !reference.nombre.trim()) {
    errors.push("nombre: requerido");
  }
  if (typeof reference.descripcion !== "string" || !reference.descripcion.trim()) {
    errors.push("descripcion: requerida");
  }
  if (!Array.isArray(reference.imagenUrls) || reference.imagenUrls.length < 1 ||
      reference.imagenUrls.length > 4 || reference.imagenUrls.some(
        image => typeof image !== "string" || !image.trim(),
      )) {
    errors.push("imagenUrls: se requieren de 1 a 4 imágenes no vacías");
  }
  try {
    const planes = generarPlanesPublicablesCatalogo(reference);
    if (!planes.length) errors.push("planesActivos: se requiere al menos un plan");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Configuración de planes inválida");
  }
  return { valid: errors.length === 0, errors };
}

/** Allowlist explícita, también para objetos anidados; no publica ni escribe. */
export function toCatalogReferencePublic(
  reference: CatalogReferencePrivate,
): CatalogReferencePublic {
  const validation = validarReferenciaParaPublicacion(reference);
  if (!validation.valid) throw new Error(validation.errors.join("; "));
  if (typeof reference.id !== "string" || !reference.id.trim()) {
    throw new Error("id: requerido para construir la proyección");
  }
  return {
    referenciaId: reference.id,
    nombre: reference.nombre.trim(),
    descripcion: reference.descripcion.trim(),
    imagenUrls: reference.imagenUrls.map(image => image.trim()),
    planesPublicados: generarPlanesPublicablesCatalogo(reference).map(plan => ({
      cuotas: plan.cuotas,
      cuotaEstimada: plan.cuotaExhibidaCatalogo,
    })),
    publicado: reference.publicado === true,
    schemaVersion: 1,
  };
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Lectura legacy sin escrituras. No usa precioContado/cuota8/cuota12 como costo,
 * factor ni habilitación; no interpreta codigoProducto como SKU o EAN.
 * Conserva datos históricos opacos sin serializar ni modificar tipos Firestore.
 */
export function adaptarReferenciaCatalogoLegacy(
  id: string, raw: Readonly<Record<string, unknown>>,
): CatalogReferencePrivate {
  const factoresPlanes = Object.fromEntries(
    Object.entries(record(raw.factoresPlanes)).map(([key, value]) => [
      key, typeof value === "number" ? value : Number.NaN,
    ]),
  );
  const planesActivos = Object.fromEntries(
    Object.entries(record(raw.planesActivos)).map(([key, value]) => [key, value === true]),
  );
  // Mantener todas las imágenes: el validador debe detectar listas de más de cuatro.
  const images = Array.isArray(raw.imagenUrls) && raw.imagenUrls.length
    ? raw.imagenUrls.map(value => text(value))
    : text(raw.imagenUrl) ? [text(raw.imagenUrl)] : [];
  const costo = raw.costoProveedor === undefined ? raw.costoProducto : raw.costoProveedor;
  return {
    id,
    categoriaLogistica: typeof raw.categoriaLogistica === "string" && ["A","B","C","D"].includes(raw.categoriaLogistica) ? raw.categoriaLogistica as import("./loopServiceTariffs").LoopCategory : null,
    skuInterno: typeof raw.skuInterno === "string" ? raw.skuInterno : null,
    codigoBarras: typeof raw.codigoBarras === "string" ? raw.codigoBarras : null,
    legacyCodigoProducto: typeof raw.legacyCodigoProducto === "string"
      ? raw.legacyCodigoProducto : typeof raw.codigoProducto === "string" ? raw.codigoProducto : null,
    nombre: text(raw.nombre),
    descripcion: text(raw.descripcion),
    imagenUrls: images,
    costoProveedor: typeof costo === "number" ? costo : Number.NaN,
    proveedor: text(raw.proveedor),
    factoresPlanes,
    planesActivos,
    publicado: raw.publicado === true && raw.activo !== false,
    costoProducto: raw.costoProducto,
    imagenUrl: raw.imagenUrl,
    cuota8: raw.cuota8,
    cuota12: raw.cuota12,
    precioContado: raw.precioContado,
    stock: raw.stock,
  };
}
