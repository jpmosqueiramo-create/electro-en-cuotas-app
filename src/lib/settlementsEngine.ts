import {stable} from './contractV2';
import {operationRef} from './operationV2';
import type {RemittancePreview,CashCollectionOption,RemittanceSelection,RemittanceCashAllocation} from './affiliateRemittance';
import {createHash} from 'node:crypto';
import { validateCommissionSource } from './affiliateCommissionAccess';
import { admin } from "./firebaseAdmin";
import { LedgerComisionMovimiento } from "./commissionsEngine";

type SettlementAliases={montoTotalLiquidadoCentavos?:number;adminUid?:string;confirmadoPorAdminUid?:string;anuladoPorAdminUid?:string;pagadoPorAdminUid?:string;registradoPorAdminUid?:string;adminEmail?:string};
/** Retains both historical invocation forms; typed raw functions remain the validation boundary. */
function settlementInvocation<P>(first:unknown,second?:unknown,third?:admin.firestore.Transaction){
 const isDb=typeof (first as {collection?:unknown}|null)?.collection==='function';
 return {db:isDb?first as admin.firestore.Firestore:admin.firestore(),params:(isDb?second:first) as P,transaction:(isDb?third:second) as admin.firestore.Transaction|undefined};
}

export type EstadoLiquidacionComision = "BORRADOR" | "CONFIRMADA" | "PAGADA" | "ANULADA";
export type TipoComponentePago = "TRANSFERENCIA" | "COMPENSACION_EFECTIVO_EN_PODER" | "EFECTIVO_EN_MANO";
export type TipoPagoConsolidado = "TRANSFERENCIA" | "COMPENSACION_EFECTIVO_EN_PODER" | "MIXTO" | "EFECTIVO_EN_MANO";

export interface ComponentePagoLiquidacion {
  formaPago: TipoComponentePago;
  montoCentavos: number;
  referenciaBancaria?: string | null;
  bancoOrigen?: string | null;
  notas?: string | null;
}

export interface LiquidacionComision {
  id: string;
  vendedorAfiliadoId: string;
  vendedorAfiliadoEmail: string;
  estado: EstadoLiquidacionComision;
  montoTotalLiquidadoCentavos: number;
  cantidadItems: number;
  periodoDesde?: string | null;
  periodoHasta?: string | null;
  componentesPago?: ComponentePagoLiquidacion[];
  tipoPagoConsolidado?: TipoPagoConsolidado | null;
  tieneIncidenciasPendientes?: boolean;
  detallesIncidencias?: string[];
  incidenciaNoVerificable?: boolean;
  creadoPorAdminUid: string;
  confirmadoPorAdminUid?: string | null;
  fechaConfirmacion?: string | null;
  pagadoPorAdminUid?: string | null;
  fechaPago?: string | null;
  anuladoPorAdminUid?: string | null;
  fechaAnulacion?: string | null;
  motivoAnulacion?: string | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface LiquidacionComisionItem {
  id: string;
  liquidacionId: string;
  vendedorAfiliadoId: string;
  movimientoFuenteId: string;
  tipoMovimientoFuente: string;
  montoFuenteCentavos: number;
  montoAsignadoCentavos: number;
  ordenFifoCreatedAt: string;
  ordenFifoId: string;
  solicitudId?: string | null;
  clienteNombre?: string | null;
  productoResumen?: string | null;
  cuotaNumero?: number | null;
  baseComisionableCentavos?: number | null;
  fechaCobroOriginal?: string | null;
  createdAt: string;
}

export type TipoMovimientoCustodiaEfectivo =
  | "COBRO_EFECTIVO_VENDEDOR"
  | "RENDICION_EFECTIVO"
  | "COMPENSACION_COMISION"
  | "DEVOLUCION_EFECTIVO_CLIENTE"
  | "AJUSTE_CUSTODIA_EFECTIVO";

export interface LedgerCustodiaEfectivoMovimiento {
  id: string;
  vendedorAfiliadoId: string;
  tipo: TipoMovimientoCustodiaEfectivo;
  montoCentavos: number; // Convenio de signos: Positivo (+) incrementa custodia física, Negativo (-) disminuye custodia física
  moneda: "ARS";
  ledgerMovimientoRelacionadoId?: string | null;
  solicitudId?: string | null;
  liquidacionId?: string | null;
  rendicionId?: string | null;
  motivo?: string | null;
  registradoPorUid: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface RendicionEfectivo {
  id: string;
  vendedorAfiliadoId: string;
  vendedorAfiliadoEmail: string;
  montoRendidoCentavos: number;
  metodoEntrega: "EFECTIVO_DEPOSITO" | "EFECTIVO_EN_MANO" | string;
  comprobanteReferencia?: string | null;
  observaciones?: string | null;
  confirmadoPorAdminUid: string;
  ledgerCustodiaMovimientoId: string;
  idempotencyKey: string;
  createdAt: string;
  schemaVersion?:'REMITTANCE_COMMISSION_OFFSET_V1';
  montoCobrosRendidosCentavos?:number;
  comisionRetenidaCentavos?:number;
  liquidacionComisionId?:string|null;
  revisionPreviaHash?:string;
  cobrosIncluidos?:RemittanceCashAllocation[];
  cashAllocationPolicy?:'EXPLICIT_SELECTION_WITH_LEGACY_FIFO_V1';
}

export interface ResumenCuentaCorrienteVendedor {
  vendedorAfiliadoId: string;
  saldoCuentaCorrienteCentavos: number;
  totalDevengadoCentavos: number;
  totalReversadoCentavos: number;
  totalAjustadoCentavos: number;
  totalPagadoCentavos: number;
  movimientos: LedgerComisionMovimiento[];
}

export interface ResumenCustodiaEfectivoVendedor {
  vendedorAfiliadoId: string;
  efectivoPendienteRendicionCentavos: number;
  movimientos: LedgerCustodiaEfectivoMovimiento[];
}

/**
 * Helper: Obtener Cuenta Corriente Derivada del Vendedor
 * saldoCuentaCorrienteCentavos = Σ DEVENGAMIENTO_PAGO + Σ REVERSA_COMISION + Σ AJUSTE_ADMINISTRATIVO - Σ PAGO_LIQUIDACION
 * Puede ser positivo, cero o negativo.
 */
export async function obtenerCuentaCorrienteVendedor(
  db: admin.firestore.Firestore,
  vendedorAfiliadoId: string,
  transaction?: admin.firestore.Transaction
): Promise<ResumenCuentaCorrienteVendedor> {
  const vIdClean = vendedorAfiliadoId.trim();
  const collectionRef = db.collection("ledger_comisiones_movimientos");
  const query = collectionRef.where("vendedorAfiliadoId", "==", vIdClean);
  
  const snap = transaction ? await transaction.get(query) : await query.get();

  let totalDevengadoCentavos = 0;
  let totalReversadoCentavos = 0;
  let totalAjustadoCentavos = 0;
  let totalPagadoCentavos = 0;

  const movimientos: LedgerComisionMovimiento[] = [];

  for (const doc of snap.docs) {
    const mov = doc.data() as LedgerComisionMovimiento;
    if(doc.data().operationSchemaVersion==='OPERATION_COMMISSION_V2'&&doc.id!==mov.id)throw Error('COMMISSION_DOCUMENT_ID_INVALID');
    await validateCommissionSource(db,transaction,doc.data());
    movimientos.push(mov);

    if (mov.tipo === "DEVENGAMIENTO_PAGO") {
      totalDevengadoCentavos += mov.montoComisionCentavos;
    } else if (mov.tipo === "REVERSA_COMISION") {
      totalReversadoCentavos += mov.montoComisionCentavos; // Negativo
    } else if (mov.tipo === "AJUSTE_ADMINISTRATIVO") {
      totalAjustadoCentavos += mov.montoComisionCentavos; // Positivo o negativo
    } else if (mov.tipo === "PAGO_LIQUIDACION") {
      totalPagadoCentavos += Math.abs(mov.montoComisionCentavos); // Positivo en movimiento
    }
  }

  // Ordenar movimientos por createdAt ASC
  movimientos.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

  const saldoCuentaCorrienteCentavos =
    totalDevengadoCentavos + totalReversadoCentavos + totalAjustadoCentavos - totalPagadoCentavos;

  return {
    vendedorAfiliadoId: vIdClean,
    saldoCuentaCorrienteCentavos,
    totalDevengadoCentavos,
    totalReversadoCentavos,
    totalAjustadoCentavos,
    totalPagadoCentavos,
    movimientos
  };
}

/**
 * Helper: Obtener Custodia Física de Efectivo Derivada del Vendedor
 * efectivoPendienteRendicionCentavos = Σ COBRO_EFECTIVO_VENDEDOR - Σ RENDICION_EFECTIVO - Σ COMPENSACION_COMISION - Σ DEVOLUCION_EFECTIVO_CLIENTE ± Σ AJUSTE_CUSTODIA_EFECTIVO
 * Derivado exclusivamente de ledger_custodia_efectivo.
 */
export async function obtenerLedgerCustodiaEfectivo(
  db: admin.firestore.Firestore,
  vendedorAfiliadoId: string,
  transaction?: admin.firestore.Transaction
): Promise<ResumenCustodiaEfectivoVendedor> {
  const vIdClean = vendedorAfiliadoId.trim();
  const collectionRef = db.collection("ledger_custodia_efectivo");
  const query = collectionRef.where("vendedorAfiliadoId", "==", vIdClean);

  const snap = transaction ? await transaction.get(query) : await query.get();

  let efectivoPendienteRendicionCentavos = 0;
  const movimientos: LedgerCustodiaEfectivoMovimiento[] = [];

  snap.forEach((doc) => {
    const mov = doc.data() as LedgerCustodiaEfectivoMovimiento;
    movimientos.push(mov);
    efectivoPendienteRendicionCentavos += mov.montoCentavos;
  });

  movimientos.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

  return {
    vendedorAfiliadoId: vIdClean,
    efectivoPendienteRendicionCentavos,
    movimientos
  };
}

/**
 * Helper: Obtener Saldo Disponible para Liquidación
 * saldoDisponibleLiquidacionCentavos = max(0, saldoCuentaCorrienteCentavos - reservasConfirmadasPendientesCentavos)
 */
export async function obtenerSaldoDisponibleLiquidacion(
  db: admin.firestore.Firestore,
  vendedorAfiliadoId: string,
  transaction?: admin.firestore.Transaction
): Promise<number> {
  const vIdClean = vendedorAfiliadoId.trim();
  const cc = await obtenerCuentaCorrienteVendedor(db, vIdClean, transaction);
  
  // Reservas confirmadas pendientes: liquidaciones de este vendedor en estado "CONFIRMADA"
  const liqQuery = db.collection("liquidaciones_comision")
    .where("vendedorAfiliadoId", "==", vIdClean)
    .where("estado", "==", "CONFIRMADA");

  const snapLiq = transaction ? await transaction.get(liqQuery) : await liqQuery.get();
  
  let reservasConfirmadasPendientesCentavos = 0;
  snapLiq.forEach((doc) => {
    const liq = doc.data() as LiquidacionComision;
    reservasConfirmadasPendientesCentavos += liq.montoTotalLiquidadoCentavos;
  });

  const saldoDisponibleLiquidacionCentavos = Math.max(
    0,
    cc.saldoCuentaCorrienteCentavos - reservasConfirmadasPendientesCentavos
  );

  return saldoDisponibleLiquidacionCentavos;
}

/**
 * Helper: Construir Cola FIFO Dinámica de Fuentes de Comisión Elegibles
 * Retorna las fuentes positivas ordenadas por (createdAt ASC, id ASC) con su remanente disponible derivado.
 */
export async function construirFifoFuentesComision(
  db: admin.firestore.Firestore,
  vendedorAfiliadoId: string,
  transaction?: admin.firestore.Transaction
): Promise<{ fuente: LedgerComisionMovimiento; remanenteDisponibleCentavos: number }[]> {
  const vIdClean = vendedorAfiliadoId.trim();
  const cc = await obtenerCuentaCorrienteVendedor(db, vIdClean, transaction);

  // Filtrar fuentes positivas: DEVENGAMIENTO_PAGO (>0) o AJUSTE_ADMINISTRATIVO (>0)
  const fuentesPositivas = cc.movimientos.filter(
    (m) => (m.tipo === "DEVENGAMIENTO_PAGO" || m.tipo === "AJUSTE_ADMINISTRATIVO") && m.montoComisionCentavos > 0
  );

  // Ordenar por createdAt ASC, id ASC
  fuentesPositivas.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

  // Obtener todas las reversas vinculadas
  const reversas = cc.movimientos.filter((m) => m.tipo === "REVERSA_COMISION");

  // Obtener todos los items asignados en liquidaciones CONFIRMADAS o PAGADAS de este vendedor
  const liqQuery = db.collection("liquidaciones_comision").where("vendedorAfiliadoId", "==", vIdClean);
  const snapLiq = transaction ? await transaction.get(liqQuery) : await liqQuery.get();

  const liquidacionesConfirmadasOPagadasMap = new Map<string, EstadoLiquidacionComision>();
  snapLiq.forEach((doc) => {
    const l = doc.data() as LiquidacionComision;
    if (l.estado === "CONFIRMADA" || l.estado === "PAGADA") {
      liquidacionesConfirmadasOPagadasMap.set(l.id, l.estado);
    }
  });

  // Consultar la subcolección de items para las liquidaciones activas
  const asignacionesPorFuenteMap = new Map<string, number>();

  for (const liqId of Array.from(liquidacionesConfirmadasOPagadasMap.keys())) {
    const itemsRef = db.collection("liquidaciones_comision").doc(liqId).collection("items");
    const itemsSnap = transaction ? await transaction.get(itemsRef) : await itemsRef.get();
    itemsSnap.forEach((itemDoc) => {
      const item = itemDoc.data() as LiquidacionComisionItem;
      const prev = asignacionesPorFuenteMap.get(item.movimientoFuenteId) || 0;
      asignacionesPorFuenteMap.set(item.movimientoFuenteId, prev + item.montoAsignadoCentavos);
    });
  }

  const resultado: { fuente: LedgerComisionMovimiento; remanenteDisponibleCentavos: number }[] = [];

  for (const fuente of fuentesPositivas) {
    const montoOriginal = fuente.montoComisionCentavos;

    // Sumar reversas vinculadas directamente
    const reversasVinculadas = reversas
      .filter((r) => r.movimientoOriginalId === fuente.id)
      .reduce((sum, r) => sum + Math.abs(r.montoComisionCentavos), 0);

    // Sumar asignaciones activas
    const asignado = asignacionesPorFuenteMap.get(fuente.id) || 0;

    const remanente = Math.max(0, montoOriginal - reversasVinculadas - asignado);

    if (remanente > 0) {
      resultado.push({ fuente, remanenteDisponibleCentavos: remanente });
    }
  }

  return resultado;
}

/**
 * 1. Crear Borrador de Liquidación (BORRADOR)
 */
export async function crearBorradorLiquidacion(dbOrParams:unknown,paramsOrTx?:unknown,transactionParam?:admin.firestore.Transaction):Promise<Awaited<ReturnType<typeof _raw_crearBorradorLiquidacion>>>{
 const call=settlementInvocation<Parameters<typeof _raw_crearBorradorLiquidacion>[1]>(dbOrParams,paramsOrTx,transactionParam);
 return _raw_crearBorradorLiquidacion(call.db,call.params,call.transaction);
}

async function _raw_crearBorradorLiquidacion(
  db: admin.firestore.Firestore,
  params: {
    vendedorAfiliadoId: string;
    vendedorAfiliadoEmail: string;
    montoSolicitadoCentavos: number;
    periodoDesde?: string | null;
    periodoHasta?: string | null;
    creadoPorAdminUid: string;
    idempotencyKey: string;
  },
  transaction?: admin.firestore.Transaction
): Promise<LiquidacionComision> {
  if(!transaction)return db.runTransaction(tx=>_raw_crearBorradorLiquidacion(db,params,tx));
  if (!params.vendedorAfiliadoId || !params.vendedorAfiliadoId.trim()) {
    throw new Error("400:VENDEDOR_ID_REQUERIDO: Se requiere identificador de vendedor.");
  }
  const montoSolicitado = params.montoSolicitadoCentavos ?? (params as SettlementAliases).montoTotalLiquidadoCentavos;
  if (typeof montoSolicitado !== "number" || !Number.isInteger(montoSolicitado) || montoSolicitado <= 0) {
    throw new Error("400:MONTO_LIQUIDACION_INVALIDO: El monto solicitado debe ser un entero en centavos mayor a cero.");
  }
  if (!params.idempotencyKey || !params.idempotencyKey.trim()) {
    throw new Error("400:IDEMPOTENCY_KEY_REQUERIDO: Se requiere clave de idempotencia.");
  }

  const vIdClean = params.vendedorAfiliadoId.trim();
  const ikClean = params.idempotencyKey.trim();

  // Check idempotencia
  const existingSnap = await transaction.get(db.collection("liquidaciones_comision").where("idempotencyKey", "==", ikClean));

  if (!existingSnap.empty) {
    const existing=existingSnap.docs[0].data() as LiquidacionComision;
    if(existing.vendedorAfiliadoId!==vIdClean||existing.montoTotalLiquidadoCentavos!==montoSolicitado)throw Error("409:IDEMPOTENCY_CONFLICT");
    return existing;
  }

  const now = new Date().toISOString();
  const liqId = "borrador_" + ikClean;

  // Simular asignaciones proyectadas FIFO para estimar cantidadItems
  const fuentes = await construirFifoFuentesComision(db, vIdClean,transaction);
  const available=await obtenerSaldoDisponibleLiquidacion(db,vIdClean,transaction);if(montoSolicitado>available)throw Error("400:EXCESO_MONTO_LIQUIDABLE");
  let remanentePorLiquidacion = montoSolicitado;
  let cantidadItemsProyectados = 0;

  for (const f of fuentes) {
    if (remanentePorLiquidacion <= 0) break;
    const asignado = Math.min(remanentePorLiquidacion, f.remanenteDisponibleCentavos);
    remanentePorLiquidacion -= asignado;
    cantidadItemsProyectados++;
  }

  const payload: LiquidacionComision = {
    id: liqId,
    vendedorAfiliadoId: vIdClean,
    vendedorAfiliadoEmail: params.vendedorAfiliadoEmail.trim().toLowerCase(),
    estado: "BORRADOR",
    montoTotalLiquidadoCentavos: montoSolicitado,
    cantidadItems: cantidadItemsProyectados,
    periodoDesde: params.periodoDesde || null,
    periodoHasta: params.periodoHasta || null,
    creadoPorAdminUid: params.creadoPorAdminUid || (params as SettlementAliases).adminUid || "admin_system",
    idempotencyKey: ikClean,
    createdAt: now,
    updatedAt: now
  };

  transaction.create(db.collection("liquidaciones_comision").doc(liqId),payload);
  return payload;
}

async function prepareSettlementItems(db:admin.firestore.Firestore,transaction:admin.firestore.Transaction,liq:LiquidacionComision,fuentes:{fuente:LedgerComisionMovimiento;remanenteDisponibleCentavos:number}[],now:string):Promise<LiquidacionComisionItem[]>{
  let remanentePorAsignar = liq.montoTotalLiquidadoCentavos;
  const itemsGenerados: LiquidacionComisionItem[] = [];

  for (const f of fuentes) {
    if (remanentePorAsignar <= 0) break;

    const asignado = Math.min(remanentePorAsignar, f.remanenteDisponibleCentavos);
    remanentePorAsignar -= asignado;

    const itemId='item_'+createHash('sha256').update(JSON.stringify([liq.id,f.fuente.id])).digest('hex');

    // Intentar obtener metadatos de la solicitud si existen
    let clienteNombre: string | null = f.fuente.clienteNombre || null;
    let productoResumen: string | null = f.fuente.productoResumen || null;
    if (f.fuente.solicitudId && !clienteNombre && !productoResumen) {
      const solRef = db.collection("solicitudes").doc(f.fuente.solicitudId);
      const solSnap = await transaction.get(solRef);
      if (solSnap.exists) {
        const solData = solSnap.data() || {};
        clienteNombre = solData.clienteNombre || solData.datosPersonales?.nombreCompleto || null;
        productoResumen = solData.productoNombre || solData.productoResumen || null;
      }
    }

    const itemPayload: LiquidacionComisionItem = {
      id: itemId,
      liquidacionId: liq.id,
      vendedorAfiliadoId: liq.vendedorAfiliadoId,
      movimientoFuenteId: f.fuente.id,
      tipoMovimientoFuente: f.fuente.tipo,
      montoFuenteCentavos: f.fuente.montoComisionCentavos,
      montoAsignadoCentavos: asignado,
      ordenFifoCreatedAt: f.fuente.createdAt,
      ordenFifoId: f.fuente.id,
      solicitudId: f.fuente.solicitudId || null,
      clienteNombre,
      productoResumen,
      cuotaNumero: f.fuente.cuotaNumero || null,
      baseComisionableCentavos: f.fuente.baseComisionableCentavos || null,
      fechaCobroOriginal: f.fuente.createdAt,
      createdAt: now
    };

    itemsGenerados.push(itemPayload);
  }

  if(remanentePorAsignar>0)throw Error('400:COBERTURA_FIFO_INSUFICIENTE: No hay comisiones disponibles para cubrir el importe.');
  return itemsGenerados;
}

/**
 * 2. Confirmación Atómica de Liquidación (BORRADOR -> CONFIRMADA)
 */
export async function confirmarLiquidacion(dbOrParams:unknown,paramsOrTx?:unknown,transactionParam?:admin.firestore.Transaction):Promise<Awaited<ReturnType<typeof _raw_confirmarLiquidacion>>>{
 const call=settlementInvocation<Parameters<typeof _raw_confirmarLiquidacion>[1]>(dbOrParams,paramsOrTx,transactionParam);
 return _raw_confirmarLiquidacion(call.db,call.params,call.transaction);
}

async function _raw_confirmarLiquidacion(
  db: admin.firestore.Firestore,
  params: {
    liquidacionId: string;
    adminUid: string;
    idempotencyKey: string;
  },
  transaction?: admin.firestore.Transaction
): Promise<LiquidacionComision> {
  if (!transaction) {
    return db.runTransaction(async (tx) => {
      return confirmarLiquidacion(db, params, tx);
    });
  }

  const liqId = params.liquidacionId.trim();
  const adminUid = (params.adminUid || (params as SettlementAliases).confirmadoPorAdminUid || "admin_system").trim();
  const liqRef = db.collection("liquidaciones_comision").doc(liqId);
  const liqSnap = await transaction.get(liqRef);

  if (!liqSnap.exists) {
    throw new Error("404:LIQUIDACION_NO_ENCONTRADA: La liquidación no existe.");
  }

  const liq = liqSnap.data() as LiquidacionComision;

  if (liq.estado === "CONFIRMADA") {
    return liq; // Idempotente
  }

  if (liq.estado !== "BORRADOR") {
    throw new Error(`400:TRANSICION_ESTADO_INVALIDA: Solo una liquidación en estado BORRADOR puede ser confirmada (estado actual: ${liq.estado}).`);
  }

  // Recalcular saldo disponible en tiempo real dentro de la transacción
  const saldoDisponible = await obtenerSaldoDisponibleLiquidacion(db, liq.vendedorAfiliadoId, transaction);

  if (liq.montoTotalLiquidadoCentavos > saldoDisponible) {
    throw new Error(`400:EXCESO_MONTO_LIQUIDABLE: El monto de la liquidación (${liq.montoTotalLiquidadoCentavos} centavos) supera el saldo disponible actual (${saldoDisponible} centavos).`);
  }

  // Recalcular FIFO y crear items definitivos atómicamente
  const fuentes = await construirFifoFuentesComision(db, liq.vendedorAfiliadoId, transaction);

  const now=new Date().toISOString(),itemsGenerados=await prepareSettlementItems(db,transaction,liq,fuentes,now);
  for(const item of itemsGenerados)transaction.set(liqRef.collection('items').doc(item.id),item);

  const updatedPayload: Partial<LiquidacionComision> = {
    estado: "CONFIRMADA",
    cantidadItems: itemsGenerados.length,
    confirmadoPorAdminUid: adminUid,
    fechaConfirmacion: now,
    updatedAt: now
  };

  transaction.update(liqRef, updatedPayload);

  return { ...liq, ...updatedPayload };
}

/**
 * 3. Evaluador de Incidencias en Liquidación CONFIRMADA
 */
export async function evaluarIncidenciasLiquidacion(
  db: admin.firestore.Firestore,
  liquidacionId: string,
  transaction?: admin.firestore.Transaction
): Promise<{ tieneIncidenciasPendientes: boolean; detalles: string[] }> {
  const liqId = liquidacionId.trim();
  const liqRef = db.collection("liquidaciones_comision").doc(liqId);
  const liqSnap = transaction ? await transaction.get(liqRef) : await liqRef.get();

  if (!liqSnap.exists) {
    throw new Error("404:LIQUIDACION_NO_ENCONTRADA: La liquidación no existe.");
  }

  const liq = liqSnap.data() as LiquidacionComision;
  const detalles: string[] = [];

  if (liq.estado !== "CONFIRMADA") {
    return { tieneIncidenciasPendientes: false, detalles: [] };
  }

  // 1. Verificar si el saldo de cuenta corriente es menor al monto de la liquidación o insuficiente para cubrir las reservas confirmadas
  const cc = await obtenerCuentaCorrienteVendedor(db, liq.vendedorAfiliadoId, transaction);

  const liqQuery = db.collection("liquidaciones_comision")
    .where("vendedorAfiliadoId", "==", liq.vendedorAfiliadoId)
    .where("estado", "==", "CONFIRMADA");
  const snapLiq = transaction ? await transaction.get(liqQuery) : await liqQuery.get();

  let reservasConfirmadasPendientesCentavos = 0;
  snapLiq.forEach((doc) => {
    const l = doc.data() as LiquidacionComision;
    reservasConfirmadasPendientesCentavos += l.montoTotalLiquidadoCentavos;
  });

  if (cc.saldoCuentaCorrienteCentavos < reservasConfirmadasPendientesCentavos) {
    detalles.push(
      `El saldo de cuenta corriente actual (${cc.saldoCuentaCorrienteCentavos} centavos) es insuficiente para cubrir las liquidaciones confirmadas pendientes (${reservasConfirmadasPendientesCentavos} centavos).`
    );
  }

  // 2. Verificar cada ítem de la liquidación contra reversas sobrevenidas
  const itemsRef = liqRef.collection("items");
  const itemsSnap = transaction ? await transaction.get(itemsRef) : await itemsRef.get();

  const reversas = cc.movimientos.filter((m) => m.tipo === "REVERSA_COMISION");

  itemsSnap.forEach((doc) => {
    const item = doc.data() as LiquidacionComisionItem;
    const reversasVinculadas = reversas
      .filter((r) => r.movimientoOriginalId === item.movimientoFuenteId)
      .reduce((sum, r) => sum + Math.abs(r.montoComisionCentavos), 0);

    if (reversasVinculadas > 0) {
      const remanenteFuente = Math.max(0, item.montoFuenteCentavos - reversasVinculadas);
      if (remanenteFuente < item.montoAsignadoCentavos) {
        detalles.push(`La fuente ${item.movimientoFuenteId} sufrió una reversa de ${reversasVinculadas} centavos, dejando insuficiente el monto asignado (${item.montoAsignadoCentavos} centavos).`);
      }
    }
  });

  return {
    tieneIncidenciasPendientes: detalles.length > 0,
    detalles
  };
}

/**
 * 4. Anulación de Liquidación (CONFIRMADA -> ANULADA)
 */
export async function anularLiquidacion(dbOrParams:unknown,paramsOrTx?:unknown,transactionParam?:admin.firestore.Transaction):Promise<Awaited<ReturnType<typeof _raw_anularLiquidacion>>>{
 const call=settlementInvocation<Parameters<typeof _raw_anularLiquidacion>[1]>(dbOrParams,paramsOrTx,transactionParam);
 return _raw_anularLiquidacion(call.db,call.params,call.transaction);
}

async function _raw_anularLiquidacion(
  db: admin.firestore.Firestore,
  params: {
    liquidacionId: string;
    motivoAnulacion: string;
    adminUid: string;
    idempotencyKey: string;
  },
  transaction?: admin.firestore.Transaction
): Promise<LiquidacionComision> {
  if (!transaction) {
    return db.runTransaction(async (tx) => {
      return anularLiquidacion(db, params, tx);
    });
  }

  if (!params.motivoAnulacion || !params.motivoAnulacion.trim()) {
    throw new Error("400:MOTIVO_ANULACION_REQUERIDO: Se requiere motivo no vacío para anular la liquidación.");
  }

  const liqId = params.liquidacionId.trim();
  const adminUid = (params.adminUid || (params as SettlementAliases).anuladoPorAdminUid || "admin_system").trim();
  const liqRef = db.collection("liquidaciones_comision").doc(liqId);
  const liqSnap = await transaction.get(liqRef);

  if (!liqSnap.exists) {
    throw new Error("404:LIQUIDACION_NO_ENCONTRADA: La liquidación no existe.");
  }

  const liq = liqSnap.data() as LiquidacionComision;

  if (liq.estado === "ANULADA") {
    return liq; // Idempotente
  }

  if (liq.estado !== "CONFIRMADA") {
    throw new Error(`400:TRANSICION_ESTADO_INVALIDA: Solo una liquidación en estado CONFIRMADA puede ser anulada (estado actual: ${liq.estado}).`);
  }

  const now = new Date().toISOString();
  const updatePayload: Partial<LiquidacionComision> = {
    estado: "ANULADA",
    anuladoPorAdminUid: adminUid,
    fechaAnulacion: now,
    motivoAnulacion: params.motivoAnulacion.trim(),
    updatedAt: now
  };

  transaction.update(liqRef, updatePayload);

  return { ...liq, ...updatePayload };
}

/**
 * 5. Pago de Liquidación (CONFIRMADA -> PAGADA)
 */
export async function pagarLiquidacion(dbOrParams:unknown,paramsOrTx?:unknown,transactionParam?:admin.firestore.Transaction):Promise<Awaited<ReturnType<typeof _raw_pagarLiquidacion>>>{
 const call=settlementInvocation<Parameters<typeof _raw_pagarLiquidacion>[1]>(dbOrParams,paramsOrTx,transactionParam);
 return _raw_pagarLiquidacion(call.db,call.params,call.transaction);
}

async function _raw_pagarLiquidacion(
  db: admin.firestore.Firestore,
  params: {
    liquidacionId: string;
    componentesPago: ComponentePagoLiquidacion[];
    adminUid: string;
    idempotencyKey: string;
  },
  transaction?: admin.firestore.Transaction
): Promise<LiquidacionComision> {
  if (!transaction) {
    return db.runTransaction(async (tx) => {
      return pagarLiquidacion(db, params, tx);
    });
  }

  if (!params.componentesPago || !Array.isArray(params.componentesPago) || params.componentesPago.length === 0) {
    throw new Error("400:COMPONENTES_PAGO_REQUERIDOS: Debe proporcionar al menos un componente de pago.");
  }
  const FORMAS_PAGO_VALIDAS = new Set(["TRANSFERENCIA", "EFECTIVO_EN_MANO", "COMPENSACION_EFECTIVO_EN_PODER", "CHEQUE"]);
  for (const c of params.componentesPago) {
    if (!Number.isSafeInteger(c.montoCentavos)||c.montoCentavos<=0||!FORMAS_PAGO_VALIDAS.has(c.formaPago)) {
      throw new Error("400:COMPONENTE_PAGO_INVALIDO: Forma de pago no admitida.");
    }
  }
  if (!params.idempotencyKey || !params.idempotencyKey.trim()) {
    throw new Error("400:IDEMPOTENCY_KEY_REQUERIDO: Se requiere clave de idempotencia.");
  }

  const liqId = params.liquidacionId.trim();
  const adminUid = (params.adminUid || (params as SettlementAliases).pagadoPorAdminUid || "admin_system").trim();
  const ikClean = (params.idempotencyKey || ("pago_" + liqId)).trim();
  const liqRef = db.collection("liquidaciones_comision").doc(liqId);
  const liqSnap = await transaction.get(liqRef);

  if (!liqSnap.exists) {
    throw new Error("404:LIQUIDACION_NO_ENCONTRADA: La liquidación no existe.");
  }

  const liq = liqSnap.data() as LiquidacionComision;

  if (liq.estado === "PAGADA") {
    return liq; // Idempotente
  }

  if (liq.estado !== "CONFIRMADA") {
    throw new Error(`400:TRANSICION_ESTADO_INVALIDA: Solo una liquidación en estado CONFIRMADA puede ser pagada (estado actual: ${liq.estado}).`);
  }

  // Validar incidencias pendientes
  const evaluacion = await evaluarIncidenciasLiquidacion(db, liqId, transaction);
  if (evaluacion.tieneIncidenciasPendientes) {
    throw new Error(`409:LIQUIDACION_CON_INCIDENCIAS: La liquidación posee incidencias sobrevenidas y no puede ser pagada. Motivos: ${evaluacion.detalles.join(" | ")}`);
  }

  // Validar suma de componentes de pago
  const sumaComponentes = params.componentesPago.reduce((sum, c) => sum + c.montoCentavos, 0);
  if (sumaComponentes !== liq.montoTotalLiquidadoCentavos) {
    throw new Error(`400:SUMA_COMPONENTES_DESIGUAL_AL_TOTAL: La suma de componentes de pago (${sumaComponentes} centavos) no coincide con el total de la liquidación (${liq.montoTotalLiquidadoCentavos} centavos).`);
  }

  // Validar compensación de efectivo
  const montoCompensacion = params.componentesPago
    .filter((c) => c.formaPago === "COMPENSACION_EFECTIVO_EN_PODER")
    .reduce((sum, c) => sum + c.montoCentavos, 0);

  if (montoCompensacion > 0) {
    const custodia = await obtenerLedgerCustodiaEfectivo(db, liq.vendedorAfiliadoId, transaction);
    if (montoCompensacion > custodia.efectivoPendienteRendicionCentavos) {
      throw new Error(`400:EXCESO_COMPENSACION_EFECTIVO: El monto de compensación (${montoCompensacion} centavos) supera el efectivo pendiente bajo custodia (${custodia.efectivoPendienteRendicionCentavos} centavos).`);
    }
  }

  // Derivar tipoPagoConsolidado
  const tieneTransferencia = params.componentesPago.some((c) => c.formaPago === "TRANSFERENCIA");
  const tieneCompensacion = params.componentesPago.some((c) => c.formaPago === "COMPENSACION_EFECTIVO_EN_PODER");
  let tipoPagoConsolidado: TipoPagoConsolidado = "TRANSFERENCIA";
  if (params.componentesPago.every(c=>c.formaPago==='EFECTIVO_EN_MANO')) {
    tipoPagoConsolidado = "EFECTIVO_EN_MANO";
  } else if (tieneTransferencia && tieneCompensacion) {
    tipoPagoConsolidado = "MIXTO";
  } else if (tieneCompensacion) {
    tipoPagoConsolidado = "COMPENSACION_EFECTIVO_EN_PODER";
  }

  const now = new Date().toISOString();

  return writePaidSettlement(db,transaction,liq,{...params,adminUid,idempotencyKey:ikClean,recordedBy:params.adminUid||(params as SettlementAliases).registradoPorAdminUid||(params as SettlementAliases).adminEmail||"admin_system"},montoCompensacion,tipoPagoConsolidado,now);
}

function writePaidSettlement(db:admin.firestore.Firestore,transaction:admin.firestore.Transaction,liq:LiquidacionComision,params:{componentesPago:ComponentePagoLiquidacion[];adminUid:string;idempotencyKey:string;recordedBy?:string},montoCompensacion:number,tipoPagoConsolidado:TipoPagoConsolidado,now:string,remittanceId?:string){
  const liqId=liq.id,liqRef=db.collection('liquidaciones_comision').doc(liqId),adminUid=params.adminUid.trim(),ikClean=params.idempotencyKey;
  // 1. Emitir movimiento PAGO_LIQUIDACION en ledger_comisiones_movimientos
  const movComisionId=remittanceId?'remit_comm_'+remittanceId:'mov_com_pago_'+Date.now()+'_'+Math.random().toString(36).substring(2,7);
  const movComisionPayload: LedgerComisionMovimiento = {
    id: movComisionId,
    solicitudId: "",
    vendedorAfiliadoId: liq.vendedorAfiliadoId,
    vendedorAfiliadoEmail: liq.vendedorAfiliadoEmail,
    tipo: "PAGO_LIQUIDACION",
    montoComisionCentavos: -liq.montoTotalLiquidadoCentavos,
    moneda: "ARS",
    porcentajeAplicadoBasisPoints: 0,
    baseComisionableCentavos: liq.montoTotalLiquidadoCentavos,
    commissionSchemaVersion: "COMMISSION_V1",
    idempotencyKey: ikClean + "_ledger",
    registradoPor: params.recordedBy??params.adminUid,
    motivo: `Pago de liquidación ${liqId}`,
    createdAt: now
  };
  if(remittanceId)transaction.create(db.collection("ledger_comisiones_movimientos").doc(movComisionId),{...movComisionPayload,rendicionId:remittanceId});else transaction.set(db.collection("ledger_comisiones_movimientos").doc(movComisionId),movComisionPayload);

  // 2. Si hubo compensación, emitir movimiento COMPENSACION_COMISION en ledger_custodia_efectivo
  if (montoCompensacion > 0) {
    const movCustodiaId=remittanceId?'remit_offset_'+remittanceId:'mov_cust_comp_'+Date.now()+'_'+Math.random().toString(36).substring(2,7);
    const movCustodiaPayload: LedgerCustodiaEfectivoMovimiento = {
      id: movCustodiaId,
      vendedorAfiliadoId: liq.vendedorAfiliadoId,
      tipo: "COMPENSACION_COMISION",
      montoCentavos: -montoCompensacion, // Convenio: negativo reduce la custodia
      moneda: "ARS",
      liquidacionId: liqId,
      motivo: `Compensación de comisión en liquidación ${liqId}`,
      registradoPorUid: params.adminUid,
      idempotencyKey: ikClean + "_custodia",
      createdAt: now
    };
    if(remittanceId)transaction.create(db.collection("ledger_custodia_efectivo").doc(movCustodiaId),{...movCustodiaPayload,rendicionId:remittanceId});else transaction.set(db.collection("ledger_custodia_efectivo").doc(movCustodiaId),movCustodiaPayload);
  }

  // 3. Actualizar liquidación a PAGADA
  const updatePayload: Partial<LiquidacionComision> = {
    estado: "PAGADA",
    componentesPago: params.componentesPago,
    tipoPagoConsolidado,
    pagadoPorAdminUid: adminUid,
    fechaPago: now,
    updatedAt: now
  };

  if(remittanceId)transaction.create(liqRef,{...liq,...updatePayload,rendicionId:remittanceId});else transaction.update(liqRef,updatePayload);

  return { ...liq, ...updatePayload };
}

/**
 * 6. Ajuste Administrativo de Comisiones (ledger_comisiones_movimientos)
 */
export async function registrarAjusteAdministrativoComisiones(dbOrParams:unknown,paramsOrTx?:unknown,transactionParam?:admin.firestore.Transaction):Promise<Awaited<ReturnType<typeof _raw_registrarAjusteAdministrativoComisiones>>>{
 const call=settlementInvocation<Parameters<typeof _raw_registrarAjusteAdministrativoComisiones>[1]>(dbOrParams,paramsOrTx,transactionParam);
 return _raw_registrarAjusteAdministrativoComisiones(call.db,call.params,call.transaction);
}

async function _raw_registrarAjusteAdministrativoComisiones(
  db: admin.firestore.Firestore,
  params: {
    vendedorAfiliadoId: string;
    vendedorAfiliadoEmail: string;
    montoComisionCentavos: number;
    motivo: string;
    adminUid: string;
    idempotencyKey: string;
  },
  transaction?: admin.firestore.Transaction
): Promise<LedgerComisionMovimiento> {
  if (!transaction) {
    return db.runTransaction(async (tx) => {
      return registrarAjusteAdministrativoComisiones(db, params, tx);
    });
  }

  if (!params.vendedorAfiliadoId || !params.vendedorAfiliadoId.trim()) {
    throw new Error("400:VENDEDOR_ID_REQUERIDO: Se requiere identificador de vendedor.");
  }
  if (typeof params.montoComisionCentavos !== "number" || params.montoComisionCentavos === 0) {
    throw new Error("400:MONTO_AJUSTE_INVALIDO: El monto de ajuste debe ser distinto de cero.");
  }
  if (!params.motivo || !params.motivo.trim()) {
    throw new Error("400:MOTIVO_REQUERIDO: Se requiere motivo explícito para el ajuste administrativo.");
  }
  if (!params.idempotencyKey || !params.idempotencyKey.trim()) {
    throw new Error("400:IDEMPOTENCY_KEY_REQUERIDO: Se requiere clave de idempotencia.");
  }

  const vIdClean = params.vendedorAfiliadoId.trim();
  const ikClean = params.idempotencyKey.trim();

  // Check idempotencia
  const existingSnap = await transaction.get(
    db.collection("ledger_comisiones_movimientos").where("idempotencyKey", "==", ikClean)
  );

  if (!existingSnap.empty) {
    return existingSnap.docs[0].data() as LedgerComisionMovimiento;
  }

  const now = new Date().toISOString();
  const movId = "mov_com_ajuste_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

  const payload: LedgerComisionMovimiento = {
    id: movId,
    solicitudId: "",
    vendedorAfiliadoId: vIdClean,
    vendedorAfiliadoEmail: params.vendedorAfiliadoEmail.trim().toLowerCase(),
    tipo: "AJUSTE_ADMINISTRATIVO",
    montoComisionCentavos: params.montoComisionCentavos,
    moneda: "ARS",
    porcentajeAplicadoBasisPoints: 0,
    baseComisionableCentavos: Math.abs(params.montoComisionCentavos),
    commissionSchemaVersion: "COMMISSION_V1",
    idempotencyKey: ikClean,
    registradoPor: params.adminUid || (params as SettlementAliases).registradoPorAdminUid || (params as SettlementAliases).adminEmail || "admin_system",
    motivo: params.motivo.trim(),
    createdAt: now
  };

  transaction.set(db.collection("ledger_comisiones_movimientos").doc(movId), payload);
  return payload;
}

/**
 * 7. Rendición de Efectivo de Vendedor (rendiciones_efectivo & ledger_custodia_efectivo)
 */
export async function registrarRendicionEfectivo(dbOrParams:unknown,paramsOrTx?:unknown,transactionParam?:admin.firestore.Transaction):Promise<Awaited<ReturnType<typeof _raw_registrarRendicionEfectivo>>>{
 const call=settlementInvocation<Parameters<typeof _raw_registrarRendicionEfectivo>[1]>(dbOrParams,paramsOrTx,transactionParam);
 return _raw_registrarRendicionEfectivo(call.db,call.params,call.transaction);
}

async function _raw_registrarRendicionEfectivo(
  db: admin.firestore.Firestore,
  params: {
    vendedorAfiliadoId: string;
    vendedorAfiliadoEmail: string;
    montoRendidoCentavos: number;
    metodoEntrega: string;
    observaciones?: string | null;
    comprobanteReferencia?: string | null;
    adminUid: string;
    idempotencyKey: string;
  },
  transaction?: admin.firestore.Transaction
): Promise<RendicionEfectivo> {
  if (!transaction) {
    return db.runTransaction(async (tx) => {
      return registrarRendicionEfectivo(db, params, tx);
    });
  }

  if (!params.vendedorAfiliadoId || !params.vendedorAfiliadoId.trim()) {
    throw new Error("400:VENDEDOR_ID_REQUERIDO: Se requiere identificador de vendedor.");
  }
  if (!Number.isSafeInteger(params.montoRendidoCentavos) || params.montoRendidoCentavos <= 0) {
    throw new Error("400:MONTO_RENDICION_INVALIDO: El monto de rendición debe ser mayor a cero.");
  }
  if (!params.idempotencyKey || !params.idempotencyKey.trim()) {
    throw new Error("400:IDEMPOTENCY_KEY_REQUERIDO: Se requiere clave de idempotencia.");
  }

  const vIdClean = params.vendedorAfiliadoId.trim();
  const ikClean = params.idempotencyKey.trim();

  // Check idempotencia
  const existingSnap = await transaction.get(
    db.collection("rendiciones_efectivo").where("idempotencyKey", "==", ikClean)
  );
  if (!existingSnap.empty) {
    return existingSnap.docs[0].data() as RendicionEfectivo;
  }

  // Validar efectivo pendiente actual
  const custodia = await obtenerLedgerCustodiaEfectivo(db, vIdClean, transaction);
  if (params.montoRendidoCentavos > custodia.efectivoPendienteRendicionCentavos) {
    throw new Error(`400:EXCESO_RENDICION_EFECTIVO: El monto de rendición (${params.montoRendidoCentavos} centavos) supera el efectivo pendiente bajo custodia (${custodia.efectivoPendienteRendicionCentavos} centavos).`);
  }

  return writeCashRemittance(db,transaction,{...params,vendedorAfiliadoId:vIdClean,idempotencyKey:ikClean},new Date().toISOString());
}

type CashRemittanceInput={vendedorAfiliadoId:string;vendedorAfiliadoEmail:string;montoRendidoCentavos:number;metodoEntrega:string;observaciones?:string|null;comprobanteReferencia?:string|null;adminUid:string;idempotencyKey:string};
/** Shared cash writer; the caller has completed balance/commission reads. */
function writeCashRemittance(db:admin.firestore.Firestore,transaction:admin.firestore.Transaction,params:CashRemittanceInput,now:string,stableId?:string):RendicionEfectivo{
  const rendicionId=stableId??'rend_'+Date.now()+'_'+Math.random().toString(36).substring(2,7);
  const movCustodiaId=stableId?'remit_cash_'+stableId:'mov_cust_rend_'+Date.now()+'_'+Math.random().toString(36).substring(2,7);

  // Movement in ledger_custodia_efectivo
  const movCustodiaPayload: LedgerCustodiaEfectivoMovimiento = {
    id: movCustodiaId,
    vendedorAfiliadoId: params.vendedorAfiliadoId,
    tipo: "RENDICION_EFECTIVO",
    montoCentavos: -params.montoRendidoCentavos, // Convenio: negativo reduce custodia
    moneda: "ARS",
    rendicionId,
    motivo: `Rendición de efectivo ${rendicionId}`,
    registradoPorUid: params.adminUid,
    idempotencyKey: params.idempotencyKey + "_custodia",
    createdAt: now
  };
  if(stableId)transaction.create(db.collection("ledger_custodia_efectivo").doc(movCustodiaId),movCustodiaPayload);else transaction.set(db.collection("ledger_custodia_efectivo").doc(movCustodiaId),movCustodiaPayload);

  // Document in rendiciones_efectivo
  const rendicionPayload: RendicionEfectivo = {
    id: rendicionId,
    vendedorAfiliadoId: params.vendedorAfiliadoId,
    vendedorAfiliadoEmail: params.vendedorAfiliadoEmail.trim().toLowerCase(),
    montoRendidoCentavos: params.montoRendidoCentavos,
    metodoEntrega: params.metodoEntrega,
    observaciones: params.observaciones || null,
    comprobanteReferencia: params.comprobanteReferencia || null,
    confirmadoPorAdminUid: params.adminUid,
    ledgerCustodiaMovimientoId: movCustodiaId,
    idempotencyKey: params.idempotencyKey,
    createdAt: now
  };
  if(!stableId)transaction.set(db.collection("rendiciones_efectivo").doc(rendicionId),rendicionPayload);

  return rendicionPayload;
}

type CommissionSource={fuente:LedgerComisionMovimiento;remanenteDisponibleCentavos:number};
/** Explicit new selections take precedence; older unallocated debits consume the remaining cash pool FIFO. */
async function readRemittanceContext(db:admin.firestore.Firestore,tx:admin.firestore.Transaction,vendorId:string){
 const cash=await obtenerLedgerCustodiaEfectivo(db,vendorId,tx),account=await obtenerCuentaCorrienteVendedor(db,vendorId,tx),available=await obtenerSaldoDisponibleLiquidacion(db,vendorId,tx),allSources=await construirFifoFuentesComision(db,vendorId,tx);
 if(cash.movimientos.some(m=>!Number.isSafeInteger(m.montoCentavos)||m.moneda!=='ARS'||typeof m.id!=='string'||typeof m.createdAt!=='string'||!Number.isFinite(Date.parse(m.createdAt)))||!Number.isSafeInteger(cash.efectivoPendienteRendicionCentavos)||cash.efectivoPendienteRendicionCentavos<0||!Number.isSafeInteger(available)||available<0||allSources.some(s=>!Number.isSafeInteger(s.remanenteDisponibleCentavos)||s.remanenteDisponibleCentavos<=0||s.fuente.moneda!=='ARS'))throw Error('409:CUENTA_INCONSISTENTE: Revisá el libro de efectivo y comisiones antes de rendir.');
 const positive=cash.movimientos.filter(m=>m.montoCentavos>0),remaining=new Map(positive.map(m=>[m.id,m.montoCentavos])),negative=cash.movimientos.filter(m=>m.montoCentavos<0),groups=new Set<string>();
 const priorSelections:RemittanceCashAllocation[][]=[];
 for(const rId of new Set(negative.flatMap(m=>m.rendicionId?[m.rendicionId]:[]))){
  const r=(await tx.get(db.collection('rendiciones_efectivo').doc(rId))).data() as RendicionEfectivo|undefined;
  if(!r?.cobrosIncluidos)continue;
  if(!Array.isArray(r.cobrosIncluidos)||r.cashAllocationPolicy!==undefined&&r.cashAllocationPolicy!=='EXPLICIT_SELECTION_WITH_LEGACY_FIFO_V1')throw Error('409:RENDICION_ORIGEN_INCONSISTENTE');
  const debits=negative.filter(m=>m.rendicionId===rId),total=debits.reduce((sum,m)=>sum-m.montoCentavos,0),allocated=r.cobrosIncluidos.reduce((sum,a)=>sum+a.grossCents,0);
  if(r.vendedorAfiliadoId!==vendorId||r.schemaVersion!=='REMITTANCE_COMMISSION_OFFSET_V1'||!Number.isSafeInteger(total)||total!==r.montoCobrosRendidosCentavos||allocated!==total||r.cobrosIncluidos.reduce((sum,a)=>sum+a.commissionCents,0)!==r.comisionRetenidaCentavos||r.montoRendidoCentavos+(r.comisionRetenidaCentavos??0)!==total||new Set(r.cobrosIncluidos.map(a=>a.cashMovementId)).size!==r.cobrosIncluidos.length)throw Error('409:RENDICION_ORIGEN_INCONSISTENTE: Revisá las rendiciones anteriores.');
  for(const a of r.cobrosIncluidos){const before=remaining.get(a.cashMovementId);if(!Number.isSafeInteger(a.grossCents)||a.grossCents<=0||!Number.isSafeInteger(a.commissionCents)||a.commissionCents<0||a.commissionCents>a.grossCents||before===undefined||before<a.grossCents||a.paymentId!==(positive.find(m=>m.id===a.cashMovementId)?.ledgerMovimientoRelacionadoId??null))throw Error('409:COBRO_RENDIDO_INCONSISTENTE: Revisá el detalle de efectivo.');remaining.set(a.cashMovementId,before-a.grossCents);}
  groups.add(rId);priorSelections.push(r.cobrosIncluidos);
 }
 let oldDebits=negative.filter(m=>!m.rendicionId||!groups.has(m.rendicionId)).reduce((sum,m)=>sum-m.montoCentavos,0);
 if(!Number.isSafeInteger(oldDebits))throw Error('409:CUSTODIA_INCONSISTENTE');
 for(const m of positive){const n=Math.min(oldDebits,remaining.get(m.id)!);remaining.set(m.id,remaining.get(m.id)!-n);oldDebits-=n;}
 if(oldDebits||[...remaining.values()].reduce((sum,n)=>sum+n,0)!==cash.efectivoPendienteRendicionCentavos)throw Error('409:CUSTODIA_SIN_COBERTURA: Revisá el saldo de efectivo.');
 const sourcesByCollection=new Map<string,CommissionSource[]>(),options:CashCollectionOption[]=[],availableBySource=new Map(allSources.map(s=>[s.fuente.id,s.remanenteDisponibleCentavos]));
 for(const m of positive){
  const pending=remaining.get(m.id)!;if(!pending)continue;
  const raw=m as LedgerCustodiaEfectivoMovimiento&{budgetId?:string;budgetVersion?:number;operationId?:string};let payment:Record<string,unknown>|undefined;
  if(m.ledgerMovimientoRelacionadoId&&raw.budgetId&&Number.isSafeInteger(raw.budgetVersion)){const ref=operationRef(db,raw.budgetId,raw.budgetVersion!).parent.doc('financial'),financial=(await tx.get(ref)).data();payment=(await tx.get(ref.collection('payments').doc(m.ledgerMovimientoRelacionadoId))).data();if(payment&&(!financial||financial.operationId!==raw.operationId||m.solicitudId!==raw.operationId||payment.id!==m.ledgerMovimientoRelacionadoId||payment.amountCents!==m.montoCentavos||payment.method!=='EFECTIVO'||payment.reversedAt||!(payment.cashCustody as {affiliateId?:string}|undefined)?.affiliateId|| (payment.cashCustody as {affiliateId?:string}).affiliateId!==vendorId))payment=undefined;}
  else if(m.ledgerMovimientoRelacionadoId){payment=(await tx.get(db.collection('ledger_movimientos').doc(m.ledgerMovimientoRelacionadoId))).data();if(payment&&(payment.tipo!=='PAGO'||payment.solicitudId!==m.solicitudId||payment.montoRecibidoCentavos!==m.montoCentavos||payment.medioPago!=='EFECTIVO'||payment.estado!=='ACTIVO'||payment.monedaRecibida!=='ARS'||payment.monedaPlan&&payment.monedaPlan!=='ARS'))payment=undefined;}
  const duplicate=positive.filter(p=>p.ledgerMovimientoRelacionadoId&&p.ledgerMovimientoRelacionadoId===m.ledgerMovimientoRelacionadoId&&p.solicitudId===m.solicitudId).length>1;
  const accrued=account.movimientos.filter(c=>c.tipo==='DEVENGAMIENTO_PAGO'&&c.ledgerPagoMovimientoId===m.ledgerMovimientoRelacionadoId&&c.solicitudId===m.solicitudId);
  const verified=m.tipo==='COBRO_EFECTIVO_VENDEDOR'&&!!payment&&!duplicate&&accrued.length>0&&accrued.reduce((sum,c)=>sum+c.baseComisionableCentavos,0)===m.montoCentavos&&accrued.every(c=>Number.isSafeInteger(c.baseComisionableCentavos)&&c.baseComisionableCentavos>0&&c.montoComisionCentavos<=c.baseComisionableCentavos&&c.porcentajeAplicadoBasisPoints>=0&&c.porcentajeAplicadoBasisPoints<=10000);
  if(accrued.some(c=>!Number.isSafeInteger(c.montoComisionCentavos)||c.montoComisionCentavos<0||!Number.isSafeInteger(c.porcentajeAplicadoBasisPoints)||c.moneda!=='ARS'))throw Error('409:COMISION_ORIGEN_INCONSISTENTE');
  let linkedClient='';if(verified&&!raw.budgetId&&m.solicitudId){const source=(await tx.get(db.collection('solicitudes').doc(m.solicitudId))).data();linkedClient=String(source?.nombreCompleto||source?.clienteNombre||source?.nombre||'');}
  const sources=verified?accrued.flatMap(c=>{const eligible=Math.min(availableBySource.get(c.id)??0,c.montoComisionCentavos-Number(BigInt(c.montoComisionCentavos)*BigInt(m.montoCentavos-pending)/BigInt(m.montoCentavos)));return eligible>0?[{fuente:c,remanenteDisponibleCentavos:eligible}]:[];}):[];
  sourcesByCollection.set(m.id,sources);
  options.push({id:m.id,client:accrued.find(c=>c.clienteNombre)?.clienteNombre||linkedClient||'Cobro de cuota',date:typeof payment?.effectiveDate==='string'?payment.effectiveDate:typeof payment?.fechaEfectiva==='string'?payment.fechaEfectiva:m.createdAt,reference:String(payment?.reference||payment?.referenciaTransferencia||'Sin referencia'),originalCents:m.montoCentavos,remainingCents:pending,commissionCents:sources.reduce((sum,s)=>sum+s.remanenteDisponibleCentavos,0),percentages:[...new Set(accrued.map(c=>c.porcentajeAplicadoBasisPoints/100))],netEnabled:verified,warning:!verified?'El origen de este efectivo requiere revisión para descontar comisión.':!sources.length?'Este cobro no tiene comisión disponible: puede estar pagada, reservada o pendiente de conciliación.':null});
 }
 return {cash,available,allSources,sourcesByCollection,options,priorSelections};
}
export async function listRemittanceCollections(db:admin.firestore.Firestore,vendorId:string,cursor?:string){
 return db.runTransaction(async tx=>{const c=await readRemittanceContext(db,tx,vendorId),ordered=c.options.toSorted((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),rows=cursor?ordered.filter(r=>r.id>cursor):ordered;return {collections:rows.slice(0,50),nextCursor:rows.length>50?rows[49].id:null,cashBalanceCents:c.cash.efectivoPendienteRendicionCentavos,availableCommissionCents:c.available};});
}
async function prepareSelectedRemittance(db:admin.firestore.Firestore,tx:admin.firestore.Transaction,vendorId:string,input:RemittanceSelection){
 if(!Array.isArray(input.collectionIds)||!input.collectionIds.length||input.collectionIds.length>25||input.collectionIds.some(id=>typeof id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(id))||new Set(input.collectionIds).size!==input.collectionIds.length||typeof input.deductCommission!=='boolean')throw Error('400:SELECCION_REQUERIDA: Elegí hasta 25 cobros distintos para esta rendición.');
 const c=await readRemittanceContext(db,tx,vendorId),selected=c.options.filter(r=>input.collectionIds.includes(r.id));
 if(selected.length!==input.collectionIds.length)throw Error('409:COBRO_DESACTUALIZADO: Un cobro ya fue rendido o cambió. Actualizá la lista.');
 if(input.deductCommission&&selected.some(r=>!r.netEnabled))throw Error('409:COMISION_NO_VERIFICADA: Revisá el origen de los cobros seleccionados. No se estima un porcentaje.');
 const sources=input.deductCommission?selected.flatMap(r=>c.sourcesByCollection.get(r.id)!).toSorted((a,b)=>a.fuente.createdAt.localeCompare(b.fuente.createdAt)||a.fuente.id.localeCompare(b.fuente.id)):[];
 if(new Set(sources.map(s=>s.fuente.id)).size!==sources.length||sources.length>400)throw Error('409:COMISION_SIN_COBERTURA: Dividí la selección o revisá las fuentes de comisión.');
 const grossCents=selected.reduce((sum,r)=>sum+r.remainingCents,0),commissionRetainedCents=sources.reduce((sum,s)=>sum+s.remanenteDisponibleCentavos,0),receivedCents=grossCents-commissionRetainedCents;
 if(!Number.isSafeInteger(grossCents)||!Number.isSafeInteger(commissionRetainedCents)||receivedCents<=0||grossCents>c.cash.efectivoPendienteRendicionCentavos)throw Error('409:IMPORTES_INCONSISTENTES: Revisá los cobros incluidos.');
 if(input.deductCommission&&(commissionRetainedCents<=0||commissionRetainedCents>c.available))throw Error('409:COMISION_NO_DISPONIBLE: La comisión está pagada, reservada o afectada por recuperos. Revisá la cuenta antes de descontarla.');
 const summary={schemaVersion:'REMITTANCE_PREVIEW_V1' as const,collectionIds:[...input.collectionIds].sort(),deductCommission:input.deductCommission,receivedCents,commissionRetainedCents,grossCents,cashBalanceCents:c.cash.efectivoPendienteRendicionCentavos,availableCommissionCents:c.available,commissionSources:sources.map(s=>({id:s.fuente.id,amountCents:s.remanenteDisponibleCentavos,percentage:s.fuente.porcentajeAplicadoBasisPoints/100,client:s.fuente.clienteNombre||'Cobro de cuota',installment:s.fuente.cuotaNumero??null}))};
 const hash=createHash('sha256').update(stable({vendorId,summary,cash:c.cash.movimientos.map(m=>({id:m.id,amount:m.montoCentavos,type:m.tipo})),prior:c.priorSelections,sources:c.allSources.map(s=>({id:s.fuente.id,remaining:s.remanenteDisponibleCentavos,amount:s.fuente.montoComisionCentavos,percentage:s.fuente.porcentajeAplicadoBasisPoints}))})).digest('hex');
 const allocations:RemittanceCashAllocation[]=selected.map(r=>({cashMovementId:r.id,paymentId:c.cash.movimientos.find(m=>m.id===r.id)!.ledgerMovimientoRelacionadoId??null,grossCents:r.remainingCents,commissionCents:input.deductCommission?r.commissionCents:0}));
 return {preview:{...summary,hash} satisfies RemittancePreview,sources,allocations};
}
export async function previewSelectedCashRemittance(db:admin.firestore.Firestore,vendorId:string,input:RemittanceSelection):Promise<RemittancePreview>{return db.runTransaction(async tx=>(await prepareSelectedRemittance(db,tx,vendorId,input)).preview);}

/** The receipt, commission payment, source items and BOTH cash reductions commit together. */
export async function confirmReviewedCashRemittance(db:admin.firestore.Firestore,tx:admin.firestore.Transaction,params:Omit<CashRemittanceInput,'montoRendidoCentavos'>&RemittanceSelection&{previewHash:string}){
 const {preview,sources,allocations}=await prepareSelectedRemittance(db,tx,params.vendedorAfiliadoId,params);
 if(typeof params.previewHash!=='string'||params.previewHash!==preview.hash)throw Error('409:RENDICION_DESACTUALIZADA: La cuenta cambió. Actualizá y revisá los importes antes de confirmar.');
 const key=createHash('sha256').update(stable([params.vendedorAfiliadoId,params.idempotencyKey])).digest('hex'),id='rend_'+key,liqId='offset_'+key,now=new Date().toISOString();
 if((await tx.get(db.collection('rendiciones_efectivo').doc(id))).exists||(await tx.get(db.collection('liquidaciones_comision').doc(liqId))).exists)throw Error('409:RENDICION_EXISTENTE: Reintentá el mismo comando para consultar el resultado.');
 const liq:LiquidacionComision={id:liqId,vendedorAfiliadoId:params.vendedorAfiliadoId,vendedorAfiliadoEmail:params.vendedorAfiliadoEmail,estado:'CONFIRMADA',montoTotalLiquidadoCentavos:preview.commissionRetainedCents,cantidadItems:sources.length,creadoPorAdminUid:params.adminUid,confirmadoPorAdminUid:params.adminUid,fechaConfirmacion:now,idempotencyKey:params.idempotencyKey,createdAt:now,updatedAt:now};
 const items=preview.commissionRetainedCents>0?await prepareSettlementItems(db,tx,liq,sources,now):[];
 // Nothing below this point reads documents. No intermediate draft or reserved commission survives an abort.
 const received=writeCashRemittance(db,tx,{...params,montoRendidoCentavos:preview.receivedCents},now,id);
 if(preview.commissionRetainedCents>0){
  writePaidSettlement(db,tx,liq,{adminUid:params.adminUid,idempotencyKey:params.idempotencyKey,componentesPago:[{formaPago:'COMPENSACION_EFECTIVO_EN_PODER',montoCentavos:preview.commissionRetainedCents,referenciaBancaria:params.comprobanteReferencia||null,notas:'Comisión retenida al rendir cobros'}]},preview.commissionRetainedCents,'COMPENSACION_EFECTIVO_EN_PODER',now,id);
  for(const item of items)tx.create(db.collection('liquidaciones_comision').doc(liqId).collection('items').doc(item.id),item);
 }
 const result:RendicionEfectivo={...received,schemaVersion:'REMITTANCE_COMMISSION_OFFSET_V1',montoCobrosRendidosCentavos:preview.grossCents,comisionRetenidaCentavos:preview.commissionRetainedCents,liquidacionComisionId:preview.commissionRetainedCents>0?liqId:null,revisionPreviaHash:preview.hash,cobrosIncluidos:allocations,cashAllocationPolicy:'EXPLICIT_SELECTION_WITH_LEGACY_FIFO_V1'};
 tx.create(db.collection('rendiciones_efectivo').doc(id),result);
 return result;
}

/**
 * 8. Devolución Física a Cliente (ledger_custodia_efectivo)
 */
export async function registrarDevolucionFisicaCliente(dbOrParams:unknown,paramsOrTx?:unknown,transactionParam?:admin.firestore.Transaction):Promise<Awaited<ReturnType<typeof _raw_registrarDevolucionFisicaCliente>>>{
 const call=settlementInvocation<Parameters<typeof _raw_registrarDevolucionFisicaCliente>[1]>(dbOrParams,paramsOrTx,transactionParam);
 return _raw_registrarDevolucionFisicaCliente(call.db,call.params,call.transaction);
}

async function _raw_registrarDevolucionFisicaCliente(
  db: admin.firestore.Firestore,
  params: {
    vendedorAfiliadoId: string;
    solicitudId?: string | null;
    montoCentavos: number;
    motivo: string;
    adminUid: string;
    idempotencyKey: string;
  },
  transaction?: admin.firestore.Transaction
): Promise<LedgerCustodiaEfectivoMovimiento> {
  if (!transaction) {
    return db.runTransaction(async (tx) => {
      return registrarDevolucionFisicaCliente(db, params, tx);
    });
  }

  if (!params.vendedorAfiliadoId || !params.vendedorAfiliadoId.trim()) {
    throw new Error("400:VENDEDOR_ID_REQUERIDO: Se requiere identificador de vendedor.");
  }
  if (typeof params.montoCentavos !== "number" || params.montoCentavos <= 0) {
    throw new Error("400:MONTO_DEVOLUCION_INVALIDO: El monto de devolución debe ser mayor a cero.");
  }
  if (!params.motivo || !params.motivo.trim()) {
    throw new Error("400:MOTIVO_REQUERIDO: Se requiere motivo de devolución.");
  }
  if (!params.idempotencyKey || !params.idempotencyKey.trim()) {
    throw new Error("400:IDEMPOTENCY_KEY_REQUERIDO: Se requiere clave de idempotencia.");
  }

  const vIdClean = params.vendedorAfiliadoId.trim();
  const ikClean = params.idempotencyKey.trim();

  // Check idempotencia
  const existingSnap = await transaction.get(
    db.collection("ledger_custodia_efectivo").where("idempotencyKey", "==", ikClean)
  );
  if (!existingSnap.empty) {
    return existingSnap.docs[0].data() as LedgerCustodiaEfectivoMovimiento;
  }

  // Validar efectivo disponible
  const custodia = await obtenerLedgerCustodiaEfectivo(db, vIdClean, transaction);
  if (params.montoCentavos > custodia.efectivoPendienteRendicionCentavos) {
    throw new Error(`400:EXCESO_DEVOLUCION_EFECTIVO: El monto a devolver (${params.montoCentavos} centavos) supera el efectivo pendiente bajo custodia (${custodia.efectivoPendienteRendicionCentavos} centavos).`);
  }

  const now = new Date().toISOString();
  const movId = "mov_cust_dev_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

  const payload: LedgerCustodiaEfectivoMovimiento = {
    id: movId,
    vendedorAfiliadoId: vIdClean,
    tipo: "DEVOLUCION_EFECTIVO_CLIENTE",
    montoCentavos: -params.montoCentavos, // Convenio: negativo reduce custodia
    moneda: "ARS",
    solicitudId: params.solicitudId || null,
    motivo: params.motivo.trim(),
    registradoPorUid: params.adminUid,
    idempotencyKey: ikClean,
    createdAt: now
  };

  transaction.set(db.collection("ledger_custodia_efectivo").doc(movId), payload);
  return payload;
}

/**
 * 9. Ajuste Excepcional de Custodia de Efectivo (ledger_custodia_efectivo)
 */
export async function registrarAjusteCustodiaEfectivo(dbOrParams:unknown,paramsOrTx?:unknown,transactionParam?:admin.firestore.Transaction):Promise<Awaited<ReturnType<typeof _raw_registrarAjusteCustodiaEfectivo>>>{
 const call=settlementInvocation<Parameters<typeof _raw_registrarAjusteCustodiaEfectivo>[1]>(dbOrParams,paramsOrTx,transactionParam);
 return _raw_registrarAjusteCustodiaEfectivo(call.db,call.params,call.transaction);
}

async function _raw_registrarAjusteCustodiaEfectivo(
  db: admin.firestore.Firestore,
  params: {
    vendedorAfiliadoId: string;
    montoCentavos: number;
    motivo: string;
    adminUid: string;
    idempotencyKey: string;
  },
  transaction?: admin.firestore.Transaction
): Promise<LedgerCustodiaEfectivoMovimiento> {
  if (!transaction) {
    return db.runTransaction(async (tx) => {
      return registrarAjusteCustodiaEfectivo(db, params, tx);
    });
  }

  if (!params.vendedorAfiliadoId || !params.vendedorAfiliadoId.trim()) {
    throw new Error("400:VENDEDOR_ID_REQUERIDO: Se requiere identificador de vendedor.");
  }
  if (typeof params.montoCentavos !== "number" || params.montoCentavos === 0) {
    throw new Error("400:MONTO_AJUSTE_INVALIDO: El monto de ajuste debe ser distinto de cero.");
  }
  if (!params.motivo || !params.motivo.trim()) {
    throw new Error("400:MOTIVO_REQUERIDO: Se requiere motivo explícito para el ajuste de custodia.");
  }
  if (!params.idempotencyKey || !params.idempotencyKey.trim()) {
    throw new Error("400:IDEMPOTENCY_KEY_REQUERIDO: Se requiere clave de idempotencia.");
  }

  const vIdClean = params.vendedorAfiliadoId.trim();
  const ikClean = params.idempotencyKey.trim();

  // Check idempotencia
  const existingSnap = await transaction.get(
    db.collection("ledger_custodia_efectivo").where("idempotencyKey", "==", ikClean)
  );
  if (!existingSnap.empty) {
    return existingSnap.docs[0].data() as LedgerCustodiaEfectivoMovimiento;
  }

  // Si el ajuste es negativo, validar que no deje el efectivo en poder por debajo de cero
  if (params.montoCentavos < 0) {
    const custodia = await obtenerLedgerCustodiaEfectivo(db, vIdClean, transaction);
    if (Math.abs(params.montoCentavos) > custodia.efectivoPendienteRendicionCentavos) {
      throw new Error(`400:EXCESO_AJUSTE_CUSTODIA_EFECTIVO: El ajuste negativo de custodia (${Math.abs(params.montoCentavos)} centavos) supera el efectivo pendiente actual (${custodia.efectivoPendienteRendicionCentavos} centavos).`);
    }
  }

  const now = new Date().toISOString();
  const movId = "mov_cust_ajuste_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

  const payload: LedgerCustodiaEfectivoMovimiento = {
    id: movId,
    vendedorAfiliadoId: vIdClean,
    tipo: "AJUSTE_CUSTODIA_EFECTIVO",
    montoCentavos: params.montoCentavos, // Positivo incrementa, negativo disminuye
    moneda: "ARS",
    motivo: params.motivo.trim(),
    registradoPorUid: params.adminUid,
    idempotencyKey: ikClean,
    createdAt: now
  };

  transaction.set(db.collection("ledger_custodia_efectivo").doc(movId), payload);
  return payload;
}

/**
 * 10. Resolver Vendedor por Firebase Auth UID
 */
export async function resolverVendedorPorAuthUid(
  db: admin.firestore.Firestore,
  authUid: string
): Promise<{ vendedorId: string; vendedorDoc: admin.firestore.DocumentData } | null> {
  if (!authUid || !authUid.trim()) return null;

  const snap = await db.collection("vendedores")
    .where("authUid", "==", authUid.trim())
    .get();

  if (snap.empty || snap.size > 1) {
    return null;
  }

  const doc = snap.docs[0];
  return {
    vendedorId: doc.id,
    vendedorDoc: doc.data()
  };
}

/**
 * 11. Cambiar Switch de Visibilidad del Panel del Vendedor
 */
export async function actualizarVisibilidadPanelVendedor(
  db: admin.firestore.Firestore,
  params: {
    vendedorId: string;
    mostrarCuentaCorrienteEnPanel: boolean;
    adminUid: string;
  }
): Promise<void> {
  const vRef = db.collection("vendedores").doc(params.vendedorId.trim());
  const vSnap = await vRef.get();

  if (!vSnap.exists) {
    throw new Error("404:VENDEDOR_NO_ENCONTRADO: El vendedor no existe.");
  }

  await vRef.update({
    mostrarCuentaCorrienteEnPanel: Boolean(params.mostrarCuentaCorrienteEnPanel)
  });
}





export interface VendorProfileData {
  id: string;
  nombre: string;
  email: string;
  localidad?: string;
  activo?: boolean;
  mostrarCuentaCorrienteEnPanel?: boolean;
}

export async function resolverVendedorCanonico(
  db: admin.firestore.Firestore,
  vendorIdOrEmail: string
): Promise<VendorProfileData | null> {
  if (!vendorIdOrEmail || !vendorIdOrEmail.trim()) return null;
  const clean = vendorIdOrEmail.trim();

  const vDoc = await db.collection("vendedores").doc(clean).get();
  if (vDoc.exists) {
    const data = vDoc.data() || {};
    return {
      id: vDoc.id,
      nombre: data.nombre || vDoc.id,
      email: data.email || "",
      localidad: data.localidad,
      activo: data.activo !== false,
      mostrarCuentaCorrienteEnPanel: Boolean(data.mostrarCuentaCorrienteEnPanel)
    };
  }

  const qSnap = await db.collection("vendedores").where("email", "==", clean.toLowerCase()).get();
  if (!qSnap.empty) {
    const doc = qSnap.docs[0];
    const data = doc.data() || {};
    return {
      id: doc.id,
      nombre: data.nombre || doc.id,
      email: data.email || "",
      localidad: data.localidad,
      activo: data.activo !== false,
      mostrarCuentaCorrienteEnPanel: Boolean(data.mostrarCuentaCorrienteEnPanel)
    };
  }

  return null;
}

export async function enriquecerLiquidacionesConIncidencias(
  db: admin.firestore.Firestore,
  liquidaciones: LiquidacionComision[]
): Promise<LiquidacionComision[]> {
  const result: LiquidacionComision[] = [];
  for (const liq of liquidaciones) {
    const item = { ...liq };
    if (item.estado === "CONFIRMADA") {
      try {
        const evalInc = await evaluarIncidenciasLiquidacion(db, item.id);
        item.tieneIncidenciasPendientes = evalInc.tieneIncidenciasPendientes;
        item.detallesIncidencias = evalInc.detalles;
      } catch {
        item.tieneIncidenciasPendientes = true;
        item.incidenciaNoVerificable = true;
        item.detallesIncidencias = ["No se pudo verificar el estado de esta liquidación."];
      }
    }
    result.push(item);
  }
  return result;
}


export function esMontoCentavosValido(monto: number, permitirNegativo = false): boolean { if (!Number.isInteger(monto)) return false; return permitirNegativo ? monto !== 0 : monto > 0; }
