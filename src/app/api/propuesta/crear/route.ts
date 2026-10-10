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
      return NextResponse.json({ error: "Acceso denegado: Se requieren permisos administrativos" }, { status: 403 });
    }

    const body = await req.json();
    const { solicitudId, opciones, notas } = body;

    if (!solicitudId || !Array.isArray(opciones) || opciones.length === 0) {
      return NextResponse.json({ error: "Datos incompletos: Se requiere solicitudId y al menos una opción de propuesta" }, { status: 400 });
    }

    let dbCol = "solicitudes";
    let solRef = admin.firestore().collection("solicitudes").doc(solicitudId);
    let solSnap = await solRef.get();

    if (!solSnap.exists) {
      dbCol = "solicitudes_cuenta";
      solRef = admin.firestore().collection("solicitudes_cuenta").doc(solicitudId);
      solSnap = await solRef.get();
    }

    if (!solSnap.exists) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    const solData = solSnap.data() || {};
    if (solData.propuestaAceptada || solData.estado === "PROPOSAL_ACCEPTED") {
      return NextResponse.json({ error: "La solicitud ya posee una propuesta aceptada inmutable. No se pueden agregar nuevas propuestas." }, { status: 409 });
    }

    const timestamp = new Date().toISOString();
    const opcionesFormatted: any[] = [];

    for (let index = 0; index < opciones.length; index++) {
      const opt = opciones[index];
      const versionNum = Number(opt.version) || index + 1;
      const optId = opt.id || `prop_${solicitudId}_v${versionNum}`;
      const precioProd = Number(opt.precioProducto) || 0;
      const cuotasNum = Number(opt.cantidadCuotas) || 12;
      const cuotaValor = Number(opt.montoCuota) || 0;
      const valorTotal = Number(opt.valorTotalOperacion) || (precioProd > 0 ? precioProd : cuotaValor * cuotasNum);
      const senaValor = Number(opt.sena) || 0;
      const monedaStr = opt.moneda === "USD" ? "USD" : "ARS";

      if (cuotasNum <= 0 || cuotaValor <= 0 || valorTotal <= 0) {
        return NextResponse.json({ 
          error: `Inconsistencia financiera en Opción ${versionNum}: Las cuotas, el valor de cuota y el valor total deben ser mayores a 0.` 
        }, { status: 400 });
      }

      const calculadoTotal = senaValor + (cuotasNum * cuotaValor);
      if (Math.abs(calculadoTotal - valorTotal) > 2) {
        return NextResponse.json({
          error: `Inconsistencia matemática en Opción ${versionNum}: La suma de la seña ($${senaValor}) y las ${cuotasNum} cuotas de $${cuotaValor} (Total $${calculadoTotal}) no coincide con el valor total informado de $${valorTotal}.`
        }, { status: 400 });
      }

      opcionesFormatted.push({
        id: optId,
        version: versionNum,
        producto: (opt.producto || solData.productoDeseado || solData.productoNombre || "Producto").trim(),
        marca: (opt.marca || "").trim(),
        modelo: (opt.modelo || "").trim(),
        caracteristicas: (opt.caracteristicas || "").trim(),
        estado: opt.estado === "usado" ? "usado" : "nuevo",
        precioProducto: precioProd,
        valorTotalOperacion: valorTotal,
        moneda: monedaStr,
        cantidadCuotas: cuotasNum,
        montoCuota: cuotaValor,
        vencimientoSegundaCuota: opt.vencimientoSegundaCuota || null,
        sena: senaValor,
        localidadEntrega: (opt.localidadEntrega || solData.datosPersonales?.localidad || solData.localidad || "").trim(),
        condicionesEntrega: (opt.condicionesEntrega || "Envío a domicilio / Retiro en sucursal").trim(),
        plazoEstimado: (opt.plazoEstimado || "3 a 7 días hábiles").trim(),
        soporteLogisticoTecnico: Boolean(opt.soporteLogisticoTecnico ?? false),
        fechaCreacion: timestamp,
        creadaPor: userEmail,
        aceptada: false
      });
    }

    const updatePayload = {
      propuestas: opcionesFormatted,
      estadoPropuesta: "PROPUESTAS_ENVIADAS",
      fechaPropuestas: timestamp,
      mensajeAdmin: notas ? notas.trim() : (solData.mensajeAdmin || "")
    };

    await solRef.update(updatePayload);

    // INVALIDACIÓN DE OTPS PREVIOS CUANDO CAMBIA LA PROPUESTA
    await admin.firestore().collection("otps").doc(solicitudId).delete().catch(() => {});

    return NextResponse.json({
      ok: true,
      mensaje: "Propuestas validadas y registradas exitosamente.",
      solicitudId,
      propuestas: opcionesFormatted
    });

  } catch (error: any) {
    console.error("Error en POST /api/propuesta/crear:", error);
    return NextResponse.json({ error: "Error al crear propuesta: " + error.message }, { status: 500 });
  }
}
