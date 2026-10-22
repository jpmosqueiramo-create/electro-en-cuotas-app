import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
async function main(){
 assert.equal(process.env.GCLOUD_PROJECT,'demo-cuenta-hogar');
 assert.ok(existsSync('.next/standalone/server.js'),'Build standalone required');
 await new Promise<void>((resolve,reject)=>{const probe=createServer();probe.once('error',reject);probe.listen(3002,'127.0.0.1',()=>probe.close(()=>resolve()));});
 const env:NodeJS.ProcessEnv={...process.env,NODE_ENV:'production',PORT:'3002',HOSTNAME:'127.0.0.1',GCLOUD_PROJECT:'demo-cuenta-hogar',GOOGLE_CLOUD_PROJECT:'demo-cuenta-hogar',NEXT_PUBLIC_FIREBASE_PROJECT_ID:'demo-cuenta-hogar',FIREBASE_CONFIG:JSON.stringify({projectId:'demo-cuenta-hogar'}),FIREBASE_CLIENT_EMAIL:'',FIREBASE_PRIVATE_KEY:'',GOOGLE_APPLICATION_CREDENTIALS:'',NEXT_PUBLIC_ADMIN_EMAIL:'standalone-admin@example.test',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199'};
 const server=spawn(process.execPath,['.next/standalone/server.js'],{env,stdio:'ignore'});
 try{
  let status=0;
  for(let i=0;i<60;i++){
   if(server.exitCode!==null)throw Error('STANDALONE_EXITED');
   try{status=(await fetch('http://127.0.0.1:3002/api/admin/presupuestos-v2/synthetic-no-read/versions/1/contract/documents/preview',{signal:AbortSignal.timeout(3000)})).status;break;}catch{await new Promise(r=>setTimeout(r,250));}
  }
  assert.equal(status,401,'Packaged route must import successfully and reject before reading Firebase');
  console.log('STANDALONE_DOCUMENT_ROUTE_AUTH=PASS; HTTP401; PACKAGED_RUNTIME; DEMO_ONLY; NO_FIREBASE_READS_OR_WRITES');
 }finally{server.kill('SIGTERM');await new Promise<void>(resolve=>{if(server.exitCode!==null||server.signalCode!==null)resolve();else server.once('close',()=>resolve());});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
