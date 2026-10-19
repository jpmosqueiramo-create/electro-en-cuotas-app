// Node-only technical harness. NOT a Server Action and NOT imported by any route/UI.
import { Firestore, type Transaction } from 'firebase-admin/firestore';
import { PERSONAL_ADDRESS_VERSION, provinceLabel } from './contractAddress';
import { opaque } from './contractV2';
import { canonicalizeContract, contractValueHash, infrastructureReject as fail } from './contractIntegrityV2';
import { CONTRACT_NUMBERING_POLICY, contractIdentity, contractOriginId, contractSnapshotId, contractNumber, validateSequence, validateContractSnapshotSource, validateContractLegalContext, validateContractSnapshot, sealContractSnapshot, type ContractIdentityV2, type ContractSnapshotV2, type ContractSnapshotSourceV2, type ContractLegalContextV2 } from './contractSnapshotV2';

export const CONTRACT_INFRASTRUCTURE_PATHS = {
  fixtures: 'contractInfrastructureFixturesV2', counter: 'contractNumberingV2/CONTRACT_NUMBERING_V1',
  numbers: 'contractNumbersV2', snapshots: 'contractSnapshotsV2', origins: 'contractOriginsV2',
  evidence: 'contractOriginEvidenceV2', commands: 'contractInfrastructureCommandsV2', events: 'contractInfrastructureEventsV2',
} as const;
export interface EmulatorContractFixtureV1 {
  schemaVersion: 'EMULATOR_CONTRACT_FIXTURE_V1'; executionMode: 'EMULATOR_ONLY';
  state: 'EDITABLE' | 'CONSUMED'; revision: number;
  source: ContractSnapshotSourceV2; legalContext: ContractLegalContextV2;
}
interface FreezeCommand {
  action: 'FREEZE_EMULATOR_FIXTURE'; commandId: string; contractId: string; expectedRevision: number;
}
export interface ContractInfrastructureReceipt {
  contractId: string; snapshotId: string; contractNumber: string; snapshotHash: string;
}
/** Every write/read entry checks this again. There is no production enable flag.
 * The client is owned here and pinned to a literal demo project and local host.
 * Passing a production Firestore client or overriding the endpoint is impossible.
 */
export function assertContractInfrastructureEmulator(env: Readonly<Record<string,string|undefined>> = process.env): void {
  if (env.FIREBASE_CONFIG) {
    try { if (JSON.parse(env.FIREBASE_CONFIG).projectId !== 'demo-cuenta-hogar') fail('PRODUCTIVE_CONTRACT_FREEZE_DISABLED'); } catch { fail('PRODUCTIVE_CONTRACT_FREEZE_DISABLED'); }
  }
  if (typeof window !== 'undefined' || env.NODE_ENV === 'production' || env.K_SERVICE || env.GAE_ENV ||
      env.GCLOUD_PROJECT !== 'demo-cuenta-hogar' || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'demo-cuenta-hogar' ||
      (env.GOOGLE_CLOUD_PROJECT && env.GOOGLE_CLOUD_PROJECT !== 'demo-cuenta-hogar') ||
      env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' || env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' ||
      env.GOOGLE_APPLICATION_CREDENTIALS || env.FIREBASE_CLIENT_EMAIL || env.FIREBASE_PRIVATE_KEY ||
      env.FIREBASE_SERVICE_ACCOUNT_KEY || env.FIREBASE_SERVICE_ACCOUNT_JSON) fail('PRODUCTIVE_CONTRACT_FREEZE_DISABLED');
}
function exactRecord(v: unknown, keys: string[]): Record<string, unknown> {
  canonicalizeContract(v);
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).length !== keys.length || keys.some(k => !Object.hasOwn(v,k))) fail();
  return v as Record<string, unknown>;
}
function parseCommand(input: unknown): FreezeCommand {
  const o = exactRecord(input,['action','commandId','contractId','expectedRevision']);
  if (o.action !== 'FREEZE_EMULATOR_FIXTURE') fail('IMMUTABLE_CONTRACT_OPERATION_REJECTED');
  opaque(o.commandId); opaque(o.contractId);
  if (!Number.isSafeInteger(o.expectedRevision) || Number(o.expectedRevision) < 1) fail();
  return o as unknown as FreezeCommand;
}
function validateFixture(value: unknown): asserts value is EmulatorContractFixtureV1 {
  const f = exactRecord(value,['schemaVersion','executionMode','state','revision','source','legalContext']);
  if (f.schemaVersion !== 'EMULATOR_CONTRACT_FIXTURE_V1' || f.executionMode !== 'EMULATOR_ONLY' || !['EDITABLE','CONSUMED'].includes(String(f.state)) || !Number.isSafeInteger(f.revision) || Number(f.revision) < 1) fail();
  validateContractSnapshotSource(f.source as ContractSnapshotSourceV2); validateContractLegalContext(f.legalContext);
}
function identityOf(f: EmulatorContractFixtureV1): ContractIdentityV2 {
  const d = f.source.draft;
  return { budgetId: d.budgetId, budgetVersion: d.budgetVersion, contractDraftId: d.contractDraftId, acceptedOptionId: d.acceptedOptionId };
}
export function createContractInfrastructureEmulator() {
  assertContractInfrastructureEmulator();
  const db = new Firestore({ projectId: 'demo-cuenta-hogar', host: '127.0.0.1:8080', ssl: false });
  const p = CONTRACT_INFRASTRUCTURE_PATHS;
  async function verifyReceipt(tx: Transaction, receipt: ContractInfrastructureReceipt): Promise<ContractInfrastructureReceipt> {
    const [snapshot, number] = await Promise.all([tx.get(db.collection(p.snapshots).doc(receipt.snapshotId)),tx.get(db.collection(p.numbers).doc(receipt.contractNumber))]);
    if (!snapshot.exists || !number.exists) fail('STOP_CONTRACT_REGISTRY_INTEGRITY');
    const s = snapshot.data(); validateContractSnapshot(s);
    const expected = { contractId: s.contractId, snapshotId: s.contractSnapshotId, contractNumber: s.contractNumber, snapshotHash: s.integrity.payloadHash };
    if (number.data()!.policyId !== CONTRACT_NUMBERING_POLICY || number.data()!.sequence !== s.numbering.sequence) fail('STOP_CONTRACT_REGISTRY_INTEGRITY');
    const [origin, evidence] = await Promise.all([tx.get(db.collection(p.origins).doc(contractOriginId({budgetId:s.sourceDraft.budgetId,budgetVersion:s.sourceDraft.budgetVersion,contractDraftId:s.sourceDraft.contractDraftId,acceptedOptionId:s.sourceDraft.acceptedOptionId}))), tx.get(db.collection(p.evidence).doc(s.contractId))]);
    if (!origin.exists || !evidence.exists || origin.data()!.sourceDigest !== s.freeze.provenanceManifestHash || evidence.data()!.sourceDigest !== s.freeze.provenanceManifestHash || contractValueHash({source:evidence.data()!.source,legalContext:evidence.data()!.legalContext}) !== s.freeze.provenanceManifestHash || contractValueHash(origin.data()!.receipt) !== contractValueHash(expected)) fail('STOP_CONTRACT_REGISTRY_INTEGRITY');
    if (contractValueHash(receipt) !== contractValueHash(expected) || contractValueHash(number.data()!.receipt) !== contractValueHash(expected)) fail('STOP_CONTRACT_REGISTRY_INTEGRITY');
    return expected;
  }
  return {
    async execute(input: unknown, actor: string): Promise<ContractInfrastructureReceipt> {
      assertContractInfrastructureEmulator(); const c = parseCommand(input); opaque(actor);
      const dg = contractValueHash({ actor, command: c }), cmd = db.collection(p.commands).doc(c.commandId);
      return db.runTransaction(async tx => {
        assertContractInfrastructureEmulator();
        const prior = await tx.get(cmd);
        if (prior.exists) {
          if (prior.data()!.digest !== dg) fail('CONTRACT_COMMAND_CONFLICT');
          return verifyReceipt(tx, prior.data()!.receipt as ContractInfrastructureReceipt);
        }
        const fixtureRef = db.collection(p.fixtures).doc(c.contractId), fixtureSnap = await tx.get(fixtureRef);
        if (!fixtureSnap.exists) fail('EMULATOR_CONTRACT_FIXTURE_REQUIRED');
        const f = fixtureSnap.data(); validateFixture(f);
        const identity = identityOf(f), id = contractIdentity(identity), sid = contractSnapshotId(identity);
        if (id !== c.contractId) fail('CONTRACT_IDENTITY_MISMATCH');
        const sourceDigest = contractValueHash({ source: f.source, legalContext: f.legalContext });
        const originRef = db.collection(p.origins).doc(contractOriginId(identity)), origin = await tx.get(originRef);
        if (origin.exists) {
          if (origin.data()!.sourceDigest !== sourceDigest || origin.data()!.expectedRevision !== c.expectedRevision || origin.data()!.receipt.contractId !== id || f.state !== 'CONSUMED' || f.revision !== c.expectedRevision + 1) fail('CONTRACT_ALREADY_FROZEN_CONFLICT');
          const receipt = await verifyReceipt(tx, origin.data()!.receipt as ContractInfrastructureReceipt);
          tx.create(cmd,{ digest: dg, receipt, actor, action: c.action, replayOfExistingSnapshot: true });
          return receipt;
        }
        if (f.state !== 'EDITABLE' || f.revision !== c.expectedRevision || f.source.draft.revision !== c.expectedRevision) fail('CONTRACT_REVISION_CONFLICT');
        const counterRef = db.doc(p.counter), counter = await tx.get(counterRef);
        if (!counter.exists) fail('CONTRACT_COUNTER_MISSING');
        const counterData = exactRecord(counter.data(),['schemaVersion','policyId','executionMode','active','lastAllocatedSequence']);
        if (counterData.schemaVersion !== 'CONTRACT_NUMBER_COUNTER_V1' || counterData.policyId !== CONTRACT_NUMBERING_POLICY || counterData.executionMode !== 'EMULATOR_ONLY' || counterData.active !== true) fail('CONTRACT_COUNTER_INACTIVE');
        validateSequence(counterData.lastAllocatedSequence, true);
        const sequence = (BigInt(counterData.lastAllocatedSequence) + BigInt(1)).toString(), number = contractNumber(sequence);
        const snapshotRef = db.collection(p.snapshots).doc(sid), numberRef = db.collection(p.numbers).doc(number), evidenceRef = db.collection(p.evidence).doc(id), eventRef = db.collection(p.events).doc(c.commandId);
        const reserved = await Promise.all([tx.get(snapshotRef),tx.get(numberRef),tx.get(evidenceRef),tx.get(eventRef)]);
        if (reserved.some(x => x.exists)) fail('STOP_CONTRACT_NUMBER_OR_SNAPSHOT_COLLISION');
        const { budget: b, acceptance: a, draft: d } = f.source;
        const now = new Date().toISOString();
        const snapshot = sealContractSnapshot({
          schemaVersion: 'CONTRACT_SNAPSHOT_V2', currency: 'ARS', contractId: id, contractSnapshotId: sid, snapshotVersion: 1,
          contractNumber: number, numbering: { policyId: CONTRACT_NUMBERING_POLICY, sequence },
          sourceDraft: { ...identity, revision: d.revision, readyDigest: sourceDigest },
          origin: { sourceCollection: a.sourceCollection, solicitudId: a.solicitudId, acceptedAt: a.acceptedAt, acceptedBy: a.acceptedBy, budgetHash: contractValueHash(b), acceptanceHash: contractValueHash(a), draftHash: contractValueHash(d), preferredPlanCuotas: a.preferredPlanCuotas, preferredPlanAmountSnapshot: a.preferredPlanAmountSnapshot },
          acceptedReference: d.acceptedReferenceSnapshot,
          personalDataVersion: PERSONAL_ADDRESS_VERSION, personalData: d.personalData as Required<typeof d.personalData>,
          addressInterpretation: { jurisdictionCatalogVersion: PERSONAL_ADDRESS_VERSION, provinceDisplayName: provinceLabel(d.personalData.province!), postalPolicyVersion: 'AR_POSTAL_STRUCTURE_V1' },
          employmentData: d.employmentData, economicTerms: d.economicTerms!,
          calculationPolicyVersion: 'P5C_SHARED_C1_V1', roundingPolicy: 'NEXT_90_V1',
          paymentSchedule: { calendarPolicyVersion: 'P5C_EXPLICIT_MONTH_CLAMP_V1', firstInstallmentDueDate: d.firstInstallmentDueDate!, preferredMonthlyDueDay: d.preferredMonthlyDueDay!, installments: d.paymentScheduleDraft },
          ...f.legalContext,
          freeze: { state: 'TERMS_FROZEN', preparedAt: d.preparedAt, readyAt: d.updatedAt, readyBy: d.updatedBy, termsFrozenAt: now, termsFrozenBy: actor, commandId: c.commandId, readinessPolicyVersion: 'EMULATOR_FIXTURE_ONLY_V1', provenanceManifestHash: sourceDigest },
        });
        const receipt: ContractInfrastructureReceipt = { contractId: id, snapshotId: sid, contractNumber: number, snapshotHash: snapshot.integrity.payloadHash };
        // Every allocation write belongs to this single commit. No Storage/external side effects.
        tx.create(snapshotRef,snapshot);
        tx.create(numberRef,{ policyId: CONTRACT_NUMBERING_POLICY, sequence, receipt, allocatedAt: now });
        tx.create(evidenceRef,{ source: f.source, legalContext: f.legalContext, sourceDigest });
        tx.create(originRef,{ sourceDigest, expectedRevision: c.expectedRevision, receipt });
        tx.create(cmd,{ digest: dg, receipt, actor, action: c.action, replayOfExistingSnapshot: false });
        tx.create(eventRef,{ type: 'EMULATOR_TERMS_FROZEN', actor, at: now, receipt, sourceDigest });
        tx.update(fixtureRef,{ state: 'CONSUMED', revision: c.expectedRevision + 1 });
        tx.update(counterRef,{ lastAllocatedSequence: sequence });
        return receipt;
      });
    },
    async getSnapshot(snapshotId: string): Promise<ContractSnapshotV2 | null> {
      assertContractInfrastructureEmulator(); opaque(snapshotId);
      const snap = await db.collection(p.snapshots).doc(snapshotId).get(); if (!snap.exists) return null;
      const value = snap.data(); validateContractSnapshot(value); return value;
    },
    async close(): Promise<void> { await db.terminate(); },
  };
}
