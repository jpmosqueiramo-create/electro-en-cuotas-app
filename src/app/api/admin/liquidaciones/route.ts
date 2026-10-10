import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import { validarAdminToken } from "@/lib/adminAuth";
import { crearBorradorLiquidacion, enriquecerLiquidacionesConIncidencias, LiquidacionComision } from "@/lib/settlementsEngine";

export async function GET(req: Request) {
  try {
    const authRes = await validarAdminToken(req);
    if (!authRes.valid) {
      return NextResponse.json({ error: "403:FORBIDDEN: Acceso restringido al Administrador." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const vendedorAfiliadoId = searchParams.get("vendedorAfiliadoId");

    const db = admin.firestore();
    let query: admin.firestore.Query = db.collection("liquidaciones_comision");

    if (vendedorAfiliadoId) {
      query = query.where("vendedorAfiliadoId", "==", vendedorAfiliadoId.trim());
    }

    const snap = await query.get();
    const rawList: LiquidacionComision[] = snap.docs.map(d => d.data() as LiquidacionComision);
    const liquidaciones = await enriquecerLiquidacionesConIncidencias(db, rawList);
    liquidaciones.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({ liquidaciones });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || "500:INTERNAL_ERROR" }, { status: 500 });
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
    if (!body || !body.idempotencyKey || typeof body.idempotencyKey !== "string" || !body.idempotencyKey.trim()) {
      return NextResponse.json({ error: "400:IDEMPOTENCY_KEY_REQUERIDO: Se requiere clave de idempotencia." }, { status: 400 });
    }
    const db = admin.firestore();

    const result = await crearBorradorLiquidacion(db, {
      vendedorAfiliadoId: body.vendedorAfiliadoId,
      vendedorAfiliadoEmail: body.vendedorAfiliadoEmail,
      montoSolicitadoCentavos: body.montoSolicitadoCentavos,
      periodoDesde: body.periodoDesde,
      periodoHasta: body.periodoHasta,
      creadoPorAdminUid: authRes.uid || "admin",
      idempotencyKey: body.idempotencyKey
    });

    return NextResponse.json({ ok: true, liquidacion: result });
  } catch (err: unknown) {
    const status = (err as Error).message?.startsWith("400:") ? 400 : 500;
    return NextResponse.json({ error: (err as Error).message || "500:INTERNAL_ERROR" }, { status });
  }
}
