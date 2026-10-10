import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado - Token ausente" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const authUid = decodedToken.uid;
    const userEmail = (decodedToken.email || "").toLowerCase().trim();
    const db = admin.firestore();

    // Resolver vendedor por authUid o email
    let vendedorDoc: FirebaseFirestore.DocumentSnapshot | null = null;
    let vendedorId = "";
    let esActivo = false;

    const vQuery = await db.collection("vendedores").where("authUid", "==", authUid).get();
    if (!vQuery.empty) {
      vendedorDoc = vQuery.docs[0];
      vendedorId = vendedorDoc.id;
      const vData = vendedorDoc.data() || {};
      esActivo = vData.activo !== false;
    } else {
      const directDoc = await db.collection("vendedores").doc(authUid).get();
      if (directDoc.exists) {
        vendedorDoc = directDoc;
        vendedorId = directDoc.id;
        const vData = directDoc.data() || {};
        esActivo = vData.activo !== false;
      } else if (userEmail) {
        const eQuery = await db.collection("vendedores").where("email", "==", userEmail).get();
        if (!eQuery.empty) {
          vendedorDoc = eQuery.docs[0];
          vendedorId = vendedorDoc.id;
          const vData = vendedorDoc.data() || {};
          esActivo = vData.activo !== false;
        }
      }
    }

    if (!esActivo && userEmail === "jpmosqueiramo@gmail.com") {
      esActivo = true;
    }

    if (!esActivo) {
      return NextResponse.json({ error: "Acceso denegado: Vendedor inactivo o no autorizado" }, { status: 403 });
    }

    // Consultar operaciones asignadas al vendedor estrictamente por su identidad resuelta (multitenant)
    const solDocsMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    if (vendedorId) {
      const snap1 = await db.collection("solicitudes").where("vendedorAfiliadoId", "==", vendedorId).get();
      snap1.docs.forEach(d => solDocsMap.set(d.id, d));
    }
    if (userEmail) {
      const snap2 = await db.collection("solicitudes").where("afiliadoEmail", "==", userEmail).get();
      snap2.docs.forEach(d => solDocsMap.set(d.id, d));
    }
    const solicitudesDocs = Array.from(solDocsMap.values());
    
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split("T")[0];

    const operaciones = solicitudesDocs.map((d) => {
      const sol = d.data();
      const plan = sol.planPagos || sol.propuestaAceptada?.cuotas || [];

      let pagadas = 0;
      let pendientes = 0;
      let vencidas = 0;
      let importePendiente = 0;
      let proximoVencimiento: string | null = null;

      const planSanitized = plan.map((c: any) => {
        const isPagado = c.estado === "PAGADO";
        const vencRaw = c.vencimiento || c.fechaVencimiento || "";
        const vencStr = vencRaw.includes("T") ? vencRaw.split("T")[0] : vencRaw;
        const mOrig = Number(c.montoOriginal !== undefined ? c.montoOriginal : (c.montoTotalCentavos ? c.montoTotalCentavos / 100 : 0));
        const mAbon = Number(c.montoAbonado || 0);
        const sPend = Math.max(0, mOrig - mAbon);
        
        if (isPagado) {
          pagadas++;
        } else {
          pendientes++;
          importePendiente += sPend;
          if (vencStr && vencStr < hoyStr) {
            vencidas++;
          }
          if (!proximoVencimiento || (vencStr && vencStr < proximoVencimiento)) {
            proximoVencimiento = vencStr;
          }
        }

        return {
          numero: c.numero,
          vencimiento: vencStr,
          montoOriginal: mOrig,
          montoAbonado: mAbon,
          saldoPendiente: sPend,
          estado: c.estado || "PENDIENTE"
        };
      });

      // Promesas de pago sanitizadas
      const promesasRaw = sol.promesasPago || [];
      const promesasSanitized = promesasRaw.map((p: any) => {
        let st = p.estado || "VIGENTE";
        if (st === "VIGENTE" && p.fechaPrometida && p.fechaPrometida < hoyStr) {
          st = "INCUMPLIDA";
        }
        return {
          id: p.id,
          cuotaNumero: p.cuotaNumero,
          montoPrometido: Number(p.montoPrometido || 0),
          fechaPrometida: p.fechaPrometida,
          observacion: p.observacion || "",
          estado: st,
          fechaCreacion: p.fechaCreacion,
          autor: p.autor || ""
        };
      });

      const promesaVigente = promesasSanitized.find((p: any) => p.estado === "VIGENTE") || null;

      // Observaciones sanitizadas
      const obsRaw = sol.observacionesInternas || sol.historialContactos || [];
      const observacionesSanitized = obsRaw.map((o: any) => ({
        id: o.id || String(Math.random()),
        texto: o.texto || o.nota || "",
        autor: o.autor || o.usuario || "Afiliado",
        fecha: o.fecha || new Date().toISOString()
      }));

      return {
        id: d.id,
        clienteNombre: sol.datosPersonales?.nombreCompleto || sol.nombreCompleto || sol.nombre || sol.clienteNombre || "Cliente",
        whatsapp: sol.datosPersonales?.telefono || sol.whatsapp || sol.telefono || "",
        producto: sol.productoDeseado || sol.productoNombre || sol.necesidad || "Operación Cuenta Hogar",
        fechaCreacion: sol.fechaCreacion?.toDate ? sol.fechaCreacion.toDate().toISOString() : (sol.fechaIso || sol.createdAt || new Date().toISOString()),
        estado: sol.estado || "PENDIENTE",
        estadoEntrega: sol.estadoEntrega || "PENDIENTE_ENTREGA",
        cuotasPagadas: pagadas,
        cuotasPendientes: pendientes,
        cuotasVencidas: vencidas,
        importePendiente,
        proximoVencimiento,
        planPagos: planSanitized,
        promesaVigente,
        historialPromesas: promesasSanitized,
        historialObservaciones: observacionesSanitized
      };
    });

    const operacionesVigentes = operaciones.filter(op => {
      if (op.estado === "ANULADO" || op.estado === "CANCELADO" || op.estado === "RECHAZADO") return false;
      if (op.planPagos && op.planPagos.length > 0) {
        return op.cuotasPendientes > 0;
      }
      return true;
    });

    return NextResponse.json({ operaciones: operacionesVigentes });

  } catch (error: any) {
    console.error("Error en GET /api/afiliado/operaciones:", error);
    return NextResponse.json({ error: "Error al procesar la solicitud: " + error.message }, { status: 500 });
  }
}
