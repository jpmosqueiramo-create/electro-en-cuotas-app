import {createHash} from 'node:crypto';
import {FieldValue,type Firestore,type Transaction} from 'firebase-admin/firestore';
import type {OperationV2} from './operationV2';
type Assignment={affiliateId:string;uid:string}|null;
type Event={kind:'PAYMENT';paymentId:string;amountCents:number;effectiveDate:string;contractNumber:string}|{kind:'PROMISE';promisedDate:string;note:string};
/** Prepare reads first; the originating command writes the alert in its own transaction. */
export async function prepareAffiliateCollectionAlert(db:Firestore,tx:Transaction,input:{identity:OperationV2;assignment:Assignment;actor:string;commandId:string;clientName:string;event:Event}){
 const {identity,assignment,actor,event}=input;
 if(!assignment||assignment.uid!==actor)throw Error('ALERT_AFFILIATE_ASSIGNMENT_REQUIRED');
 const vendor=(await tx.get(db.collection('vendedores').doc(assignment.affiliateId))).data();
 if(vendor?.activo!==true||vendor.authUid!==actor)throw Error('ALERT_ACTIVE_AFFILIATE_REQUIRED');
 const sellerName=String(vendor.nombre||'Vendedor afiliado').slice(0,200),clientName=input.clientName.slice(0,200);
 const money=(cents:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(cents/100),date=(value:string)=>value.split('-').reverse().join('/');
 const message=event.kind==='PAYMENT'?`${sellerName} registró un cobro en efectivo de ${money(event.amountCents)} para ${clientName}. Fecha del pago: ${date(event.effectiveDate)}. El efectivo queda bajo su custodia, pendiente de rendición.`:`${sellerName} registró una promesa de pago de ${clientName} para el ${date(event.promisedDate)}. ${event.note.slice(0,400)}`;
 const id='affiliate_collection_'+createHash('sha256').update(JSON.stringify([identity.operationId,event.kind,input.commandId])).digest('hex');
 const ref=db.collection('alertas_admin').doc(id);
 const payload={schemaVersion:'AFFILIATE_COLLECTION_ALERT_V1',tipo:event.kind==='PAYMENT'?'COBRO_EFECTIVO_AFILIADO':'PROMESA_PAGO_AFILIADO',mensaje:message,fechaCreacion:FieldValue.serverTimestamp(),leida:false,operationId:identity.operationId,budgetId:identity.budgetId,budgetVersion:identity.budgetVersion,sourceCollection:identity.sourceCollection,solicitudId:identity.solicitudId,affiliateId:assignment.affiliateId,affiliateName:sellerName,actorUid:actor,clientName,event};
 return ()=>tx.create(ref,payload);
}
