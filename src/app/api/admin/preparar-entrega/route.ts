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

    if (userEmail !== "jpmosqueiramo@gmail.com" && decodedToken.admin !== true) {
      return NextResponse.json({ error: "Acceso denegado: Se requieren permisos del Administrador Único" }, { status: 403 });
    }

    const body = await req.json();
    const { solicitudId, ordenRuta, observacionesEntrega } = body;

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

    const solData = solSnap.data() || {};

    // 1. NO PERMITIR PREPARAR ENTREGA SI EXISTEN INCIDENCIAS PENDIENTES
    if (solData.estadoAdquisicionStock === "INCIDENCIA" || solData.proveedorEstado === "INCIDENCIA") {
      return NextResponse.json({ 
        error: "No se puede preparar la entrega: La operación posee una incidencia física o de proveedor pendiente de resolución." 
      }, { status: 409 });
    }

    // 2. VERIFICAR COMPROBACIÓN DE EXPEDIENTE PRE-ENTREGA
    const tienePropuestaAceptada = Boolean(solData.propuestaAceptada || solData.estado === "PROPOSAL_ACCEPTED");
    const tieneProductoAsignado = Boolean(solData.numeroSerie || solData.vinculoUnidadId);
    const tieneDatosContractuales = Boolean(
      (solData.numeroDni || solData.dni || solData.datosPersonales?.numeroDni) &&
      (solData.direccion || solData.datosPersonales?.direccion)
    );

    if (!tienePropuestaAceptada || !tieneProductoAsignado || !tieneDatosContractuales) {
      return NextResponse.json({
        error: "Expediente incompleto para preparar entrega: Requiere propuesta aceptada, identificación de producto (Serie/IMEI) y datos de domicilio del titular."
      }, { status: 400 });
    }

    const timestampIso = new Date().toISOString();

    const updatePayload: any = {
      estadoLogistico: "PREPARADO_ENTREGA",
      estadoEntrega: "PREPARADO_ENTREGA",
      ordenRuta: Number(ordenRuta) || 1,
      fechaPreparacionEntrega: timestampIso,
      observacionesEntrega: (observacionesEntrega || "").trim() || solData.observacionesEntrega || "",
      preparadoPor: userEmail
    };

    await solRef.update(updatePayload);

    return NextResponse.json({
      ok: true,
      mensaje: "Operación preparada fehacientemente para entrega y ordenamiento de ruta.",
      solicitudId,
      ordenRuta: updatePayload.ordenRuta
    });

  } catch (error: any) {
    console.error("Error en POST /api/admin/preparar-entrega:", error);
    return NextResponse.json({ error: "Error al preparar entrega: " + error.message }, { status: 500 });
  }
}
