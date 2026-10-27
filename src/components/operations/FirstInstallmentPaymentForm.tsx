'use client';
import {argentinaBusinessDate} from '@/lib/productionV2/businessDate';
import {btn,control} from '@/components/admin/contracts/ContractDataFields';
export function FirstInstallmentPaymentForm({amountCents,disabled,onConfirm}:{amountCents:number|null;disabled:boolean;onConfirm:(data:Record<string,unknown>)=>Promise<void>}){
 return <form data-testid="first-installment-payment" className="space-y-3" onSubmit={e=>{e.preventDefault();if(disabled||!amountCents)return;const data=new FormData(e.currentTarget);if(!window.confirm('Confirmo que recibí este pago. Se acreditará la primera cuota y se activará el cronograma del contrato. Firmas y entrega seguirán pendientes si todavía no se registraron.'))return;void onConfirm({amountCents,effectiveDate:data.get('date'),method:data.get('method'),reference:data.get('reference')});}}>
 <h4 className="font-bold">Registrar primera cuota recibida</h4><p>Podés cobrarla antes de la firma o la entrega. Se utiliza el mismo contrato y su cronograma, sin agregar cuotas ni importes.</p>
 <fieldset disabled={disabled||!amountCents} className="grid min-w-0 gap-3 sm:grid-cols-2">
 <p className="font-semibold sm:col-span-2">Primera cuota: {amountCents?new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(amountCents/100):'Disponible después de emitir el contrato y el pagaré'}</p>
 <label>Fecha del pago<input aria-label="Fecha primera cuota" name="date" type="date" required defaultValue={argentinaBusinessDate()} max={argentinaBusinessDate()} className={control}/></label>
 <label>Medio de pago<select name="method" aria-label="Medio primera cuota" className={control}><option value="TRANSFERENCIA">Transferencia</option><option value="EFECTIVO">Efectivo</option></select></label>
 <label className="sm:col-span-2">Referencia del pago<input aria-label="Referencia primera cuota" name="reference" required maxLength={200} className={control}/></label>
 <button className={btn}>Confirmar primera cuota recibida</button></fieldset>
 </form>;
}
