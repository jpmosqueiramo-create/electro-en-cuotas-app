'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { operationStatusLabel } from '@/lib/operationWorkspaceV2';
import { btn,control } from './ContractDataFields';
import { fulfillmentWorkflow } from '@/lib/operationFulfillmentPresentation';
import { nextFulfillment,type FulfillmentCommand,type FulfillmentAction,type FulfillmentV2 } from '@/lib/operationFulfillmentV2';
import type { FulfillmentViewV2 } from '@/lib/operationFulfillmentV2Server';
const labels:Record<FulfillmentAction,string>={UPDATE_ORDER:'Guardar datos del proveedor',PLACE_ORDER:'Registrar pedido realizado',CONFIRM_ORDER:'Confirmar costo y disponibilidad',READY_FOR_PICKUP:'Confirmar listo para retirar',UPDATE_AVAILABILITY:'Corregir disponibilidad confirmada',UPDATE_COST:'Actualizar costo real',CANCEL_ORDER:'Cancelar pedido',REOPEN_ORDER:'Reabrir pedido cancelado',PLAN_PICKUP:'Programar retiro',RECORD_PICKUP:'Registrar retiro real',RECEIVE:'Registrar recepción física',PLAN_TRIP:'Programar viaje',PLAN_DELIVERY:'Programar entrega',REPORT_INCIDENT:'Registrar incidencia',RESOLVE_INCIDENT:'Resolver incidencia',REJECT_DAMAGED:'Registrar rechazo por daños y custodia',RESUME_FROM_CUSTODY:'Reanudar desde custodia'};
type Field={key:string;label:string;type?:'date'|'number'|'condition'|'incident';optional?:boolean};
const fields:Record<FulfillmentAction,Field[]>={
 UPDATE_ORDER:[{key:'providerName',label:'Proveedor seleccionado'},{key:'providerReference',label:'Número de pedido / referencia del proveedor',optional:true},{key:'estimatedAvailabilityDate',label:'Disponibilidad estimada',type:'date',optional:true},{key:'notes',label:'Observaciones',optional:true}],
 PLACE_ORDER:[{key:'orderDate',label:'Fecha real del pedido',type:'date'}],
 CONFIRM_ORDER:[{key:'actualCost',label:'Costo real confirmado',type:'number'},{key:'confirmedAvailabilityDate',label:'Disponibilidad confirmada',type:'date'}],
 UPDATE_AVAILABILITY:[{key:'confirmedAvailabilityDate',label:'Disponibilidad confirmada',type:'date'},{key:'reason',label:'Motivo de corrección'}],
 READY_FOR_PICKUP:[],UPDATE_COST:[{key:'actualCost',label:'Costo real confirmado',type:'number'},{key:'reason',label:'Motivo del cambio'}],
 CANCEL_ORDER:[{key:'reason',label:'Motivo de cancelación'}],REOPEN_ORDER:[{key:'reason',label:'Motivo de reapertura'}],
 PLAN_PICKUP:[{key:'plannedPickupDate',label:'Retiro previsto',type:'date'},{key:'pickupResponsible',label:'Responsable de retiro'}],
 RECORD_PICKUP:[{key:'actualPickupDate',label:'Retiro real',type:'date'},{key:'pickupResponsible',label:'Responsable de retiro'}],
 RECEIVE:[{key:'actualReceiptDate',label:'Recepción real',type:'date'},{key:'custodyLocation',label:'Depósito / ubicación de custodia autorizada'},{key:'custodian',label:'Responsable de custodia'},{key:'visualCondition',label:'Estado visual',type:'condition'},{key:'notes',label:'Observaciones de recepción',optional:true}],
 PLAN_TRIP:[{key:'tripReference',label:'Referencia del viaje'},{key:'plannedTripDate',label:'Fecha prevista del viaje',type:'date'},{key:'carrier',label:'Transportista / responsable del viaje'}],
 PLAN_DELIVERY:[{key:'destinationLocality',label:'Localidad de destino'},{key:'estimatedDeliveryDate',label:'Entrega estimada',type:'date'},{key:'deliveryResponsible',label:'Responsable de entrega'}],
 REPORT_INCIDENT:[{key:'description',label:'Descripción de la incidencia'}],RESOLVE_INCIDENT:[{key:'incidentId',label:'Incidencia pendiente',type:'incident'},{key:'resolution',label:'Resolución administrativa'}],
 REJECT_DAMAGED:[{key:'actualDate',label:'Fecha real del rechazo',type:'date'},{key:'custodyLocation',label:'Ubicación del producto rechazado'},{key:'custodian',label:'Responsable de custodia'},{key:'description',label:'Daños visibles y observaciones'}],
 RESUME_FROM_CUSTODY:[{key:'reason',label:'Motivo de reanudación'}],
};
function values(action:FulfillmentAction,s:FulfillmentV2,locality=''){return Object.fromEntries(fields[action].map(f=>{const v=(s as unknown as Record<string,unknown>)[f.key];return [f.key,String(f.key==='destinationLocality'&&!v?locality:v??'')];}));}
const money=(n:number|null)=>n===null?'Sin confirmar':new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(n);
const date=(s:string|null)=>s?s.split('-').reverse().join('/'):'Sin registrar';
class FulfillmentHttpError extends Error { constructor(message:string,readonly status:number){super(message);} }
export function OperationFulfillmentWorkspace({budgetId,version,onChanged,destinationLocality=''}:{budgetId:string;version:number;onChanged?:()=>void;destinationLocality?:string}) {
 const {user}=useAuth(),[view,setView]=useState<FulfillmentViewV2|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [choice,setChoice]=useState<FulfillmentAction|null>(null),[drafts,setDrafts]=useState<Partial<Record<FulfillmentAction,Record<string,string>>>>({}),[pending,setPending]=useState<FulfillmentCommand|null>(null);
 const flight=useRef(false);
 const url=`/api/admin/presupuestos-v2/${encodeURIComponent(budgetId)}/versions/${version}/fulfillment`;
 const request=useCallback(async(body?:FulfillmentCommand,before?:number,signal?:AbortSignal)=>{
  if(!user)throw Error('Ingresá nuevamente.');
  const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)controller.abort();let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([(async()=>{
   const token=await user.getIdToken();if(controller.signal.aborted)throw Error('Consulta cancelada.');
   const r=await fetch(url+(before?`?before=${before}`:''),{method:body?'POST':'GET',cache:'no-store',signal:controller.signal,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
   const result=await r.json();if(!r.ok)throw new FulfillmentHttpError(result.error||'No se pudo guardar el cambio.',r.status);return result;
  })(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('La consulta demoró demasiado. Reintentá.'));},15000);})]);}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 },[url,user]);
 useEffect(()=>{const controller=new AbortController();if(user)void request(undefined,undefined,controller.signal).then((r:FulfillmentViewV2)=>{if(!controller.signal.aborted){setView(r);setError('');}}).catch(()=>{if(!controller.signal.aborted)setError('No se pudo consultar proveedor y logística. Reintentá la consulta.');});return()=>controller.abort();},[request,user]);
 async function reload(){if(flight.current||pending)return;flight.current=true;setBusy(true);try{const r:FulfillmentViewV2=await request();setView(r);setError('');onChanged?.();}catch(e){setError(e instanceof Error?e.message:'No se pudo actualizar.');}finally{flight.current=false;setBusy(false);}}
 async function execute(command:FulfillmentCommand){
  if(flight.current)return;flight.current=true;setBusy(true);setError('');setMessage('');setPending(command);
  let acknowledged=false;
  try{
   const result:{state:FulfillmentV2}=await request(command);acknowledged=true;
   const r:FulfillmentViewV2=await request();
   if(r.identity.operationId!==command.operationId||r.state.revision<result.state.revision)throw Error('El seguimiento todavía no pudo confirmarse.');
   setView(r);setPending(null);setChoice(null);setDrafts(previous=>{const next={...previous};delete next[command.action];return next;});setMessage('Cambio guardado correctamente');onChanged?.();
  }catch(err){
   if(!acknowledged&&err instanceof FulfillmentHttpError&&err.status>=400&&err.status<500){
    setPending(null);setError(err.message);
    // Refresh the revision after a definitive rejection, preserving every typed field.
    try{const r:FulfillmentViewV2=await request();setView(r);if(err.message.includes('Conflicto de revisión'))setError('Otra persona actualizó el seguimiento. Ya consultamos la revisión vigente; tus datos siguen en el formulario. Revisalos y volvé a confirmar.');onChanged?.();}catch{/* Keep original form and the explicit rejection. */}
   }else setError('No pudimos confirmar el resultado. No vuelvas a cargar el cambio: usá Reintentar confirmación para recuperar el mismo comando.');
  }finally{flight.current=false;setBusy(false);}
 }
 function save(e:React.FormEvent,a:FulfillmentAction){e.preventDefault();if(!view||flight.current||pending)return;
  const form=drafts[a]??values(a,view.state,destinationLocality),data=Object.fromEntries(fields[a].map(f=>[f.key,f.type==='number'?Number(form[f.key]):f.type==='date'&&f.optional&&!form[f.key]?null:form[f.key]??'']));
  const command:FulfillmentCommand={action:a,operationId:view.identity.operationId,expectedRevision:view.state.revision,data,commandId:crypto.randomUUID()};
  try{nextFulfillment(view.state,command,'validation-only',new Date().toISOString());}catch(err){setMessage('');setError(err instanceof Error?err.message:'Revisá los datos requeridos.');return;}
  void execute(command);
 }
 async function more(){if(!view?.before||busy||pending)return;setBusy(true);try{const r:FulfillmentViewV2=await request(undefined,view.before);setView({...view,events:[...view.events,...r.events],before:r.before});}catch{setError('No se pudo cargar más historial.');}finally{setBusy(false);}}
 if(!view)return <section className="rounded-xl border border-border-color p-4" data-testid="fulfillment"><h3 className="font-bold">Proveedor y logística</h3><p role="status">{error||'Consultando seguimiento…'}</p><button disabled={busy} className={btn} onClick={()=>void reload()}>Reintentar consulta</button></section>;
 const s=view.state,workflow=fulfillmentWorkflow(s),secondary=workflow.available.filter(a=>a!==workflow.primary),selected=choice&&secondary.includes(choice)?choice:null;
 const disabled=busy||!!pending||!view.available||s.deliveryClosure==='DELIVERED_EMULATOR';
 const renderForm=(a:FulfillmentAction)=>{const form=drafts[a]??values(a,s,destinationLocality);return <form data-testid={`fulfillment-action-${a}`} onSubmit={e=>save(e,a)}><fieldset disabled={disabled} className="grid min-w-0 gap-3 sm:grid-cols-2"><legend className="mb-3 font-semibold">{labels[a]}</legend>
 {fields[a].map(f=><label className="block min-w-0" key={f.key}>{f.label}{f.optional?' (opcional)':''}{f.type==='condition'||f.type==='incident'?<select aria-label={f.label} className={control} required value={form[f.key]||''} onChange={e=>setDrafts({...drafts,[a]:{...form,[f.key]:e.target.value}})}><option value="">Seleccionar</option>{f.type==='condition'?<><option value="SIN_DANOS_VISIBLES">Sin daños visibles</option><option value="DANOS_VISIBLES">Daños visibles</option><option value="PENDIENTE_REVISION">Pendiente de revisión</option></>:s.incidents.filter(i=>!i.resolvedAt).map(i=><option key={i.id} value={i.id}>{i.description}</option>)}</select>:<input aria-label={f.label} className={control} required={!f.optional} maxLength={500} type={f.type||'text'} {...(f.type==='number'?{min:0,step:'0.01'}:{})} value={form[f.key]??''} onChange={e=>setDrafts({...drafts,[a]:{...form,[f.key]:e.target.value}})}/>}</label>)}
 <button className="btn-primary min-h-11 whitespace-normal sm:col-span-2" type="submit">{busy?'Guardando…':labels[a]}</button></fieldset></form>;};
 const milestone=s.estimatedDeliveryDate?['Entrega estimada',s.estimatedDeliveryDate]:s.plannedTripDate?['Viaje previsto',s.plannedTripDate]:s.actualReceiptDate?['Recepción real',s.actualReceiptDate]:s.actualPickupDate?['Retiro real',s.actualPickupDate]:s.plannedPickupDate?['Retiro previsto',s.plannedPickupDate]:s.confirmedAvailabilityDate?['Disponibilidad confirmada',s.confirmedAvailabilityDate]:s.estimatedAvailabilityDate?['Disponibilidad estimada',s.estimatedAvailabilityDate]:['Fecha real del pedido',s.orderDate];
 const responsible=s.deliveryResponsible||s.carrier||s.custodian||s.pickupResponsible;
 return <section data-revision={s.revision} className="min-w-0 space-y-5 rounded-xl border border-border-color bg-surface p-4" data-testid="fulfillment">
 <header className="min-w-0 space-y-2" aria-label="Estado actual del producto"><h3 className="font-heading text-xl font-bold">Estado actual</h3><p className="break-words font-semibold">{s.productName}</p><p className="break-words">Proveedor: {s.providerName||'Pendiente de selección'}</p><p data-testid="fulfillment-status">Pedido: {operationStatusLabel(s.providerState)} · Logística: {operationStatusLabel(s.logisticsState)}</p><p>Próximo paso: {workflow.primary?labels[workflow.primary]:workflow.notice||view.nextStep}</p><p>{milestone[0]}: {date(milestone[1])}{responsible&&<> · Responsable: {responsible}</>}</p></header>
 {message&&<p role="status" data-testid="fulfillment-saved" className="rounded-xl border border-border-color bg-background-main p-3 font-semibold">{message}</p>}
 {error&&<p role="alert" className="break-words rounded-xl border border-red-300 p-3">{error}</p>}
 {pending&&!busy&&<button className="btn-primary min-h-11" onClick={()=>void execute(pending)}>Reintentar confirmación</button>}
 {!view.available&&<p>Operación histórica sin identidad registrada. Se conserva sólo lectura, sin migración automática.</p>}
 <section aria-label="Próxima acción logística" className="min-w-0 space-y-3 rounded-xl border border-border-color p-4"><h4 className="font-heading text-lg font-bold">Próxima acción</h4>{workflow.notice&&<p>{workflow.notice}</p>}{workflow.primary&&renderForm(workflow.primary)}<p className="text-sm">Programar una fecha no registra un retiro, una recepción ni una entrega física.</p></section>
 <details data-testid="fulfillment-more"><summary className="min-h-11 cursor-pointer font-semibold">Más opciones</summary><div className="min-w-0 space-y-4 pt-3">
 <label className="block">Otra acción disponible<select aria-label="Otra acción disponible" className={control} disabled={disabled} value={selected??''} onChange={e=>{setChoice(e.target.value as FulfillmentAction||null);setMessage('');}}><option value="">Elegí qué necesitás hacer</option>{secondary.map(a=><option key={a} value={a}>{labels[a]}</option>)}</select></label>{selected&&renderForm(selected)}
 <button disabled={busy||!!pending} className={btn} onClick={()=>void reload()}>Actualizar seguimiento</button>
 <details><summary className="min-h-11 cursor-pointer font-semibold">Costos, fechas y responsables registrados</summary><p className="text-sm">Costos internos · Sólo Administración. El costo real no modifica el presupuesto ni las cuotas del cliente.</p><dl className="grid min-w-0 gap-3 sm:grid-cols-2">{[['Costo presupuestado',money(s.budgetedCost)],['Costo real confirmado',money(s.actualCost)],['Diferencia',money(view.costDifference)],['Proveedor',s.providerName||'Sin seleccionar'],['Referencia proveedor',s.providerReference||'Sin registrar'],['Pedido realizado',date(s.orderDate)],['Disponibilidad estimada',date(s.estimatedAvailabilityDate)],['Disponibilidad confirmada',date(s.confirmedAvailabilityDate)],['Retiro previsto',date(s.plannedPickupDate)],['Retiro real',date(s.actualPickupDate)],['Responsable retiro',s.pickupResponsible||'Sin asignar'],['Recepción real',date(s.actualReceiptDate)],['Custodia',`${s.custodyLocation||'Sin ubicación'} · ${s.custodian||'Sin responsable'}`],['Estado visual',s.visualCondition||'Sin inspección'],['Viaje',`${s.tripReference||'Sin programar'} · ${date(s.plannedTripDate)} · ${s.carrier}`],['Entrega estimada',date(s.estimatedDeliveryDate)],['Destino',s.destinationLocality||'Sin programar'],['Responsable entrega',s.deliveryResponsible||'Sin asignar']].map(([k,v])=><div className="min-w-0 break-words" key={k}><dt>{k}</dt><dd className="font-semibold">{v}</dd></div>)}</dl></details>
 <details><summary className="min-h-11 cursor-pointer font-semibold">Incidencias</summary>{!s.incidents.length?<p>Sin incidencias registradas.</p>:s.incidents.map(i=><article className="break-words border-b border-border-color py-2" key={i.id}><p>{i.resolvedAt?'Resuelta':'Pendiente'} · {i.description}</p><p>{i.resolution}</p></article>)}</details>
 <details><summary className="min-h-11 cursor-pointer font-semibold">Historial y auditoría</summary><p>Revisión {s.revision}</p>{!view.events.length?<p>Sin cambios operativos guardados.</p>:view.events.map(e=><p className="break-words text-sm" key={e.commandId}>{e.at} · {e.actor} · {labels[e.action as FulfillmentAction]??e.action} · Revisión {e.revision} · {operationStatusLabel(e.from.provider)}/{operationStatusLabel(e.from.logistics)} → {operationStatusLabel(e.to.provider)}/{operationStatusLabel(e.to.logistics)}</p>)}{view.before&&<button disabled={busy||!!pending} className={btn} onClick={()=>void more()}>Ver historial anterior</button>}</details>
 </div></details>
 <p data-testid="delivery-blocked" className="text-sm text-text-secondary">{s.deliveryClosure==='DELIVERED_EMULATOR'?'Entrega física registrada exclusivamente en Emulator. ':''}Entrega productiva V2 bloqueada: se requieren las firmas físicas del cliente en mandato, pagaré y remito. No se habilitan formalización ni cobranza.</p>
 </section>;
}
