import { NextResponse } from 'next/server';
import { FieldPath } from 'firebase-admin/firestore';
import type { LedgerMovimiento } from '@/lib/ledgerEngine';
import { admin } from '@/lib/firebaseAdmin';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { contractHeaders } from '@/lib/contractV2Http';
/** Historical records stay in their original ledger; no linkage is inferred into V2. */
export async function GET(req:Request){
 const auth=await verifyAdminAuth(req);if(!auth.authorized)return auth.errorResponse!;
 try{
  const q=new URL(req.url).searchParams,cursor=q.get('cursor');if([...q.keys()].some(k=>k!=='cursor')||q.getAll('cursor').length>1||cursor&&(!/^[A-Za-z0-9_-]{1,200}$/.test(cursor)))throw Error();
  const db=admin.firestore();let query=db.collection('pagos_informados').where('estadoValidacion','==','PENDIENTE_VALIDACION').orderBy(FieldPath.documentId()).limit(26);if(cursor)query=query.startAfter(cursor);
  const page=await query.get(),rows=[];
  for(const doc of page.docs.slice(0,25)){
   const r=doc.data();if(typeof r.solicitudId!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(r.solicitudId)||!Number.isSafeInteger(r.montoInformadoCentavos)||r.montoInformadoCentavos<=0||typeof r.fechaInformada!=='string'||!Number.isFinite(Date.parse(r.fechaInformada))||[r.referenciaTransferencia,r.receptorDeclarado].some(v=>v!==undefined&&v!==null&&(typeof v!=='string'||v.length>2000))||!['ARS','USD'].includes(r.moneda)||!['EFECTIVO','TRANSFERENCIA'].includes(r.medioPago)){rows.push({id:doc.id,solicitudId:'',clientName:'Informe histórico que requiere revisión',amountCents:null,currency:'ARS',method:'',date:'',reference:'',declaredRecipient:'',originAvailable:false,valid:false,matches:[],paymentsPartial:false});continue;}
   let origin=await db.collection('solicitudes').doc(r.solicitudId).get();if(!origin.exists)origin=await db.collection('propuestas').doc(r.solicitudId).get();
   const source=origin.data(),payments=await db.collection('ledger_movimientos').where('solicitudId','==',r.solicitudId).limit(101).get();
   rows.push({valid:true,id:doc.id,solicitudId:r.solicitudId,clientName:String(source?.nombreCompleto||source?.nombre||'Operación histórica'),amountCents:r.montoInformadoCentavos,currency:r.moneda,method:r.medioPago,date:r.fechaInformada,reference:r.referenciaTransferencia||'',declaredRecipient:r.receptorDeclarado||'',originAvailable:origin.exists&&!source?.operationId&&!source?.contractSnapshotV2,matches:payments.docs.slice(0,100).map(d=>({...d.data(),id:d.id} as LedgerMovimiento)).filter(p=>p.tipo==='PAGO'&&p.estado==='ACTIVO'&&p.montoRecibidoCentavos===r.montoInformadoCentavos&&p.monedaRecibida===r.moneda&&p.medioPago===r.medioPago).map(p=>({id:p.id,date:p.fechaEfectiva,reference:p.referenciaTransferencia||''})),paymentsPartial:payments.size>100});
  }
  const receivers=await db.collection('receptores_efectivo_autorizados').where('activo','==',true).limit(101).get();
  return NextResponse.json({reports:rows,nextCursor:page.size>25?page.docs[24].id:null,receivers:receivers.docs.slice(0,100).map(d=>({id:d.id,name:String(d.data().nombre||d.data().nombreCompleto||d.id),affiliate:d.data().tipoReceptor==='VENDEDOR_AFILIADO'})),receiversPartial:receivers.size>100},{headers:contractHeaders});
 }catch{return NextResponse.json({error:'No se pudieron verificar los informes del circuito histórico.'},{status:409,headers:contractHeaders});}
}
