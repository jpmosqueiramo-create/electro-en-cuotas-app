import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { contractHeaders } from '@/lib/contractV2Http';
import { clientPortalParams } from '@/lib/operationClientV2Http';
import { fulfillmentOrigin } from '@/lib/operationFulfillmentV2Server';
import { invitationsEnabled } from '@/lib/operationClientV2';
export const runtime='nodejs';
export async function GET(req:Request,ctx:{params:Promise<{budgetId:string;version:string}>}) {
 const auth=await verifyAdminAuth(req);if(!auth.authorized)return auth.errorResponse!;
 try{const p=await ctx.params,v=clientPortalParams(p.budgetId,p.version),db=admin.firestore();
 const origin=await db.runTransaction(tx=>fulfillmentOrigin(db,tx,p.budgetId,v));if(!origin.registered)throw Error();
 // Productive tax issuance is not installed. Simulation data is only queried in DEMO.
 const docs=invitationsEnabled()?await db.collection('presupuestos_v2').doc('_fiscal_mock_v1').collection('contracts').where('operationId','==',origin.identity.operationId).limit(50).get():null;
 const documents=docs?.docs.filter(d=>d.data().schemaVersion==='FISCAL_SIMULATION_V1'&&d.data().executionMode==='MOCK_ONLY').map(d=>{const x=d.data();return {id:d.id,number:x.number,kind:x.kind,totalCents:x.totalCents,taxCents:x.taxCents,authorization:x.authorization};})||[];
 return NextResponse.json({status:documents.length?'Simulaciones exclusivas de Emulator. Sin validez fiscal.':'Sin comprobantes fiscales. Configuración y emisión pendientes de habilitación.',documents,productiveIssuance:false},{headers:contractHeaders});
 }catch{return NextResponse.json({error:'No se pudo consultar la documentación fiscal.'},{status:409,headers:contractHeaders});}
}
