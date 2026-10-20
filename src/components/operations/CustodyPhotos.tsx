'use client';
import { useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
export function CustodyPhotos({url,incidents,photos,onSaved}:{url:string;incidents:{id:string;reason:string}[];photos:{id:string;incidentId:string}[];onSaved:()=>void}) {
 const {user}=useAuth(),[incident,setIncident]=useState(''),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef<{file:File;incident:string;id:string}|null>(null);
 async function upload(e:React.FormEvent) {
  e.preventDefault();if(!file||!user||busy)return;setBusy(true);setError('');
  if(pending.current?.file!==file||pending.current.incident!==incident)pending.current={file,incident,id:crypto.randomUUID()};
  const form=new FormData();form.set('file',file);form.set('incidentId',incident);form.set('photoId',pending.current.id);
  try {const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${await user.getIdToken()}`},body:form});if(!r.ok)throw Error('No se confirmó la carga. Reintentá la misma fotografía.');pending.current=null;setFile(null);onSaved();}catch(e){setError(e instanceof Error?e.message:'Error de carga.');}finally{setBusy(false);}
 }
 async function view(id:string){if(!user)return;const popup=window.open('about:blank','_blank');try{const r=await fetch(`${url}?photoId=${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${await user.getIdToken()}`},cache:'no-store'});if(!r.ok)throw Error();const object=URL.createObjectURL(await r.blob());if(popup)popup.location.href=object;setTimeout(()=>URL.revokeObjectURL(object),60000);}catch{popup?.close();setError('Fotografía no disponible.');}}
 return <div className="space-y-3"><h4 className="font-bold">Fotografías privadas</h4>{photos.map(p=><button className="min-h-11 rounded border px-3" key={p.id} onClick={()=>void view(p.id)}>Ver fotografía · {incidents.find(i=>i.id===p.incidentId)?.reason||'Incidencia'}</button>)}{!!incidents.length&&<form onSubmit={e=>void upload(e)} className="grid gap-2"><label>Incidencia de la fotografía<select className="min-h-11 w-full rounded border bg-inherit" required value={incident} onChange={e=>setIncident(e.target.value)}><option value="">Seleccionar</option>{incidents.map(i=><option key={i.id} value={i.id}>{i.reason}</option>)}</select></label><label>Fotografía (JPEG, PNG o WebP, hasta 10 MiB)<input className="min-h-11 w-full" required type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><button disabled={busy} className="min-h-11 rounded border px-3">{busy?'Conservando…':'Conservar fotografía privada'}</button></form>}{error&&<p role="alert">{error}</p>}</div>;
}
