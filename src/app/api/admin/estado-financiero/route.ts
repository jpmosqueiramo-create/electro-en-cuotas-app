import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { calcularEstadoFinancieroOperacion } from "@/lib/ledgerEngine";
import { calcularEstadoCumplimientoOperacion, obtenerPromesasPagoOperacion } from "@/lib/expirationEngine";

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
    const estado = await calcularEstadoFinancieroOperacion(db, solicitudId);
    let cumplimiento = null;
    let promesas: unknown[] = [];

    try {
      cumplimiento = await calcularEstadoCumplimientoOperacion(db, solicitudId);
      promesas = await obtenerPromesasPagoOperacion(db, solicitudId);
    } catch {
      // Si la operación es legacy o no tiene entrega, cumplimiento permanece null
    }

    return NextResponse.json({ ok: true, estado, cumplimiento, promesas });

  } catch (error: unknown) {
    console.error("Error en GET /api/admin/estado-financiero:", error);
    const errMessage = (error as Error)?.message || String(error);
    const status = errMessage.startsWith("400:") ? 400 : (errMessage.startsWith("404:") ? 404 : 500);
    return NextResponse.json({ error: errMessage }, { status });
  }
}
