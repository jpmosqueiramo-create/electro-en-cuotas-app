import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { registrarPagoDirectoAdmin } from '@/lib/ledgerEngine';

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(req);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }
    const adminEmail = authResult.email!;

    const body = await req.json();
    const {
      solicitudId,
      montoRecibidoCentavos,
      monedaRecibida = 'ARS',
      montoAplicablePlanCentavos,
      cotizacionAplicada,
      fuenteCotizacion,
      fechaCotizacion,
      medioPago,
      fechaEfectiva,
      idempotencyKey,
      referenciaTransferencia,
      comprobanteStoragePath,
      fechaAcreditacion,
      cuentaReceptoraId,
      receptorEfectivoId,
      fechaRecepcion
    } = body;

    if (!solicitudId || !montoAplicablePlanCentavos || !medioPago || !idempotencyKey) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes: solicitudId, montoAplicablePlanCentavos, medioPago, idempotencyKey.' },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    const result = await registrarPagoDirectoAdmin(db, {
      solicitudId,
      montoRecibidoCentavos: montoRecibidoCentavos || montoAplicablePlanCentavos,
      monedaRecibida,
      montoAplicablePlanCentavos: Number(montoAplicablePlanCentavos),
      cotizacionAplicada,
      fuenteCotizacion,
      fechaCotizacion,
      medioPago,
      fechaEfectiva: fechaEfectiva || new Date().toISOString(),
      registradoPor: adminEmail,
      origenRegistro: 'ADMIN',
      idempotencyKey,
      referenciaTransferencia,
      comprobanteStoragePath,
      fechaAcreditacion,
      cuentaReceptoraId,
      receptorEfectivoId,
      fechaRecepcion
    });

    return NextResponse.json({ ok: true, ...result });

  } catch (error: unknown) {
    console.error('Error en POST /api/admin/pagos:', error);
    const errMessage = (error as Error)?.message || String(error);
    const status = errMessage.startsWith('400:') ? 400 : (errMessage.startsWith('404:') ? 404 : 500);
    return NextResponse.json({ error: errMessage }, { status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(req);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    const { searchParams } = new URL(req.url);
    const solicitudId = searchParams.get('solicitudId');

    if (!solicitudId) {
      return NextResponse.json({ error: 'Parámetro solicitudId requerido.' }, { status: 400 });
    }

    const db = admin.firestore();
    const movSnap = await db.collection('ledger_movimientos')
      .where('solicitudId', '==', solicitudId)
      .get();

    const movimientos: Record<string, unknown>[] = [];
    movSnap.forEach(d => movimientos.push(d.data()));

    const impSnap = await db.collection('ledger_imputaciones')
      .where('solicitudId', '==', solicitudId)
      .get();

    const imputaciones: Record<string, unknown>[] = [];
    impSnap.forEach(d => imputaciones.push(d.data()));

    return NextResponse.json({ ok: true, movimientos, imputaciones });
  } catch (error: unknown) {
    console.error('Error en GET /api/admin/pagos:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
