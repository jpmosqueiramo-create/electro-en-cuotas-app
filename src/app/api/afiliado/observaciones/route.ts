import {legacyAffiliateAction} from '@/lib/legacyAffiliateActions';
export const runtime='nodejs';
export async function POST(req:Request){return legacyAffiliateAction(req,'NOTE');}
