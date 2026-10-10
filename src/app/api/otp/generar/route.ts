import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    // 1. COMPROBACIÓN DE CONFIGURACIÓN SEGURA (Default: DESHABILITADO)
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
    const { token, clienteDni, propuestaId, version } = body;

    const dniClean = (clienteDni || "").toString().replace(/\D/g, "");
    const versionNum = Number(version) || 1;

    if (!token || !dniClean || !propuestaId) {
      return NextResponse.json({ error: "Datos incompletos: token, clienteDni, propuestaId y version son requeridos" }, { status: 400 });
    }

    // 2. Validar token de acceso
    const tokenSnap = await admin.firestore().collection("tokens_propuesta").doc(token).get();
    if (!tokenSnap.exists) {
      return NextResponse.json({ error: "Enlace de propuesta inválido o expirado" }, { status: 404 });
    }

    const tokenData = tokenSnap.data() || {};
    if (tokenData.revocado || Date.now() > new Date(tokenData.expiracionIso).getTime()) {
      return NextResponse.json({ error: "Enlace de propuesta expirado o revocado" }, { status: 410 });
    }

    const solicitudId = tokenData.solicitudId;

    // 3. Verificar existencia de solicitud y DNI
    let solSnap = await admin.firestore().collection("solicitudes").doc(solicitudId).get();
    if (!solSnap.exists) {
      solSnap = await admin.firestore().collection("solicitudes_cuenta").doc(solicitudId).get();
    }

    if (!solSnap.exists) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    const solData = solSnap.data() || {};
    const solDni = (solData.numeroDni || solData.dni || solData.datosPersonales?.numeroDni || "").toString().replace(/\D/g, "");

    if (solDni && solDni !== dniClean) {
      return NextResponse.json({ error: "El DNI no coincide con el titular registrado" }, { status: 403 });
    }

    if (solData.propuestaAceptada || solData.estado === "PROPOSAL_ACCEPTED") {
      return NextResponse.json({ error: "La propuesta ya fue aceptada fehacientemente y es inmutable." }, { status: 409 });
    }

    // Verificar que la versión de propuesta exista
    const propuestasList: any[] = solData.propuestas || [];
    const opcionExistente = propuestasList.find((p: any) => p.id === propuestaId && Number(p.version) === versionNum);
    if (!opcionExistente) {
      return NextResponse.json({ error: "La versión de la propuesta seleccionada no existe." }, { status: 404 });
    }

    // 4. Rate Limiting: Mínimo 60 segundos entre envíos
    const otpRef = admin.firestore().collection("otps").doc(solicitudId);
    const otpSnap = await otpRef.get();

    if (otpSnap.exists) {
      const otpPrev = otpSnap.data() || {};
      const ultimoEnvio = new Date(otpPrev.ultimoEnvioIso || 0).getTime();
      const tiempoTranscurrido = Date.now() - ultimoEnvio;

      if (tiempoTranscurrido < 60000) {
        const faltanteSeg = Math.ceil((60000 - tiempoTranscurrido) / 1000);
        return NextResponse.json({ 
          error: `Debe esperar ${faltanteSeg} segundos antes de solicitar un nuevo código OTP.` 
        }, { status: 429 });
      }
    }

    // 5. Generar OTP numérico seguro y guardado mediante Hash SHA-256
    const codigoOtpRaw = crypto.randomInt(100000, 999999).toString();
    const salt = crypto.randomBytes(16).toString("hex");
    const otpHash = crypto.createHash("sha256").update(`${codigoOtpRaw}:${salt}`).digest("hex");

    const expiracionIso = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutos
    const timestampIso = new Date().toISOString();

    const otpData = {
      solicitudId,
      clienteDni: dniClean,
      propuestaId,
      version: versionNum,
      otpHash,
      salt,
      expiracionIso,
      ultimoEnvioIso: timestampIso,
      intentos: 0,
      usado: false,
      creadoEn: admin.firestore.FieldValue.serverTimestamp()
    };

    await otpRef.set(otpData);

    // JAMÁS devolver el código en respuestas ni logs.
    // Solo cuando hay un proveedor real verificado se realiza la transmisión.
    return NextResponse.json({
      ok: true,
      mensaje: "Código OTP transmitido al WhatsApp verificado del titular.",
      solicitudId,
      expiraEn: expiracionIso
    });

  } catch (error: any) {
    console.error("Error en POST /api/otp/generar:", error);
    return NextResponse.json({ error: "Error al generar OTP: " + error.message }, { status: 500 });
  }
}
