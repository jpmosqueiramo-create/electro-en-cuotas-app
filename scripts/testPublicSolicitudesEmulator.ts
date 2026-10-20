import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { admin } from '../src/lib/firebaseAdmin';
import { persistPublicSolicitud } from '../src/lib/publicSolicitudService';
import { POST } from '../src/app/api/public/solicitudes/route';
import { publicFixture } from './helpers/catalogC4Fixtures';
async function run(){
 const db=admin.firestore();const prefix=`requests-${process.pid}`;
 const a={tipo:'contacto_rapido' as const,nombreCompleto:prefix,whatsapp:'000000',localidad:'Ciudad ficticia',productoNombre:'Producto sintético'};
 const id=randomUUID();const results=await Promise.all(Array.from({length:5},()=>persistPublicSolicitud(db,id,a)));
 assert.ok(results.every(r=>r.id===`web_${id}`));assert.equal(results.filter(r=>!r.replay).length,1);
 assert.equal((await db.collection('solicitudes_cuenta').where('nombreCompleto','==',prefix).get()).size,1);
 assert.equal((await db.collection('solicitudes').where('datosPersonales.nombreCompleto','==',prefix).get()).size,0);
 assert.equal((await db.collection('alertas_admin').doc(`web_${id}`).get()).exists,true);
 await db.collection('solicitudes_cuenta').doc(`web_${id}`).update({estado:'Aprobado'});await persistPublicSolicitud(db,id,a);assert.equal((await db.collection('solicitudes_cuenta').doc(`web_${id}`).get()).data()?.estado,'Aprobado');
 await assert.rejects(persistPublicSolicitud(db,id,{...a,localidad:'Otro'}),/REQUEST_CONFLICT/);
 const notificationId=randomUUID();const pending=await persistPublicSolicitud(db,notificationId,a,async()=>{throw Error('secondary failed');});assert.equal(pending.persisted,true);assert.equal(pending.notificationPending,true);
 await persistPublicSolicitud(db,notificationId,a);assert.ok((await db.collection('alertas_admin').doc(`web_${notificationId}`).get()).exists);
 const dto=publicFixture(`${prefix}-catalog`,'Referencia sintética');await db.collection('catalogo_publico').doc(dto.referenciaId).set(dto);
 const plan=dto.planesPublicados[0];const b={...a,tipo:'apertura_cuenta' as const,numeroDni:'00000000',cuil:'20-00000000-0',fechaNacimiento:'1990-01-01',direccion:'Calle ficticia',codigoPostal:'0000',ocupacion:'Prueba',email:'prueba@example.invalid',antiguedadLaboral:'2020-01-01',productoId:dto.referenciaId,productoNombre:dto.nombre,planElegido:String(plan.cuotas),montoCuota:plan.cuotaEstimada};
 const bid=randomUUID();await persistPublicSolicitud(db,bid,b);await db.collection('catalogo_publico').doc(dto.referenciaId).update({planesPublicados:[]});await persistPublicSolicitud(db,bid,b);
 const saved=(await db.collection('solicitudes_cuenta').doc(`web_${bid}`).get()).data()!;assert.equal(saved.montoCuota,plan.cuotaEstimada);assert.equal(saved.planElegido,String(plan.cuotas));assert.equal(saved.localidad,'Ciudad ficticia');assert.equal(saved.direccion,'Calle ficticia');
 await assert.rejects(persistPublicSolicitud(db,randomUUID(),b),/CATALOG_SELECTION_CHANGED/);
 const request=(payload:unknown)=>new Request('http://localhost/api/public/solicitudes',{method:'POST',headers:{origin:'https://www.cuentahogar.com.ar'},body:JSON.stringify({submissionId:randomUUID(),payload})});
 assert.equal((await POST(request({...a,costoProveedor:1}))).status,400);
 const denied=await POST(new Request('http://localhost/api/public/solicitudes',{method:'POST',headers:{origin:'https://other.invalid'},body:'{}'}));assert.equal(denied.status,403);
 // Inject a persistence failure at the database boundary; never connect to another host.
 const original=db.runTransaction;db.runTransaction=async()=>{throw Error('write failed');};try{const response=await POST(request(a));assert.equal(response.status,503);assert.notEqual((await response.json()).persisted,true);}finally{db.runTransaction=original;}
 assert.equal((await db.collection('presupuestos_v2').where('clienteSnapshot.nombre','==',prefix).get()).size,0);
 console.log('PUBLIC_SOLICITUDES_EMULATOR = PASS; SINGLE_OPERATION = PASS; CONCURRENT_RETRY = PASS; SECONDARY_FAILURE = PASS; PERSISTENCE_FAILURE = PASS; CAPTURED_PLAN = PASS; AUTO_BUDGETS = 0');
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await Promise.all(admin.apps.map(app=>app?.delete()));});
