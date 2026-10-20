import { custodyPhotoHandler } from '@/lib/operationCustodyV2PhotoHttp';
export const runtime='nodejs';
async function handle(req:Request,ctx:{params:Promise<{budgetId:string;version:string}>}) {const p=await ctx.params;return custodyPhotoHandler(req,p.budgetId,p.version,false);}
export const GET=handle;export const POST=handle;
