import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import { verifyClientAuth } from "@/lib/clientAuth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      solicitudId,
      montoInformadoCentavos,
      moneda = "ARS",
      medioPago,
      referenciaTransferencia,
      comprobanteStoragePath,
      receptorDeclarado,
      observacionCliente
    } = body;

    if (!solicitudId || montoInformadoCentavos === undefined || !medioPago) {
      return NextResponse.json({ error: "400:PAGO_INFORMADO_PARAMETROS_INVALIDOS: Se requieren solicitudId, montoInformadoCentavos y medioPago." }, { status: 400 });
    }

    const montoNum = Number(montoInformadoCentavos);
    if (!Number.isSafeInteger(montoNum) || montoNum <= 0) {
      return NextResponse.json({ error: "400:PAGO_INFORMADO_MONTO_INVALIDO: montoInformadoCentavos debe ser un entero positivo seguro en centavos." }, { status: 400 });
    }

    if (moneda !== "ARS" && moneda !== "USD") {
      return NextResponse.json({ error: "400:PAGO_INFORMADO_MONEDA_INVALIDA: La moneda debe ser expresamente ARS o USD." }, { status: 400 });
    }

    if (medioPago !== "TRANSFERENCIA" && medioPago !== "EFECTIVO") {
      return NextResponse.json({ error: "400:MEDIO_PAGO_INVALIDO: Únicamente se admiten los medios de pago TRANSFERENCIA o EFECTIVO." }, { status: 400 });
    }

    const authCheck = await verifyClientAuth(req, solicitudId);
    if (!authCheck.authorized) {
      return authCheck.errorResponse!;
    }

    const db = admin.firestore();
    const solSnap = await db.collection("solicitudes").doc(solicitudId).get();
    if (!solSnap.exists) {
      return NextResponse.json({ error: "La solicitud especificada no existe." }, { status: 404 });
    }

    const solData = solSnap.data() || {};
    const pagoInformadoId = "pago_inf_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
    const timestampIso = new Date().toISOString();

    const pagoInformadoDoc = {
      id: pagoInformadoId,
      solicitudId,
      clienteId: solData.clienteId || solData.dni || solData.datosPersonales?.dni || "SN",
      montoInformadoCentavos: montoNum,
      moneda,
      medioPago,
      fechaInformada: timestampIso,
      fechaCarga: timestampIso,
      estadoValidacion: "PENDIENTE_VALIDACION",
      observacionCliente: observacionCliente || null,
      referenciaTransferencia: referenciaTransferencia || null,
      comprobanteStoragePath: comprobanteStoragePath || null,
      receptorDeclarado: receptorDeclarado || null
    };

    await db.collection("pagos_informados").doc(pagoInformadoId).set(pagoInformadoDoc);

    return NextResponse.json({ ok: true, pagoInformado: pagoInformadoDoc });

  } catch (error: unknown) {
    console.error("Error en POST /api/cliente/pagos-informados:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const solicitudId = searchParams.get("solicitudId");

    if (!solicitudId) {
      return NextResponse.json({ error: "Parámetro solicitudId requerido." }, { status: 400 });
    }

    const authCheck = await verifyClientAuth(req, solicitudId);
    if (!authCheck.authorized) {
      return authCheck.errorResponse!;
    }

    const db = admin.firestore();
    const snap = await db.collection("pagos_informados")
      .where("solicitudId", "==", solicitudId)
      .get();

    const pagosInformados: Record<string, unknown>[] = [];
    snap.forEach(d => pagosInformados.push(d.data()));

    return NextResponse.json({ ok: true, pagosInformados });

  } catch (error: unknown) {
    console.error("Error en GET /api/cliente/pagos-informados:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
