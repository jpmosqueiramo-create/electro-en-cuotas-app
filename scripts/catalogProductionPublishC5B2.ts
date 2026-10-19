import assert from "node:assert/strict";
import { appendFileSync, closeSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { assertProductionInventoryApp, openProtectedProductionOutput } from "./helpers/catalogProductionInventoryGuard";
import { approvedIds, excludedReference, assertC5B2Environment, assertPreflight, c5b2Base, captureC5B2Inventory, executeC5B2Plan, parseC5B2ApplyOptions, readProtectedC5B2File, validateC5B2Plan, verifyC5B2PostApply } from "./helpers/catalogProductionPublishC5B2";
import type { C5B2Plan, PrivateVersion } from "./helpers/catalogProductionPublishC5B2";
async function main() {
  const options = parseC5B2ApplyOptions(process.argv.slice(2));
  assertC5B2Environment("PRODUCTION",process.env);
  assert.equal(execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),c5b2Base);
  assert.equal(execFileSync("git",["diff","--name-only"],{encoding:"utf8"}),"");
  const repo = fileURLToPath(new URL("../",import.meta.url));
  const plan = readProtectedC5B2File(options.path,repo) as C5B2Plan;
  validateC5B2Plan(plan,options.identity);
  const evidence = readProtectedC5B2File(options.path+".preflight.json",repo) as {projectId:string;baseSha:string;completedAt:string;preflightRuns:number;stable:boolean;planIdentity:string;versions:PrivateVersion[]};
  assert.equal(evidence.projectId,options.project); assert.equal(evidence.baseSha,c5b2Base); assert.equal(evidence.planIdentity,plan.planIdentity);
  assert.equal(evidence.preflightRuns,2); assert.equal(evidence.stable,true);
  const age = Date.now()-Date.parse(evidence.completedAt); assert.ok(age>=0 && age<10*60*1000,"EXPIRED_PREFLIGHT");
  assert.deepEqual(evidence.versions.map(row=>row.id).sort(),[...approvedIds,excludedReference].sort());
  const journal = openProtectedProductionOutput(options.path+".execution.jsonl",repo);
  let attemptedId: string | null = null;
  const record = (event: object) => appendFileSync(journal.fd,JSON.stringify({...event,time:new Date().toISOString()})+"\n");
  try {
    const {initializeApp,applicationDefault} = await import("firebase-admin/app");
    const {getFirestore} = await import("firebase-admin/firestore");
    const app = initializeApp({projectId:options.project,credential:applicationDefault()},"c5b2-production-publish");
    assertProductionInventoryApp(app.options.projectId);
    const db = getFirestore(app);
    try {
      // Revalidación adicional inmediatamente antes de escribir: no reutilizar un plan obsoleto.
      const fresh = await captureC5B2Inventory(db);
      assert.deepEqual(assertPreflight(fresh),plan); assert.deepEqual(fresh.versions,evidence.versions);
      record({event:"APPLY_STARTED",projectId:app.options.projectId,planIdentity:plan.planIdentity,applyRevalidationReads:1});
      await executeC5B2Plan(db,plan,evidence.versions,result=>{
        record({event:"RESULT",...result});
        console.log(`${result.referenciaId} ${result.status} ${result.fingerprint}`);
      },entry=>{attemptedId=entry.referenciaId;record({event:"ATTEMPT",referenciaId:entry.referenciaId,fingerprint:entry.expectedFingerprint});});
      const verification = await verifyC5B2PostApply(db,plan,evidence.versions);
      record({event:"VERIFIED",...verification});
      console.log("C5B2_PRODUCTION_PUBLISH = VERIFIED; PUBLISHED_COUNT = 6; PRIVATE_PRODUCTS_MUTATED = 0; POST_APPLY_SENSITIVE_FIELD_LEAKS = 0");
    } finally {await db.terminate();}
  } catch {
    record({event:"STOPPED",referenciaId:attemptedId,reason:"EXECUTION_OR_VERIFICATION_FAILED_NO_AUTOMATIC_ROLLBACK"});
    throw new Error("C5B2_STOPPED_CHECK_PROTECTED_JOURNAL");
  } finally {closeSync(journal.fd);}
}
main().catch(()=>{console.error("C5B2_EXECUTION_STOPPED_NO_FURTHER_WRITES");process.exitCode=1;});
