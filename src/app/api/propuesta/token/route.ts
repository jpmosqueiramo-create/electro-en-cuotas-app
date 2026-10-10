import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado - Token ausente" }, { status: 401 });
    }

    const tokenHeader = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(tokenHeader);
    const userEmail = (decodedToken.email || "").toLowerCase().trim();

    if (userEmail !== "jpmosqueiramo@gmail.com" && decodedToken.admin !== true) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const { solicitudId, expiracionDias } = body;

    if (!solicitudId) {
      return NextResponse.json({ error: "solicitudId es requerido" }, { status: 400 });
    }

    // Verificar existencia de la solicitud
    let solSnap = await admin.firestore().collection("solicitudes").doc(solicitudId).get();
    if (!solSnap.exists) {
      solSnap = await admin.firestore().collection("solicitudes_cuenta").doc(solicitudId).get();
    }

    if (!solSnap.exists) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    const solData = solSnap.data() || {};
    const dniClean = (solData.numeroDni || solData.dni || solData.datosPersonales?.numeroDni || "").toString().replace(/\D/g, "");

    // Generar token aleatorio criptográficamente seguro de 32 bytes (64 caracteres hex)
    const tokenHex = crypto.randomBytes(32).toString("hex");
    const dias = Number(expiracionDias) || 7;
    const expiracionIso = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();

    const tokenDoc = {
      token: tokenHex,
      solicitudId,
      dniClean,
      expiracionIso,
      revocado: false,
      creadoEn: new Date().toISOString(),
      creadoPor: userEmail
    };

    await admin.firestore().collection("tokens_propuesta").doc(tokenHex).set(tokenDoc);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const enlaceAcceso = `${baseUrl}/propuesta?token=${tokenHex}`;

    return NextResponse.json({
      ok: true,
      token: tokenHex,
      enlaceAcceso,
      expiracionIso
    });

  } catch (error: any) {
    console.error("Error en POST /api/propuesta/token:", error);
    return NextResponse.json({ error: "Error al generar token de acceso: " + error.message }, { status: 500 });
  }
}
