import { contractValueHash } from './contractIntegrityV2';
import { LabError, labCommand } from './operationsLabPolicy';
import { labRepository, type LabTransaction, type LabExecutionContext } from './operationsLabContext';

export interface LabNumberReservation {
  policy: 'OPERATIONS_LAB_NUMBER_V1';
  number: string;
  snapshotHash: string;
  operationId: string;
}
/** Low-level numbering adapter, not a freeze command or snapshot validator.
 * Not exposed by any route. The freeze adapter must validate READY, credit,
 * conformity and origin before incorporating this reservation into its commit.
 * The owner/session digest makes counters independent and numbers unambiguous,
 * including when two owners choose the same session UUID.
 * There is no reference, read, or fallback to a CH counter.
 */
export async function reserveLabNumber(context: LabExecutionContext, input: {
  commandId: string; operationId: string; snapshotHash: string;
}) {
  labCommand({ commandId: input.commandId });
  if (!/^op_[a-f0-9]{64}$/.test(input.operationId)) throw new LabError(400, 'LAB_OPERATION_INVALID');
  const snapshotHash = input.snapshotHash;
  if (!/^[a-f0-9]{64}$/.test(snapshotHash)) throw new LabError(400, 'LAB_HASH_INVALID');
  const digest = contractValueHash({ action: 'RESERVE_LAB_NUMBER', ...input, ownerUid: context.ownerUid, sessionId: context.sessionId });
  return labRepository(context).transaction(async tx => {
    const [prior, snapshot] = await Promise.all([
      tx.read('commands', input.commandId), tx.read('numberReservations', input.operationId),
    ]);
    if (prior) {
      if (prior.digest !== digest || !snapshot || snapshot.snapshotHash !== snapshotHash || contractValueHash(prior.result) !== contractValueHash(snapshot.reservation)) throw new LabError(409, 'LAB_COMMAND_CONFLICT');
      return prior.result as LabNumberReservation;
    }
    if (snapshot) throw new LabError(409, 'LAB_NUMBER_ALREADY_RESERVED');
    const allocation = await prepareLabNumber(context, tx, input.operationId, snapshotHash);
    const result = allocation.reservation, at = new Date().toISOString();
    allocation.commit();
    tx.create('commands', input.commandId, { digest, result, actor: context.ownerUid, at });
    tx.create('events', input.commandId, { action: 'LAB_NUMBER_RESERVED', result, actor: context.ownerUid, at });
    return result;
  });
}

/** Read before other transactional writes; commit only after every domain check passes. */
export async function prepareLabNumber(context: LabExecutionContext, tx: LabTransaction, operationId: string, snapshotHash: string) {
  labRepository(context); // Require an authentic server capability.
  if (!/^op_[a-f0-9]{64}$/.test(operationId) || !/^[a-f0-9]{64}$/.test(snapshotHash)) throw new LabError(400, 'LAB_NUMBER_INPUT_INVALID');
  const [counter, existing] = await Promise.all([tx.read('contracts', 'numbering'), tx.read('numberReservations', operationId)]);
  if (existing) throw new LabError(409, 'LAB_NUMBER_ALREADY_RESERVED');
  const previous = counter?.lastSequence ?? 0;
  if (!Number.isSafeInteger(previous) || previous < 0 || previous >= Number.MAX_SAFE_INTEGER) throw new LabError(409, 'LAB_NUMBERING_INVALID');
  const sequence = previous + 1;
  const reservation: LabNumberReservation = {
    policy: 'OPERATIONS_LAB_NUMBER_V1', number: `TEST-${contractValueHash({ ownerUid: context.ownerUid, sessionId: context.sessionId })}-${String(sequence).padStart(6, '0')}`,
    snapshotHash, operationId,
  };
  return { reservation, commit() {
    tx.create('numberReservations', operationId, { snapshotHash, reservation, at: new Date().toISOString() });
    tx.replace('contracts', 'numbering', { lastSequence: sequence });
  } };
}
