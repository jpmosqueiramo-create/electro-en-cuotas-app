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
    const { solicitudId, prodId, unitId, motivo } = body;

    if (!solicitudId || !prodId) {
      return NextResponse.json({ error: "solicitudId y prodId son requeridos" }, { status: 400 });
    }

    const timestampIso = new Date().toISOString();

    await admin.firestore().runTransaction(async (transaction) => {
      let solRef = admin.firestore().collection("solicitudes").doc(solicitudId);
      let solSnap = await transaction.get(solRef);

      if (!solSnap.exists) {
        solRef = admin.firestore().collection("solicitudes_cuenta").doc(solicitudId);
        solSnap = await transaction.get(solRef);
      }

      if (!solSnap.exists) throw new Error("404:Solicitud no encontrada.");

      const prodRef = admin.firestore().collection("productos").doc(prodId);
      const prodSnap = await transaction.get(prodRef);

      if (prodSnap.exists) {
        const prodData = prodSnap.data() || {};
        const stockActual: any[] = prodData.stock || [];
        const stockModificado = stockActual.map((u: any) => {
          if (u.id === unitId || u.asignadoA === solicitudId) {
            return { ...u, estado: "Disponible", asignadoA: null, fechaReserva: null };
          }
          return u;
        });
        transaction.update(prodRef, { stock: stockModificado });
      }

      const registroLiberacion = {
        timestamp: timestampIso,
        admin: userEmail,
        accion: "LIBERACION_RESERVA",
        prodId,
        unitId: unitId || "",
        motivo: (motivo || "Liberación manual por Administrador").trim()
      };

      transaction.update(solRef, {
        vinculoProductoId: "",
        vinculoUnidadId: "",
        numeroSerie: "",
        sucursalDestino: "",
        estadoAdquisicionStock: "PENDIENTE_ENCARGO",
        estadoProducto: "En depósito (Central)",
        historialRecepcion: "Reserva de stock liberada. Unidad devuelta a disponibles en catálogo.",
        historialReserva: admin.firestore.FieldValue.arrayUnion(registroLiberacion)
      });
    });

    return NextResponse.json({
      ok: true,
      mensaje: "Reserva de stock liberada exitosamente.",
      solicitudId
    });

  } catch (error: any) {
    console.error("Error en POST /api/admin/liberar-reserva:", error);
    const msg = error.message || "";
    if (msg.startsWith("404:")) return NextResponse.json({ error: msg.substring(4) }, { status: 404 });
    return NextResponse.json({ error: "Error al liberar reserva: " + msg }, { status: 500 });
  }
}
