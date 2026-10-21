import { financialHandler } from '@/lib/operationFinancialV2Http';
export const runtime='nodejs';
type Context={params:Promise<{budgetId:string;version:string}>};
export async function GET(req:Request,context:Context){const p=await context.params;return financialHandler(req,p.budgetId,p.version,'AFFILIATE');}
