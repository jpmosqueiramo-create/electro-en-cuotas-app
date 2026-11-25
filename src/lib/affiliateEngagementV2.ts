import {prepareAffiliateCollectionAlert} from './affiliateCollectionAlerts';
import {contractRefs} from './contractV2Server';
import { argentinaBusinessDate } from './productionV2/businessDate';
import type { Firestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { custodyLoad,custodyRef,type CustodyActor } from './operationCustodyV2Server';
import { opaque,stable,calendarDate } from './contractV2';
import { runFirestoreTransaction } from './firestoreTransaction';
import type { CollectionContact } from './collectionsFollowup';
export async function affiliateEngagement(db:Firestore,id:string,v:number,actor:CustodyActor,input?:unknown){return runFirestoreTransaction(db,async tx=>{
 const base=await custodyLoad(db,tx,id,v,actor),events=custodyRef(db,id,v).collection('engagements');
 if(input===undefined){
  const project=(d:{id:string;data:()=>Record<string,unknown>}):CollectionContact=>{const row=d.data();return {id:d.id,at:typeof row.at==='string'?row.at:null,recordedByMe:row.actor===actor.uid,kind:String(row.kind),note:String(row.note),promisedDate:typeof row.promisedDate==='string'?row.promisedDate:null,nextContactDate:typeof row.nextContactDate==='string'?row.nextContactDate:null};};
  const rows=await tx.get(events.orderBy('at','desc').limit(31)),records=rows.docs.slice(0,30).map(project);
  let latestPromise=records.find(r=>r.kind==='PROMISE')??null;
  // Older promises survive ordinary contacts. A single-field query needs no new index.
  if(!latestPromise&&rows.size>30){const promises=await tx.get(events.where('kind','==','PROMISE'));latestPromise=promises.docs.map(project).sort((a,b)=>(b.at??'').localeCompare(a.at??'')||b.id.localeCompare(a.id))[0]??null;}
  return {historyTruncated:rows.size>30,records,latestPromise};
 }
 if(!input||typeof input!=='object')throw Error('Gestión inválida.');const c=input as Record<string,unknown>;
 if(Object.keys(c).some(k=>!['commandId','kind','note','promisedDate','nextContactDate'].includes(k))||!['CONTACT','PROMISE'].includes(String(c.kind))||typeof c.note!=='string'||!c.note.trim()||c.note.length>1000)throw Error('Gestión incompleta.');
 const commandId=opaque(c.commandId),date=c.kind==='PROMISE'?String(c.promisedDate):null;if(date){calendarDate(date);}else if(c.promisedDate!==undefined&&c.promisedDate!==null)throw Error('Fecha inesperada.');
 const nextContactDate=c.nextContactDate===undefined||c.nextContactDate===''?null:calendarDate(c.nextContactDate);
 const digest=createHash('sha256').update(stable({actor:actor.uid,c})).digest('hex'),ref=events.doc(commandId),prior=await tx.get(ref);
 if(prior.exists){if(prior.data()!.digest!==digest)throw Error('Conflicto de gestión.');return {id:commandId,replay:true};}
 if(date&&date<argentinaBusinessDate())throw Error('La promesa debe ser presente o futura.');
 if(nextContactDate&&nextContactDate<argentinaBusinessDate())throw Error('El próximo contacto debe ser presente o futuro.');
 let alertWrite=()=>{};
 if(!actor.admin&&c.kind==='PROMISE'){const budget=(await tx.get(contractRefs(db,id,v).budget)).data()!;alertWrite=await prepareAffiliateCollectionAlert(db,tx,{identity:base.source.identity,assignment:base.state.assignment,actor:actor.uid,commandId,clientName:String(budget.clienteSnapshot.nombre),event:{kind:'PROMISE',promisedDate:date!,note:c.note.trim()}});}
 alertWrite();tx.create(ref,{operationId:base.source.identity.operationId,kind:c.kind,note:c.note.trim(),promisedDate:date,nextContactDate,actor:actor.uid,at:new Date().toISOString(),digest});return {id:commandId,replay:false};
 });}
