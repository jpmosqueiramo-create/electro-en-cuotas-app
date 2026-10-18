import type { Firestore } from "firebase-admin/firestore";
import { assertC5AApplyDisabled } from "../../src/lib/catalogBackfillPolicy";
import type { inventoryCatalog } from "../../src/lib/catalogPrivacyInventory";
import { publishCatalogReference } from "../../src/lib/catalogPublicationService";

/** Preparado para revisión C5B. Inalcanzable en C5A: sin override por flag/env. */
export async function applyCatalogBackfillC5B(db:Firestore,plan:ReturnType<typeof inventoryCatalog>["plan"]){
  const enforceC5AGuard: () => void = assertC5AApplyDisabled;
  enforceC5AGuard();
  const results:{referenciaId:string;status:"PUBLISHED"|"FAILED";attempts:number}[]=[];
  for(const entry of plan){
    // C2 relee, verifica fingerprint, full replace e idempotencia por el mismo ID.
    for(let attempt=1;attempt<=3;attempt++){
      try{
        await publishCatalogReference(db,entry.referenciaId,entry.expectedFingerprint);
        results.push({referenciaId:entry.referenciaId,status:"PUBLISHED",attempts:attempt});
        break;
      }catch{
        if(attempt===3)results.push({referenciaId:entry.referenciaId,status:"FAILED",attempts:attempt});
      }
    }
  }
  return results;
}
