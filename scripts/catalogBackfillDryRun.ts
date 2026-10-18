import { writeFileSync } from "node:fs";
import { parseCatalogBackfillOptions,assertCatalogInventoryEnvironment } from "../src/lib/catalogBackfillPolicy";
import { readCatalogPrivacyInventory } from "../src/lib/catalogPrivacyInventory";
async function main(){
  // Validar antes de importar Admin o abrir conexión; producción no autorizada.
  const options=parseCatalogBackfillOptions(process.argv.slice(2));
  assertCatalogInventoryEnvironment(options,process.env);
  const {admin}=await import("../src/lib/firebaseAdmin");
  try {
    const {summary}=await readCatalogPrivacyInventory(admin.firestore());
    const text=JSON.stringify(summary,null,2)+"\n";
    if(options.output)writeFileSync(options.output,text,{flag:"wx",mode:0o600});
    else process.stdout.write(text);
  }finally{await admin.app().delete();}
}
main().catch(error=>{console.error(error instanceof Error?error.message:"INVENTORY_FAILED");process.exitCode=1;});
