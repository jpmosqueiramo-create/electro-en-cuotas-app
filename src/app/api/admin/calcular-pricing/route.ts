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
 * Fuente única de verdad financiera del sistema.
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

    let capitalCompraCentavos = Number(body.capitalCompraCentavos) || 0;
    if (capitalCompraCentavos <= 0 && body.costoProducto) {
      capitalCompraCentavos = Math.round(Number(body.costoProducto) * 100);
    }

    let senaMontoCentavos = Number(rawSenaCentavos) || 0;
    if (senaMontoCentavos <= 0 && rawSenaPesos) {
      senaMontoCentavos = Math.round(Number(rawSenaPesos) * 100);
    }

    const db = admin.firestore();

    // 1. Obtener Configuración Global de TNA e IVA (FAIL CLOSED)
    const config = await obtenerConfiguracionPricingGlobal(db);
    if (!config || !config.tnaPorPlazo || typeof config.alicuotaIvaDefault !== "number") {
      return NextResponse.json(
        { error: "400:PRICING_CONFIG_NO_CONFIGURADA: No existe configuración general de TNA e IVA en el sistema." },
        { status: 400 }
      );
    }

    // 2. Resolver Plazos Habilitados del Producto (FAIL CLOSED)
    let plazosHabilitadosProducto: number[] = Array.isArray(body.plazosHabilitadosProducto) 
      ? body.plazosHabilitadosProducto.map(Number).filter((n: number) => !isNaN(n) && n > 0)
      : [];

    if (productoId && plazosHabilitadosProducto.length === 0) {
      const prodSnap = await db.collection("productos").doc(productoId).get();
      if (!prodSnap.exists) {
        return NextResponse.json({ error: "Producto no encontrado en el catálogo." }, { status: 404 });
      }
      const prodData = prodSnap.data() || {};
      if (capitalCompraCentavos <= 0 && prodData.costoProducto) {
        capitalCompraCentavos = Math.round(Number(prodData.costoProducto) * 100);
      }
      const rawPlazos = prodData.plazosHabilitados || prodData.plazosHabilitadosProducto;
      if (Array.isArray(rawPlazos)) {
        plazosHabilitadosProducto = rawPlazos.map(Number).filter((n: number) => !isNaN(n) && n > 0);
      }
    }

    if (plazosHabilitadosProducto.length === 0) {
      return NextResponse.json(
        { error: "400:LEGACY_READ_ONLY_REQUIRES_CONFIG: El producto no posee plazos habilitados configurados en el catálogo." },
        { status: 400 }
      );
    }

    if (capitalCompraCentavos <= 0) {
      return NextResponse.json(
        { error: "400:CAPITAL_INVALIDO: El costo / capital de compra del producto debe ser un importe positivo mayor a 0." },
        { status: 400 }
      );
    }

    // 3. Modo: Calcular todos los plazos habilitados del producto
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

    // 4. Modo: Calcular un plazo específico
    const plazoNum = Number(plazoMeses);
    if (!plazoNum || plazoNum < 1 || plazoNum > 18) {
      return NextResponse.json(
        { error: `400:PLAZO_INVALIDO: Debe especificar un plazo de cuotas válido entre 1 y 18.` },
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
