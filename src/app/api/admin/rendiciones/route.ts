import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import { validarAdminToken } from "@/lib/adminAuth";
import { registrarRendicionEfectivo } from "@/lib/settlementsEngine";

export async function GET(req: Request) {
  try {
    const authRes = await validarAdminToken(req);
    if (!authRes.valid) {
      return NextResponse.json({ error: "403:FORBIDDEN: Acceso restringido al Administrador." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const vendedorAfiliadoId = searchParams.get("vendedorAfiliadoId");

    const db = admin.firestore();
    let query: admin.firestore.Query = db.collection("rendiciones_efectivo");
    if (vendedorAfiliadoId) {
      query = query.where("vendedorAfiliadoId", "==", vendedorAfiliadoId.trim());
    }

    const snap = await query.get();
    const rendiciones: any[] = [];
    snap.forEach(doc => rendiciones.push(doc.data()));

    rendiciones.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({ rendiciones });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "500:INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authRes = await validarAdminToken(req);
    if (!authRes.valid) {
      return NextResponse.json({ error: "403:FORBIDDEN: Acceso restringido al Administrador." }, { status: 403 });
    }

    const body = await req.json();
    if (!body || !body.idempotencyKey || typeof body.idempotencyKey !== "string" || !body.idempotencyKey.trim()) {
      return NextResponse.json({ error: "400:IDEMPOTENCY_KEY_REQUERIDO: Se requiere clave de idempotencia." }, { status: 400 });
    }
    const db = admin.firestore();

    const result = await registrarRendicionEfectivo(db, {
      vendedorAfiliadoId: body.vendedorAfiliadoId,
      vendedorAfiliadoEmail: body.vendedorAfiliadoEmail || "",
      montoRendidoCentavos: body.montoRendidoCentavos,
      metodoEntrega: body.metodoEntrega,
      observaciones: body.observaciones,
      comprobanteReferencia: body.comprobanteReferencia,
      adminUid: authRes.uid || "admin",
      idempotencyKey: body.idempotencyKey
    });

    return NextResponse.json({ ok: true, rendicion: result });
  } catch (err: any) {
    const status = err.message?.startsWith("400:") ? 400 : 500;
    return NextResponse.json({ error: err.message || "500:INTERNAL_ERROR" }, { status });
  }
}