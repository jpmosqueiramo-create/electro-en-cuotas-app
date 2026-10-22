import type { Firestore } from 'firebase-admin/firestore';
import type { BudgetV2 } from '../budgetV2';
import type { BudgetAcceptanceV2 } from '../budgetAcceptanceV2';
import { opaque,type ContractDraftV2 } from '../contractV2';
import { contractRefs,clientTermsDigest } from '../contractV2Server';
import { readOperationIdentity } from '../operationIdentityReviewServer';
import { projectOperationDraft } from './operationDraft';
import { generateOperationDraftPair } from './operationDraftPdf';
export async function readOperationDraftDocuments(db:Firestore,id:string,v:number){
 opaque(id);if(!Number.isSafeInteger(v)||v<1)throw Error('INVALID_DOCUMENT_VERSION');
 const r=contractRefs(db,id,v);
 const p=await db.runTransaction(async tx=>{
  const [bs,as,ds,cs,identity]=await Promise.all([tx.get(r.budget),tx.get(r.acceptance),tx.get(r.draft),tx.get(r.draft.collection('conformity').doc('current')),readOperationIdentity(db,tx,id,v)]);
  if(!bs.exists||!as.exists||!ds.exists)throw Error('PERSISTED_DRAFT_REQUIRED');
  const d=ds.data() as ContractDraftV2;
  return projectOperationDraft(bs.data() as BudgetV2,as.data() as BudgetAcceptanceV2,d,identity.requiresClarification,cs.exists&&cs.data()!.confirmedDigest!==clientTermsDigest(d));
 });
 // PDF work outside the transaction. No Storage, writes, freeze or counter access.
 return p.canPreview?{...generateOperationDraftPair(p),available:true as const}:{projection:p,available:false as const};
}
