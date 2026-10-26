import {assertAdministrativeRecordActive} from '../adminRecordRemovalServer';
import type { Firestore } from 'firebase-admin/firestore';
import type { BudgetV2 } from '../budgetV2';
import type { BudgetAcceptanceV2 } from '../budgetAcceptanceV2';
import { opaque,type ContractDraftV2 } from '../contractV2';
import { contractRefs,clientConformityIsCurrent } from '../contractV2Server';
import { readOperationIdentity } from '../operationIdentityReviewServer';
import { projectOperationDraft } from './operationDraft';
import { renderContractPairReview } from '../productionV2/originalPdf';
import {ownerFinalTemplates,ownerFinalIssuer} from '../productionV2/ownerFinalDocuments';
import { paymentAddressHashOrNull } from '../contractPaymentAddress';
import { DocumentPreviewError } from './previewErrors';
export async function readOperationDraftDocuments(db:Firestore,id:string,v:number){
 opaque(id);if(!Number.isSafeInteger(v)||v<1)throw new DocumentPreviewError('DOCUMENT_ORIGIN_INCONSISTENT','READ','INVALID_VERSION');
 const r=contractRefs(db,id,v);
 const {projection:p,conformity}=await db.runTransaction(async tx=>{
  await assertAdministrativeRecordActive(db,tx,{kind:'CONTRACT',id,version:v});
  const [bs,as,ds,cs,identity]=await Promise.all([tx.get(r.budget),tx.get(r.acceptance),tx.get(r.draft),tx.get(r.draft.collection('conformity').doc('current')),readOperationIdentity(db,tx,id,v)]);
  if(!bs.exists||!as.exists||!ds.exists)throw new DocumentPreviewError('DOCUMENT_ORIGIN_INCONSISTENT','READ','MISSING_SOURCE');
  const d=ds.data() as ContractDraftV2;
  const conformity=cs.data(),addressHash=paymentAddressHashOrNull(d.personalData);
  const current=!!conformity&&clientConformityIsCurrent(d,conformity)&&addressHash!==null&&conformity.confirmedPaymentAddressHash===addressHash&&!!conformity.confirmedAt&&!!conformity.confirmedBy&&!!conformity.evidence;
  return {projection:projectOperationDraft(bs.data() as BudgetV2,as.data() as BudgetAcceptanceV2,d,identity.requiresClarification,!current,true),conformity};
 });
 // PDF work outside the transaction. No Storage, writes, freeze or counter access.
 const code=p.canPreview&&p.pending.some(x=>x.section==='conformity')?'DOCUMENT_CONFORMITY_PENDING' as const:!p.canPreview?(p.pending.some(x=>x.section==='identity')?'DOCUMENT_IDENTITY_REVIEW_REQUIRED' as const:'DOCUMENT_CONFORMITY_PENDING' as const):p.pending.some(x=>x.section==='data'||x.section==='employment'||x.section==='product'||x.section==='schedule'||(x.section==='terms'&&x.label==='Plan contractual confirmado pendiente'))?'DOCUMENT_DATA_PENDING' as const:null;
 if(!p.canPreview)return {projection:p,available:false as const,code};
 try{return {...renderContractPairReview(p,ownerFinalTemplates(),conformity,ownerFinalIssuer()),available:true as const,code};}
 catch{throw new DocumentPreviewError('DOCUMENT_RENDER_FAILED','RENDER','PDF_GENERATION_FAILED');}
}
