'use client';
import { useRef,useState } from 'react';
import { type ContractDraftV2 } from '@/lib/contractV2';
import { type CreditState } from '@/lib/creditReviewV2';
import { btn,control } from './ContractDataFields';
const money=(value:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(value);
export function ContractTermsFields({draft,busy,locked,onDraftChange,onCommand,expanded=false}:{
 expanded?:boolean;draft:ContractDraftV2;allowed:boolean;creditState:CreditState|null;requiresFreshReview:boolean;busy:boolean;locked:boolean;
 onDraftChange:(draft:ContractDraftV2)=>void;onCommand:(action:string,extra:Record<string,unknown>)=>Promise<void>;
}){
 const flight=useRef(false),[saving,setSaving]=useState(false);
 const definitiveDisabled=busy||locked||saving;
 async function save(action:string,extra:Record<string,unknown>){if(busy||locked||flight.current)return;flight.current=true;setSaving(true);try{await onCommand(action,extra);}finally{flight.current=false;setSaving(false);}}
 const panel='min-w-0 space-y-4 rounded-xl border border-border-color bg-surface p-4';
 const e=draft.economicTerms,rows=draft.paymentScheduleDraft;
 const preparationNotice=<p className="text-sm">Guardá el plan y los vencimientos acordados. Los importes se conservan desde el presupuesto aceptado; las cuotas se activan después de firmas y entrega.</p>;
 const notice=locked?<p>{draft.status==='READY_TO_FORMALIZE'?'Usá «Volver a borrador» para corregir los datos antes de emitir.':'Consultá la corrección de documentos antes de firma y entrega para conservar el número CH.'}</p>:(busy||saving)?<p>Guardando cambios…</p>:null;
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
