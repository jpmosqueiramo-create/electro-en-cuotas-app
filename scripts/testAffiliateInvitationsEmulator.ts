import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { admin } from '../src/lib/firebaseAdmin';
import { productionRuntimeForEmulator } from '../src/lib/productionV2/runtime';
import { inviteAffiliate, acceptAffiliateInvitation } from '../src/lib/affiliateInvitations';
import { saveAffiliateProfile } from '../src/lib/affiliateRegistryServer';
import { activePortalAffiliate } from '../src/lib/legacyPortalServer';
import { p1Token } from './testPortalP1Emulator';
import { POST as invitePost } from '../src/app/api/admin/vendedores/[id]/invitaciones/route';
import { POST as acceptPost } from '../src/app/api/afiliado/activar/route';
import { startProductionBrowserServer } from './helpers/productionAdapterBrowserServer';
import { CatalogBrowser } from './helpers/catalogBrowser';
const pass = (s: string) => console.log(s + ' = PASS');
async function main() {
 const db = admin.firestore(), password = 'Emulator-only-123', actor = (await admin.auth().createUser({ email: process.env.NEXT_PUBLIC_ADMIN_EMAIL!, password, emailVerified: true })).uid;
 const runtime = productionRuntimeForEmulator(db, admin.auth(), [], [actor]);
 const create = async (email: string) => { const id = randomUUID(); await saveAffiliateProfile(db, { id, commandId: randomUUID(), expectedRevision: 0, nombre: 'Vendedor sintético invitado', email, localidad: 'Ciudad sintética', telefono: '', authUid: '', activo: true, porcentajeComision: 10, reason: 'Alta sintética' }, actor); return id; };
 const email = 'invite-affiliate@example.test', id = await create(email), command = randomUUID();
 const token = await p1Token({ uid: actor });
 const req = (body: unknown, bearer = token) => new Request('http://localhost/api', { method: 'POST', headers: { Authorization: 'Bearer ' + bearer, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
 const ctx = { params: Promise.resolve({ id }) };
 const result = await Promise.all([invitePost(req({ commandId: command }), ctx), invitePost(req({ commandId: command }), ctx)]);
 assert(result.every(r => r.status === 200)); assert((await Promise.all(result.map(r=>r.json()))).some(r=>r.state==='SENT'));
 const codes = async () => (await (await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-cuenta-hogar/oobCodes')).json()).oobCodes as { email: string; oobCode: string; oobLink: string; requestType: string }[];
 const sent = (await codes()).filter(c => c.email === email); assert.equal(sent.length, 1); assert.equal((await db.collection('vendedores').doc(id).get()).data()!.authUid, '');
 await inviteAffiliate(db, id, command, actor); assert.equal((await codes()).filter(c => c.email === email).length, 1);
 await assert.rejects(inviteAffiliate(db, id, randomUUID(), actor));
 assert.equal((await db.collection('vendedores').doc(id).collection('portalInvitations').get()).size, 1);
 const foreign = (await admin.auth().createUser({ email: 'foreign-invite@example.test', password, emailVerified: true })).uid;
 assert.equal((await invitePost(req({ commandId: randomUUID() }, await p1Token({ uid: foreign })), ctx)).status, 403);
 const foreignIdentity = { uid: foreign, email: 'foreign-invite@example.test', emailVerified: true };
 await assert.rejects(acceptAffiliateInvitation(db, id, command, foreignIdentity));
 const signin = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithEmailLink?key=emulator-only', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, oobCode: sent[0].oobCode }) });
 assert.equal(signin.status, 200); const signed = await signin.json();
 const identity = { uid: signed.localId, email, emailVerified: true };
 const accepted = await Promise.all([acceptAffiliateInvitation(db, id, command, identity), acceptAffiliateInvitation(db, id, command, identity)]); assert(accepted.every(r => r.ok));
 assert.equal((await activePortalAffiliate(db, identity)).id, id); assert.equal((await db.collection('vendedores').doc(id).get()).data()!.revision, 2);
 assert.equal((await acceptPost(req({ vendorId: id, invitationId: command }, signed.idToken))).status, 200);
 await db.collection('vendedores').doc(id).update({ activo: false }); await assert.rejects(activePortalAffiliate(db, identity)); await assert.rejects(acceptAffiliateInvitation(db, id, command, identity));
 pass('REAL_FIREBASE_EMAIL_LINK_NEW_ACCOUNT_UNIQUE_BINDING_REPLAY_RACE_WRONG_ACCOUNT_REVOKED');
 // Never accept stale, expired, changed-mail or disabled-user invitations.
 for (const kind of ['expired', 'changed-email', 'superseded', 'unverified', 'disabled']) {
  const e = kind + '@example.test', v = await create(e), c = randomUUID(); await inviteAffiliate(db, v, c, actor);
  const uid = (await admin.auth().createUser({ email: e, password, emailVerified: kind !== 'unverified', disabled: kind === 'disabled' })).uid;
  if (kind === 'expired') await db.collection('vendedores').doc(v).collection('portalInvitations').doc(c).update({ expiresAt: '2000-01-01T00:00:00.000Z' });
  if (kind === 'changed-email') await db.collection('vendedores').doc(v).update({ email: 'different@example.test' });
  if (kind === 'superseded') await db.collection('vendedores').doc(v).update({ portalInvitationId: randomUUID() });
  await assert.rejects(acceptAffiliateInvitation(db, v, c, { uid, email: e, emailVerified: kind !== 'unverified' }));
 }
 pass('EXPIRY_EMAIL_CHANGE_SUPERSEDED_UNVERIFIED_DISABLED_REJECTED');
 // A lost provider response is not a confirmed email; replay never resends automatically.
 const lostEmail='lost-invite@example.test',lostId=await create(lostEmail),lostCommand=randomUUID(),originalFetch=globalThis.fetch;
 try{globalThis.fetch=async(...args)=>{const response=await originalFetch(...args);if(String(args[0]).includes('accounts:sendOobCode')&&response.ok)throw Error('SYNTHETIC_LOST_PROVIDER_RESPONSE');return response;};assert.equal((await inviteAffiliate(db,lostId,lostCommand,actor)).state,'UNCONFIRMED');}finally{globalThis.fetch=originalFetch;}
 assert.equal((await inviteAffiliate(db,lostId,lostCommand,actor)).state,'UNCONFIRMED');assert.equal((await codes()).filter(c=>c.email===lostEmail).length,1);
 await db.collection('vendedores').doc(lostId).update({portalInvitationAt:new Date(Date.now()-61000).toISOString()});const newCommand=randomUUID();assert.equal((await inviteAffiliate(db,lostId,newCommand,actor)).state,'SENT');assert.equal((await codes()).filter(c=>c.email===lostEmail).length,2);
 const lostUid=(await admin.auth().createUser({email:lostEmail,password,emailVerified:true})).uid;await assert.rejects(acceptAffiliateInvitation(db,lostId,lostCommand,{uid:lostUid,email:lostEmail,emailVerified:true}));
 const alreadyId=await create('already-linked@example.test'),alreadyCommand=randomUUID();await inviteAffiliate(db,alreadyId,alreadyCommand,actor);const alreadyUid=(await admin.auth().createUser({email:'already-linked@example.test',password,emailVerified:true})).uid;await db.collection('vendedores').doc(randomUUID()).create({authUid:alreadyUid,activo:true});await assert.rejects(acceptAffiliateInvitation(db,alreadyId,alreadyCommand,{uid:alreadyUid,email:'already-linked@example.test',emailVerified:true}));
 pass('LOST_PROVIDER_RESPONSE_NO_AUTOMATIC_SECOND_EMAIL_EXPLICIT_RESEND_AND_UID_COLLISION');
 if (process.env.AFFILIATE_BROWSER === '1') {
  const server = await startProductionBrowserServer(runtime), browser = await CatalogBrowser.open();
  try {
   await browser.command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
   await browser.navigate('/login'); await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'", 'auth'); await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(process.env.NEXT_PUBLIC_ADMIN_EMAIL)},${JSON.stringify(password)}).then(()=>true)`);
   await browser.navigate('/admin/rendiciones'); await browser.until("!!document.querySelector('[data-testid=affiliate-registry]')", 'unified registry');
   assert.equal(await browser.evaluate("document.querySelectorAll('nav[aria-label=\"Secciones de administración\"] a[href=\"/admin/rendiciones\"]').length"), 0);
   await browser.clickText('Agregar vendedor afiliado');
   for (const [label, value] of [['Nombre y apellido', 'Invitado desde navegador'], ['Correo de contacto', 'browser-invite@example.test'], ['Localidad', 'Ciudad sintética'], ['Comisión sobre pagos acreditados (%)', '12']]) await browser.field(label, value);
   await browser.clickText('Guardar y enviar invitación'); await browser.until("document.body.innerText.includes('Invitación enviada por Firebase')", 'saved and emailed');
   const profiles = await db.collection('vendedores').where('email', '==', 'browser-invite@example.test').get(); assert.equal(profiles.size, 1);
   const code = (await codes()).find(c => c.email === 'browser-invite@example.test')!; assert(code);
   for (const width of [1280, 390, 320]) { await browser.command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 }); await browser.overflow('registry ' + width); await browser.screenshot('affiliate-invitation-registry-' + width + '.png'); }
   // Email link opens in a separate signed-out browser session. Firebase is emulated, not mocked.
   await browser.navigate('/'); await browser.until("typeof window.__FIREBASE_SIGN_OUT__==='function'", 'sign out helper'); await browser.evaluate('window.__FIREBASE_SIGN_OUT__().then(()=>true)');
   const continueUrl = new URL(code.oobLink).searchParams.get('continueUrl')!;
   const callback = new URL(continueUrl); callback.searchParams.set('apiKey', 'emulator-only'); callback.searchParams.set('oobCode', code.oobCode); callback.searchParams.set('mode', 'signIn');
   await browser.navigate(callback.pathname + callback.search); await browser.until("!!document.querySelector('[data-testid=affiliate-activation]')", 'activation');
   await browser.until("!!document.querySelector('[data-testid=affiliate-activation] fieldset')&&!document.querySelector('[data-testid=affiliate-activation] fieldset').disabled",'activation auth ready');
   await browser.field('Tu correo electrónico', 'browser-invite@example.test'); await browser.field('Contraseña para ingresar al panel', password); await browser.clickText('Activar mi cuenta');
   try{await browser.until("document.body.innerText.includes('Cuenta activada.')||!!document.querySelector('[role=alert]')", 'activation response');}catch(e){console.log(await browser.evaluate("JSON.stringify({text:document.body.innerText,fields:[...document.querySelectorAll('input')].map(e=>({name:e.name,valid:e.validity.valid,message:e.validationMessage})),fieldset:document.querySelector('fieldset')?.disabled})"));throw e;}assert.equal(await browser.evaluate("document.querySelector('[role=alert]')?.textContent||''"),'');
   const linkedUid=(await profiles.docs[0].ref.get()).data()!.authUid;assert(linkedUid);const passwordLogin=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-only',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'browser-invite@example.test',password,returnSecureToken:true})});assert.equal(passwordLogin.status,200);assert.equal((await passwordLogin.json()).localId,linkedUid);
   await browser.screenshot('affiliate-invitation-activated-mobile.png'); await browser.overflow('activated mobile');
   await browser.navigate('/afiliado'); await browser.until("document.querySelector('[data-testid=affiliate-commissions]')?.innerText.includes('Total pagado:')", 'own authenticated portal');
   assert.deepEqual(browser.externalFirebase, []); assert(!server.calls.some(c => c.status >= 500));
   pass('BROWSER_ADMIN_CREATE_SEND_UNIFIED_MENU_DESKTOP_390_320_EMAIL_SIGNUP_PASSWORD_PORTAL');
  } finally { await browser.close(); await server.stop(); }
 }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
