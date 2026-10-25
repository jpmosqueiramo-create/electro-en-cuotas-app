"use client";
import {useEffect,useRef,useState} from 'react';
import type {User} from 'firebase/auth';
import {Trash2,RotateCcw} from 'lucide-react';
import {useAuth} from '@/components/AuthProvider';
import type {AdminRecordSubject,AdminRemovalPreview} from '@/lib/adminRecordRemoval';
const control='admin-control min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-40';
type Props={subject:AdminRecordSubject;removed?:boolean;disabled?:boolean;inline?:boolean;label?:string;onChanged:()=>Promise<void>|void};
export function AdminRecordRemoval(props:Props){const {user}=useAuth();return user?<RemovalAction key={user.uid+JSON.stringify(props.subject)} {...props} user={user}/>:null;}
function RemovalAction({subject,removed=false,disabled=false,inline=false,label,onChanged,user}:Props&{user:User}){
 const noun=subject.kind==='REQUEST'?'solicitud':subject.kind==='BUDGET'?'presupuesto':'contrato';
 const [open,setOpen]=useState(false),[preview,setPreview]=useState<AdminRemovalPreview|null>(null),[confirmed,setConfirmed]=useState(false),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),flight=useRef(false),pending=useRef<string|null>(null),abort=useRef<AbortController|null>(null);
 useEffect(()=>{if(open&&!inline)dialog.current?.showModal();},[open,inline]);
 useEffect(()=>()=>abort.current?.abort(),[]);
 async function request(body:string){const response=await fetch('/api/admin/registros/eliminacion',{method:'POST',cache:'no-store',headers:{Authorization:`Bearer ${await user.getIdToken()}`,'Content-Type':'application/json'},body,signal:abort.current?.signal});const value=await response.json();if(!response.ok)throw Error(value.error??'No se pudo completar la operación.');return value;}
 async function verify(){
  if(flight.current)return;abort.current?.abort();abort.current=new AbortController();flight.current=true;setBusy(true);setError('');setPreview(null);setConfirmed(false);pending.current=null;setOpen(true);
  try{setPreview((await request(JSON.stringify({mode:'PREVIEW',subject}))).preview);}catch(e){if(!abort.current.signal.aborted)setError(e instanceof Error?e.message:'Error de verificación.');}finally{flight.current=false;setBusy(false);}
 }
 async function execute(){
  if(!preview||!confirmed||!reason.trim()||flight.current)return;
  flight.current=true;setBusy(true);setError('');pending.current??=JSON.stringify({action:removed?'RESTORE':'REMOVE',subject,commandId:crypto.randomUUID(),fingerprint:preview.fingerprint,confirmed:true,reason:reason.trim()});
  try{await request(pending.current);await onChanged();dialog.current?.close();setOpen(false);}catch(e){setError(e instanceof Error?e.message:'No se confirmó la operación. Reintentá con los mismos datos.');}finally{flight.current=false;setBusy(false);}
 }
 const Tag=inline?'section':'dialog';
 return <><button type="button" data-testid={`remove-${subject.kind.toLowerCase()}`} disabled={disabled||busy} className={`${control} inline-flex items-center gap-2 border-red-200 text-red-800`} onClick={()=>void verify()}>{removed?<RotateCcw aria-hidden="true" size={16}/>:<Trash2 aria-hidden="true" size={16}/>} {label??`${removed?'Restaurar':'Eliminar'} ${noun}`}</button>
 {open&&<Tag ref={inline?undefined:dialog} aria-label={`${removed?'Restaurar':'Eliminar'} ${noun}`} data-testid="admin-removal-dialog" onCancel={e=>{if(busy)e.preventDefault();}} onClose={()=>{if(!busy)setOpen(false);}} className={inline?"space-y-3 rounded-xl border border-border-color p-4":"admin-menu fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_1.5rem)] max-w-xl overflow-y-auto rounded-2xl border border-border-color bg-surface p-5 text-text-primary shadow-xl"}>
  <div className="flex items-start justify-between gap-3"><h2 className="text-xl font-bold">{removed?'Restaurar':'Eliminar'} {noun}</h2><button type="button" disabled={busy} className={control} onClick={()=>{dialog.current?.close();setOpen(false);}}>Cancelar</button></div>
  {error&&<p role="alert" className="my-3 break-words text-red-800">{error}</p>}
  {busy&&!preview&&<p role="status">Verificando el registro y sus relaciones…</p>}
  {preview&&<div className="mt-4 space-y-4"><p>{removed?'Volverá a estar disponible en su bandeja. Se conserva la información original y la auditoría.':preview.description}</p>
   {!removed&&preview.resultState==='ARCHIVED'&&<p className="font-semibold">Se archivará: no se anulan documentos ni se eliminan deudas o pagos.</p>}
   <details><summary className="min-h-11 cursor-pointer py-2">Registros que se conservarán</summary><ul className="break-all text-xs">{preview.preservedPaths.map(path=><li key={path}>{path}</li>)}</ul></details>
   <label className="block text-sm font-semibold">Motivo<textarea data-testid="removal-reason" maxLength={500} disabled={busy} className="mt-2 min-h-20 w-full rounded-xl border border-border-color bg-surface p-3" value={reason} onChange={e=>{setReason(e.target.value);setConfirmed(false);pending.current=null;}}/></label>
   <label className="flex min-h-11 items-center gap-3"><input data-testid="removal-confirm" type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>Confirmo {removed?'restaurar':'retirar de la bandeja'} este {noun}.</label>
   <button type="button" data-testid="confirm-admin-removal" disabled={busy||!confirmed||!reason.trim()} onClick={()=>void execute()} className={`${control} border-red-200 text-red-800`}>{busy?'Procesando…':removed?'Confirmar restauración':preview.resultState==='ARCHIVED'?'Archivar y retirar de la bandeja':'Confirmar eliminación'}</button>
  </div>}
  {!preview&&!busy&&<button type="button" className={control} onClick={()=>void verify()}>Reintentar verificación</button>}
 </Tag>}
 </>;
}
