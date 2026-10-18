import { openSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";

export const productionInventoryProject = "negocio-facil-page";
export function parseProductionInventoryOptions(args: readonly string[]) {
  let readOnly = false, project: string | undefined, output: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--production-read-only") {
      if (readOnly) throw new Error("DUPLICATE_READ_ONLY_FLAG");
      readOnly = true;
    } else if (arg === "--confirm-project" || arg === "--output") {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error("MISSING_FLAG_VALUE");
      if (arg === "--confirm-project") {
        if (project) throw new Error("DUPLICATE_PROJECT_FLAG");
        project = value;
      } else {
        if (output) throw new Error("DUPLICATE_OUTPUT_FLAG");
        output = value;
      }
    } else throw new Error("UNKNOWN_PRODUCTION_INVENTORY_FLAG");
  }
  if (!readOnly || project !== productionInventoryProject || !output) throw new Error("EXPLICIT_PRODUCTION_READ_ONLY_PROJECT_OUTPUT_REQUIRED");
  return { project, output };
}
export function assertProductionInventoryEnvironment(env: Record<string, string | undefined>) {
  for (const key of ["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST"]) {
    if (env[key] !== undefined) throw new Error("EMULATOR_ENVIRONMENT_NOT_ALLOWED");
  }
  if (env.GCLOUD_PROJECT !== productionInventoryProject || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== productionInventoryProject ||
      (env.GOOGLE_CLOUD_PROJECT !== undefined && env.GOOGLE_CLOUD_PROJECT !== productionInventoryProject)) throw new Error("PRODUCTION_PROJECT_ENVIRONMENT_MISMATCH");
  if (env.FIREBASE_CLIENT_EMAIL || env.FIREBASE_PRIVATE_KEY) throw new Error("USE_EXISTING_ADC_ONLY");
}
export function assertProductionInventoryApp(projectId: string | undefined) {
  if (projectId !== productionInventoryProject) throw new Error("INITIALIZED_APP_PROJECT_MISMATCH");
}
export function openProtectedProductionOutput(output: string, repository: string) {
  if (!isAbsolute(output)) throw new Error("ABSOLUTE_OUTPUT_PATH_REQUIRED");
  const canonical = resolve(realpathSync(dirname(output)), basename(output));
  const distance = relative(realpathSync(repository), canonical);
  if (!distance || (!distance.startsWith(`..${sep}`) && distance !== ".." && !isAbsolute(distance))) throw new Error("OUTPUT_MUST_BE_OUTSIDE_REPOSITORY");
  return { path: canonical, fd: openSync(canonical, "wx", 0o600) };
}
