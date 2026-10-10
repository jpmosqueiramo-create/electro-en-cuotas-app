import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import {
  obtenerCuentaCorrienteVendedor,
  LiquidacionComision
} from "@/lib/settlementsEngine";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "401:UNAUTHORIZED: Bearer token requerido." }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "401:UNAUTHORIZED: Token inválido." }, { status: 401 });
    }

    const authUid = decodedToken.uid;
    const db = admin.firestore();

    // Resolver vendedor por authUid
    let vendedorDoc: FirebaseFirestore.DocumentSnapshot | null = null;
    let vendedorId = "";
    let vendedorData: any = null;

    const vQuery = await db.collection("vendedores").where("authUid", "==", authUid).get();
    if (!vQuery.empty) {
      vendedorDoc = vQuery.docs[0];
      vendedorId = vendedorDoc.id;
      vendedorData = vendedorDoc.data();
    } else {
      const directDoc = await db.collection("vendedores").doc(authUid).get();
      if (directDoc.exists) {
        vendedorDoc = directDoc;
        vendedorId = directDoc.id;
        vendedorData = directDoc.data();
      }
    }

    if (!vendedorDoc || !vendedorData) {
      return NextResponse.json({ error: "403:VENDEDOR_NO_REGISTRADO: Usuario sin vendedor vinculado." }, { status: 403 });
    }

    if (vendedorData.mostrarCuentaCorrienteEnPanel !== true) {
      return NextResponse.json({ error: "403:FORBIDDEN: Cuenta corriente deshabilitada en panel." }, { status: 403 });
    }

    // Cuenta corriente derivada
    const cc = await obtenerCuentaCorrienteVendedor(db, vendedorId);

    // Liquidaciones pagadas (excluyendo datos sensibles de costo, márgenes o snapshots)
    const liqSnap = await db.collection("liquidaciones_comision")
      .where("vendedorAfiliadoId", "==", vendedorId)
      .where("estado", "==", "PAGADA")
      .get();

    const liquidacionesPagadas: any[] = [];
    liqSnap.forEach((d) => {
      const l = d.data() as LiquidacionComision;
      liquidacionesPagadas.push({
        id: d.id,
        montoTotalLiquidadoCentavos: l.montoTotalLiquidadoCentavos,
        tipoPagoConsolidado: l.tipoPagoConsolidado || "TRANSFERENCIA",
        fechaPago: l.fechaPago || l.updatedAt || l.createdAt
      });
    });
    liquidacionesPagadas.sort((a, b) => b.fechaPago.localeCompare(a.fechaPago));

    // Mapear movimientos enriquecidos y sanitizados
    const movimientosSanitizados: any[] = [];
    for (const m of cc.movimientos) {
      let clienteNombre = m.clienteNombre || "";
      let productoResumen = m.productoResumen || "";

      if ((!clienteNombre || !productoResumen) && m.solicitudId) {
        try {
          const solSnap = await db.collection("solicitudes").doc(m.solicitudId).get();
          if (solSnap.exists) {
            const solData = solSnap.data() || {};
            if (!clienteNombre) clienteNombre = solData.clienteNombre || "";
            if (!productoResumen) productoResumen = solData.productoResumen || solData.productoNombre || "";
          }
        } catch {}
      }

      let tipoVisual: string = m.tipo;
      if (m.tipo === "REVERSA_COMISION") {
        tipoVisual = "REVERSA_PAGO";
      } else if (m.tipo === "AJUSTE_ADMINISTRATIVO") {
        tipoVisual = m.montoComisionCentavos >= 0 ? "AJUSTE_POSITIVO" : "AJUSTE_NEGATIVO";
      }

      const item: any = {
        id: m.id,
        tipo: tipoVisual,
        montoComisionCentavos: m.montoComisionCentavos,
        fecha: m.createdAt
      };

      if (m.baseComisionableCentavos !== undefined && m.baseComisionableCentavos !== null) {
        item.baseComisionableCentavos = m.baseComisionableCentavos;
      }
      if (m.cuotaNumero !== undefined && m.cuotaNumero !== null) {
        item.cuotaNumero = m.cuotaNumero;
      }
      if (clienteNombre) {
        item.clienteNombre = clienteNombre;
      }
      if (productoResumen) {
        item.productoResumen = productoResumen;
      }
      if (m.motivo) {
        item.motivo = m.motivo;
      }

      movimientosSanitizados.push(item);
    }

    // Ordenar movimientos por fecha DESC
    movimientosSanitizados.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));

    return NextResponse.json({
      ok: true,
      vendedorAfiliadoId: vendedorId,
      saldoCuentaCorrienteCentavos: cc.saldoCuentaCorrienteCentavos,
      movimientos: movimientosSanitizados,
      liquidacionesPagadas
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || "500:INTERNAL_ERROR" }, { status: 500 });
  }
}
