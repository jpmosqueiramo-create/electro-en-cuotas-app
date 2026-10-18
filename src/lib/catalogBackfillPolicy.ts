import { assertSafeEmulatorEnvironment } from "../../scripts/helpers/assertSafeEmulatorEnvironment";
export function parseCatalogBackfillOptions(args: readonly string[]) {
  let mode:"dry-run"|"apply"="dry-run",confirmProject:string|undefined,output:string|undefined,modeSeen=false;
  for(let index=0;index<args.length;index++){
    const arg=args[index];
    if(arg==="--dry-run" || arg==="--apply"){
      if(modeSeen)throw new Error("DUPLICATE_BACKFILL_MODE");modeSeen=true;mode=arg==="--apply"?"apply":"dry-run";
    }else if(arg==="--confirm-project" || arg==="--output"){
      const value=args[++index];if(!value || value.startsWith("--"))throw new Error("MISSING_FLAG_VALUE");
      if(arg==="--confirm-project"){if(confirmProject)throw new Error("DUPLICATE_PROJECT_CONFIRMATION");confirmProject=value;}
      else{if(output)throw new Error("DUPLICATE_OUTPUT");output=value;}
    }else throw new Error("UNKNOWN_BACKFILL_FLAG");
  }
  if(!confirmProject)throw new Error("EXPLICIT_PROJECT_CONFIRMATION_REQUIRED");
  return {mode,confirmProject,output};
}
export function assertC5AApplyDisabled(): never {throw new Error("C5A_APPLY_DISABLED_REQUIRES_C5B_APPROVAL");}
export function assertCatalogInventoryEnvironment(options:ReturnType<typeof parseCatalogBackfillOptions>,env:Record<string,string|undefined>){
  if(options.mode==="apply")assertC5AApplyDisabled();
  if(options.confirmProject!=="demo-cuenta-hogar")throw new Error("C5A_PRODUCTION_INVENTORY_NOT_AUTHORIZED");
  const project=assertSafeEmulatorEnvironment(env);
  if(project!==options.confirmProject || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!==project || env.FIRESTORE_EMULATOR_HOST!=="127.0.0.1:8080" || env.FIREBASE_AUTH_EMULATOR_HOST!=="127.0.0.1:9099")throw new Error("PROJECT_OR_EMULATOR_MISMATCH");
  return project;
}
