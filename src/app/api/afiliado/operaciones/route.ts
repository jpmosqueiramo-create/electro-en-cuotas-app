import {legacyHistoryHandler} from '@/lib/legacyPortalHttp';
/** UID-verified historical consultation; no alternative operation engine. */
export async function GET(req:Request){return legacyHistoryHandler(req,'AFFILIATE');}
