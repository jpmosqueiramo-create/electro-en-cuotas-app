// Read-only projection of persisted V2 data. Never creates a frozen snapshot or number.
import type { BudgetV2 } from '../budgetV2';
import type { BudgetAcceptanceV2 } from '../budgetAcceptanceV2';
import { calendarDate, productDetails, dataFields, personalFields, personalForEditing, type ContractDraftV2 } from '../contractV2';
import { contractValueHash } from '../contractIntegrityV2';
import { operationFromAcceptance } from '../operationV2';
import { provinceLabel } from '../contractAddress';
import { contractLegalEntity } from './legalEntity';
import { DocumentPreviewError,type PreviewReason } from './previewErrors';
export const OPERATION_DOCUMENT_VERSION = 'OPERATION_DRAFT_REVIEW_V2';
export const issuerDraft = contractLegalEntity;
export interface DocumentPending {label:string;section:'data'|'employment'|'product'|'terms'|'schedule'|'identity'|'conformity'|'legal'}
export function projectOperationDraft(b:BudgetV2,a:BudgetAcceptanceV2,d:ContractDraftV2,identityBlocked:boolean,conformityPending:boolean,allowPendingConformity=false){
 try{return projectPersistedDraft(b,a,d,identityBlocked,conformityPending,allowPendingConformity);}catch(error){
  if(error instanceof DocumentPreviewError)throw error;
  throw new DocumentPreviewError('DOCUMENT_ORIGIN_INCONSISTENT','PROJECTION','SOURCE_MISMATCH');
 }
}
function projectPersistedDraft(b:BudgetV2,a:BudgetAcceptanceV2,d:ContractDraftV2,identityBlocked:boolean,conformityPending:boolean,allowPendingConformity:boolean){
 const fail=(reason:PreviewReason='SOURCE_MISMATCH'):never=>{throw new DocumentPreviewError('DOCUMENT_ORIGIN_INCONSISTENT','PROJECTION',reason);};
 if(b.schemaVersion!=='BUDGET_V2'||b.estado!=='EMITIDO'||a.schemaVersion!=='BUDGET_ACCEPTANCE_V2'||d.schemaVersion!=='CONTRACT_DRAFT_V2'||b.id!==a.budgetId||b.version!==a.budgetVersion||a.sourceCollection!==b.sourceCollection||a.solicitudId!==b.solicitudId||d.budgetId!==b.id||d.budgetVersion!==b.version||d.contractDraftId!==`v${b.version}`||d.acceptedOptionId!==a.acceptedOptionId||!['DRAFT','READY_TO_FORMALIZE'].includes(d.status))fail();
 const selected=b.options.filter(o=>o.optionId===a.acceptedOptionId);
 if(selected.length!==1||contractValueHash(selected[0])!==contractValueHash(a.optionSnapshot))fail();
 const {imagenUrls:_images,...reference}=a.optionSnapshot.referenceSnapshot;void _images;
 if(contractValueHash(reference)!==contractValueHash(d.acceptedReferenceSnapshot))fail();
 const pending:DocumentPending[]=[];
 const missing=(label:string,section:DocumentPending['section'])=>pending.push({label,section});
 const p=personalForEditing(d.personalData);
 // Historical drafts may omit a field. Only the projection gets an empty placeholder.
 for(const key of personalFields)if(!Object.hasOwn(p,key))p[key]='';
 const labels:Record<string,string>={fullName:'Nombre y apellido',dni:'DNI',address:'Domicilio',locality:'Localidad',province:'Provincia',postalCode:'Código postal',email:'Correo electrónico',whatsapp:'WhatsApp'};
 for(const key of personalFields)if(!p[key])missing(labels[key],'data');
 try{dataFields(p,personalFields);}catch{fail('INVALID_PERSONAL_DATA');} // Missing values are pending; malformed persisted values still block.
 const province=p.province?provinceLabel(p.province):'';
 if(!d.employmentData.cuil)missing('CUIL del cliente','employment');
 const product=d.productDetails===undefined?{quantity:null,condition:null}:productDetails(d.productDetails);
 if(product.quantity===null)missing('Cantidad del producto pendiente','product');
 if(product.condition===null)missing('Condición nuevo/usado del producto pendiente','product');
 missing('Desglose individual de gestión y logística no disponible: se conserva Servicios de Cuenta Hogar','legal');
 missing('Representación societaria y facultades de firma pendientes de validación','legal');
 missing('Lugar, fecha de emisión y jurisdicción pendientes de revisión jurídica','legal');
 missing('Aprobación jurídica del mandato y de la exigibilidad del pagaré','legal');
 missing('Snapshot contractual definitivo pendiente; vista previa de borrador persistido','legal');
 if(identityBlocked)missing('Discrepancia de identidad: revisar y verificar documentalmente','identity');
 if(conformityPending)missing('Nueva conformidad del cliente pendiente sobre las condiciones guardadas','conformity');
 const e=d.economicTerms;
 if(!e)missing('Plan contractual confirmado pendiente','terms');
 else {
  if(e.capitalAmount!==reference.costoProveedorSnapshot||e.factorSnapshot!==reference.factoresSnapshot[e.contractPlanCuotas]||!Number.isFinite(e.factorComputedTotal)||!Number.isFinite(e.roundingAdjustment)||e.factorComputedTotal+e.roundingAdjustment!==e.contractTotal)fail('ECONOMIC_MISMATCH');
  if(!Number.isInteger(e.contractPlanCuotas)||e.contractPlanCuotas<1||e.contractPlanCuotas>18||[e.capitalAmount,e.serviceAmount,e.contractTotal,e.contractInstallmentAmount].some(v=>!Number.isFinite(v)||v<0)||!Number.isSafeInteger(e.contractTotal)||!Number.isSafeInteger(e.contractInstallmentAmount)||e.capitalAmount+e.serviceAmount!==e.contractTotal||e.contractInstallmentAmount*e.contractPlanCuotas!==e.contractTotal)fail('ECONOMIC_MISMATCH');
 }
 const rows=d.paymentScheduleDraft;
 if(!rows.length)missing('Cronograma contractual guardado pendiente','schedule');
 else {
  if(!e||rows.length!==e.contractPlanCuotas||rows.reduce((n,r)=>n+r.amount,0)!==e.contractTotal||rows.some((r,i)=>r.installmentNumber!==i+1||r.amount!==e.contractInstallmentAmount||(i>0&&r.dueDate<=rows[i-1].dueDate))||rows[0].dueDate!==d.firstInstallmentDueDate)fail('SCHEDULE_MISMATCH');
  rows.forEach(r=>calendarDate(r.dueDate));
 }
 const projection={version:OPERATION_DOCUMENT_VERSION,operationId:operationFromAcceptance(a).operationId,budgetId:b.id,budgetVersion:b.version,acceptedOptionId:a.acceptedOptionId,draftRevision:d.revision,updatedAt:d.updatedAt,issuer:issuerDraft,customer:{...p,province,cuil:d.employmentData.cuil},product:{name:reference.nombre,description:reference.descripcion,...product},economics:e?{capital:e.capitalAmount,service:e.serviceAmount,total:e.contractTotal,count:e.contractPlanCuotas,installment:e.contractInstallmentAmount}:null,schedule:rows.map(r=>({...r})),pending,canPreview:!identityBlocked&&(!conformityPending||allowPendingConformity),number:null,legalApproval:'PENDING' as const,issuance:'DRAFT_REVIEW_ONLY' as const};
 return {...projection,sourceHash:contractValueHash({budget:b,acceptance:a,draft:d,identityBlocked,conformityPending}),projectionHash:contractValueHash(projection)};
}
export type OperationDraftProjection=ReturnType<typeof projectOperationDraft>;
