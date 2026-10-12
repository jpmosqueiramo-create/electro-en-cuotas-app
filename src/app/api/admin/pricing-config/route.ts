import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { 
  obtenerConfiguracionPricingGlobal, 
  guardarConfiguracionPricingGlobal 
} from "@/lib/canonicalPricingEngine";

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(req);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }

    const db = admin.firestore();
    const config = await obtenerConfiguracionPricingGlobal(db);

    return NextResponse.json({ ok: true, config });
  } catch (error: unknown) {
    console.error("Error en GET /api/admin/pricing-config:", error);
    return NextResponse.json({ error: "Error al obtener configuración de pricing: " + (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(req);
    if (!authResult.authorized || authResult.errorResponse) {
      return authResult.errorResponse!;
    }
    const userEmail = authResult.email!;

    const body = await req.json();
    const { tnaPorPlazo, alicuotaIvaDefault } = body;

    const tnaProcesada: Record<number, number> = {};
    if (tnaPorPlazo && typeof tnaPorPlazo === "object") {
      for (let n = 1; n <= 18; n++) {
        const val = tnaPorPlazo[n] !== undefined ? tnaPorPlazo[n] : tnaPorPlazo[String(n)];
        if (val !== undefined && val !== null) {
          const numVal = Number(val);
          if (isNaN(numVal) || numVal < 0) {
            return NextResponse.json({ error: `TNA inválida para el plazo ${n}: debe ser un número >= 0.` }, { status: 400 });
          }
          tnaProcesada[n] = numVal;
        }
      }
    }

    let ivaProcesado: number | undefined = undefined;
    if (alicuotaIvaDefault !== undefined && alicuotaIvaDefault !== null) {
      const numIva = Number(alicuotaIvaDefault);
      if (isNaN(numIva) || numIva < 0) {
        return NextResponse.json({ error: "Alícuota IVA inválida: debe ser un número >= 0." }, { status: 400 });
      }
      ivaProcesado = numIva;
    }

    const db = admin.firestore();
    const configActualizada = await guardarConfiguracionPricingGlobal(
      db,
      {
        tnaPorPlazo: Object.keys(tnaProcesada).length > 0 ? tnaProcesada : undefined,
        alicuotaIvaDefault: ivaProcesado
      },
      userEmail
    );

    return NextResponse.json({
      ok: true,
      mensaje: "Configuración de TNA e IVA de pricing actualizada exitosamente con auditoría de administración.",
      config: configActualizada
    });

  } catch (error: unknown) {
    console.error("Error en POST /api/admin/pricing-config:", error);
    return NextResponse.json({ error: "Error al guardar configuración de pricing: " + (error as Error).message }, { status: 500 });
  }
}
