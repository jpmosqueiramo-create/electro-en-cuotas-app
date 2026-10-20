import { isAdminEmail } from "@/lib/adminIdentity";
import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
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

    const snap = await admin.firestore().collection("notificaciones").where("afiliadoEmail", "==", userEmail).get();

    const notificaciones = snap.docs.map((d) => {
      const data = d.data();
      // FILTRAR Y SANITIZAR CUALQUIER INFORMACIÓN FINANCIERA PRIVADA DE COMISIONES
      let msj = data.mensaje || "";
      if (msj.includes("Comisión asignada") || msj.includes("%")) {
        // Limpiar texto que contenga detalles de comisión
        msj = msj.split(". Comisión")[0] + ".";
      }

      return {
        id: d.id,
        operacionId: data.operacionId || null,
        tipo: data.tipo || "OPERATIVA",
        mensaje: msj,
        fecha: data.fecha || new Date().toISOString(),
        leida: data.leida === true,
        clienteNombre: data.clienteNombre || null,
        cuotaAsociada: data.cuotaAsociada || null
      };
    });

    notificaciones.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return NextResponse.json({ notificaciones });

  } catch (error: any) {
    console.error("Error en GET /api/afiliado/notificaciones:", error);
    return NextResponse.json({ error: "Error al obtener notificaciones: " + error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userEmail = (decodedToken.email || "").toLowerCase().trim();

    const body = await req.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json({ error: "notificationId es requerido" }, { status: 400 });
    }

    const docRef = admin.firestore().collection("notificaciones").doc(notificationId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
    }

    const data = docSnap.data() || {};
    if ((data.afiliadoEmail || "").toLowerCase().trim() !== userEmail && !isAdminEmail(userEmail)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await docRef.update({ leida: true });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Error en PATCH /api/afiliado/notificaciones:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
