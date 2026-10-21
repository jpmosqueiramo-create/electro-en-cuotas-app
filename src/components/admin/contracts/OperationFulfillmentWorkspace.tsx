'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { operationStatusLabel } from '@/lib/operationWorkspaceV2';
import { btn,control } from './ContractDataFields';
import { fulfillmentActions,type FulfillmentAction,type FulfillmentV2 } from '@/lib/operationFulfillmentV2';
import type { FulfillmentViewV2 } from '@/lib/operationFulfillmentV2Server';
const labels:Record<FulfillmentAction,string>={UPDATE_ORDER:'Datos del proveedor',PLACE_ORDER:'Registrar pedido realizado',CONFIRM_ORDER:'Confirmar costo y disponibilidad',READY_FOR_PICKUP:'Confirmar listo para retirar',UPDATE_AVAILABILITY:'Corregir disponibilidad confirmada',UPDATE_COST:'Actualizar costo real',CANCEL_ORDER:'Cancelar pedido',REOPEN_ORDER:'Reabrir pedido cancelado',PLAN_PICKUP:'Programar retiro',RECORD_PICKUP:'Registrar retiro real',RECEIVE:'Registrar recepción física',PLAN_TRIP:'Programar viaje',PLAN_DELIVERY:'Programar entrega',REPORT_INCIDENT:'Registrar incidencia',RESOLVE_INCIDENT:'Resolver incidencia',REJECT_DAMAGED:'Registrar rechazo por daños y custodia',RESUME_FROM_CUSTODY:'Reanudar desde custodia'};
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
function values(action:FulfillmentAction,s:FulfillmentV2){return Object.fromEntries(fields[action].map(f=>[f.key,String((s as unknown as Record<string,unknown>)[f.key]??'')]));}
const money=(n:number|null)=>n===null?'Sin confirmar':new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(n);
const date=(s:string|null)=>s?s.split('-').reverse().join('/'):'Sin registrar';
export function OperationFulfillmentWorkspace({budgetId,version}:{budgetId:string;version:number}) {
 const {user}=useAuth(),[view,setView]=useState<FulfillmentViewV2|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[action,setAction]=useState<FulfillmentAction>('UPDATE_ORDER'),[form,setForm]=useState<Record<string,string>>({});
 const flight=useRef(false),pending=useRef<{key:string;id:string}|null>(null);
 const url=`/api/admin/presupuestos-v2/${encodeURIComponent(budgetId)}/versions/${version}/fulfillment`;
 const request=useCallback(async(body?:unknown,before?:number)=>{
  if(!user)throw Error('Ingresá nuevamente.');
  const r=await fetch(url+(before?`?before=${before}`:''),{method:body?'POST':'GET',cache:'no-store',headers:{Authorization:`Bearer ${await user.getIdToken()}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const result=await r.json();if(!r.ok)throw Error(result.error);return result as FulfillmentViewV2;
 },[url,user]);
 useEffect(()=>{let live=true;void request().then(r=>{if(live){setView(r);setForm(values('UPDATE_ORDER',r.state));setError('');}}).catch(()=>{if(live)setError('No se pudo consultar proveedor y logística.');});return()=>{live=false;};},[request]);
 async function reload(){if(flight.current)return;setBusy(true);try{const r=await request();setView(r);setForm(values(action,r.state));setError('');}catch(e){setError(e instanceof Error?e.message:'No se pudo recargar.');}finally{setBusy(false);}}
 async function save(e:React.FormEvent){e.preventDefault();if(!view||flight.current)return;flight.current=true;setBusy(true);setError('');
  const data=Object.fromEntries(fields[action].map(f=>[f.key,f.type==='number'?Number(form[f.key]):f.type==='date'&&f.optional&&!form[f.key]?null:form[f.key]??'']));
  const body={action,operationId:view.identity.operationId,expectedRevision:view.state.revision,data},key=JSON.stringify(body);
  if(pending.current?.key!==key)pending.current={key,id:crypto.randomUUID()};
  try{await request({...body,commandId:pending.current.id});const r=await request();setView(r);setForm(values(action,r.state));pending.current=null;}catch(err){setError(err instanceof Error?err.message:'No se pudo confirmar el guardado. Reintentá.');}finally{flight.current=false;setBusy(false);}
 }
 async function more(){if(!view?.before||busy)return;setBusy(true);try{const r=await request(undefined,view.before);setView({...view,events:[...view.events,...r.events],before:r.before});}catch{setError('No se pudo cargar más historial.');}finally{setBusy(false);}}
 if(!view)return <section className="rounded-xl border border-border-color p-4" data-testid="fulfillment"><h3 className="font-bold">Proveedor y logística</h3><p>{error||'Consultando seguimiento…'}</p><button className={btn} onClick={()=>void reload()}>Reintentar consulta</button></section>;
 const s=view.state;
 return <section className="min-w-0 space-y-4 rounded-xl border border-border-color bg-surface p-4" data-testid="fulfillment"><h3 className="font-heading text-xl font-bold">Proveedor y logística</h3>
 <p>{s.productName}</p>
 <p data-testid="fulfillment-status">Pedido: {operationStatusLabel(s.providerState)} · Logística: {operationStatusLabel(s.logisticsState)} · Revisión {s.revision}</p>
 <p>Próximo paso: {view.nextStep}</p><p className="text-sm">Costos internos · Sólo Administración. El costo real no modifica el presupuesto ni las cuotas del cliente.</p>
 <details><summary className="min-h-11 cursor-pointer font-semibold">Costos, fechas y responsables registrados</summary><dl className="grid gap-3 sm:grid-cols-3">{[['Costo presupuestado',money(s.budgetedCost)],['Costo real confirmado',money(s.actualCost)],['Diferencia',money(view.costDifference)],['Proveedor',s.providerName||'Sin seleccionar'],['Referencia proveedor',s.providerReference||'Sin registrar'],['Pedido realizado',date(s.orderDate)],['Disponibilidad estimada',date(s.estimatedAvailabilityDate)],['Disponibilidad confirmada',date(s.confirmedAvailabilityDate)],['Retiro previsto',date(s.plannedPickupDate)],['Retiro real',date(s.actualPickupDate)],['Responsable retiro',s.pickupResponsible||'Sin asignar'],['Recepción real',date(s.actualReceiptDate)],['Custodia',`${s.custodyLocation||'Sin ubicación'} · ${s.custodian||'Sin responsable'}`],['Estado visual',s.visualCondition||'Sin inspección'],['Viaje',`${s.tripReference||'Sin programar'} · ${date(s.plannedTripDate)} · ${s.carrier}`],['Entrega estimada',date(s.estimatedDeliveryDate)],['Destino',s.destinationLocality||'Sin programar'],['Responsable entrega',s.deliveryResponsible||'Sin asignar']].map(([k,v])=><div className="min-w-0 break-words" key={k}><dt>{k}</dt><dd className="font-semibold">{v}</dd></div>)}</dl></details>
 {s.notes&&<p className="break-words">Observaciones: {s.notes}</p>}
 <p data-testid="delivery-blocked">{s.deliveryClosure==='DELIVERED_EMULATOR'?'Entrega física registrada exclusivamente en Emulator.':''} Entrega productiva V2 bloqueada: faltan los controles de firmas físicas del cliente en mandato, pagaré y remito. Programar no acredita retiro, recepción ni entrega real.</p>
 {!view.available&&<p>Operación histórica sin identidad registrada. Se conserva sólo lectura, sin migración automática.</p>}
 {error&&<p role="alert">{error}</p>}
 <button disabled={busy} className={btn} onClick={()=>void reload()}>Recargar seguimiento</button>
 <form onSubmit={e=>void save(e)}><fieldset disabled={busy||!view.available||s.deliveryClosure==='DELIVERED_EMULATOR'} className="grid min-w-0 gap-3 sm:grid-cols-2"><label className="block sm:col-span-2">Acción administrativa<select aria-label="Acción administrativa" className={control} value={action} onChange={e=>{const a=e.target.value as FulfillmentAction;setAction(a);setForm(values(a,s));}}>{fulfillmentActions.map(a=><option key={a} value={a}>{labels[a]}</option>)}</select></label>
 {fields[action].map(f=><label className="block min-w-0" key={f.key}>{f.label}{f.optional?' (opcional)':''}{f.type==='condition'?<select aria-label={f.label} className={control} required value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})}><option value="">Seleccionar</option><option value="SIN_DANOS_VISIBLES">Sin daños visibles</option><option value="DANOS_VISIBLES">Daños visibles</option><option value="PENDIENTE_REVISION">Pendiente de revisión</option></select>:f.type==='incident'?<select aria-label={f.label} className={control} required value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})}><option value="">Seleccionar incidencia</option>{s.incidents.filter(i=>!i.resolvedAt).map(i=><option key={i.id} value={i.id}>{i.description}</option>)}</select>:<input aria-label={f.label} className={control} required={!f.optional} maxLength={500} type={f.type||'text'} {...(f.type==='number'?{min:0,step:'0.01'}:{})} value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})}/>}</label>)}
 <button className={btn} type="submit">{busy?'Guardando…':'Confirmar acción operativa'}</button></fieldset></form>
 <h4 className="font-bold">Incidencias</h4>{!s.incidents.length?<p>Sin incidencias registradas.</p>:s.incidents.map(i=><article className="break-words border-b border-border-color py-2" key={i.id}><p>{i.resolvedAt?'Resuelta':'Pendiente'} · {i.description}</p><p>{i.resolution}</p></article>)}
 <details><summary className="min-h-11 cursor-pointer font-bold">Historial y auditoría</summary>{!view.events.length?<p>Sin cambios operativos guardados.</p>:view.events.map(e=><p className="break-words text-sm" key={e.commandId}>{e.at} · {e.actor} · {e.action} · Revisión {e.revision} · {e.from.provider}/{e.from.logistics} → {e.to.provider}/{e.to.logistics}</p>)}{view.before&&<button disabled={busy} className={btn} onClick={()=>void more()}>Ver historial anterior</button>}
 </details></section>;
}
