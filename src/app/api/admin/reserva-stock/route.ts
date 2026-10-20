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
    const { solicitudId, prodId, unitId, numSerie, destino } = body;

    if (!solicitudId || !prodId || !destino) {
      return NextResponse.json({ error: "solicitudId, prodId y destino son requeridos" }, { status: 400 });
    }

    const timestampIso = new Date().toISOString();

    // RESERVA TRANSACCIONAL FIRESTORE ATÓMICA CON CONTROL DE CONCURRENCIA
    const resultadoReserva = await admin.firestore().runTransaction(async (transaction) => {
      // A. Leer Solicitud
      let solRef = admin.firestore().collection("solicitudes").doc(solicitudId);
      let solSnap = await transaction.get(solRef);

      if (!solSnap.exists) {
        solRef = admin.firestore().collection("solicitudes_cuenta").doc(solicitudId);
        solSnap = await transaction.get(solRef);
      }

      if (!solSnap.exists) {
        throw new Error("404:Solicitud no encontrada.");
      }

      const solData = solSnap.data() || {};

      // Verificación de Aceptación Válida
      const tienePropuestaAceptada = Boolean(
        solData.propuestaAceptada ||
        solData.estado === "PROPOSAL_ACCEPTED" ||
        solData.estadoPropuesta === "PROPUESTA_ACEPTADA"
      );

      if (!tienePropuestaAceptada) {
        throw new Error("403:No se puede reservar stock sin una propuesta previamente aceptada por el cliente.");
      }

      // B. Leer Producto
      const prodRef = admin.firestore().collection("productos").doc(prodId);
      const prodSnap = await transaction.get(prodRef);

      if (!prodSnap.exists) {
        throw new Error("404:Producto no encontrado en el catálogo.");
      }

      const prodData = prodSnap.data() || {};
      const stockActual: any[] = prodData.stock || [];
      let origen = "Depósito Central";
      let unidadEncontrada = false;

      // C. Verificar Disponibilidad de Unidad Específica dentro de la Transacción
      const stockModificado = stockActual.map((u: any) => {
        if (u.id === unitId) {
          unidadEncontrada = true;
          // ANTICOLISIÓN: Si la unidad ya está reservada por otra operación distinta, abortar la transacción
          if (u.estado === "Reservado" && u.asignadoA && u.asignadoA !== solicitudId) {
            throw new Error(`409:La unidad con Serie/IMEI ${u.nserie || numSerie || unitId} ya fue reservada por otra operación (${u.asignadoA}).`);
          }

          origen = u.localidad || "Depósito Central";
          return {
            ...u,
            estado: "Reservado",
            asignadoA: solicitudId,
            fechaReserva: timestampIso,
            nserie: numSerie || u.nserie || ""
          };
        }
        return u;
      });

      if (unitId && unitId !== "manual" && !unidadEncontrada) {
        throw new Error("404:La unidad física especificada no existe en el catálogo.");
      }

      const registroReserva = {
        timestamp: timestampIso,
        admin: userEmail,
        accion: "RESERVA_STOCK",
        prodId,
        unitId: unitId || "manual",
        numeroSerie: numSerie || "",
        origen,
        destino
      };

      // Actualizaciones Atómicas en Transacción
      transaction.update(prodRef, { stock: stockModificado });
      transaction.update(solRef, {
        vinculoProductoId: prodId,
        vinculoUnidadId: unitId || "manual",
        numeroSerie: numSerie || "",
        sucursalDestino: destino,
        estadoAdquisicionStock: "RESERVADO_STOCK",
        estadoProducto: origen === destino ? "En stock (Afiliado)" : "En viaje",
        historialRecepcion: origen === destino 
          ? `Reserva de stock transaccional: Unidad ${numSerie || "S/N"} asignada localmente en ${destino}.`
          : `Reserva de stock transaccional: Unidad ${numSerie || "S/N"} asignada en ${origen} hacia ${destino}.`,
        historialReserva: admin.firestore.FieldValue.arrayUnion(registroReserva)
      });

      return {
        solicitudId,
        prodId,
        unitId,
        numeroSerie: numSerie,
        origen,
        destino,
        registroReserva
      };
    });

    return NextResponse.json({
      ok: true,
      mensaje: "Reserva de stock realizada exitosamente mediante transacción atómica.",
      ...resultadoReserva
    });

  } catch (error: any) {
    console.error("Error en POST /api/admin/reserva-stock:", error);
    const msg = error.message || "";
    if (msg.startsWith("404:")) return NextResponse.json({ error: msg.substring(4) }, { status: 404 });
    if (msg.startsWith("403:")) return NextResponse.json({ error: msg.substring(4) }, { status: 403 });
    if (msg.startsWith("409:")) return NextResponse.json({ error: msg.substring(4) }, { status: 409 });

    return NextResponse.json({ error: "Error al reservar stock: " + msg }, { status: 500 });
  }
}
