import { PERSONAL_ADDRESS_VERSION, validProvince, postalCodePattern } from './contractAddress';
import { calcularPlanReferenciaCatalogo } from './catalogReference';
import type { BudgetReferenceSnapshotV2 } from './budgetReferenceV2';
import type { BudgetAcceptanceV2 } from './budgetAcceptanceV2';
import type { BudgetV2 } from './budgetV2';

export function stable(value:unknown):string { if(Array.isArray(value))return '['+value.map(stable).join(',')+']'; if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+stable(v)).join(',')+'}'; return JSON.stringify(value); }
export class ContractError extends Error {}
export function reject(message = 'Solicitud inválida.') : never { throw new ContractError(message); }
export function exact(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) reject();
  const o = value as Record<string, unknown>;
  if (Object.keys(o).some(k => !keys.includes(k)) || keys.some(k => !Object.hasOwn(o,k))) reject();
  return o;
}
export function opaque(value: unknown): string { if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) reject(); return value; }
export const legacyPersonalFields = ['fullName','dni','address','locality','email','whatsapp'] as const;
export const personalFields = ['fullName','dni','address','locality','province','postalCode','email','whatsapp'] as const;
export type PersonalDataVersion = 'LEGACY_SIX' | typeof PERSONAL_ADDRESS_VERSION;
export function personalVersion(value: unknown): PersonalDataVersion {
  if (value === undefined || value === 'LEGACY_SIX') return 'LEGACY_SIX';
  if (value === PERSONAL_ADDRESS_VERSION) return value;
  return reject('Versión de datos personales incompatible.');
}
export const employmentFields = ['cuil','employerOrWorkName','workAddress'] as const;
export type ContractPersonalDataV2 = Record<typeof legacyPersonalFields[number],string> & Partial<Record<'province'|'postalCode',string>>;
export type ContractEmploymentDataV2 = Record<typeof employmentFields[number],string>;
export function dataFields<T extends string>(value: unknown, fields: readonly T[], required=false): Record<T,string> {
  const o=exact(value,fields), out={} as Record<T,string>;
  for (const k of fields) {
    if (typeof o[k] !== 'string') reject();
    let text=(o[k] as string).trim().normalize('NFC');
    if(k==='postalCode'){
      if(text&&!/^(?:[0-9]{4}|[A-Za-z][0-9]{4}[A-Za-z]{3})$/.test(text))reject('Usá cuatro dígitos o un CPA válido.');
      text=text.toUpperCase();
    }
    if(text&&k==='province'&&!validProvince(text))reject('Seleccioná una provincia válida.');
    if(text&&k==='postalCode'&&!postalCodePattern.test(text))reject('Usá cuatro dígitos o un CPA válido.');
    if(text.length>300 || /[<>\x00-\x1f\x7f]/.test(text) || (required&&!text)) reject('Revisá los datos ingresados.');
    if(text&&k==='dni'&&!/^\d{7,8}$/.test(text)) reject('Revisá el DNI.');
    if(text&&k==='cuil'&&!/^\d{2}-?\d{8}-?\d$/.test(text)) reject('Revisá el CUIL.');
    if(text&&k==='email'&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)||text.length>254)) reject('Revisá el email.');
    if(text&&k==='whatsapp'&&!/^\+?\d{8,15}$/.test(text)) reject('Usá WhatsApp con código de país.');
    out[k]=text;
  }return out;
}
export function dueDay(value: unknown): number { if(typeof value!=='number'||!Number.isInteger(value)||value<1||value>31) reject('Elegí un día entre 1 y 31.'); return value; }
export function calendarDate(value: unknown): string {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)) reject('Indicá una fecha válida.');
  const [y,m,d]=value.split('-').map(Number);
  if(y<1900||y>9998||m<1||m>12||d<1||d>new Date(Date.UTC(y,m,0)).getUTCDate()) reject('Indicá una fecha válida.');
  return value;
}
export interface ContractEconomicTermsV2 { capitalAmount:number; contractPlanCuotas:number; factorSnapshot:number; factorComputedTotal:number; roundingAdjustment:number; serviceAmount:number; contractInstallmentAmount:number; contractTotal:number }
export function contractEconomics(s: BudgetReferenceSnapshotV2,n: number):ContractEconomicTermsV2 {
  if(!Number.isInteger(n)||n<1||n>18)reject('Elegí un plan entre 1 y 18 cuotas.');
  const factor=s.factoresSnapshot[n];
  if(!Number.isFinite(factor)||factor<=0)reject('Revisión administrativa requerida: falta factor válido en el snapshot aceptado.');
  const p=calcularPlanReferenciaCatalogo({costoProveedor:s.costoProveedorSnapshot,cuotas:n,factor});
  const total=p.cuotaExhibidaCatalogo*n;
  if(!Number.isSafeInteger(total)||total<s.costoProveedorSnapshot||s.costoProveedorSnapshot+(total-s.costoProveedorSnapshot)!==total) reject('Revisión administrativa requerida: capital o factor inválido.');
  return {capitalAmount:s.costoProveedorSnapshot,contractPlanCuotas:n,factorSnapshot:factor,factorComputedTotal:p.valorTotalReferencia,roundingAdjustment:total-p.valorTotalReferencia,serviceAmount:total-s.costoProveedorSnapshot,contractInstallmentAmount:p.cuotaExhibidaCatalogo,contractTotal:total};
}
export interface ContractPaymentInstallmentV2 { installmentNumber:number; dueDate:string; amount:number }
export type ContractPaymentScheduleV2 = ContractPaymentInstallmentV2[];
export function contractSchedule(e:ContractEconomicTermsV2, first:string, day:number):ContractPaymentScheduleV2 {
  calendarDate(first);dueDay(day);const [year,month]=first.split('-').map(Number);
  return Array.from({length:e.contractPlanCuotas},(_,i)=>{
    const absolute=year*12+month-1+i, y=Math.floor(absolute/12), m=absolute%12+1;
    if(y>9999) reject();
    const d=Math.min(day,new Date(Date.UTC(y,m,0)).getUTCDate());
    return {installmentNumber:i+1,dueDate:i===0?first:`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,amount:e.contractInstallmentAmount};
  });
}
export interface ContractDraftV2 {
  schemaVersion:'CONTRACT_DRAFT_V2'; contractDraftId:string;budgetId:string;budgetVersion:number;acceptedOptionId:string;revision:number;status:'DRAFT';
  acceptedReferenceSnapshot:Omit<BudgetReferenceSnapshotV2,'imagenUrls'>; acceptedAt:string;preferredPlanCuotas:number|null;
  personalDataVersion?:PersonalDataVersion;personalData:ContractPersonalDataV2;employmentData:ContractEmploymentDataV2;economicTerms:ContractEconomicTermsV2|null;
  firstInstallmentDueDate:string|null;preferredMonthlyDueDay:number|null;paymentScheduleDraft:ContractPaymentScheduleV2;
  activeClientDataRequestId:string|null;lastClientSubmissionId:string|null;lastClientSubmissionAppliedAt:string|null;lastClientSubmissionAppliedBy:string|null;
  preparedAt:string;createdAt:string;createdBy:string;updatedAt:string;updatedBy:string;
}
export function newContractDraft(b:BudgetV2,a:BudgetAcceptanceV2,actor:string,now:string):ContractDraftV2 {
  if(b.estado!=='EMITIDO'||a.schemaVersion!=='BUDGET_ACCEPTANCE_V2'||a.budgetId!==b.id||a.budgetVersion!==b.version||a.sourceCollection!==b.sourceCollection||a.solicitudId!==b.solicitudId||a.acceptedOptionId!==a.optionSnapshot.optionId||stable(b.options.find(o=>o.optionId===a.acceptedOptionId))!==stable(a.optionSnapshot)) reject('Origen aceptado inconsistente.');
  const s=a.optionSnapshot.referenceSnapshot;
  // No images/bytes copied: the accepted immutable origin remains in Acceptance.
  const snapshot={schemaVersion:s.schemaVersion,referenceId:s.referenceId,source:s.source,nombre:s.nombre,descripcion:s.descripcion,skuInternoSnapshot:s.skuInternoSnapshot,codigoBarrasSnapshot:s.codigoBarrasSnapshot,costoProveedorSnapshot:s.costoProveedorSnapshot,proveedorSnapshot:s.proveedorSnapshot,factoresSnapshot:s.factoresSnapshot,planesActivosSnapshot:s.planesActivosSnapshot,planesOfrecidos:s.planesOfrecidos,fechaCotizacion:s.fechaCotizacion};
  return {schemaVersion:'CONTRACT_DRAFT_V2',contractDraftId:`v${b.version}`,budgetId:b.id,budgetVersion:b.version,acceptedOptionId:a.acceptedOptionId,revision:1,status:'DRAFT',acceptedReferenceSnapshot:snapshot,acceptedAt:a.acceptedAt,preferredPlanCuotas:a.preferredPlanCuotas,personalDataVersion:PERSONAL_ADDRESS_VERSION,personalData:{fullName:b.clienteSnapshot.nombre||'',dni:b.clienteSnapshot.dni||'',address:'',locality:b.clienteSnapshot.localidad||'',province:'',postalCode:'',email:'',whatsapp:b.clienteSnapshot.whatsapp||''},employmentData:{cuil:b.clienteSnapshot.cuil||'',employerOrWorkName:'',workAddress:''},economicTerms:null,firstInstallmentDueDate:null,preferredMonthlyDueDay:null,paymentScheduleDraft:[],activeClientDataRequestId:null,lastClientSubmissionId:null,lastClientSubmissionAppliedAt:null,lastClientSubmissionAppliedBy:null,preparedAt:now,createdAt:now,createdBy:actor,updatedAt:now,updatedBy:actor};
}
export function completeness(d:ContractDraftV2):string[] {
  const missing=personalFields.filter(k=>!d.personalData[k]?.trim()).map(k=>`Datos personales: ${k}`);
  try{dataFields(personalForEditing(d.personalData),personalFields,true);}catch{if(!missing.length)missing.push('Datos personales inválidos');}
  if(!d.economicTerms)missing.push('Plan contractual');if(!d.firstInstallmentDueDate)missing.push('Primera cuota');if(!d.preferredMonthlyDueDay)missing.push('Día habitual');
  if(!d.economicTerms||d.paymentScheduleDraft.length!==d.economicTerms.contractPlanCuotas||d.paymentScheduleDraft.reduce((n,p)=>n+p.amount,0)!==d.economicTerms.contractTotal) missing.push('Cronograma');return missing;
}
export interface ClientDataSubmissionV2 {schemaVersion:'CLIENT_DATA_SUBMISSION_V2';submissionId:string;requestId:string;contractDraftId:string;submittedAt:string;personalDataVersion?:PersonalDataVersion;personalData:ContractPersonalDataV2;employmentData:ContractEmploymentDataV2;preferredMonthlyDueDay:number}
export interface ContractClientDataRequestV2 {schemaVersion:'CONTRACT_CLIENT_DATA_REQUEST_V2';requestId:string;personalDataVersion?:PersonalDataVersion;contractDraftId:string;budgetId:string;budgetVersion:number;tokenHash:string;status:'ACTIVE'|'SUBMITTED'|'REVOKED'|'EXPIRED';createdAt:string;createdBy:string;expiresAt:string;submittedAt:string|null;revokedAt:string|null;submissionDigest:string|null}
export function personalForEditing(value:ContractPersonalDataV2) { return {...value,province:value.province??'',postalCode:value.postalCode??''}; }
export function submissionPayload(input:unknown,version:PersonalDataVersion='LEGACY_SIX') {
  const o=exact(input,['personalData','employmentData','preferredMonthlyDueDay']);return {personalData:dataFields(o.personalData,version==='LEGACY_SIX'?legacyPersonalFields:personalFields,true),employmentData:dataFields(o.employmentData,employmentFields),preferredMonthlyDueDay:dueDay(o.preferredMonthlyDueDay)};
}
