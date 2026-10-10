import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import { validarAdminToken } from "@/lib/adminAuth";
import { actualizarVisibilidadPanelVendedor } from "@/lib/settlementsEngine";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authRes = await validarAdminToken(req);
    if (!authRes.valid) {
      return NextResponse.json({ error: "403:FORBIDDEN: Acceso restringido al Administrador." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const db = admin.firestore();

    await actualizarVisibilidadPanelVendedor(db, {
      vendedorId: id,
      mostrarCuentaCorrienteEnPanel: body.mostrarCuentaCorrienteEnPanel,
      adminUid: authRes.uid || "admin"
    });

    return NextResponse.json({ ok: true, vendedorId: id, mostrarCuentaCorrienteEnPanel: Boolean(body.mostrarCuentaCorrienteEnPanel) });
  } catch (err: any) {
    const status = err.message?.startsWith("404:") ? 404 : 500;
    return NextResponse.json({ error: err.message || "500:INTERNAL_ERROR" }, { status });
  }
}