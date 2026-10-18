import assert from "node:assert/strict";
import { closeSync, fstatSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import ts from "typescript";
import { assertProductionInventoryApp, assertProductionInventoryEnvironment, openProtectedProductionOutput, parseProductionInventoryOptions } from "./helpers/catalogProductionInventoryGuard";
import { productionInventoryReport } from "./helpers/catalogProductionInventoryReport";
import { inventoryCatalog } from "../src/lib/catalogPrivacyInventory";
import { parsePublicCatalogReference } from "../src/lib/publicCatalogContract";
import { privacyFixtures } from "./helpers/catalogPrivacyFixtures";

const project = "negocio-facil-page", root = mkdtempSync(resolve(tmpdir(), "c5b1-guard-"));
const args = ["--production-read-only", "--confirm-project", project, "--output", resolve(root, "inventory.json")];
assert.equal(parseProductionInventoryOptions(args).project, project);
for (const bad of [args.slice(1), ["--production-read-only", "--output", args[4]], ["--production-read-only", "--confirm-project", "wrong", "--output", args[4]], args.slice(0, 3), [...args, "--apply"], [...args, "--production-read-only"], [...args, "--output", "other"]]) assert.throws(() => parseProductionInventoryOptions(bad));
const env = { GCLOUD_PROJECT: project, NEXT_PUBLIC_FIREBASE_PROJECT_ID: project };
assert.doesNotThrow(() => assertProductionInventoryEnvironment(env));
for (const other of [{ ...env, FIRESTORE_EMULATOR_HOST: "" }, { ...env, FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" }, { ...env, GCLOUD_PROJECT: "wrong" }, { GCLOUD_PROJECT: project }, { ...env, GOOGLE_CLOUD_PROJECT: "wrong" }, { ...env, FIREBASE_PRIVATE_KEY: "forbidden" }]) assert.throws(() => assertProductionInventoryEnvironment(other));
assert.doesNotThrow(() => assertProductionInventoryApp(project));
assert.throws(() => assertProductionInventoryApp("demo-cuenta-hogar"));
assert.throws(() => assertProductionInventoryApp(undefined));
const repo = resolve(root, "repo"); mkdirSync(repo);
assert.throws(() => openProtectedProductionOutput(resolve(repo, "inside.json"), repo));
assert.throws(() => openProtectedProductionOutput("relative.json", repo));
symlinkSync(repo, resolve(root, "repo-link"));
assert.throws(() => openProtectedProductionOutput(resolve(root, "repo-link", "inside.json"), repo));
const output = openProtectedProductionOutput(resolve(root, "protected.json"), repo);
assert.equal(fstatSync(output.fd).mode & 0o777, 0o600); writeFileSync(output.fd, "sentinel"); closeSync(output.fd);
assert.throws(() => openProtectedProductionOutput(output.path, repo));
assert.equal(readFileSync(output.path, "utf8"), "sentinel");
symlinkSync(output.path, resolve(root, "existing-link.json"));
assert.throws(() => openProtectedProductionOutput(resolve(root, "existing-link.json"), repo));
const fixture = privacyFixtures(), inventory = inventoryCatalog(fixture.privateDocs, fixture.publicDocs);
const publicDtos = fixture.publicDocs.flatMap(doc => { const parsed = parsePublicCatalogReference(doc.id, doc.data); return parsed ? [[doc.id, parsed] as const] : []; });
const report = productionInventoryReport(inventory, new Map(publicDtos));
assert.equal(report.decisions.length, 6); assert.equal(report.readyNew.length, 1); assert.equal(report.readyUpdate.length, 1);
assert.equal(report.readyUpdate[0].differences?.descripcion, "different"); assert.equal(report.readyUpdate[0].differences?.nombre, "same");
for (const secret of ["PRIVATE_PROVIDER_SECRET", "PRIVATE_SKU_SECRET", "PRIVATE_EAN_SECRET", "580000"]) assert.ok(!JSON.stringify(report).includes(secret));
assert.equal(report.stabilityIdentity, productionInventoryReport(inventory, new Map(publicDtos)).stabilityIdentity);
assert.notEqual(report.stabilityIdentity, productionInventoryReport(inventory, new Map()).stabilityIdentity);
const entry = "scripts/catalogProductionInventoryReadOnly.ts", visited = new Set<string>();
function audit(file: string) {
  const path = realpathSync(file); if (visited.has(path)) return; visited.add(path);
  const text = readFileSync(path, "utf8");
  assert.ok(!/catalogBackfillApplyC5B|publishCatalogReference|unpublishCatalogReference|catalogPublicationService|firebaseAdmin/.test(text), path);
  const ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      if (["add", "set", "create", "update", "delete", "batch", "bulkWriter", "runTransaction"].includes(method)) {
        const receiver = node.expression.expression.getText(ast);
        assert.ok(method === "add" && receiver === "seen" || method === "update" && receiver.startsWith("createHash("), `Unexpected write-capable call: ${path}:${method}`);
      }
    }
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text.startsWith(".")) audit(resolve(dirname(path), node.moduleSpecifier.text + ".ts"));
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
audit(entry);
const base = "d936a3d026e9898f9bc061742c228273e872ce92";
for (const file of ["scripts/catalogBackfillDryRun.ts", "scripts/helpers/catalogBackfillApplyC5B.ts", "src/lib/catalogBackfillPolicy.ts", "src/lib/catalogPrivacyInventory.ts", "firestore.rules"]) assert.equal(readFileSync(file, "utf8"), execFileSync("git", ["show", `${base}:${file}`], { encoding: "utf8" }));
assert.ok(readdirSync(root).includes("protected.json"));
console.log(`C5B1_GUARD_TESTS = PASS; PRODUCTION_WRITE_CAPABLE_IMPORTS = 0; TRANSITIVE_FILES_AUDITED = ${visited.size}; C5A_EMULATOR_GUARD_WEAKENED = NO; PRODUCTION_READS_DURING_TEST = 0`);
