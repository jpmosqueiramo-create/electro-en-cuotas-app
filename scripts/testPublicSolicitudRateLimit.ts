import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { admin } from '../src/lib/firebaseAdmin';
import { persistPublicSolicitud } from '../src/lib/publicSolicitudService';
import { CONTACT_LIMIT_COLLECTION, CONTACT_LIMIT_POLICY, ContactLimitExceeded, contactLimitConfig, contactLimitId, normalizedContact, cleanupExpiredContactLimits } from '../src/lib/publicSolicitudRateLimit';
import { createPublicSolicitudSender } from '../src/lib/publicSolicitudClient';
import { POST } from '../src/app/api/public/solicitudes/route';

async function run() {
 const db=admin.firestore(), secret=randomBytes(32).toString('hex');
 const previous={enabled:process.env.PUBLIC_SOLICITUDES_RATE_LIMIT_ENABLED,key:process.env.PUBLIC_SOLICITUDES_HMAC_KEY};
 const input=(phone:string)=>({tipo:'contacto_rapido' as const,nombreCompleto:'DEMO RATE LIMIT',whatsapp:phone,localidad:'Ciudad ficticia',productoNombre:'Necesidad ficticia'});
 const phone=()=>`54${Math.floor(1000000000+Math.random()*9000000000)}`;
 let checks=0;const check=(condition:unknown)=>{assert.ok(condition);checks++;};
 try {
  delete process.env.PUBLIC_SOLICITUDES_RATE_LIMIT_ENABLED;delete process.env.PUBLIC_SOLICITUDES_HMAC_KEY;
  assert.equal(contactLimitConfig(),null);
  const unconfigured=phone();await persistPublicSolicitud(db,randomUUID(),input(unconfigured));
  process.env.PUBLIC_SOLICITUDES_RATE_LIMIT_ENABLED='true';
  assert.throws(()=>contactLimitConfig(),/CONFIGURATION_INVALID/);
  const missingId=randomUUID();await assert.rejects(persistPublicSolicitud(db,missingId,input(phone())),/CONFIGURATION_INVALID/);
  check(!(await db.collection('solicitudes_cuenta').doc(`web_${missingId}`).get()).exists);
  process.env.PUBLIC_SOLICITUDES_HMAC_KEY=secret;
  assert.equal(normalizedContact('+54 (11) 1234-5678'),normalizedContact('0054 11 1234 5678'));
  const key=Buffer.from(secret,'hex'), contact=phone(), id=randomUUID(), now=Date.now();
  const first=await persistPublicSolicitud(db,id,input(contact),undefined,()=>now);
  for(let i=0;i<2;i++)await persistPublicSolicitud(db,randomUUID(),input(contact),undefined,()=>now);
  await assert.rejects(persistPublicSolicitud(db,randomUUID(),input(contact),undefined,()=>now),ContactLimitExceeded);
  const replay=await persistPublicSolicitud(db,id,input(contact),undefined,()=>now);check(replay.replay&&replay.id===first.id);
  await assert.rejects(persistPublicSolicitud(db,id,{...input(contact),localidad:'Distinta'}),/REQUEST_CONFLICT/);
  // A response lost after a committed transaction is retried with the original ID.
  check((await persistPublicSolicitud(db,id,input(contact),undefined,()=>now)).replay);
  const counter=db.collection(CONTACT_LIMIT_COLLECTION).doc(contactLimitId(contact,key));
  const data=(await counter.get()).data()!;assert.equal(data.count,3);
  assert.deepEqual(Object.keys(data).sort(),['count','expiresAt','policy']);check(!JSON.stringify(data).includes(contact));
  assert.match(counter.id,/^[a-f0-9]{64}$/);assert.notEqual(contactLimitId(contact,randomBytes(32)),counter.id);
  await persistPublicSolicitud(db,randomUUID(),input(contact),undefined,()=>now+CONTACT_LIMIT_POLICY.windowMs);
  assert.equal((await counter.get()).data()?.count,1);
  const concurrent=phone();const outcomes=await Promise.allSettled(Array.from({length:8},()=>persistPublicSolicitud(db,randomUUID(),input(concurrent))));
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,3);assert.equal(outcomes.filter(r=>r.status==='rejected'&&r.reason instanceof ContactLimitExceeded).length,5);
  const notification=phone(), nid=randomUUID();const warning=await persistPublicSolicitud(db,nid,input(notification),async()=>{throw Error('secondary failed');});check(warning.notificationPending);
  await persistPublicSolicitud(db,nid,input(notification));assert.equal((await db.collection(CONTACT_LIMIT_COLLECTION).doc(contactLimitId(notification,key)).get()).data()?.count,1);
  // Abort after quota writes were staged: Firestore must roll back both writes.
  const failedContact=phone(), failedId=randomUUID(), original=db.runTransaction.bind(db);
  db.runTransaction=((fn: Parameters<typeof db.runTransaction>[0])=>original(async tx=>{const value=await fn(tx);throw Error(`injected transaction failure ${typeof value}`);})) as typeof db.runTransaction;
  try{await assert.rejects(persistPublicSolicitud(db,failedId,input(failedContact)),/injected transaction failure/);}finally{db.runTransaction=original;}
  check(!(await db.collection(CONTACT_LIMIT_COLLECTION).doc(contactLimitId(failedContact,key)).get()).exists);
  check(!(await db.collection('solicitudes_cuenta').doc(`web_${failedId}`).get()).exists);
  await persistPublicSolicitud(db,failedId,input(failedContact));
  const response=await POST(new Request('http://localhost/api/public/solicitudes',{method:'POST',body:JSON.stringify({submissionId:randomUUID(),payload:input(concurrent)})}));
  assert.equal(response.status,429);check(Number(response.headers.get('Retry-After'))>0&&Number(response.headers.get('Retry-After'))<=3600);
  const client=createPublicSolicitudSender('rate-limit-test',async()=>response.clone());
  await assert.rejects(client(input(concurrent)),/demasiadas solicitudes/);
  const error=await response.json();check(!JSON.stringify(error).includes(concurrent));check(error.persisted!==true);
  // Existing receipts remain replayable even if activation is misconfigured later.
  delete process.env.PUBLIC_SOLICITUDES_HMAC_KEY;
  check((await persistPublicSolicitud(db,id,input(contact))).replay);
  process.env.PUBLIC_SOLICITUDES_HMAC_KEY=secret;
  const expiry=db.collection(CONTACT_LIMIT_COLLECTION).doc(contactLimitId(phone(),key));
  await expiry.set({policy:CONTACT_LIMIT_POLICY.version,count:1,expiresAt:admin.firestore.Timestamp.fromMillis(now-1)});
  await cleanupExpiredContactLimits(db,now);check(!(await expiry.get()).exists);check((await counter.get()).exists);
  console.log(`CONTACT_RATE_LIMIT_EMULATOR = PASS; CHECKS = ${checks}; LIMIT = 3/HOUR; CONCURRENCY = PASS; RETRY = PASS; ATOMIC_ROLLBACK = PASS; PRIVACY = PASS; PRODUCTION_WRITES = 0`);
 } finally {
  for(const [name,value]of [['PUBLIC_SOLICITUDES_RATE_LIMIT_ENABLED',previous.enabled],['PUBLIC_SOLICITUDES_HMAC_KEY',previous.key]] as const){if(value===undefined)delete process.env[name];else process.env[name]=value;}
 }
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await Promise.all(admin.apps.map(app=>app?.delete()));});
