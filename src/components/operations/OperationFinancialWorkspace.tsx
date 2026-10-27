 'use client';
import {FirstInstallmentPaymentForm} from './FirstInstallmentPaymentForm';
import { FiscalOverview } from './FiscalOverview';
import { CuentaHogarLogo } from '@/components/CuentaHogarLogo';
import { useCallback,useEffect,useRef,useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import type { FinancialPayment } from '@/lib/operationFinancialV2';
import type { financialSummary } from '@/lib/operationFinancialV2';
type Mode={clientPortalStatus?:string;executionMode?:'PRODUCTION'|'EMULATOR_ONLY'};
type View=Mode&({active:false;firstInstallmentCents?:number|null;mutationEnabled:boolean;blockReason:string}|({active:true;mutationEnabled:boolean;operationId:string;revision:number;nextCursor:string|null;contractNumber:string;blockReason:string;receipts:{receiptId:string;amountCents:number;effectiveDate:string;status:string;allocations:{installmentNumber:number;amountCents:number}[]}[];history?:FinancialPayment[]}&ReturnType<typeof financialSummary>));
const money=(n:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(n/100);
const control='min-h-11 w-full min-w-0 rounded border border-zinc-600 bg-zinc-900 px-3 text-white';
export function OperationFinancialWorkspace({budgetId,version,role='ADMIN',operationId,compact=false}:{budgetId:string;version:number;role?:'ADMIN'|'AFFILIATE'|'CLIENT';operationId?:string;compact?:boolean}){const {user}=useAuth();return <FinancialSession key={`${user?.uid}-${budgetId}-${version}-${role}`} budgetId={budgetId} version={version} role={role} operationId={operationId} compact={compact}/>;}
function FinancialSession({budgetId,version,role,operationId,compact}:{budgetId:string;version:number;role:'ADMIN'|'AFFILIATE'|'CLIENT';operationId?:string;compact:boolean}){
 const {user}=useAuth(),[view,setView]=useState<View|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);const pending=useRef<{body:string;commandId:string;paymentId:string;expectedRevision:number}|null>(null),flight=useRef(false);
 const url=role==='ADMIN'?`/api/admin/presupuestos-v2/${encodeURIComponent(budgetId)}/versions/${version}/financial`:`/api/${role==='AFFILIATE'?'afiliado/operaciones-v2':'cliente/servicios-v2'}/${encodeURIComponent(budgetId)}/${version}/financial`;
 const readSequence=useRef(0);
 const invalidateReads=useCallback(()=>{++readSequence.current;},[]);
 const load=useCallback(async()=>{
  if(!user)return;
  const sequence=++readSequence.current;
  try{
   const r=await fetch(url,{cache:'no-store',headers:{Authorization:`Bearer ${await user.getIdToken()}`}});
   if(!r.ok)throw Error();
   const next:View=await r.json();
   if(sequence!==readSequence.current)return;
   setView(next);setError('');
  }catch{
   if(sequence!==readSequence.current)return;
   setView(null);setError('No se pudo verificar el acceso financiero a esta operación.');
  }
 },[user,url]);
 useEffect(()=>{
  void load();
  const refresh=()=>{if(document.visibilityState==='visible'&&!flight.current)void load();};
  window.addEventListener('online',refresh);window.addEventListener('focus',refresh);window.addEventListener('operation-financial-updated',refresh);
  document.addEventListener('visibilitychange',refresh);
  const interval=window.setInterval(refresh,30000);
  return ()=>{invalidateReads();window.clearInterval(interval);window.removeEventListener('online',refresh);window.removeEventListener('focus',refresh);window.removeEventListener('operation-financial-updated',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[load,invalidateReads]);
 async function more(){
  if(!user||!view?.active||!view.nextCursor||busy||flight.current)return;
  flight.current=true;setBusy(true);const sequence=++readSequence.current;
  try{
   const r=await fetch(url+'?cursor='+encodeURIComponent(view.nextCursor),{cache:'no-store',headers:{Authorization:`Bearer ${await user.getIdToken()}`}});
   if(!r.ok)throw Error();const next:View=await r.json();
   if(sequence!==readSequence.current)return;
   if(!next.active||next.revision!==view.revision)throw Error();
   setView({...next,receipts:[...view.receipts,...next.receipts],history:role==='ADMIN'?[...(view.history||[]),...(next.history||[])]:undefined});
  }catch{if(sequence===readSequence.current)setError('El historial cambió o no pudo consultarse. Actualizá el estado financiero.');}
  finally{flight.current=false;setBusy(false);}
 }
 async function command(action:string,data:Record<string,unknown>){if(!user||flight.current||!view)return;flight.current=true;++readSequence.current;setBusy(true);setError('');
 const body={operationId:view.active?view.operationId:operationId,expectedRevision:view.active?view.revision:0,action,data},key=JSON.stringify({operationId:body.operationId,action,data});if(pending.current?.body!==key)pending.current={body:key,commandId:crypto.randomUUID(),paymentId:crypto.randomUUID(),expectedRevision:body.expectedRevision};
 try{const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${await user.getIdToken()}`,'Content-Type':'application/json'},body:JSON.stringify({...body,expectedRevision:pending.current.expectedRevision,data:['CREDIT_PAYMENT','ACTIVATE_WITH_FIRST_PAYMENT'].includes(action)?{...data,paymentId:pending.current.paymentId}:data,commandId:pending.current.commandId})});const result=await r.json();if(!r.ok)throw Error(result.error||'No se confirmó el pago.');pending.current=null;await load();window.dispatchEvent(new CustomEvent('operation-financial-updated',{detail:{budgetId,version}}));}catch(e){setError(e instanceof Error?e.message:'Error de persistencia.');}finally{flight.current=false;setBusy(false);}}
 const real=view?.executionMode==='PRODUCTION';
 async function receipt(id:string){if(!user)return;const popup=window.open('about:blank','_blank');try{const r=await fetch(url+'?receipt='+encodeURIComponent(id),{cache:'no-store',headers:{Authorization:`Bearer ${await user.getIdToken()}`}});if(!r.ok)throw Error();const href=URL.createObjectURL(await r.blob());if(popup)popup.location.href=href;setTimeout(()=>URL.revokeObjectURL(href),60000);}catch{popup?.close();setError('No se pudo verificar el recibo acreditado.');}}
 return <section data-testid="financial-v2" className="min-w-0 space-y-3 rounded-xl border border-zinc-600 p-4"><h3 className="text-lg font-bold">Primera cuota y pagos</h3><p className="text-sm">{real||compact?'Plan contractual guardado. Los pagos y las reversas requieren acreditación administrativa; no generan facturación ARCA.':'Cobranza productiva deshabilitada. Demostración con pagos ficticios exclusivamente en Emulator. Sin recargos automáticos.'}</p><button className="min-h-11 rounded border px-3" onClick={()=>void load()} disabled={busy}>Actualizar estado financiero</button>{error&&<p role="alert">{error}</p>}{view&&<><p>{view.blockReason}</p>{role==='ADMIN'&&view.clientPortalStatus&&<p role="status">{view.clientPortalStatus==='ACTIVE'?'Portal del cliente activo.':view.clientPortalStatus==='REVOKED'?'El acceso del cliente está revocado; no se reactiva con el pago.':'Para habilitar el portal, vinculá la cuenta existente y verificada del cliente en Cuenta del cliente.'}</p>}{!view.active?role==='ADMIN'&&((real||compact)?<FirstInstallmentPaymentForm amountCents={view.firstInstallmentCents??null} disabled={busy||!view.mutationEnabled||!operationId} onConfirm={data=>command('ACTIVATE_WITH_FIRST_PAYMENT',data)}/>:<button disabled={busy||!view.mutationEnabled||!operationId} className="min-h-11 rounded border px-3" onClick={()=>void command('ACTIVATE',{})}>Activar cobranza demo</button>):<><p data-testid="financial-v2-status">{view.contractNumber} · Revisión {view.revision} · {view.status}</p><p>Total contractual: {money(view.totalCents)} · Cuotas: {view.installments.length}</p><p>Acreditado: {money(view.paidCents)} · Saldo pendiente: {money(view.balanceCents)}</p><p data-testid="financial-installment-summary">Cuotas abonadas: {view.paidInstallmentCount} · Cuotas pendientes: {view.pendingInstallmentCount} · Próximo importe pendiente: {money(view.nextDueAmountCents)}</p><p>Cuotas vencidas: {view.overdueCount} · Próximo vencimiento: {view.nextDueDate||'Sin saldo pendiente'}</p><details><summary className="min-h-11 cursor-pointer font-semibold">Ver cronograma de cuotas</summary><div className="space-y-2">{view.installments.map(i=><article key={i.number} className="rounded border border-zinc-700 p-2"><h4>Cuota {i.number} · {i.dueDate}</h4><p>{money(i.amountCents)} · {i.status}</p><p>Abonado {money(i.paidCents)} · Pendiente {money(i.balanceCents)}{i.overdue?` · ${i.daysPastDue} días vencida`:''}</p></article>)}</div></details><CuentaHogarLogo className="h-12"/><h4 className="font-bold">Recibos de pagos acreditados {real?'':'(demo)'} · {view.receipts.length} visibles</h4>{!view.receipts.length&&<p>Sin pagos acreditados.</p>}{view.receipts.map(r=><article key={r.receiptId} data-testid="financial-receipt" className="break-words rounded border p-2"><p>{r.receiptId} · {r.status}</p><p>{money(r.amountCents)} · Fecha efectiva {r.effectiveDate}</p><button type="button" className="min-h-11 rounded border px-3" onClick={()=>void receipt(r.receiptId)}>Abrir recibo</button>{r.allocations.map(a=><p key={a.installmentNumber}>Cuota {a.installmentNumber}: {money(a.amountCents)}</p>)}</article>)}{view.nextCursor&&<button disabled={busy} className="min-h-11 rounded border px-3" onClick={()=>void more()}>Ver más pagos y recibos</button>}{role==='ADMIN'&&<><form className="grid min-w-0 gap-2" onSubmit={e=>{e.preventDefault();if(real&&!window.confirm('Confirmo que este importe fue efectivamente acreditado y corresponde a esta operación.'))return;const f=new FormData(e.currentTarget);void command('CREDIT_PAYMENT',{amountCents:Math.round(Number(f.get('amount'))*100),effectiveDate:String(f.get('date')),method:String(f.get('method')),reference:String(f.get('reference'))});}}><h4 className="font-bold">{real?'Acreditar pago recibido':'Acreditar pago ficticio'}</h4><label>Importe acreditado<input aria-label="Importe acreditado" className={control} name="amount" type="number" min="0.01" step="0.01" required/></label><label>Fecha efectiva<input aria-label="Fecha efectiva" className={control} name="date" type="date" required/></label><label>Medio<select className={control} name="method"><option>TRANSFERENCIA</option><option>EFECTIVO</option></select></label><label>Referencia de acreditación<input aria-label="Referencia de acreditación" className={control} name="reference" required maxLength={200}/></label><button className="min-h-11 rounded border px-3" disabled={busy||!view.mutationEnabled}>{real?'Confirmar pago acreditado':'Acreditar pago demo'}</button></form><h4 className="font-bold">Historial de pagos y reversas</h4>{view.history?.map(p=><article key={p.id} className="break-words rounded border p-2"><p>{p.id} · {money(p.amountCents)} · {p.method} · {p.reference}</p><p>Registrado: {p.recordedAt} · Actor: {p.actor}</p>{p.reversedAt?<p>Reversado: {p.reversedAt} · {p.reversedBy} · {p.reversalReason}</p>:<form className="grid gap-2" onSubmit={e=>{e.preventDefault();if(real&&!window.confirm('Confirmo revertir este pago acreditado. El saldo se restituirá y la reversa quedará auditada.'))return;void command('REVERSE_PAYMENT',{paymentId:p.id,reason:String(new FormData(e.currentTarget).get('reason'))});}}><label>Motivo de reversa<input className={control} required name="reason" maxLength={500}/></label><button className="min-h-11 rounded border px-3" disabled={busy||!view.mutationEnabled}>{real?'Confirmar reversa auditada':'Reversar pago demo'}</button></form>}</article>)}</>}</>}</>}{role==='ADMIN'&&!compact&&<FiscalOverview budgetId={budgetId} version={version}/>}</section>;
}
