import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import { validarAdminToken } from "@/lib/adminAuth";
import {
  obtenerCuentaCorrienteVendedor,
  obtenerSaldoDisponibleLiquidacion,
  obtenerLedgerCustodiaEfectivo
} from "@/lib/settlementsEngine";
import { obtenerConfiguracionComisionVigente, ConfiguracionComisionVendedor } from "@/lib/commissionsEngine";

export interface VendedorAdminSummary {
  id: string;
  nombre: string;
  email: string;
  localidad?: string;
  activo: boolean;
  saldoCuentaCorrienteCentavos: number;
  saldoDisponibleLiquidacionCentavos: number;
  efectivoPendienteRendicionCentavos: number;
  porcentajeVigenteBasisPoints: number|null;
  porcentajeVigenteDisplay: string;
  mostrarCuentaCorrienteEnPanel: boolean;
  authUid?: string;
  revision:number;
  porcentajeComision:number|null;
  telefono:string;
}

export async function GET(req: Request) {
  try {
    const authRes = await validarAdminToken(req);
    if (!authRes.valid) {
      return NextResponse.json({ error: "403:FORBIDDEN: Acceso restringido al Administrador." }, { status: 403 });
    }

    const db = admin.firestore();
    const snap = await db.collection("vendedores").get();
    
    const nowIso = new Date().toISOString();
    const vendedores: VendedorAdminSummary[] = [];

    for (const doc of snap.docs) {
      const data = doc.data();
      const vendorId = doc.id;

      // 1. Account current summary
      let saldoCuentaCorrienteCentavos = 0;
      try {
        const cc = await obtenerCuentaCorrienteVendedor(db, vendorId);
        saldoCuentaCorrienteCentavos = cc.saldoCuentaCorrienteCentavos;
      } catch {
        // Fallback
      }

      // 2. Settlement available balance
      let saldoDisponibleLiquidacionCentavos = 0;
      try {
        saldoDisponibleLiquidacionCentavos = await obtenerSaldoDisponibleLiquidacion(db, vendorId);
      } catch {
        // Fallback
      }

      // 3. Cash custody pending
      let efectivoPendienteRendicionCentavos = 0;
      try {
        const cust = await obtenerLedgerCustodiaEfectivo(db, vendorId);
        efectivoPendienteRendicionCentavos = cust.efectivoPendienteRendicionCentavos;
      } catch {
        // Fallback
      }

      // 4. Current commission percentage
      let porcentajeVigenteBasisPoints:number|null = null;
      let porcentajeVigenteDisplay = "Sin configurar";
      try {
        const cfg: ConfiguracionComisionVendedor = await obtenerConfiguracionComisionVigente(db, vendorId, nowIso);
        porcentajeVigenteBasisPoints = cfg.porcentajeComisionBasisPoints;
        porcentajeVigenteDisplay = `${(cfg.porcentajeComisionBasisPoints / 100).toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`;
      } catch {
        if (typeof data.porcentajeComision === "number") {
          porcentajeVigenteBasisPoints = Math.round(data.porcentajeComision * 100);
          porcentajeVigenteDisplay = `${data.porcentajeComision}%`;
        }
      }

      vendedores.push({
        id: vendorId,
        nombre: data.nombre || data.email || vendorId,
        email: data.email || "",
        localidad: data.localidad || "",
        activo: data.activo !== false,
        saldoCuentaCorrienteCentavos,
        saldoDisponibleLiquidacionCentavos,
        efectivoPendienteRendicionCentavos,
        porcentajeVigenteBasisPoints,
        porcentajeVigenteDisplay,
        mostrarCuentaCorrienteEnPanel: Boolean(data.mostrarCuentaCorrienteEnPanel),
        revision:data.revision??0,
        porcentajeComision:porcentajeVigenteBasisPoints===null?null:porcentajeVigenteBasisPoints/100,
        telefono:data.telefono??'',
        authUid: data.authUid || undefined
      });
    }

    vendedores.sort((a, b) => a.nombre.localeCompare(b.nombre));

    return NextResponse.json({ ok: true, vendedores });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || "500:INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(){return NextResponse.json({error:'Utilizá el registro administrativo unificado.'},{status:409});}
