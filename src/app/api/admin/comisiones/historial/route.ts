import {NextResponse} from 'next/server';
import {admin} from '@/lib/firebaseAdmin';
import {custodyAuth} from '@/lib/operationCustodyV2Http';
import {contractHeaders} from '@/lib/contractV2Http';
function millis(value:unknown){if(value instanceof admin.firestore.Timestamp)return value.toMillis();if(typeof value==='string'){const n=Date.parse(value);return Number.isFinite(n)?n:0;}return 0;}
/** Historical admin projection only; never feeds the V2 commission ledger. */
export async function GET(req:Request){try{
 await custodyAuth(req,true);const db=admin.firestore();
 const results=await Promise.allSettled([db.collection('notificaciones').where('comisionAsociada','>',0).limit(501).get(),db.collection('pagos_comisiones').limit(501).get(),db.collection('solicitudes').where('estadoEntrega','==','ENTREGADO').limit(501).get()]);
 const warnings:string[]=[];const rows=results.map((r,i)=>{if(r.status==='rejected'){warnings.push(`No se pudo consultar la sección histórica ${i+1}. Reintentá.`);return [];}if(r.value.size>500)warnings.push('Historial parcial: se muestran hasta 500 registros por sección.');const field=['fecha','fechaPago','fechaCreacion'][i];return r.value.docs.slice(0,500).map(d=>({...d.data(),id:d.id} as Record<string,unknown>)).sort((a,b)=>millis(b[field])-millis(a[field]));});
 return NextResponse.json({comisiones:rows[0],pagos:rows[1],rendiciones:rows[2],warnings},{headers:contractHeaders});
 }catch{return NextResponse.json({error:'Acceso administrativo requerido.'},{status:403,headers:contractHeaders});}}
