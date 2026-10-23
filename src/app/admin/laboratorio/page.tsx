'use client';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import OperationsLabCircuit from '@/components/operations/OperationsLabCircuit';
import { LAB_WATERMARK } from '@/lib/operationsLabPolicy';
import { AdminEmailVerification } from '@/components/admin/AdminEmailVerification';
type Session = { id: string; createdAt: string; state: string };
export default function OperationsLabPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]), [available, setAvailable] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('Verificando acceso…');
  const [verificationRevision, setVerificationRevision] = useState(0);
  const [selected,setSelected]=useState<string|null>(null);
  const [viewUid, setViewUid] = useState<string | null>(null);
  const authorized = available && viewUid === user?.uid;
  const visibleSessions = authorized ? sessions : [];
  const flight = useRef(false), pending = useRef<string | null>(null), generation = useRef(0);
  useEffect(() => {
    const seq = ++generation.current;
    setAvailable(false); setSessions([]); pending.current = null;
    if (!user) { setMessage('Ingresá con una cuenta administrativa autorizada.'); return; }
    void (async () => {
      try {
        const response = await fetch('/api/admin/laboratorio', { cache: 'no-store', headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
        if (!response.ok) throw new Error('El laboratorio está deshabilitado o tu cuenta no tiene autorización explícita.');
        const data = await response.json();
        if (generation.current !== seq) return;
        setSessions(data.sessions); setViewUid(user.uid); setAvailable(true); setMessage('Acceso verificado. Elegí una sesión o registrá una nueva para recorrer el circuito sintético.');
      } catch (error) { if (generation.current === seq) setMessage(error instanceof Error ? error.message : 'No se pudo verificar el acceso.'); }
    })();
    return () => { generation.current = seq + 1; };
  }, [user, verificationRevision]);
  async function start() {
    if (!user || !authorized || flight.current) return;
    const seq = generation.current;
    flight.current = true; setBusy(true); pending.current ??= crypto.randomUUID();
    let saved = false;
    try {
      const response = await fetch('/api/admin/laboratorio', { method: 'POST', headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ commandId: pending.current }) });
      if (!response.ok) throw new Error('No se confirmó la sesión. Podés reintentar sin duplicarla.');
      if (generation.current !== seq) return;
      pending.current = null; saved = true;
      const listing = await fetch('/api/admin/laboratorio', { cache: 'no-store', headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      if (!listing.ok) { setAvailable(false); setSessions([]); throw new Error('Sesión registrada. No se pudo actualizar la lista; no vuelvas a crearla.'); }
      const data = await listing.json();
      if (generation.current !== seq) return;
      setSessions(data.sessions);
      setMessage('Sesión sintética registrada. No se creó ninguna operación, contrato ni pago.');
    } catch (error) { if (generation.current === seq) { if (saved) setAvailable(false); setMessage(saved ? 'Sesión registrada. No se pudo actualizar la lista; volvé a abrir esta pantalla sin crear otra sesión.' : error instanceof Error ? error.message : 'No se confirmó la sesión.'); } }
    finally { flight.current = false; setBusy(false); }
  }
  return <main className="mx-auto max-w-3xl space-y-5 p-4">
    <h1 className="font-heading text-2xl font-bold">Laboratorio de operaciones</h1>
    {user && <AdminEmailVerification key={user.uid} user={user} onVerified={() => setVerificationRevision(revision => revision + 1)} />}
    <p className="rounded border border-yellow-500 bg-yellow-50 p-4 font-bold text-black">Sólo datos sintéticos · {LAB_WATERMARK}</p>
    <p role="status">{message}</p>
    <section className="space-y-3 rounded border p-4"><h2 className="text-xl font-semibold">Preparación del laboratorio</h2>
      <p>Cada sesión mantiene sus propios datos y permite recorrer consulta, presupuesto, contrato, documentos, firmas, entrega y pagos simulados.</p>
      <button className="min-h-11 w-full rounded bg-yellow-400 px-4 py-2 font-bold text-black disabled:opacity-50 sm:w-auto" disabled={!authorized || busy} onClick={() => void start()}>{busy ? 'Registrando…' : 'Registrar sesión sintética'}</button>
      <p>No se habilita ninguna acción contractual, financiera ni fiscal real.</p>
    </section>
    <section><h2 className="text-xl font-semibold">Sesiones recientes</h2>{visibleSessions.length ? <ul>{visibleSessions.map((s, i) => <li key={s.id} className="border-b py-3">Sesión {i + 1} · {new Date(s.createdAt).toLocaleString('es-AR')} · <button className="min-h-11 rounded border px-3" onClick={()=>setSelected(s.id)}>Abrir circuito</button></li>)}</ul> : <p>No hay sesiones disponibles para esta cuenta.</p>}</section>
    {authorized&&selected&&<OperationsLabCircuit key={user?.uid+selected} sessionId={selected}/>}
    <p>El selector de vistas es una simulación administrativa. Para probar permisos, usá cuentas sintéticas independientes expresamente autorizadas.</p>
  </main>;
}
