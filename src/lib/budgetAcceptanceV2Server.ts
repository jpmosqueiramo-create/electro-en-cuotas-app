import { operationFromAcceptance, operationRef } from './operationV2';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { validateBudgetV2 } from './budgetV2';
import { privateBudgetReferenceId } from './budgetV2Persistence';
import { buildAcceptance, createDocumentationCase, fail, identity, parseAcceptanceCommand, type BudgetAcceptanceV2, type BudgetDocumentationCaseV2 } from './budgetAcceptanceV2';

export function caseRefs(db: Firestore, budgetId: string, version: number) {
  identity(budgetId, version);
  const family = db.collection('presupuestos_v2').doc(budgetId);
  return { family, acceptance: family.collection('acceptances').doc(String(version)), documentation: family.collection('documentation').doc(String(version)) };
}
export async function loadDocumentation(db: Firestore, budgetId: string, version: number, tx?: Transaction) {
  const refs = caseRefs(db, budgetId, version);
  const [a, d] = await Promise.all([tx ? tx.get(refs.acceptance) : refs.acceptance.get(), tx ? tx.get(refs.documentation) : refs.documentation.get()]);
  if (!a.exists || !d.exists) fail('Primero registrá la aceptación de esta versión.');
  const acceptance = a.data() as BudgetAcceptanceV2, documentation = d.data() as BudgetDocumentationCaseV2;
  if (acceptance.schemaVersion !== 'BUDGET_ACCEPTANCE_V2' || documentation.schemaVersion !== 'BUDGET_DOCUMENTATION_CASE_V2' || acceptance.budgetId !== budgetId || documentation.budgetId !== budgetId || acceptance.budgetVersion !== version || documentation.budgetVersion !== version || acceptance.acceptedOptionId !== documentation.acceptedOptionId || documentation.workflowStage !== 'DOCUMENTACION') fail('Expediente inconsistente.');
  return { acceptance, documentation };
}
export async function acceptBudgetV2(db: Firestore, input: unknown, actor: string) {
  const c = parseAcceptanceCommand(input), refs = caseRefs(db, c.budgetId, c.version);
  const commandRef = refs.family.collection('acceptanceCommands').doc(c.commandId);
  const digest = createHash('sha256').update(JSON.stringify(c)).digest('hex');
  return db.runTransaction(async tx => {
    if ((await tx.get(db.collection('budgetDeletionAuditV2').doc(c.budgetId))).exists) fail('El presupuesto fue eliminado.');
    await tx.get(refs.family); // Serialize acceptance against whole-family deletion, including historical parentless fixtures.
    const [budgetSnap, old, command, doc] = await Promise.all([tx.get(refs.family.collection('versions').doc(String(c.version))), tx.get(refs.acceptance), tx.get(commandRef), tx.get(refs.documentation)]);
    if (!budgetSnap.exists) fail('La versión no existe.');
    const budget = budgetSnap.data(); validateBudgetV2(budget, privateBudgetReferenceId);
    const candidate = buildAcceptance(budget, c, actor, new Date().toISOString());
    if (command.exists) {
      if (command.data()!.digest !== digest || !old.exists || !doc.exists) fail('Conflicto de commandId.');
      return old.data() as BudgetAcceptanceV2;
    }
    if (old.exists || doc.exists) fail('La aceptación ya fue registrada. No puede reemplazarse.');
    {const review=refs.family.collection('contracts').doc(`v${c.version}`).collection('creditReview').doc('current');tx.create(review,{policy:'MANUAL_CREDIT_REVIEW_V1',operationId:operationFromAcceptance(candidate).operationId,revision:0,state:'PENDING_DATA',profileOrigin:null,resolution:'',notes:'',reviewedBy:actor,reviewedAt:candidate.acceptedAt,draftDataHash:null,documentsHash:null});}
    tx.create(operationRef(db, c.budgetId, c.version), operationFromAcceptance(candidate));
    tx.create(refs.acceptance, candidate); tx.create(refs.documentation, createDocumentationCase(candidate));
    tx.create(commandRef, { digest, version: c.version, createdAt: candidate.acceptedAt, by: actor });
    return candidate;
  });
}
