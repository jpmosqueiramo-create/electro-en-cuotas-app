import { admin } from './firebaseAdmin';
import { portalFail } from './operationClientV2';
export async function clientPortalUid(req:Request) {
 const h=req.headers.get('authorization');if(!h?.startsWith('Bearer '))portalFail('AUTH');
 try {return (await admin.auth().verifyIdToken(h.slice(7),true)).uid;}catch{portalFail('AUTH');}
}
export function clientPortalParams(id:string,version:string){if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||! /^[1-9]\d*$/.test(version)||!Number.isSafeInteger(Number(version)))portalFail();return Number(version);}
