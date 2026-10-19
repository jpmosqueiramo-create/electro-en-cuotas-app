import type { Firestore } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import { buildCatalogReferencePrivatePatch } from "./catalogReferenceEditor";
import { referenceSnapshotToDraft, validateBudgetV2, BudgetV2DomainError, budgetV2ExactObject, budgetV2OpaqueId, type BudgetV2 } from "./budgetV2";

export interface BudgetCommandV2 { action:"SAVE"|"ISSUE"|"REVISE"; commandId:string; budget:BudgetV2; expectedRevision:number; privateOptionIds:string[] }
function canonical(value:unknown):unknown {
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)]));
  return value;
}
function hash(value:unknown){return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");}
export function privateBudgetReferenceId(budgetId:string,optionId:string){return `budget_${hash([budgetId,optionId])}`;}
export function parseBudgetCommandV2(value: unknown): BudgetCommandV2 {
  const cmd = budgetV2ExactObject(value, ["action", "commandId", "budget", "expectedRevision", "privateOptionIds"]);
  if (typeof cmd.action !== "string" || !["SAVE", "ISSUE", "REVISE"].includes(cmd.action) || !budgetV2OpaqueId(cmd.commandId) || typeof cmd.expectedRevision !== "number" || !Number.isSafeInteger(cmd.expectedRevision) || cmd.expectedRevision < 0) throw new BudgetV2DomainError("Comando inválido.");
  if (!Array.isArray(cmd.privateOptionIds) || cmd.privateOptionIds.some(id => !budgetV2OpaqueId(id)) || new Set(cmd.privateOptionIds).size !== cmd.privateOptionIds.length) throw new BudgetV2DomainError("Opciones privadas inválidas.");
  validateBudgetV2(cmd.budget, privateBudgetReferenceId);
  if (cmd.budget.revision !== cmd.expectedRevision) throw new BudgetV2DomainError("Conflicto de revisión.");
  return cmd as unknown as BudgetCommandV2;
}
/** Admin-only server service. Never embeds private snapshots in owner-readable solicitudes. */
export async function persistBudgetV2(db:Firestore,input:unknown,actor:string):Promise<BudgetV2>{
  const cmd = parseBudgetCommandV2(input);
  const family=db.collection("presupuestos_v2").doc(cmd.budget.id);
  const versionRef=family.collection("versions").doc(String(cmd.budget.version));
  const commandRef=family.collection("commands").doc(cmd.commandId);
  const digest=hash(cmd);
  return db.runTransaction(async tx=>{
    const [familySnap,current,command,source]=await Promise.all([tx.get(family),tx.get(versionRef),tx.get(commandRef),tx.get(db.collection(cmd.budget.sourceCollection).doc(cmd.budget.solicitudId))]);
    if(command.exists){if(command.data()!.digest!==digest)throw new BudgetV2DomainError("Conflicto: commandId ya usado.");const result = command.data()!.result; validateBudgetV2(result, privateBudgetReferenceId); return result;}
    if(!source.exists)throw new BudgetV2DomainError("La solicitud original no existe.");
    if(familySnap.exists&&(familySnap.data()!.sourceCollection!==cmd.budget.sourceCollection||familySnap.data()!.solicitudId!==cmd.budget.solicitudId))throw new BudgetV2DomainError("Conflicto de origen.");
    const old=current.exists?current.data() as BudgetV2:null;
    if (old) validateBudgetV2(old, privateBudgetReferenceId);
    if(old&&old.revision!==cmd.expectedRevision)throw new BudgetV2DomainError("Conflicto: otra sesión actualizó esta versión. Reabrí antes de continuar.");
    if(!old&&(cmd.expectedRevision!==0||cmd.budget.version!==1||familySnap.exists))throw new BudgetV2DomainError("Versión inexistente o ya creada.");
    if(cmd.action!=="SAVE"&&!old)throw new BudgetV2DomainError("Guardá primero el presupuesto.");
    if(old?.estado==="EMITIDO"&&cmd.action!=="REVISE")throw new BudgetV2DomainError("La versión emitida es inmutable.");
    if(cmd.action==="REVISE"&&old?.estado!=="EMITIDO")throw new BudgetV2DomainError("Sólo una versión emitida admite revisión.");
    if(cmd.action==="ISSUE"&&(hash(cmd.budget.options)!==hash(old!.options)||hash(cmd.budget.clienteSnapshot)!==hash(old!.clienteSnapshot)))throw new BudgetV2DomainError("Guardá los cambios antes de emitir.");
    // A browser-supplied deterministic ID must also have confirmed private provenance.
    for (const option of cmd.budget.options) {
      const snapshot = option.referenceSnapshot;
      if (snapshot.source === "NEW_REFERENCE" && snapshot.referenceId !== null) {
        const linked = await tx.get(db.collection("productos").doc(snapshot.referenceId));
        if (!linked.exists || linked.data()!.originBudgetId !== cmd.budget.id || linked.data()!.originOptionId !== option.optionId) throw new BudgetV2DomainError("Referencia privada no confirmada.");
      }
    }
    let next:BudgetV2;const now=new Date().toISOString();
    let target=versionRef;
    if(cmd.action==="REVISE"){
      const version=Number(familySnap.data()!.lastVersion)+1;
      if(version!==old!.version+1)throw new BudgetV2DomainError("Ya existe una revisión posterior.");
      target=family.collection("versions").doc(String(version));
      if((await tx.get(target)).exists)throw new BudgetV2DomainError("La revisión ya existe.");
      next={...structuredClone(old!),version,estado:"GENERADO",revision:1,revisionOf:old!.version,createdAt:now,updatedAt:now,issuedAt:null};
    }else if(cmd.action==="ISSUE")next={...old!,estado:"EMITIDO",revision:old!.revision+1,issuedAt:now,updatedAt:now};
    else next={schemaVersion:"BUDGET_V2",id:cmd.budget.id,version:cmd.budget.version,sourceCollection:cmd.budget.sourceCollection,solicitudId:cmd.budget.solicitudId,
      clienteSnapshot:structuredClone(cmd.budget.clienteSnapshot),options:structuredClone(cmd.budget.options),estado:"GENERADO",revision:(old?.revision??0)+1,
      revisionOf:old?.revisionOf??null,createdAt:old?.createdAt??now,updatedAt:now,issuedAt:null};
    const privateOptions=cmd.action==="SAVE"?next.options.filter(o=>cmd.privateOptionIds.includes(o.optionId)):[];
    if(cmd.action==="SAVE"&&cmd.privateOptionIds.some(id=>!next.options.some(o=>o.optionId===id&&o.referenceSnapshot.source==="NEW_REFERENCE")))throw new BudgetV2DomainError("Alta privada sólo para opción nueva.");
    const privateDocs=await Promise.all(privateOptions.map(o=>tx.get(db.collection("productos").doc(privateBudgetReferenceId(next.id,o.optionId)))));
    for(let i=0;i<privateOptions.length;i++){
      const option=privateOptions[i],snap=privateDocs[i],id=snap.id;
      if(snap.exists){if(snap.data()!.originBudgetId!==next.id||snap.data()!.originOptionId!==option.optionId)throw new BudgetV2DomainError("Colisión de referencia privada ajena.");}
      else tx.create(snap.ref,{...buildCatalogReferencePrivatePatch(referenceSnapshotToDraft(option.referenceSnapshot)),activo:false,publicado:false,originBudgetId:next.id,originOptionId:option.optionId,fechaCreacion:now});
      next.options=next.options.map(o=>o.optionId===option.optionId?{...o,referenceSnapshot:{...o.referenceSnapshot,referenceId:id}}:o);
    }
    tx.set(target,next);
    tx.set(family,{sourceCollection:next.sourceCollection,solicitudId:next.solicitudId,lastVersion:Math.max(next.version,Number(familySnap.data()?.lastVersion??0)),updatedAt:now});
    tx.create(commandRef,{digest,result:next,actor,createdAt:now});
    return next;
  });
}
