import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { validarPagoInformadoAdmin } from '@/lib/ledgerEngine';

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(req);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }
    const adminEmail = authResult.email!;

    const body = await req.json();
    const { pagoInformadoId, accion, observacionAdmin } = body;

    if (!pagoInformadoId || !accion || (accion !== 'CONFIRMAR' && accion !== 'RECHAZADO')) {
      return NextResponse.json({ error: 'Se requieren pagoInformadoId y accion (\"CONFIRMAR\" | \"RECHAZADO\").' }, { status: 400 });
    }

    const db = admin.firestore();
    const result = await validarPagoInformadoAdmin(db, {
      pagoInformadoId,
      accion,
      observacionAdmin,
      adminEmail
    });

    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('Error en POST /api/admin/pagos-informados/validar:', error);
    const errMessage = (error as Error)?.message || String(error);
    const status = errMessage.startsWith('400:') ? 400 : (errMessage.startsWith('404:') ? 404 : (errMessage.startsWith('409:') ? 409 : 500));
    return NextResponse.json({ error: errMessage }, { status });
  }
}
