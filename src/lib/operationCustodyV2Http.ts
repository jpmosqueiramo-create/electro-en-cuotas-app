import { admin } from './firebaseAdmin';
import { verifyAdminAuth } from './adminAuth';
import { CustodyError, custodyFail } from './operationCustodyV2';
import type { CustodyActor } from './operationCustodyV2Server';
export async function custodyAuth(req: Request, administrative: boolean): Promise<CustodyActor> {
 if (administrative) { const a=await verifyAdminAuth(req);if(!a.authorized)throw new CustodyError('AUTH');return {uid:a.uid!,admin:true}; }
 const header=req.headers.get('authorization');if(!header?.startsWith('Bearer '))custodyFail('AUTH');
 try {const t=await admin.auth().verifyIdToken(header.slice(7),true);return {uid:t.uid,admin:false};}catch{custodyFail('AUTH');}
}
export function custodyParams(id:string,version:string) {if(!/^[1-9]\d*$/.test(version)||!Number.isSafeInteger(Number(version))||!/^[a-zA-Z0-9_-]{1,100}$/.test(id))custodyFail();return Number(version);}
