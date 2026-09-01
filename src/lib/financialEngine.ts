/**
 * MOTOR DE CÁLCULO FINANCIERO Y DIVISIÓN FISCAL AFIP (21% IVA INCLUIDO)
 * Razón Social: LOOP GESTIÓN INTEGRAL S.R.L. (Marca: Cuenta Hogar)
 * Figura Legal: Mandato Comercial de Compra y Administración de Crédito Propio
 */

export const FACTORES_PREDETERMINADOS: Record<number, number> = {
  1: 1.1,
  2: 1.25,
  3: 1.4,
  4: 1.55,
  5: 1.7,
  6: 1.85,
  7: 2.0,
  8: 2.12,
  9: 2.22,
  10: 2.32,
  11: 2.42,
  12: 2.5,
  18: 3.25,
  24: 4.0
};

export interface FinancialInput {
  costoProducto: number;   // Costo del Producto (Capital exento de IVA por mandato)
  multiplicador?: number;  // Factor Financiado (Default según cuota o 2.5)
  cuotas: number;          // Cantidad de cuotas (1 a 24)
  montoAnticipo?: number;  // Anticipo abonado por el cliente
}

export interface FinancialResult {
  costoProducto: number;
  multiplicador: number;
  cuotas: number;
  valorTotal: number;           // (Costo_Producto * Multiplicador) -> Total adeudado por el cliente
  baseImponible: number;        // (Valor_Total - Costo_Producto) -> Honorarios e Intereses Gravados (Con IVA 21% Incluido)
  cuotaMensualCliente: number;  // (Valor_Total - Anticipo) / Cuotas -> Cuota final cliente
  montoExentoCuota: number;     // (Costo_Producto / Cuotas) -> Recibo X (Capital Exento)
  montoGravadoCuota: number;    // (Base_Imponible / Cuotas) -> Total Factura B AFIP (Con IVA 21% Incluido)
  netoGravadoCuota: number;     // (montoGravadoCuota / 1.21) -> Base Neta de Honorarios sin IVA
  iva21Cuota: number;           // (montoGravadoCuota - netoGravadoCuota) -> Débito Fiscal IVA 21%
}

export interface PlanCuotaDetalle {
  cuotas: number;
  activo: boolean;
  factor: number;
  valorTotal: number;
  baseImponible: number;
  cuotaMensual: number;
  montoExentoCuota: number;
  montoGravadoCuota: number;    // Total Factura B AFIP (Con IVA 21% Incluido)
  netoGravadoCuota: number;     // Base Neta de Honorarios sin IVA
  iva21Cuota: number;           // Débito Fiscal IVA 21%
}

export const calcularOperacionFinanciera = (input: FinancialInput): FinancialResult => {
  const costoProducto = Math.max(0, Number(input.costoProducto) || 0);
  const cuotas = Math.max(1, Math.min(24, Number(input.cuotas) || 12));
  const multiplicador = input.multiplicador && Number(input.multiplicador) > 0 
    ? Number(input.multiplicador) 
    : (FACTORES_PREDETERMINADOS[cuotas] || (cuotas > 12 ? 3.25 : 2.5));
  const anticipo = Math.max(0, Number(input.montoAnticipo) || 0);

  const valorTotal = Math.round(costoProducto * multiplicador);
  const baseImponible = Math.max(0, valorTotal - costoProducto);
  
  const saldoAFinanciar = Math.max(0, valorTotal - anticipo);
  const cuotaMensualCliente = cuotas > 0 ? Math.round(saldoAFinanciar / cuotas) : 0;

  const montoExentoCuota = cuotas > 0 ? Math.round(costoProducto / cuotas) : 0;
  const montoGravadoCuota = cuotas > 0 ? Math.round(baseImponible / cuotas) : 0;
  
  // Desglose del IVA 21% INCLUIDO en Factura B:
  const netoGravadoCuota = cuotas > 0 ? Math.round(montoGravadoCuota / 1.21) : 0;
  const iva21Cuota = Math.max(0, montoGravadoCuota - netoGravadoCuota);

  return {
    costoProducto,
    multiplicador,
    cuotas,
    valorTotal,
    baseImponible,
    cuotaMensualCliente,
    montoExentoCuota,
    montoGravadoCuota,
    netoGravadoCuota,
    iva21Cuota
  };
};

export const calcularTablaTodosLosPlanes = (
  costoProducto: number,
  factoresCustom?: Record<number | string, number>,
  planesActivos?: Record<number | string, boolean>
): PlanCuotaDetalle[] => {
  const cProd = Math.max(0, Number(costoProducto) || 0);
  const resultado: PlanCuotaDetalle[] = [];

  const hasPlanesActivosObj = planesActivos && typeof planesActivos === "object" && Object.keys(planesActivos).length > 0;

  for (let n = 1; n <= 12; n++) {
    const customFactor = factoresCustom?.[n] ?? factoresCustom?.[String(n)];
    const factor = customFactor && Number(customFactor) > 0
      ? Number(customFactor)
      : (FACTORES_PREDETERMINADOS[n] || 2.5);
    
    let activo = false;
    if (hasPlanesActivosObj) {
      const stateNum = planesActivos[n];
      const stateStr = planesActivos[String(n)];
      const explicitState = stateNum !== undefined ? stateNum : stateStr;
      activo = explicitState !== undefined ? Boolean(explicitState) : false;
    } else {
      activo = (n === 12 || n === 8);
    }

    const valorTotal = Math.round(cProd * factor);
    const baseImponible = Math.max(0, valorTotal - cProd);
    const cuotaMensual = n > 0 ? Math.round(valorTotal / n) : 0;
    const montoExentoCuota = n > 0 ? Math.round(cProd / n) : 0;
    const montoGravadoCuota = n > 0 ? Math.round(baseImponible / n) : 0;

    const netoGravadoCuota = n > 0 ? Math.round(montoGravadoCuota / 1.21) : 0;
    const iva21Cuota = Math.max(0, montoGravadoCuota - netoGravadoCuota);

    resultado.push({
      cuotas: n,
      activo,
      factor,
      valorTotal,
      baseImponible,
      cuotaMensual,
      montoExentoCuota,
      montoGravadoCuota,
      netoGravadoCuota,
      iva21Cuota
    });
  }

  return resultado;
};
