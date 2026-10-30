import {createHash} from 'node:crypto';
import type {Firestore} from 'firebase-admin/firestore';
import {exact,opaque,stable,newContractDraft,type ContractDraftV2} from './contractV2';
import type {BudgetV2} from './budgetV2';
import type {BudgetAcceptanceV2} from './budgetAcceptanceV2';
import {assertAdministrativeRecordActive} from './adminRecordRemovalServer';
import {clientProposal,clientProposalMessage} from './clientProposal';
import {renderClientProposal} from './clientProposalPdf';
export const proposalDigest=(d:ContractDraftV2)=>createHash('sha256').update(stable({proposal:clientProposal(d),identity:{dni:d.personalData.dni,email:d.personalData.email,whatsapp:d.personalData.whatsapp}})).digest('hex');
export async function prepareClientProposal(db:Firestore,id:string,version:number,input:unknown,actor:string){
 opaque(id);if(!Number.isSafeInteger(version)||version<1)throw Error('Versión inválida.');
 const b=exact(input,['commandId','expectedRevision']),cid=opaque(b.commandId),root=db.collection('presupuestos_v2').doc(id),draft=root.collection('contracts').doc('v'+version),receipt=draft.collection('clientProposals').doc(cid);
 return db.runTransaction(async tx=>{
  await assertAdministrativeRecordActive(db,tx,{kind:'CONTRACT',id,version});
  const [ds,bs,as,old]=await Promise.all([tx.get(draft),tx.get(root.collection('versions').doc(String(version))),tx.get(root.collection('acceptances').doc(String(version))),tx.get(receipt)]);
  if(!ds.exists||!bs.exists||!as.exists)throw Error('Primero prepará el contrato de la operación aceptada.');
  const d=ds.data() as ContractDraftV2;
  if(d.status!=='DRAFT'||d.revision!==b.expectedRevision)throw Error('Recargá y guardá el panel antes de preparar el mensaje.');
  const origin=newContractDraft(bs.data() as BudgetV2,as.data() as BudgetAcceptanceV2,actor,d.updatedAt);
  if(d.budgetId!==id||d.budgetVersion!==version||d.acceptedOptionId!==origin.acceptedOptionId||stable(d.acceptedReferenceSnapshot)!==stable(origin.acceptedReferenceSnapshot))throw Error('Origen inconsistente.');
  const projection=clientProposal(d),digest=proposalDigest(d);
  if(old.exists){const saved=old.data()!;if(saved.createdBy!==actor||saved.revision!==b.expectedRevision||saved.digest!==digest)throw Error('Conflicto de propuesta. Generá una nueva.');return {commandId:cid,reference:saved.reference,message:saved.message,pdfBase64:saved.pdfBase64};}
  const reference=`CH-PROP-${id}-V${version}-${digest.slice(0,16)}`,message=clientProposalMessage(projection,reference),pdf=renderClientProposal(projection,reference),pdfBase64=pdf.toString('base64');
  if(pdf.length>500000)throw Error('La propuesta supera el tamaño permitido.');
  tx.create(receipt,{schemaVersion:'CLIENT_PROPOSAL_V1',revision:d.revision,reference,digest,projection,message,pdfBase64,pdfSha256:createHash('sha256').update(pdf).digest('hex'),createdAt:new Date().toISOString(),createdBy:actor});
  return {commandId:cid,reference,message,pdfBase64};
 });
}
