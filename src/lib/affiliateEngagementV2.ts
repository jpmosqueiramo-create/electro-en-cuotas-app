import type { Firestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { custodyLoad,custodyRef,type CustodyActor } from './operationCustodyV2Server';
import { opaque,stable,calendarDate } from './contractV2';
export async function affiliateEngagement(db:Firestore,id:string,v:number,actor:CustodyActor,input?:unknown){return db.runTransaction(async tx=>{
 const base=await custodyLoad(db,tx,id,v,actor),events=custodyRef(db,id,v).collection('engagements');
 if(input===undefined){const rows=await tx.get(events.orderBy('at','desc').limit(31));return {historyTruncated:rows.size>30,records:rows.docs.slice(0,30).map(d=>{const row=d.data();return {id:d.id,kind:String(row.kind),note:String(row.note),promisedDate:typeof row.promisedDate==='string'?row.promisedDate:null,nextContactDate:typeof row.nextContactDate==='string'?row.nextContactDate:null};})};}
 if(!input||typeof input!=='object')throw Error('Gestión inválida.');const c=input as Record<string,unknown>;
 if(Object.keys(c).some(k=>!['commandId','kind','note','promisedDate','nextContactDate'].includes(k))||!['CONTACT','PROMISE'].includes(String(c.kind))||typeof c.note!=='string'||!c.note.trim()||c.note.length>1000)throw Error('Gestión incompleta.');
 const commandId=opaque(c.commandId),date=c.kind==='PROMISE'?String(c.promisedDate):null;if(date){calendarDate(date);}else if(c.promisedDate!==undefined&&c.promisedDate!==null)throw Error('Fecha inesperada.');
 const nextContactDate=c.nextContactDate===undefined||c.nextContactDate===''?null:calendarDate(c.nextContactDate);
 const digest=createHash('sha256').update(stable({actor:actor.uid,c})).digest('hex'),ref=events.doc(commandId),prior=await tx.get(ref);
 if(prior.exists){if(prior.data()!.digest!==digest)throw Error('Conflicto de gestión.');return {id:commandId,replay:true};}
 if(date&&date<new Date().toISOString().slice(0,10))throw Error('La promesa debe ser presente o futura.');
 if(nextContactDate&&nextContactDate<new Date().toISOString().slice(0,10))throw Error('El próximo contacto debe ser presente o futuro.');
 tx.create(ref,{operationId:base.source.identity.operationId,kind:c.kind,note:c.note.trim(),promisedDate:date,nextContactDate,actor:actor.uid,at:new Date().toISOString(),digest});return {id:commandId,replay:false};
 });}
