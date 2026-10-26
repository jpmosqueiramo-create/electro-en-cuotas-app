import assert from 'node:assert/strict';
import { parsePublicSolicitud, publicSolicitudOrigin } from '../src/lib/publicSolicitud';
import { createPublicSolicitudSender } from '../src/lib/publicSolicitudClient';
import { mapSolicitudCuentaToAdminReadModel, mapSolicitudToAdminReadModel } from '../src/lib/adminSolicitudesReadModel';
async function run(){
 const payload={tipo:'contacto_rapido' as const,nombreCompleto:'Ficticio',whatsapp:'000',localidad:'Ciudad',productoNombre:'Producto'};
 assert.equal(parsePublicSolicitud(payload).tipo,'contacto_rapido');
 assert.throws(()=>parsePublicSolicitud({...payload,tipo:['contacto_rapido']}));
 for(const extra of [{costoProveedor:1},{sourceCollection:'solicitudes'},{estado:'APROBADO'},{montoCuota:10}])assert.throws(()=>parsePublicSolicitud({...payload,...extra}));
 for(const key of ['nombreCompleto','whatsapp','localidad','productoNombre'])assert.throws(()=>parsePublicSolicitud({...payload,[key]:''}));
 const legacy=mapSolicitudToAdminReadModel('old',{datosPersonales:{localidad:'Ciudad vieja',direccion:'Calle vieja'},estado:'REQUIERE_INFO'});
 const directory=mapSolicitudToAdminReadModel('directory',{datosPersonales:{ocupacion:'Actividad sintética',antiguedadLaboral:'2020-01-01'},nombreAfiliado:'Afiliado sintético'});assert.equal(directory.ocupacion,'Actividad sintética');assert.equal(directory.antiguedadLaboral,'2020-01-01');assert.equal(directory.nombreAfiliado,'Afiliado sintético');
 assert.equal(legacy.localidad,'Ciudad vieja');assert.equal(legacy.domicilio,'Calle vieja');assert.equal(legacy.origenPresentacion,'Origen no registrado');
 const b=mapSolicitudCuentaToAdminReadModel('b',{tipo:'apertura_cuenta',productoId:'ref',productoNombre:'Original',planElegido:'12',montoCuota:85000,localidad:'Ciudad',direccion:'Calle'});
 assert.equal(b.referenciaCatalogo,'ref');assert.equal(b.planPreferido,'12');assert.equal(b.cuotaCapturada,85000);assert.equal(b.localidad,'Ciudad');assert.equal(b.domicilio,'Calle');assert.equal(b.origenPresentacion,'Solicitud desde catálogo');
 assert.equal(mapSolicitudCuentaToAdminReadModel('missing',{direccion:'Sólo dirección'}).localidad,null);assert.equal(publicSolicitudOrigin(payload),'Consulta por producto fuera del catálogo');
 let calls=0;const ids:string[]=[];let responseLost=true;
 const transport:typeof fetch=async(_url,opts)=>{calls++;const body=JSON.parse(String(opts?.body));ids.push(body.submissionId);if(responseLost){responseLost=false;throw Error('Respuesta perdida');}return Response.json({id:`web_${body.submissionId}`,persisted:true,sourceCollection:'solicitudes_cuenta',notificationPending:false});};
 const sender=createPublicSolicitudSender('unit',transport);
 await assert.rejects(sender(payload));await sender(payload);await sender(payload);assert.equal(new Set(ids).size,1);assert.equal(calls,3);
 let release!:()=>void;const blocker=new Promise<void>(r=>{release=r;});let writes=0;
 const concurrent=createPublicSolicitudSender('double',async(_url,opts)=>{writes++;await blocker;const {submissionId}=JSON.parse(String(opts?.body));return Response.json({id:`web_${submissionId}`,persisted:true,sourceCollection:'solicitudes_cuenta'});});
 const first=concurrent(payload);await assert.rejects(concurrent(payload));release();await first;assert.equal(writes,1);
 const failed=createPublicSolicitudSender('fail',async()=>Response.json({error:'No guardado'},{status:503}));await assert.rejects(failed(payload),/No guardado/);
 const unconfirmed=createPublicSolicitudSender('unconfirmed',async()=>Response.json({persisted:false}));await assert.rejects(unconfirmed(payload));
 console.log('PUBLIC_SOLICITUDES_PURE = PASS; CLIENT_DOUBLE_CLICK = PASS; LOST_RESPONSE_RETRY = PASS; HISTORICAL_COMPATIBILITY = PASS');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
