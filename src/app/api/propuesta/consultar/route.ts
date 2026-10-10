import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tokenParam = searchParams.get("token");

    if (!tokenParam || tokenParam.length < 16) {
      return NextResponse.json({ error: "Token de acceso inválido o ausente" }, { status: 400 });
    }

    const tokenSnap = await admin.firestore().collection("tokens_propuesta").doc(tokenParam).get();
    if (!tokenSnap.exists) {
      return NextResponse.json({ error: "Enlace de propuesta no válido o expirado" }, { status: 404 });
    }

    const tokenData = tokenSnap.data() || {};
    if (tokenData.revocado) {
      return NextResponse.json({ error: "Este enlace de propuesta ha sido revocado." }, { status: 410 });
    }

    if (Date.now() > new Date(tokenData.expiracionIso).getTime()) {
      return NextResponse.json({ error: "Este enlace de propuesta ha expirado." }, { status: 410 });
    }

    const { solicitudId, dniClean } = tokenData;

    let solSnap = await admin.firestore().collection("solicitudes").doc(solicitudId).get();
    if (!solSnap.exists) {
      solSnap = await admin.firestore().collection("solicitudes_cuenta").doc(solicitudId).get();
    }

    if (!solSnap.exists) {
      return NextResponse.json({ error: "Solicitud asociada no encontrada" }, { status: 404 });
    }

    const solData = solSnap.data() || {};

    // Sanitizar datos comerciales presentados al cliente (JAMÁS exponer costos de proveedor, márgenes o documentos)
    const clienteNombreRaw = solData.nombreCompleto || solData.nombre || solData.datosPersonales?.nombreCompleto || "Cliente";
    // Sanitizar nombre para privacidad pública
    const partesNombre = clienteNombreRaw.trim().split(" ");
    const clienteNombreSanitizado = partesNombre.length > 1 ? `${partesNombre[0]} ${partesNombre[1].substring(0, 1)}.` : partesNombre[0];

    const propuestasSanitizadas = (solData.propuestas || []).map((p: any) => ({
      id: p.id,
      version: p.version,
      producto: p.producto,
      marca: p.marca || "",
      modelo: p.modelo || "",
      caracteristicas: p.caracteristicas || "",
      estado: p.estado || "nuevo",
      precioProducto: p.precioProducto,
      valorTotalOperacion: p.valorTotalOperacion,
      moneda: p.moneda || "ARS",
      cantidadCuotas: p.cantidadCuotas,
      montoCuota: p.montoCuota,
      vencimientoSegundaCuota: p.vencimientoSegundaCuota || null,
      sena: p.sena || 0,
      localidadEntrega: p.localidadEntrega || "",
      condicionesEntrega: p.condicionesEntrega || "",
      plazoEstimado: p.plazoEstimado || "",
      soporteLogisticoTecnico: Boolean(p.soporteLogisticoTecnico),
      aceptada: Boolean(p.aceptada)
    }));

    let propuestaAceptadaSanitizada = null;
    if (solData.propuestaAceptada) {
      const pa = solData.propuestaAceptada;
      propuestaAceptadaSanitizada = {
        id: pa.id,
        version: pa.version,
        producto: pa.producto,
        precioProducto: pa.precioProducto,
        valorTotalOperacion: pa.valorTotalOperacion,
        cantidadCuotas: pa.cantidadCuotas,
        montoCuota: pa.montoCuota,
        moneda: pa.moneda || "ARS",
        fechaAceptacion: pa.fechaAceptacion,
        auditoria: pa.auditoria ? {
          timestamp: pa.auditoria.timestamp,
          producto: pa.auditoria.producto,
          cuotas: pa.auditoria.cantidadCuotas
        } : null
      };
    }

    return NextResponse.json({
      ok: true,
      solicitudId: tokenData.solicitudId,
      clienteNombre: clienteNombreSanitizado,
      clienteLocalidad: solData.datosPersonales?.localidad || solData.localidad || "",
      propuestas: propuestasSanitizadas,
      propuestaAceptada: propuestaAceptadaSanitizada,
      estadoPropuesta: solData.estadoPropuesta || "PROPUESTAS_ENVIADAS",
      mensajeAdmin: solData.mensajeAdmin || ""
    });

  } catch (error: any) {
    console.error("Error en GET /api/propuesta/consultar:", error);
    return NextResponse.json({ error: "Error al consultar propuesta: " + error.message }, { status: 500 });
  }
}
