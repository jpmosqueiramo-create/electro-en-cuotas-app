import { createHash } from 'node:crypto';
import { stable } from './contractV2';
export const fiscalOwnerDeclaration={issuer:'LOOP GESTIÓN INTEGRAL S.R.L.',taxId:'30-71962686-2',vatStatus:'RESPONSABLE_INSCRIPTO',source:'OWNER_CONFIRMED',arcaRegistrationVerified:false,treatmentConfirmed:false} as const;
export type FiscalConcept='MANDATE_CAPITAL'|'MANAGEMENT'|'LOGISTICS'|'OTHER';
export type FiscalTreatment='TAXED'|'EXEMPT'|'NON_TAXABLE';
export interface FiscalPolicy {id:string;version:number;validFrom:string;validTo:string|null;confirmedBy:string;reference:string;issuerStatus:'RI'|'EXEMPT'|'MONOTAX';allowedClasses:('A'|'B'|'C')[];concepts:Partial<Record<FiscalConcept,{treatment:FiscalTreatment;rateBps:number;basis:'NET';reference:string}>>}
export interface FiscalLine {concept:FiscalConcept;baseCents:number;taxCents:number;totalCents:number;policyReference:string;treatment:FiscalTreatment;rateBps:number;basis:'NET'}
export interface FiscalRequest {operationId:string;snapshotId:string;snapshotHash:string;policy:FiscalPolicy;date:string;documentClass:'A'|'B'|'C';kind:'INVOICE'|'CREDIT_NOTE'|'DEBIT_NOTE';pointOfSale:number;receiverStatus:'RI'|'MONOTAX'|'EXEMPT'|'FINAL_CONSUMER';lines:{concept:FiscalConcept;baseCents:number}[];associatedId:string|null}
function fail(code='FISCAL_CONFIGURATION_PENDING'):never {throw Error(code);}
function cents(n:number){if(!Number.isSafeInteger(n)||n<0)fail('FISCAL_AMOUNT_INVALID');return n;}
function date(s:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)fail('FISCAL_DATE_INVALID');}
export function fiscalProjection(r:FiscalRequest) {
 const p=r.policy;date(r.date);date(p.validFrom);if(p.validTo)date(p.validTo);
 if(typeof r.snapshotId!=='string'||! /^[a-zA-Z0-9_-]{1,200}$/.test(r.snapshotId)||!/^op_[a-f0-9]{64}$/.test(r.operationId)||! /^[a-f0-9]{64}$/.test(r.snapshotHash)||!p.id||!Number.isSafeInteger(p.version)||p.version<1||!p.confirmedBy?.trim()||!p.reference?.trim()||r.date<p.validFrom||p.validTo&&r.date>p.validTo)fail();
 if(!['RI','MONOTAX','EXEMPT'].includes(p.issuerStatus)||!['RI','MONOTAX','EXEMPT','FINAL_CONSUMER'].includes(r.receiverStatus)||!['INVOICE','CREDIT_NOTE','DEBIT_NOTE'].includes(r.kind))fail();
 const expected=p.issuerStatus==='RI'?['RI','MONOTAX'].includes(r.receiverStatus)?'A':'B':'C';
 if(r.documentClass!==expected||!p.allowedClasses.includes(r.documentClass)||!Number.isSafeInteger(r.pointOfSale)||r.pointOfSale<1||r.pointOfSale>99998)fail('FISCAL_CLASS_OR_POINT_NOT_AUTHORIZED');
 if(r.kind==='INVOICE'?r.associatedId!==null:typeof r.associatedId!=='string'||!r.associatedId)fail('FISCAL_ASSOCIATION_REQUIRED');
 if(!Array.isArray(r.lines)||!r.lines.length||r.lines.length>50||new Set(r.lines.map(l=>l.concept)).size!==r.lines.length)fail('FISCAL_LINES_INVALID');
 const lines:FiscalLine[]=r.lines.map(l=>{const c=p.concepts[l.concept];if(!c||!['TAXED','EXEMPT','NON_TAXABLE'].includes(c.treatment)||c.basis!=='NET'||!c.reference?.trim()||!Number.isSafeInteger(c.rateBps)||c.rateBps<0||c.rateBps>10000)fail();
  if(c.treatment!=='TAXED'&&c.rateBps!==0||r.documentClass==='C'&&c.treatment==='TAXED')fail('FISCAL_TREATMENT_INCONSISTENT');
  const baseCents=cents(l.baseCents);const taxCents=cents(Number((BigInt(baseCents)*BigInt(c.rateBps)+BigInt(5000))/BigInt(10000)));
  return {concept:l.concept,baseCents,taxCents,totalCents:cents(baseCents+taxCents),policyReference:c.reference,treatment:c.treatment,rateBps:c.rateBps,basis:'NET'};});
 const totalCents=cents(lines.reduce((n,l)=>n+l.totalCents,0));if(totalCents===0)fail('FISCAL_AMOUNT_INVALID');
 return {schemaVersion:'FISCAL_SIMULATION_V1' as const,executionMode:'MOCK_ONLY' as const,operationId:r.operationId,snapshotId:r.snapshotId,snapshotHash:r.snapshotHash,policySnapshot:structuredClone(p),policyId:p.id,policyVersion:p.version,policyHash:createHash('sha256').update(stable(p)).digest('hex'),date:r.date,receiverStatus:r.receiverStatus,documentClass:r.documentClass,kind:r.kind,pointOfSale:r.pointOfSale,associatedId:r.associatedId,lines,totalCents,taxCents:cents(lines.reduce((n,l)=>n+l.taxCents,0)),taxDisplay:r.documentClass==='C'?'NOT_APPLICABLE':'DISCRIMINATED',productiveIssuance:false as const};
}
// A receipt records settlement only; it never originates taxable turnover or CAE.
export function fiscalReceiptReference(paymentId:string,amountCents:number,invoiceIds:readonly string[]) {if(!paymentId||!cents(amountCents))fail();return {paymentId,amountCents,invoiceIds:[...invoiceIds],createsInvoice:false,calculatesVat:false};}
