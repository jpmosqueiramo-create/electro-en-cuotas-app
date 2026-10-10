import { admin } from "./firebaseAdmin";

export type MedioPago = "TRANSFERENCIA" | "EFECTIVO";

export interface ConfiguracionPricingGlobal {
  id: "pricing_default";
  tnaPorPlazo: Record<number, number>; // Plazos 1..18 -> TNA % (ej: { 1: 0, 2: 30, ..., 12: 150, 18: 150 })
  alicuotaIvaDefault: number;          // Ej: 21.0
  fechaUltimaModificacion: string;
  modificadoPor: string;
}

export interface CuotaInmutableModel {
  numero: number;
  montoTotalCentavos: number;
  capitalCentavos: number;
  servicioNetoGravadoCentavos: number;
  ivaCentavos: number;
}

export interface CanonicalPricingInput {
  capitalCompraCentavos: number;      // Importe aplicado a la compra (en centavos)
  plazoMeses: number;                 // 1 a 18
  tnaInterna: number | null | undefined; // TNA % (ej: 150 para 150%)
  alicuotaIva: number | null | undefined;// IVA % (ej: 21.0 para 21%)
  senaMontoCentavos?: number;          // Seña abonada (en centavos)
  plazosHabilitadosProducto?: number[];// Lista de plazos habilitados en el catálogo
}

export interface CanonicalPricingResult {
  pricingSchemaVersion?: string;
  capitalCompraCentavos: number;
  plazoMeses: number;
  tnaInternaAplicada: number;
  alicuotaIvaAplicada: number;
  servicioBrutoTotalCentavos: number;
  servicioNetoTotalCentavos: number;
  ivaTotalCentavos: number;
  valorTotalContractualCentavos: number;
  factorDerivado: number;
  cuotaMensualBaseCentavos: number;
  senaMontoCentavos: number;
  cuotas: CuotaInmutableModel[];
}

export const TNA_DEFAULT_CONFIG: Record<number, number> = {
  1: 0,
  2: 30,
  3: 45,
  4: 60,
  5: 75,
  6: 90,
  7: 105,
  8: 115,
  9: 125,
  10: 135,
  11: 142,
  12: 150,
  13: 150,
  14: 150,
  15: 150,
  16: 150,
  17: 150,
  18: 150
};

export const ALICUOTA_IVA_DEFAULT = 21.0;

/**
 * Obtener la configuración global de TNA e IVA desde Firestore, o retornar defaults.
 */
export async function obtenerConfiguracionPricingGlobal(db: admin.firestore.Firestore): Promise<ConfiguracionPricingGlobal> {
  try {
    const docSnap = await db.collection("configuracion_general").doc("pricing").get();
    if (docSnap.exists) {
      const data = docSnap.data() || {};
      return {
        id: "pricing_default",
        tnaPorPlazo: data.tnaPorPlazo || TNA_DEFAULT_CONFIG,
        alicuotaIvaDefault: typeof data.alicuotaIvaDefault === "number" ? data.alicuotaIvaDefault : ALICUOTA_IVA_DEFAULT,
        fechaUltimaModificacion: data.fechaUltimaModificacion || new Date().toISOString(),
        modificadoPor: data.modificadoPor || "sistema"
      };
    }
  } catch (err) {
    console.warn("No se pudo obtener configuracion_general/pricing, usando defaults:", err);
  }

  return {
    id: "pricing_default",
    tnaPorPlazo: TNA_DEFAULT_CONFIG,
    alicuotaIvaDefault: ALICUOTA_IVA_DEFAULT,
    fechaUltimaModificacion: new Date().toISOString(),
    modificadoPor: "sistema"
  };
}

/**
 * Guardar o actualizar la configuración global de TNA e IVA con registro de auditoría.
 */
export async function guardarConfiguracionPricingGlobal(
  db: admin.firestore.Firestore,
  nuevaConfig: Partial<ConfiguracionPricingGlobal>,
  userEmail: string
): Promise<ConfiguracionPricingGlobal> {
  const actual = await obtenerConfiguracionPricingGlobal(db);
  const timestampIso = new Date().toISOString();

  const configActualizada: ConfiguracionPricingGlobal = {
    id: "pricing_default",
    tnaPorPlazo: nuevaConfig.tnaPorPlazo ? { ...actual.tnaPorPlazo, ...nuevaConfig.tnaPorPlazo } : actual.tnaPorPlazo,
    alicuotaIvaDefault: typeof nuevaConfig.alicuotaIvaDefault === "number" ? nuevaConfig.alicuotaIvaDefault : actual.alicuotaIvaDefault,
    fechaUltimaModificacion: timestampIso,
    modificadoPor: userEmail
  };

  const auditEntry = {
    timestamp: timestampIso,
    usuario: userEmail,
    configAnterior: actual,
    configNueva: configActualizada
  };

  await db.collection("configuracion_general").doc("pricing").set(configActualizada, { merge: true });
  await db.collection("configuracion_general").doc("pricing").collection("auditoria").add(auditEntry);

  return configActualizada;
}

/**
 * Motor canónico de cálculo de Pricing server-side en centavos seguros.
 */
export function calcularPricingCanonico(input: CanonicalPricingInput): CanonicalPricingResult {
  const capitalCompraCentavos = Math.max(0, Math.round(Number(input.capitalCompraCentavos) || 0));
  const plazoMeses = Math.round(Number(input.plazoMeses) || 1);
  const senaMontoCentavos = Math.max(0, Math.round(Number(input.senaMontoCentavos) || 0));

  if (capitalCompraCentavos <= 0) {
    throw new Error("400:El capital de compra debe ser un importe positivo mayor a 0.");
  }

  if (plazoMeses < 1 || plazoMeses > 18) {
    throw new Error(`400:El plazo de cuotas debe ser un número entero entre 1 y 18 (plazo ingresado: ${plazoMeses}).`);
  }

  if (input.plazosHabilitadosProducto && Array.isArray(input.plazosHabilitadosProducto) && input.plazosHabilitadosProducto.length > 0) {
    if (!input.plazosHabilitadosProducto.includes(plazoMeses)) {
      throw new Error(`400:PLAZO_NO_HABILITADO_PRODUCTO: El plazo de ${plazoMeses} cuotas no se encuentra habilitado para este producto. Plazos permitidos: ${input.plazosHabilitadosProducto.join(", ")}.`);
    }
  }

  if (input.tnaInterna === null || input.tnaInterna === undefined) {
    throw new Error('400:PRICING_TNA_NO_CONFIGURADA: La TNA interna debe estar configurada.');
  }
  if (input.alicuotaIva === null || input.alicuotaIva === undefined) {
    throw new Error('400:PRICING_IVA_NO_CONFIGURADO: La alícuota de IVA debe estar configurada.');
  }

  const tnaInternaAplicada = Math.max(0, Number(input.tnaInterna) || 0);
  const alicuotaIvaAplicada = Math.max(0, Number(input.alicuotaIva) || 0);

  // 1. Servicio Bruto Total (TNA Simple Nominal Proporcional al Plazo)
  // servicioBruto = capitalCompra * (tna / 100) * (plazoMeses / 12)
  const servicioBrutoTotalCentavos = Math.round(capitalCompraCentavos * (tnaInternaAplicada / 100) * (plazoMeses / 12));

  // 2. Valor Total Contractual
  const valorTotalContractualCentavos = capitalCompraCentavos + servicioBrutoTotalCentavos;

  // 3. Servicio Neto Gravado Total e IVA Total
  // servicioNeto = servicioBruto / (1 + iva / 100)
  const servicioNetoTotalCentavos = alicuotaIvaAplicada > 0
    ? Math.round(servicioBrutoTotalCentavos / (1 + (alicuotaIvaAplicada / 100)))
    : servicioBrutoTotalCentavos;

  const ivaTotalCentavos = Math.max(0, servicioBrutoTotalCentavos - servicioNetoTotalCentavos);

  // 4. Factor Derivado (Informativo interno únicamente)
  const factorDerivado = Number((valorTotalContractualCentavos / capitalCompraCentavos).toFixed(4));

  // 5. Generación de Cuotas Inmutables con Ajuste de Redondeo en la Última Cuota
  const cuotas: CuotaInmutableModel[] = [];

  let acumuladoCapital = 0;
  let acumuladoNeto = 0;
  let acumuladoIva = 0;

  for (let n = 1; n <= plazoMeses; n++) {
    let capCen = 0;
    let netCen = 0;
    let ivaCen = 0;

    if (n < plazoMeses) {
      capCen = Math.floor(capitalCompraCentavos / plazoMeses);
      netCen = Math.floor(servicioNetoTotalCentavos / plazoMeses);
      ivaCen = Math.floor(ivaTotalCentavos / plazoMeses);

      acumuladoCapital += capCen;
      acumuladoNeto += netCen;
      acumuladoIva += ivaCen;
    } else {
      // Última cuota absorbe exactamente la diferencia de redondeo de centavos
      capCen = capitalCompraCentavos - acumuladoCapital;
      netCen = servicioNetoTotalCentavos - acumuladoNeto;
      ivaCen = ivaTotalCentavos - acumuladoIva;
    }

    const totCen = capCen + netCen + ivaCen;

    cuotas.push({
      numero: n,
      montoTotalCentavos: totCen,
      capitalCentavos: capCen,
      servicioNetoGravadoCentavos: netCen,
      ivaCentavos: ivaCen
    });
  }

  const cuotaMensualBaseCentavos = cuotas[0].montoTotalCentavos;

  // 6. Validar Seña (Pago anticipado imputable a Cuota 1)
  if (senaMontoCentavos > cuotaMensualBaseCentavos) {
    throw new Error(`400:SENA_EXCEDE_CUOTA_1: La seña ($ ${(senaMontoCentavos / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })}) no puede superar el monto de la Cuota 1 ($ ${(cuotaMensualBaseCentavos / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })}).`);
  }

  return {
    pricingSchemaVersion: 'CANONICAL_V1',
    capitalCompraCentavos,
    plazoMeses,
    tnaInternaAplicada,
    alicuotaIvaAplicada,
    servicioBrutoTotalCentavos,
    servicioNetoTotalCentavos,
    ivaTotalCentavos,
    valorTotalContractualCentavos,
    factorDerivado,
    cuotaMensualBaseCentavos,
    senaMontoCentavos,
    cuotas
  };
}
