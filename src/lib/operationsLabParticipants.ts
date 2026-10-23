import { createHash } from 'node:crypto';
import { admin } from './firebaseAdmin';
import { labRepository, type LabExecutionContext } from './operationsLabContext';
import { LabError, labCommand } from './operationsLabPolicy';
import { contractValueHash } from './contractIntegrityV2';
export async function labParticipantCommand(context:LabExecutionContext,raw:unknown){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new LabError(400,'LAB_PARTICIPANT_INVALID');
 const c=raw as {commandId:string;uid:string;role:'CLIENT'|'AFFILIATE';action:'GRANT'|'REVOKE'};
 if(Object.keys(c).sort().join()!=='action,commandId,role,uid'||!['GRANT','REVOKE'].includes(c.action)||!['CLIENT','AFFILIATE'].includes(c.role)||!/^[a-zA-Z0-9_-]{1,128}$/.test(c.uid)||c.uid===context.ownerUid)throw new LabError(400,'LAB_PARTICIPANT_INVALID');
 labCommand({commandId:c.commandId});
 let allowed:unknown;try{allowed=JSON.parse(process.env.OPERATIONS_LAB_PARTICIPANT_UIDS??'[]');}catch{throw new LabError(403,'LAB_PARTICIPANT_NOT_ALLOWED');}
 if(c.action==='GRANT'){
  if(!Array.isArray(allowed)||!allowed.includes(c.uid))throw new LabError(403,'LAB_PARTICIPANT_NOT_ALLOWED');
  const u=await admin.auth().getUser(c.uid).catch(()=>null);if(!u||u.disabled||!u.emailVerified)throw new LabError(403,'LAB_PARTICIPANT_NOT_ALLOWED');
 }
 const digest=contractValueHash({...c,session:context.sessionId,owner:context.ownerUid});
 return labRepository(context).transaction(async tx=>{
  const [prior,member]=await Promise.all([tx.read('commands',c.commandId),tx.read('participants',c.uid)]);
  if(prior){if(prior.digest!==digest)throw new LabError(409,'LAB_COMMAND_CONFLICT');return prior.result;}
  if(c.action==='REVOKE'&&(!member||member.role!==c.role))throw new LabError(409,'LAB_PARTICIPANT_INVALID');
  if(c.action==='GRANT'&&member?.active&&member.role!==c.role)throw new LabError(409,'LAB_PARTICIPANT_ROLE_CONFLICT');
  const at=new Date().toISOString(),active=c.action==='GRANT';
  const result={active,role:c.role,url:'/laboratorio/'+context.sessionId+'?owner='+createHash('sha256').update(context.ownerUid).digest('hex')};
  tx.replace('participants',c.uid,{uid:c.uid,role:c.role,active,at,actor:context.ownerUid});
  tx.create('commands',c.commandId,{digest,result,actor:context.ownerUid,at});tx.create('events',c.commandId,{action:c.action+'_LAB_PARTICIPANT',uid:c.uid,role:c.role,actor:context.ownerUid,at});return result;
 });
}
