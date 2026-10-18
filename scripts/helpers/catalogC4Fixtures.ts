import type { CatalogReferencePublic } from "../../src/lib/catalogReference";
export const forbiddenPublicKeys = new Set(["sku","skuInterno","ean","codigoBarras","codigoProducto","costo","costoProducto","costoProveedor","proveedor","factor","factoresPlanes","precioContado","precioAnterior","tna","tasaInteresTna","tasaMora","mora","margen","stock","fingerprint","revision","expectedFingerprint"]);
export function publicSensitivePaths(input: unknown, prefix = ""): string[] {
  if (!input || typeof input !== "object") return [];
  return Object.entries(input).flatMap(([key,value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return [...(forbiddenPublicKeys.has(key) ? [path] : []), ...publicSensitivePaths(value,path)];
  });
}
export function publicFixture(id = "c4-valid", nombre = "A Referencia pública"): CatalogReferencePublic {
  return { referenciaId: id, nombre, descripcion: "Gestión de compra con planes publicados.",
    imagenUrls: ["/logo-cuenta-hogar-oficial.png"], planesPublicados: [{ cuotas: 3, cuotaEstimada: 42190 },{ cuotas: 12, cuotaEstimada: 145000 },{ cuotas: 18, cuotaEstimada: 185090 }], publicado: true, schemaVersion: 1 };
}
