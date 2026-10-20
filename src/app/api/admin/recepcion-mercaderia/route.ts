import { isAdminEmail } from "@/lib/adminIdentity";
import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado - Token ausente" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userEmail = (decodedToken.email || "").toLowerCase().trim();

    if (!isAdminEmail(userEmail)) {
      return NextResponse.json({ error: "Acceso denegado: Se requieren permisos del Administrador Único" }, { status: 403 });
    }

    const body = await req.json();
    const { 
      solicitudId, prodId, unitId, numeroSerie, 
      estadoFisico, tieneIncidencia, observacionesIncidencia, fotosInternas 
    } = body;

    if (!solicitudId) {
      return NextResponse.json({ error: "solicitudId es requerido" }, { status: 400 });
    }

    let solRef = admin.firestore().collection("solicitudes").doc(solicitudId);
    let solSnap = await solRef.get();

    if (!solSnap.exists) {
      solRef = admin.firestore().collection("solicitudes_cuenta").doc(solicitudId);
      solSnap = await solRef.get();
    }

    if (!solSnap.exists) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    const timestampIso = new Date().toISOString();
    const incidenciaBool = Boolean(tieneIncidencia);
    const estadoFisicoStr = (estadoFisico || "EXCELENTE").trim();

    const recepcionRegistro = {
      timestamp: timestampIso,
      admin: userEmail,
      numeroSerie: (numeroSerie || "").trim(),
      estadoFisico: estadoFisicoStr,
      tieneIncidencia: incidenciaBool,
      observacionesIncidencia: (observacionesIncidencia || "").trim(),
      fotosInternas: Array.isArray(fotosInternas) ? fotosInternas : []
    };

    const estadoAdquisicion = incidenciaBool ? "INCIDENCIA" : "RECIBIDO";
    const estadoProductoMsg = incidenciaBool ? "En revisión por incidencia física" : "Recibido en Depósito Central (Verificado)";

    const updatePayload: any = {
      numeroSerie: (numeroSerie || solSnap.data()?.numeroSerie || "").trim(),
      estadoAdquisicionStock: estadoAdquisicion,
      estadoProducto: estadoProductoMsg,
      proveedorEstado: incidenciaBool ? "INCIDENCIA" : "RECIBIDO",
      fechaRecepcionReal: timestampIso,
      recepcionDetalle: recepcionRegistro,
      historialRecepcionRegistro: admin.firestore.FieldValue.arrayUnion(recepcionRegistro)
    };

    await solRef.update(updatePayload);

    return NextResponse.json({
      ok: true,
      mensaje: incidenciaBool ? "Mercadería recibida con registro de incidencia." : "Mercadería recibida y verificada exitosamente.",
      solicitudId,
      recepcionDetalle: recepcionRegistro
    });

  } catch (error: any) {
    console.error("Error en POST /api/admin/recepcion-mercaderia:", error);
    return NextResponse.json({ error: "Error al registrar recepción: " + error.message }, { status: 500 });
  }
}
