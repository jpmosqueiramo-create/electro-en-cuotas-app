import { admin } from "./firebaseAdmin";
import { 
  obtenerSnapshotFinancieroCanonico, 
  calcularEstadoFinancieroOperacion,
  LedgerMovimiento
} from "./ledgerEngine";

export type ResultadoEvaluacionVencimiento = "CUMPLIDO_80" | "INCUMPLIMIENTO";

export interface EvaluacionVencimiento {
  id: string;
  solicitudId: string;
  cuotaNumero: number;
  fechaVencimiento: string; // YYYY-MM-DD
  fechaEvaluacion: string; // ISO 8601
  exigibleAcumuladoCentavos: number;
  pagadoCalificableCentavosAlEvento: number;
  porcentajeCumplimientoBasisPoints: number; // e.g. 8000 = 80.00%
  resultado: ResultadoEvaluacionVencimiento;
  saldoArrastradoCentavos: number;
  rachaAntes: number;
  rachaDespues: number;
  ledgerRevisionEvaluada: number;
  creadoPor: string;
  createdAt: string;
}

export type EstadoCumplimientoOperacion =
  | "AL_DIA"
  | "INCUMPLIMIENTO_1"
  | "EN_PERIODO_CURA"
  | "CURADO"
  | "CURA_VENCIDA"
  | "CANCELADO";

export type EstadoCicloCura = "EN_CURSO" | "CURADA" | "VENCIDA";

export interface CicloCura {
  id: string;
  solicitudId: string;
  triggerEvaluacionId: string;
  cuotaTrigger: number;
  fechaInicio: string; // YYYY-MM-DD
  fechaLimite: string; // YYYY-MM-DD (+10 días)
  exigibleBaseCuraCentavos: number; // Base contractual congelada al gatillar la racha 2
  resultadoDerivado: EstadoCicloCura;
}

export interface EstadoCumplimientoCalculado {
  solicitudId: string;
  estadoActual: EstadoCumplimientoOperacion;
  rachaActiva: number;
  ultimoVencimientoEvaluado: string | null;
  proximoVencimiento: string | null;
  cuotaProximaNumero: number | null;
  montoProximaCuotaCentavos: number | null;
  saldoExigibleActualCentavos: number;
  saldoTotalCentavos: number;
  porcentajeCubiertoExigibleBasisPoints: number;
  cicloCuraVigente: CicloCura | null;
  historialCiclosCura: CicloCura[];
  fechaInicioCura: string | null;
  fechaLimiteCura: string | null;
  diasRestantesCura: number | null;
}

export type EstadoPromesaPago = "VIGENTE" | "CUMPLIDA" | "INCUMPLIDA" | "SUPERADA";

export interface PromesaPago {
  id: string;
  solicitudId: string;
  clienteId: string;
  fechaPrometida: string; // YYYY-MM-DD
  montoPrometidoCentavos?: number | null;
  pagadoCalificableCentavosAlCrear: number;
  nota?: string | null;
  creadaPor: string;
  creadaPorRol: "ADMIN" | "VENDEDOR_AFILIADO" | "CLIENTE";
  createdAt: string;
  estadoDerivado?: EstadoPromesaPago;
}

export type TipoAjusteAdministrativo = "AJUSTE_RACHA" | "AJUSTE_RESULTADO" | "AJUSTE_EXIGIBLE";

export interface AjusteAdministrativoVencimiento {
  id: string;
  solicitudId: string;
  referenciaEventoId: string;
  tipoAjuste: TipoAjusteAdministrativo;
  motivo: string;
  valorAnterior: Record<string, unknown>;
  valorNuevo: Record<string, unknown>;
  adminUid: string;
  createdAt: string;
}

export interface NotificacionCumplimiento {
  id: string;
  solicitudId: string;
  tipo: "PROXIMO_VENCIMIENTO" | "INCUMPLIMIENTO_1" | "INICIO_CURA" | "CURA_PROXIMA_VENCER" | "CURA_VENCIDA" | "PROMESA_PROXIMA" | "PROMESA_INCUMPLIDA";
  fechaRef: string;
  createdAt: string;
  procesada: boolean;
}

/**
 * Convierte timestamp o fecha a formato de calendario local YYYY-MM-DD en America/Argentina/Buenos_Aires.
 */
export function obtenerFechaCalendarioArgentina(fechaInput?: string | Date | null): string {
  if (!fechaInput) {
    const now = new Date();
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(now);
  }

  if (typeof fechaInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fechaInput.trim())) {
    return fechaInput.trim();
  }

  const date = typeof fechaInput === "string" ? new Date(fechaInput) : fechaInput;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

/**
 * Suma días calendario exactos a una fecha YYYY-MM-DD.
 */
export function sumarDiasCalendario(fechaYYYYMMDD: string, dias: number): string {
  const [y, m, d] = fechaYYYYMMDD.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + dias));
  const resY = date.getUTCFullYear();
  const resM = String(date.getUTCMonth() + 1).padStart(2, "0");
  const resD = String(date.getUTCDate()).padStart(2, "0");
  return `${resY}-${resM}-${resD}`;
}

/**
 * Helper Canónico para calcular la tabla de fechas de vencimiento de un plan.
 */
export function calcularFechasVencimientoPlan(
  solData: Record<string, unknown>,
  cantidadCuotas: number
): Array<{ numero: number; fechaVencimiento: string }> {
  const snapshot = obtenerSnapshotFinancieroCanonico(solData);
  const fechaEntregaReal = (solData.fechaEntregaReal || solData.fechaEntrega) as string | undefined;

  if (!fechaEntregaReal || !fechaEntregaReal.trim()) {
    return [];
  }

  const f1 = obtenerFechaCalendarioArgentina(fechaEntregaReal);
  const resultados: Array<{ numero: number; fechaVencimiento: string }> = [
    { numero: 1, fechaVencimiento: f1 }
  ];

  if (cantidadCuotas < 2) return resultados;

  const snapRaw = solData.propuestaAceptada as Record<string, unknown> | undefined;
  const f2Raw = (snapRaw?.vencimientoSegundaCuota ||
                 snapRaw?.fechaCuota2Contractual ||
                 (snapshot.cuotas[1] as unknown as Record<string, unknown>)?.fechaVencimiento ||
                 solData.fechaCuota2Contractual) as string | undefined;

  if (!f2Raw || typeof f2Raw !== "string" || !f2Raw.trim()) {
    throw new Error("409:FECHA_CUOTA_2_CONTRACTUAL_FALTANTE: La propuesta aceptada CANONICAL_V1 no contiene la fecha contractual inmutable de Cuota 2.");
  }

  const f2 = obtenerFechaCalendarioArgentina(f2Raw);
  resultados.push({ numero: 2, fechaVencimiento: f2 });

  const [y2, m2, d2] = f2.split("-").map(Number);
  const baseDay = d2;

  for (let k = 3; k <= cantidadCuotas; k++) {
    const totalMonths = (y2 * 12 + (m2 - 1)) + (k - 2);
    const targetY = Math.floor(totalMonths / 12);
    const targetM = (totalMonths % 12) + 1;
    const maxDaysInMonth = new Date(targetY, targetM, 0).getDate();
    const targetD = Math.min(baseDay, maxDaysInMonth);

    const mStr = String(targetM).padStart(2, "0");
    const dStr = String(targetD).padStart(2, "0");
    resultados.push({ numero: k, fechaVencimiento: `${targetY}-${mStr}-${dStr}` });
  }

  return resultados;
}

/**
 * Reconstruir pagos calificables confirmados HASTA una fecha de corte (AS OF).
 */
export async function calcularPagadoCalificableHasta(
  db: admin.firestore.Firestore,
  solicitudId: string,
  fechaCorteYYYYMMDD: string,
  transaction?: admin.firestore.Transaction
): Promise<number> {
  const movsRef = db.collection("ledger_movimientos").where("solicitudId", "==", solicitudId);
  const snap = transaction ? await transaction.get(movsRef) : await movsRef.get();

  let totalCentavos = 0;
  snap.forEach(doc => {
    const m = doc.data() as LedgerMovimiento;
    const fechaEfectivaLocal = obtenerFechaCalendarioArgentina(m.fechaEfectiva);

    if (m.tipo === "PAGO" && fechaEfectivaLocal <= fechaCorteYYYYMMDD) {
      const fechaReversaLocal = m.fechaReversa ? obtenerFechaCalendarioArgentina(m.fechaReversa) : null;

      if (m.estado === "ACTIVO" || (fechaReversaLocal && fechaReversaLocal > fechaCorteYYYYMMDD)) {
        totalCentavos += Number(m.montoAplicablePlanCentavos || 0);
      }
    }
  });

  return totalCentavos;
}

/**
 * Obtener todos los pagos calificables activos actuales en Ledger.
 */
export async function obtenerPagosCalificablesCentavos(
  db: admin.firestore.Firestore,
  solicitudId: string,
  transaction?: admin.firestore.Transaction
): Promise<number> {
  const movsRef = db.collection("ledger_movimientos").where("solicitudId", "==", solicitudId);
  const snap = transaction ? await transaction.get(movsRef) : await movsRef.get();

  let totalCentavos = 0;
  snap.forEach(doc => {
    const data = doc.data() as LedgerMovimiento;
    if (data.tipo === "PAGO" && data.estado === "ACTIVO") {
      totalCentavos += Number(data.montoAplicablePlanCentavos || 0);
    }
  });

  return totalCentavos;
}

/**
 * REQUISITO CANÓNICO A:
 * Reconstruir determinísticamente el historial de ciclos de cura de la operación AS OF fechaReferenciaYYYYMMDD.
 * Cada ciclo de cura congela su exigibleBaseCuraCentavos al momento del gatillo (racha 2).
 * La condición de cura AS OF fechaReferencia utiliza fechaCorteEvaluacionCura = min(fechaReferencia, fechaLimite).
 */
export async function reconstruirCiclosCuraOperacion(
  db: admin.firestore.Firestore,
  solicitudId: string,
  fechaReferenciaYYYYMMDD: string
): Promise<{
  historialCiclos: CicloCura[];
  rachaActivaActual: number;
  cicloVigente: CicloCura | null;
}> {
  const evalsSnap = await db.collection("evaluaciones_vencimiento")
    .where("solicitudId", "==", solicitudId)
    .get();

  const evaluaciones: EvaluacionVencimiento[] = [];
  evalsSnap.forEach(d => evaluaciones.push(d.data() as EvaluacionVencimiento));

  evaluaciones.sort((a, b) => a.cuotaNumero - b.cuotaNumero);

  const historialCiclos: CicloCura[] = [];
  let rachaActiva = 0;

  for (const ev of evaluaciones) {
    if (ev.fechaVencimiento > fechaReferenciaYYYYMMDD) continue;

    if (ev.resultado === "CUMPLIDO_80") {
      rachaActiva = 0;
    } else {
      rachaActiva++;
      if (rachaActiva === 2) {
        // Gatillo de un nuevo ciclo de cura
        const fechaInicio = ev.fechaVencimiento;
        const fechaLimite = sumarDiasCalendario(fechaInicio, 10);
        const exigibleBaseCuraCentavos = ev.exigibleAcumuladoCentavos; // BASE CONGELADA DE ESTE CICLO

        // REGLA CANÓNICA A: fechaCorteEvaluacionCura = min(fechaReferenciaYYYYMMDD, fechaLimite)
        const fechaCorteEvaluacionCura = fechaReferenciaYYYYMMDD < fechaLimite
          ? fechaReferenciaYYYYMMDD
          : fechaLimite;

        const pagadoHastaCorte = await calcularPagadoCalificableHasta(db, solicitudId, fechaCorteEvaluacionCura);
        const umbral80 = Math.ceil(exigibleBaseCuraCentavos * 0.80);

        let resultadoDerivado: EstadoCicloCura = "EN_CURSO";

        if (fechaReferenciaYYYYMMDD <= fechaLimite) {
          if (pagadoHastaCorte >= umbral80) {
            resultadoDerivado = "CURADA";
            rachaActiva = 0;
          } else {
            resultadoDerivado = "EN_CURSO";
          }
        } else {
          if (pagadoHastaCorte >= umbral80) {
            resultadoDerivado = "CURADA";
            rachaActiva = 0;
          } else {
            resultadoDerivado = "VENCIDA";
          }
        }

        const ciclo: CicloCura = {
          id: `cura_${solicitudId}_c${ev.cuotaNumero}_${fechaInicio}`,
          solicitudId,
          triggerEvaluacionId: ev.id,
          cuotaTrigger: ev.cuotaNumero,
          fechaInicio,
          fechaLimite,
          exigibleBaseCuraCentavos,
          resultadoDerivado
        };

        historialCiclos.push(ciclo);
      }
    }
  }

  const cicloVigente = historialCiclos.length > 0 ? historialCiclos[historialCiclos.length - 1] : null;

  return {
    historialCiclos,
    rachaActivaActual: rachaActiva,
    cicloVigente
  };
}

/**
 * REQUISITO B: Helper Canónico para obtener la racha activa de una operación antes de evaluar cuota N.
 */
export async function obtenerRachaActivaPrevia(
  db: admin.firestore.Firestore,
  solicitudId: string,
  cuotaNumeroTarget: number,
  transaction?: admin.firestore.Transaction
): Promise<number> {
  if (cuotaNumeroTarget <= 1) return 0;

  const evalsRef = db.collection("evaluaciones_vencimiento").where("solicitudId", "==", solicitudId);
  const snap = transaction ? await transaction.get(evalsRef) : await evalsRef.get();

  const evaluaciones: EvaluacionVencimiento[] = [];
  snap.forEach(d => {
    const ev = d.data() as EvaluacionVencimiento;
    if (ev.cuotaNumero < cuotaNumeroTarget) {
      evaluaciones.push(ev);
    }
  });

  evaluaciones.sort((a, b) => a.cuotaNumero - b.cuotaNumero);

  let rachaActiva = 0;
  for (const ev of evaluaciones) {
    if (ev.resultado === "CUMPLIDO_80") {
      rachaActiva = 0;
    } else {
      rachaActiva++;
      if (rachaActiva === 2) {
        const fechaLimite = sumarDiasCalendario(ev.fechaVencimiento, 10);
        const pagadoHastaLimite = await calcularPagadoCalificableHasta(db, solicitudId, fechaLimite, transaction);
        const umbral80 = Math.ceil(ev.exigibleAcumuladoCentavos * 0.80);

        if (pagadoHastaLimite >= umbral80) {
          rachaActiva = 0;
        }
      }
    }
  }

  return rachaActiva;
}

/**
 * Evaluador Transaccional Append-Only de Vencimientos.
 */
export async function evaluarVencimientoCuota(
  db: admin.firestore.Firestore,
  solData: Record<string, unknown>,
  cuotaNumero: number,
  fechaVencimiento: string,
  creadoPor: string = "SYSTEM_JOB"
): Promise<EvaluacionVencimiento> {
  const snapshot = obtenerSnapshotFinancieroCanonico(solData);
  const solicitudId = String(solData.id || solData.solicitudId);
  const evalId = `${solicitudId}_cuota_${cuotaNumero}_${fechaVencimiento}`;
  const evalRef = db.collection("evaluaciones_vencimiento").doc(evalId);

  return await db.runTransaction(async (transaction) => {
    const existingSnap = await transaction.get(evalRef);
    if (existingSnap.exists) {
      return existingSnap.data() as EvaluacionVencimiento;
    }

    const opRef = db.collection("ledger_operaciones").doc(solicitudId);
    const opSnap = await transaction.get(opRef);
    const ledgerRevisionEvaluada = opSnap.exists ? (opSnap.data()?.revision || 1) : 1;

    let rachaAntes = 0;
    if (cuotaNumero > 1) {
      const evalsPreviasSnap = await transaction.get(
        db.collection("evaluaciones_vencimiento").where("solicitudId", "==", solicitudId)
      );

      let prevEvalFound = false;
      evalsPreviasSnap.forEach(d => {
        const ev = d.data() as EvaluacionVencimiento;
        if (ev.cuotaNumero === cuotaNumero - 1) {
          prevEvalFound = true;
        }
      });

      if (!prevEvalFound) {
        throw new Error(`409:EVALUACION_PREVIA_REQUERIDA: Para evaluar la Cuota ${cuotaNumero} se requiere que la Cuota ${cuotaNumero - 1} haya sido evaluada previamente.`);
      }

      rachaAntes = await obtenerRachaActivaPrevia(db, solicitudId, cuotaNumero, transaction);
    }

    let exigibleAcumuladoCentavos = 0;
    for (let i = 0; i < cuotaNumero && i < snapshot.cuotas.length; i++) {
      exigibleAcumuladoCentavos += snapshot.cuotas[i].montoTotalCentavos;
    }

    const pagadoCalificableCentavos = await calcularPagadoCalificableHasta(
      db,
      solicitudId,
      fechaVencimiento,
      transaction
    );

    const umbral80Centavos = Math.ceil(exigibleAcumuladoCentavos * 0.80);
    const cumple80 = pagadoCalificableCentavos >= umbral80Centavos;

    const resultado: ResultadoEvaluacionVencimiento = cumple80 ? "CUMPLIDO_80" : "INCUMPLIMIENTO";
    const rachaDespues = cumple80 ? 0 : rachaAntes + 1;
    const saldoArrastradoCentavos = Math.max(0, exigibleAcumuladoCentavos - pagadoCalificableCentavos);

    const porcentajeBasisPoints = exigibleAcumuladoCentavos === 0 
      ? 10000 
      : Math.floor((pagadoCalificableCentavos / exigibleAcumuladoCentavos) * 10000);

    const nuevaEvaluacion: EvaluacionVencimiento = {
      id: evalId,
      solicitudId,
      cuotaNumero,
      fechaVencimiento,
      fechaEvaluacion: new Date().toISOString(),
      exigibleAcumuladoCentavos,
      pagadoCalificableCentavosAlEvento: pagadoCalificableCentavos,
      porcentajeCumplimientoBasisPoints: porcentajeBasisPoints,
      resultado,
      saldoArrastradoCentavos,
      rachaAntes,
      rachaDespues,
      ledgerRevisionEvaluada,
      creadoPor,
      createdAt: new Date().toISOString()
    };

    transaction.create(evalRef, nuevaEvaluacion);
    return nuevaEvaluacion;
  });
}

/**
 * REQUISITO A, B, C: Calcular el estado de cumplimiento AS OF fechaReferencia.
 */
export async function calcularEstadoCumplimientoOperacion(
  db: admin.firestore.Firestore,
  solicitudId: string,
  fechaReferenciaInput?: string | Date | null
): Promise<EstadoCumplimientoCalculado> {
  const fechaRefYYYYMMDD = obtenerFechaCalendarioArgentina(fechaReferenciaInput);

  const solDoc = await db.collection("solicitudes").doc(solicitudId).get();
  if (!solDoc.exists) {
    throw new Error("404:SOLICITUD_NO_ENCONTRADA: La solicitud especificada no existe.");
  }

  const solData = solDoc.data() || {};
  const snapshot = obtenerSnapshotFinancieroCanonico(solData);

  // REQUISITO CANÓNICO AS OF: Pagos calificables acumulados hasta fechaRefYYYYMMDD
  const pagadoCalificableActualCentavos = await calcularPagadoCalificableHasta(db, solicitudId, fechaRefYYYYMMDD);
  const saldoTotalCentavosASOF = Math.max(0, snapshot.totalContractualCentavos - pagadoCalificableActualCentavos);

  // Si el saldo total AS OF fechaReferencia es 0, CANCELADO
  if (saldoTotalCentavosASOF === 0) {
    return {
      solicitudId,
      estadoActual: "CANCELADO",
      rachaActiva: 0,
      ultimoVencimientoEvaluado: null,
      proximoVencimiento: null,
      cuotaProximaNumero: null,
      montoProximaCuotaCentavos: null,
      saldoExigibleActualCentavos: 0,
      saldoTotalCentavos: 0,
      porcentajeCubiertoExigibleBasisPoints: 10000,
      cicloCuraVigente: null,
      historialCiclosCura: [],
      fechaInicioCura: null,
      fechaLimiteCura: null,
      diasRestantesCura: null
    };
  }

  const planFechas = calcularFechasVencimientoPlan(solData, snapshot.cuotas.length);
  const cuotasVencidas = planFechas.filter(f => f.fechaVencimiento <= fechaRefYYYYMMDD);
  const proximaCuota = planFechas.find(f => f.fechaVencimiento > fechaRefYYYYMMDD);

  let exigibleAcumuladoVigenteCentavos = 0;
  cuotasVencidas.forEach(cv => {
    const cuotaDef = snapshot.cuotas.find(c => c.numero === cv.numero);
    if (cuotaDef) {
      exigibleAcumuladoVigenteCentavos += cuotaDef.montoTotalCentavos;
    }
  });

  const saldoExigibleActualCentavos = Math.max(0, exigibleAcumuladoVigenteCentavos - pagadoCalificableActualCentavos);

  const porcentajeCubiertoBasisPoints = exigibleAcumuladoVigenteCentavos === 0
    ? 10000
    : Math.floor((pagadoCalificableActualCentavos / exigibleAcumuladoVigenteCentavos) * 10000);

  const cumple80Vigente = pagadoCalificableActualCentavos >= Math.ceil(exigibleAcumuladoVigenteCentavos * 0.80);

  const { historialCiclos, rachaActivaActual, cicloVigente } = await reconstruirCiclosCuraOperacion(
    db,
    solicitudId,
    fechaRefYYYYMMDD
  );

  let estadoActual: EstadoCumplimientoOperacion = "AL_DIA";
  let fechaInicioCura: string | null = null;
  let fechaLimiteCura: string | null = null;
  let diasRestantesCura: number | null = null;

  if (cicloVigente) {
    fechaInicioCura = cicloVigente.fechaInicio;
    fechaLimiteCura = cicloVigente.fechaLimite;

    if (cicloVigente.resultadoDerivado === "CURADA") {
      estadoActual = "CURADO";
    } else if (cicloVigente.resultadoDerivado === "EN_CURSO") {
      estadoActual = "EN_PERIODO_CURA";
      const [y1, m1, d1] = fechaRefYYYYMMDD.split("-").map(Number);
      const [y2, m2, d2] = fechaLimiteCura.split("-").map(Number);
      const t1 = Date.UTC(y1, m1 - 1, d1);
      const t2 = Date.UTC(y2, m2 - 1, d2);
      diasRestantesCura = Math.max(0, Math.ceil((t2 - t1) / (1000 * 60 * 60 * 24)));
    } else {
      estadoActual = "CURA_VENCIDA";
    }
  } else if (rachaActivaActual === 1) {
    estadoActual = cumple80Vigente ? "AL_DIA" : "INCUMPLIMIENTO_1";
  } else {
    estadoActual = "AL_DIA";
  }

  const cuotaProximaDef = proximaCuota ? snapshot.cuotas.find(c => c.numero === proximaCuota.numero) : null;

  return {
    solicitudId,
    estadoActual,
    rachaActiva: rachaActivaActual,
    ultimoVencimientoEvaluado: cuotasVencidas.length > 0 ? cuotasVencidas[cuotasVencidas.length - 1].fechaVencimiento : null,
    proximoVencimiento: proximaCuota ? proximaCuota.fechaVencimiento : null,
    cuotaProximaNumero: proximaCuota ? proximaCuota.numero : null,
    montoProximaCuotaCentavos: cuotaProximaDef ? cuotaProximaDef.montoTotalCentavos : null,
    saldoExigibleActualCentavos,
    saldoTotalCentavos: saldoTotalCentavosASOF,
    porcentajeCubiertoExigibleBasisPoints: porcentajeCubiertoBasisPoints,
    cicloCuraVigente: cicloVigente,
    historialCiclosCura: historialCiclos,
    fechaInicioCura,
    fechaLimiteCura,
    diasRestantesCura
  };
}

/**
 * Job backend con procesamiento secuencial.
 */
export async function evaluarVencimientosPendientes(
  db: admin.firestore.Firestore,
  fechaReferenciaInput?: string | Date | null
): Promise<{ 
  evaluadosCount: number; 
  evaluaciones: EvaluacionVencimiento[];
  incidencias: Array<{ solicitudId: string; error: string }>;
}> {
  const fechaRefYYYYMMDD = obtenerFechaCalendarioArgentina(fechaReferenciaInput);
  const solicitudesSnap = await db.collection("solicitudes").get();

  const evaluacionesGeneradas: EvaluacionVencimiento[] = [];
  const incidencias: Array<{ solicitudId: string; error: string }> = [];

  for (const doc of solicitudesSnap.docs) {
    const solData = doc.data();
    if (!solData.fechaEntregaReal && !solData.fechaEntrega) continue;

    const version = solData.propuestaAceptada?.pricingSchemaVersion || solData.pricingSchemaVersion;
    if (version !== "CANONICAL_V1") continue;

    try {
      const snapshot = obtenerSnapshotFinancieroCanonico(solData);
      const planFechas = calcularFechasVencimientoPlan(solData, snapshot.cuotas.length);

      for (const item of planFechas) {
        if (item.fechaVencimiento <= fechaRefYYYYMMDD) {
          const ev = await evaluarVencimientoCuota(
            db,
            solData,
            item.numero,
            item.fechaVencimiento,
            "SCHEDULER_JOB"
          );
          evaluacionesGeneradas.push(ev);
        }
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message || String(err);
      console.error(`Error procesando vencimientos para solicitud ${doc.id}:`, msg);
      incidencias.push({ solicitudId: doc.id, error: msg });
    }
  }

  return {
    evaluadosCount: evaluacionesGeneradas.length,
    evaluaciones: evaluacionesGeneradas,
    incidencias
  };
}

/**
 * Registrar promesa de pago append-only guardando baseline.
 */
export async function registrarPromesaPago(
  db: admin.firestore.Firestore,
  params: {
    solicitudId: string;
    clienteId: string;
    fechaPrometida: string;
    montoPrometidoCentavos?: number | null;
    nota?: string | null;
    creadaPor: string;
    creadaPorRol: "ADMIN" | "VENDEDOR_AFILIADO" | "CLIENTE";
  }
): Promise<PromesaPago> {
  const baselinePagado = await obtenerPagosCalificablesCentavos(db, params.solicitudId);
  const id = `prom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const promesa: PromesaPago = {
    id,
    solicitudId: params.solicitudId,
    clienteId: params.clienteId,
    fechaPrometida: params.fechaPrometida.trim(),
    montoPrometidoCentavos: params.montoPrometidoCentavos || null,
    pagadoCalificableCentavosAlCrear: baselinePagado,
    nota: params.nota ? params.nota.trim() : null,
    creadaPor: params.creadaPor,
    creadaPorRol: params.creadaPorRol,
    createdAt: new Date().toISOString()
  };

  await db.collection("promesas_pago").doc(id).set(promesa);
  return promesa;
}

/**
 * Obtener promesas de pago derivando su estado dinámicamente.
 */
export async function obtenerPromesasPagoOperacion(
  db: admin.firestore.Firestore,
  solicitudId: string,
  fechaReferenciaInput?: string | Date | null
): Promise<PromesaPago[]> {
  const fechaRefYYYYMMDD = obtenerFechaCalendarioArgentina(fechaReferenciaInput);
  const snap = await db.collection("promesas_pago")
    .where("solicitudId", "==", solicitudId)
    .get();

  const rawPromesas: PromesaPago[] = [];
  snap.forEach(d => rawPromesas.push(d.data() as PromesaPago));

  rawPromesas.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const resultado: PromesaPago[] = [];

  for (let i = 0; i < rawPromesas.length; i++) {
    const p = rawPromesas[i];
    const fechaCortePromesa = fechaRefYYYYMMDD < p.fechaPrometida ? fechaRefYYYYMMDD : p.fechaPrometida;
    const pagadoHastaPromesa = await calcularPagadoCalificableHasta(db, solicitudId, fechaCortePromesa);
    const nuevosPagos = Math.max(0, pagadoHastaPromesa - (p.pagadoCalificableCentavosAlCrear || 0));

    let estadoDerivado: EstadoPromesaPago = "VIGENTE";
    const hayPromesaPosterior = i < rawPromesas.length - 1;

    if (p.montoPrometidoCentavos && p.montoPrometidoCentavos > 0) {
      if (nuevosPagos >= p.montoPrometidoCentavos) {
        estadoDerivado = "CUMPLIDA";
      } else if (p.fechaPrometida < fechaRefYYYYMMDD) {
        estadoDerivado = "INCUMPLIDA";
      } else if (hayPromesaPosterior) {
        estadoDerivado = "SUPERADA";
      } else {
        estadoDerivado = "VIGENTE";
      }
    } else {
      if (nuevosPagos > 0) {
        estadoDerivado = "CUMPLIDA";
      } else if (p.fechaPrometida < fechaRefYYYYMMDD) {
        estadoDerivado = "INCUMPLIDA";
      } else if (hayPromesaPosterior) {
        estadoDerivado = "SUPERADA";
      } else {
        estadoDerivado = "VIGENTE";
      }
    }

    resultado.push({ ...p, estadoDerivado });
  }

  return resultado.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Registrar Ajuste Administrativo Server-Side Validado.
 */
export async function registrarAjusteAdministrativo(
  db: admin.firestore.Firestore,
  params: {
    solicitudId: string;
    referenciaEventoId: string;
    tipoAjuste: TipoAjusteAdministrativo;
    motivo: string;
    valorNuevo: Record<string, unknown>;
    adminUid: string;
  }
): Promise<AjusteAdministrativoVencimiento> {
  if (!params.motivo || !params.motivo.trim()) {
    throw new Error("400:MOTIVO_REQUERIDO: Se requiere motivo para el ajuste administrativo.");
  }
  if (!params.adminUid || !params.adminUid.trim()) {
    throw new Error("401:IDENTIDAD_ADMIN_REQUERIDA: Se requiere identidad autenticada de administrador.");
  }

  const evalRef = db.collection("evaluaciones_vencimiento").doc(params.referenciaEventoId);
  const evalSnap = await evalRef.get();

  if (!evalSnap.exists) {
    throw new Error("404:EVENTO_EVALUACION_NO_ENCONTRADO: El evento de evaluación referenciado no existe.");
  }

  const evalData = evalSnap.data() as EvaluacionVencimiento;
  if (evalData.solicitudId !== params.solicitudId) {
    throw new Error("403:AJUSTE_SOLICITUD_MISMATCH: El evento de evaluación no corresponde a la solicitud especificada.");
  }

  const valorAnteriorReal = {
    resultado: evalData.resultado,
    rachaDespues: evalData.rachaDespues,
    exigibleAcumuladoCentavos: evalData.exigibleAcumuladoCentavos
  };

  const id = `ajuste_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const ajuste: AjusteAdministrativoVencimiento = {
    id,
    solicitudId: params.solicitudId,
    referenciaEventoId: params.referenciaEventoId,
    tipoAjuste: params.tipoAjuste,
    motivo: params.motivo.trim(),
    valorAnterior: valorAnteriorReal,
    valorNuevo: params.valorNuevo,
    adminUid: params.adminUid.trim(),
    createdAt: new Date().toISOString()
  };

  await db.collection("ajustes_vencimiento").doc(id).set(ajuste);
  return ajuste;
}

/**
 * REQUISITO F: Notificaciones e Histórico Interno Idempotente.
 */
export async function prepararNotificacionCumplimiento(
  db: admin.firestore.Firestore,
  solicitudId: string,
  tipo: NotificacionCumplimiento["tipo"],
  fechaRefInput?: string | Date | null
): Promise<NotificacionCumplimiento> {
  const fechaRef = obtenerFechaCalendarioArgentina(fechaRefInput);
  const id = `notif_${solicitudId}_${tipo}_${fechaRef}`;
  const ref = db.collection("notificaciones_cumplimiento").doc(id);

  const existing = await ref.get();
  if (existing.exists) {
    return existing.data() as NotificacionCumplimiento;
  }

  const notif: NotificacionCumplimiento = {
    id,
    solicitudId,
    tipo,
    fechaRef,
    createdAt: new Date().toISOString(),
    procesada: false
  };

  await ref.set(notif);
  return notif;
}

/**
 * Helper Canónico para reconstruir el saldo financiero total AS OF fechaReferencia.
 */
export async function calcularSaldoTotalOperacionHasta(
  db: admin.firestore.Firestore,
  solicitudId: string,
  fechaReferenciaInput?: string | Date | null
): Promise<{ totalContractualCentavos: number; pagadoHastaCentavos: number; saldoTotalCentavos: number }> {
  const solDoc = await db.collection("solicitudes").doc(solicitudId).get();
  if (!solDoc.exists) {
    throw new Error("404:SOLICITUD_NO_ENCONTRADA: La solicitud especificada no existe.");
  }
  const solData = solDoc.data() || {};
  const snapshot = obtenerSnapshotFinancieroCanonico(solData);
  const fechaRefYYYYMMDD = obtenerFechaCalendarioArgentina(fechaReferenciaInput);
  const pagadoHastaCentavos = await calcularPagadoCalificableHasta(db, solicitudId, fechaRefYYYYMMDD);
  const saldoTotalCentavos = Math.max(0, snapshot.totalContractualCentavos - pagadoHastaCentavos);

  return {
    totalContractualCentavos: snapshot.totalContractualCentavos,
    pagadoHastaCentavos,
    saldoTotalCentavos
  };
}
