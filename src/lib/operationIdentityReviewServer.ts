import { createHash } from 'node:crypto';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import type { BudgetV2 } from './budgetV2';
import type { ContractDraftV2, ClientDataSubmissionV2 } from './contractV2';
import { stable } from './contractV2';
import type { CreditReview, ClientDocumentProfile } from './creditReviewV2';
import { mapSolicitudToAdminReadModel, mapSolicitudCuentaToAdminReadModel } from './adminSolicitudesReadModel';
import { reviewOperationIdentity, type IdentityEntry } from './operationIdentityReview';
export async function readOperationIdentity(db: Firestore, tx: Transaction, id: string, v: number) {
  const family = db.collection('presupuestos_v2').doc(id), draftRef = family.collection('contracts').doc(`v${v}`);
  const [b, d, c, submissions] = await Promise.all([tx.get(family.collection('versions').doc(String(v))), tx.get(draftRef), tx.get(draftRef.collection('creditReview').doc('current')), tx.get(draftRef.collection('submissions').orderBy('submittedAt','desc').limit(1))]);
  if (!b.exists) throw Error('IDENTITY_ORIGIN_MISSING');
  const budget = b.data() as BudgetV2, draft = d.exists ? d.data() as ContractDraftV2 : null, review = c.exists ? c.data() as CreditReview : null;
  if (!['solicitudes','solicitudes_cuenta'].includes(budget.sourceCollection) || !budget.solicitudId || budget.solicitudId.includes('/')) throw Error('IDENTITY_ORIGIN_INVALID');
  const original = await tx.get(db.collection(budget.sourceCollection).doc(budget.solicitudId));
  const entries: IdentityEntry[] = [];
  if (original.exists) {
    const map = budget.sourceCollection === 'solicitudes' ? mapSolicitudToAdminReadModel : mapSolicitudCuentaToAdminReadModel;
    const source = map(original.id, original.data()!);
    entries.push({ source: 'REQUEST', name: source.nombreCliente ?? '', dni: source.dni ?? '' });
  }
  entries.push({ source: 'BUDGET', name: budget.clienteSnapshot.nombre, dni: budget.clienteSnapshot.dni });
  // Acceptance holds the option, not a separate customer identity; the issued budget is its immutable customer source.
  const latest = submissions.docs.map(s => s.data() as ClientDataSubmissionV2).sort((a,b) => b.submittedAt.localeCompare(a.submittedAt))[0];
  if (latest) entries.push({ source: 'SUBMISSION', name: latest.personalData.fullName, dni: latest.personalData.dni, applied: latest.submissionId === draft?.lastClientSubmissionId });
  if (draft) entries.push({ source: 'DRAFT', name: draft.personalData.fullName, dni: draft.personalData.dni });
  let verifiedCurrent = false;
  const hasProfile = Boolean(review?.profileOrigin);
  if (review?.profileOrigin && draft) {
    const p = await tx.get(db.collection('presupuestos_v2').doc(review.profileOrigin.budgetId).collection('contracts').doc(`v${review.profileOrigin.version}`).collection('clientProfiles').doc('verified'));
    if (p.exists) {
      const profile = p.data() as ClientDocumentProfile;
      const identityHash = createHash('sha256').update(stable({ dni: draft.personalData.dni, fullName: draft.personalData.fullName.trim().normalize('NFKC').toLocaleUpperCase('es-AR') })).digest('hex');
      verifiedCurrent = profile.schemaVersion === 'CLIENT_DOCUMENT_PROFILE_V2' && profile.identityHash === identityHash;
    }
  }
  return reviewOperationIdentity(entries, verifiedCurrent, !original.exists, hasProfile && !verifiedCurrent);
}
