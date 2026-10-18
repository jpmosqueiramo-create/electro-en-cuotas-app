import type { Firestore } from "firebase-admin/firestore";
import type { CatalogReferencePublic } from "./catalogReference";
import { adaptarReferenciaCatalogoLegacy } from "./catalogReference";
import { assertCatalogReferenceId, prepareCatalogPublication, fingerprintCatalogReference, isCurrentCatalogProjection } from "./catalogPublicationContent";
import { parsePublicCatalogReference } from "./publicCatalogContract";

export const inventoryCategories = ["READY_NEW","READY_UPDATE","ALREADY_CURRENT","NOT_ELIGIBLE","INVALID_PRIVATE","PUBLIC_ORPHAN","PUBLIC_MALFORMED","IDENTITY_CONFLICT","REVIEW_REQUIRED"] as const;
export type InventoryCategory = typeof inventoryCategories[number];
export type InventoryDocument = { id: string; data: Readonly<Record<string, unknown>> };
const sensitive = new Set(["sku","skuInterno","ean","codigoBarras","codigoProducto","costo","costoProducto","costoProveedor","proveedor","factor","factoresPlanes","precioContado","precioAnterior","tna","tasaInteresTna","tasaMora","mora","margen","stock","fingerprint","revision","expectedFingerprint"]);
export function sensitiveFieldCount(value: unknown, seen = new WeakSet<object>()): number {
  if (!value || typeof value !== "object" || seen.has(value)) return 0;
  const prototype=Object.getPrototypeOf(value);
  if(!Array.isArray(value) && prototype!==Object.prototype && prototype!==null)return 0;
  seen.add(value);
  return Object.entries(value).reduce((sum,[key,entry]) => sum + Number(sensitive.has(key)) + sensitiveFieldCount(entry,seen),0);
}
const publicKeys = ["referenciaId","nombre","descripcion","imagenUrls","planesPublicados","publicado","schemaVersion"];
function extras(raw: Readonly<Record<string, unknown>>): boolean {
  return Object.keys(raw).some(key=>!publicKeys.includes(key)) || (Array.isArray(raw.planesPublicados) && raw.planesPublicados.some(plan=>plan && typeof plan==="object" && Object.keys(plan).some(key=>!["cuotas","cuotaEstimada"].includes(key))));
}
function flag(value: unknown): true | false | "MISSING" | "INVALID" {return typeof value==="boolean"?value:value===undefined?"MISSING":"INVALID";}
function hasText(value: unknown): boolean {return typeof value==="string" && !!value.trim();}

export function inventoryCatalog(privateDocs: readonly InventoryDocument[], publicDocs: readonly InventoryDocument[]) {
  const privateMap=new Map(privateDocs.map(doc=>[doc.id,doc.data]));
  const publicMap=new Map(publicDocs.map(doc=>[doc.id,doc.data]));
  if(privateMap.size!==privateDocs.length || publicMap.size!==publicDocs.length)throw new Error("DUPLICATE_DOCUMENT_ID_IN_SNAPSHOT");
  const plan: { referenciaId: string; expectedFingerprint: string; action: "CREATE"|"REPLACE"; dto: CatalogReferencePublic }[]=[];
  const counts=Object.fromEntries(inventoryCategories.map(category=>[category,0])) as Record<InventoryCategory,number>;
  let parityCurrent=0,parityOutdated=0,parityInvalid=0;
  const rows=[...new Set([...privateMap.keys(),...publicMap.keys()])].sort().map(id=>{
    const raw=privateMap.get(id),pub=publicMap.get(id);
    let validId=true;try{assertCatalogReferenceId(id);}catch{validId=false;}
    const identityConflict=!validId || (pub!==undefined && pub.referenciaId!==id) || (raw!==undefined && [raw.referenciaId,raw.id].some(value=>value!==undefined && value!==id));
    const publicDto=pub?parsePublicCatalogReference(id,pub):null;
    const publicClean=!!publicDto && !extras(pub!) && sensitiveFieldCount(pub)===0;
    if(pub && !publicClean)parityInvalid++;
    const adapted=raw?adaptarReferenciaCatalogoLegacy(id,raw):null;
    const prepared=raw && validId?prepareCatalogPublication(id,raw):null;
    const outsideDomain=adapted ? Object.entries(adapted.planesActivos).some(([key,value])=>value && (!/^(?:[1-9]|1[0-8])$/.test(key))) : false;
    const explicitLegacy=raw?.activo===true && raw.publicado===true;
    const eligible=explicitLegacy || publicClean;
    const evidence=explicitLegacy?"EXPLICIT_LEGACY_FLAGS":publicClean?"EXISTING_PUBLIC_PROJECTION":"NONE";
    const reasons:string[]=[];
    let category:InventoryCategory;
    let proposedAction="NONE";
    if(identityConflict){category="IDENTITY_CONFLICT";reasons.push("DOCUMENT_ID_MISMATCH");proposedAction="REVIEW_REQUIRED";}
    else if(pub && !publicClean){category="PUBLIC_MALFORMED";reasons.push(!publicDto?"PUBLIC_CONTRACT_INVALID":"PUBLIC_EXTRA_FIELDS");proposedAction=explicitLegacy && prepared?.dto && !outsideDomain?"REPLACE_FROM_PRIVATE":"REVIEW_REQUIRED";}
    else if(!raw){category="PUBLIC_ORPHAN";reasons.push("NO_PRIVATE_REFERENCE");proposedAction="DELETE_REQUIRES_HUMAN_APPROVAL";}
    else if(outsideDomain){category="REVIEW_REQUIRED";reasons.push("ACTIVE_LEGACY_PLAN_OUTSIDE_1_18");proposedAction="REVIEW_REQUIRED";}
    else if(!eligible){
      category=raw.activo===false || raw.publicado===false?"NOT_ELIGIBLE":"REVIEW_REQUIRED";
      reasons.push(category==="NOT_ELIGIBLE"?"EXPLICIT_LEGACY_DISABLE":"AMBIGUOUS_OR_MISSING_PUBLICATION_FLAGS");
    }
    else if(!prepared?.dto){category="INVALID_PRIVATE";reasons.push("C1_VALIDATION_FAILED");}
    else if(!pub){category="READY_NEW";proposedAction="CREATE";}
    else if(isCurrentCatalogProjection(pub,prepared.dto)){category="ALREADY_CURRENT";parityCurrent++;}
    else{category="READY_UPDATE";proposedAction="REPLACE";parityOutdated++;}
    if((category==="READY_NEW" || category==="READY_UPDATE") && prepared?.dto && prepared.fingerprint){
      if(sensitiveFieldCount(prepared.dto)!==0)throw new Error("PROJECTED_DTO_SENSITIVE_FIELDS");
      plan.push({referenciaId:id,expectedFingerprint:prepared.fingerprint,action:category==="READY_NEW"?"CREATE":"REPLACE",dto:prepared.dto});
    }
    if(prepared?.dto && sensitiveFieldCount(prepared.dto)!==0)throw new Error("PROJECTED_DTO_SENSITIVE_FIELDS");
    counts[category]++;
    return {referenciaId:id,nombre:typeof raw?.nombre==="string"?raw.nombre:publicDto?.nombre??"",category,
      legacy:{activo:flag(raw?.activo),publicado:flag(raw?.publicado)},eligibilityEvidence:evidence,
      privateExists:!!raw,publicExists:!!pub,publicValidation:pub?{valid:publicClean,published:flag(pub.publicado),schemaVersion:typeof pub.schemaVersion==="number" && Number.isFinite(pub.schemaVersion)?pub.schemaVersion:null,sensitiveFields:sensitiveFieldCount(pub)}:null,
      c1Validation:prepared?.validation??null,imageCount:adapted?.imagenUrls.length??0,
      activePlans:adapted?Object.entries(adapted.planesActivos).filter(([key,value])=>value && /^(?:[1-9]|1[0-8])$/.test(key)).map(([key])=>Number(key)).sort((a,b)=>a-b):[],
      canProducePublicDto:!!prepared?.dto,publicMatches:prepared?.dto && pub?isCurrentCatalogProjection(pub,prepared.dto):null,
      privateFieldPresence:{SKU:hasText(raw?.skuInterno),EAN:hasText(raw?.codigoBarras),costo:raw?.costoProveedor!==undefined || raw?.costoProducto!==undefined,proveedor:hasText(raw?.proveedor)},
      projectedFingerprint:prepared?.fingerprint??null,proposedAction,reasons};
  });
  return { summary:{mode:"DRY_RUN" as const,counts,publicParity:{current:parityCurrent,outdated:parityOutdated,invalid:parityInvalid},dryRunSensitiveFieldLeaks:0,rows},plan };
}

/** Dos lecturas sin métodos de escritura, sin consultar operaciones históricas. */
export async function readCatalogPrivacyInventory(db: Pick<Firestore,"collection">) {
  const [privateSnapshot,publicSnapshot]=await Promise.all([db.collection("productos").get(),db.collection("catalogo_publico").get()]);
  return inventoryCatalog(privateSnapshot.docs.map(doc=>({id:doc.id,data:doc.data()})),publicSnapshot.docs.map(doc=>({id:doc.id,data:doc.data()})));
}

/** Huella del plan público; no incluye costos, factores ni datos privados. */
export function inventoryPlanIdentity(plan: ReturnType<typeof inventoryCatalog>["plan"]): string {
  return plan.map(entry=>`${entry.referenciaId}:${entry.action}:${fingerprintCatalogReference(entry.dto)}`).join("\n");
}
