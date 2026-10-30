"use client";
import {useRef,useState} from 'react';
import {useAuth} from '@/components/AuthProvider';
import type {ContractDraftV2} from '@/lib/contractV2';
import {clientConformityMessage,clientConformityPhone,type ClientConformitySummary} from '@/lib/clientConformity';
import {btn,control} from './ContractDataFields';
export function ClientConformityLink({draft,disabled,onRefresh}:{draft:ContractDraftV2;disabled:boolean;onRefresh:()=>Promise<void>}){
 const {user}=useAuth(),flight=useRef(false),command=useRef<string|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[generated,setGenerated]=useState<{revision:number;text:string;link:string}|null>(null);
 const current=generated?.revision===draft.revision?generated:null;
 async function generate(){if(!user||flight.current)return;flight.current=true;setBusy(true);setError('');setNotice('');setGenerated(null);command.current??=crypto.randomUUID();
 try{const r=await fetch(`/api/admin/presupuestos-v2/${encodeURIComponent(draft.budgetId)}/versions/${draft.budgetVersion}/conformity-link`,{method:'POST',cache:'no-store',headers:{Authorization:`Bearer ${await user.getIdToken()}`,'Content-Type':'application/json'},body:JSON.stringify({commandId:command.current,expectedRevision:draft.revision})});const body=await r.json();if(!r.ok)throw Error(body.error);command.current=null;if(!body.secret){throw Error('El enlace ya se generó. Generá otro para obtener un nuevo mensaje.');}const link=`${location.origin}/confirmar-conformidad/${body.requestId}#${body.secret}`;setGenerated({revision:draft.revision,text:clientConformityMessage(body.summary as ClientConformitySummary,link),link});}
 catch(e){setError(e instanceof Error?e.message:'No se pudo generar el mensaje.');command.current=null;}finally{flight.current=false;setBusy(false);}}
 const phone=clientConformityPhone(draft.personalData.whatsapp);
 return <section data-testid="client-conformity-link" className="min-w-0 space-y-3 rounded-xl border border-border-color bg-background-main p-4"><h3 className="font-bold">Solicitar conformidad al cliente</h3><p>Generá el mensaje con las condiciones guardadas. El cliente las revisa en un enlace privado y confirma; su respuesta queda registrada automáticamente.</p>
 <button type="button" className={btn} disabled={disabled||busy} onClick={()=>void generate()}>{busy?'Generando…':current?'Generar nuevo mensaje':'Generar mensaje de conformidad'}</button>
 {current&&<><p className="text-sm">Enlace válido por 7 días. Generar otro revoca el anterior. Si modificás los datos, generá un nuevo mensaje.</p><label className="block space-y-2"><span>Mensaje para el cliente</span><textarea aria-label="Mensaje de conformidad para el cliente" readOnly className={`${control} min-h-64 w-full`} value={current.text}/></label><div className="flex flex-wrap gap-2"><button type="button" className={btn} onClick={()=>void navigator.clipboard.writeText(current.text).then(()=>setNotice('Mensaje copiado.')).catch(()=>setError('Seleccioná el mensaje y copialo manualmente.'))}>Copiar mensaje</button>{phone&&<a className={btn} target="_blank" rel="noreferrer" href={`https://wa.me/${phone}?text=${encodeURIComponent(current.text)}`}>Abrir WhatsApp con el mensaje</a>}<a className={btn} href={current.link} target="_blank" rel="noreferrer">Ver enlace</a></div></>}
 <button type="button" className={btn} disabled={disabled||busy} onClick={()=>void onRefresh()}>Actualizar respuesta del cliente</button>{notice&&<p role="status">{notice}</p>}{error&&<p role="alert" className="break-words text-red-700">{error}</p>}
 </section>;
}
