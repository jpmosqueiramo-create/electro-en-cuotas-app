import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { BudgetAcceptanceV2 } from './budgetAcceptanceV2';
import { opaque } from './contractV2';

/** Identity only. No customer data, economics or mutable workflow state is duplicated. */
export interface OperationV2 {
  schemaVersion: 'OPERATION_V2'; operationId: string;
  sourceCollection: 'solicitudes' | 'solicitudes_cuenta'; solicitudId: string;
  budgetId: string; budgetVersion: number; acceptedOptionId: string;
  contractDraftId: string; acceptedAt: string;
}
export function operationFromAcceptance(a: BudgetAcceptanceV2): OperationV2 {
  opaque(a.budgetId); opaque(a.solicitudId); opaque(a.acceptedOptionId);
  if (!Number.isSafeInteger(a.budgetVersion) || a.budgetVersion < 1 ||
    !['solicitudes', 'solicitudes_cuenta'].includes(a.sourceCollection)) throw Error('OPERATION_ORIGIN_INVALID');
  return { schemaVersion: 'OPERATION_V2', operationId: 'op_' + createHash('sha256')
    .update(JSON.stringify([a.budgetId, a.budgetVersion, a.acceptedOptionId])).digest('hex'),
    sourceCollection: a.sourceCollection, solicitudId: a.solicitudId, budgetId: a.budgetId,
    budgetVersion: a.budgetVersion, acceptedOptionId: a.acceptedOptionId,
    contractDraftId: `v${a.budgetVersion}`, acceptedAt: a.acceptedAt };
}
export function operationRef(db: Firestore, budgetId: string, version: number) {
  opaque(budgetId); if (!Number.isSafeInteger(version) || version < 1) throw Error('OPERATION_ORIGIN_INVALID');
  // Existing server-only contract subtree: no new permissive root or Rules needed.
  return db.collection('presupuestos_v2').doc(budgetId).collection('contracts').doc(`v${version}`)
    .collection('operation').doc('identity');
}
export function verifyOperation(value: unknown, expected: OperationV2): asserts value is OperationV2 {
  if (!value || typeof value !== 'object' || Object.keys(value).length !== Object.keys(expected).length ||
    Object.entries(expected).some(([key, v]) => (value as Record<string, unknown>)[key] !== v)) throw Error('OPERATION_IDENTITY_CONFLICT');
}
export interface OperationViewV2 {
  identity: OperationV2; registered: boolean;
  budgetState: string; contractState: string; documentationStage: string;
  pendingProcesses: readonly ['AFILIADO', 'CLIENTE', 'COBRANZA'];
}
