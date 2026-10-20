import { isAdminEmail } from "@/lib/adminIdentity";
import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado - Token ausente" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userEmail = (decodedToken.email || "").toLowerCase().trim();
    const callerUid = decodedToken.uid;

    const db = admin.firestore();
    let vendedorDoc: any = null;
    let vendedorId = "";

    const vSnapUid = await db.collection("vendedores").where("authUid", "==", callerUid).get();
    if (!vSnapUid.empty) {
      vendedorDoc = vSnapUid.docs[0].data();
      vendedorId = vSnapUid.docs[0].id;
    } else {
      const vSnapEmail = await db.collection("vendedores").where("email", "==", userEmail).get();
      if (!vSnapEmail.empty) {
        vendedorDoc = vSnapEmail.docs[0].data();
        vendedorId = vSnapEmail.docs[0].id;
      }
    }

    let esActivo = false;
    if (vendedorDoc) {
      if (vendedorDoc.activo !== false) esActivo = true;
    } else if (isAdminEmail(userEmail)) {
      esActivo = true;
    }

    if (!esActivo) {
      return NextResponse.json({ error: "403:VENDEDOR_NO_AUTORIZADO: Vendedor inactivo o no autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const targetOpId = body.operacionId || body.solicitudId;
    const texto = body.texto;

    if (!targetOpId || !texto || !texto.trim()) {
      return NextResponse.json({ error: "El texto de la observación es obligatorio" }, { status: 400 });
    }

    const docRef = db.collection("solicitudes").doc(targetOpId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });
    }

    const solData = docSnap.data() || {};
    const isAssigned =
      (solData.vendedorAfiliadoId && (solData.vendedorAfiliadoId === vendedorId || solData.vendedorAfiliadoId === callerUid)) ||
      (solData.vendedorId && (solData.vendedorId === vendedorId || solData.vendedorId === callerUid)) ||
      (solData.afiliadoId && (solData.afiliadoId === vendedorId || solData.afiliadoId === callerUid)) ||
      (solData.afiliadoEmail && solData.afiliadoEmail.toLowerCase().trim() === userEmail) ||
      (solData.vendedorAfiliadoEmail && solData.vendedorAfiliadoEmail.toLowerCase().trim() === userEmail) ||
      (isAdminEmail(userEmail));

    if (!isAssigned) {
      return NextResponse.json({ error: "403:VENDEDOR_NO_AUTORIZADO: Operación no asignada a este vendedor" }, { status: 403 });
    }

    const obsPrevias = solData.observacionesInternas || solData.historialContactos || [];

    const nuevaObservacion = {
      id: "obs_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      texto: texto.trim(),
      autor: userEmail,
      fecha: new Date().toISOString()
    };

    const obsActualizadas = [nuevaObservacion, ...obsPrevias];

    await docRef.update({
      observacionesInternas: obsActualizadas
    });

    return NextResponse.json({ success: true, observacion: nuevaObservacion });
  } catch (error: any) {
    console.error("Error en POST /api/afiliado/observaciones:", error);
    return NextResponse.json({ error: "Error al registrar la observación: " + error.message }, { status: 500 });
  }
}
