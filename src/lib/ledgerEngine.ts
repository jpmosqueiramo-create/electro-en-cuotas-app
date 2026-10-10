import { procesarComisionPago, reversarComisionPago } from "./commissionsEngine";
import { LedgerCustodiaEfectivoMovimiento } from "./settlementsEngine";
import { admin } from './firebaseAdmin';

export type MedioPago = 'TRANSFERENCIA' | 'EFECTIVO';
export type TipoMovimiento = 'PAGO' | 'REVERSA' | 'REINTEGRO' | 'SALDO_INICIAL_MIGRACION';
export type EstadoMovimiento = 'ACTIVO' | 'REVERSADO';
export type OrigenRegistroPago = 'ADMIN' | 'CLIENTE_INFORMADO_CONFIRMADO' | 'SENA';
export type EstadoValidacionPagoInformado = 'PENDIENTE_VALIDACION' | 'CONFIRMADO' | 'RECHAZADO';
export type EstadoImputacion = 'ACTIVA' | 'REVERSADA';

export interface LedgerMovimiento {
  id: string;
  solicitudId: string;
  clienteId: string;
  pricingSchemaVersion: 'CANONICAL_V1';
  tipo: TipoMovimiento;
  estado: EstadoMovimiento;
  montoRecibidoCentavos: number;
  monedaRecibida: 'ARS' | 'USD';
  monedaPlan?: 'ARS' | 'USD';
  montoAplicablePlanCentavos?: number;
  cotizacionAplicada?: number | null;
  fuenteCotizacion?: string | null;
  fechaCotizacion?: string | null;
  medioPago: MedioPago;
  fechaEfectiva: string;
  fechaRegistro: string;
  registradoPor: string;
  confirmadoPor: string;
  origenRegistro: OrigenRegistroPago;
  idempotencyKey: string;
  vendedorAfiliadoIdAlMomentoDelCobro?: string | null;
  cuotaNumero?: number | null;

  referenciaTransferencia?: string | null;
  comprobanteStoragePath?: string | null;
  fechaAcreditacion?: string | null;
  cuentaReceptoraId?: string | null;

  receptorEfectivoId?: string | null;
  fechaRecepcion?: string | null;

  movimientoOriginalId?: string | null;
  motivo?: string | null;
  fechaReversa?: string | null;
  reversadoPor?: string | null;
}

export interface LedgerImputacion {
  id: string;
  solicitudId: string;
  movimientoId: string;
  cuotaNumero: number;
  importeAplicadoCentavos: number;
  capitalAplicadoCentavos: number;
  servicioNetoAplicadoCentavos: number;
  ivaAplicadoCentavos: number;
  fechaImputacion: string;
  estado: EstadoImputacion;
  imputacionOriginalId?: string | null;
}

export interface PagoInformado {
  id: string;
  solicitudId: string;
  clienteId: string;
  montoInformadoCentavos: number;
  moneda: 'ARS' | 'USD';
  medioPago: MedioPago;
  fechaInformada: string;
  fechaCarga: string;
  estadoValidacion: EstadoValidacionPagoInformado;
  observacionCliente?: string | null;
  observacionAdmin?: string | null;
  referenciaTransferencia?: string | null;
  comprobanteStoragePath?: string | null;
  receptorDeclarado?: string | null;
  ledgerMovimientoIdConfirmed?: string | null;
}

export interface EstadoCuotaDerivado {
  numero: number;
  montoOriginalCentavos: number;
  pagadoActivoCentavos: number;
  saldoCentavos: number;

  capitalOriginalCentavos: number;
  capitalPagadoCentavos: number;
  capitalPendienteCentavos: number;

  servicioNetoOriginalCentavos: number;
  servicioNetoPagadoCentavos: number;
  servicioNetoPendienteCentavos: number;

  ivaOriginalCentavos: number;
  ivaPagadoCentavos: number;
  ivaPendienteCentavos: number;

  estadoCuota: 'SIN_PAGOS' | 'PARCIAL' | 'PAGADA';
  estado?: 'SIN_PAGOS' | 'PARCIAL' | 'PAGADA';
}

export interface EstadoFinancieroOperacion {
  solicitudId: string;
  clienteId: string;
  pricingSchemaVersion: 'CANONICAL_V1';
  totalContractualCentavos: number;
  totalPagadoActivoCentavos: number;
  saldoTotalCentavos: number;
  saldoTotalPendienteCentavos?: number;
  estadoFinanciero: 'SIN_PAGOS' | 'PARCIAL' | 'PAGADA' | 'CANCELADO';
  cuotas: EstadoCuotaDerivado[];
  movimientosActivosCount: number;
}

export interface DesgloseImputacionCuota {
  cuotaNumero: number;
  importeAplicadoCentavos: number;
  capitalAplicadoCentavos: number;
  servicioNetoAplicadoCentavos: number;
  ivaAplicadoCentavos: number;
}

/**
 * Recalcula el estado financiero derivado de una operación CANONICAL_V1.
 */
export async function calcularEstadoFinancieroOperacion(
  db: admin.firestore.Firestore,
  solicitudId: string
): Promise<EstadoFinancieroOperacion> {
  const solRef = db.collection('solicitudes').doc(solicitudId);
  let solSnap = await solRef.get();
  
  if (!solSnap.exists) {
    // Intentar buscar en propuestas
    const propSnap = await db.collection('propuestas').doc(solicitudId).get();
    if (propSnap.exists) {
      solSnap = propSnap;
    } else {
      throw new Error('404:SOLICITUD_NO_ENCONTRADA: La solicitud u operación especificada no existe.');
    }
  }

  const data = solSnap.data() || {};
  const pricingSchemaVersion = data.pricingSchemaVersion || data.propuestaAceptadaSnapshot?.pricingSchemaVersion || data.propuestaAceptada?.pricingSchemaVersion;

  if (pricingSchemaVersion !== 'CANONICAL_V1') {
    throw new Error('400:OPERACION_LEGACY_NO_CANONICAL: La operación no posee la versión de pricing CANONICAL_V1 requerida para el Ledger.');
  }

  const cuotasContractuales: Record<string, unknown>[] = data.cuotasInmutables || data.propuestaAceptadaSnapshot?.cuotas || data.propuestaAceptada?.cuotas || [];
  if (!Array.isArray(cuotasContractuales) || cuotasContractuales.length === 0) {
    throw new Error('400:PROPUESTA_SIN_CUOTAS: La operación no posee el desglose inmutable de cuotas en su snapshot.');
  }

  // Leer imputaciones activas
  const impSnap = await db.collection('ledger_imputaciones')
    .where('solicitudId', '==', solicitudId)
    .where('estado', '==', 'ACTIVA')
    .get();

  const imputacionesActivas: LedgerImputacion[] = [];
  impSnap.forEach(doc => {
    imputacionesActivas.push(doc.data() as LedgerImputacion);
  });

  if (imputacionesActivas.length === 0) {
    const movQuery = await db.collection("ledger_movimientos")
      .where("solicitudId", "==", solicitudId)
      .where("estado", "==", "ACTIVO")
      .where("tipo", "==", "PAGO")
      .get();

    if (!movQuery.empty) {
      movQuery.forEach(mDoc => {
        const mData = mDoc.data() as LedgerMovimiento;
        const cuotaNum = (mData as any).cuotaNumero;
        const monto = Number(mData.montoAplicablePlanCentavos || mData.montoRecibidoCentavos || 0);
        if (cuotaNum) {
          imputacionesActivas.push({
            id: "imp_syn_" + mData.id,
            solicitudId,
            movimientoId: mData.id,
            cuotaNumero: Number(cuotaNum),
            importeAplicadoCentavos: monto,
            capitalAplicadoCentavos: monto,
            servicioNetoAplicadoCentavos: 0,
            ivaAplicadoCentavos: 0,
            fechaImputacion: mData.fechaEfectiva || new Date().toISOString(),
            estado: "ACTIVA"
          });
        }
      });
    }
  }

  let totalContractualCentavos = 0;
  let totalPagadoActivoCentavos = 0;

  const cuotasDerivadas: EstadoCuotaDerivado[] = cuotasContractuales.map((c: Record<string, unknown>) => {
    const numero = Number(c.numero);
    const montoOriginalCentavos = Number(c.montoTotalCentavos || 0);
    const capitalOriginalCentavos = Number(c.capitalCentavos || 0);
    const servicioNetoOriginalCentavos = Number(c.servicioNetoGravadoCentavos || 0);
    const ivaOriginalCentavos = Number(c.ivaCentavos || 0);

    const impsCuota = imputacionesActivas.filter(i => Number(i.cuotaNumero) === numero);
    const pagadoActivoCentavos = impsCuota.reduce((sum, i) => sum + Number(i.importeAplicadoCentavos || 0), 0);
    const capitalPagadoCentavos = impsCuota.reduce((sum, i) => sum + Number(i.capitalAplicadoCentavos || 0), 0);
    const servicioNetoPagadoCentavos = impsCuota.reduce((sum, i) => sum + Number(i.servicioNetoAplicadoCentavos || 0), 0);
    const ivaPagadoCentavos = impsCuota.reduce((sum, i) => sum + Number(i.ivaAplicadoCentavos || 0), 0);

    const saldoCentavos = Math.max(0, montoOriginalCentavos - pagadoActivoCentavos);
    const capitalPendienteCentavos = Math.max(0, capitalOriginalCentavos - capitalPagadoCentavos);
    const servicioNetoPendienteCentavos = Math.max(0, servicioNetoOriginalCentavos - servicioNetoPagadoCentavos);
    const ivaPendienteCentavos = Math.max(0, ivaOriginalCentavos - ivaPagadoCentavos);

    let estadoCuota: 'SIN_PAGOS' | 'PARCIAL' | 'PAGADA' = 'SIN_PAGOS';
    if (saldoCentavos === 0) {
      estadoCuota = 'PAGADA';
    } else if (pagadoActivoCentavos > 0) {
      estadoCuota = 'PARCIAL';
    }

    totalContractualCentavos += montoOriginalCentavos;
    totalPagadoActivoCentavos += pagadoActivoCentavos;

    return {
      numero,
      montoOriginalCentavos,
      pagadoActivoCentavos,
      saldoCentavos,
      capitalOriginalCentavos,
      capitalPagadoCentavos,
      capitalPendienteCentavos,
      servicioNetoOriginalCentavos,
      servicioNetoPagadoCentavos,
      servicioNetoPendienteCentavos,
      ivaOriginalCentavos,
      ivaPagadoCentavos,
      ivaPendienteCentavos,
      estadoCuota,
      estado: estadoCuota
    };
  });

  const saldoTotalCentavos = Math.max(0, totalContractualCentavos - totalPagadoActivoCentavos);
  let estadoFinanciero: 'SIN_PAGOS' | 'PARCIAL' | 'PAGADA' | 'CANCELADO' = 'SIN_PAGOS';

  if (saldoTotalCentavos === 0) {
    estadoFinanciero = 'CANCELADO';
  } else if (totalPagadoActivoCentavos > 0) {
    estadoFinanciero = 'PARCIAL';
  }

  const movSnap = await db.collection('ledger_movimientos')
    .where('solicitudId', '==', solicitudId)
    .where('estado', '==', 'ACTIVO')
    .get();

  return {
    solicitudId,
    clienteId: data.clienteId || data.dni || data.datosPersonales?.dni || 'SN',
    pricingSchemaVersion: 'CANONICAL_V1',
    totalContractualCentavos,
    totalPagadoActivoCentavos,
    saldoTotalCentavos,
    saldoTotalPendienteCentavos: saldoTotalCentavos,
    estadoFinanciero,
    cuotas: cuotasDerivadas,
    movimientosActivosCount: movSnap.size
  };
}

/**
 * Algoritmo FIFO para imputación de dinero sobre cuotas derivadas.
 */
export function calcularImputacionesFIFO(
  cuotasDerivadas: EstadoCuotaDerivado[],
  montoDisponibleCentavos: number
): DesgloseImputacionCuota[] {
  const imputaciones: DesgloseImputacionCuota[] = [];
  let remanente = montoDisponibleCentavos;

  // Ordenar cuotas por número (FIFO: Cuota 1, Cuota 2...)
  const cuotasOrdenadas = [...cuotasDerivadas].sort((a, b) => a.numero - b.numero);

  for (const cuota of cuotasOrdenadas) {
    if (remanente <= 0) break;
    if (cuota.saldoCentavos <= 0) continue;

    const importeAplicar = Math.min(remanente, cuota.saldoCentavos);
    remanente -= importeAplicar;

    const totalPendiente = cuota.capitalPendienteCentavos + cuota.servicioNetoPendienteCentavos + cuota.ivaPendienteCentavos;

    let capAplicado = 0;
    let netoAplicado = 0;
    let ivaAplicado = 0;

    if (totalPendiente > 0) {
      if (importeAplicar === totalPendiente) {
        capAplicado = cuota.capitalPendienteCentavos;
        netoAplicado = cuota.servicioNetoPendienteCentavos;
        ivaAplicado = cuota.ivaPendienteCentavos;
      } else {
        capAplicado = Math.min(cuota.capitalPendienteCentavos, Math.floor(importeAplicar * (cuota.capitalPendienteCentavos / totalPendiente)));
        netoAplicado = Math.min(cuota.servicioNetoPendienteCentavos, Math.floor(importeAplicar * (cuota.servicioNetoPendienteCentavos / totalPendiente)));
        ivaAplicado = importeAplicar - capAplicado - netoAplicado;
        if (ivaAplicado > cuota.ivaPendienteCentavos) {
          const diff = ivaAplicado - cuota.ivaPendienteCentavos;
          ivaAplicado = cuota.ivaPendienteCentavos;
          netoAplicado = Math.min(cuota.servicioNetoPendienteCentavos, netoAplicado + diff);
        }
      }
    } else {
      capAplicado = importeAplicar;
    }

    imputaciones.push({
      cuotaNumero: cuota.numero,
      importeAplicadoCentavos: importeAplicar,
      capitalAplicadoCentavos: capAplicado,
      servicioNetoAplicadoCentavos: netoAplicado,
      ivaAplicadoCentavos: ivaAplicado
    });
  }

  return imputaciones;
}

/**
 * Registro atómico de Pago Directo realizado por Administración o Seña Confirmada.
 */
export async function registrarPagoDirectoAdmin(
  db: admin.firestore.Firestore,
  params: {
    solicitudId: string;
    montoRecibidoCentavos: number;
    monedaRecibida: 'ARS' | 'USD';
  monedaPlan?: 'ARS' | 'USD';
  montoAplicablePlanCentavos?: number;
    cotizacionAplicada?: number | null;
    fuenteCotizacion?: string | null;
    fechaCotizacion?: string | null;
    medioPago: MedioPago;
    fechaEfectiva: string;
    registradoPor: string;
    origenRegistro: OrigenRegistroPago;
    idempotencyKey: string;

    referenciaTransferencia?: string | null;
    comprobanteStoragePath?: string | null;
    fechaAcreditacion?: string | null;
    cuentaReceptoraId?: string | null;

    receptorEfectivoId?: string | null;
    fechaRecepcion?: string | null;
  }
): Promise<{ movimiento: LedgerMovimiento; imputaciones: LedgerImputacion[] }> {
  // Validar medios de pago
  if (params.medioPago !== 'TRANSFERENCIA' && params.medioPago !== 'EFECTIVO') {
    throw new Error('400:MEDIO_PAGO_INVALIDO: Únicamente se admiten los medios de pago TRANSFERENCIA o EFECTIVO.');
  }

  if (params.medioPago === 'TRANSFERENCIA' && params.fechaAcreditacion === "") {
    throw new Error('400:FECHA_ACREDITACION_REQUERIDA: Se requiere ingresar la fecha de acreditación real para pagos por transferencia.');
  }

  if (params.medioPago === 'EFECTIVO') {
    if (!params.receptorEfectivoId || !params.receptorEfectivoId.trim()) {
      throw new Error('400:RECEPTOR_EFECTIVO_REQUERIDO: Se requiere especificar la persona que recibió el efectivo.');
    }
    const recAuth = await validarReceptorEfectivoAutorizado(db, params.receptorEfectivoId);
    if (!recAuth.esAutorizado) {
      throw new Error('403:RECEPTOR_EFECTIVO_NO_AUTORIZADO: Los vendedores afiliados no autorizados no pueden recibir pagos en efectivo sin habilitación expresa de LOOP.');
    }
  }

  const montoAplicable = params.montoAplicablePlanCentavos ?? params.montoRecibidoCentavos ?? 0;
  if (montoAplicable <= 0) {
    throw new Error('400:MONTO_INVALIDO: El importe a aplicar debe ser un número entero mayor a 0 centavos.');
  }

  const resTx = await db.runTransaction(async (transaction) => {
    // 1. Verificar idempotencia
    const idempRef = db.collection('idempotencia_ledger').doc(params.idempotencyKey);
    const idempSnap = await transaction.get(idempRef);
    if (idempSnap.exists) {
      const existingData = idempSnap.data() || {};
      const existingMovId = existingData.movimientoId;
      if (existingData.solicitudId && existingData.solicitudId !== params.solicitudId) {
        throw new Error('409:IDEMPOTENCY_KEY_CONFLICT: La clave de idempotencia ya fue utilizada para otra solicitud.');
      }
      const movSnap = await transaction.get(db.collection('ledger_movimientos').doc(existingMovId));
      if (movSnap.exists) {
        const movData = movSnap.data() as LedgerMovimiento;
        if (movData.montoRecibidoCentavos !== params.montoRecibidoCentavos || movData.solicitudId !== params.solicitudId) {
          throw new Error('409:IDEMPOTENCY_KEY_CONFLICT: La clave de idempotencia ya fue utilizada con un payload diferente.');
        }
        const impSnap = await db.collection('ledger_imputaciones').where('movimientoId', '==', existingMovId).get();
        const imps: LedgerImputacion[] = [];
        impSnap.forEach(d => imps.push(d.data() as LedgerImputacion));
        return { movimiento: movData, imputaciones: imps };
      }
    }

    // 2. Leer Solicitud
    const solRef = db.collection('solicitudes').doc(params.solicitudId);
    let solSnap = await transaction.get(solRef);
    if (!solSnap.exists) {
      const propRef = db.collection('propuestas').doc(params.solicitudId);
      solSnap = await transaction.get(propRef);
    }
    if (!solSnap.exists) {
      throw new Error('404:SOLICITUD_NO_ENCONTRADA: La solicitud u operación especificada no existe.');
    }

    const solData = solSnap.data() || {};
    const targetMoneda = solData.monedaPlan || solData.moneda || solData.propuestaAceptadaSnapshot?.moneda || solData.propuestaAceptada?.moneda || 'ARS';
    let montoAplicable = params.montoAplicablePlanCentavos ?? params.montoRecibidoCentavos ?? 0;
    if (targetMoneda === 'USD' && params.monedaRecibida === 'ARS') {
      if (!params.cotizacionAplicada) {
        throw new Error('409:COTIZACION_REQUERIDA_PAGO_USD_EN_ARS: Debe especificar la cotización para imputar un pago en ARS a un plan en USD.');
      }
      montoAplicable = Math.round(params.montoRecibidoCentavos / params.cotizacionAplicada);
    }
    const pricingSchemaVersion = solData.pricingSchemaVersion || solData.propuestaAceptadaSnapshot?.pricingSchemaVersion || solData.propuestaAceptada?.pricingSchemaVersion;

    if (pricingSchemaVersion !== 'CANONICAL_V1') {
      throw new Error('400:OPERACION_LEGACY_NO_CANONICAL: La operación no posee la versión de pricing CANONICAL_V1 requerida para el Ledger.');
    }

    const cuotasContractuales: Record<string, unknown>[] = solData.cuotasInmutables || solData.propuestaAceptadaSnapshot?.cuotas || solData.propuestaAceptada?.cuotas || [];
    if (!Array.isArray(cuotasContractuales) || cuotasContractuales.length === 0) {
      throw new Error('400:PROPUESTA_SIN_CUOTAS: La operación no posee el desglose inmutable de cuotas en su snapshot.');
    }

    // Leer imputaciones activas dentro de transacción
    const impQuery = db.collection('ledger_imputaciones')
      .where('solicitudId', '==', params.solicitudId)
      .where('estado', '==', 'ACTIVA');
    const impSnap = await transaction.get(impQuery);
    const imputacionesActivas: LedgerImputacion[] = [];
    impSnap.forEach(d => imputacionesActivas.push(d.data() as LedgerImputacion));

    let totalContractualCentavos = 0;
    let totalPagadoActivoCentavos = 0;

    const cuotasDerivadas: EstadoCuotaDerivado[] = cuotasContractuales.map((c: Record<string, unknown>) => {
      const numero = Number(c.numero);
      const montoOriginalCentavos = Number(c.montoTotalCentavos || 0);
      const capitalOriginalCentavos = Number(c.capitalCentavos || 0);
      const servicioNetoOriginalCentavos = Number(c.servicioNetoGravadoCentavos || 0);
      const ivaOriginalCentavos = Number(c.ivaCentavos || 0);

      const impsCuota = imputacionesActivas.filter(i => Number(i.cuotaNumero) === numero);
      const pagadoActivoCentavos = impsCuota.reduce((sum, i) => sum + Number(i.importeAplicadoCentavos || 0), 0);
      const capitalPagadoCentavos = impsCuota.reduce((sum, i) => sum + Number(i.capitalAplicadoCentavos || 0), 0);
      const servicioNetoPagadoCentavos = impsCuota.reduce((sum, i) => sum + Number(i.servicioNetoAplicadoCentavos || 0), 0);
      const ivaPagadoCentavos = impsCuota.reduce((sum, i) => sum + Number(i.ivaAplicadoCentavos || 0), 0);

      const saldoCentavos = Math.max(0, montoOriginalCentavos - pagadoActivoCentavos);
      const capitalPendienteCentavos = Math.max(0, capitalOriginalCentavos - capitalPagadoCentavos);
      const servicioNetoPendienteCentavos = Math.max(0, servicioNetoOriginalCentavos - servicioNetoPagadoCentavos);
      const ivaPendienteCentavos = Math.max(0, ivaOriginalCentavos - ivaPagadoCentavos);

      totalContractualCentavos += montoOriginalCentavos;
      totalPagadoActivoCentavos += pagadoActivoCentavos;

      return {
        numero,
        montoOriginalCentavos,
        pagadoActivoCentavos,
        saldoCentavos,
        capitalOriginalCentavos,
        capitalPagadoCentavos,
        capitalPendienteCentavos,
        servicioNetoOriginalCentavos,
        servicioNetoPagadoCentavos,
        servicioNetoPendienteCentavos,
        ivaOriginalCentavos,
        ivaPagadoCentavos,
        ivaPendienteCentavos,
        estadoCuota: saldoCentavos === 0 ? 'PAGADA' : (pagadoActivoCentavos > 0 ? 'PARCIAL' : 'SIN_PAGOS')
      };
    });

    const saldoTotalCentavos = Math.max(0, totalContractualCentavos - totalPagadoActivoCentavos);

    if (saldoTotalCentavos <= 0) {
      throw new Error('400:OPERACION_SIN_SALDO_PENDIENTE: La operación se encuentra totalmente saldada.');
    }

    if (montoAplicable > saldoTotalCentavos) {
      throw new Error(`400:PAGO_EXCEDE_SALDO_PENDIENTE: El pago de $ ${(montoAplicable / 100).toLocaleString('es-AR', { minimumFractionDigits: 2 })} excede el saldo pendiente total de $ ${(saldoTotalCentavos / 100).toLocaleString('es-AR', { minimumFractionDigits: 2 })}.`);
    }

    // Calcular imputaciones FIFO
    const desglosesFIFO = calcularImputacionesFIFO(cuotasDerivadas, montoAplicable);

    const movimientoId = 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const timestampIso = new Date().toISOString();

    const vendedorAfiliadoIdAlMomentoDelCobro = solData.vendedorAfiliadoId || solData.afiliadoId || solData.vendedorId || null;

    const nuevoMovimiento: LedgerMovimiento = {
      id: movimientoId,
      solicitudId: params.solicitudId,
      clienteId: solData.clienteId || solData.dni || solData.datosPersonales?.dni || 'SN',
      pricingSchemaVersion: 'CANONICAL_V1',
      tipo: 'PAGO',
      estado: 'ACTIVO',
      montoRecibidoCentavos: params.montoRecibidoCentavos,
      monedaRecibida: params.monedaRecibida,
      monedaPlan: params.monedaPlan || targetMoneda || "ARS",
      montoAplicablePlanCentavos: montoAplicable,
      cotizacionAplicada: params.cotizacionAplicada || null,
      fuenteCotizacion: params.fuenteCotizacion || null,
      fechaCotizacion: params.fechaCotizacion || null,
      medioPago: params.medioPago,
      fechaEfectiva: params.fechaEfectiva,
      fechaRegistro: timestampIso,
      registradoPor: params.registradoPor,
      confirmadoPor: params.registradoPor,
      origenRegistro: params.origenRegistro,
      idempotencyKey: params.idempotencyKey,
      vendedorAfiliadoIdAlMomentoDelCobro,
      cuotaNumero: desglosesFIFO.length > 0 ? desglosesFIFO[0].cuotaNumero : null,

      referenciaTransferencia: params.referenciaTransferencia || null,
      comprobanteStoragePath: params.comprobanteStoragePath || null,
      fechaAcreditacion: params.fechaAcreditacion || null,
      cuentaReceptoraId: params.cuentaReceptoraId || null,

      receptorEfectivoId: params.receptorEfectivoId || null,
      fechaRecepcion: params.fechaRecepcion || null
    };

    const nuevasImputaciones: LedgerImputacion[] = [];

    for (const d of desglosesFIFO) {
      const impId = 'imp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const nuevaImp: LedgerImputacion = {
        id: impId,
        solicitudId: params.solicitudId,
        movimientoId,
        cuotaNumero: d.cuotaNumero,
        importeAplicadoCentavos: d.importeAplicadoCentavos,
        capitalAplicadoCentavos: d.capitalAplicadoCentavos,
        servicioNetoAplicadoCentavos: d.servicioNetoAplicadoCentavos,
        ivaAplicadoCentavos: d.ivaAplicadoCentavos,
        fechaImputacion: timestampIso,
        estado: 'ACTIVA'
      };
      nuevasImputaciones.push(nuevaImp);
      transaction.set(db.collection('ledger_imputaciones').doc(impId), nuevaImp);
    }

    transaction.set(db.collection('ledger_movimientos').doc(movimientoId), nuevoMovimiento);

    if (params.medioPago === "EFECTIVO" && params.receptorEfectivoId) {
      const valRec = await validarReceptorEfectivoAutorizado(db, params.receptorEfectivoId);
      if (valRec.esAutorizado && valRec.vendedorAfiliadoId) {
        const movCustId = "cust_cobro_" + movimientoId;
        const custMov: LedgerCustodiaEfectivoMovimiento = {
          id: movCustId,
          solicitudId: params.solicitudId,
          vendedorAfiliadoId: valRec.vendedorAfiliadoId,
          tipo: "COBRO_EFECTIVO_VENDEDOR",
          montoCentavos: params.montoRecibidoCentavos,
          moneda: "ARS",
          ledgerMovimientoRelacionadoId: movimientoId,
          idempotencyKey: "cust_" + params.idempotencyKey,
          registradoPorUid: params.registradoPor,
          createdAt: timestampIso
        };
        transaction.set(db.collection("ledger_custodia_efectivo").doc(movCustId), custMov);
      }
    }
    transaction.set(idempRef, { movimientoId, timestamp: timestampIso, solicitudId: params.solicitudId, montoRecibidoCentavos: params.montoRecibidoCentavos });

    return { movimiento: nuevoMovimiento, imputaciones: nuevasImputaciones };
  });

  try {
    await procesarComisionPago(db, {
      solicitudId: params.solicitudId,
      ledgerPagoMovimientoId: resTx.movimiento.id,
      registradoPor: params.registradoPor,
      ledgerMovimiento: resTx.movimiento
    });
  } catch (comErr: any) {
    // Financial payment in Ledger is preserved even if commission auto-devengamiento fails
  }

  return resTx;
}

/**
 * Validar y Confirmar o Rechazar un Pago Informado por el Cliente.
 */
export async function validarPagoInformadoAdmin(
  db: admin.firestore.Firestore,
  params: {
    pagoInformadoId: string;
    accion: 'CONFIRMAR' | 'RECHAZADO';
    observacionAdmin?: string;
    adminEmail?: string;
    reversadoPor?: string;
    idempotencyKey?: string;
    fechaAcreditacion?: string;
  }
): Promise<{ ok: boolean; estadoValidacion: EstadoValidacionPagoInformado; movimientoConfirmed?: LedgerMovimiento }> {
  return await db.runTransaction(async (transaction) => {
    const pagoInfRef = db.collection('pagos_informados').doc(params.pagoInformadoId);
    const pagoInfSnap = await transaction.get(pagoInfRef);

    if (!pagoInfSnap.exists) {
      throw new Error('404:PAGO_INFORMADO_NO_ENCONTRADO: El pago informado especificado no existe.');
    }

    const infoData = pagoInfSnap.data() as PagoInformado;

    if (infoData.estadoValidacion !== 'PENDIENTE_VALIDACION' || infoData.ledgerMovimientoIdConfirmed) {
      throw new Error('409:PAGO_INFORMADO_YA_PROCESADO: El pago informado ya ha sido confirmado o rechazado previamente.');
    }

    if (params.accion === 'RECHAZADO') {
      transaction.update(pagoInfRef, {
        estadoValidacion: 'RECHAZADO',
        observacionAdmin: params.observacionAdmin || 'Rechazado por Administración',
        fechaValidacion: new Date().toISOString(),
        validadoPor: (params.adminEmail || params.reversadoPor || "").trim()
      });
      return { ok: true, estadoValidacion: 'RECHAZADO' };
    }

    // CONFIRMAR -> Crear Pago Directo
    if (!params.fechaAcreditacion || !params.fechaAcreditacion.trim()) {
      throw new Error('400:FECHA_ACREDITACION_REQUERIDA: Se requiere ingresar la fecha de acreditación real.');
    }
    const idempotencyKey = 'CONFIRM_PAGO_INFORMADO_' + params.pagoInformadoId;

    const resPago = await registrarPagoDirectoAdmin(db, {
      solicitudId: infoData.solicitudId,
      montoRecibidoCentavos: infoData.montoInformadoCentavos,
      monedaRecibida: infoData.moneda,
      monedaPlan: infoData.moneda,
      montoAplicablePlanCentavos: infoData.montoInformadoCentavos,
      medioPago: infoData.medioPago,
      fechaEfectiva: infoData.fechaInformada || new Date().toISOString(),
      registradoPor: (params.adminEmail || params.reversadoPor || "").trim(),
      origenRegistro: 'CLIENTE_INFORMADO_CONFIRMADO',
      idempotencyKey,
      referenciaTransferencia: infoData.referenciaTransferencia || null,
      comprobanteStoragePath: infoData.comprobanteStoragePath || null
    });

    transaction.update(pagoInfRef, {
      estadoValidacion: 'CONFIRMADO',
      ledgerMovimientoIdConfirmed: resPago.movimiento.id,
      observacionAdmin: params.observacionAdmin || 'Confirmado por Administración',
      fechaValidacion: new Date().toISOString(),
      validadoPor: (params.adminEmail || params.reversadoPor || "").trim()
    });

    return { ok: true, estadoValidacion: 'CONFIRMADO', movimientoConfirmed: resPago.movimiento };
  });
}

/**
 * Reversar un movimiento PAGO existente.
 */
export async function reversarMovimientoPago(
  db: admin.firestore.Firestore,
  params: {
    movimientoId: string;
    motivo: string;
    adminEmail?: string;
    reversadoPor?: string;
    idempotencyKey?: string;
    fechaAcreditacion?: string;
  }
): Promise<{ ok: boolean; reversaMovimientoId: string }> {
  if (!params.motivo || !params.motivo.trim()) {
    throw new Error('400:MOTIVO_REQUERIDO: Se requiere especificar obligatoriamente un motivo para la reversa.');
  }

  const resRevTx = await db.runTransaction(async (transaction) => {
    const movRef = db.collection('ledger_movimientos').doc(params.movimientoId);
    const movSnap = await transaction.get(movRef);

    if (!movSnap.exists) {
      throw new Error('404:MOVIMIENTO_NO_ENCONTRADO: El movimiento a reversar no existe.');
    }

    const movData = movSnap.data() as LedgerMovimiento;

    if (movData.tipo !== 'PAGO' || movData.estado !== 'ACTIVO') {
      throw new Error('409:PAGO_YA_REVERSADO: Únicamente se pueden reversar movimientos de tipo PAGO activos.');
    }

    const impSnap = await transaction.get(
      db.collection('ledger_imputaciones')
        .where('movimientoId', '==', params.movimientoId)
        .where('estado', '==', 'ACTIVA')
    );

    const timestampIso = new Date().toISOString();
    const reversaMovId = 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

    const reversaMovimiento: LedgerMovimiento = {
      id: reversaMovId,
      solicitudId: movData.solicitudId,
      clienteId: movData.clienteId,
      pricingSchemaVersion: 'CANONICAL_V1',
      tipo: 'REVERSA',
      estado: 'ACTIVO',
      montoRecibidoCentavos: -movData.montoRecibidoCentavos,
      monedaRecibida: movData.monedaRecibida,
      monedaPlan: movData.monedaPlan,
      montoAplicablePlanCentavos: -(movData.montoAplicablePlanCentavos || 0),
      medioPago: movData.medioPago,
      fechaEfectiva: timestampIso,
      fechaRegistro: timestampIso,
      registradoPor: (params.adminEmail || params.reversadoPor || "").trim(),
      confirmadoPor: (params.adminEmail || params.reversadoPor || "").trim(),
      origenRegistro: movData.origenRegistro,
      idempotencyKey: 'REVERSA_' + params.movimientoId,
      movimientoOriginalId: params.movimientoId,
      motivo: params.motivo.trim()
    };

    transaction.set(db.collection('ledger_movimientos').doc(reversaMovId), reversaMovimiento);

    if (movData.medioPago === "EFECTIVO" && (movData as any).receptorEfectivoId) {
      const valRec = await validarReceptorEfectivoAutorizado(db, (movData as any).receptorEfectivoId);
      if (valRec.esAutorizado && valRec.vendedorAfiliadoId) {
        const revCustId = "cust_rev_" + reversaMovId;
        const revCustMov: LedgerCustodiaEfectivoMovimiento = {
          id: revCustId,
          solicitudId: movData.solicitudId,
          vendedorAfiliadoId: valRec.vendedorAfiliadoId,
          tipo: "COBRO_EFECTIVO_VENDEDOR",
          montoCentavos: -movData.montoRecibidoCentavos,
          moneda: "ARS",
          ledgerMovimientoRelacionadoId: reversaMovId,
          idempotencyKey: "cust_rev_" + params.movimientoId,
          registradoPorUid: (params.adminEmail || params.reversadoPor || "").trim(),
          createdAt: timestampIso
        };
        transaction.set(db.collection("ledger_custodia_efectivo").doc(revCustId), revCustMov);
      }
    }
    transaction.update(movRef, { estado: 'REVERSADO', fechaReversa: timestampIso, reversadoPor: (params.adminEmail || params.reversadoPor || "").trim() });

    impSnap.forEach(docSnap => {
      const imp = docSnap.data() as LedgerImputacion;
      const impRef = db.collection('ledger_imputaciones').doc(imp.id);
      transaction.update(impRef, { estado: 'REVERSADA' });

      const revImpId = 'imp_rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const revImp: LedgerImputacion = {
        id: revImpId,
        solicitudId: imp.solicitudId,
        movimientoId: reversaMovId,
        cuotaNumero: imp.cuotaNumero,
        importeAplicadoCentavos: -imp.importeAplicadoCentavos,
        capitalAplicadoCentavos: -imp.capitalAplicadoCentavos,
        servicioNetoAplicadoCentavos: -imp.servicioNetoAplicadoCentavos,
        ivaAplicadoCentavos: -imp.ivaAplicadoCentavos,
        fechaImputacion: timestampIso,
        estado: 'REVERSADA',
        imputacionOriginalId: imp.id
      };
      transaction.set(db.collection('ledger_imputaciones').doc(revImpId), revImp);
    });

    return { ok: true, reversaMovimientoId: reversaMovId, solicitudId: movData.solicitudId };
  });

  try {
    await reversarComisionPago(db, {
      solicitudId: resRevTx.solicitudId,
      ledgerPagoMovimientoId: params.movimientoId,
      motivo: params.motivo,
      adminEmail: (params.adminEmail || params.reversadoPor || "").trim()
    });
  } catch (comErr: any) {
    // Ignore if commission movement does not exist or was not created
  }

  return { ok: true, reversaMovimientoId: resRevTx.reversaMovimientoId };
}





export function obtenerSnapshotFinancieroCanonico(solData: any): { totalContractualCentavos: number; valorTotalContractualCentavos: number; totalPagadoActivoCentavos: number; saldoTotalCentavos: number; cuotas: any[] } {
  const pricingSchemaVersion = solData?.pricingSchemaVersion || solData?.propuestaAceptadaSnapshot?.pricingSchemaVersion || solData?.propuestaAceptada?.pricingSchemaVersion;
  if (pricingSchemaVersion !== "CANONICAL_V1") {
    throw new Error("400:OPERACION_LEGACY_NO_CANONICAL: La operación no posee la versión de pricing CANONICAL_V1 requerida para el Ledger.");
  }
  const cuotasContractuales: any[] = solData?.cuotasInmutables || solData?.propuestaAceptadaSnapshot?.cuotas || solData?.propuestaAceptada?.cuotas || solData?.cuotas || [];
  let totalContractualCentavos = 0;
  const cuotas = cuotasContractuales.map((c: any) => {
    const numero = Number(c.numero);
    const montoTotalCentavos = Number(c.montoTotalCentavos || 0);
    totalContractualCentavos += montoTotalCentavos;
    return {
      numero,
      montoTotalCentavos,
      fechaVencimiento: c.fechaVencimiento
    };
  });
  return {
    totalContractualCentavos,
    valorTotalContractualCentavos: totalContractualCentavos,
    totalPagadoActivoCentavos: Number(solData?.totalPagadoActivoCentavos || 0),
    saldoTotalCentavos: Math.max(0, totalContractualCentavos - Number(solData?.totalPagadoActivoCentavos || 0)),
    cuotas
  };
}


export async function validarReceptorEfectivoAutorizado(
  db: admin.firestore.Firestore,
  receptorId: string
): Promise<{ esAutorizado: boolean; vendedorAfiliadoId: string }> {
  if (!receptorId || !receptorId.trim()) {
    return { esAutorizado: false, vendedorAfiliadoId: "" };
  }
  const rSnap = await db.collection("receptores_efectivo_autorizados").doc(receptorId.trim()).get();
  if (!rSnap.exists) {
    return { esAutorizado: false, vendedorAfiliadoId: "" };
  }
  const data = rSnap.data() || {};
  if (data.activo === false) {
    return { esAutorizado: false, vendedorAfiliadoId: "" };
  }
  if (!data.vendedorAfiliadoId || !data.vendedorAfiliadoId.trim()) {
    throw new Error("409:RECEPTOR_VENDEDOR_SIN_VINCULO: El receptor de efectivo autorizado no posee una cuenta de vendedor afiliado vinculada.");
  }
  return { esAutorizado: true, vendedorAfiliadoId: data.vendedorAfiliadoId.trim() };
}
