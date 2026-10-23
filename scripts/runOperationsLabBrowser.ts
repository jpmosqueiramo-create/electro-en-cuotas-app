import './helpers/requireSafeEmulatorEnvironment';
import {createServer} from 'node:net';
import { spawn } from 'node:child_process';
import { testOperationsLabBrowser } from './testOperationsLabBrowser';
import { admin } from '../src/lib/firebaseAdmin';
async function main() {
await new Promise<void>((resolve,reject)=>{const probe=createServer();probe.once('error',reject);probe.listen(3000,'localhost',()=>probe.close(error=>error?reject(error):resolve()));});
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','localhost','--port','3000'],{cwd:process.cwd(),env:{...process.env,OPERATIONS_LAB_ENABLED:'true',NEXT_PUBLIC_ADMIN_EMAIL:'lab-admin@example.test',OPERATIONS_LAB_PARTICIPANT_UIDS:'["lab-browser-client","lab-browser-affiliate"]',OPERATIONS_LAB_ADMIN_UIDS:'["synthetic-lab-browser"]',NODE_ENV:'development',NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:'demo-cuenta-hogar.firebaseapp.com',NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:'demo-cuenta-hogar.appspot.com',NEXT_PUBLIC_FIREBASE_API_KEY:'demo-key',NEXT_PUBLIC_FIREBASE_APP_ID:'demo-app',NEXT_PUBLIC_E2E_TEST_MODE:'1',NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099'},stdio:'inherit'});
try { let ready=false; for(let i=0;i<120;i++){try{ready=(await fetch('http://localhost:3000/login')).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,500));}if(!ready)throw Error('LOCAL_SERVER_NOT_READY');await testOperationsLabBrowser();}finally{server.kill('SIGTERM');await admin.app().delete();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
