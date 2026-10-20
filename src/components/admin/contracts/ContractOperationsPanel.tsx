'use client';
import {useEffect,useState,useRef} from 'react';
import {useAuth} from '@/components/AuthProvider';
import {operationReadiness,type ContractOperations,type SignatureKind} from '@/lib/contractDocuments/operations';
import {companyProfile,OVERDUE_SURCHARGE_POLICY_V1} from '@/lib/contractDocuments/businessPolicy';
import {btn,control} from './ContractDataFields';
const labels:Record<SignatureKind,string>={customerMandate:'Cliente · contrato de mandato',customerNote:'Cliente · pagaré',representative:'Representante LOOP',deliveryReceipt:'Remito / constancia de entrega'};
export function ContractOperationsPanel({budgetId,version}:{budgetId:string;version:number}){
 const {user}=useAuth(),[state,setState]=useState<(ContractOperations&{recordingEnabled:boolean})|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [kind,setKind]=useState<SignatureKind>('customerMandate'),[signedOn,setDate]=useState(''),[actualPlace,setPlace]=useState(''),[originalReference,setReference]=useState(''),[channel,setChannel]=useState('SYSTEM');
 const pending=useRef<{key:string;id:string}|null>(null),flight=useRef(false);
 const endpoint=`/api/admin/presupuestos-v2/${encodeURIComponent(budgetId)}/versions/${version}/contract/operations`;
 useEffect(()=>{const controller=new AbortController();void(async()=>{if(!user)return;const res=await fetch(endpoint,{headers:{Authorization:`Bearer ${await user.getIdToken()}`},cache:'no-store',signal:controller.signal});if(!res.ok)throw Error();setState(await res.json());})().catch(()=>{if(!controller.signal.aborted)setError('No se pudo consultar el seguimiento documental.');});return()=>controller.abort();},[endpoint,user]);
 async function command(action:string){
  if(!user||!state||flight.current)return;flight.current=true;setBusy(true);setError('');
  const payload={action,expectedRevision:state.revision,...(action==='RECORD_SIGNATURE'?{kind,signedOn,actualPlace,originalReference,channel}:{})};const key=JSON.stringify(payload);
  if(pending.current?.key!==key)pending.current={key,id:crypto.randomUUID()};
  try{const res=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${await user.getIdToken()}`,'Content-Type':'application/json'},body:JSON.stringify({...payload,commandId:pending.current.id})});const data=await res.json();if(!res.ok)throw Error(data.error);setState(data);pending.current=null;}catch(e){setError(e instanceof Error?e.message:'No se pudo registrar.');}finally{flight.current=false;setBusy(false);}
 }
 const readiness=state?operationReadiness(state):null;
 return <section className="min-w-0 space-y-3 rounded-xl border border-border-color bg-surface p-4" data-testid="contract-operations"><h3 className="font-bold">Firmas físicas, entrega y custodia</h3>
 <p>{companyProfile.legalName} · CUIT {companyProfile.taxId} · {companyProfile.legalAddress}. {companyProfile.representative}, {companyProfile.capacity}. Perfil comercial {companyProfile.version}; documentación y facultades pendientes de validación jurídica.</p>
 <p>Recargos automáticos por atraso: ninguno ({OVERDUE_SURCHARGE_POLICY_V1}). El saldo conserva el importe contractual menos pagos registrados. No se modifica cobranza histórica.</p>
 {error&&<p role="alert">{error}</p>}{state&&<><p>Residencia: {state.residenceLocality}. Lugar y fecha efectivos se registran por firma; no se deducen del congelamiento o generación PDF.</p>
 <ul>{(Object.keys(labels) as SignatureKind[]).map(k=><li key={k}>{labels[k]}: {state.signatures[k]?`Registrada · ${state.signatures[k]!.signedOn} · ${state.signatures[k]!.actualPlace}`:'PENDIENTE'}</li>)}</ul>
 <p>Entrega: {state.delivery.state==='DELIVERED'?'REALIZADA':readiness?.deliveryAllowed?'Firmas requeridas registradas':'BLOQUEADA · faltan firmas del cliente o remito'}. Custodia: {state.custody}. Formalización jurídica: PENDIENTE.</p>
 <p>La firma pendiente del representante no bloquea la entrega. Las fotografías deben ser legibles y remitirse por el sistema o WhatsApp; no sustituyen originales ni acreditan por sí solas formalización. Registrar sólo firmas físicas efectivamente constatadas.</p>
 <p>Registro operativo disponible sólo en Emulator con evidencia sintética durante revisión jurídica.</p>
 <fieldset disabled={busy||!state.recordingEnabled} className="space-y-2"><legend>Registrar evidencia de firma física</legend>
 <label className="block">Documento<select className={control} value={kind} onChange={e=>setKind(e.target.value as SignatureKind)}>{(Object.keys(labels) as SignatureKind[]).map(k=><option key={k} value={k}>{labels[k]}</option>)}</select></label>
 <label className="block">Fecha efectiva<input type="date" className={control} value={signedOn} onChange={e=>setDate(e.target.value)}/></label>
 <label className="block">Localidad efectiva<input className={control} value={actualPlace} onChange={e=>setPlace(e.target.value)} maxLength={150}/></label>
 <label className="block">Referencia opaca de evidencia / original (sin datos personales)<input className={control} value={originalReference} onChange={e=>setReference(e.target.value)} maxLength={100}/></label>
 <label className="block">Canal de remisión<select className={control} value={channel} onChange={e=>setChannel(e.target.value)}><option value="SYSTEM">Sistema</option><option value="WHATSAPP">WhatsApp</option></select></label>
 <button className={btn} disabled={!signedOn||!actualPlace.trim()||!originalReference||!!state.signatures[kind]} onClick={()=>void command('RECORD_SIGNATURE')}>Registrar firma física constatada</button>
 <div className="flex flex-wrap gap-2"><button className={btn} disabled={!readiness?.deliveryAllowed||state.delivery.state==='DELIVERED'} onClick={()=>void command('RECORD_DELIVERY')}>Registrar entrega realizada</button><button className={btn} disabled={!readiness?.deliveryAllowed||readiness.representativePending||state.custody==='ORIGINALS_RECEIVED'} onClick={()=>void command('RECEIVE_ORIGINALS')}>Registrar recepción de originales</button></div>
 </fieldset><p>No habilita firma de muestras, emisión definitiva ni FORMALIZED. La entrega registrada y documentación completa son estados independientes.</p></>}
 </section>;
}
