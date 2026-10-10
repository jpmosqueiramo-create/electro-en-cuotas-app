import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const enableAcceptance = process.env.ENABLE_ELECTRONIC_ACCEPTANCE === "true";
    const whatsappApiKey = process.env.WHATSAPP_API_KEY || process.env.TWILIO_AUTH_TOKEN;
    const hasRealProvider = Boolean(whatsappApiKey && whatsappApiKey.length > 5);

    if (!enableAcceptance || !hasRealProvider) {
      return NextResponse.json({
        error: "La aceptación electrónica registrada se encuentra deshabilitada en el servidor por configuración de seguridad.",
        deshabilitadoCliente: true
      }, { status: 503 });
    }

    const body = await req.json();
    const { token, clienteDni, propuestaId, version, codigoOtp } = body;

    const dniClean = (clienteDni || "").toString().replace(/\D/g, "");
    const otpClean = (codigoOtp || "").toString().trim();
    const versionNum = Number(version) || 1;

    if (!token || !dniClean || !otpClean || !propuestaId) {
      return NextResponse.json({ error: "Datos incompletos: token, clienteDni, propuestaId y codigoOtp son requeridos" }, { status: 400 });
    }

    const tokenSnap = await admin.firestore().collection("tokens_propuesta").doc(token).get();
    if (!tokenSnap.exists) {
      return NextResponse.json({ error: "Token de acceso inválido" }, { status: 404 });
    }

    const solicitudId = tokenSnap.data()?.solicitudId;
    const otpRef = admin.firestore().collection("otps").doc(solicitudId);
    const otpSnap = await otpRef.get();

    if (!otpSnap.exists) {
      return NextResponse.json({ error: "No se encontró un código OTP activo. Solicitá uno nuevo." }, { status: 404 });
    }

    const otpData = otpSnap.data() || {};

    if (otpData.usado) {
      return NextResponse.json({ error: "El código OTP ya fue utilizado previamente." }, { status: 400 });
    }

    if (otpData.clienteDni !== dniClean) {
      return NextResponse.json({ error: "El DNI no coincide con el registro del OTP." }, { status: 403 });
    }

    if (otpData.propuestaId !== propuestaId || Number(otpData.version) !== versionNum) {
      return NextResponse.json({ error: "El código OTP pertenece a otra propuesta o versión." }, { status: 400 });
    }

    if (Date.now() > new Date(otpData.expiracionIso).getTime()) {
      return NextResponse.json({ error: "El código OTP ha expirado. Solicitá uno nuevo." }, { status: 410 });
    }

    const intentosActuales = otpData.intentos || 0;
    if (intentosActuales >= 5) {
      return NextResponse.json({ error: "Se ha superado el número máximo de intentos fallidos (5)." }, { status: 429 });
    }

    // Verificar hash
    const hashCalculado = crypto.createHash("sha256").update(`${otpClean}:${otpData.salt}`).digest("hex");
    if (hashCalculado !== otpData.otpHash) {
      // REGISTRAR E INCREMENTAR INTENTOS DE FORMA PERSISTENTE SIN REVERTIR CON ERROR DE TRANSACCIÓN
      await otpRef.update({ intentos: admin.firestore.FieldValue.increment(1) });
      return NextResponse.json({ error: `Código OTP incorrecto. Intentos consumidos: ${intentosActuales + 1} de 5.` }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      verificado: true,
      mensaje: "Verificación de OTP correcta."
    });

  } catch (error: any) {
    console.error("Error en POST /api/otp/verificar:", error);
    return NextResponse.json({ error: "Error al verificar OTP: " + error.message }, { status: 500 });
  }
}
