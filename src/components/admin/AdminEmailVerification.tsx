'use client';

import { useEffect, useRef, useState } from 'react';
import { getAuth, getIdToken, reload, sendEmailVerification, type User } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { isAdminEmail } from '@/lib/adminIdentity';

function errorMessage(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
  if (code === 'auth/too-many-requests') return 'Firebase limitó los intentos. Esperá unos minutos antes de volver a enviar el correo.';
  if (code === 'auth/network-request-failed') return 'No pudimos confirmar la respuesta por un problema de conexión. Revisá tu correo antes de reintentar.';
  if (['auth/user-token-expired', 'auth/invalid-user-token', 'auth/user-disabled', 'auth/requires-recent-login'].includes(String(code))) return 'No pudimos verificar tu sesión. Volvé a ingresar con tu cuenta administrativa.';
  return 'No pudimos completar la verificación. Intentá nuevamente más tarde.';
}

/** Uses only the signed-in user's official Auth methods; never updates an administrative record. */
export function AdminEmailVerification({ user, onVerified }: { user: User; onVerified: () => void }) {
  const [busy, setBusy] = useState<'send' | 'check' | null>(null);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [verified, setVerified] = useState(false);
  const flight = useRef(false), alive = useRef(true);
  const coolingDown = retrySeconds > 0;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!coolingDown) return;
    const timer = setInterval(() => setRetrySeconds(seconds => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [coolingDown]);

  const current = () => alive.current && getAuth(app).currentUser === user && isAdminEmail(user.email);
  async function perform(action: 'send' | 'check') {
    if (flight.current || !current() || (action === 'send' && coolingDown)) return;
    flight.current = true; setBusy(action); setFailed(false); setMessage('');
    try {
      if (action === 'send') {
        if (user.emailVerified) {
          setMessage('Tu correo ya figura verificado. Pulsá «Ya verifiqué mi correo» para actualizar el acceso.');
          return;
        }
        // A lost response must not allow an immediate duplicate email.
        setRetrySeconds(60);
        await sendEmailVerification(user);
        if (current()) setMessage('Correo de verificación enviado. Revisá tu bandeja de entrada y spam.');
      } else {
        await reload(user);
        if (!current()) return;
        await getIdToken(user, true);
        if (!current()) return;
        if (!user.emailVerified) {
          setMessage('Firebase todavía indica que tu correo no está verificado. Abrí el enlace recibido y volvé a comprobar.');
          return;
        }
        setVerified(true);
        setMessage('Correo verificado correctamente. El acceso al laboratorio sigue sujeto a su habilitación y autorización.');
        onVerified();
      }
    } catch (error) {
      if (!current()) return;
      if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/too-many-requests') setRetrySeconds(300);
      setFailed(true); setMessage(errorMessage(error));
    } finally {
      flight.current = false;
      if (alive.current) setBusy(null);
    }
  }

  if (!isAdminEmail(user.email) || (user.emailVerified && !busy && !message && !verified)) return null;
  return <section aria-label="Verificación del correo administrativo" data-testid="admin-email-verification" className="space-y-3 rounded-xl border border-yellow-500 bg-yellow-50 p-4 text-black">
    <h2 className="font-heading text-lg font-bold">{verified ? 'Correo administrativo verificado' : 'Verificá tu correo administrativo'}</h2>
    {!verified && <><p>Verificá tu correo para poder acceder al laboratorio cuando se habilite. Abrí personalmente el enlace que recibas de Firebase.</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button type="button" data-testid="admin-email-send" disabled={!!busy || coolingDown} onClick={() => void perform('send')} className="min-h-11 rounded-lg bg-yellow-400 px-4 py-2 font-bold disabled:opacity-50">{busy === 'send' ? 'Enviando…' : 'Enviar correo de verificación'}</button>
        <button type="button" data-testid="admin-email-check" disabled={!!busy} onClick={() => void perform('check')} className="min-h-11 rounded-lg border border-current px-4 py-2 font-semibold disabled:opacity-50">{busy === 'check' ? 'Comprobando…' : 'Ya verifiqué mi correo'}</button>
      </div>
      {coolingDown && <p className="text-sm">Podés volver a enviar el correo en {retrySeconds} segundos.</p>}
    </>}
    {message && <p role={failed ? 'alert' : 'status'} data-testid={verified ? 'admin-email-verified' : 'admin-email-status'}>{message}</p>}
  </section>;
}
