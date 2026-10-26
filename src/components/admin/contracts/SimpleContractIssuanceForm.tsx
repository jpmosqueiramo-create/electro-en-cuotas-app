'use client';
import type { ProductionOverview } from '@/lib/productionV2/overview';
import {btn} from './ContractDataFields';
/** Clicking Emit is the explicit administrative confirmation; nothing issues on load. */
export function SimpleContractIssuanceForm({view,busy,onPrepare,onIssue}:{view:ProductionOverview;busy:boolean;onPrepare?:()=>Promise<void>;onIssue:(data:Record<string,unknown>)=>Promise<void>}){
 const enabled=view.administratorAuthorized&&view.deploymentEnabled&&view.counterReady&&view.preparationComplete&&view.editorPrepared&&view.issuancePackages.length>0;
 return <section data-testid="simple-contract-issuance" className="space-y-3 rounded-xl border border-border-color p-4"><h2 className="text-xl font-bold">Emitir documentos</h2><p>Se emitirán el contrato y el pagaré con los datos guardados del panel y un único número CH. Se generan los PDF definitivos, descargables e imprimibles. Esta acción registra tu confirmación y conserva las condiciones del cliente.</p>
 {!view.editorPrepared&&<div className="space-y-2"><p role="status">Abrí los datos del contrato, revisá el desglose y guardalos para emitir.</p>{onPrepare&&<button type="button" data-testid="open-editor-from-issuance" className={btn} disabled={busy} onClick={()=>void onPrepare()}>Completar datos del contrato</button>}</div>}{!view.preparationComplete&&<p role="status">Revisá los datos o la conformidad pendientes que figuran arriba.</p>}
 {(!view.deploymentEnabled||!view.administratorAuthorized||!view.counterReady||!view.issuancePackages.length)&&<p role="status">La habilitación del administrador, la numeración o el paquete instalado requieren revisión de configuración.</p>}
 <button type="button" data-testid="emit-contract-pair" className={btn} disabled={busy||!enabled} onClick={()=>void onIssue({expectedRevision:view.revision,confirmed:true})}>{busy?'Procesando…':'Emitir contrato y pagaré'}</button><p className="text-sm">Después podrás vincular el portal y continuar a logística. Las cuotas requieren firmas, custodia y entrega.</p></section>;
}
