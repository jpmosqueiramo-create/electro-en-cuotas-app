'use client';
import { CuentaHogarLogo } from '@/components/CuentaHogarLogo';
import { useEffect, useRef, useState } from 'react';
import { getAuth,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendEmailVerification,signOut } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
interface Invitation {email:string;existingAccount:boolean;expiresAt:string}
const control='min-h-11 w-full min-w-0 rounded border bg-transparent px-3';
export function ClientActivationV2({invitationId}:{invitationId:string}) {
 const {user,loading}=useAuth(),[invitation,setInvitation]=useState<Invitation|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[mode,setMode]=useState<'create'|'login'>('create'),[verified,setVerified]=useState(false),[done,setDone]=useState(false);
 const secret=useRef(''),captured=useRef(false),commandId=useRef(''),flight=useRef(false);
 const url=`/api/public/client-invitations/${encodeURIComponent(invitationId)}`;
 useEffect(()=>{
  if(!captured.current){captured.current=true;secret.current=location.hash.slice(1);history.replaceState(null,'',location.pathname);}
  if(loading)return;
  let active=true;setInvitation(previous=>previous&&user?.email?.toLowerCase()===previous.email?previous:null);setVerified(false);
  void (async()=>{
   const headers:Record<string,string>={'Content-Type':'application/json'};
   if(user)headers.Authorization=`Bearer ${await user.getIdToken(true)}`;
   const r=await fetch(url,{method:'POST',headers,body:JSON.stringify({action:'INSPECT',token:secret.current})});
   if(!r.ok)throw Error();const i=await r.json() as Invitation;
   if(active){setInvitation(i);setMode(i.existingAccount?'login':'create');setMessage(user&&!user.emailVerified?'Verificá tu email y luego pulsá Ya verifiqué mi email.':'');}
  })().catch(()=>{if(active){setInvitation(null);setMessage('Invitación no disponible para esta sesión. Ingresá con la cuenta verificada vinculada. Si el enlace venció o fue revocado, consultá a Administración.');}});
  return()=>{active=false;};
 },[url,user,loading]);
 async function loginExisting(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(flight.current)return;flight.current=true;setBusy(true);setMessage('');
  const form=e.currentTarget,fields=new FormData(form);
  try{await signInWithEmailAndPassword(getAuth(app),String(fields.get('email')),String(fields.get('password')));form.reset();localStorage.setItem('userRole','cliente');}
  catch{setMessage('No se pudo ingresar. Usá la cuenta existente vinculada a esta invitación.');}
  finally{flight.current=false;setBusy(false);}
 }
 async function authenticate(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(!invitation||flight.current)return;flight.current=true;setBusy(true);setMessage('');
  const password=String(new FormData(e.currentTarget).get('password'));const form=e.currentTarget;
  try {const auth=getAuth(app);if(mode==='create')await createUserWithEmailAndPassword(auth,invitation.email,password);else await signInWithEmailAndPassword(auth,invitation.email,password);
   form.reset();localStorage.setItem('userRole','cliente');const current=auth.currentUser!;setVerified(current.emailVerified);
   if(!current.emailVerified){await sendEmailVerification(current);setMessage('Verificá tu email y luego pulsá Ya verifiqué mi email.');}
   else setMessage('Cuenta verificada. Confirmá la activación del servicio.');
  }catch{setMessage('No se pudo ingresar o crear la cuenta. Si ya tenés cuenta, elegí Ingresar con mi cuenta. Nunca compartas tu contraseña.');}finally{setBusy(false);flight.current=false;}
 }
 async function verify(){if(!user)return;setBusy(true);try{await user.reload();await user.getIdToken(true);setVerified(user.emailVerified);setMessage(user.emailVerified?'Email verificado. Podés confirmar la activación.':'El email todavía no está verificado.');}catch{setMessage('No se pudo verificar la cuenta.');}finally{setBusy(false);}}
 async function activate(){if(!user||flight.current)return;flight.current=true;setBusy(true);setMessage('');if(!commandId.current)commandId.current=crypto.randomUUID();
  try {const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await user.getIdToken(true)}`},body:JSON.stringify({action:'REDEEM',token:secret.current,commandId:commandId.current})});if(!r.ok)throw Error();secret.current='';setDone(true);setMessage('Servicio activado para tu cuenta.');}catch{setMessage('No se pudo confirmar la activación. Verificá la cuenta, el email y la vigencia del enlace. Reintentá el mismo envío.');}finally{setBusy(false);flight.current=false;}
 }
 const correctUser=!!user&&user.email?.toLowerCase()===invitation?.email;
 return <main data-testid="client-activation-v2" className="mx-auto max-w-lg space-y-4 p-4"><CuentaHogarLogo className="h-16"/><h1 className="text-2xl font-bold">Activar acceso a mis servicios</h1><p>La activación requiere una cuenta verificada y una invitación vigente. Administración debe haber confirmado la entrega y la documentación firmada.</p>{message&&<p role="status">{message}</p>}{!done&&!invitation&&!loading&&<form onSubmit={e=>void loginExisting(e)} className="grid gap-3"><p>Ingresá con tu cuenta existente. Este acceso no crea usuarios.</p><label>Email<input className={control} name="email" type="email" required autoComplete="username"/></label><label>Contraseña<input className={control} name="password" type="password" required autoComplete="current-password"/></label><button className="min-h-11 rounded border px-3" disabled={busy}>Ingresar con mi cuenta</button></form>}{done?<Link className="inline-flex min-h-11 items-center rounded border px-3" href="/cliente">Ir a mis servicios</Link>:invitation&&<><p>Cuenta invitada: {invitation.email}</p><p>Vencimiento: {new Date(invitation.expiresAt).toLocaleString('es-AR')}</p>{correctUser?<><p>Sesión iniciada con la cuenta invitada.</p>{!user?.emailVerified&&<button className="min-h-11 rounded border px-3" disabled={busy} onClick={()=>{if(user)void sendEmailVerification(user).then(()=>setMessage('Verificación enviada. Revisá tu correo.')).catch(()=>setMessage('No se pudo reenviar. Esperá antes de reintentar.'));}}>Reenviar verificación de email</button>}<button className="min-h-11 rounded border px-3" disabled={busy} onClick={()=>void verify()}>Ya verifiqué mi email</button><button className="min-h-11 rounded border px-3" disabled={busy||!(verified||user?.emailVerified)} onClick={()=>void activate()}>Confirmar activación del servicio</button></>:<><p>Establecé tu contraseña en Firebase Authentication. Cuenta Hogar no recibe la contraseña en su API de invitaciones.</p><form onSubmit={e=>void authenticate(e)} className="grid gap-3"><label>Email<input className={control} type="email" value={invitation.email} readOnly autoComplete="username"/></label><label>Contraseña elegida por vos<input className={control} name="password" type="password" minLength={mode==='create'?8:1} maxLength={mode==='create'?128:undefined} required autoComplete={mode==='create'?'new-password':'current-password'}/></label><button className="min-h-11 rounded border px-3" disabled={busy}>{mode==='create'?'Crear mi cuenta':'Ingresar con mi cuenta'}</button></form>{!invitation.existingAccount&&<button className="min-h-11 rounded border px-3" disabled={busy} onClick={()=>setMode(mode==='create'?'login':'create')}>{mode==='create'?'Ya tengo cuenta':'Necesito crear una cuenta'}</button>}</>}{user&&<button className="min-h-11 rounded border px-3" onClick={()=>void signOut(getAuth(app)).then(()=>setVerified(false))}>Cerrar sesión actual</button>}</>}</main>;
}
