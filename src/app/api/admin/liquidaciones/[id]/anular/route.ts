import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import { validarAdminToken } from "@/lib/adminAuth";
import { registrarConfiguracionComisionVendedor, porcentajeAPuntosBasicos } from "@/lib/commissionsEngine";
import { resolverVendedorCanonico } from "@/lib/settlementsEngine";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authRes = await validarAdminToken(req);
    if (!authRes.valid) {
      return NextResponse.json({ error: "403:FORBIDDEN: Acceso restringido al Administrador." }, { status: 403 });
    }

    const { id } = await context.params;
    const vendorId = id.trim();
    const body = await req.json();
    if (!body || !body.idempotencyKey || typeof body.idempotencyKey !== "string" || !body.idempotencyKey.trim()) {
      return NextResponse.json({ error: "400:IDEMPOTENCY_KEY_REQUERIDO: Se requiere clave de idempotencia." }, { status: 400 });
    }

    let basisPoints: number;
    if (body && (typeof body.porcentajeInput === "string" || typeof body.porcentajeInput === "number")) {
      basisPoints = porcentajeAPuntosBasicos(body.porcentajeInput);
    } else if (body && typeof body.porcentajeComisionBasisPoints === "number") {
      basisPoints = body.porcentajeComisionBasisPoints;
      if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > 10000) {
        return NextResponse.json({ error: "400:PORCENTAJE_INVALIDO: El porcentaje de comisión debe estar entre 0% y 100% con máximo 2 decimales." }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "400:PORCENTAJE_REQUERIDO: Debe especificar el porcentaje de comisión." }, { status: 400 });
    }

    if (!body.motivo || typeof body.motivo !== "string" || !body.motivo.trim()) {
      return NextResponse.json({ error: "400:MOTIVO_REQUERIDO: El motivo del cambio de porcentaje es obligatorio." }, { status: 400 });
    }

    const db = admin.firestore();

    // STRICT: Vendor must exist by ID or email, otherwise fail 404 and DO NOT write commission config
    const vendorData = await resolverVendedorCanonico(db, vendorId);
    if (!vendorData) {
      return NextResponse.json({ error: "404:VENDEDOR_NO_ENCONTRADO: El vendedor especificado no existe." }, { status: 404 });
    }
    const canonicalVendorId = vendorData.id;
    const vendorEmail = body.vendedorAfiliadoEmail || vendorData.email;

    const vigenteDesde = body.vigenteDesde && typeof body.vigenteDesde === "string" && body.vigenteDesde.trim()
      ? body.vigenteDesde.trim()
      : new Date().toISOString();

    const config = await registrarConfiguracionComisionVendedor(db, {
      vendedorAfiliadoId: canonicalVendorId,
      vendedorAfiliadoEmail: vendorEmail,
      porcentajeComisionBasisPoints: basisPoints,
      vigenteDesde,
      motivoCambio: body.motivo.trim(),
      actualizadoPorAdminUid: authRes.uid || "admin"
    });

    return NextResponse.json({ ok: true, configuracion: config });
  } catch (err: unknown) {
    const status = (err as Error).message?.startsWith("404:")
      ? 404
      : ((err as Error).message?.startsWith("400:")
      ? 400
      : ((err as Error).message?.startsWith("409:") ? 409 : 500));
    return NextResponse.json({ error: (err as Error).message || "500:INTERNAL_ERROR" }, { status });
  }
}
