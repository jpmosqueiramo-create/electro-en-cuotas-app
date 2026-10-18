export function catalogC2Fixture() {
  return {
    nombre: "Referencia de heladera", descripcion: "Bien de referencia para gestión de compra",
    skuInterno: "INTERNO-SKU", codigoBarras: "0779000000000", codigoProducto: "LEGACY",
    costoProducto: 580000, proveedor: "PROVEEDOR PRIVADO", proveedorUrl: "https://internal.invalid",
    factoresPlanes: { 12: 3, 18: 4.04, 24: 4 },
    planesActivos: Object.fromEntries(Array.from({ length: 18 }, (_, i) => [i + 1, true])),
    imagenUrls: ["/1.jpg", "/2.jpg", "/3.jpg", "/4.jpg"],
    stock: [{ id: "unidad", nserie: "SERIE PRIVADA" }], margen: 123, tasaInteresTna: 60,
    tasaMora: 0.5, notasInternas: "SECRETO", datosFiscales: { iva: 21 },
    precioContado: 999999, activo: false, publicado: false,
  };
}

const forbidden = new Set([
  "sku", "skuinterno", "ean", "codigobarras", "codigoproducto", "legacycodigoproducto",
  "costo", "costoproducto", "costoproveedor", "proveedor", "proveedorurl", "factor",
  "factorinterno", "factoresplanes", "tna", "tasainterestna", "tasamora", "mora", "margen",
  "stock", "preciocontado", "notasinternas", "datosfiscales", "valortotalreferencia",
  "cuotabasereferencia",
]);

/** Inspección recursiva de claves, incluidos objetos dentro de arrays. */
export function sensitiveCatalogPaths(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) return value.flatMap((item, i) => sensitiveCatalogPaths(item, `${path}[${i}]`));
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) => {
    const child = `${path}.${key}`;
    return [...(forbidden.has(key.toLowerCase()) ? [child] : []), ...sensitiveCatalogPaths(item, child)];
  });
}
