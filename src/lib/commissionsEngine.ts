import { admin } from "./firebaseAdmin";
import { LedgerMovimiento } from "./ledgerEngine";

export type SchemaVersionComision = "COMMISSION_V1";

export interface ConfiguracionComisionVendedor {
  id: string;
  vendedorAfiliadoId: string;
  vendedorAfiliadoEmail: string;
  porcentajeComisionBasisPoints: number; // e.g. 800 = 8.00%
  vigenteDesde: string;                 // ISO string or YYYY-MM-DD
  motivoCambio: string;
  actualizadoPorAdminUid: string;
  referenciaConfiguracionAnteriorId?: string | null;
  createdAt: string;
}

export interface SnapshotComisionOperacion {
  commissionSchemaVersion: SchemaVersionComision;
  solicitudId: string;
  vendedorAfiliadoId: string;
  vendedorAfiliadoEmail: string;
  configuracionComisionId: string;
  porcentajeVendedorVigenteBasisPoints: number;
  porcentajeAplicadoBasisPoints: number;
  esOverrideAdmin: boolean;
  motivoOverride?: string | null;
  adminUidOverride?: string | null;
  fechaCongelamiento: string;
  tipoOperacion: "MANDATO_COMPRA" | "ENVIO_LOW_COST" | string;
  esComisionable: boolean;
}

export type TipoMovimientoComision =
  | "DEVENGAMIENTO_PAGO"
  | "REVERSA_COMISION"
  | "AJUSTE_ADMINISTRATIVO"
  | "INCLUSION_LIQUIDACION"
  | "PAGO_LIQUIDACION";

export interface LedgerComisionMovimiento {
  id: string;
  solicitudId: string;
  vendedorAfiliadoId: string;
  vendedorAfiliadoEmail: string;
  ledgerPagoMovimientoId?: string | null;
  movimientoOriginalId?: string | null;
  tipo: TipoMovimientoComision;
  montoComisionCentavos: number;
  montoComisionDevengadoCentavos?: number;
  moneda: "ARS" | "USD";
  porcentajeAplicadoBasisPoints: number;
  baseComisionableCentavos: number;
  commissionSchemaVersion: SchemaVersionComision;
  snapshotComisionId?: string | null;
  cuotaNumero?: number | null;
  idempotencyKey: string;
  registradoPor: string;
  clienteNombre?: string | null;
  productoResumen?: string | null;
  motivo?: string | null;
  createdAt: string;
}

export function meEsBasisPointsValido(val: any): boolean {
  return typeof val === "number" && Number.isInteger(val) && val >= 0 && val <= 10000;
}

/**
 * 1. Registrar / Versionar Configuración de Vendedor Afiliado (Append-Only Inmutable & Atómico)
 */
export async function registrarConfiguracionComisionVendedor(
  db: admin.firestore.Firestore,
  params: {
    vendedorAfiliadoId: string;
    vendedorAfiliadoEmail: string;
    porcentajeComisionBasisPoints: number;
    vigenteDesde: string;
    motivoCambio: string;
    actualizadoPorAdminUid: string;
  }
): Promise<ConfiguracionComisionVendedor> {
  if (!meEsBasisPointsValido(params.porcentajeComisionBasisPoints)) {
    throw new Error("400:PORCENTAJE_COMISION_INVALIDO: El porcentaje en basis points debe ser un entero entre 0 y 10000.");
  }
  if (!params.vendedorAfiliadoId || !params.vendedorAfiliadoId.trim()) {
    throw new Error("400:VENDEDOR_ID_REQUERIDO: Se requiere identificador de vendedor.");
  }
  const vIdClean = params.vendedorAfiliadoId.trim();
  const emailClean = (params.vendedorAfiliadoEmail || "").trim().toLowerCase();
  const vigenteDesdeClean = (params.vigenteDesde || new Date().toISOString()).trim();

  return db.runTransaction(async (tx) => {
    const configsSnap = await tx.get(
      db.collection("vendedores_configuraciones_comision")
        .where("vendedorAfiliadoId", "==", vIdClean)
    );

    const prevList: ConfiguracionComisionVendedor[] = [];
    configsSnap.forEach(doc => prevList.push(doc.data() as ConfiguracionComisionVendedor));
    prevList.sort((a, b) => b.vigenteDesde.localeCompare(a.vigenteDesde));

    if (prevList.length > 0) {
      const ultimaVigencia = prevList[0].vigenteDesde;
      if (vigenteDesdeClean <= ultimaVigencia) {
        throw new Error(`409:VIGENCIA_COMISION_RETROACTIVA_NO_PERMITIDA: La fecha de vigencia ${vigenteDesdeClean} es menor o igual a la última vigencia registrada (${ultimaVigencia}).`);
      }
    }

    const newConfig: ConfiguracionComisionVendedor = {
      id: `cfg_${vIdClean}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      vendedorAfiliadoId: vIdClean,
      vendedorAfiliadoEmail: emailClean,
      porcentajeComisionBasisPoints: params.porcentajeComisionBasisPoints,
      vigenteDesde: vigenteDesdeClean,
      motivoCambio: (params.motivoCambio || "").trim(),
      actualizadoPorAdminUid: params.actualizadoPorAdminUid.trim(),
      referenciaConfiguracionAnteriorId: prevList.length > 0 ? prevList[0].id : null,
      createdAt: new Date().toISOString()
    };

    tx.set(db.collection("vendedores_configuraciones_comision").doc(newConfig.id), newConfig);
    return newConfig;
  });
}

/**
 * 2. Obtener Configuración Vigente de un Vendedor Afiliado As Of Fecha
 */
export async function obtenerConfiguracionComisionVigente(
  db: admin.firestore.Firestore,
  vendedorAfiliadoId: string,
  fechaAsOfIso?: string,
  transaction?: admin.firestore.Transaction
): Promise<ConfiguracionComisionVendedor> {
  const vIdClean = vendedorAfiliadoId.trim();
  const asOf = (fechaAsOfIso || new Date().toISOString()).trim();

  const configsRef = db.collection("vendedores_configuraciones_comision")
    .where("vendedorAfiliadoId", "==", vIdClean);

  const configsSnap = transaction ? await transaction.get(configsRef) : await configsRef.get();

  const validas: ConfiguracionComisionVendedor[] = [];
  configsSnap.forEach(doc => {
    const data = doc.data() as ConfiguracionComisionVendedor;
    if (data.vigenteDesde <= asOf) {
      validas.push(data);
    }
  });

  if (validas.length === 0) {
    throw new Error("409:CONFIGURACION_COMISION_VENDEDOR_FALTANTE: El vendedor especificado no posee una configuración versionada de comisión válida activa para la fecha.");
  }

  validas.sort((a, b) => {
    const cmpDate = b.vigenteDesde.localeCompare(a.vigenteDesde);
    if (cmpDate !== 0) return cmpDate;
    const cmpCreated = (b.createdAt || "").localeCompare(a.createdAt || "");
    return cmpCreated;
  });

  return validas[0];
}

/**
 * 3. Congelar Snapshot Inmutable de Comisión al Aceptar / Formalizar Operación
 */
export async function crearSnapshotComisionOperacion(
  dbOrParams: any,
  paramsOrTx?: any,
  transactionParam?: any
): Promise<any> {
  const db = (typeof dbOrParams?.collection === "function")
    ? dbOrParams
    : (dbOrParams?.db && typeof dbOrParams.db.collection === "function")
      ? dbOrParams.db
      : admin.firestore();
  const params = (typeof dbOrParams?.collection === "function") ? paramsOrTx : dbOrParams;
  const transaction = (typeof dbOrParams?.collection === "function") ? transactionParam : paramsOrTx;
  return _raw_crearSnapshotComisionOperacion(db, params, transaction);
}

async function _raw_crearSnapshotComisionOperacion(
  db: admin.firestore.Firestore,
  params: any,
  transaction?: admin.firestore.Transaction
): Promise<SnapshotComisionOperacion> {
  const solicitudId = (params.solicitudId || params.operacionId || "").trim();
  if (!solicitudId) {
    throw new Error("400:SOLICITUD_ID_REQUERIDO: Se requiere identificador de solicitud/operación.");
  }
  const vIdClean = (params.vendedorAfiliadoId || "").trim();
  if (!vIdClean) {
    throw new Error("400:VENDEDOR_ID_REQUERIDO: Se requiere identificador de vendedor afiliado.");
  }

  if (params.fechaCongelamiento === null || params.fechaCongelamiento === "") {
    throw new Error("400:FECHA_CONGELAMIENTO_REQUERIDA: Se requiere fechaCongelamiento explícita.");
  }
  const fechaCongelamiento = params.fechaCongelamiento || params.snapshotFechaIso || new Date().toISOString();

  const tipoOperacion = (params.tipoOperacion || "MANDATO_COMPRA").trim();
  if (tipoOperacion !== "MANDATO_COMPRA" && tipoOperacion !== "ENVIO_LOW_COST") {
    throw new Error(`409:TIPO_OPERACION_NO_SOPORTADO: Tipo de operación "${tipoOperacion}" no soportado por el motor de comisiones.`);
  }

  const snapRef = db.collection("snapshots_comision_operaciones").doc(solicitudId);
  const existingSnap = transaction ? await transaction.get(snapRef) : await snapRef.get();
  if (existingSnap.exists) {
    return existingSnap.data() as SnapshotComisionOperacion;
  }

  const cfgVigente = await obtenerConfiguracionComisionVigente(db, vIdClean, fechaCongelamiento);
  const pctVendedorStandard = cfgVigente ? cfgVigente.porcentajeComisionBasisPoints : (params.porcentajeComisionBasisPoints || 0);

  let porcentajeAplicadoBasisPoints = pctVendedorStandard;
  let esOverrideAdmin = false;
  let motivoOverride: string | null = null;
  let adminUidOverride: string | null = null;

  if (params.esOverrideAdmin) {
    if (!meEsBasisPointsValido(params.porcentajeOverrideBasisPoints)) {
      throw new Error("400:PORCENTAJE_OVERRIDE_INVALIDO: El porcentaje override en basis points debe ser un entero entre 0 y 10000.");
    }
    if (!params.motivoOverride || !params.motivoOverride.trim()) {
      throw new Error("400:MOTIVO_OVERRIDE_REQUERIDO: Un override administrativo requiere justificación.");
    }
    if (!params.adminUidOverride || !params.adminUidOverride.trim()) {
      throw new Error("400:ADMIN_OVERRIDE_REQUERIDO: Un override administrativo requiere la identificación del admin.");
    }
    porcentajeAplicadoBasisPoints = params.porcentajeOverrideBasisPoints;
    esOverrideAdmin = true;
    motivoOverride = params.motivoOverride.trim();
    adminUidOverride = params.adminUidOverride.trim();
  }

  const snapshot: SnapshotComisionOperacion = {
    commissionSchemaVersion: "COMMISSION_V1",
    solicitudId,
    vendedorAfiliadoId: vIdClean,
    vendedorAfiliadoEmail: (params.vendedorAfiliadoEmail || (cfgVigente ? cfgVigente.vendedorAfiliadoEmail : "")).trim().toLowerCase(),
    configuracionComisionId: cfgVigente ? cfgVigente.id : "OVERRIDE_DIRECTO",
    porcentajeVendedorVigenteBasisPoints: pctVendedorStandard,
    porcentajeAplicadoBasisPoints,
    esOverrideAdmin,
    motivoOverride,
    adminUidOverride,
    fechaCongelamiento,
    tipoOperacion,
    esComisionable: tipoOperacion === "MANDATO_COMPRA"
  };

  if (transaction) {
    transaction.set(snapRef, snapshot);
  } else {
    await snapRef.set(snapshot);
  }

  return snapshot;
}

/**
 * 4. Devengar Comisión por Cobro Efectivo Confirmado en Ledger (Atómico & Inmutable)
 */
export async function procesarComisionPago(
  dbOrParams: any,
  paramsOrTx?: any,
  transactionParam?: any
): Promise<any> {
  const db = (typeof dbOrParams?.collection === "function")
    ? dbOrParams
    : (dbOrParams?.db && typeof dbOrParams.db.collection === "function")
      ? dbOrParams.db
      : admin.firestore();
  const params = (typeof dbOrParams?.collection === "function") ? paramsOrTx : dbOrParams;
  const transaction = (typeof dbOrParams?.collection === "function") ? transactionParam : paramsOrTx;
  return _raw_procesarComisionPago(db, params, transaction);
}

async function _raw_procesarComisionPago(
  db: admin.firestore.Firestore,
  params: any,
  transaction?: admin.firestore.Transaction
): Promise<LedgerComisionMovimiento | null> {
  if (!transaction) {
    return db.runTransaction(async (tx) => {
      return _raw_procesarComisionPago(db, params, tx);
    });
  }

  const solicitudId = (params.solicitudId || params.operacionId || params.snapshotComision?.solicitudId || "").trim();
  const ledgerPagoMovimientoId = (params.ledgerPagoMovimientoId || params.ledgerMovimientoPagoId || params.pago?.id || params.pago?.idempotencyKey || params.idempotencyKey || "").trim();
  const registradoPor = (params.registradoPor || params.adminUid || "admin_system").trim();

  const movRef = db.collection("ledger_movimientos").doc(ledgerPagoMovimientoId || "dummy");
  let mov = params.ledgerMovimiento;
  if (!mov) {
    const movSnap = ledgerPagoMovimientoId ? await transaction.get(movRef) : null;
    if (movSnap && movSnap.exists) {
      mov = movSnap.data() as LedgerMovimiento;
    } else if (params.montoAplicablePlanCentavos || params.pago?.montoPagoCentavos) {
      mov = {
        id: ledgerPagoMovimientoId || ("pago_" + Date.now()),
        solicitudId,
        tipo: "PAGO",
        montoAplicablePlanCentavos: params.montoAplicablePlanCentavos || params.pago?.montoPagoCentavos,
        cuotaNumero: params.cuotaNumero || params.pago?.cuotaNumero || 1,
        clienteNombre: params.clienteNombre || params.pago?.clienteNombre || "",
        productoResumen: params.productoResumen || params.pago?.productoResumen || "",
        valido: true
      } as any;
    } else {
      throw new Error(`404:LEDGER_MOVIMIENTO_NO_ENCONTRADO: El movimiento de pago ${ledgerPagoMovimientoId} no existe en el Ledger.`);
    }
  }

  if (mov.tipo !== "PAGO") {
    throw new Error("400:MOVIMIENTO_NO_ES_PAGO: La comisión sólo se devenga sobre movimientos de tipo PAGO.");
  }
  if (mov.solicitudId && mov.solicitudId !== solicitudId) {
    throw new Error("400:SOLICITUD_MOVIMIENTO_NO_COINCIDE: El movimiento de pago no pertenece a la solicitud especificada.");
  }
  if (mov.estado === "REVERSADO" || (mov as any).valido === false) {
    throw new Error("400:MOVIMIENTO_INVALIDO_O_REVERTIDO: No se puede devengar comisión sobre un movimiento inválido o revertido.");
  }

  const montoAplicablePlanCentavos = mov.montoAplicablePlanCentavos || 0;
  if (montoAplicablePlanCentavos <= 0) return null;

  const idempotencyKey = `com_dev_${solicitudId}_${ledgerPagoMovimientoId}`;
  const movComRef = db.collection("ledger_comisiones_movimientos").doc(idempotencyKey);

  const existingMovSnap = await transaction.get(movComRef);
  if (existingMovSnap.exists) {
    return existingMovSnap.data() as LedgerComisionMovimiento;
  }

  let snapshotCom: SnapshotComisionOperacion = params.snapshotComision;
  if (!snapshotCom) {
    const snapRef = db.collection("snapshots_comision_operaciones").doc(solicitudId);
    const snapDoc = await transaction.get(snapRef);

    if (!snapDoc.exists) {
      const solRef = db.collection("solicitudes").doc(solicitudId);
      const solSnap = await transaction.get(solRef);
      const solData = solSnap.data() || {};

      const hasVendor = Boolean(solData.vendedorAfiliadoId || solData.afiliadoId || solData.vendedorId);
      if (!hasVendor) {
        return null;
      }

      if (solData.pricingSchemaVersion !== "CANONICAL_V1" || solData.esLegacy === true) {
        throw new Error(`409:LEGACY_COMMISSION_PENDING_REVIEW: Operación anterior a COMMISSION_V1 sin snapshot de comisión congelado. Clasificada explícitamente como pendiente de revisión/migración.`);
      }

      throw new Error(`409:SNAPSHOT_COMISION_OPERACION_FALTANTE: No existe snapshot de comisión para la solicitud ${solicitudId}. La operación debió congelar su snapshot al momento de la aceptación/formalización.`);
    }

    snapshotCom = snapDoc.data() as SnapshotComisionOperacion;
  }

  if (!snapshotCom.esComisionable || snapshotCom.porcentajeAplicadoBasisPoints === 0) {
    return null;
  }

  const baseCentavos = BigInt(montoAplicablePlanCentavos);
  const basisPts = BigInt(snapshotCom.porcentajeAplicadoBasisPoints);
  const montoComisionCentavos = Number((baseCentavos * basisPts) / BigInt(10000));

  let cuotaNum = mov.cuotaNumero || params.cuotaNumero || null;
  if (!cuotaNum && mov.id) {
    const impSnap = await transaction.get(
      db.collection("ledger_imputaciones").where("movimientoId", "==", mov.id).limit(1)
    );
    if (!impSnap.empty) {
      cuotaNum = impSnap.docs[0].data().cuotaNumero || null;
    }
  }

  const movimientoComision: LedgerComisionMovimiento = {
    id: idempotencyKey,
    solicitudId,
    vendedorAfiliadoId: snapshotCom.vendedorAfiliadoId,
    vendedorAfiliadoEmail: snapshotCom.vendedorAfiliadoEmail,
    ledgerPagoMovimientoId,
    tipo: "DEVENGAMIENTO_PAGO",
    montoComisionCentavos,
    montoComisionDevengadoCentavos: montoComisionCentavos,
    moneda: "ARS",
    porcentajeAplicadoBasisPoints: snapshotCom.porcentajeAplicadoBasisPoints,
    baseComisionableCentavos: montoAplicablePlanCentavos,
    commissionSchemaVersion: "COMMISSION_V1",
    snapshotComisionId: snapshotCom.solicitudId,
    cuotaNumero: cuotaNum,
    idempotencyKey,
    registradoPor,
    clienteNombre: mov.clienteNombre || params.clienteNombre || null,
    productoResumen: mov.productoResumen || params.productoResumen || null,
    createdAt: new Date().toISOString()
  };

  transaction.set(movComRef, movimientoComision);

  return movimientoComision;
}

/**
 * 5. Reversar Comisión por Reversa Real de Pago (Atómico & Anclado al Ledger)
 */
export async function reversarComisionPago(
  dbOrParams: any,
  paramsOrTx?: any,
  transactionParam?: any
): Promise<any> {
  const db = (typeof dbOrParams?.collection === "function")
    ? dbOrParams
    : (dbOrParams?.db && typeof dbOrParams.db.collection === "function")
      ? dbOrParams.db
      : admin.firestore();
  const params = (typeof dbOrParams?.collection === "function") ? paramsOrTx : dbOrParams;
  const transaction = (typeof dbOrParams?.collection === "function") ? transactionParam : paramsOrTx;
  return _raw_reversarComisionPago(db, params, transaction);
}

async function _raw_reversarComisionPago(
  db: admin.firestore.Firestore,
  params: any,
  transaction?: admin.firestore.Transaction
): Promise<LedgerComisionMovimiento | null> {
  if (!transaction) {
    return db.runTransaction(async (tx) => {
      return _raw_reversarComisionPago(db, params, tx);
    });
  }

  const solicitudId = (params.solicitudId || params.operacionId || "").trim();
  let ledgerPagoMovimientoId = (params.ledgerPagoMovimientoId || params.ledgerMovimientoPagoId || "").trim();
  const motivo = (params.motivo || "").trim();
  const adminEmail = (params.adminEmail || params.adminUid || params.realizadoPorUid || params.registradoPor || "admin_system").trim();

  // Validar si vino ledgerPagoMovimientoId explícito (modo estricto)
  if (ledgerPagoMovimientoId) {
    let revLedgerMov = params.ledgerReversaMovimiento;
    if (!revLedgerMov) {
      const revLedgerSnap = await transaction.get(
        db.collection("ledger_movimientos")
          .where("movimientoOriginalId", "==", ledgerPagoMovimientoId)
          .where("tipo", "==", "REVERSA")
      );
      if (revLedgerSnap.empty) {
        throw new Error(`400:REVERSA_LEDGER_NO_ENCONTRADA: No existe una reversa de pago canónica registrada en el Ledger para el movimiento ${ledgerPagoMovimientoId}.`);
      }
      revLedgerMov = revLedgerSnap.docs[0].data() as LedgerMovimiento;
    }

    if (revLedgerMov.tipo !== "REVERSA" || revLedgerMov.movimientoOriginalId !== ledgerPagoMovimientoId || revLedgerMov.solicitudId !== solicitudId) {
      throw new Error(`400:REVERSA_LEDGER_INVALIDA: El movimiento de reversa especificado no coincide con la solicitud o el pago original.`);
    }
  }

  // Buscar movimiento original de devengamiento
  let devMov: LedgerComisionMovimiento | null = null;
  if (ledgerPagoMovimientoId) {
    const devKey = `com_dev_${solicitudId}_${ledgerPagoMovimientoId}`;
    const devRef = db.collection("ledger_comisiones_movimientos").doc(devKey);
    const devSnap = await transaction.get(devRef);
    if (devSnap.exists) {
      devMov = devSnap.data() as LedgerComisionMovimiento;
    }
  } else {
    const devQuery = db.collection("ledger_comisiones_movimientos")
      .where("solicitudId", "==", solicitudId)
      .where("tipo", "==", "DEVENGAMIENTO_PAGO");
    const devQuerySnap = await transaction.get(devQuery);
    if (!devQuerySnap.empty) {
      devMov = devQuerySnap.docs[0].data() as LedgerComisionMovimiento;
      ledgerPagoMovimientoId = devMov.ledgerPagoMovimientoId || devMov.id;
    }
  }

  if (!devMov) {
    return null;
  }

  const revKey = params.idempotencyKey || `com_rev_${devMov.id}`;
  const revRef = db.collection("ledger_comisiones_movimientos").doc(revKey);

  const revSnap = await transaction.get(revRef);
  if (revSnap.exists) {
    return revSnap.data() as LedgerComisionMovimiento;
  }

  const reversaMovimiento: LedgerComisionMovimiento = {
    id: revKey,
    solicitudId,
    vendedorAfiliadoId: devMov.vendedorAfiliadoId,
    vendedorAfiliadoEmail: devMov.vendedorAfiliadoEmail,
    ledgerPagoMovimientoId,
    movimientoOriginalId: devMov.id,
    tipo: "REVERSA_COMISION",
    montoComisionCentavos: -Math.abs(devMov.montoComisionCentavos),
    montoComisionDevengadoCentavos: -Math.abs(devMov.montoComisionCentavos),
    moneda: devMov.moneda,
    porcentajeAplicadoBasisPoints: devMov.porcentajeAplicadoBasisPoints,
    baseComisionableCentavos: -Math.abs(devMov.baseComisionableCentavos),
    commissionSchemaVersion: "COMMISSION_V1",
    snapshotComisionId: devMov.snapshotComisionId,
    cuotaNumero: devMov.cuotaNumero || params.cuotaNumero || null,
    idempotencyKey: revKey,
    registradoPor: adminEmail,
    motivo: motivo || "Reversa de comisión",
    createdAt: new Date().toISOString()
  };

  transaction.set(revRef, reversaMovimiento);

  return reversaMovimiento;
}

/**
 * 6. Obtener Estado Consolidado de Comisiones de una Operación
 */
export async function obtenerEstadoComisionesOperacion(
  db: admin.firestore.Firestore,
  solicitudId: string
): Promise<{
  solicitudId: string;
  totalComisionDevengadaCentavos: number;
  movimientos: LedgerComisionMovimiento[];
}> {
  const snap = await db.collection("ledger_comisiones_movimientos")
    .where("solicitudId", "==", solicitudId)
    .get();

  const movimientos: LedgerComisionMovimiento[] = [];
  let totalComisionDevengadaCentavos = 0;

  snap.forEach(d => {
    const m = d.data() as LedgerComisionMovimiento;
    movimientos.push(m);
    totalComisionDevengadaCentavos += Number(m.montoComisionCentavos || 0);
  });

  movimientos.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return {
    solicitudId,
    totalComisionDevengadaCentavos,
    movimientos
  };
}

/**
 * 7. Obtener Saldo Consolidado de Comisiones por Vendedor
 */
export async function obtenerSaldoComisionesVendedor(
  db: admin.firestore.Firestore,
  vendedorAfiliadoId: string
): Promise<{
  vendedorAfiliadoId: string;
  saldoComisionesCentavos: number;
  totalMovimientosCount: number;
}> {
  const vIdClean = vendedorAfiliadoId.trim();
  const snap = await db.collection("ledger_comisiones_movimientos")
    .where("vendedorAfiliadoId", "==", vIdClean)
    .get();

  let saldoComisionesCentavos = 0;
  let totalMovimientosCount = 0;

  snap.forEach(d => {
    const m = d.data() as LedgerComisionMovimiento;
    const monto = Number(m.montoComisionCentavos || 0);
    if (m.tipo === "PAGO_LIQUIDACION") {
      saldoComisionesCentavos -= Math.abs(monto);
    } else {
      saldoComisionesCentavos += monto;
    }
    totalMovimientosCount++;
  });

  return {
    vendedorAfiliadoId: vIdClean,
    saldoComisionesCentavos,
    totalMovimientosCount
  };
}

/**
 * 8. Parser seguro de porcentaje a basis points integer (Fail-Closed)
 */
export function porcentajeAPuntosBasicos(value: unknown): number {
  if (typeof value === "number") {
    if (isNaN(value) || !isFinite(value)) {
      throw new Error("400:PORCENTAJE_INVALIDO: El porcentaje debe ser un número válido.");
    }
    value = String(value);
  }
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("400:PORCENTAJE_INVALIDO: El porcentaje debe ser especificado.");
  }
  const str = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    throw new Error("400:PORCENTAJE_INVALIDO: El porcentaje debe tener como máximo 2 decimales y estar entre 0 y 100.");
  }
  const num = parseFloat(str);
  if (num < 0 || num > 100) {
    throw new Error("400:PORCENTAJE_INVALIDO: El porcentaje debe estar entre 0 y 100.");
  }
  const parts = str.split(".");
  const integerPart = parseInt(parts[0], 10);
  let decimalPart = parts[1] || "";
  if (decimalPart.length === 1) decimalPart += "0";
  const bpsStr = String(integerPart) + (decimalPart || "00");
  const bps = parseInt(bpsStr, 10);

  if (!Number.isSafeInteger(bps) || bps < 0 || bps > 10000) {
    throw new Error("400:PORCENTAJE_INVALIDO: El porcentaje no genera un entero seguro válido.");
  }
  return bps;
}
