import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import { validarAdminToken } from "@/lib/adminAuth";
import {
  obtenerCuentaCorrienteVendedor,
  obtenerSaldoDisponibleLiquidacion,
  obtenerLedgerCustodiaEfectivo,
  resolverVendedorCanonico,
  enriquecerLiquidacionesConIncidencias,
  LiquidacionComision,
  RendicionEfectivo
} from "@/lib/settlementsEngine";
import {
  obtenerConfiguracionComisionVigente,
  ConfiguracionComisionVendedor
} from "@/lib/commissionsEngine";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authRes = await validarAdminToken(req);
    if (!authRes.valid) {
      return NextResponse.json({ error: "403:FORBIDDEN: Acceso restringido al Administrador." }, { status: 403 });
    }

    const { id } = await context.params;
    const vendorId = id.trim();
    const db = admin.firestore();

    // 1. Resolve canonical vendor profile (STRICT: 404 if not found by ID or email)
    const vendorData = await resolverVendedorCanonico(db, vendorId);
    if (!vendorData) {
      return NextResponse.json({ error: "404:VENDEDOR_NO_ENCONTRADO: El vendedor especificado no existe." }, { status: 404 });
    }
    const canonicalVendorId = vendorData.id;

    // 2. Account current summary (with movements using canonical vendor ID)
    const cuentaCorriente = await obtenerCuentaCorrienteVendedor(db, canonicalVendorId);

    // 3. Available settlement balance
    const saldoDisponibleLiquidacionCentavos = await obtenerSaldoDisponibleLiquidacion(db, canonicalVendorId);

    // 4. Cash custody summary (with movements)
    const custodiaEfectivo = await obtenerLedgerCustodiaEfectivo(db, canonicalVendorId);

    // 5. Settlements list (evaluated dynamically for backend incidences)
    const liqSnap = await db.collection("liquidaciones_comision")
      .where("vendedorAfiliadoId", "==", canonicalVendorId)
      .get();
    const rawLiquidaciones: LiquidacionComision[] = liqSnap.docs.map(doc => doc.data() as LiquidacionComision);
    const liquidaciones = await enriquecerLiquidacionesConIncidencias(db, rawLiquidaciones);
    liquidaciones.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));

    // 6. Rendiciones list
    const rendSnap = await db.collection("rendiciones_efectivo")
      .where("vendedorAfiliadoId", "==", canonicalVendorId)
      .get();
    const rendiciones: RendicionEfectivo[] = [];
    rendSnap.forEach(d => rendiciones.push(d.data() as RendicionEfectivo));
    rendiciones.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));

    // 7. Commission percentage history
    const cfgSnap = await db.collection("vendedores_configuraciones_comision")
      .where("vendedorAfiliadoId", "==", canonicalVendorId)
      .get();
    const historialPorcentajes: ConfiguracionComisionVendedor[] = [];
    cfgSnap.forEach(d => historialPorcentajes.push(d.data() as ConfiguracionComisionVendedor));
    historialPorcentajes.sort((a: any, b: any) => b.vigenteDesde.localeCompare(a.vigenteDesde) || b.createdAt.localeCompare(a.createdAt));

    // 8. Current commission config (STRICT: NO historical fallback or future config as active)
    const nowIso = new Date().toISOString();
    let configuracionVigente: ConfiguracionComisionVendedor | null = null;
    try {
      configuracionVigente = await obtenerConfiguracionComisionVigente(db, canonicalVendorId, nowIso);
    } catch (err: unknown) {
      const msg = (err as Error).message || "";
      if (msg.includes("409:CONFIGURACION_COMISION_VENDEDOR_FALTANTE")) {
        configuracionVigente = null;
      } else {
        throw err;
      }
    }

    return NextResponse.json({
      ok: true,
      vendedor: vendorData,
      cuentaCorriente,
      saldoDisponibleLiquidacionCentavos,
      custodiaEfectivo,
      liquidaciones,
      rendiciones,
      historialPorcentajes,
      configuracionVigente
    });
  } catch (err: unknown) {
    const message = (err as Error).message || "";
    const status = message.startsWith("404:") ? 404 : 500;
    return NextResponse.json({ error: message || "500:INTERNAL_ERROR" }, { status });
  }
}
