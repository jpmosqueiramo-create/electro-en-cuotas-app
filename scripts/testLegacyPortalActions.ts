import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {admin} from '../src/lib/firebaseAdmin';
import {readLegacyPortal} from '../src/lib/legacyPortalServer';
import {portalP1Fixture,p1Token} from './testPortalP1Emulator';
import {POST as payment,GET as reports} from '../src/app/api/cliente/pagos-informados/route';
import {POST as note} from '../src/app/api/afiliado/observaciones/route';
import {PATCH as read} from '../src/app/api/afiliado/notificaciones/route';
async function main(){
 const f=await portalP1Fixture(),db=admin.firestore(),tokens=await Promise.all([f.c1,f.c2,f.a1,f.a2,f.inactive].map(p1Token)),id=randomUUID(),ref=db.collection('solicitudes').doc(id);
 const plan=[{numero:1,montoOriginal:100,estado:'PENDIENTE',vencimiento:'2026-01-01'}];
 await ref.set({clienteAuthUid:f.c1.uid,afiliadoAuthUid:f.a1.uid,afiliadoId:'seller-'+f.a1.uid,planPagos:plan,estado:'APROBADO'});
 function request(token:string,body:unknown,url='http://localhost/api/test'){return new NextRequest(url,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,Origin:'https://www.cuentahogar.com.ar','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
 const p={commandId:randomUUID(),solicitudId:id,montoInformadoCentavos:10000,medioPago:'TRANSFERENCIA',moneda:'ARS'};
 const outcomes=await Promise.all(Array.from({length:5},()=>payment(request(tokens[0],p))));assert(outcomes.every(r=>r.status===200));assert.equal((await db.collection('pagos_informados').where('solicitudId','==',id).get()).size,1);
 const saved=(await db.collection('pagos_informados').where('solicitudId','==',id).get()).docs[0];
 await saved.ref.update({estadoValidacion:'CONFIRMADO'});
 assert.equal((await payment(request(tokens[1],{...p,commandId:randomUUID()}))).status,403);
 assert.equal((await payment(request(tokens[0],{...p,montoInformadoCentavos:1}))).status,409);
 const reportResponse=await reports(request(tokens[0],null,'http://localhost/api/test?solicitudId='+id));assert.equal(reportResponse.status,200);const dto=await reportResponse.json();assert.equal(dto.pagosInformados[0].estadoValidacion,'CONFIRMADO');assert(!JSON.stringify(dto).includes('StoragePath'));
 assert.equal((await reports(request(tokens[1],null,'http://localhost/api/test?solicitudId='+id))).status,403);
 assert.equal((await payment(request(tokens[0],{...p,solicitudId:f.id+'-email',commandId:randomUUID()}))).status,403);
 const n={commandId:randomUUID(),solicitudId:id,sourceCollection:'solicitudes',texto:'Gestión sintética'};
 assert((await Promise.all(Array.from({length:5},()=>note(request(tokens[2],n))))).every(r=>r.status===200));
 assert.equal((await ref.get()).data()!.observacionesInternas.length,1);
 assert.equal((await note(request(tokens[3],{...n,commandId:randomUUID()}))).status,403);
 assert.equal((await note(request(tokens[4],n))).status,403);
 assert.equal((await note(request(tokens[2],{...n,texto:'distinto'}))).status,409);
 const currentNotes=(await ref.get()).data()!.observacionesInternas;await ref.update({observacionesInternas:[...currentNotes,{id:'internal',texto:'PRIVATE_ADMIN_NOTE',actorUid:f.a2.uid}]});const history=await readLegacyPortal(db,f.a1,'AFFILIATE');const ownRecord=history.solicitudes.find(r=>r.id===id);assert(ownRecord);assert(!JSON.stringify(ownRecord).includes('PRIVATE_ADMIN_NOTE'));assert(JSON.stringify(ownRecord).includes('Gestión sintética'));
 assert.equal((await read(request(tokens[2],{notificationId:f.id}))).status,200);assert.equal((await read(request(tokens[3],{notificationId:f.id}))).status,403);
 await db.collection('solicitudes').doc(id+'-v2').set({clienteAuthUid:f.c1.uid,afiliadoAuthUid:f.a1.uid,operationId:'v2-only'});assert.equal((await payment(request(tokens[0],{...p,solicitudId:id+'-v2'}))).status,403);assert.equal((await note(request(tokens[2],{...n,solicitudId:id+'-v2'}))).status,403);
 assert.deepEqual((await ref.get()).data()!.planPagos,plan);assert.equal((await db.collection('ledger_movimientos').where('solicitudId','==',id).get()).size,0);
 console.log('LEGACY_ACTIONS_EMULATOR=PASS; PAYMENT_REPORT_PENDING_ONLY=PASS; REPLAY_CONCURRENCY=PASS; NOTES_UID_ASSIGNMENT=PASS; NOTIFICATIONS_OWN_ONLY=PASS; CROSS_ACCOUNT=DENIED; LEDGER_AND_PLAN_MUTATIONS=0; PRODUCTION_WRITES=0');
}
main().then(()=>admin.app().delete()).catch(e=>{console.error(e);process.exitCode=1;});
