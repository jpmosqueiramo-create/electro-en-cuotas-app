// This side-effect import MUST be the first dependency of Firebase-writing tests.
// Dependency evaluation runs this guard before firebaseAdmin or domain modules.
import { assertSafeEmulatorEnvironment } from "./assertSafeEmulatorEnvironment";

const project = assertSafeEmulatorEnvironment();
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = project;
