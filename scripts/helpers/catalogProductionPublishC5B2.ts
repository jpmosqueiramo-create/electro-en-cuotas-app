import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute } from "node:path";
import type { Firestore, DocumentReference } from "firebase-admin/firestore";
import { assertSafeEmulatorEnvironment } from "./assertSafeEmulatorEnvironment";
import { assertProductionInventoryEnvironment } from "./catalogProductionInventoryGuard";
import { inventoryCatalog, sensitiveFieldCount } from "../../src/lib/catalogPrivacyInventory";
import { prepareCatalogPublication, fingerprintCatalogReference, serializeCatalogReferencePublic, isCurrentCatalogProjection } from "../../src/lib/catalogPublicationContent";
import { publishCatalogReference } from "../../src/lib/catalogPublicationService";
import { parsePublicCatalogReference } from "../../src/lib/publicCatalogContract";
import { readPublicCatalog } from "../../src/lib/publicCatalogReader";

export const c5b2Base = "0c0650b5be4891a67ef84be7717d89e3f9f631f2";
export const excludedReference = "v5lxKCM7NOAHLf2EHUIT";
export const approvedReferences = Object.freeze([
  Object.freeze({ id: "313uufET7xOR1kXyPAG6", name: "KANJI LAVARROPAS AUTOMATICO 4K CARGA SUPERIOR KJH-WMCVSL6K", plans: Object.freeze([12]) }),
  Object.freeze({ id: "5qYNJkPGWm4gGgISjH56", name: "LAVARROPAS INVERTER 8K Kanji KJH-WMCFWT8", plans: Object.freeze([12]) }),
  Object.freeze({ id: "D6bStUjs0j5D5wknli8i", name: "HELADERA Kanji KJH-HD140B", plans: Object.freeze([8,12]) }),
  Object.freeze({ id: "tXshmaQnIatZzM2ND8IS", name: "COLCHON CALM ORIGINAL 1 PLAZA 80X190X23", plans: Object.freeze([8,12]) }),
  Object.freeze({ id: "tYuknm6Alau0GY8Ip6wD", name: "Heladera Kanji KJH-SBS400GE", plans: Object.freeze([8,12]) }),
  Object.freeze({ id: "yPGtIX7i601rZdJtPLVo", name: "LAVARROPAS ENOVA INVERTER 6,5 K", plans: Object.freeze([12]) }),
]);
export const approvedIds = Object.freeze(approvedReferences.map(row => row.id).sort());
const normalize = (value: string) => value.trim().replace(/\s+/g, " ");
export function assertApprovedIds(ids: readonly string[]) {
  assert.equal(ids.length, 6, "EXACTLY_SIX_IDS_REQUIRED");
  assert.equal(new Set(ids).size, 6, "DUPLICATE_REFERENCE_ID");
  assert.deepEqual([...ids].sort(), approvedIds, "UNAUTHORIZED_REFERENCE_ID");
}
export function assertC5B2Environment(mode: "PRODUCTION" | "EMULATOR", env: Record<string,string|undefined>) {
  if (mode === "PRODUCTION") assertProductionInventoryEnvironment(env);
  else {
    assert.equal(assertSafeEmulatorEnvironment(env), "demo-cuenta-hogar");
    assert.equal(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, "demo-cuenta-hogar");
    assert.equal(env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:8080");
    assert.equal(env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
  }
}
export function parseC5B2ApplyOptions(args: readonly string[]) {
  let apply = false;
  const values: Record<string,string> = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === "--production-apply") { assert.ok(!apply, "DUPLICATE_APPLY_FLAG"); apply = true; }
    else {
      assert.ok(["--confirm-project", "--plan", "--confirm-plan"].includes(flag), "UNKNOWN_APPLY_FLAG");
      const value = args[++i];
      assert.ok(value && !value.startsWith("--") && !values[flag], "MISSING_OR_DUPLICATE_FLAG");
      values[flag] = value;
    }
  }
  assert.ok(apply && values["--confirm-project"] === "negocio-facil-page" && isAbsolute(values["--plan"] ?? "") && /^[a-f0-9]{64}$/.test(values["--confirm-plan"] ?? ""), "EXPLICIT_APPLY_PROJECT_PLAN_HASH_REQUIRED");
  return { project: values["--confirm-project"], path: values["--plan"], identity: values["--confirm-plan"] };
}
export type PlanEntry = { referenciaId: string; nombre: string; expectedFingerprint: string; planesPublicados: { cuotas: number; cuotaEstimada: number }[]; imageCount: number; action: "CREATE" };
export type C5B2Plan = { projectId: string; baseSha: string; approvedReferenceIds: string[]; entries: PlanEntry[]; planIdentity: string };
export function planIdentity(entries: readonly Pick<PlanEntry,"referenciaId"|"expectedFingerprint"|"action">[]) {
  return createHash("sha256").update(JSON.stringify([...entries].sort((a,b) => a.referenciaId.localeCompare(b.referenciaId)).map(row => ({ referenciaId: row.referenciaId, expectedFingerprint: row.expectedFingerprint, action: row.action })))).digest("hex");
}
export function validateC5B2Plan(plan: C5B2Plan, expected: string) {
  assert.deepEqual(Object.keys(plan).sort(), ["projectId","baseSha","approvedReferenceIds","entries","planIdentity"].sort());
  assert.equal(plan.projectId, "negocio-facil-page"); assert.equal(plan.baseSha, c5b2Base);
  assertApprovedIds(plan.approvedReferenceIds); assertApprovedIds(plan.entries.map(row => row.referenciaId));
  for (const row of plan.entries) {
    assert.deepEqual(Object.keys(row).sort(), ["referenciaId","nombre","expectedFingerprint","planesPublicados","imageCount","action"].sort());
    const approved = approvedReferences.find(item => item.id === row.referenciaId)!;
    assert.equal(normalize(row.nombre), approved.name); assert.equal(row.action, "CREATE"); assert.equal(row.imageCount, 1);
    assert.match(row.expectedFingerprint, /^[a-f0-9]{64}$/);
    assert.deepEqual(row.planesPublicados.map(item => item.cuotas), approved.plans);
    for (const item of row.planesPublicados) { assert.deepEqual(Object.keys(item).sort(), ["cuotas","cuotaEstimada"].sort()); assert.ok(Number.isFinite(item.cuotaEstimada) && item.cuotaEstimada > 0); }
  }
  assert.equal(sensitiveFieldCount(plan), 6); // Sólo los seis expectedFingerprint permitidos en el plan, nunca DTO.
  assert.equal(planIdentity(plan.entries), plan.planIdentity); assert.equal(expected, plan.planIdentity, "PLAN_HASH_MISMATCH");
}
export function readProtectedC5B2File(path: string, repo: string): unknown {
  assert.ok(isAbsolute(path)); const actual = realpathSync(path), root = realpathSync(repo);
  assert.ok(actual !== root && !actual.startsWith(root + "/"), "PROTECTED_FILE_INSIDE_REPOSITORY");
  const stat = lstatSync(path); assert.ok(stat.isFile() && !stat.isSymbolicLink()); assert.equal(stat.mode & 0o777, 0o600);
  return JSON.parse(readFileSync(path, "utf8"));
}
export type PrivateVersion = { id: string; seconds: number; nanoseconds: number };
export async function captureC5B2Inventory(db: Pick<Firestore,"collection">) {
  const [privateSnapshot, publicSnapshot] = await Promise.all([db.collection("productos").get(), db.collection("catalogo_publico").get()]);
  const inventory = inventoryCatalog(privateSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })), publicSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })));
  const versions: PrivateVersion[] = privateSnapshot.docs.map(doc => ({ id: doc.id, seconds: doc.updateTime.seconds, nanoseconds: doc.updateTime.nanoseconds })).sort((a,b) => a.id.localeCompare(b.id));
  return { privateSnapshot, publicSnapshot, inventory, versions };
}
export type Capture = Awaited<ReturnType<typeof captureC5B2Inventory>>;
export function assertPreflight(snapshot: Capture): C5B2Plan {
  assert.equal(snapshot.privateSnapshot.size, 7); assert.equal(snapshot.publicSnapshot.size, 0);
  assert.deepEqual(snapshot.versions.map(row => row.id).sort(), [...approvedIds,excludedReference].sort());
  assert.deepEqual(snapshot.inventory.summary.counts, { READY_NEW:0, READY_UPDATE:0, ALREADY_CURRENT:0, NOT_ELIGIBLE:1, INVALID_PRIVATE:0, PUBLIC_ORPHAN:0, PUBLIC_MALFORMED:0, IDENTITY_CONFLICT:0, REVIEW_REQUIRED:6 });
  const entries: PlanEntry[] = [];
  for (const approved of approvedReferences) {
    const row = snapshot.inventory.summary.rows.find(item => item.referenciaId === approved.id)!;
    assert.equal(row.category, "REVIEW_REQUIRED"); assert.equal(row.privateExists, true); assert.equal(row.publicExists, false);
    assert.deepEqual(row.legacy, { activo:"MISSING", publicado:"MISSING" }); assert.equal(row.eligibilityEvidence,"NONE");
    assert.deepEqual(row.reasons,["AMBIGUOUS_OR_MISSING_PUBLICATION_FLAGS"]); assert.equal(row.imageCount,1); assert.equal(row.canProducePublicDto,true);
    assert.deepEqual(row.activePlans, approved.plans); assert.equal(normalize(row.nombre), approved.name);
    const raw = snapshot.privateSnapshot.docs.find(doc => doc.id === approved.id)!.data();
    const prepared = prepareCatalogPublication(approved.id,raw);
    assert.ok(prepared.dto && prepared.validation.valid && prepared.fingerprint);
    assert.equal(prepared.dto.publicado,true); assert.equal(prepared.dto.schemaVersion,1); assert.equal(sensitiveFieldCount(prepared.dto),0);
    assert.deepEqual(prepared.dto.planesPublicados.map(plan => plan.cuotas),approved.plans);
    entries.push({ referenciaId:approved.id, nombre:prepared.dto.nombre, expectedFingerprint:prepared.fingerprint, planesPublicados:prepared.dto.planesPublicados, imageCount:prepared.dto.imagenUrls.length, action:"CREATE" });
  }
  const excluded = snapshot.inventory.summary.rows.find(row => row.referenciaId === excludedReference)!;
  assert.equal(excluded.category,"NOT_ELIGIBLE"); assert.equal(excluded.privateExists,true); assert.equal(excluded.publicExists,false); assert.deepEqual(excluded.reasons,["EXPLICIT_LEGACY_DISABLE"]);
  entries.sort((a,b) => a.referenciaId.localeCompare(b.referenciaId));
  return { projectId:"negocio-facil-page",baseSha:c5b2Base,approvedReferenceIds:[...approvedIds],entries,planIdentity:planIdentity(entries) };
}
export function assertStablePreflight(first: Capture, second: Capture) {
  const a = assertPreflight(first), b = assertPreflight(second);
  assert.deepEqual(a,b,"PREFLIGHT_PLAN_CHANGED"); assert.deepEqual(first.versions,second.versions,"PREFLIGHT_PRIVATE_VERSION_CHANGED");
  assert.deepEqual(first.inventory.summary,second.inventory.summary,"PREFLIGHT_INVENTORY_CHANGED"); return b;
}
export type PublishResult = { referenciaId: string; status: "PUBLISHED" | "ALREADY_CURRENT"; fingerprint: string };
/** Capability boundary: C2 sólo puede crear el público de este ID; nunca reemplazar ni escribir privados. */
export async function publishApprovedC5B2Reference(db: Firestore, entry: PlanEntry, versions: readonly PrivateVersion[]) {
  assert.ok(approvedIds.some(id => id === entry.referenciaId));
  const privatePath = `productos/${entry.referenciaId}`, publicPath = `catalogo_publico/${entry.referenciaId}`;
  const store = {
    doc(path: string) { assert.ok(path === privatePath || path === publicPath); return db.doc(path); },
    runTransaction(callback: (transaction: unknown) => Promise<PublishResult>) {
      return db.runTransaction(async transaction => {
        let absentPublicRead = false;
        const facade = {
          async get(ref: DocumentReference) {
            assert.ok(ref.path === privatePath || ref.path === publicPath);
            const snap = await transaction.get(ref);
            if (ref.path === publicPath) absentPublicRead = !snap.exists;
            else {
              assert.ok(snap.exists);
              const approved = approvedReferences.find(row => row.id === entry.referenciaId)!;
              const raw = snap.data()!;
              assert.equal(normalize(raw.nombre),approved.name); assert.equal(raw.activo,undefined); assert.equal(raw.publicado,undefined);
              const version = versions.find(row => row.id === snap.id); assert.ok(version);
              assert.equal(snap.updateTime!.seconds,version.seconds,"PRIVATE_VERSION_CHANGED"); assert.equal(snap.updateTime!.nanoseconds,version.nanoseconds,"PRIVATE_VERSION_CHANGED");
            }
            return snap;
          },
          set(ref: DocumentReference, dto: Parameters<typeof serializeCatalogReferencePublic>[0]) {
            assert.equal(ref.path,publicPath); assert.ok(absentPublicRead,"CONCURRENT_PUBLIC_PROJECTION_CANNOT_REPLACE");
            assert.equal(sensitiveFieldCount(dto),0); assert.equal(fingerprintCatalogReference(dto),entry.expectedFingerprint);
            transaction.set(ref,dto); return facade;
          },
        };
        return callback(facade);
      });
    },
  } as unknown as Pick<Firestore,"doc"|"runTransaction">;
  return publishCatalogReference(store,entry.referenciaId,entry.expectedFingerprint);
}
export async function executeC5B2Plan(db: Firestore, plan: C5B2Plan, versions: readonly PrivateVersion[], record: (result: PublishResult) => void, before: (entry: PlanEntry) => void = () => {}) {
  validateC5B2Plan(plan,plan.planIdentity);
  for (const entry of [...plan.entries].sort((a,b) => a.referenciaId.localeCompare(b.referenciaId))) {
    before(entry);
    const result = await publishApprovedC5B2Reference(db,entry,versions);
    record(result);
    assert.equal(result.status,"PUBLISHED","UNEXPECTED_ALREADY_CURRENT_STOP");
  }
}
export async function verifyC5B2PostApply(db: Firestore, plan: C5B2Plan, versions: readonly PrivateVersion[]) {
  const first = await captureC5B2Inventory(db), second = await captureC5B2Inventory(db);
  assert.deepEqual(first.inventory.summary,second.inventory.summary); assert.deepEqual(first.versions,second.versions);
  assert.deepEqual(second.versions,versions,"PRIVATE_PRODUCTS_CHANGED");
  assert.equal(second.privateSnapshot.size,7); assert.equal(second.publicSnapshot.size,6);
  assertApprovedIds(second.publicSnapshot.docs.map(doc => doc.id));
  assert.deepEqual(second.inventory.summary.counts,{ READY_NEW:0, READY_UPDATE:0, ALREADY_CURRENT:6, NOT_ELIGIBLE:1, INVALID_PRIVATE:0, PUBLIC_ORPHAN:0, PUBLIC_MALFORMED:0, IDENTITY_CONFLICT:0, REVIEW_REQUIRED:0 });
  assert.deepEqual(second.inventory.summary.publicParity,{current:6,outdated:0,invalid:0});
  for (const doc of second.publicSnapshot.docs) {
    const dto = parsePublicCatalogReference(doc.id,doc.data()); assert.ok(dto); assert.equal(sensitiveFieldCount(doc.data()),0);
    const entry = plan.entries.find(row => row.referenciaId === doc.id)!;
    assert.equal(fingerprintCatalogReference(dto),entry.expectedFingerprint); assert.ok(isCurrentCatalogProjection(doc.data(),dto));
    assert.deepEqual(dto.planesPublicados,entry.planesPublicados); assert.ok(dto.imagenUrls.length<=4);
  }
  const api = await readPublicCatalog(db); assertApprovedIds(api.map(dto => dto.referenciaId)); assert.equal(sensitiveFieldCount(api),0);
  return { postInventoryRuns:2,postInventoryStable:true,counts:second.inventory.summary.counts,publicParity:second.inventory.summary.publicParity,publicDocumentCount:6,privateProductsMutated:0,postApplySensitiveFieldLeaks:0,publicApiReferenceCount:api.length,publicApiSensitiveFieldLeaks:0,excludedReferencePublished:false };
}
