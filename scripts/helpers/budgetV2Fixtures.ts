import { createCatalogReferenceDraft } from "../../src/lib/catalogReferenceEditor";
import { buildBudgetOptionV2 } from "../../src/lib/budgetReferenceV2";
import type { BudgetV2 } from "../../src/lib/budgetV2";
export function budgetFixture(id="budget-demo",count=2):BudgetV2{
  const options=Array.from({length:count},(_,i)=>{const draft=createCatalogReferenceDraft();Object.assign(draft,{nombre:`Referencia ${i+1}`,descripcion:"Gestión de compra",costoProveedor:"580000",proveedor:"SECRET_PROVIDER",skuInterno:"SECRET_SKU",codigoBarras:"SECRET_EAN"});for(const n of i===0?[8,12]:[12,18])draft.planesActivos[n]=true;return buildBudgetOptionV2(`option-${i}`,{draft,fechaCotizacion:"2026-10-18T12:00:00.000Z",source:"NEW_REFERENCE",referenceId:null});});
  return {schemaVersion:"BUDGET_V2",id,version:1,sourceCollection:"solicitudes",solicitudId:"p3-shared-id",clienteSnapshot:{nombre:"Cliente demo",dni:"12345678",cuil:"",whatsapp:"5491100000000",localidad:"Lincoln"},options,estado:"GENERADO",revision:0,revisionOf:null,issuedAt:null,createdAt:"2026-10-18T12:00:00.000Z",updatedAt:"2026-10-18T12:00:00.000Z"};
}
