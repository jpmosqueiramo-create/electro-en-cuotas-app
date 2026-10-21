import { deliveryHandler } from '@/lib/operationDeliveryV2Http';
export const runtime='nodejs';
async function handle(req:Request,ctx:{params:Promise<{budgetId:string;version:string}>}){const p=await ctx.params;return deliveryHandler(req,p.budgetId,p.version,true,true);}
export const GET=handle;export const POST=handle;
