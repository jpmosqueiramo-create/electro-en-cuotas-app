import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    // 1. COMPROBACIÓN OBLIGATORIA DEL FEATURE GATE EN EL ENDPOINT DE ACEPTACIÓN
    const enableAcceptance = process.env.ENABLE_ELECTRONIC_ACCEPTANCE === "true";
    const whatsappApiKey = process.env.WHATSAPP_API_KEY || process.env.TWILIO_AUTH_TOKEN;
    const hasRealProvider = Boolean(whatsappApiKey && whatsappApiKey.length > 5);

    if (!enableAcceptance || !hasRealProvider) {
      return NextResponse.json({
        error: "La aceptación electrónica registrada se encuentra deshabilitada en el servidor por configuración de seguridad (requiere habilitación explícita y proveedor de WhatsApp real).",
        deshabilitadoCliente: true
      }, { status: 503 });
    }

    const body = await req.json();
    const { token, propuestaId, version, clienteDni, codigoOtp, datosPersonalesContractuales } = body;

    const dniClean = (clienteDni || "").toString().replace(/\D/g, "");
    const otpClean = (codigoOtp || "").toString().trim();
    const versionNum = Number(version) || 1;

    if (!token || !propuestaId || !dniClean || !otpClean) {
      return NextResponse.json({ error: "Datos incompletos: token, propuestaId, clienteDni y codigoOtp son requeridos." }, { status: 400 });
    }

    // 2. Validar token de acceso
    const tokenSnap = await admin.firestore().collection("tokens_propuesta").doc(token).get();
    if (!tokenSnap.exists) {
      return NextResponse.json({ error: "Token de acceso inválido o revocado." }, { status: 404 });
    }

    const tokenData = tokenSnap.data() || {};
    if (tokenData.revocado || Date.now() > new Date(tokenData.expiracionIso).getTime()) {
      return NextResponse.json({ error: "El enlace de la propuesta expiró o fue revocado." }, { status: 410 });
    }

    const solicitudId = tokenData.solicitudId;
    const otpRef = admin.firestore().collection("otps").doc(solicitudId);

    // 3. Pre-Comprobación de Intentos para persistencia fehaciente
    const otpSnapPre = await otpRef.get();
    if (!otpSnapPre.exists) {
      return NextResponse.json({ error: "No existe un código OTP activo para esta solicitud." }, { status: 404 });
    }

    const otpDataPre = otpSnapPre.data() || {};
    if ((otpDataPre.intentos || 0) >= 5) {
      return NextResponse.json({ error: "Se superó el límite máximo de intentos fallidos (5)." }, { status: 429 });
    }

    if (otpDataPre.usado) {
      return NextResponse.json({ error: "El código OTP ya fue consumido." }, { status: 400 });
    }

    if (otpDataPre.propuestaId !== propuestaId || Number(otpDataPre.version) !== versionNum) {
      return NextResponse.json({ error: "El código OTP pertenece a otra propuesta o versión diferente." }, { status: 400 });
    }

    // Validar hash antes de entrar a la transacción
    const hashCalculado = crypto.createHash("sha256").update(`${otpClean}:${otpDataPre.salt}`).digest("hex");
    if (hashCalculado !== otpDataPre.otpHash) {
      // PERSISTIR EL INCREMENTO DE INTENTOS SIN REVERTIR POR ERROR DE TRANSACCIÓN
      await otpRef.update({ intentos: admin.firestore.FieldValue.increment(1) });
      return NextResponse.json({ error: `Código OTP incorrecto. Intentos consumidos: ${(otpDataPre.intentos || 0) + 1} de 5.` }, { status: 400 });
    }

    // 4. TRANSACCIÓN FIRESTORE ATÓMICA E INMUTABLE
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "IP_NO_REGISTRADA";
    const userAgent = req.headers.get("user-agent") || "N/A";
    const timestampIso = new Date().toISOString();

    const resultadoTransaccion = await admin.firestore().runTransaction(async (transaction) => {
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
      const solDni = (solData.numeroDni || solData.dni || solData.datosPersonales?.numeroDni || "").toString().replace(/\D/g, "");

      if (solDni && solDni !== dniClean) {
        throw new Error("403:El DNI no coincide con el titular registrado.");
      }

      if (solData.propuestaAceptada || solData.estado === "PROPOSAL_ACCEPTED") {
        throw new Error("409:Esta propuesta ya fue aceptada fehacientemente y es inmutable.");
      }

      const propuestasList: any[] = solData.propuestas || [];
      const seleccionada = propuestasList.find((p: any) => p.id === propuestaId && Number(p.version) === versionNum);

      if (!seleccionada) {
        throw new Error("404:La versión o alternativa de propuesta especificada no existe.");
      }

      // Registro de Auditoría de Aceptación Electrónica Registrada
      const auditEntry = {
        timestamp: timestampIso,
        denominacion: "Aceptación electrónica registrada",
        ip: clientIp,
        userAgent,
        dni: dniClean,
        telefono: solData.datosPersonales?.telefono || solData.whatsapp || solData.telefono || "",
        email: solData.datosPersonales?.email || solData.clienteEmail || solData.email || "",
        propuestaId: seleccionada.id,
        version: seleccionada.version,
        producto: seleccionada.producto,
        valorTotalOperacion: seleccionada.valorTotalOperacion,
        cantidadCuotas: seleccionada.cantidadCuotas,
        montoCuota: seleccionada.montoCuota
      };

      // Copia inmutable completa del contenido comercial exacto aceptado
      const propuestaAceptadaFinal = {
        id: seleccionada.id,
        version: seleccionada.version,
        producto: seleccionada.producto,
        marca: seleccionada.marca || "",
        modelo: seleccionada.modelo || "",
        caracteristicas: seleccionada.caracteristicas || "",
        estado: seleccionada.estado || "nuevo",
        precioProducto: seleccionada.precioProducto,
        valorTotalOperacion: seleccionada.valorTotalOperacion,
        moneda: seleccionada.moneda || "ARS",
        cantidadCuotas: seleccionada.cantidadCuotas,
        montoCuota: seleccionada.montoCuota,
        vencimientoSegundaCuota: seleccionada.vencimientoSegundaCuota || null,
        sena: seleccionada.sena || 0,
        localidadEntrega: seleccionada.localidadEntrega || "",
        condicionesEntrega: seleccionada.condicionesEntrega || "",
        plazoEstimado: seleccionada.plazoEstimado || "",
        soporteLogisticoTecnico: Boolean(seleccionada.soporteLogisticoTecnico),
        aceptada: true,
        fechaAceptacion: timestampIso,
        auditoria: auditEntry
      };

      const datosPersPrev = solData.datosPersonales || {};
      const datosPersUpdated = {
        ...datosPersPrev,
        cuil: (datosPersonalesContractuales?.cuil || datosPersPrev.cuil || "").trim(),
        direccion: (datosPersonalesContractuales?.domicilio || datosPersPrev.direccion || "").trim(),
        localidad: (datosPersonalesContractuales?.localidad || datosPersPrev.localidad || "").trim(),
        codigoPostal: (datosPersonalesContractuales?.codigoPostal || datosPersPrev.codigoPostal || "").trim(),
        provincia: (datosPersonalesContractuales?.provincia || datosPersPrev.provincia || "").trim(),
        whatsapp: (datosPersonalesContractuales?.whatsapp || datosPersPrev.whatsapp || solData.whatsapp || "").trim()
      };

      transaction.update(otpRef, { 
        usado: true,
        usadoEn: timestampIso 
      });

      transaction.update(admin.firestore().collection("tokens_propuesta").doc(token), {
        revocado: true,
        revocadoEn: timestampIso
      });

      const updatePayload: any = {
        propuestaAceptada: propuestaAceptadaFinal,
        estadoPropuesta: "PROPUESTA_ACEPTADA",
        estado: "PROPOSAL_ACCEPTED",
        fechaAceptacionPropuesta: timestampIso,
        datosPersonales: datosPersUpdated,
        historialAceptacion: admin.firestore.FieldValue.arrayUnion(auditEntry)
      };

      transaction.update(solRef, updatePayload);

      return {
        solicitudId,
        propuestaAceptada: propuestaAceptadaFinal,
        auditTrail: auditEntry
      };
    });

    // 5. Alta y Vinculación Segura de Cuenta de Cliente (Sólo con Email Verificado)
    const clientEmail = body.datosPersonalesContractuales?.email || body.email;
    if (clientEmail && clientEmail.includes("@")) {
      try {
        let userAuth;
        try {
          userAuth = await admin.auth().getUserByEmail(clientEmail);
          // VINCULACIÓN SEGURA: Solamente vincular si el email está formalmente verificado en Firebase Auth
          if (userAuth && userAuth.emailVerified === true) {
            let solRef = admin.firestore().collection("solicitudes").doc(solicitudId);
            let solSnap = await solRef.get();
            if (!solSnap.exists) {
              solRef = admin.firestore().collection("solicitudes_cuenta").doc(solicitudId);
            }
            await solRef.update({ clienteId: userAuth.uid, cuentaVinculadaVerificada: true });
          } else {
            // Si el email no está verificado, marcar como pendiente de verificación de identidad
            let solRef = admin.firestore().collection("solicitudes").doc(solicitudId);
            let solSnap = await solRef.get();
            if (!solSnap.exists) {
              solRef = admin.firestore().collection("solicitudes_cuenta").doc(solicitudId);
            }
            await solRef.update({ estadoVinculacionCuenta: "PENDIENTE_VERIFICACION_EMAIL" });
          }
        } catch (e) {
          // No crear usuarios automáticamente con emails libres sin procedimiento de verificación
        }
      } catch (errUser) {
        console.error("Aviso vinculación cliente Auth:", errUser);
      }
    }

    return NextResponse.json({
      ok: true,
      mensaje: "Aceptación electrónica registrada correctamente.",
      ...resultadoTransaccion
    });

  } catch (error: any) {
    console.error("Error en POST /api/propuesta/aceptar:", error);
    const msg = error.message || "";
    if (msg.startsWith("404:")) return NextResponse.json({ error: msg.substring(4) }, { status: 404 });
    if (msg.startsWith("403:")) return NextResponse.json({ error: msg.substring(4) }, { status: 403 });
    if (msg.startsWith("409:")) return NextResponse.json({ error: msg.substring(4) }, { status: 409 });
    if (msg.startsWith("410:")) return NextResponse.json({ error: msg.substring(4) }, { status: 410 });
    if (msg.startsWith("429:")) return NextResponse.json({ error: msg.substring(4) }, { status: 429 });
    if (msg.startsWith("400:")) return NextResponse.json({ error: msg.substring(4) }, { status: 400 });

    return NextResponse.json({ error: "Error al procesar la aceptación: " + msg }, { status: 500 });
  }
}
