'use client';
import { useState } from 'react';
import type { ProductionOverview } from '@/lib/productionV2/overview';
import { btn, control } from './ContractDataFields';

/** Explicit owner confirmation; no approval, numbering or issuance on page load. */
export function SimpleContractIssuanceForm({view,busy,onIssue}:{view:ProductionOverview;busy:boolean;onIssue:(data:Record<string,unknown>)=>Promise<void>}) {
 const [packageId,setPackageId]=useState(view.issuancePackages[0]?.id??''),[confirmed,setConfirmed]=useState(false);
 const p=view.issuancePackages.find(p=>p.id===packageId);
 const enabled=view.administratorAuthorized&&view.deploymentEnabled&&view.counterReady&&view.preparationComplete&&!!p;
 return <form data-testid="simple-contract-issuance" className="space-y-3 rounded-xl border border-border-color p-4" onChange={()=>setConfirmed(false)} onSubmit={e=>{
  e.preventDefault();if(!enabled||busy||!confirmed||!p)return;
  const f=new FormData(e.currentTarget),date=f.get('issueDate'),place=f.get('issuePlace');
  const formal={contractIssueDate:date,contractIssuePlace:place,promissoryNoteIssueDate:date,promissoryNoteIssuePlace:place,...(p.originalsBindingsRequired?{originalNetManagementLogistics:Number(f.get('originalNetManagementLogistics')),originalCft:Number(f.get('originalCft')),originalAllocationConformity:f.get('originalAllocationConformity'),dispatchOrigin:p.externalDelivery?'NO APLICA: DOCUMENTACION EXTERNA':f.get('dispatchOrigin'),productSerial:p.externalDelivery?'NO APLICA: DOCUMENTACION EXTERNA':f.get('productSerial')}:{})};
  void onIssue({expectedRevision:view.revision,packageId:p.id,packageHash:p.hash,formal,confirmed:true});
 }}>
  <h2 className="text-xl font-bold">Emitir contrato y pagaré</h2>
  <p>Completá los cinco pasos de preparación y confirmá la emisión. Después podrás vincular el portal del cliente. Las cuotas requieren firmas, custodia y entrega.</p>
  {!view.preparationComplete&&<p role="status">Completá los datos pendientes indicados en Preparación de documentos.</p>}
  {(!view.deploymentEnabled||!view.administratorAuthorized||!view.counterReady||!p)&&<p role="status">La habilitación del administrador, la numeración o el paquete instalado requieren revisión de configuración.</p>}
  <fieldset disabled={busy||!enabled} className="grid min-w-0 gap-3 sm:grid-cols-2">
   <label>Versión de documentos<select className={control} value={packageId} onChange={e=>setPackageId(e.target.value)} required>{view.issuancePackages.map(p=><option key={p.id} value={p.id}>{p.version}</option>)}</select></label>
   <label>Lugar de emisión de ambos documentos<input required name="issuePlace" maxLength={200} className={control}/></label>
   <label>Fecha de emisión ({view.issueTimeZone})<input required name="issueDate" type="date" defaultValue={view.issueDate} min={view.issueDate} max={view.issueDate} className={control}/></label>
   {p?.originalsBindingsRequired&&<><p className="sm:col-span-2">El texto original exige este desglose confirmado por el cliente. Ambos importes deben sumar el total contractual guardado: {Number(view.contractTotal).toLocaleString('es-AR',{style:'currency',currency:'ARS'})}. No se sumará IVA ni se modificarán las cuotas. Los servicios no se consideran automáticamente CFT.</p>
    {[['originalNetManagementLogistics','Valor neto del bien + gestión y logística'],['originalCft','CFT del desglose aceptado']].map(([name,label])=><label key={name}>{label}<input name={name} required type="number" min="0" step="0.01" className={control}/></label>)}
    <label className="sm:col-span-2">Referencia de conformidad con el desglose<input name="originalAllocationConformity" required maxLength={500} className={control}/></label>
    {!p.externalDelivery&&[['dispatchOrigin','Origen del despacho'],['productSerial','Serie / IMEI o constancia de no corresponder']].map(([name,label])=><label key={name}>{label}<input name={name} required maxLength={500} className={control}/></label>)}
   </>}
   <label className="flex gap-2 sm:col-span-2" onChange={e=>e.stopPropagation()}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Apruebo como titular esta versión exacta de mandato y pagaré y los datos aceptados por el cliente. Autorizo su emisión y la continuidad de esta operación, conservando los controles de firmas y entrega.</label>
   <button className={btn} disabled={!confirmed}>{busy?'Emitiendo…':'Emitir contrato y pagaré'}</button>
  </fieldset>
 </form>;
}
