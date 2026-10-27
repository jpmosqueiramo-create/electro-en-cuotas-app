'use client';
const affiliateControl='admin-control min-h-11 w-full min-w-0 rounded-xl border border-border-color bg-surface px-3 py-2 text-text-primary';
const affiliateButton='admin-control min-h-11 rounded-xl border border-border-color bg-surface px-4 py-2 font-semibold text-brand-primary';
export type CashMovement={id:string;tipo:string;montoCentavos:number;createdAt:string;motivo?:string|null};
export type Remittance={id:string;montoRendidoCentavos:number;createdAt:string;metodoEntrega:string;comprobanteReferencia?:string|null;observaciones?:string|null};
const money=(n:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(n/100);
const date=(s:string)=>new Date(s).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',dateStyle:'short',timeStyle:'short'});
const movementLabels:Record<string,string>={COBRO_EFECTIVO_VENDEDOR:'Cobro de cuota en efectivo',RENDICION_EFECTIVO:'Efectivo entregado',COMPENSACION_COMISION:'Compensación registrada',DEVOLUCION_EFECTIVO_CLIENTE:'Devolución al cliente',AJUSTE_CUSTODIA_EFECTIVO:'Ajuste de efectivo'};
export function AffiliateCashPanel({balance,movements,remittances,enabled,busy,onSubmit}:{balance:number;movements:CashMovement[];remittances:Remittance[];enabled:boolean;busy:boolean;onSubmit:(data:Record<string,unknown>)=>Promise<boolean>}){
 return <div data-testid="affiliate-cash" className="min-w-0 space-y-4">
  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><h3 className="font-bold">Efectivo de cuotas en poder del vendedor afiliado</h3><p className="mt-1 break-words text-2xl font-bold">{money(balance)}</p><p className="mt-2 text-sm">Saldo de cobros y entregas registrados. No se descuenta automáticamente de las comisiones. Un pago en efectivo sin cobrador identificado no se atribuye al vendedor afiliado.</p></div>
  {!enabled&&<p role="status">La consulta está disponible. Tu cuenta no tiene habilitado el registro productivo de rendiciones.</p>}
  <form data-testid="affiliate-remittance" className="space-y-4 rounded-xl border border-border-color p-4" onSubmit={e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form);void onSubmit({amountCents:Math.round(Number(f.get('amount'))*100),method:f.get('method'),reference:f.get('reference'),notes:f.get('notes')}).then(saved=>{if(saved)form.reset();});}}>
   <h3 className="font-bold">Registrar efectivo recibido</h3><p className="text-sm text-text-secondary">Usá esta acción cuando el vendedor afiliado ya entregó o depositó el dinero.</p>
   <fieldset disabled={!enabled||busy||balance<=0} className="grid min-w-0 gap-3 sm:grid-cols-2">
    <label className="min-w-0">Importe recibido<input className={affiliateControl} name="amount" type="number" min="0.01" max={balance/100} step="0.01" required/></label>
    <label className="min-w-0">Cómo se recibió<select className={affiliateControl} name="method"><option value="EFECTIVO_EN_MANO">Entrega de efectivo</option><option value="EFECTIVO_DEPOSITO">Depósito bancario</option></select></label>
    <label className="min-w-0 sm:col-span-2">Comprobante o referencia<input className={affiliateControl} name="reference" required maxLength={200}/></label>
    <label className="min-w-0 sm:col-span-2">Observación (opcional)<textarea className={affiliateControl} name="notes" maxLength={500}/></label>
    <button className="btn-primary admin-control min-h-11 sm:col-span-2">{busy?'Registrando…':'Confirmar efectivo recibido'}</button>
   </fieldset>{balance===0&&<p className="text-sm">No hay efectivo registrado pendiente de rendir.</p>}
  </form>
  <h3 className="font-bold">Rendiciones registradas · {remittances.length}</h3>
  <div className="grid min-w-0 gap-3 md:grid-cols-2">{remittances.map(r=><article key={r.id} className="min-w-0 space-y-1 rounded-xl border border-border-color p-4"><strong>{money(r.montoRendidoCentavos)}</strong><p className="text-sm">{r.metodoEntrega==='EFECTIVO_EN_MANO'?'Entrega de efectivo':'Depósito bancario'} · {date(r.createdAt)}</p><p className="break-words text-sm">{r.comprobanteReferencia}</p>{r.observaciones&&<p className="break-words text-sm text-text-secondary">{r.observaciones}</p>}</article>)}</div>
  {!remittances.length&&<p className="text-sm text-text-secondary">Todavía no se registraron entregas de efectivo.</p>}
  <details className="rounded-xl border border-border-color p-3"><summary className={`${affiliateButton} cursor-pointer`}>Ver movimientos de efectivo</summary>{movements.slice(-50).reverse().map(m=><p key={m.id} className="my-3 break-words text-sm">{movementLabels[m.tipo]??'Movimiento registrado'} · {money(m.montoCentavos)} · {date(m.createdAt)}{m.motivo?` · ${m.motivo}`:''}</p>)}{movements.length>50&&<p className="text-sm">Últimos 50 movimientos. El saldo incluye todo el historial.</p>}{!movements.length&&<p className="mt-3 text-sm">Sin movimientos de efectivo registrados.</p>}</details>
 </div>;
}
