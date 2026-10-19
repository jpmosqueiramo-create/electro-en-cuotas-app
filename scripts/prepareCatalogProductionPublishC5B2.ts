import assert from "node:assert/strict";
import { closeSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { assertProductionInventoryApp, openProtectedProductionOutput, parseProductionInventoryOptions } from "./helpers/catalogProductionInventoryGuard";
import { assertC5B2Environment, assertStablePreflight, c5b2Base, captureC5B2Inventory, validateC5B2Plan } from "./helpers/catalogProductionPublishC5B2";
async function main() {
  const options = parseProductionInventoryOptions(process.argv.slice(2));
  assertC5B2Environment("PRODUCTION",process.env);
  assert.equal(execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),c5b2Base);
  assert.equal(execFileSync("git",["diff","--name-only"],{encoding:"utf8"}),"");
  const repo = fileURLToPath(new URL("../",import.meta.url));
  const output = openProtectedProductionOutput(options.output,repo);
  try {
    const evidence = openProtectedProductionOutput(output.path+".preflight.json",repo);
    try {
      const {initializeApp,applicationDefault} = await import("firebase-admin/app");
      const {getFirestore} = await import("firebase-admin/firestore");
      const app = initializeApp({projectId:options.project,credential:applicationDefault()},"c5b2-preflight-read-only");
      assertProductionInventoryApp(app.options.projectId);
      const db = getFirestore(app);
      try {
        const startedAt = new Date().toISOString();
        const first = await captureC5B2Inventory(db), second = await captureC5B2Inventory(db);
        const plan = assertStablePreflight(first,second); validateC5B2Plan(plan,plan.planIdentity);
        writeFileSync(evidence.fd,JSON.stringify({projectId:app.options.projectId,baseSha:c5b2Base,startedAt,completedAt:new Date().toISOString(),preflightRuns:2,stable:true,planIdentity:plan.planIdentity,versions:second.versions,counts:second.inventory.summary.counts,preApplySensitiveFieldLeaks:0},null,2)+"\n");
        writeFileSync(output.fd,JSON.stringify(plan,null,2)+"\n");
        console.log(`C5B2_PREFLIGHT_RUNS = 2; C5B2_PREFLIGHT_STABLE = YES; PRE_APPLY_SENSITIVE_FIELD_LEAKS = 0; C5B2_PLAN_IDENTITY = ${plan.planIdentity}`);
      } finally { await db.terminate(); }
    } finally {closeSync(evidence.fd);}
  } finally {closeSync(output.fd);}
}
main().catch(()=>{console.error("C5B2_PREFLIGHT_STOPPED_WITHOUT_WRITES");process.exitCode=1;});
