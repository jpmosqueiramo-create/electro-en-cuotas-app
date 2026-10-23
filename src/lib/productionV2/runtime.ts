import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { approvedFinalPackages, validateFinalPackage, type FinalPackage } from './catalog';
import { isAdminEmail } from '../adminIdentity';
const byDatabase = new WeakMap<Firestore, ProductionRuntime>();
const registry = new WeakMap<object, {
    db: Firestore;
    auth: Auth;
    packages: readonly FinalPackage[];
    test: boolean;
    administrators: readonly string[];
}>();
declare const brand: unique symbol;
/** Runtime capability: a JSON object, UID, flag or operationId cannot construct it. */
export interface ProductionRuntime {
    readonly [brand]: true;
}
function make(db: Firestore, auth: Auth, packages: readonly FinalPackage[], test: boolean, administrators: readonly string[]) { const runtime = Object.freeze({}) as ProductionRuntime; packages.forEach(validateFinalPackage); registry.set(runtime, { db, auth, packages: structuredClone(packages), test, administrators }); return runtime; }
export function productionRuntime(db: Firestore, auth: Auth) {
    if (typeof window !== 'undefined' || (db as Firestore & {
        projectId: string;
    }).projectId !== 'negocio-facil-page' || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_STORAGE_EMULATOR_HOST)
        throw Error('PRODUCTION_RUNTIME_INVALID');
    return make(db, auth, approvedFinalPackages, false, (process.env.PRODUCTION_OPERATION_ADMIN_UIDS ?? '').split(',').map(s => s.trim()).filter(Boolean));
}
/** Only automated tests can install a synthetic package. Every use rechecks the local boundary. */
export function productionRuntimeForEmulator(db: Firestore, auth: Auth, packages: readonly FinalPackage[], administrators: readonly string[]) {
    const r = make(db, auth, packages, true, administrators);
    runtimeData(r);
    byDatabase.set(db, r);
    return r;
}
export function runtimeData(runtime: ProductionRuntime) {
    const r = registry.get(runtime);
    if (!r || typeof window !== 'undefined')
        throw Error('SERVER_PRODUCTION_CONTEXT_REQUIRED');
    if (r.test) {
        if ((r.db as Firestore & {
            projectId: string;
        }).projectId !== 'demo-cuenta-hogar' || process.env.GCLOUD_PROJECT !== 'demo-cuenta-hogar' || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'demo-cuenta-hogar' || process.env.NODE_ENV === 'production' || process.env.K_SERVICE || process.env.GAE_ENV || process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' || process.env.FIREBASE_STORAGE_EMULATOR_HOST !== '127.0.0.1:9199' || process.env.FIREBASE_CLIENT_EMAIL || !safeEmulatorConfig() || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
            throw Error('TEST_RUNTIME_LOCAL_ONLY');
    }
    else if ((r.db as Firestore & {
        projectId: string;
    }).projectId !== 'negocio-facil-page' || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_STORAGE_EMULATOR_HOST)
        throw Error('PRODUCTION_RUNTIME_INVALID');
    return r;
}
export async function requireProductionActor(runtime: ProductionRuntime, uid: string, write = true) {
    const r = runtimeData(runtime), u = await r.auth.getUser(uid);
    if (u.disabled || !u.emailVerified || !isAdminEmail(u.email) || !r.administrators.includes(uid))
        throw Error('PRODUCTION_ADMIN_NOT_AUTHORIZED');
    if (write && !r.test && process.env.PRODUCTION_OPERATIONS_ENABLED !== 'true')
        throw Error('PRODUCTION_OPERATIONS_DISABLED');
    return r;
}
export function exactPackage(runtime: ProductionRuntime, id: string) { const r = runtimeData(runtime), p = r.packages.find(p => p.id === id); if (!p || r.packages.filter(p => p.id === id).length !== 1)
    throw Error('APPROVED_FINAL_PACKAGE_NOT_INSTALLED'); validateFinalPackage(p); return p; }
export function runtimeForDatabase(db: Firestore, auth: Auth) { const registered = byDatabase.get(db); if (registered) {
    runtimeData(registered);
    return registered;
} if ((db as Firestore & {
    projectId: string;
}).projectId === 'demo-cuenta-hogar')
    return productionRuntimeForEmulator(db, auth, [], []); return productionRuntime(db, auth); }
function safeEmulatorConfig() { if (!process.env.FIREBASE_CONFIG)
    return true; try {
    const c = JSON.parse(process.env.FIREBASE_CONFIG);
    return c.projectId === 'demo-cuenta-hogar' && Object.keys(c).every(k => ['projectId', 'storageBucket', 'databaseURL'].includes(k)) && (!c.storageBucket || c.storageBucket === 'demo-cuenta-hogar.appspot.com' || c.storageBucket === 'demo-cuenta-hogar.firebasestorage.app') && (!c.databaseURL || String(c.databaseURL).includes('demo-cuenta-hogar'));
}
catch {
    return false;
} }
