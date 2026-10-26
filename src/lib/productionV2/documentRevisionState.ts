import type {Firestore,Transaction} from 'firebase-admin/firestore';
import {productionRef} from './authorization';
import {operationRef} from '../operationV2';
import {contractValueHash} from '../contractIntegrityV2';
import type {FreezeReceipt} from './freeze';
export interface DocumentRevisionState {
 schemaVersion:'PRODUCTION_DOCUMENT_REVISION_V1';status:'EDITING'|'FROZEN';snapshotVersion:number;
 allocationReceipt:FreezeReceipt;previousReceipt:FreezeReceipt;receipt:FreezeReceipt|null;commandId:string;hash:string;
}
export const revisionStateRef=(db:Firestore,id:string,v:number)=>productionRef(db,id,v).collection('documentRevision').doc('current');
export const editionRef=(db:Firestore,id:string,v:number,edition:number)=>productionRef(db,id,v).collection('documentEditions').doc(String(edition));
export const issuedManifestRef=(db:Firestore,id:string,v:number,edition:number)=>edition===1?productionRef(db,id,v).collection('documents').doc('issued'):editionRef(db,id,v,edition).collection('documents').doc('issued');
export async function revisionState(db:Firestore,tx:Transaction,id:string,v:number){
 const saved=await tx.get(revisionStateRef(db,id,v));if(!saved.exists)return null;const data=saved.data() as DocumentRevisionState;const {hash,...payload}=data;
 const command=(await tx.get(productionRef(db,id,v).collection('revisionCommands').doc(data.commandId))).data();
 if(!command||command.schemaVersion!=='PRODUCTION_DOCUMENT_REOPEN_COMMAND_V1'||!command.actor||!command.reason||command.result?.hash!==contractValueHash((({hash:_,...body})=>{void _;return body;})(command.result))||['snapshotVersion','allocationReceipt','previousReceipt','commandId'].some(k=>contractValueHash(command.result[k])!==contractValueHash(data[k as keyof DocumentRevisionState])))throw Error('DOCUMENT_REVISION_COMMAND_INTEGRITY');
 if(data.schemaVersion!=='PRODUCTION_DOCUMENT_REVISION_V1'||!['EDITING','FROZEN'].includes(data.status)||!Number.isSafeInteger(data.snapshotVersion)||data.snapshotVersion<2||hash!==contractValueHash(payload))throw Error('DOCUMENT_REVISION_INTEGRITY');
 return data;
}
/** A signed upload already counts as activity, even before an administrator verifies it. */
export async function assertBeforeSignature(db:Firestore,tx:Transaction,id:string,v:number,operationId:string){
 const root=operationRef(db,id,v).parent,delivery=root.doc('delivery');
 const [d,finance,photos]=await Promise.all([tx.get(delivery),tx.get(root.doc('financial')),tx.get(delivery.collection('photos').where('slot','in',['MANDATE_SIGNED','PAGARE_SIGNED','REMITO_SIGNED','DELIVERY_RECEIPT']).limit(1))]);const data=d.data();
 if(finance.exists||data&&(data.status==='DELIVERED'||data.event||data.originals||data.originalsTransfer||data.externalReceipt||Object.values(data.documents??{}).some((x:unknown)=>!!(x as {signature?:unknown})?.signature)))throw Error('DOCUMENT_CORRECTION_REQUIRES_AUDITED_POST_SIGNATURE_FLOW');
 if(photos.docs.some(p=>/_SIGNED$/.test(p.data().slot)||p.data().slot==='DELIVERY_RECEIPT'))throw Error('DOCUMENT_CORRECTION_REQUIRES_AUDITED_POST_SIGNATURE_FLOW');
 for(const collection of ['ledger_operaciones','ledger_movimientos','ledger_imputaciones','pagos_informados'])if(!(await tx.get(db.collection(collection).where('operationId','==',operationId).limit(1))).empty)throw Error('DOCUMENT_FINANCIAL_ACTIVITY_PREVENTS_REPLACEMENT');
 return d;
}
