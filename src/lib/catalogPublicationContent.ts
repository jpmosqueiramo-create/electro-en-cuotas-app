import { createHash } from "node:crypto";
import {
  adaptarReferenciaCatalogoLegacy,
  toCatalogReferencePublic,
  validarReferenciaParaPublicacion,
  type CatalogReferencePublic,
} from "./catalogReference";

export class CatalogPublicationError extends Error {
  constructor(public readonly status: 400 | 404 | 409, public readonly code: string) {
    super(code);
    this.name = "CatalogPublicationError";
  }
}

export function assertCatalogReferenceId(id: string): void {
  if (typeof id !== "string" || !id.trim() || id !== id.trim() ||
      id === "." || id === ".." || /[/\u0000-\u001f\u007f]/.test(id) ||
      /^__.*__$/.test(id) || Buffer.byteLength(id, "utf8") > 1500) {
    throw new CatalogPublicationError(400, "INVALID_REFERENCE_ID");
  }
}

/** Orden de claves irrelevante; orden de arrays (imágenes/planes) significativo. */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map(key =>
      `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
  }
  throw new TypeError("NON_CANONICAL_JSON_VALUE");
}

/** Segunda allowlist explícita: ningún extra del objeto JS entra en el hash. */
export function serializeCatalogReferencePublic(dto: CatalogReferencePublic): string {
  return canonicalJson({
    referenciaId: dto.referenciaId,
    nombre: dto.nombre,
    descripcion: dto.descripcion,
    imagenUrls: dto.imagenUrls,
    planesPublicados: dto.planesPublicados.map(plan => ({
      cuotas: plan.cuotas, cuotaEstimada: plan.cuotaEstimada,
    })),
    publicado: dto.publicado,
    schemaVersion: dto.schemaVersion,
  });
}

export function fingerprintCatalogReference(dto: CatalogReferencePublic): string {
  return createHash("sha256").update(serializeCatalogReferencePublic(dto)).digest("hex");
}

/** Comparar también claves extra del documento viejo para forzar su limpieza. */
export function isCurrentCatalogProjection(current: unknown, dto: CatalogReferencePublic): boolean {
  try {
    return canonicalJson(current) === serializeCatalogReferencePublic(dto);
  } catch {
    return false;
  }
}

export function prepareCatalogPublication(id: string, raw: Readonly<Record<string, unknown>>) {
  assertCatalogReferenceId(id);
  const reference = adaptarReferenciaCatalogoLegacy(id, raw);
  // C2: existencia de la proyección manda. No redefinir ni escribir flags legacy.
  reference.publicado = true;
  const validation = validarReferenciaParaPublicacion(reference);
  const dto = validation.valid ? toCatalogReferencePublic(reference) : null;
  return { dto, validation, fingerprint: dto ? fingerprintCatalogReference(dto) : null };
}
