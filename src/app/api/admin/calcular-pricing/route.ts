import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { 
  calcularPricingCanonico, 
  obtenerConfiguracionPricingGlobal,
  CanonicalPricingResult 
} from "@/lib/canonicalPricingEngine";

/**
 * Endpoint ADMIN para cálculo no mutante de Pricing Canónico (CANONICAL_V1).
 * Fuente única de verdad financiera server-side.
 * NO confía en costo ni plazos enviados por el cliente.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(req);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    const body = await req.json();
    const { 
      productoId, 
      plazoMeses, 
      calcularTodos,
      senaMontoCentavos: rawSenaCentavos,
      senaMonto: rawSenaPesos
    } = body;

    // 1. FAIL CLOSED: productoId es obligatorio para cotización de catálogo
    if (!productoId || typeof productoId !== "string" || !productoId.trim()) {
      return NextResponse.json(
        { error: "400:PRODUCTO_ID_REQUERIDO: Debe especificar un productoId válido del catálogo." },
        { status: 400 }
      );
    }

    const db = admin.firestore();

    // 2. Obtener SIEMPRE el producto desde Firestore (Fuente única de verdad)
    const prodSnap = await db.collection("productos").doc(productoId.trim()).get();
    if (!prodSnap.exists) {
      return NextResponse.json(
        { error: "404:PRODUCTO_NO_ENCONTRADO: Producto no encontrado en el catálogo." },
        { status: 404 }
      );
    }

    const prodData = prodSnap.data() || {};

    // 3. Derivar capitalCompraCentavos EXCLUSIVAMENTE desde Firestore
    // NO utilizar body.costoProducto ni body.capitalCompraCentavos
    let capitalCompraCentavos = 0;
    if (typeof prodData.capitalCompraCentavos === "number" && prodData.capitalCompraCentavos > 0) {
      capitalCompraCentavos = Math.round(prodData.capitalCompraCentavos);
    } else if (typeof prodData.costoCentavos === "number" && prodData.costoCentavos > 0) {
      capitalCompraCentavos = Math.round(prodData.costoCentavos);
    } else if (typeof prodData.costoProducto === "number" && prodData.costoProducto > 0) {
      capitalCompraCentavos = Math.round(prodData.costoProducto * 100);
    } else if (typeof prodData.costo === "number" && prodData.costo > 0) {
      capitalCompraCentavos = Math.round(prodData.costo * 100);
    }

    if (capitalCompraCentavos <= 0) {
      return NextResponse.json(
        { error: "400:PRODUCTO_SIN_COSTO: El producto no posee un costo válido configurado en el catálogo." },
        { status: 400 }
      );
    }

    // 4. Derivar plazosHabilitadosProducto EXCLUSIVAMENTE desde Firestore
    // NO utilizar body.plazosHabilitadosProducto
    const rawPlazos = prodData.plazosHabilitados || prodData.plazosHabilitadosProducto || prodData.plazos;
    const plazosHabilitadosProducto: number[] = Array.isArray(rawPlazos)
      ? rawPlazos.map(Number).filter((n: number) => !isNaN(n) && n > 0)
      : [];

    if (plazosHabilitadosProducto.length === 0) {
      return NextResponse.json(
        { error: "400:LEGACY_READ_ONLY_REQUIRES_CONFIG: El producto no posee plazos habilitados configurados en el catálogo." },
        { status: 400 }
      );
    }

    // 5. Seña procesada desde input seguro
    let senaMontoCentavos = Number(rawSenaCentavos) || 0;
    if (senaMontoCentavos <= 0 && rawSenaPesos) {
      senaMontoCentavos = Math.round(Number(rawSenaPesos) * 100);
    }

    // 6. Configuración Global de TNA e IVA desde Firestore (FAIL CLOSED)
    const config = await obtenerConfiguracionPricingGlobal(db);
    if (!config || !config.tnaPorPlazo || typeof config.alicuotaIvaDefault !== "number") {
      return NextResponse.json(
        { error: "400:PRICING_CONFIG_NO_CONFIGURADA: No existe configuración general de TNA e IVA en el sistema." },
        { status: 400 }
      );
    }

    // 7. Modo: Calcular todos los plazos habilitados del producto
    if (calcularTodos) {
      const resultados: CanonicalPricingResult[] = [];
      const errores: Record<number, string> = {};

      for (const plazo of plazosHabilitadosProducto) {
        const tna = config.tnaPorPlazo[plazo];
        if (tna === undefined || tna === null) {
          errores[plazo] = `Sin TNA configurada para plazo ${plazo}`;
          continue;
        }

        try {
          const res = calcularPricingCanonico({
            capitalCompraCentavos,
            plazoMeses: plazo,
            tnaInterna: tna,
            alicuotaIva: config.alicuotaIvaDefault,
            senaMontoCentavos,
            plazosHabilitadosProducto
          });
          resultados.push(res);
        } catch (err: unknown) {
          errores[plazo] = (err as Error).message;
        }
      }

      return NextResponse.json({
        ok: true,
        pricingSchemaVersion: "CANONICAL_V1",
        resultados,
        errores: Object.keys(errores).length > 0 ? errores : undefined
      });
    }

    // 8. Modo: Calcular plazo específico solicitado
    const plazoNum = Number(plazoMeses);
    if (!plazoNum || plazoNum < 1 || plazoNum > 18) {
      return NextResponse.json(
        { error: "400:PLAZO_INVALIDO: Debe especificar un plazo de cuotas válido entre 1 y 18." },
        { status: 400 }
      );
    }

    if (!plazosHabilitadosProducto.includes(plazoNum)) {
      return NextResponse.json(
        { error: `400:PLAZO_NO_HABILITADO: El plazo de ${plazoNum} cuotas no se encuentra habilitado para este producto en el catálogo.` },
        { status: 400 }
      );
    }

    const tna = config.tnaPorPlazo[plazoNum];
    if (tna === undefined || tna === null) {
      return NextResponse.json(
        { error: `400:PRICING_TNA_NO_CONFIGURADA: No existe TNA configurada para el plazo de ${plazoNum} cuotas.` },
        { status: 400 }
      );
    }

    const resultado = calcularPricingCanonico({
      capitalCompraCentavos,
      plazoMeses: plazoNum,
      tnaInterna: tna,
      alicuotaIva: config.alicuotaIvaDefault,
      senaMontoCentavos,
      plazosHabilitadosProducto
    });

    return NextResponse.json({
      ok: true,
      pricingSchemaVersion: "CANONICAL_V1",
      resultado
    });
  } catch (error: unknown) {
    const msg = (error as Error).message || "Error al calcular pricing canónico";
    const status = msg.startsWith("400:") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
