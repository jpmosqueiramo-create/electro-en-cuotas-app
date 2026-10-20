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
      solicitudId, proveedorNombre, proveedorGuia, proveedorCosto, 
      proveedorFechaPedido, proveedorFechaEstimada, proveedorEstado, 
      proveedorFacturaTicket, observaciones 
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

    const solData = solSnap.data() || {};

    // 1. Verificación del Servidor: Aceptación Válida Requerida
    const tienePropuestaAceptada = Boolean(
      solData.propuestaAceptada ||
      solData.estado === "PROPOSAL_ACCEPTED" ||
      solData.estadoPropuesta === "PROPUESTA_ACEPTADA"
    );

    if (!tienePropuestaAceptada) {
      return NextResponse.json({ 
        error: "Bloqueo del Servidor: No se puede encargar al proveedor ni modificar pedidos sin una propuesta previamente aceptada por el cliente." 
      }, { status: 403 });
    }

    const timestampIso = new Date().toISOString();
    const estadoAnterior = solData.proveedorEstado || "PENDIENTE_ENCARGO";
    const estadoNuevo = (proveedorEstado || "SOLICITADO").trim();

    // Registro de Auditoría en Historial de Cambios de Proveedor (Sin borrar historial previo)
    const cambioHistorial = {
      timestamp: timestampIso,
      admin: userEmail,
      estadoAnterior,
      estadoNuevo,
      proveedorNombre: (proveedorNombre || solData.proveedorNombre || "").trim(),
      proveedorGuia: (proveedorGuia || solData.proveedorGuia || "").trim(),
      proveedorCosto: Number(proveedorCosto) || solData.proveedorCosto || 0,
      facturaTicket: (proveedorFacturaTicket || solData.proveedorFacturaTicket || "").trim(),
      observaciones: (observaciones || "").trim()
    };

    const updatePayload: any = {
      proveedorNombre: (proveedorNombre || "").trim() || null,
      proveedorGuia: (proveedorGuia || "").trim() || null,
      proveedorCosto: Number(proveedorCosto) || 0,
      proveedorFechaPedido: proveedorFechaPedido || solData.proveedorFechaPedido || new Date().toISOString().split("T")[0],
      proveedorFechaEstimada: proveedorFechaEstimada || solData.proveedorFechaEstimada || null,
      proveedorEstado: estadoNuevo,
      estadoAdquisicionStock: estadoNuevo,
      proveedorFacturaTicket: (proveedorFacturaTicket || "").trim() || null,
      facturaProveedorOriginal: (proveedorFacturaTicket || "").trim() || null,
      historialCambiosProveedor: admin.firestore.FieldValue.arrayUnion(cambioHistorial)
    };

    if (estadoNuevo === "RECIBIDO") {
      updatePayload.proveedorFechaRecepcion = timestampIso;
    }

    await solRef.update(updatePayload);

    return NextResponse.json({
      ok: true,
      mensaje: "Estado de pedido a proveedor actualizado correctamente.",
      solicitudId,
      cambioHistorial
    });

  } catch (error: any) {
    console.error("Error en POST /api/admin/pedido-proveedor:", error);
    return NextResponse.json({ error: "Error al registrar pedido a proveedor: " + error.message }, { status: 500 });
  }
}
