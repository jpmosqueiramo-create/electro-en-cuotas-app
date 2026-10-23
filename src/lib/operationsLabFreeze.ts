import { createHash } from 'node:crypto';
import type { BudgetV2 } from './budgetV2';
import type { BudgetAcceptanceV2 } from './budgetAcceptanceV2';
import { completeness, stable, type ContractDraftV2 } from './contractV2';
import { clientTermsDigest } from './contractV2Server';
import { contractValueHash } from './contractIntegrityV2';
import { verifyReadyEvidence, type ContractReadyEvidenceV1 } from './contractReadyV2';
import { operationFromAcceptance } from './operationV2';
import { CREDIT_POLICY, creditPrerequisites, requiredDocuments, type CreditReview, type ClientDocumentProfile } from './creditReviewV2';
import { labRepository, type LabTransaction, type LabExecutionContext } from './operationsLabContext';
import { prepareLabNumber } from './operationsLabNumbering';
import { LabError, labCommand, LAB_WATERMARK } from './operationsLabPolicy';

export interface LabReadySource {
  budget: BudgetV2; acceptance: BudgetAcceptanceV2; draft: ContractDraftV2;
  readyEvidence: ContractReadyEvidenceV1;
  reviewCommand: Record<string, unknown>; reviewEvent: Record<string, unknown>;
  conformity: { confirmedDigest: string; confirmedAt: string; confirmedBy: string };
  credit: CreditReview; profile: ClientDocumentProfile;
}
/** Same technical source validators as the existing freeze adapter. No legal approval is inferred. */
export function validateLabReadySource(source: LabReadySource, operationId: string) {
  const { budget: b, acceptance: a, draft: d, readyEvidence: e, reviewCommand: cmd, reviewEvent: ev } = source;
  verifyReadyEvidence(b, a, d, e);
  if (operationFromAcceptance(a).operationId !== operationId || d.activeClientDataRequestId !== null) throw new LabError(409, 'LAB_ORIGIN_INVALID');
  const expectedDigest = createHash('sha256').update(stable({ actor: e.reviewedBy, input: { action: 'MARK_READY_TO_FORMALIZE', commandId: e.commandId, expectedRevision: e.draftRevision - 1 } })).digest('hex');
  if (cmd.action !== 'MARK_READY_TO_FORMALIZE' || cmd.digest !== expectedDigest || cmd.by !== e.reviewedBy || cmd.createdAt !== e.reviewedAt || contractValueHash(cmd.result) !== contractValueHash(d) || ev.action !== 'MARK_READY_TO_FORMALIZE' || ev.from !== 'DRAFT' || ev.to !== 'READY_TO_FORMALIZE' || ev.by !== e.reviewedBy || ev.at !== e.reviewedAt || ev.afterRevision !== e.draftRevision || ev.beforeRevision !== e.draftRevision - 1 || ev.readyEvidenceId !== e.commandId) throw new LabError(409, 'LAB_READY_PROVENANCE_INVALID');
  if (source.conformity?.confirmedDigest !== clientTermsDigest(d) || !source.conformity.confirmedAt || !source.conformity.confirmedBy) throw new LabError(409, 'LAB_CONFORMITY_REQUIRED');
  const profile = source.profile, credit = source.credit;
  if(d.personalData.fullName!==b.clienteSnapshot.nombre||d.personalData.dni!==b.clienteSnapshot.dni||requiredDocuments.some(type=>profile?.documents[type]?.sourceBudgetId!==b.id||profile?.documents[type]?.sourceVersion!==b.version))throw new LabError(409,'LAB_IDENTITY_OR_DOCUMENT_ORIGIN_INVALID');
  const hash = (v: unknown) => createHash('sha256').update(stable(v)).digest('hex');
  const identity = hash({ dni: d.personalData.dni, fullName: d.personalData.fullName.trim().normalize('NFKC').toLocaleUpperCase('es-AR') });
  const ready = !!d.lastClientSubmissionAppliedAt && completeness(d).filter(x => x.startsWith('Datos personales')).length === 0;
  if (!profile || profile.identityHash !== identity || profile.originBudgetId !== b.id || profile.originVersion !== b.version || credit?.policy !== CREDIT_POLICY || credit.operationId !== operationId || credit.state !== 'APPROVED' || credit.draftDataHash !== hash({ personalData: d.personalData, employmentData: d.employmentData }) || credit.documentsHash !== hash(profile.documents) || creditPrerequisites(ready, profile.documents, new Date().toISOString()) !== 'IN_REVIEW') throw new LabError(409, 'LAB_CREDIT_APPROVAL_REQUIRED');
}

/** This schema is deliberately incompatible with production/Emulator CONTRACT_SNAPSHOT_V2. */
export interface LabSnapshot {
  schemaVersion: 'OPERATIONS_LAB_SNAPSHOT_V1'; mode: 'SYNTHETIC_ONLY';
  operationId: string; sessionId: string; ownerUid: string; revision: number;
  number: string; sourceHash: string; source: LabReadySource; watermark: typeof LAB_WATERMARK;
  hash: string;
}
export function validateLabSnapshot(context: LabExecutionContext, value: unknown): asserts value is LabSnapshot {
  labRepository(context);
  const s = value as LabSnapshot;
  if (!s || s.schemaVersion !== 'OPERATIONS_LAB_SNAPSHOT_V1' || s.mode !== 'SYNTHETIC_ONLY' || s.sessionId !== context.sessionId || s.ownerUid !== context.ownerUid || s.watermark !== LAB_WATERMARK || !s.number?.startsWith(`TEST-${contractValueHash({ ownerUid: context.ownerUid, sessionId: context.sessionId })}-`) || !/^TEST-[a-f0-9]{64}-[0-9]{6,}$/.test(s.number) || s.sourceHash !== contractValueHash(s.source) || s.revision !== s.source.draft.revision) throw new LabError(409, 'LAB_SNAPSHOT_INVALID');
  const { hash, ...payload } = s;
  if (hash !== contractValueHash(payload)) throw new LabError(409, 'LAB_SNAPSHOT_HASH_INVALID');
  verifyReadyEvidence(s.source.budget, s.source.acceptance, s.source.draft, s.source.readyEvidence);
  if (operationFromAcceptance(s.source.acceptance).operationId !== s.operationId) throw new LabError(409, 'LAB_SNAPSHOT_ORIGIN_INVALID');
}
export function validateLabNumberBinding(snapshot:LabSnapshot,record:FirebaseFirestore.DocumentData|null){
 const reservation=record?.reservation;
 if(!reservation||reservation.policy!=='OPERATIONS_LAB_NUMBER_V1'||reservation.number!==snapshot.number||reservation.operationId!==snapshot.operationId||reservation.snapshotHash!==snapshot.sourceHash||record!.snapshotHash!==snapshot.sourceHash)throw new LabError(409,'LAB_NUMBER_BINDING_INVALID');
}
export async function verifyLabReadyAudit(tx:LabTransaction,context:LabExecutionContext,source:LabReadySource){
 const [reviewReceipt,reviewAudit]=await Promise.all([tx.read('commands',source.readyEvidence.commandId),tx.read('events',source.readyEvidence.commandId)]);
 if(!reviewReceipt||!reviewAudit||reviewReceipt.action!=='READY'||reviewAudit.action!=='READY'||reviewReceipt.actor!==context.ownerUid||reviewAudit.actor!==context.ownerUid||reviewReceipt.at!==source.readyEvidence.reviewedAt||reviewAudit.at!==source.readyEvidence.reviewedAt||source.readyEvidence.reviewedBy!==context.ownerUid||contractValueHash(reviewReceipt.technicalReview??null)!==contractValueHash(source.reviewCommand)||contractValueHash(reviewReceipt.technicalEvent??null)!==contractValueHash(source.reviewEvent))throw new LabError(409,'LAB_READY_AUDIT_REQUIRED');
}
export async function freezeLabContract(context: LabExecutionContext, input: { commandId: string; operationId: string; expectedRevision: number; requestRevision?: number }) {
  labCommand({ commandId: input.commandId });
  const digest = contractValueHash({ action: 'FREEZE_LAB_CONTRACT', ...input, ownerUid: context.ownerUid, sessionId: context.sessionId });
  return labRepository(context).transaction(async tx => {
    const [prior, stored, frozen] = await Promise.all([tx.read('commands', input.commandId), tx.read('contracts', input.operationId), tx.read('snapshots', input.operationId)]);
    if (prior) {
      if (prior.digest !== digest || !frozen) throw new LabError(409, 'LAB_COMMAND_CONFLICT');
      validateLabSnapshot(context, frozen.value);
      await verifyLabReadyAudit(tx,context,frozen.value.source);
      validateLabNumberBinding(frozen.value,await tx.read('numberReservations',input.operationId));
      if(!stored||stored.state!=='FROZEN_TEST'||stored.snapshotHash!==frozen.value.hash||contractValueHash(stored.source)!==frozen.value.sourceHash)throw new LabError(409,'LAB_FROZEN_SOURCE_INVALID');
      if (prior.snapshotHash !== frozen.value.hash) throw new LabError(409, 'LAB_COMMAND_CONFLICT');
      return frozen.value as LabSnapshot;
    }
    if (frozen) throw new LabError(409, 'LAB_ALREADY_FROZEN');
    if (!stored || stored.state !== 'READY' || stored.source?.draft?.revision !== input.expectedRevision) throw new LabError(409, 'LAB_READY_REQUIRED');
    const source = stored.source as LabReadySource;
    validateLabReadySource(source, input.operationId);
    await verifyLabReadyAudit(tx,context,source);
    const sourceHash = contractValueHash(source);
    const allocation = await prepareLabNumber(context, tx, input.operationId, sourceHash);
    const payload = { schemaVersion: 'OPERATIONS_LAB_SNAPSHOT_V1' as const, mode: 'SYNTHETIC_ONLY' as const, operationId: input.operationId, sessionId: context.sessionId, ownerUid: context.ownerUid, revision: input.expectedRevision, number: allocation.reservation.number, sourceHash, source, watermark: LAB_WATERMARK as typeof LAB_WATERMARK };
    const snapshot: LabSnapshot = { ...payload, hash: contractValueHash(payload) };
    validateLabSnapshot(context, snapshot);
    allocation.commit();
    tx.create('snapshots', input.operationId, { value: snapshot });
    tx.replace('contracts', input.operationId, { state: 'FROZEN_TEST', source, snapshotHash: snapshot.hash });
    const at = new Date().toISOString();
    tx.create('commands', input.commandId, { digest, snapshotHash: snapshot.hash, operationId:input.operationId,expectedRevision:input.expectedRevision,requestRevision:input.requestRevision??null,actor: context.ownerUid, at });
    tx.create('events', input.commandId, { action: 'FREEZE_LAB_CONTRACT', snapshotHash: snapshot.hash, number: snapshot.number, operationId:input.operationId,expectedRevision:input.expectedRevision,requestRevision:input.requestRevision??null,actor: context.ownerUid, at });
    return snapshot;
  });
}
