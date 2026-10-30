import {requestWorkflows} from '@/lib/adminWorkflowServer';
import {readAdministrativeStatus} from '@/lib/adminRecordRemovalServer';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { admin } from '@/lib/firebaseAdmin';
import { isAdminSolicitudSource, mapSolicitudToAdminReadModel, mapSolicitudCuentaToAdminReadModel } from '@/lib/adminSolicitudesReadModel';
import { contractHeaders } from '@/lib/contractV2Http';
export const runtime = 'nodejs';
export async function GET(req: NextRequest, ctx: { params: Promise<{ source: string; id: string }> }) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) return NextResponse.json({ error: 'Acceso Admin requerido.' }, { status: auth.errorResponse?.status === 403 ? 403 : 401, headers: contractHeaders });
  const { source, id } = await ctx.params;
  if (!isAdminSolicitudSource(source) || !id || id.includes('/')) return NextResponse.json({ error: 'Referencia inválida.' }, { status: 400, headers: contractHeaders });
  try {
    const snapshot = await admin.firestore().collection(source).doc(id).get();
    const workflows=await requestWorkflows(admin.firestore(),source,[id]);
    const map = source === 'solicitudes' ? mapSolicitudToAdminReadModel : mapSolicitudCuentaToAdminReadModel;
    return NextResponse.json({ item: snapshot.exists ? {...map(snapshot.id, snapshot.data()!),workflow:workflows[id]??[],...(workflows[id]?.length?{tipoPresentacion:'Solicitud'}:{}),administrativeState:await readAdministrativeStatus(admin.firestore(),{kind:'REQUEST',source,id})} : null }, { headers: contractHeaders });
  } catch {
    return NextResponse.json({ error: 'No se pudo consultar la solicitud.' }, { status: 503, headers: contractHeaders });
  }
}
