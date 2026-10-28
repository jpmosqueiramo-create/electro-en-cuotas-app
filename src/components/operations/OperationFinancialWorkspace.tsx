 'use client';
import {FirstInstallmentPaymentForm} from './FirstInstallmentPaymentForm';
import { FiscalOverview } from './FiscalOverview';
import { CuentaHogarLogo } from '@/components/CuentaHogarLogo';
import { argentinaBusinessDate } from '@/lib/productionV2/businessDate';
import { useCallback,useEffect,useRef,useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import type { FinancialPayment } from '@/lib/operationFinancialV2';
import type { financialSummary } from '@/lib/operationFinancialV2';
type Mode={cashOptions?:{affiliate:{name:string}|null};clientPortalStatus?:string;executionMode?:'PRODUCTION'|'EMULATOR_ONLY'};
type View=Mode&({active:false;operationId?:string;firstInstallmentCents?:number|null;mutationEnabled:boolean;blockReason:string}|({active:true;mutationEnabled:boolean;operationId:string;revision:number;nextCursor:string|null;contractNumber:string;blockReason:string;receipts:{receiptId:string;amountCents:number;effectiveDate:string;status:string;allocations:{installmentNumber:number;amountCents:number}[]}[];history?:FinancialPayment[]}&ReturnType<typeof financialSummary>));
const money=(n:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(n/100);
const control='admin-control min-h-11 w-full min-w-0 rounded-xl border border-border-color bg-surface px-3 py-2 text-text-primary [color-scheme:light]';
const button='admin-control min-h-11 rounded-xl border border-border-color bg-surface px-4 py-2 font-semibold text-brand-primary disabled:opacity-50';
const date=(value:string|null)=>value?value.slice(0,10).split('-').reverse().join('/'):'Sin registrar';
type WorkspaceProps={budgetId:string;version:number;role?:'ADMIN'|'AFFILIATE'|'CLIENT';operationId?:string;compact?:boolean;onBusyChange?:(busy:boolean)=>void};
export function OperationFinancialWorkspace({budgetId,version,role='ADMIN',operationId,compact=false,onBusyChange}:WorkspaceProps){const {user}=useAuth();return <FinancialSession key={`${user?.uid}-${budgetId}-${version}-${role}`} budgetId={budgetId} version={version} role={role} operationId={operationId} compact={compact} onBusyChange={onBusyChange}/>;}
function FinancialSession({budgetId,version,role,operationId,compact,onBusyChange}:WorkspaceProps&{role:'ADMIN'|'AFFILIATE'|'CLIENT';compact:boolean}){
 const {user}=useAuth(),[view,setView]=useState<View|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);const pending=useRef<{body:string;commandId:string;paymentId:string;expectedRevision:number}|null>(null),flight=useRef(false);
 useEffect(()=>{onBusyChange?.(busy);return ()=>onBusyChange?.(false);},[busy,onBusyChange]);
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
 const body={operationId:view.active?view.operationId:(operationId||view.operationId),expectedRevision:view.active?view.revision:0,action,data},key=JSON.stringify({operationId:body.operationId,action,data});if(pending.current?.body!==key)pending.current={body:key,commandId:crypto.randomUUID(),paymentId:crypto.randomUUID(),expectedRevision:body.expectedRevision};
 try{const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${await user.getIdToken()}`,'Content-Type':'application/json'},body:JSON.stringify({...body,expectedRevision:pending.current.expectedRevision,data:['CREDIT_PAYMENT','ACTIVATE_WITH_FIRST_PAYMENT'].includes(action)?{...data,paymentId:pending.current.paymentId}:data,commandId:pending.current.commandId})});const result=await r.json();if(!r.ok)throw Error(result.error||'No se confirmó el pago.');pending.current=null;if(['CREDIT_PAYMENT','ACTIVATE_WITH_FIRST_PAYMENT'].includes(action))setTab('RECIBOS');setPayOpen(false);setReversing(null);await load();window.dispatchEvent(new CustomEvent('operation-financial-updated',{detail:{budgetId,version}}));}catch(e){setError(e instanceof Error?e.message:'Error de persistencia.');}finally{flight.current=false;setBusy(false);}}
 const [tab,setTab]=useState<'CUOTAS'|'PAGOS'|'RECIBOS'>('CUOTAS'),[payOpen,setPayOpen]=useState(false),[paymentMethod,setPaymentMethod]=useState(role==='AFFILIATE'?'EFECTIVO':'TRANSFERENCIA'),[reversing,setReversing]=useState<string|null>(null);
 const real=view?.executionMode==='PRODUCTION';
 async function receipt(id:string){if(!user)return;const popup=window.open('about:blank','_blank');try{const r=await fetch(url+'?receipt='+encodeURIComponent(id),{cache:'no-store',headers:{Authorization:`Bearer ${await user.getIdToken()}`}});if(!r.ok)throw Error();const href=URL.createObjectURL(await r.blob());if(popup)popup.location.href=href;setTimeout(()=>URL.revokeObjectURL(href),60000);}catch{popup?.close();setError('No se pudo verificar el recibo acreditado.');}}
 return <section data-testid="financial-v2" aria-busy={busy} className="min-w-0 space-y-4 rounded-2xl border border-border-color bg-surface p-4 text-text-primary sm:p-5">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-bold text-brand-primary">Cuotas y pagos</h3><p className="text-sm text-text-secondary">Consultá el saldo, registrá lo cobrado y abrí sus recibos.</p></div><button type="button" className={button} onClick={()=>void load()} disabled={busy}>Actualizar estado financiero</button></div>
  {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-900">{error}</p>}
  {!view&&!error&&<p role="status">Consultando cuotas y pagos…</p>}
  {view&&<>
   {view.blockReason&&<p className="rounded-xl bg-background-main p-3 text-sm">{view.blockReason}</p>}
   {role==='ADMIN'&&view.clientPortalStatus&&<p className="text-sm text-text-secondary">{view.clientPortalStatus==='ACTIVE'?'Portal del cliente activo.':view.clientPortalStatus==='REVOKED'?'El acceso del cliente está revocado; no se reactiva con el pago.':'Para habilitar el portal, vinculá la cuenta existente y verificada del cliente en Cuenta del cliente.'}</p>}
   {!view.active?role!=='CLIENT'&&((real||compact||role==='AFFILIATE')?<FirstInstallmentPaymentForm cashOnly={role==='AFFILIATE'} affiliateName={view.cashOptions?.affiliate?.name} amountCents={view.firstInstallmentCents??null} disabled={busy||!view.mutationEnabled||!(operationId||view.operationId)} onConfirm={data=>command('ACTIVATE_WITH_FIRST_PAYMENT',data)}/>:<button disabled={busy||!view.mutationEnabled||!operationId} className={button} onClick={()=>void command('ACTIVATE',{})}>Activar cobranza demo</button>):<>
    <p data-testid="financial-v2-status" className="text-sm font-semibold">{view.contractNumber} · Revisión {view.revision} · {view.status==='PAGADA'?'Cancelado':view.status==='PARCIAL'?'Pago parcial':view.status}</p>
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
     {[['Saldo pendiente',money(view.balanceCents)],['Total cobrado',money(view.paidCents)],['Cuotas pagadas',`${view.paidInstallmentCount} / ${view.installments.length}`],['Cuotas vencidas',String(view.overdueCount)]].map(([label,value])=><div key={label} className={`min-w-0 rounded-xl bg-background-main p-3 ${label==='Saldo pendiente'||label==='Total cobrado'?'col-span-2 sm:col-span-1':''}`}><dt className="text-sm text-text-secondary">{label}</dt><dd className="break-words text-xl font-bold tabular-nums">{value}</dd></div>)}
    </dl>
    <p data-testid="financial-installment-summary" className="rounded-xl border border-border-color p-3 text-sm">{view.nextDueDate?<>Próxima cuota: <strong>{date(view.nextDueDate)} · {money(view.nextDueAmountCents)}</strong> · {view.pendingInstallmentCount} cuotas pendientes.</>:'Todas las cuotas están pagadas.'} Total contractual: {money(view.totalCents)}.</p>
    {role!=='CLIENT'&&<button type="button" aria-expanded={payOpen} style={{height:'auto',minHeight:50,padding:'12px 16px'}} className="btn-primary admin-control min-h-11 w-full sm:w-auto" disabled={busy||!view.mutationEnabled||view.balanceCents===0} onClick={()=>setPayOpen(!payOpen)}>{payOpen?'Cerrar carga de pago':role==='AFFILIATE'?'Registrar cobro en efectivo':'Registrar pago'}</button>}
    {role!=='CLIENT'&&payOpen&&<form data-testid="payment-form" className="grid min-w-0 gap-4 rounded-xl border border-brand-primary bg-background-main p-4 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();if(busy||!view.mutationEnabled)return;if(real&&!window.confirm('Confirmo que este importe fue efectivamente acreditado y corresponde a esta operación.'))return;const f=new FormData(e.currentTarget);void command('CREDIT_PAYMENT',{amountCents:Math.round(Number(f.get('amount'))*100),effectiveDate:String(f.get('date')),method:String(f.get('method')),reference:String(f.get('reference')),...(f.get('method')==='EFECTIVO'?{cashCustody:role==='AFFILIATE'?'AFFILIATE':String(f.get('cashCustody'))}:{})});}}>
     <h4 className="font-bold sm:col-span-2">{real?'Registrar pago recibido':'Registrar pago ficticio'}</h4>
     <label className="min-w-0 space-y-1"><span>Importe recibido</span><input aria-label="Importe acreditado" className={control} name="amount" type="number" min="0.01" step="0.01" max={view.balanceCents/100} required/></label>
     <label className="min-w-0 space-y-1"><span>Fecha del pago</span><input aria-label="Fecha efectiva" className={control} name="date" type="date" defaultValue={argentinaBusinessDate()} required/></label>
     <label className="min-w-0 space-y-1"><span>Medio de pago</span><select className={control} name="method" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}>{role==='ADMIN'&&<option value="TRANSFERENCIA">Transferencia</option>}<option value="EFECTIVO">Efectivo</option></select></label>
     <label className="min-w-0 space-y-1"><span>Referencia o comprobante</span><input aria-label="Referencia de acreditación" className={control} name="reference" required maxLength={200}/></label>
     {paymentMethod==='EFECTIVO'&&(role==='AFFILIATE'?<p className="rounded-xl bg-amber-50 p-3 text-amber-950 sm:col-span-2">Este efectivo queda bajo tu custodia, pendiente de rendición a Administración.</p>:<label className="sm:col-span-2">¿Quién conserva el efectivo?<select className={control} name="cashCustody" required defaultValue="ADMIN"><option value="ADMIN">Yo, Administración</option>{view.cashOptions?.affiliate&&<option value="AFFILIATE">Vendedor afiliado: {view.cashOptions.affiliate.name}</option>}</select></label>)}
     <p className="text-sm text-text-secondary sm:col-span-2">El importe se aplica a las cuotas pendientes en orden. Admitimos pagos parciales; no se crean cuotas nuevas.</p>
     <button style={{height:'auto',minHeight:50,padding:'12px 16px'}} className="btn-primary admin-control min-h-11 sm:col-span-2" disabled={busy||!view.mutationEnabled}>{busy?'Guardando pago…':real?'Confirmar pago acreditado':'Acreditar pago demo'}</button>
    </form>}
    <div className="flex flex-wrap gap-2" aria-label="Consultar cuenta">{(['CUOTAS','PAGOS','RECIBOS'] as const).filter(t=>role==='ADMIN'||t!=='PAGOS').map(t=><button type="button" key={t} aria-pressed={tab===t} className={`${button} ${tab===t?'ring-2 ring-brand-primary':''}`} onClick={()=>setTab(t)}>{{CUOTAS:'Cuotas',PAGOS:'Pagos',RECIBOS:'Recibos'}[t]}</button>)}</div>
    {tab==='CUOTAS'&&<div className="space-y-3"><h4 className="font-bold">Cronograma de cuotas</h4><div className="grid min-w-0 gap-3 sm:grid-cols-2">{view.installments.map(i=><article key={i.number} className={`min-w-0 rounded-xl border p-3 ${i.overdue?'border-red-200 bg-red-50':i.balanceCents===0?'border-emerald-200 bg-emerald-50':'border-border-color bg-background-main'}`}><div className="flex flex-wrap justify-between gap-2"><h5 className="font-bold">Cuota {i.number}</h5><span className="text-sm font-semibold">{i.balanceCents===0?'Pagada':i.overdue?'Vencida':i.paidCents>0?'Pago parcial':'Pendiente'}</span></div><p className="text-sm">Vence el {date(i.dueDate)}</p><p className="mt-2 text-lg font-bold tabular-nums">{money(i.balanceCents)} <span className="text-sm font-normal">pendientes</span></p><p className="text-sm">Importe {money(i.amountCents)} · Pagado {money(i.paidCents)}</p>{i.overdue&&<p className="text-sm font-semibold text-red-800">{i.daysPastDue} días de atraso</p>}</article>)}</div></div>}
    {tab==='RECIBOS'&&<div className="space-y-3"><CuentaHogarLogo className="h-12"/><h4 className="font-bold">Recibos de pago {real?'':'(demo)'}</h4><p className="text-sm text-text-secondary">Los recibos acreditan pagos; no sustituyen comprobantes fiscales.</p>{!view.receipts.length&&<p>Sin pagos acreditados.</p>}{view.receipts.map(r=><article key={r.receiptId} data-testid="financial-receipt" className="min-w-0 space-y-2 rounded-xl border border-border-color p-3"><div className="flex flex-wrap justify-between gap-2"><p className="text-lg font-bold">{money(r.amountCents)}</p><p className="text-sm">{r.status==='ACREDITADO'?'Acreditado':r.status==='REVERSADO'?'Revertido':r.status}</p></div><p>Pago del {date(r.effectiveDate)}</p>{r.allocations.map(a=><p className="text-sm" key={a.installmentNumber}>Cuota {a.installmentNumber}: {money(a.amountCents)}</p>)}<button type="button" className={button} onClick={()=>void receipt(r.receiptId)}>Abrir / imprimir recibo X</button></article>)}</div>}
    {tab==='PAGOS'&&role==='ADMIN'&&<div className="space-y-3"><h4 className="font-bold">Historial de pagos</h4>{!view.history?.length&&<p>No hay pagos registrados.</p>}{view.history?.map(p=><article key={p.id} data-testid="payment-record" className="min-w-0 space-y-3 rounded-xl border border-border-color p-3"><div className="flex flex-wrap justify-between gap-2"><p className="text-lg font-bold">{money(p.amountCents)}</p><span className={`rounded-full px-3 py-1 text-sm font-semibold ${p.reversedAt?'bg-amber-50 text-amber-950':'bg-emerald-50 text-emerald-900'}`}>{p.reversedAt?'Revertido':'Acreditado'}</span></div><p>{date(p.effectiveDate)} · {p.method==='EFECTIVO'?'Efectivo':'Transferencia'}</p><p className="break-words text-sm">Referencia: {p.reference}</p>{p.method==='EFECTIVO'&&<p className="text-sm">Custodia: {p.cashCustody?`${p.cashCustody.role==='ADMIN'?'Administración':'Vendedor afiliado'} · ${p.cashCustody.name}`:'Sin identificar (registro anterior)'}</p>}{p.reversedAt?<p className="break-words text-sm">Revertido el {date(p.reversedAt)} · {p.reversalReason}</p>:<button type="button" className={`${button} text-red-800`} disabled={busy||!view.mutationEnabled} aria-expanded={reversing===p.id} onClick={()=>setReversing(reversing===p.id?null:p.id)}>{reversing===p.id?'Cancelar reversa':'Revertir pago'}</button>}{reversing===p.id&&!p.reversedAt&&<form className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-3" onSubmit={e=>{e.preventDefault();if(busy||!view.mutationEnabled)return;if(real&&!window.confirm('Confirmo revertir este pago acreditado. El saldo se restituirá y la reversa quedará auditada.'))return;void command('REVERSE_PAYMENT',{paymentId:p.id,reason:String(new FormData(e.currentTarget).get('reason'))});}}><p className="text-sm text-red-900">Se restituirá el saldo de este pago. El registro y su recibo se conservarán con la reversa.</p><label className="block space-y-1"><span>Motivo de reversa</span><input className={control} required name="reason" maxLength={500}/></label><button className={button} disabled={busy||!view.mutationEnabled}>{real?'Confirmar reversa auditada':'Reversar pago demo'}</button></form>}<details><summary className="cursor-pointer text-sm text-text-secondary">Detalles del registro</summary><p className="break-all text-xs">Identificador: {p.id} · Registrado: {p.recordedAt} · Responsable: {p.actor}</p></details></article>)}</div>}
    {tab!=='CUOTAS'&&view.nextCursor&&<button disabled={busy} className={button} onClick={()=>void more()}>Ver más pagos y recibos</button>}
   </>}
  </>}
  {role==='ADMIN'&&!compact&&<FiscalOverview budgetId={budgetId} version={version}/>}
 </section>;
}
