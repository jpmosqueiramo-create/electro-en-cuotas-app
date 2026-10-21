import { NextRequest, NextResponse } from "next/server";
import {portalIdentity} from "@/lib/legacyPortalServer";
import {contractJson,contractHeaders} from "@/lib/contractV2Http";
import {isPublicSolicitudOriginAllowed} from "@/lib/publicSolicitudOrigin";
import { admin } from "@/lib/firebaseAdmin";
import { verifyClientAuth } from "@/lib/clientAuth";

export async function POST(req: NextRequest) {
  try {
    await portalIdentity(req);
    if(!req.headers.get('origin')||!isPublicSolicitudOriginAllowed(req.headers.get('origin')))return NextResponse.json({error:'Origen no permitido.'},{status:403,headers:contractHeaders});
    const body = await contractJson(req) as Record<string,unknown>;
    const {
      commandId,
      solicitudId,
      montoInformadoCentavos,
      moneda = "ARS",
      medioPago,
      referenciaTransferencia,
      comprobanteStoragePath,
      receptorDeclarado,
      observacionCliente
    } = body;

    if (typeof solicitudId!=='string'||!solicitudId||solicitudId.includes('/')||solicitudId.length>200||montoInformadoCentavos === undefined || !medioPago) {
      return NextResponse.json({ error: "400:PAGO_INFORMADO_PARAMETROS_INVALIDOS: Se requieren solicitudId, montoInformadoCentavos y medioPago." }, { status: 400 });
    }

    const montoNum = Number(montoInformadoCentavos);
    if (!Number.isSafeInteger(montoNum) || montoNum <= 0) {
      return NextResponse.json({ error: "400:PAGO_INFORMADO_MONTO_INVALIDO: montoInformadoCentavos debe ser un entero positivo seguro en centavos." }, { status: 400 });
    }

    if (moneda !== "ARS" && moneda !== "USD") {
      return NextResponse.json({ error: "400:PAGO_INFORMADO_MONEDA_INVALIDA: La moneda debe ser expresamente ARS o USD." }, { status: 400 });
    }

    if (medioPago !== "TRANSFERENCIA" && medioPago !== "EFECTIVO") {
      return NextResponse.json({ error: "400:MEDIO_PAGO_INVALIDO: Únicamente se admiten los medios de pago TRANSFERENCIA o EFECTIVO." }, { status: 400 });
    }

    const authCheck = await verifyClientAuth(req, String(solicitudId));
    if (!authCheck.authorized) {
      return authCheck.errorResponse!;
    }

    const db = admin.firestore();
    const solSnap = await db.collection("solicitudes").doc(String(solicitudId)).get();
    if (!solSnap.exists) {
      return NextResponse.json({ error: "La solicitud especificada no existe." }, { status: 404 });
    }

    const solData = solSnap.data() || {};
    if(solData.operationId||solData.contractSnapshotV2)return NextResponse.json({error:"Esta acción corresponde únicamente al circuito histórico."},{status:403});
    if(commandId!==undefined&&(typeof commandId!=="string"||! /^[0-9a-f-]{36}$/i.test(commandId)))return NextResponse.json({error:"Identificador de envío inválido."},{status:400});
    if([observacionCliente,referenciaTransferencia,receptorDeclarado].some(v=>v!==undefined&&v!==null&&(typeof v!=="string"||v.length>2000)))return NextResponse.json({error:"Texto inválido."},{status:400});
    const pagoInformadoId = commandId ? "portal_"+authCheck.clienteId+"_"+commandId : "pago_inf_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
    const timestampIso = new Date().toISOString();

    const pagoInformadoDoc = {
      id: pagoInformadoId,
      solicitudId,
      clienteId: solData.clienteId || solData.dni || solData.datosPersonales?.dni || "SN",
      montoInformadoCentavos: montoNum,
      moneda,
      medioPago,
      fechaInformada: timestampIso,
      fechaCarga: timestampIso,
      estadoValidacion: "PENDIENTE_VALIDACION",
      observacionCliente: observacionCliente || null,
      referenciaTransferencia: referenciaTransferencia || null,
      comprobanteStoragePath: comprobanteStoragePath || null,
      receptorDeclarado: receptorDeclarado || null
    };

    const ref=db.collection("pagos_informados").doc(pagoInformadoId);
    const saved=await db.runTransaction(async tx=>{
      const owner=await tx.get(db.collection('solicitudes').doc(solicitudId));
      if(owner.data()?.clienteAuthUid!==authCheck.clienteId||owner.data()?.operationId||owner.data()?.contractSnapshotV2)throw Error('OWNER_CHANGED');
      const current=await tx.get(ref);
      if(current.exists){const d=current.data()!;if(d.solicitudId!==solicitudId||d.montoInformadoCentavos!==montoNum||d.medioPago!==medioPago||d.moneda!==moneda||d.referenciaTransferencia!==(referenciaTransferencia||null)||d.observacionCliente!==(observacionCliente||null)||d.receptorDeclarado!==(receptorDeclarado||null)||d.comprobanteStoragePath!==(comprobanteStoragePath||null))throw Error("REPLAY_CONFLICT");return d;}
      tx.create(ref,pagoInformadoDoc);return pagoInformadoDoc;
    });

    return NextResponse.json({ ok: true, pagoInformado: saved },{headers:contractHeaders});

  } catch (error: unknown) {
    return NextResponse.json({ error: "No se confirmó el informe de pago. Reintentá el mismo envío." }, { status: error instanceof Error&&error.message==="REPLAY_CONFLICT"?409:403,headers:contractHeaders });
  }
}

export async function GET(req: NextRequest) {
  try {
    await portalIdentity(req);
    const { searchParams } = new URL(req.url);
    const solicitudId = searchParams.get("solicitudId");

    if (!solicitudId) {
      return NextResponse.json({ error: "Parámetro solicitudId requerido." }, { status: 400 });
    }

    const authCheck = await verifyClientAuth(req, solicitudId);
    if (!authCheck.authorized) {
      return authCheck.errorResponse!;
    }

    const db = admin.firestore();
    const snap = await db.collection("pagos_informados")
      .where("solicitudId", "==", solicitudId)
      .limit(201).get();

    const pagosInformados: Record<string, unknown>[] = [];
    snap.docs.slice(0,200).forEach(d => {const v=d.data();pagosInformados.push({id:d.id,montoInformadoCentavos:v.montoInformadoCentavos,moneda:v.moneda,medioPago:v.medioPago,estadoValidacion:v.estadoValidacion,fechaCarga:v.fechaCarga});});

    return NextResponse.json({ ok: true, pagosInformados,partial:snap.size>200 },{headers:contractHeaders});

  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error?"No se pudo consultar los informes de pago.":"Consulta no disponible." }, { status: 403,headers:contractHeaders });
  }
}
