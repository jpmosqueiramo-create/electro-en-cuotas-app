import {legacySettlementAction} from '@/lib/affiliateSettlementHttp';
export function POST(req:Request,ctx:{params:Promise<{id:string}>}){return legacySettlementAction(req,ctx,'CONFIRM');}
