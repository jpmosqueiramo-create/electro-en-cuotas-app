import { isAdminEmail } from "@/lib/adminIdentity";
import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import { registrarPromesaPago } from "@/lib/expirationEngine";


export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado - Token ausente" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userEmail = (decodedToken.email || "").toLowerCase().trim();

    if (!userEmail) {
      return NextResponse.json({ error: "Token inválido sin email" }, { status: 401 });
    }

    // Verificar si el usuario es un vendedor afiliado activo o admin
    const vendedoresSnap = await admin.firestore().collection("vendedores").where("email", "==", userEmail).get();
    let esActivo = false;
    if (!vendedoresSnap.empty) {
      vendedoresSnap.forEach((doc) => {
        if (doc.data().activo !== false) esActivo = true;
      });
    } else if (isAdminEmail(userEmail)) {
      esActivo = true;
    }

    if (!esActivo) {
      return NextResponse.json({ error: "Acceso denegado: Vendedor inactivo o no autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { operacionId, solicitudId, fechaPrometida, observacion, montoPrometidoCentavos } = body;
    const targetSolId = solicitudId || operacionId;

    if (!targetSolId || !fechaPrometida) {
      return NextResponse.json({ error: "Faltan campos obligatorios (solicitudId, fechaPrometida)" }, { status: 400 });
    }

    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!fechaRegex.test(fechaPrometida.trim())) {
      return NextResponse.json({ error: "La fecha prometida debe tener un formato válido (AAAA-MM-DD)" }, { status: 400 });
    }

    const docRef = admin.firestore().collection("solicitudes").doc(targetSolId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });
    }

    const solData = docSnap.data() || {};
    const solAfiliado = (solData.afiliadoEmail || solData.vendedorEmail || solData.vendedorId || solData.afiliadoId || "").toString().toLowerCase().trim();

    if (solAfiliado !== userEmail && solAfiliado !== decodedToken.uid && !isAdminEmail(userEmail)) {
      return NextResponse.json({ error: "Operación no asignada a este vendedor" }, { status: 403 });
    }

    if (solData.estado === "ANULADO" || solData.estado === "CANCELADO") {
      return NextResponse.json({ error: "La operación está cancelada o anulada" }, { status: 400 });
    }

    // Registrar promesa append-only en motor de vencimientos 3B.3
    const promesa3B3 = await registrarPromesaPago(admin.firestore(), {
      solicitudId: targetSolId,
      clienteId: solData.clienteId || solData.clienteAuthUid || "CLIENTE",
      fechaPrometida: fechaPrometida.trim(),
      montoPrometidoCentavos: montoPrometidoCentavos ? Number(montoPrometidoCentavos) : null,
      nota: observacion || null,
      creadaPor: userEmail,
      creadaPorRol: isAdminEmail(userEmail) ? "ADMIN" : "VENDEDOR_AFILIADO"
    });

    // Registrar notificación operativa
    await admin.firestore().collection("notificaciones").add({
      afiliadoEmail: userEmail,
      operacionId: targetSolId,
      tipo: "PROMESA_REGISTRADA",
      mensaje: `Se confirmó promesa de pago (Fecha: ${fechaPrometida}).`,
      fecha: new Date().toISOString(),
      leida: false
    });

    return NextResponse.json({ ok: true, success: true, promesa: promesa3B3 });

  } catch (error: unknown) {
    console.error("Error en POST /api/afiliado/promesas:", error);
    const msg = (error as Error)?.message || String(error);
    return NextResponse.json({ error: "Error al registrar la promesa: " + msg }, { status: 500 });
  }
}
