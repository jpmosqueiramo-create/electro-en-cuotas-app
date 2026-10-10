import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import { validarAdminToken } from "@/lib/adminAuth";
import { pagarLiquidacion } from "@/lib/settlementsEngine";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authRes = await validarAdminToken(req);
    if (!authRes.valid) {
      return NextResponse.json({ error: "403:FORBIDDEN: Acceso restringido al Administrador." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();

    const db = admin.firestore();
    const result = await pagarLiquidacion(db, {
      liquidacionId: id.trim(),
      ...body,
      adminUid: authRes.uid || "admin"
    });

    return NextResponse.json({ ok: true, liquidacion: result });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || "500:INTERNAL_ERROR" }, { status: 500 });
  }
}
