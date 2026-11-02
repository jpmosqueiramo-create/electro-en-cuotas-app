import { adaptarReferenciaCatalogoLegacy, generarPlanesPublicablesCatalogo } from "./catalogReference";

/** Explicit shareable allowlist. Never pass private catalog objects to the PDF. */
export type CatalogPriceListItem = {
  name: string; brand: string; kind: string; imageUrl: string;
  plans: { installments: number; amount: number }[];
  warning: string;
};
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
export function buildCatalogPriceList(products: readonly (Record<string, unknown> & { id: string })[]): CatalogPriceListItem[] {
  return products.map(product => {
    const reference = adaptarReferenciaCatalogoLegacy(product.id, product);
    let plans: CatalogPriceListItem["plans"] = [], warning = "";
    try {
      plans = generarPlanesPublicablesCatalogo(reference).map(plan => ({ installments: plan.cuotas, amount: plan.cuotaExhibidaCatalogo }));
      if (!plans.length) warning = "Sin planes habilitados";
    } catch { warning = "Precios no disponibles - consultar"; }
    return { name: reference.nombre || "Producto sin nombre", brand: text(product.marca), kind: text(product.tipoProducto), imageUrl: reference.imagenUrls[0] || "", plans, warning };
  }).sort((a,b) => a.name.localeCompare(b.name, "es", { sensitivity: "base", numeric: true }));
}
export function catalogPriceListDate(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }).format(date);
}
export function catalogPriceListFilename(date: Date): string {
  return `Lista-Precios-Cuenta-Hogar-${catalogPriceListDate(date)}.pdf`;
}
