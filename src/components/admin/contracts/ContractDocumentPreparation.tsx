'use client';
import type { ContractDraftV2 } from '@/lib/contractV2';
import { personalFields } from '@/lib/contractV2';
import type { OperationIdentityReview } from '@/lib/operationIdentityReview';
import { goToContractSection,type ContractSectionTarget } from './contractSectionNavigation';
export function ContractDocumentPreparation({draft,identity,conformity,unsaved}:{draft:ContractDraftV2;identity:OperationIdentityReview|null;conformity:{required:boolean;confirmed:boolean}|null;unsaved:boolean}){
 const rows:{label:string;status:string;target:ContractSectionTarget|null}[]=[
  {label:'Datos personales',status:personalFields.every(k=>draft.personalData[k]?.trim())?'Completos':'Pendientes',target:'data'},
  {label:'Producto',status:draft.productDetails?.quantity&&draft.productDetails.condition?'Completo':'Pendiente',target:'product'},
  {label:'Condiciones económicas',status:draft.economicTerms?'Completas':'Pendientes',target:'terms'},
  {label:'Cronograma',status:draft.economicTerms&&draft.firstInstallmentDueDate&&draft.preferredMonthlyDueDay&&draft.paymentScheduleDraft.length===draft.economicTerms.contractPlanCuotas?'Completo':'Pendiente',target:'schedule'},
  {label:'Identidad / conformidad',status:identity?.requiresClarification?'Bloqueado: revisar identidad':!identity?'Pendiente de verificación':conformity?.required&&!conformity.confirmed?'Pendiente de nueva conformidad':'Conforme con el origen vigente',target:identity?.requiresClarification||!identity?'identity':'conformity'},
  {label:'Revisión jurídica',status:'Pendiente',target:null},
 ];
 return <section data-testid="contract-document-preparation" className="min-w-0 space-y-3 rounded-xl border border-border-color bg-surface p-4"><h3 className="font-heading text-xl font-bold">Preparación de documentos</h3><p className="text-sm">Estado de la información guardada. No acredita firma ni aprobación jurídica.</p>{unsaved&&<p role="status">Hay cambios sin guardar. Los documentos conservan la última información guardada.</p>}<ul className="grid gap-3 sm:grid-cols-2">{rows.map(row=><li key={row.label} className="min-w-0 rounded border border-border-color p-3"><p className="font-semibold">{row.label}</p><p>{row.status}</p>{row.target&&<button type="button" className="min-h-11 text-left underline" onClick={()=>goToContractSection(row.target!)}>{row.label==='Producto'?'Revisar producto':row.label==='Identidad / conformidad'?'Revisar identidad o conformidad':'Revisar sección'}</button>}</li>)}</ul>{!draft.employmentData.cuil&&<button type="button" className="min-h-11 underline" onClick={()=>goToContractSection('employment')}>Completar CUIL en datos laborales</button>}</section>;
}
