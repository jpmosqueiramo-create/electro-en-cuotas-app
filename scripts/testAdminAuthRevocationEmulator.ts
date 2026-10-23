import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { admin } from '../src/lib/firebaseAdmin';
import { verifyAdminAuth } from '../src/lib/adminAuth';
const auth = admin.auth();
async function main() {
 assert.equal(process.env.GCLOUD_PROJECT, 'demo-cuenta-hogar');
 assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
 const email=process.env.NEXT_PUBLIC_ADMIN_EMAIL!;
 assert(email.endsWith('@example.test'));
 const user=await auth.createUser({email,emailVerified:true,password:'Emulator-only-123'});
 async function token(uid:string) {
  const custom=await auth.createCustomToken(uid);
  const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:custom,returnSecureToken:true})});
  assert.equal(response.status,200);return (await response.json()).idToken as string;
 }
 const check=(value?:string)=>verifyAdminAuth(new Request('http://localhost/api/admin/test',{headers:value?{Authorization:'Bearer '+value}:{}}));
 const first=await token(user.uid);
 assert.equal((await check()).authorized,false);
 assert.equal((await check(first)).authorized,true);
 await new Promise(resolve=>setTimeout(resolve,1100));
 await auth.revokeRefreshTokens(user.uid);
 assert.equal((await check(first)).authorized,false,'Revoked token cannot perform administrative writes');
 const second=await token(user.uid);
 assert.equal((await check(second)).authorized,true);
 await auth.updateUser(user.uid,{disabled:true});
 assert.equal((await check(second)).authorized,false);
 await auth.updateUser(user.uid,{disabled:false,email:'no-longer-admin@example.test'});
 assert.equal((await check(second)).authorized,false,'Stale email claim cannot retain administrator role');
 const other=await auth.createUser({email:'non-admin@example.test',emailVerified:true});
 assert.equal((await check(await token(other.uid))).authorized,false);
 console.log('ADMIN_AUTH_REVOCATION_EMULATOR PASS: active, anonymous, revoked, disabled, stale role and non-admin. Production writes: 0.');
}
main().then(()=>admin.app().delete()).catch(e=>{console.error(e);process.exitCode=1;});
