import { paymentReportsHandler } from '@/lib/operationPaymentReportsHttp';
export const runtime='nodejs';
async function handler(req:Request,context:{params:Promise<{budgetId:string;version:string}>}){const p=await context.params;return paymentReportsHandler(req,p.budgetId,p.version,'AFFILIATE');}
export {handler as GET,handler as POST};
