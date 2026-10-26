'use client';
import { useContext,useRef,useState } from 'react';
import { type ContractDraftV2 } from '@/lib/contractV2';
import { creditLabels,creditNextAction,type CreditState } from '@/lib/creditReviewV2';
import { ContractNavigationContext } from './contractSectionNavigation';
import { btn,control } from './ContractDataFields';
const money=(value:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(value);
export function ContractTermsFields({draft,allowed,creditState,requiresFreshReview,busy,locked,onDraftChange,onCommand,expanded=false}:{
 expanded?:boolean;draft:ContractDraftV2;allowed:boolean;creditState:CreditState|null;requiresFreshReview:boolean;busy:boolean;locked:boolean;
 onDraftChange:(draft:ContractDraftV2)=>void;onCommand:(action:string,extra:Record<string,unknown>)=>Promise<void>;
}){
 const goToSection=useContext(ContractNavigationContext);
 const flight=useRef(false),[saving,setSaving]=useState(false);
 const definitiveDisabled=busy||locked||saving;
 async function save(action:string,extra:Record<string,unknown>){if(busy||locked||flight.current)return;flight.current=true;setSaving(true);try{await onCommand(action,extra);}finally{flight.current=false;setSaving(false);}}
 const panel='min-w-0 space-y-4 rounded-xl border border-border-color bg-surface p-4';
 const e=draft.economicTerms,rows=draft.paymentScheduleDraft;
 function navigate(){goToSection(creditState==='PENDING_DATA'?'data':'identity');}
 const preparationNotice=<p className="text-sm">Podés guardar el plan y las fechas del borrador. Estos datos no generan una deuda ni habilitan la emisión hasta completar la revisión y conformidad.</p>;
 const notice=<div className="space-y-2" data-testid="contract-credit-gate">{locked?<p>{draft.status==='READY_TO_FORMALIZE'?'La preparación técnica está cerrada. Usá «Volver a borrador» y registrá un motivo para editar.':'Los términos están congelados. No se permite editar estas condiciones.'}</p>:(busy||saving)?<p>Hay un guardado en curso. Esperá a que termine antes de editar las condiciones.</p>:!allowed?<><p className="font-semibold">{creditState?creditLabels[creditState]:'Consultando aprobación crediticia…'}</p><p>{requiresFreshReview?'La aprobación anterior ya no está vigente: cambiaron datos o documentos. Se requiere una nueva revisión.':creditState?creditNextAction[creditState]:'Completá la verificación antes de emitir los documentos definitivos.'}</p><button type="button" className={btn} onClick={navigate}>{creditState==='PENDING_DATA'?'Revisar datos pendientes':'Ir a documentación y evaluación'}</button></>:<p>{creditState==='APPROVED'?'Aprobación crediticia vigente.':'Operación histórica sin evaluación incorporada: se conserva su régimen de preparación; no acredita una nueva aprobación.'} La preparación contractual no habilita formalización ni cobranza productiva.</p>}</div>;
 return <>
 <details open={expanded||undefined} className={panel} data-testid="contract-economics"><summary className="min-h-11 cursor-pointer font-bold">Condiciones económicas</summary><div className="space-y-4 pt-3">{notice}
 {preparationNotice}
 <label className="block space-y-1"><span>Plan de cuotas del borrador</span><select aria-label="Plan de cuotas del borrador" className={control} disabled={definitiveDisabled} value={draft.economicTerms?.contractPlanCuotas??''} onChange={event=>{if(!definitiveDisabled&&event.target.value)void save('SET_CONTRACT_PLAN',{contractPlanCuotas:Number(event.target.value)});}}><option value="">Elegir explícitamente</option>{Array.from({length:18},(_,i)=><option key={i} value={i+1}>{i+1} cuotas</option>)}</select></label>
 {e&&<dl data-testid="contract-economic-values" className="grid gap-2 sm:grid-cols-2">{[['Capital aplicado a la compra',e.capitalAmount],['Servicio de Cuenta Hogar',e.serviceAmount],['Total del borrador',e.contractTotal],['Cantidad de cuotas',e.contractPlanCuotas],['Importe por cuota',e.contractInstallmentAmount]].map(([label,value])=><div key={label}><dt>{label}</dt><dd className="font-semibold">{label==='Cantidad de cuotas'?value:money(Number(value))}</dd></div>)}</dl>}
 {e&&<dl className="grid gap-2 sm:grid-cols-2 text-sm">{[['Total calculado por factor',e.factorComputedTotal],['Ajuste por redondeo',e.roundingAdjustment]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{money(Number(value))}</dd></div>)}</dl>}
 </div></details>
 <details open={expanded||undefined} className={panel} data-testid="contract-schedule"><summary className="min-h-11 cursor-pointer font-bold">Plan de pagos</summary><div className="space-y-4 pt-3">{notice}
 {preparationNotice}
 <label className="block"><span>Primera cuota</span><input aria-label="Primera cuota" className={control} disabled={definitiveDisabled} type="date" value={draft.firstInstallmentDueDate??''} onChange={event=>{if(!definitiveDisabled&&!flight.current)onDraftChange({...draft,firstInstallmentDueDate:event.target.value||null});}}/></label>
 <label className="block"><span>Día habitual</span><select aria-label="Día habitual" className={control} disabled={definitiveDisabled} value={draft.preferredMonthlyDueDay??''} onChange={event=>{if(!definitiveDisabled&&!flight.current)onDraftChange({...draft,preferredMonthlyDueDay:event.target.value?Number(event.target.value):null});}}><option value="">Seleccionar</option>{Array.from({length:31},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label>
 <button className={btn} disabled={definitiveDisabled||!draft.economicTerms} onClick={()=>{if(draft.economicTerms)void save('SET_PAYMENT_DATES',{firstInstallmentDueDate:draft.firstInstallmentDueDate,preferredMonthlyDueDay:draft.preferredMonthlyDueDay});}}>Guardar fechas y revisar cronograma</button>
 <table className="w-full text-left text-sm"><thead><tr><th>N°</th><th>Vencimiento</th><th>Importe</th></tr></thead><tbody>{rows.map(row=><tr key={row.installmentNumber}><td>{row.installmentNumber}</td><td>{row.dueDate.split('-').reverse().join('/')}</td><td>{money(row.amount)}</td></tr>)}</tbody></table><p>Sumatoria guardada: {money(rows.reduce((total,row)=>total+row.amount,0))}</p>
 </div></details>
 </>;
}
