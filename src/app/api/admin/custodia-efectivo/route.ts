import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import { validarAdminToken } from "@/lib/adminAuth";
import { obtenerLedgerCustodiaEfectivo } from "@/lib/settlementsEngine";

export async function GET(req: Request) {
  try {
    const authRes = await validarAdminToken(req);
    if (!authRes.valid) {
      return NextResponse.json({ error: "403:FORBIDDEN: Acceso restringido al Administrador." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const vendedorAfiliadoId = searchParams.get("vendedorAfiliadoId");

    if (!vendedorAfiliadoId) {
      return NextResponse.json({ error: "400:VENDEDOR_ID_REQUERIDO: Debe especificar vendedorAfiliadoId en la consulta." }, { status: 400 });
    }

    const db = admin.firestore();
    const resumen = await obtenerLedgerCustodiaEfectivo(db, vendedorAfiliadoId);

    return NextResponse.json(resumen);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "500:INTERNAL_ERROR" }, { status: 500 });
  }
}