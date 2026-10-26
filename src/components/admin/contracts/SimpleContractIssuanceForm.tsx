'use client';
import type { ProductionOverview } from '@/lib/productionV2/overview';
import {btn} from './ContractDataFields';
/** Clicking Emit is the explicit administrative confirmation; nothing issues on load. */
export function SimpleContractIssuanceForm({view,busy,onIssue}:{view:ProductionOverview;busy:boolean;onIssue:(data:Record<string,unknown>)=>Promise<void>}){
 const enabled=view.administratorAuthorized&&view.deploymentEnabled&&view.counterReady&&view.preparationComplete&&view.editorPrepared&&view.issuancePackages.length>0;
 return <section data-testid="simple-contract-issuance" className="space-y-3 rounded-xl border border-border-color p-4"><h2 className="text-xl font-bold">Emitir documentos</h2><p>Se emitirán el contrato y el pagaré con los datos guardados del panel y un único número CH. Esta acción registra tu confirmación y conserva las condiciones del cliente.</p>
 {!view.editorPrepared&&<p role="status">Completá y guardá el panel del contrato.</p>}{!view.preparationComplete&&<p role="status">Revisá los datos o la conformidad pendientes que figuran arriba.</p>}
 {(!view.deploymentEnabled||!view.administratorAuthorized||!view.counterReady||!view.issuancePackages.length)&&<p role="status">La habilitación del administrador, la numeración o el paquete instalado requieren revisión de configuración.</p>}
 <button type="button" className={btn} disabled={busy||!enabled} onClick={()=>void onIssue({expectedRevision:view.revision,confirmed:true})}>{busy?'Procesando…':'Emitir contrato y pagaré'}</button><p className="text-sm">Después podrás vincular el portal y continuar a logística. Las cuotas requieren firmas, custodia y entrega.</p></section>;
}
