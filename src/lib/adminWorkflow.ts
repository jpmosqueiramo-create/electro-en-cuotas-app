/** Display projection only. Does not change acceptance, approval or document permissions. */
export const workflowLabels={PENDING_APPROVAL:'Pendiente de aprobación',APPROVED:'Aprobado',PENDING_PERSONAL_DATA:'Pendiente de datos personales',PERSONAL_DATA_RECEIVED:'Datos personales recibidos',CONTRACT:'Confección de contrato',LOGISTICS:'Logística',DELIVERED:'Entregado',REJECTED:'Rechazado',ARCHIVED:'Archivada',UNAVAILABLE:'Estado no disponible'} as const;
export type WorkflowStage=keyof typeof workflowLabels;
export interface AdminWorkflow {budgetId:string;version:number;product:string;acceptedAt:string;stage:WorkflowStage;approval:'PENDING'|'APPROVED'|'REJECTED';}
export const workflowKey=(id:string,version:number)=>`${id}:${version}`;
export function matchesWorkflow(w:AdminWorkflow,filter:string){return filter==='APPROVED'?w.approval==='APPROVED':w.stage===filter;}
export function workflowTone(stage:WorkflowStage){return stage==='REJECTED'?'border-red-200 bg-red-50 text-red-900':stage==='DELIVERED'||stage==='APPROVED'?'border-emerald-200 bg-emerald-50 text-emerald-900':stage==='PENDING_APPROVAL'||stage==='PENDING_PERSONAL_DATA'?'border-amber-200 bg-amber-50 text-amber-950':'border-sky-200 bg-sky-50 text-sky-950';}
