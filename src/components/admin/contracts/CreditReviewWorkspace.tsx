'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import type { BudgetV2 } from '@/lib/budgetV2';
import { useAuth } from '@/components/AuthProvider';
import { BudgetAcceptanceDocumentation } from '@/components/admin/budgets/BudgetAcceptanceDocumentation';
import { DOCUMENT_LABELS,type DocumentType } from '@/lib/budgetAcceptanceV2';
import { creditLabels,creditNextAction,creditStates,type CreditState } from '@/lib/creditReviewV2';
import type { readCreditReview } from '@/lib/creditReviewV2Server';
import type { OperationIdentityReview } from '@/lib/operationIdentityReview';
import { OperationIdentityNotice } from './OperationIdentityNotice';
import { btn,control } from './ContractDataFields';
type View=Awaited<ReturnType<typeof readCreditReview>>;
export type CreditPreparation={identityReview?:OperationIdentityReview|null;allowed:boolean;state:CreditState|null;requiresFreshReview:boolean;checkedRevision:number};
export function CreditReviewWorkspace({budget,onUpdated,refreshKey=0}:{budget:BudgetV2;onUpdated:(status:CreditPreparation)=>void;refreshKey?:number}){
 const {user}=useAuth(),[view,setView]=useState<View|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[evidence,setEvidence]=useState(''),[resolution,setResolution]=useState(''),[notes,setNotes]=useState(''),[decision,setDecision]=useState<CreditState>('IN_REVIEW');
 const [profiles,setProfiles]=useState<{budgetId:string;version:number;name:string;verifiedAt:string}[]>([]),[selected,setSelected]=useState('');
 const [reviews,setReviews]=useState<Partial<Record<DocumentType,{attachmentId:string;status:string;validUntil:string;note:string}>>>({});
 const pending=useRef<{key:string;commandId:string}|null>(null),flight=useRef(false);
 const base=`/api/admin/presupuestos-v2/${encodeURIComponent(budget.id)}/versions/${budget.version}`;
 const request=useCallback(async(path:string,init:RequestInit={})=>{if(!user)throw Error('Ingresá nuevamente.');const h=new Headers(init.headers);h.set('Authorization',`Bearer ${await user.getIdToken()}`);const r=await fetch(base+'/'+path,{...init,headers:h,cache:'no-store'});if(!r.ok){const e=await r.json();throw Error(e.error||'No se pudo completar la revisión.');}return r;},[base,user]);
 const sequence=useRef({value:0});
 const load=useCallback(async()=>{const current=++sequence.current.value;try{const data:View=await(await request('credit-review')).json();if(current!==sequence.current.value)return;setView(data);setError('');onUpdated({identityReview:data.identityReview,allowed:!data.identityReview.requiresClarification&&(!data.review||data.approved),state:data.state,requiresFreshReview:data.requiresFreshReview,checkedRevision:refreshKey});}catch(error){if(current===sequence.current.value){setError('No se pudo consultar la evaluación. Reintentá.');onUpdated({allowed:false,state:null,requiresFreshReview:false,checkedRevision:refreshKey});}throw error;}},[request,onUpdated,refreshKey]);
 useEffect(()=>{const requests=sequence.current;const refresh=()=>{if(document.visibilityState==='visible')void load().catch(()=>{});};void load().catch(()=>{});window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);const timer=setInterval(refresh,60000);return()=>{requests.value++;clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[load]);
 async function act(work:()=>Promise<void>){if(flight.current)return;flight.current=true;setBusy(true);setError('');try{await work();}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.');}finally{flight.current=false;setBusy(false);}}
 async function command(action:string,extra:Record<string,unknown>){if(!view)return;const payload={action,expectedRevision:view.review?.revision??0,expectedProfileRevision:view.profile?.revision??0,...extra},key=JSON.stringify(payload);if(pending.current?.key!==key)pending.current={key,commandId:crypto.randomUUID()};await request('credit-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,commandId:pending.current.commandId})});pending.current=null;await load();}
 const statuses:Record<string,string>={MISSING:'Pendiente de carga',VERIFIED:'Verificado y vigente',OBSERVED:'Observado: solicitar actualización',EXPIRED:'Vencido: solicitar actualización'};
 return <section data-testid="credit-review" className="min-w-0 space-y-4 rounded-xl border border-border-color p-4">
 <h3 className="font-heading text-xl font-bold">Documentación y evaluación crediticia</h3>
 <p className="text-sm">Cada operación requiere una resolución administrativa propia.</p>
 {error&&<p role="alert" className="break-words text-red-700">{error}</p>}
 <button className={btn} disabled={busy} onClick={()=>void act(load)}>Actualizar evaluación</button>
 {!view?<p role="status">Consultando evaluación…</p>:<>
 {view.identityReview&&<OperationIdentityNotice review={view.identityReview}/>}
 <p role="status" className="font-semibold">{creditLabels[view.state]}</p><p>Próxima acción: {creditNextAction[view.state]} · Responsable: Administración</p>
 {view.identityMismatch&&<p role="alert">Los datos de identidad no coinciden con la carpeta. Solicitá aclaración o actualización del formulario; no se reutiliza documentación ni se fusionan personas.</p>}
 {view.requiresFreshReview&&<p role="alert">Los datos o documentos cambiaron. Revisá nuevamente antes de preparar el contrato.</p>}
 <p>Documentos pendientes: {view.documents.filter(d=>d.required&&d.status!=='VERIFIED').length}</p><p>Resolución: {view.review?.resolution||'Sin resolución registrada'}</p>
 {view.review?.notes&&<p className="whitespace-pre-wrap text-sm">Observaciones internas: {view.review.notes}</p>}
 {view.review&&<p className="text-sm">Revisado: {new Date(view.review.reviewedAt).toLocaleString('es-AR')} · Administración</p>}
 <fieldset disabled={busy} className="min-w-0 space-y-3"><legend className="font-semibold">Identidad y carpeta del cliente</legend>
 {view.profile?<p>Carpeta vinculada mediante verificación administrativa. Los archivos se reutilizan por referencia, sin copiarlos.</p>:<>
 <label className="block">Evidencia de verificación de identidad<textarea className={control} maxLength={1000} value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="Referencia interna de la verificación, sin repetir DNI ni datos sensibles"/></label>
 <button className={btn} disabled={!evidence.trim()} onClick={()=>void act(()=>command('VERIFY_IDENTITY',{evidence}))}>Verificar identidad y crear carpeta</button>
 <details><summary className="min-h-11 cursor-pointer">Cliente recurrente: vincular carpeta verificada</summary><p>Verificá expresamente que corresponde a la misma persona. No se busca ni fusiona por coincidencias.</p>
 <button className={btn} onClick={()=>void act(async()=>{setProfiles((await(await request('credit-profiles')).json()).profiles);})}>Consultar carpetas verificadas</button>
 <label className="block">Carpeta verificada<select className={control} value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Seleccionar después de verificar identidad</option>{profiles.map((p,i)=><option key={p.budgetId+':'+p.version} value={i}>{p.name} · verificada {new Date(p.verifiedAt).toLocaleDateString('es-AR')}</option>)}</select></label>
 <button className={btn} disabled={!evidence.trim()||selected===''} onClick={()=>void act(()=>{const p=profiles[Number(selected)];return command('LINK_PROFILE',{originBudgetId:p.budgetId,originVersion:p.version,evidence});})}>Confirmar vínculo verificado</button></details>
 </>}
 </fieldset>
 <div className="grid min-w-0 gap-3 sm:grid-cols-2">{view.documents.map(d=>{const form=reviews[d.type]??{attachmentId:d.attachmentId??'',status:'VERIFIED',validUntil:d.validUntil??'',note:''};const change=(patch:Partial<typeof form>)=>setReviews({...reviews,[d.type]:{...form,...patch}});return <article key={d.type} className="min-w-0 space-y-2 rounded-xl border border-border-color p-3">
 <h4 className="font-semibold">{d.type==='PAYSLIP'?'Recibo de sueldo o comprobante de ingresos':DOCUMENT_LABELS[d.type]} {d.required?'· Obligatorio':'· Opcional'}</h4><p>{statuses[d.status]}</p>{d.validUntil&&<p>Vigencia registrada: {d.validUntil}</p>}
 {d.originalName&&<button disabled={busy||view.identityMismatch||view.identityReview.requiresClarification} className={btn} onClick={()=>void act(async()=>{const response=await request('credit-document/'+d.type),url=URL.createObjectURL(await response.blob()),a=document.createElement('a');a.href=url;a.download='documento';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);})}>Consultar documento privado</button>}
 <details><summary className="min-h-11 cursor-pointer">Revisar documento o solicitar actualización</summary><fieldset disabled={busy||!view.profile||view.identityMismatch||view.identityReview.requiresClarification} className="min-w-0 space-y-2">
 <label className="block">Archivo a revisar<select className={control} value={form.attachmentId} onChange={e=>change({attachmentId:e.target.value})}><option value="">Seleccionar archivo cargado</option>{d.attachmentId&&!d.choices.some(a=>a.id===d.attachmentId)&&<option value={d.attachmentId}>Documento reutilizado</option>}{d.choices.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
 <label className="block">Resultado<select className={control} value={form.status} onChange={e=>change({status:e.target.value})}><option value="VERIFIED">Verificado</option><option value="OBSERVED">Observado: requiere actualización</option></select></label>
 <label className="block">Vigente hasta (si se verifica)<input type="date" className={control} value={form.validUntil} onChange={e=>change({validUntil:e.target.value})}/></label>
 <label className="block">Observación interna<textarea className={control} maxLength={1000} value={form.note} onChange={e=>change({note:e.target.value})}/></label>
 <button className={btn} disabled={!form.attachmentId||(form.status==='VERIFIED'&&!form.validUntil)||!form.note.trim()} onClick={()=>void act(()=>command('REVIEW_DOCUMENT',{type:d.type,...form,validUntil:form.validUntil||null}))}>Guardar revisión documental</button></fieldset></details>
 </article>;})}</div>
 <details><summary className="min-h-11 cursor-pointer">Cargar o consultar archivos de esta operación</summary><BudgetAcceptanceDocumentation budget={budget} documentationOnly onChanged={load}/><p>Después de cargar, revisá el archivo; la evaluación se actualiza automáticamente.</p></details>
 <details open={!view.approved}><summary className="min-h-11 cursor-pointer font-semibold">Registrar o revisar resolución crediticia</summary><fieldset disabled={busy} className="min-w-0 space-y-3"><legend className="font-semibold">Resolución crediticia manual</legend>
 <label className="block">Estado<select className={control} value={decision} onChange={e=>setDecision(e.target.value as CreditState)}>{creditStates.map(s=><option key={s} value={s}>{creditLabels[s]}</option>)}</select></label>
 <label className="block">Resolución<textarea className={control} maxLength={1000} value={resolution} onChange={e=>setResolution(e.target.value)}/></label>
 <label className="block">Observaciones internas<textarea className={control} maxLength={1000} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
 <button className={btn} disabled={!resolution.trim()||!notes.trim()||(view.identityReview.requiresClarification&&!['MORE_INFORMATION','PENDING_DATA'].includes(decision))} onClick={()=>void act(()=>command('DECIDE',{state:decision,resolution,notes}))}>Registrar resolución crediticia</button>
 </fieldset></details><p>No se aprueba automáticamente. La aprobación crediticia no habilita numeración, firma ni formalización productiva.</p>
 </>}
 </section>;
}
