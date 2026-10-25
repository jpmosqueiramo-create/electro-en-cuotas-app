import {operationRef} from './operationV2';
import {createHash} from 'node:crypto';
import type {Firestore,Transaction,DocumentSnapshot} from 'firebase-admin/firestore';
import {stable} from './contractV2';
import type {AdminRecordSubject,AdminRecordStatus,AdminRecordState,AdminRemovalPreview} from './adminRecordRemoval';
const hash=(v:unknown)=>createHash('sha256').update(stable(v)).digest('hex');
export function parseRemovalSubject(raw:unknown):AdminRecordSubject {
 const s=raw as Record<string,unknown>;
 if(!s||!['REQUEST','BUDGET','CONTRACT'].includes(String(s.kind))||typeof s.id!=='string'||!s.id||s.id.startsWith('_')||s.id==='.'||s.id==='..'||s.id.includes('/')||Buffer.byteLength(s.id)>1500)throw Error('REMOVAL_INVALID');
 const keys=s.kind==='REQUEST'?['id','kind','source']:s.kind==='CONTRACT'?['id','kind','version']:['id','kind'];
 if(Object.keys(s).sort().join(',')!==keys.sort().join(',')||s.kind==='REQUEST'&&!['solicitudes','solicitudes_cuenta'].includes(String(s.source))||s.kind==='CONTRACT'&&(!Number.isSafeInteger(s.version)||Number(s.version)<1))throw Error('REMOVAL_INVALID');
 return s as AdminRecordSubject;
}
export const administrativeRecordRef=(db:Firestore,subject:AdminRecordSubject)=>db.collection('presupuestos_v2').doc('_administrative_records_v1').collection('contracts').doc(hash(parseRemovalSubject(subject)));
export async function readAdministrativeStatus(db:Firestore,subject:AdminRecordSubject,tx?:Transaction):Promise<AdminRecordStatus|null>{
 const ref=administrativeRecordRef(db,subject),s=tx?await tx.get(ref):await ref.get();if(!s.exists)return null;
 const d=s.data()!;if(d.schemaVersion!=='ADMIN_RECORD_STATE_V1'||stable(d.subject)!==stable(subject)||!['ACTIVE','DELETED','ARCHIVED'].includes(d.state)||!Number.isSafeInteger(d.revision))throw Error('REMOVAL_STATE_INVALID');
 return {state:d.state,revision:d.revision,at:d.at,reason:d.reason};
}
export async function administrativeStatuses(db:Firestore,subjects:AdminRecordSubject[]){
 const result:Record<string,AdminRecordStatus>={};
 for(let i=0;i<subjects.length;i+=100)await Promise.all(subjects.slice(i,i+100).map(async s=>{const value=await readAdministrativeStatus(db,s);if(value)result[s.id]=value;}));
 return result;
}
export async function assertAdministrativeRecordActive(db:Firestore,tx:Transaction,subject:AdminRecordSubject){
 const status=await readAdministrativeStatus(db,subject,tx);if(status&&status.state!=='ACTIVE')throw Error('Registro retirado por Administración. Restauralo antes de continuar.');
}
const metadata=(s:DocumentSnapshot)=>[s.ref.path,s.exists,s.updateTime?.seconds??null,s.updateTime?.nanoseconds??null];
async function inspect(db:Firestore,subject:AdminRecordSubject,tx?:Transaction):Promise<AdminRemovalPreview>{
 const target=subject.kind==='REQUEST'?db.collection(subject.source).doc(subject.id):subject.kind==='BUDGET'?db.collection('presupuestos_v2').doc(subject.id):db.collection('presupuestos_v2').doc(subject.id).collection('contracts').doc(`v${subject.version}`);
 const read=async(ref:typeof target)=>tx?tx.get(ref):ref.get(),snapshot=await read(target);if(!snapshot.exists)throw Error('REMOVAL_NOT_FOUND');
 const status=await readAdministrativeStatus(db,subject,tx),related:DocumentSnapshot[]=[];
 if(subject.kind==='REQUEST'){
  const q=db.collection('presupuestos_v2').where('solicitudId','==',subject.id).limit(101),found=tx?await tx.get(q):await q.get();
  // Ambiguous historical links are preserved, never guessed or cascaded.
  related.push(...found.docs.filter(d=>!d.data().sourceCollection||d.data().sourceCollection===subject.source));
 }else if(subject.kind==='CONTRACT'){
  const q=db.collection('contractSnapshotsV2').where('sourceDraft.budgetId','==',subject.id).limit(101),found=tx?await tx.get(q):await q.get();
  related.push(...found.docs.filter(d=>d.data().sourceDraft?.budgetVersion===subject.version));
  const finance=await read(operationRef(db,subject.id,subject.version).parent.doc('financial'));if(finance.exists)related.push(finance);
 }else{
  const family=db.collection('presupuestos_v2').doc(subject.id);
  for(const col of ['versions','acceptances']){const q=family.collection(col).limit(101),found=tx?await tx.get(q):await q.get();related.push(...found.docs);}
 }
 const d=snapshot.data()!,activity=['planPagos','contratoFirmado','pagareFirmado','entregado','fechaEntregaReal','nroContrato','numeroContrato'].some(k=>d[k]!==undefined&&d[k]!==null&&d[k]!==false&&d[k]!==''&&(!Array.isArray(d[k])||d[k].length>0));
 let resultState:AdminRecordState='DELETED';
 if(subject.kind==='CONTRACT'&&(!['DRAFT','READY_TO_FORMALIZE'].includes(d.status)||related.length))resultState='ARCHIVED';
 if(subject.kind==='BUDGET'&&related.some(s=>s.ref.parent.id==='acceptances'||s.data()?.estado==='EMITIDO'))resultState='ARCHIVED';
 if(subject.kind==='REQUEST'&&(related.length||activity))resultState='ARCHIVED';
 const preservedPaths=[target.path,...related.map(s=>s.ref.path)].sort();
 return {subject,state:status?.state??'ACTIVE',resultState,preservedPaths,fingerprint:hash({subject,metadata:[metadata(snapshot),...related.map(metadata)].sort((a,b)=>String(a[0]).localeCompare(String(b[0]))),status}),description:resultState==='ARCHIVED'?'Se retirará de la bandeja. Se conservarán documentos, obligaciones, saldos e historial.':'Eliminación recuperable: dejará de aparecer en la bandeja y no podrá continuarse hasta restaurarlo. Los datos y su auditoría se conservarán.'};
}
export async function previewAdministrativeRemoval(db:Firestore,input:unknown){return inspect(db,parseRemovalSubject(input));}
export async function manageAdministrativeRecord(db:Firestore,input:unknown,actor:string){
 const c=input as {action:'REMOVE'|'RESTORE';subject:AdminRecordSubject;commandId:string;fingerprint:string;confirmed:boolean;reason:string};
 if(!c||Object.keys(c).sort().join(',')!=='action,commandId,confirmed,fingerprint,reason,subject'||!['REMOVE','RESTORE'].includes(c.action)||!/^[A-Za-z0-9_-]{1,128}$/.test(c.commandId)||c.confirmed!==true||!/^[a-f0-9]{64}$/.test(c.fingerprint)||typeof c.reason!=='string'||!c.reason.trim()||c.reason.length>500||!actor)throw Error('REMOVAL_INVALID');
 const subject=parseRemovalSubject(c.subject),ref=administrativeRecordRef(db,subject),command=ref.collection('commands').doc(c.commandId),digest=hash({actor,input});
 return db.runTransaction(async tx=>{
  const old=await tx.get(command);if(old.exists){if(old.data()!.digest!==digest)throw Error('REMOVAL_COMMAND_CONFLICT');return {...old.data()!.result,replayed:true};}
  const preview=await inspect(db,subject,tx);if(preview.fingerprint!==c.fingerprint)throw Error('REMOVAL_CHANGED');
  if(c.action==='REMOVE'&&preview.state!=='ACTIVE'||c.action==='RESTORE'&&preview.state==='ACTIVE')throw Error('REMOVAL_CHANGED');
  const current=await readAdministrativeStatus(db,subject,tx),result={state:c.action==='RESTORE'?'ACTIVE':preview.resultState,revision:(current?.revision??0)+1,at:new Date().toISOString(),reason:c.reason.trim()};
  tx.set(ref,{schemaVersion:'ADMIN_RECORD_STATE_V1',subject,...result,by:actor});
  tx.create(command,{schemaVersion:'ADMIN_RECORD_ACTION_V1',digest,action:c.action,subject,by:actor,reason:c.reason.trim(),beforeState:preview.state,preservedPaths:preview.preservedPaths,result});
  return {...result,replayed:false};
 });
}
