import type { CatalogReferencePublic } from "./catalogReference";
import { parsePublicCatalogReference, isPublicReferenceId } from "./publicCatalogContract";

async function requestPublicCatalog(url: string, signal?: AbortSignal): Promise<Response> {
  try { return await fetch(url, { cache: "no-store", signal }); }
  catch (error) {
    if (signal?.aborted) throw error;
    throw new Error("No pudimos cargar las referencias. Reintentá la consulta.");
  }
}

export async function fetchPublicCatalog(signal?: AbortSignal): Promise<CatalogReferencePublic[]> {
  const response = await requestPublicCatalog("/api/catalogo", signal);
  if (!response.ok) throw new Error("No pudimos cargar las referencias. Reintentá la consulta.");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("items" in body) || !Array.isArray(body.items)) throw new Error("Respuesta de catálogo inválida.");
  return body.items.map((raw: unknown) => {
    const id = raw && typeof raw === "object" && "referenciaId" in raw ? raw.referenciaId : null;
    const dto = typeof id === "string" ? parsePublicCatalogReference(id, raw) : null;
    if (!dto) throw new Error("Respuesta de catálogo inválida.");
    return dto;
  });
}
export async function fetchPublicCatalogReference(id: string, signal?: AbortSignal): Promise<CatalogReferencePublic | null> {
  if (!isPublicReferenceId(id)) return null;
  const response = await requestPublicCatalog(`/api/catalogo/${encodeURIComponent(id)}`, signal);
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw new Error("No pudimos cargar la referencia. Reintentá la consulta.");
  const dto = parsePublicCatalogReference(id, await response.json());
  if (!dto) throw new Error("Respuesta de referencia inválida.");
  return dto;
}
