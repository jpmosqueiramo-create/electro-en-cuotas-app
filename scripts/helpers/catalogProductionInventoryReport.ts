import { createHash } from "node:crypto";
import type { CatalogReferencePublic } from "../../src/lib/catalogReference";
import { inventoryPlanIdentity } from "../../src/lib/catalogPrivacyInventory";
import type { inventoryCatalog } from "../../src/lib/catalogPrivacyInventory";

type Inventory = ReturnType<typeof inventoryCatalog>;
export const publicComparisonFields = ["nombre", "descripcion", "imagenUrls", "planesPublicados", "publicado", "schemaVersion"] as const;
export function productionInventoryReport(inventory: Inventory, currentPublic: ReadonlyMap<string, CatalogReferencePublic>) {
  const decisions = inventory.summary.rows.filter(row => ["INVALID_PRIVATE", "PUBLIC_ORPHAN", "PUBLIC_MALFORMED", "IDENTITY_CONFLICT", "REVIEW_REQUIRED"].includes(row.category)).map(row => ({
    referenciaId: row.referenciaId, nombre: row.nombre, category: row.category,
    privateExists: row.privateExists, publicExists: row.publicExists, legacy: row.legacy,
    eligibilityEvidence: row.eligibilityEvidence, imageCount: row.imageCount, activePlans: row.activePlans,
    canProducePublicDto: row.canProducePublicDto, publicMatches: row.publicMatches,
    privateFieldPresence: Object.fromEntries(Object.entries(row.privateFieldPresence).map(([key, value]) => [key, value ? "YES" : "NO"])),
    reasons: row.reasons, proposedAction: row.proposedAction,
  }));
  const candidates = inventory.plan.map(entry => {
    const current = currentPublic.get(entry.referenciaId);
    const differences = Object.fromEntries(publicComparisonFields.map(field => [field, current && JSON.stringify(current[field]) === JSON.stringify(entry.dto[field]) ? "same" : "different"]));
    const identity = { referenciaId: entry.referenciaId, nombre: entry.dto.nombre };
    if (entry.action === "CREATE") return { ...identity, action: "CREATE" as const, planesPublicados: entry.dto.planesPublicados, imageCount: entry.dto.imagenUrls.length, expectedFingerprint: entry.expectedFingerprint };
    return { ...identity, action: "REPLACE" as const, publicMatches: false as const, differences };
  });
  const planIdentity = createHash("sha256").update(inventoryPlanIdentity(inventory.plan)).digest("hex");
  const stabilityIdentity = createHash("sha256").update(JSON.stringify({
    rows: inventory.summary.rows, planIdentity,
    currentPublic: [...currentPublic.entries()].sort(([a], [b]) => a.localeCompare(b)),
  })).digest("hex");
  return {
    counts: inventory.summary.counts, publicParity: inventory.summary.publicParity,
    dryRunSensitiveFieldLeaks: inventory.summary.dryRunSensitiveFieldLeaks,
    privateDocumentCount: inventory.summary.rows.filter(row => row.privateExists).length,
    publicDocumentCount: inventory.summary.rows.filter(row => row.publicExists).length,
    planIdentity, stabilityIdentity, decisions,
    readyNew: candidates.filter(row => row.action === "CREATE"),
    readyUpdate: candidates.filter(row => row.action === "REPLACE"),
    alreadyCurrent: inventory.summary.rows.filter(row => row.category === "ALREADY_CURRENT").map(row => ({ referenciaId: row.referenciaId, nombre: row.nombre })),
    notEligible: inventory.summary.rows.filter(row => row.category === "NOT_ELIGIBLE").map(row => ({ referenciaId: row.referenciaId, nombre: row.nombre, reasons: row.reasons })),
  };
}
