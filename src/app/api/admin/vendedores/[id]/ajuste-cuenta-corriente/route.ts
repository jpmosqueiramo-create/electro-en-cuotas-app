import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import { validarAdminToken } from "@/lib/adminAuth";
import { registrarAjusteAdministrativoComisiones } from "@/lib/settlementsEngine";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authRes = await validarAdminToken(req);
    if (!authRes.valid) {
      return NextResponse.json({ error: "403:FORBIDDEN: Acceso restringido al Administrador." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    if (!body || !body.idempotencyKey || typeof body.idempotencyKey !== "string" || !body.idempotencyKey.trim()) {
      return NextResponse.json({ error: "400:IDEMPOTENCY_KEY_REQUERIDO: Se requiere clave de idempotencia." }, { status: 400 });
    }
    const db = admin.firestore();

    const result = await registrarAjusteAdministrativoComisiones(db, {
      vendedorAfiliadoId: id,
      vendedorAfiliadoEmail: body.vendedorAfiliadoEmail || "",
      montoComisionCentavos: body.montoComisionCentavos,
      motivo: body.motivo,
      adminUid: authRes.uid || "admin",
      idempotencyKey: body.idempotencyKey
    });

    return NextResponse.json({ ok: true, movimiento: result });
  } catch (err: any) {
    const status = err.message?.startsWith("400:") ? 400 : 500;
    return NextResponse.json({ error: err.message || "500:INTERNAL_ERROR" }, { status });
  }
}