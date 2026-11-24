import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { contractHeaders } from '@/lib/contractV2Http';
import { validarPagoInformadoAdmin } from '@/lib/ledgerEngine';

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(req);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }
    const adminEmail = authResult.email!;

    const body = await req.json();
    const { pagoInformadoId, accion, observacionAdmin, fechaAcreditacion, receptorEfectivoId, movimientoExistenteId } = body;

    if (!pagoInformadoId || !accion || (accion !== 'CONFIRMAR' && accion !== 'RECHAZADO' && accion !== 'VINCULAR')) {
      return NextResponse.json({ error: 'Se requieren pagoInformadoId y accion (\"CONFIRMAR\" | \"RECHAZADO\").' }, { status: 400 });
    }

    if(typeof pagoInformadoId!=='string'||! /^[A-Za-z0-9_-]{1,200}$/.test(pagoInformadoId)||[observacionAdmin,fechaAcreditacion,receptorEfectivoId,movimientoExistenteId].some(value=>value!==undefined&&(typeof value!=='string'||value.length>500))){return NextResponse.json({error:'Revisá los datos de la decisión.'},{status:400,headers:contractHeaders});}

    const db = admin.firestore();
    const result = await validarPagoInformadoAdmin(db, {
      pagoInformadoId,
      accion,
      observacionAdmin,
      adminEmail, fechaAcreditacion, receptorEfectivoId, movimientoExistenteId
    });

    return NextResponse.json(result,{headers:contractHeaders});

  } catch (error: unknown) {
    const errMessage = (error as Error)?.message || String(error);
    const status = errMessage.startsWith('400:') ? 400 : (errMessage.startsWith('404:') ? 404 : (errMessage.startsWith('409:') ? 409 : errMessage.startsWith('403:') ? 403 : 500));
    return NextResponse.json({ error: errMessage }, { status,headers:contractHeaders });
  }
}
