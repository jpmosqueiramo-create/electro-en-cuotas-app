"use client";
import {useRef,useState} from 'react';
import {useAuth} from './AuthProvider';
/** Reports/notes only: no client ledger calculations, uploads, or public download URLs. */
export function LegacyPortalAction({kind,id,source='solicitudes',enabled=true,onSaved}:{kind:'PAYMENT'|'NOTE'|'READ';id:string;source?:string;enabled?:boolean;onSaved?:()=>void}){
 const {user}=useAuth(),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[reports,setReports]=useState<{id:string;estadoValidacion:string;montoInformadoCentavos:number;moneda:string}[]>([]),flight=useRef(false),attempt=useRef<{payload:string;id:string}|null>(null);
 async function submit(form:HTMLFormElement){
 if(!user||flight.current)return;flight.current=true;setBusy(true);setMessage('');
 try{const values=new FormData(form);const amount=Number(values.get('amount'));
 if(kind==='PAYMENT'&&(!Number.isFinite(amount)||amount<=0||!Number.isSafeInteger(Math.round(amount*100))))throw Error('Ingresá un importe válido.');
 const payload=kind==='PAYMENT'?{solicitudId:id,montoInformadoCentavos:Math.round(amount*100),moneda:'ARS',medioPago:String(values.get('method')),referenciaTransferencia:String(values.get('reference')||'')}:kind==='NOTE'?{solicitudId:id,sourceCollection:source,texto:String(values.get('note')||'')}:{notificationId:id};
 const key=JSON.stringify(payload);if(!attempt.current||attempt.current.payload!==key)attempt.current={payload:key,id:crypto.randomUUID()};
 const endpoint=kind==='PAYMENT'?'/api/cliente/pagos-informados':kind==='NOTE'?'/api/afiliado/observaciones':'/api/afiliado/notificaciones';
 const response=await fetch(endpoint,{method:kind==='READ'?'PATCH':'POST',headers:{Authorization:'Bearer '+await user.getIdToken(),'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({...payload,commandId:attempt.current.id})});
 const result=await response.json();if(!response.ok||!(result.ok||result.success))throw Error(result.error||'No se confirmó el envío.');
 setMessage(kind==='PAYMENT'?'Informe de pago registrado. Consultá su estado; no acredita el pago por sí solo.':kind==='NOTE'?'Gestión registrada.':'Notificación leída.');onSaved?.();
 }catch(e){setMessage(e instanceof Error?e.message:'No se confirmó el envío. Reintentá.');}finally{flight.current=false;setBusy(false);}
 }
 if(!enabled)return <p className="text-xs text-zinc-400">Informar pagos requiere que Administración vincule expresamente esta operación histórica a tu cuenta. No se vincula por DNI o email.</p>;
 async function loadReports(){if(!user)return;setMessage('');try{const r=await fetch('/api/cliente/pagos-informados?solicitudId='+encodeURIComponent(id),{headers:{Authorization:'Bearer '+await user.getIdToken()},cache:'no-store'});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error);setReports(d.pagosInformados);setMessage(d.partial?'Historial parcial: consultá a Administración.':d.pagosInformados.length?'Estados registrados por Administración.':'No hay informes de pago registrados.');}catch{setMessage('No se pudo consultar los informes de pago. Reintentá.');}}
 return <form data-testid={'legacy-'+kind.toLowerCase()+'-'+id} onSubmit={e=>{e.preventDefault();void submit(e.currentTarget);}} className="space-y-2 text-sm min-w-0">
 {kind==='PAYMENT'&&<><p>Informar un pago realizado (sin adjunto). Administración lo verificará antes de acreditarlo.</p><label className="block">Importe en pesos<input name="amount" type="number" min="0.01" step="0.01" required className="block w-full min-h-11 bg-zinc-900 text-white border rounded p-2" style={{color:"#f4f4f5"}}/></label><label className="block">Medio de pago<select name="method" className="block w-full min-h-11 bg-zinc-900 text-white border rounded p-2" style={{color:"#f4f4f5"}}><option value="TRANSFERENCIA">Transferencia</option><option value="EFECTIVO">Efectivo</option></select></label><label className="block">Referencia del pago<input name="reference" maxLength={200} className="block w-full min-h-11 bg-zinc-900 text-white border rounded p-2" style={{color:"#f4f4f5"}}/></label></>}
 {kind==='NOTE'&&<label className="block">Gestión realizada<textarea name="note" required maxLength={2000} className="block w-full min-h-11 bg-zinc-900 text-white border rounded p-2" style={{color:"#f4f4f5"}}/></label>}
 <button disabled={busy} className="min-h-11 border rounded px-3 disabled:opacity-50">{busy?'Registrando…':kind==='PAYMENT'?'Informar pago':kind==='NOTE'?'Registrar gestión':'Marcar como leída'}</button>{kind==='PAYMENT'&&<><button type="button" className="min-h-11 border rounded px-3" onClick={()=>void loadReports()}>Consultar informes de pago</button><ul>{reports.map(r=><li key={r.id}>{r.moneda} {(r.montoInformadoCentavos/100).toLocaleString('es-AR')} · {r.estadoValidacion}</li>)}</ul><p className="text-xs">Estos estados no sustituyen un recibo. Para obtener el comprobante acreditado, contactá a Administración.</p></>}<p role="status">{message}</p>
 </form>;
}
