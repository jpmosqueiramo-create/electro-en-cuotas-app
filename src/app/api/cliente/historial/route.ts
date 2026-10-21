import {legacyHistoryHandler} from '@/lib/legacyPortalHttp';
export const runtime='nodejs';
export async function GET(req:Request){return legacyHistoryHandler(req,'CLIENT');}
