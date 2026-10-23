import { admin } from './firebaseAdmin';
import { isAdminEmail } from './adminIdentity';
import { LabError, requireLabAccess } from './operationsLabPolicy';
export async function requireLabIdentity(req: Request) {
  const bearer = req.headers.get('authorization');
  if (!bearer?.startsWith('Bearer ')) throw new LabError(401, 'LAB_AUTH_REQUIRED');
  let uid: string;
  try {
    const decoded = await admin.auth().verifyIdToken(bearer.slice(7), true);
    const user = await admin.auth().getUser(decoded.uid);
    if (user.disabled || !user.emailVerified) throw new Error('denied');
    uid = user.uid;
  } catch { throw new LabError(403, 'LAB_ACCESS_DENIED'); }
  return uid;
}

export async function requireLabAdministrator(req:Request){
 const uid=await requireLabIdentity(req),user=await admin.auth().getUser(uid);
 if(!isAdminEmail(user.email))throw new LabError(403,'LAB_ACCESS_DENIED');
 requireLabAccess(uid,process.env);return uid;
}
