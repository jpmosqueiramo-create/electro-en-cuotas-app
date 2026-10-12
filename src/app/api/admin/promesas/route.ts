import { NextRequest, NextResponse } from "next/server";
import { admin } from "../../../../lib/firebaseAdmin";
import { verifyAdminAuth } from "../../../../lib/adminAuth";
import { registrarPromesaPago, obtenerPromesasPagoOperacion } from "../../../../lib/expirationEngine";

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(req);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    const { searchParams } = new URL(req.url);
    const solicitudId = searchParams.get("solicitudId");

    if (!solicitudId) {
      return NextResponse.json({ error: "Parámetro solicitudId requerido." }, { status: 400 });
    }

    const db = admin.firestore();
    const promesas = await obtenerPromesasPagoOperacion(db, solicitudId);
    return NextResponse.json({ ok: true, promesas });

  } catch (error: unknown) {
    console.error("Error en GET /api/admin/promesas:", error);
    const errMessage = (error as Error)?.message || String(error);
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(req);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    const body = await req.json();
    const { solicitudId, clienteId, fechaPrometida, montoPrometidoCentavos, nota } = body;

    if (!solicitudId || !fechaPrometida) {
      return NextResponse.json({ error: "Campos solicitudId y fechaPrometida obligatorios." }, { status: 400 });
    }

    const db = admin.firestore();
    const promesa = await registrarPromesaPago(db, {
      solicitudId,
      clienteId: clienteId || "CLIENTE_SISTEMA",
      fechaPrometida,
      montoPrometidoCentavos: montoPrometidoCentavos ? Number(montoPrometidoCentavos) : null,
      nota,
      creadaPor: authResult.email || "jpmosqueiramo@gmail.com",
      creadaPorRol: "ADMIN"
    });

    return NextResponse.json({ ok: true, promesa });

  } catch (error: unknown) {
    console.error("Error en POST /api/admin/promesas:", error);
    const errMessage = (error as Error)?.message || String(error);
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
