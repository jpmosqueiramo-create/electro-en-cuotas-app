export interface MovimientoComisionInput {
  id?: string;
  tipo: string;
  montoComisionCentavos: number;
  baseComisionableCentavos?: number | null;
  cuotaNumero?: number | null;
  motivo?: string | null;
  solicitudId?: string | null;
  clienteNombre?: string | null;
  productoResumen?: string | null;
  fecha?: string;
}

export interface PresentacionMovimientoComision {
  esIngreso: boolean;
  tipoImpacto: "ingreso" | "egreso";
  signoVisual: "+" | "-";
  montoFormateado: string;
  montoAbsolutoFormateado: string;
  montoFirmadoFormateado: string;
  label: string;
}

export function formatMoney(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined || isNaN(centavos)) {
    return "No disponible";
  }
  const isNegative = centavos < 0;
  const absCentavos = Math.abs(centavos);
  const pesos = Math.floor(absCentavos / 100);
  const cents = absCentavos % 100;

  const formattedPesos = pesos.toLocaleString("es-AR");
  if (cents === 0) {
    return `${isNegative ? "-$ " : "$ "}${formattedPesos}`;
  }
  const centsStr = String(cents).padStart(2, "0");
  return `${isNegative ? "-$ " : "$ "}${formattedPesos},${centsStr}`;
}

export function obtenerPresentacionMovimientoComision(
  mov: MovimientoComisionInput
): PresentacionMovimientoComision {
  const t = mov.tipo;
  const rawCents = mov.montoComisionCentavos;

  let esIngreso = false;
  let label = t;

  if (t === "DEVENGAMIENTO_PAGO") {
    esIngreso = true;
    label = "Comisión Devengada";
  } else if (t === "REVERSA_COMISION" || t === "REVERSA_PAGO") {
    esIngreso = false;
    label = "Reversa de Comisión";
  } else if (t === "AJUSTE_ADMINISTRATIVO" || t === "AJUSTE_POSITIVO" || t === "AJUSTE_NEGATIVO") {
    esIngreso = rawCents >= 0;
    label = rawCents >= 0 ? "Ajuste a Favor" : "Ajuste en Contra";
  } else if (t === "PAGO_LIQUIDACION") {
    // PAGO_LIQUIDACION es SIEMPRE débito visual (egreso) aunque su monto en DB sea positivo
    esIngreso = false;
    label = "Liquidación pagada";
  } else {
    esIngreso = rawCents >= 0;
  }

  const absMoney = formatMoney(Math.abs(rawCents));
  const signoVisual: "+" | "-" = esIngreso ? "+" : "-";
  const montoFirmadoFormateado = `${signoVisual}${absMoney}`;

  return {
    esIngreso,
    tipoImpacto: esIngreso ? "ingreso" : "egreso",
    signoVisual,
    montoFormateado: montoFirmadoFormateado,
    montoAbsolutoFormateado: absMoney,
    montoFirmadoFormateado,
    label
  };
}

export type EstadoCuentaCorrienteHttp = "ENABLED" | "DISABLED" | "ERROR";

export function resolverEstadoCuentaCorrienteHttp(
  status: number
): EstadoCuentaCorrienteHttp {
  if (status === 200) return "ENABLED";
  if (status === 403) return "DISABLED";
  return "ERROR";
}
