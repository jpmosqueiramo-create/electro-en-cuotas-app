import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import { calcularEstadoFinancieroOperacion } from "@/lib/ledgerEngine";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const callerUid = decodedToken.uid;
    const callerEmail = (decodedToken.email || "").toLowerCase().trim();

    const { searchParams } = new URL(req.url);
    const solicitudId = searchParams.get("solicitudId");

    if (!solicitudId) {
      return NextResponse.json({ error: "solicitudId es requerido" }, { status: 400 });
    }

    const db = admin.firestore();
    const solSnap = await db.collection("solicitudes").doc(solicitudId).get();
    if (!solSnap.exists) {
      return NextResponse.json({ error: "404:SOLICITUD_NO_ENCONTRADA" }, { status: 404 });
    }
    const solData = solSnap.data() || {};
    const isOwner =
      (solData.clienteAuthUid && solData.clienteAuthUid === callerUid) ||
      (solData.clienteId && solData.clienteId === callerUid) ||
      (solData.userId && solData.userId === callerUid) ||
      (solData.clienteEmail && solData.clienteEmail.toLowerCase().trim() === callerEmail);

    if (!isOwner) {
      return NextResponse.json({ error: "403:FORBIDDEN: Acceso denegado a operación ajena." }, { status: 403 });
    }

    const estadoFin = await calcularEstadoFinancieroOperacion(db, solicitudId);

    const pagosSnap = await db.collection("ledger_movimientos")
      .where("solicitudId", "==", solicitudId)
      .where("estado", "==", "ACTIVO")
      .where("tipo", "==", "PAGO")
      .get();

    const pagosAcreditados: any[] = [];
    pagosSnap.forEach((doc) => {
      pagosAcreditados.push(doc.data());
    });

    return NextResponse.json({
      ...estadoFin,
      montoTotalCentavos: estadoFin.totalContractualCentavos,
      pagosAcreditados
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || "INTERNAL_ERROR" }, { status: 500 });
  }
}
