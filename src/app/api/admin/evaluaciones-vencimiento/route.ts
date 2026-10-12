import { NextRequest, NextResponse } from "next/server";
import { admin } from "../../../../lib/firebaseAdmin";
import { verifyAdminAuth } from "../../../../lib/adminAuth";
import { evaluarVencimientosPendientes, calcularEstadoCumplimientoOperacion } from "../../../../lib/expirationEngine";

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(req);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    const { searchParams } = new URL(req.url);
    const solicitudId = searchParams.get("solicitudId");
    const fechaRef = searchParams.get("fechaReferencia");

    if (!solicitudId) {
      return NextResponse.json({ error: "Parámetro solicitudId requerido." }, { status: 400 });
    }

    const db = admin.firestore();
    const estadoCumplimiento = await calcularEstadoCumplimientoOperacion(db, solicitudId, fechaRef);
    return NextResponse.json({ ok: true, estadoCumplimiento });

  } catch (error: unknown) {
    console.error("Error en GET /api/admin/evaluaciones-vencimiento:", error);
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

    const body = await req.json().catch(() => ({}));
    const fechaRef = body.fechaReferencia || null;

    const db = admin.firestore();
    const resultadoJob = await evaluarVencimientosPendientes(db, fechaRef);

    return NextResponse.json({ ok: true, resultadoJob });

  } catch (error: unknown) {
    console.error("Error en POST /api/admin/evaluaciones-vencimiento:", error);
    const errMessage = (error as Error)?.message || String(error);
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
