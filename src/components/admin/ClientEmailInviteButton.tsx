'use client';
import {useRef,useState} from 'react';
import {useAuth} from '@/components/AuthProvider';
import type {ClientEmailTarget} from '@/lib/clientEmailInvitations';
export function ClientEmailInviteButton({target}:{target:ClientEmailTarget}){const {user}=useAuth();return <Session key={`${user?.uid??'anonymous'}:${JSON.stringify(target)}`} target={target}/>;}
function Session({target}:{target:ClientEmailTarget}){
 const {user}=useAuth(),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),flight=useRef(false),command=useRef('');
 async function send(){if(!user||flight.current)return;flight.current=true;setBusy(true);setError('');setMessage('');if(!command.current)command.current=crypto.randomUUID();
 try{const r=await fetch('/api/admin/clientes/invitaciones',{method:'POST',headers:{Authorization:`Bearer ${await user.getIdToken()}`,'Content-Type':'application/json'},body:JSON.stringify({target,commandId:command.current})}),result=await r.json();if(!r.ok)throw Error(result.error||'No se confirmó el envío.');command.current='';if(result.state==='SENT')setMessage('Invitación enviada. El cliente debe abrir el correo, elegir su contraseña y entrar a su panel.');else setError('El correo no tiene envío confirmado. El registro se conserva. Si no llegó, reintentá en un minuto.');}
 catch(e){setError(e instanceof Error?e.message:'No se confirmó la invitación. Reintentá el mismo envío.');}finally{flight.current=false;setBusy(false);}}
 return <div data-testid="client-email-invite" className="min-w-0 space-y-2"><button type="button" className="admin-control min-h-11 rounded-xl border border-border-color bg-surface px-4 py-2 font-semibold text-brand-primary disabled:opacity-50" disabled={busy||!user} onClick={()=>void send()}>{busy?'Enviando…':'Enviar acceso al panel por correo'}</button>{message&&<p role="status" className="break-words rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}{error&&<p role="alert" className="break-words rounded-xl bg-red-50 p-3 text-sm text-red-900">{error}</p>}</div>;
}
