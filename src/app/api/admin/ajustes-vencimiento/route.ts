import { NextRequest, NextResponse } from "next/server";
import { admin } from "../../../../lib/firebaseAdmin";
import { verifyAdminAuth } from "../../../../lib/adminAuth";
import { registrarAjusteAdministrativo } from "../../../../lib/expirationEngine";

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(req);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    const adminUid = authResult.email || authResult.uid;
    if (!adminUid) {
      return NextResponse.json({ error: "401:IDENTIDAD_ADMIN_REQUERIDA: Se requiere identidad autenticada de administrador." }, { status: 401 });
    }

    const body = await req.json();
    const { solicitudId, referenciaEventoId, tipoAjuste, motivo, valorNuevo } = body;

    if (!solicitudId || !referenciaEventoId || !motivo || !motivo.trim()) {
      return NextResponse.json({ error: "Parámetros solicitudId, referenciaEventoId y motivo obligatorios." }, { status: 400 });
    }

    const db = admin.firestore();
    const ajuste = await registrarAjusteAdministrativo(db, {
      solicitudId,
      referenciaEventoId,
      tipoAjuste: tipoAjuste || "AJUSTE_RESULTADO",
      motivo,
      valorNuevo: valorNuevo || {},
      adminUid
    });

    return NextResponse.json({ ok: true, ajuste });

  } catch (error: unknown) {
    console.error("Error en POST /api/admin/ajustes-vencimiento:", error);
    const errMessage = (error as Error)?.message || String(error);
    const status = errMessage.startsWith("400:") ? 400 : (errMessage.startsWith("404:") ? 404 : 500);
    return NextResponse.json({ error: errMessage }, { status });
  }
}
