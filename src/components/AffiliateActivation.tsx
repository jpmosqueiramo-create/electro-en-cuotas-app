'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { getAuth, isSignInWithEmailLink, signInWithEmailLink, updatePassword } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { useAuth } from './AuthProvider';
import { CuentaHogarLogo } from './CuentaHogarLogo';
const control = 'admin-control min-h-11 w-full min-w-0 rounded-xl border border-border-color bg-surface p-3 text-text-primary';
export function AffiliateActivation({ vendorId, invitationId }: { vendorId: string; invitationId: string }) {
 const { user, loading, logout } = useAuth(), [busy, setBusy] = useState(false), [done, setDone] = useState(false), [error, setError] = useState(''), flight = useRef(false);
 async function activate(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault(); if (flight.current) return; flight.current = true; setBusy(true); setError('');
  const f = new FormData(e.currentTarget), email = String(f.get('email')).trim().toLowerCase(), password = String(f.get('password') || '');
  try {
   const auth = getAuth(app);
   if (auth.currentUser && auth.currentUser.email?.toLowerCase() !== email) throw Error('Cerrá la sesión actual antes de activar otra cuenta.');
   if (!auth.currentUser) {
    if (!isSignInWithEmailLink(auth, window.location.href)) throw Error('Abrí el enlace completo recibido por correo. Si venció, pedí una nueva invitación.');
    await signInWithEmailLink(auth, email, window.location.href);
   }
   const current = auth.currentUser;
   if (!current?.emailVerified) throw Error('No se pudo verificar el correo.');
   // The password is chosen by its holder and sent only to Firebase Auth.
   if (password) await updatePassword(current, password);
   const response = await fetch('/api/afiliado/activar', { method: 'POST', headers: { Authorization: `Bearer ${await current.getIdToken(true)}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ vendorId, invitationId }) });
   const result = await response.json(); if (!response.ok) throw Error(result.error);
   window.history.replaceState(null, '', window.location.pathname); setDone(true);
  } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo activar. Reintentá.'); } finally { flight.current = false; setBusy(false); }
 }
 return <main data-testid="affiliate-activation" className="mx-auto min-h-screen max-w-lg space-y-5 bg-background-main p-5 text-text-primary sm:p-8"><CuentaHogarLogo className="h-20"/><h1 className="text-2xl font-bold text-brand-primary">Tu cuenta de vendedor afiliado</h1><p>Confirmá el correo que recibió la invitación para entrar a tu panel.</p>{error && <p role="alert" className="break-words rounded-xl bg-red-50 p-3 text-red-900">{error}</p>}{done ? <><p role="status">Cuenta activada. Ya podés consultar tus ventas, comisiones, pagos y rendiciones.</p><Link className="btn-primary inline-flex min-h-11 items-center" href="/afiliado">Ir a mi panel</Link></> : <form onSubmit={activate} className="space-y-4"><fieldset disabled={busy || loading} className="space-y-4"><label className="block space-y-1"><span>Tu correo electrónico</span><input className={control} name="email" type="email" autoComplete="username" required defaultValue={user?.email ?? ''}/></label><label className="block space-y-1"><span>Contraseña para ingresar al panel</span><input className={control} name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128}/></label><p className="text-sm text-text-secondary">Elegí tu contraseña de acceso. Si ya tenés cuenta, podés usar la que quieras conservar. No compartas tu enlace ni contraseña.</p><button className="btn-primary min-h-11 w-full">{busy ? 'Activando…' : 'Activar mi cuenta'}</button></fieldset></form>}{user && !done && <button className={control} disabled={busy} onClick={() => void logout().catch(() => setError('No se pudo cerrar la sesión.'))}>Cerrar sesión actual</button>}</main>;
}
