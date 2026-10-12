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
  tnaInterna?: number | null;         // TNA % obligatoria enviada o leída de config
  alicuotaIva?: number | null;        // IVA % obligatorio enviado o leído de config
  senaMontoCentavos?: number;          // Seña abonada (en centavos)
  plazosHabilitadosProducto?: number[];// Lista de plazos habilitados en el catálogo
}

export interface CanonicalPricingResult {
  pricingSchemaVersion: "CANONICAL_V1";
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

/**
 * Obtener la configuración global de TNA e IVA desde Firestore.
 * FAIL CLOSED: Retorna null si la configuración no existe o está incompleta.
 */
export async function obtenerConfiguracionPricingGlobal(db: admin.firestore.Firestore): Promise<ConfiguracionPricingGlobal | null> {
  try {
    const docSnap = await db.collection("configuracion_general").doc("pricing").get();
    if (docSnap.exists) {
      const data = docSnap.data() || {};
      if (data.tnaPorPlazo && typeof data.tnaPorPlazo === "object" && typeof data.alicuotaIvaDefault === "number") {
        return {
          id: "pricing_default",
          tnaPorPlazo: data.tnaPorPlazo,
          alicuotaIvaDefault: data.alicuotaIvaDefault,
          fechaUltimaModificacion: data.fechaUltimaModificacion || new Date().toISOString(),
          modificadoPor: data.modificadoPor || "admin"
        };
      }
    }
  } catch (err) {
    console.error("Error al obtener configuracion_general/pricing:", err);
  }
  return null;
}

/**
 * Guardar o actualizar la configuración global de TNA e IVA con registro ATÓMICO en WriteBatch.
 */
export async function guardarConfiguracionPricingGlobal(
  db: admin.firestore.Firestore,
  nuevaConfig: Partial<ConfiguracionPricingGlobal>,
  userEmail: string
): Promise<ConfiguracionPricingGlobal> {
  const actual = (await obtenerConfiguracionPricingGlobal(db)) || {
    id: "pricing_default",
    tnaPorPlazo: {},
    alicuotaIvaDefault: 21.0,
    fechaUltimaModificacion: new Date().toISOString(),
    modificadoPor: userEmail
  };

  const timestampIso = new Date().toISOString();

  const configActualizada: ConfiguracionPricingGlobal = {
    id: "pricing_default",
    tnaPorPlazo: nuevaConfig.tnaPorPlazo ? { ...actual.tnaPorPlazo, ...nuevaConfig.tnaPorPlazo } : actual.tnaPorPlazo,
    alicuotaIvaDefault: typeof nuevaConfig.alicuotaIvaDefault === "number" ? nuevaConfig.alicuotaIvaDefault : actual.alicuotaIvaDefault,
    fechaUltimaModificacion: timestampIso,
    modificadoPor: userEmail
  };

  const batch = db.batch();
  const configRef = db.collection("configuracion_general").doc("pricing");
  const auditRef = db.collection("configuracion_general").doc("pricing").collection("auditoria").doc();

  batch.set(configRef, configActualizada, { merge: true });
  batch.set(auditRef, {
    timestamp: timestampIso,
    usuario: userEmail,
    configAnterior: actual,
    configNueva: configActualizada
  });

  await batch.commit();

  return configActualizada;
}

/**
 * Motor canónico de cálculo de Pricing server-side en centavos seguros.
 * FAIL CLOSED: No asume TNA 0 ni IVA 21% silenciosamente.
 */
export function calcularPricingCanonico(input: CanonicalPricingInput): CanonicalPricingResult {
  const capitalCompraCentavos = Math.max(0, Math.round(Number(input.capitalCompraCentavos) || 0));
  const plazoMeses = Math.round(Number(input.plazoMeses) || 0);
  const senaMontoCentavos = Math.max(0, Math.round(Number(input.senaMontoCentavos) || 0));

  if (capitalCompraCentavos <= 0) {
    throw new Error("400:El capital de compra debe ser un importe positivo mayor a 0.");
  }

  if (plazoMeses < 1 || plazoMeses > 18) {
    throw new Error(`400:El plazo de cuotas debe ser un número entero entre 1 y 18 (plazo ingresado: ${plazoMeses}).`);
  }

  // FAIL CLOSED EN PLAZOS DEL PRODUCTO
  if (!input.plazosHabilitadosProducto || !Array.isArray(input.plazosHabilitadosProducto) || input.plazosHabilitadosProducto.length === 0) {
    throw new Error("400:LEGACY_READ_ONLY_REQUIRES_CONFIG: El producto no posee plazos habilitados configurados en el catálogo. Configure los plazos en administración antes de cotizar con el motor canónico.");
  }

  if (!input.plazosHabilitadosProducto.includes(plazoMeses)) {
    throw new Error(`400:PLAZO_NO_HABILITADO_PRODUCTO: El plazo de ${plazoMeses} cuotas no se encuentra habilitado para este producto. Plazos permitidos: ${input.plazosHabilitadosProducto.join(", ")}.`);
  }

  // FAIL CLOSED EN TNA E IVA
  if (input.tnaInterna === undefined || input.tnaInterna === null || isNaN(Number(input.tnaInterna)) || Number(input.tnaInterna) < 0) {
    throw new Error(`400:PRICING_TNA_NO_CONFIGURADA: No existe TNA configurada por la administración para el plazo de ${plazoMeses} cuotas.`);
  }

  if (input.alicuotaIva === undefined || input.alicuotaIva === null || isNaN(Number(input.alicuotaIva)) || Number(input.alicuotaIva) < 0) {
    throw new Error("400:PRICING_IVA_NO_CONFIGURADO: No existe alícuota de IVA configurada en la administración general de pricing.");
  }

  const tnaInternaAplicada = Number(input.tnaInterna);
  const alicuotaIvaAplicada = Number(input.alicuotaIva);

  // 1. Servicio Bruto Total (TNA Simple Nominal Proporcional al Plazo)
  const servicioBrutoTotalCentavos = Math.round(capitalCompraCentavos * (tnaInternaAplicada / 100) * (plazoMeses / 12));

  // 2. Valor Total Contractual
  const valorTotalContractualCentavos = capitalCompraCentavos + servicioBrutoTotalCentavos;

  // 3. Servicio Neto Gravado Total e IVA Total
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
    pricingSchemaVersion: "CANONICAL_V1",
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
