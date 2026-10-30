import type {Firestore,Transaction} from 'firebase-admin/firestore';
import type {ContractDraftV2} from '../contractV2';
import {opaque} from '../contractV2';
import {operationRef} from '../operationV2';
import {proposalDigest} from '../clientProposalServer';
/** Capture existing operational data in the issuance transaction, never from public input. */
export async function loopAnnexFields(db:Firestore,tx:Transaction,id:string,v:number,operationId:string,draft:ContractDraftV2,consent:FirebaseFirestore.DocumentData){
 const fulfillment=(await tx.get(operationRef(db,id,v).parent.doc('fulfillment'))).data();
 let serial='';
 if(fulfillment){
  if(fulfillment.schemaVersion!=='OPERATION_FULFILLMENT_V2'||fulfillment.operationId!==operationId)throw Error('ANNEX_LOGISTICS_ORIGIN_MISMATCH');
  serial=fulfillment.productSerial??'';
  if(typeof serial!=='string'||serial.length>100||/[<>\x00-\x1f\x7f]/.test(serial))throw Error('ANNEX_SERIAL_INVALID');
 }
 let reference=`Presupuesto ${id} / versión ${v}`,pdfHash='';
 if(consent.proposalCommandId){
  const proposal=(await tx.get(db.collection('presupuestos_v2').doc(id).collection('contracts').doc(`v${v}`).collection('clientProposals').doc(opaque(consent.proposalCommandId)))).data();
  if(!proposal||proposal.schemaVersion!=='CLIENT_PROPOSAL_V1'||proposal.digest!==proposalDigest(draft)||typeof proposal.reference!=='string'||proposal.reference.length>250||/[<>\x00-\x1f]/.test(proposal.reference)||!/^[a-f0-9]{64}$/.test(proposal.pdfSha256))throw Error('ANNEX_ACCEPTED_PROPOSAL_MISMATCH');
  reference=proposal.reference;pdfHash=proposal.pdfSha256;
 }
 return {loopAnnexFieldsVersion:'LOOP_ANNEX_FIELDS_V1',loopProductSerial:serial.trim(),loopAcceptedProposalReference:reference,loopAcceptedProposalPdfHash:pdfHash};
}
