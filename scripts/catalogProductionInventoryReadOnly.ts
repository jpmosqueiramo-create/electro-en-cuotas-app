import { closeSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Firestore } from "firebase-admin/firestore";
import type { CatalogReferencePublic } from "../src/lib/catalogReference";
import { readCatalogPrivacyInventory } from "../src/lib/catalogPrivacyInventory";
import { parsePublicCatalogReference } from "../src/lib/publicCatalogContract";
import { assertProductionInventoryApp, assertProductionInventoryEnvironment, openProtectedProductionOutput, parseProductionInventoryOptions } from "./helpers/catalogProductionInventoryGuard";
import { productionInventoryReport } from "./helpers/catalogProductionInventoryReport";

async function main() {
  const options = parseProductionInventoryOptions(process.argv.slice(2));
  assertProductionInventoryEnvironment(process.env);
  const repository = fileURLToPath(new URL("../", import.meta.url));
  // Reservar salida antes de inicializar Admin; wx impide sobrescritura/symlink existente.
  const output = openProtectedProductionOutput(options.output, repository);
  try {
    const { initializeApp, applicationDefault } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    const app = initializeApp({ projectId: options.project, credential: applicationDefault() }, "c5b1-production-read-only");
    assertProductionInventoryApp(app.options.projectId);
    const db = getFirestore(app);
    try {
    const runs = [];
    for (let run = 0; run < 2; run++) {
      const startedAt = new Date().toISOString();
      const publicReferences: [string, CatalogReferencePublic][] = [];
      // Sólo se entrega get(); ningún método de escritura ni otra colección al lector C5A.
      const readOnlyStore = { collection: (name: string) => {
        if (name !== "productos" && name !== "catalogo_publico") throw new Error("UNAUTHORIZED_INVENTORY_COLLECTION");
        return { get: async () => {
          const snapshot = await db.collection(name).get();
          if (name === "catalogo_publico") for (const doc of snapshot.docs) {
            const parsed = parsePublicCatalogReference(doc.id, doc.data());
            if (parsed) publicReferences.push([doc.id, parsed]);
          }
          return snapshot;
        } };
      } } as unknown as Pick<Firestore, "collection">;
      const inventory = await readCatalogPrivacyInventory(readOnlyStore);
      if (inventory.summary.dryRunSensitiveFieldLeaks !== 0) throw new Error("PROJECTED_DTO_SENSITIVE_FIELDS");
      runs.push({ startedAt, completedAt: new Date().toISOString(), report: productionInventoryReport(inventory, new Map(publicReferences)) });
    }
    const stable = runs[0].report.stabilityIdentity === runs[1].report.stabilityIdentity;
    writeFileSync(output.fd, JSON.stringify({ source: "PRODUCTION_READ_ONLY", projectId: app.options.projectId, runs, stable, productionDatabaseMutations: 0, collectionsRead: ["productos", "catalogo_publico"] }, null, 2) + "\n");
    if (!stable) throw new Error("PRODUCTION_INVENTORY_UNSTABLE");
    console.log("PRODUCTION_PROJECT_CONFIRMED = YES; PRODUCTION_INVENTORY_RUNS = 2; PRODUCTION_INVENTORY_STABLE = YES; PRODUCTION_DATABASE_MUTATIONS = 0");
    } finally { await db.terminate(); }
  } finally { closeSync(output.fd); }
}
main().catch(error => {
  // Nunca imprimir mensaje/stack SDK: pueden contener metadata de credenciales o datos.
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  console.error(code === 7 || code === "permission-denied" ? "PRODUCTION_INVENTORY_AUTHORIZATION_DENIED" : code === 16 || code === "unauthenticated" ? "PRODUCTION_INVENTORY_UNAUTHENTICATED" : "PRODUCTION_INVENTORY_STOPPED_WITHOUT_WRITES");
  process.exitCode = 1;
});
