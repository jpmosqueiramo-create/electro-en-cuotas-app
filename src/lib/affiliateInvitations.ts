import type { Firestore } from 'firebase-admin/firestore';
import { admin } from './firebaseAdmin';
import { opaque } from './contractV2';
import { isAdminEmail } from './adminIdentity';
import { requireProductionActor, runtimeForDatabase, runtimeData } from './productionV2/runtime';
import type { PortalIdentity } from './legacyPortalServer';

const unavailable = () => Error('La invitación no está disponible. Pedí a Administración un nuevo enlace.');
const invitationRef = (db: Firestore, id: string, command: string) => db.collection('vendedores').doc(opaque(id)).collection('portalInvitations').doc(opaque(command));
/** Firebase delivers the email; never return or persist its OOB credential. */
async function deliver(db: Firestore, email: string, continueUrl: string) {
 const { test } = runtimeData(runtimeForDatabase(db, admin.auth()));
 const apiKey = test ? 'emulator-only' : process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
 if (!apiKey) throw Error('Configuración de correo de Firebase incompleta.');
 const host = test ? 'http://127.0.0.1:9099/identitytoolkit.googleapis.com' : 'https://identitytoolkit.googleapis.com';
 const response = await fetch(`${host}/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Firebase-Locale': 'es' },
  body: JSON.stringify({ requestType: 'EMAIL_SIGNIN', email, continueUrl, canHandleCodeInApp: true }),
  signal: AbortSignal.timeout(15000),
 });
 if (!response.ok) throw Error('Firebase no confirmó el envío. Revisá que Email link esté habilitado y el dominio autorizado.');
}
export async function inviteAffiliate(db: Firestore, vendorId: string, commandId: string, actor: string) {
 const runtime = await requireProductionActor(runtimeForDatabase(db, admin.auth()), actor);
 const ref = invitationRef(db, vendorId, commandId), vendorRef = ref.parent.parent!;
 const now = Date.now();
 const invitation = await db.runTransaction(async tx => {
  const [vendor, previous] = await Promise.all([tx.get(vendorRef), tx.get(ref)]);
  const v = vendor.data();
  if (!v || v.activo !== true || v.authUid || isAdminEmail(v.email)) throw unavailable();
  if (previous.exists) return { state: String(previous.data()!.state), email: String(previous.data()!.email), duplicate: true };
  const matches = await tx.get(db.collection('vendedores').where('email', '==', v.email).limit(2));
  if (matches.size !== 1 || matches.docs[0].id !== vendorId) throw Error('Hay más de un perfil con ese correo. Revisá el registro antes de invitar.');
  if (now - Date.parse(v.portalInvitationAt || '') < 60000) throw Error('Esperá un minuto antes de enviar otra invitación.');
  const data = { email: String(v.email).toLowerCase(), actor, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + 48 * 3600000).toISOString(), state: 'SENDING' };
  tx.create(ref, data);
  tx.update(vendorRef, { portalInvitationId: commandId, portalInvitationAt: data.createdAt, portalInvitationState: 'SENDING' });
  return { ...data, duplicate: false };
 });
 if (invitation.duplicate) return { state: invitation.state, duplicate: true };
 const origin = runtime.test ? 'http://localhost:3000' : 'https://www.cuentahogar.com.ar';
 let state = 'SENT';
 try { await deliver(db, invitation.email, `${origin}/activar-vendedor/${vendorId}/${commandId}`); }
 catch { state = 'UNCONFIRMED'; }
 await db.runTransaction(async tx => {
  const current = await tx.get(vendorRef), sent = await tx.get(ref);
  if (sent.data()?.state !== 'SENDING') return;
  tx.update(ref, { state, sentAt: new Date().toISOString() });
  if (current.data()?.portalInvitationId === commandId) tx.update(vendorRef, { portalInvitationState: state });
 });
 return { state, duplicate: false };
}
/** Authenticated verified mailbox, current invitation, unique registry identity. No custom claims. */
export async function acceptAffiliateInvitation(db: Firestore, vendorId: string, invitationId: string, actor: PortalIdentity) {
 if (!actor.emailVerified || isAdminEmail(actor.email)) throw unavailable();
 const currentUser = await admin.auth().getUser(actor.uid);
 if (currentUser.disabled || !currentUser.emailVerified || currentUser.email?.toLowerCase() !== actor.email.toLowerCase()) throw unavailable();
 const ref = invitationRef(db, vendorId, invitationId), vendorRef = ref.parent.parent!;
 return db.runTransaction(async tx => {
  const [saved, vendor] = await Promise.all([tx.get(ref), tx.get(vendorRef)]), i = saved.data(), v = vendor.data();
  if (!i || !v || v.activo !== true || v.portalInvitationId !== invitationId || i.email !== actor.email.toLowerCase() || v.email !== i.email || v.authUid && v.authUid !== actor.uid) throw unavailable();
  if (i.state === 'ACCEPTED') { if (i.acceptedBy !== actor.uid || v.authUid !== actor.uid) throw unavailable(); return { ok: true }; }
  if (!['SENT', 'UNCONFIRMED'].includes(i.state) || !Number.isFinite(Date.parse(i.expiresAt)) || Date.parse(i.expiresAt) <= Date.now()) throw unavailable();
  const [uids, emails] = await Promise.all([tx.get(db.collection('vendedores').where('authUid', '==', actor.uid).limit(2)), tx.get(db.collection('vendedores').where('email', '==', i.email).limit(2))]);
  if (uids.docs.some(d => d.id !== vendorId) || emails.size !== 1 || emails.docs[0].id !== vendorId) throw unavailable();
  const at = new Date().toISOString();
  tx.update(vendorRef, { authUid: actor.uid, revision: (v.revision ?? 0) + 1, portalInvitationState: 'ACCEPTED', updatedAt: at, updatedBy: actor.uid });
  tx.update(ref, { state: 'ACCEPTED', acceptedAt: at, acceptedBy: actor.uid });
  tx.create(vendorRef.collection('registryHistory').doc(`invitation_${invitationId}`), { action: 'PORTAL_INVITATION_ACCEPTED', actor: actor.uid, at, invitationId, revision: (v.revision ?? 0) + 1 });
  return { ok: true };
 });
}
