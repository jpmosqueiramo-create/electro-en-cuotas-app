import { calendarDate, exact, opaque, reject } from '../contractV2';
export const OPERATION_VERSION='CONTRACT_OPERATIONS_V1' as const;
export type SignatureKind='customerMandate'|'customerNote'|'representative'|'deliveryReceipt';
export interface SignatureEvidence {signedOn:string;actualPlace:string;originalReference:string;channel:'SYSTEM'|'WHATSAPP';recordedBy:string;recordedAt:string}
export interface ContractOperations {
 version:typeof OPERATION_VERSION;revision:number;residenceLocality:string;
 signatures:Partial<Record<SignatureKind,SignatureEvidence>>;
 delivery:{state:'PENDING'}|{state:'DELIVERED';recordedAt:string;recordedBy:string};
 custody:'PENDING'|'ORIGINALS_RECEIVED';legalFormalization:'PENDING';
}
export function newOperations(residenceLocality:string):ContractOperations{return {version:OPERATION_VERSION,revision:0,residenceLocality,signatures:{},delivery:{state:'PENDING'},custody:'PENDING',legalFormalization:'PENDING'};}
export function operationReadiness(s:ContractOperations){return {deliveryAllowed:!!(s.signatures.customerMandate&&s.signatures.customerNote&&s.signatures.deliveryReceipt),representativePending:!s.signatures.representative,formalized:false as const};}
export function applyOperation(s:ContractOperations,input:unknown,actor:string,now:string):ContractOperations{
 const raw=input as Record<string,unknown>;
 if(!raw||typeof raw.action!=='string'||!['RECORD_SIGNATURE','RECORD_DELIVERY','RECEIVE_ORIGINALS'].includes(raw.action))reject('Operación documental no permitida.');
 const o=exact(input,['action','commandId','expectedRevision',...(raw.action==='RECORD_SIGNATURE'?['kind','signedOn','actualPlace','originalReference','channel']:[])]);
 opaque(o.commandId);if(o.expectedRevision!==s.revision)reject('Conflicto de revisión documental.');
 const next:ContractOperations=structuredClone(s);
 if(o.action==='RECORD_SIGNATURE'){
  if(typeof o.kind!=='string'||!['customerMandate','customerNote','representative','deliveryReceipt'].includes(o.kind))reject();
  const clean=(v:unknown)=>{if(typeof v!=='string'||!v.trim()||v.length>150||/[<>\x00-\x1f\x7f]/.test(v))reject();return (v as string).trim();};
  const day=calendarDate(o.signedOn);if(day>now.slice(0,10))reject('La firma no puede tener fecha futura.');
  if(typeof o.channel!=='string'||!['SYSTEM','WHATSAPP'].includes(o.channel))reject();
  const kind=o.kind as SignatureKind;if(next.signatures[kind])reject('La evidencia ya existe; no se sobrescribe.');
  next.signatures[kind]={signedOn:day,actualPlace:clean(o.actualPlace),originalReference:opaque(o.originalReference),channel:o.channel as 'SYSTEM'|'WHATSAPP',recordedBy:actor,recordedAt:now};
 }else if(o.action==='RECORD_DELIVERY'){
  if(!operationReadiness(s).deliveryAllowed)reject('Faltan firmas del cliente en contrato, pagaré o remito.');
  if(next.delivery.state==='DELIVERED')reject('La entrega ya está registrada.');
  next.delivery={state:'DELIVERED',recordedAt:now,recordedBy:actor};
 }else{
  if(!operationReadiness(s).deliveryAllowed||!s.signatures.representative)reject('Faltan firmas de originales.');
  if(next.custody==='ORIGINALS_RECEIVED')reject('La recepción ya está registrada.');next.custody='ORIGINALS_RECEIVED';
 }
 next.revision++;return next;
}
