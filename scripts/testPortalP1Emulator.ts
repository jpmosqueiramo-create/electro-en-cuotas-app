import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {admin} from '../src/lib/firebaseAdmin';
import {legacyHistoryHandler,affiliateSolicitudHandler} from '../src/lib/legacyPortalHttp';
import {readLegacyPortal} from '../src/lib/legacyPortalServer';
import {POST as publicPost} from '../src/app/api/public/solicitudes/route';
import {publicFixture} from './helpers/catalogC4Fixtures';
import {ADMIN_EMAIL} from '../src/lib/adminIdentity';
const db=admin.firestore();
export async function p1User(kind:string){const email=`p1-${kind}-${randomUUID()}@example.test`,password='Emulator-only-P1-123';const u=await admin.auth().createUser({email,password,emailVerified:true});return {uid:u.uid,email,password,emailVerified:true};}
export async function p1Token(actor:{uid:string}){const r=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:await admin.auth().createCustomToken(actor.uid),returnSecureToken:true})});assert.equal(r.status,200);return (await r.json()).idToken as string;}
export async function portalP1Fixture(){
 const c1=await p1User('client-a'),c2=await p1User('client-b'),a1=await p1User('affiliate-a'),a2=await p1User('affiliate-b'),inactive=await p1User('inactive'),id=randomUUID();
 for(const [actor,active]of [[a1,true],[a2,true],[inactive,false]]as const)await db.collection('vendedores').doc('seller-'+actor.uid).set({authUid:actor.uid,activo:active,nombre:'Vendedor afiliado sintético'});
 const records:Record<string,Record<string,unknown>>={
  ['solicitudes/'+id]:{clienteId:c1.uid,afiliadoEmail:a1.email,estado:'APROBADO',productoDeseado:'HISTORICO-P1-A',datosPersonales:{nombreCompleto:'Cliente sintético',numeroDni:'00000000',email:c1.email},planPagos:[{numero:1,estado:'PAGADO',montoOriginal:100,montoAbonado:100,vencimiento:'2026-01-01',fechaPago:'2026-01-01',comprobanteUrl:'https://example.invalid/PRIVATE_TOKEN'}],costoProveedor:999,proveedor:'SECRET_PROVIDER',factor:99,documentos:{url:'PRIVATE_TOKEN'},fechaCreacion:admin.firestore.Timestamp.fromDate(new Date('2026-01-01T12:00:00Z'))},
  ['solicitudes_cuenta/'+id]:{clienteAuthUid:c1.uid,afiliadoAuthUid:a1.uid,afiliadoId:'seller-'+a1.uid,nombreCompleto:'Cliente sintético',productoNombre:'CANONICA-P1-A',estado:'Pendiente',fechaIso:'2026-01-02T12:00:00Z'},
  ['solicitudes/'+id+'-email']:{clienteId:'12345678',clienteEmail:c1.email,afiliadoEmail:a1.email,productoDeseado:'LEGACY-EMAIL-P1',estado:'PENDIENTE'},
  ['solicitudes/'+id+'-cross']:{clienteAuthUid:c2.uid,clienteEmail:c1.email,afiliadoAuthUid:a2.uid,afiliadoEmail:a1.email,productoDeseado:'CROSS-DO-NOT-EXPOSE'},
  ['solicitudes/'+id+'-cross-id']:{clienteId:c2.uid,clienteEmail:c1.email,afiliadoId:'seller-'+a2.uid,afiliadoEmail:a1.email,productoDeseado:'CROSS-ID-DO-NOT-EXPOSE'},
  ['solicitudes/'+id+'-dni-only']:{numeroDni:'00000000',productoDeseado:'DNI-IS-NOT-OWNERSHIP'},
  ['notificaciones/'+id]:{afiliadoEmail:a1.email,mensaje:'Aviso histórico sintético',fecha:'2026-01-02T12:00:00Z',comisionAsociada:20,leida:false,private:'SECRET_PROVIDER'},
  ['notificaciones/'+id+'-cross']:{afiliadoAuthUid:a2.uid,afiliadoEmail:a1.email,mensaje:'CROSS-NOTIFICATION'}
 };
 for(const [path,data]of Object.entries(records))await db.doc(path).set(data);
 const dto=publicFixture('p1-'+randomUUID(),'Referencia P1 publicada');await db.collection('catalogo_publico').doc(dto.referenciaId).set(dto);
 return {c1,c2,a1,a2,inactive,id,records,dto};
}
async function main(){
 const f=await portalP1Fixture(),before=await Promise.all(Object.keys(f.records).map(async path=>[path,(await db.doc(path).get()).data()])),tokens={c1:await p1Token(f.c1),c2:await p1Token(f.c2),a1:await p1Token(f.a1),a2:await p1Token(f.a2),inactive:await p1Token(f.inactive)};
 const req=(token?:string)=>new Request('http://localhost/api',{headers:token?{Authorization:'Bearer '+token}:{}});
 for(const [role,token]of [['CLIENT',tokens.c1],['AFFILIATE',tokens.a1]]as const){const r=await legacyHistoryHandler(req(token),role);assert.equal(r.status,200);const out=await r.json();assert.equal(out.solicitudes.filter((s:{id:string})=>s.id===f.id).length,2);assert.equal(new Set(out.solicitudes.map((s:{recordKey:string})=>s.recordKey)).size,out.solicitudes.length);for(const text of ['SECRET_PROVIDER','PRIVATE_TOKEN','CROSS-DO-NOT','CROSS-ID-DO-NOT','DNI-IS-NOT','CROSS-NOTIFICATION'])assert(!JSON.stringify(out).includes(text));assert(out.solicitudes.some((s:{productoDeseado:string})=>s.productoDeseado==='LEGACY-EMAIL-P1'));}
 assert.equal((await legacyHistoryHandler(req(),'CLIENT')).status,403);assert.equal((await legacyHistoryHandler(req(tokens.c1),'AFFILIATE')).status,403);assert.equal((await legacyHistoryHandler(req(tokens.inactive),'AFFILIATE')).status,403);
 const other=await (await legacyHistoryHandler(req(tokens.c2),'CLIENT')).json();assert(!other.solicitudes.some((s:{id:string})=>s.id===f.id));const crossAff=await (await legacyHistoryHandler(req(tokens.a2),'AFFILIATE')).json();assert(!crossAff.solicitudes.some((s:{id:string})=>s.id===f.id));
 let call=0;const partial=await readLegacyPortal(db,f.c1,'CLIENT',q=>{if(call++===0)return Promise.reject(Error('INJECTED_QUERY_DENIAL'));return q.get();});assert(partial.warnings.length);assert(partial.solicitudes.some(s=>s.sourceCollection==='solicitudes_cuenta'));assert(partial.solicitudes.some(s=>s.productoDeseado==='LEGACY-EMAIL-P1'));
 await admin.auth().updateUser(f.c1.uid,{emailVerified:false});assert.equal((await legacyHistoryHandler(req(tokens.c1),'CLIENT')).status,403);await admin.auth().updateUser(f.c1.uid,{emailVerified:true});await admin.auth().updateUser(f.c2.uid,{disabled:true});assert.equal((await legacyHistoryHandler(req(tokens.c2),'CLIENT')).status,403);await admin.auth().updateUser(f.c2.uid,{disabled:false});
 const rest='http://127.0.0.1:8080/v1/projects/demo-cuenta-hogar/databases/(default)/documents',fields={tipo:{stringValue:'contacto_rapido'},nombreCompleto:{stringValue:'SYNTHETIC'},estado:{stringValue:'Pendiente'}};
 for(const token of [null,tokens.c1,tokens.a1]){const r=await fetch(rest+'/solicitudes_cuenta?documentId='+randomUUID(),{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({fields})});assert.equal(r.status,403);}
 let adminUid:string;try{adminUid=(await admin.auth().getUserByEmail(ADMIN_EMAIL)).uid;}catch{adminUid=(await admin.auth().createUser({email:ADMIN_EMAIL,emailVerified:true})).uid;}
 const adminToken=await p1Token({uid:adminUid}),adminCreate=await fetch(rest+'/solicitudes_cuenta?documentId=admin-'+randomUUID(),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+adminToken},body:JSON.stringify({fields})});assert.equal(adminCreate.status,200);assert.equal((await fetch(rest+'/solicitudes_cuenta/'+f.id,{headers:{Authorization:'Bearer '+adminToken}})).status,200);
 const enabled=process.env.PUBLIC_SOLICITUDES_RATE_LIMIT_ENABLED,key=process.env.PUBLIC_SOLICITUDES_HMAC_KEY;process.env.PUBLIC_SOLICITUDES_RATE_LIMIT_ENABLED='true';process.env.PUBLIC_SOLICITUDES_HMAC_KEY=randomBytes(32).toString('hex');
 try{
 const phone='54911'+Date.now().toString().slice(-8),payload={tipo:'contacto_rapido',nombreCompleto:'P1 RATE SYNTHETIC',whatsapp:phone,localidad:'Lincoln',productoNombre:'SYNTHETIC'},sid=randomUUID();
 const pub=(id:string)=>publicPost(new Request('http://internal/api',{method:'POST',headers:{Origin:'https://www.cuentahogar.com.ar'},body:JSON.stringify({submissionId:id,payload})}));
 for(const id of [sid,randomUUID(),randomUUID()])assert.equal((await pub(id)).status,200);assert.equal((await pub(sid)).status,200);const fourth=await pub(randomUUID());assert.equal(fourth.status,429);assert(Number(fourth.headers.get('Retry-After'))>0);
 const p=f.dto.planesPublicados[0],affPayload={nombreCompleto:'Cliente afiliado sintético',numeroDni:'00000000',whatsapp:'54912'+Date.now().toString().slice(-8),direccion:'Domicilio sintético',localidad:'Lincoln',email:f.c1.email.toUpperCase(),productoId:f.dto.referenciaId,productoNombre:f.dto.nombre,planElegido:String(p.cuotas),montoCuota:p.cuotaEstimada},submissionId=randomUUID();
 const aff=(token:string,payload:unknown=affPayload)=>affiliateSolicitudHandler(new Request('http://internal/api',{method:'POST',headers:{Authorization:'Bearer '+token,Origin:'https://www.cuentahogar.com.ar','Content-Type':'application/json'},body:JSON.stringify({submissionId,payload})}));
 const countBefore=(await db.collection('solicitudes_cuenta').get()).size;
 for(const token of [tokens.a1,tokens.a2,tokens.inactive,tokens.c1])assert.equal((await aff(token)).status,403);
 assert.equal((await db.collection('solicitudes_cuenta').get()).size,countBefore);

 }finally{if(enabled===undefined)delete process.env.PUBLIC_SOLICITUDES_RATE_LIMIT_ENABLED;else process.env.PUBLIC_SOLICITUDES_RATE_LIMIT_ENABLED=enabled;if(key===undefined)delete process.env.PUBLIC_SOLICITUDES_HMAC_KEY;else process.env.PUBLIC_SOLICITUDES_HMAC_KEY=key;}
 for(const [path,data]of before)assert.deepEqual((await db.doc(path as string).get()).data(),data);
 console.log('P1_PORTAL_EMULATOR=PASS; DIRECT_ANON_AND_CLIENT_CREATE=DENIED; ADMIN_READ_CREATE=PASS; PUBLIC_ENDPOINT_RATE_REPLAY=PASS; LEGACY_UID_VERIFIED_EMAIL=PASS; CROSS_ACCOUNT_ASSIGNMENT=DENIED; PARTIAL_HISTORY=PASS; AFFILIATE_COMMERCIAL_INTAKE=DENIED; AUTO_BUDGET_ACCEPTANCE_CONTRACT=0; HISTORICAL_MUTATIONS=0; PRODUCTION_WRITES=0');
}
if(process.argv[1]?.endsWith('testPortalP1Emulator.ts'))main().then(()=>admin.app().delete()).catch(e=>{console.error(e instanceof Error?e.stack:e);process.exitCode=1;});
