'use client';
import {AffiliateRemittanceForm} from './AffiliateRemittanceForm';
import {remittanceMethodLabel} from '@/lib/affiliateRemittance';
const affiliateButton='admin-control min-h-11 rounded-xl border border-border-color bg-surface px-4 py-2 font-semibold text-brand-primary';
export type CashMovement={id:string;tipo:string;montoCentavos:number;createdAt:string;motivo?:string|null};
export type Remittance={montoCobrosRendidosCentavos?:number;comisionRetenidaCentavos?:number;liquidacionComisionId?:string|null;id:string;montoRendidoCentavos:number;createdAt:string;metodoEntrega:string;comprobanteReferencia?:string|null;observaciones?:string|null};
const money=(n:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(n/100);
const date=(s:string)=>new Date(s).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',dateStyle:'short',timeStyle:'short'});
const movementLabels:Record<string,string>={COBRO_EFECTIVO_VENDEDOR:'Cobro de cuota en efectivo',RENDICION_EFECTIVO:'Efectivo entregado',COMPENSACION_COMISION:'Compensación registrada',DEVOLUCION_EFECTIVO_CLIENTE:'Devolución al cliente',AJUSTE_CUSTODIA_EFECTIVO:'Ajuste de efectivo'};
export function AffiliateCashPanel({vendorId,balance,movements,remittances,enabled,busy,onSubmit,onPartial}:{vendorId:string;balance:number;movements:CashMovement[];remittances:Remittance[];enabled:boolean;busy:boolean;onSubmit:(data:Record<string,unknown>)=>Promise<boolean>;onPartial:(data:Record<string,unknown>)=>Promise<boolean>}){
 return <div data-testid="affiliate-cash" className="min-w-0 space-y-4">
  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><h3 className="font-bold">Efectivo de cuotas en poder del vendedor afiliado</h3><p className="mt-1 break-words text-2xl font-bold">{money(balance)}</p><p className="mt-2 text-sm">Saldo de cobros y entregas registrados. Si el vendedor afiliado retuvo su comisión, confirmá ese descuento al registrar la rendición para cancelarla también. Un pago en efectivo sin cobrador identificado no se atribuye al vendedor afiliado.</p></div>
  {!enabled&&<p role="status">La consulta está disponible. Tu cuenta no tiene habilitado el registro productivo de rendiciones.</p>}
  <AffiliateRemittanceForm vendorId={vendorId} balance={balance} enabled={enabled} busy={busy} onSubmit={onSubmit} onPartial={onPartial}/>
  <h3 className="font-bold">Rendiciones registradas · {remittances.length}</h3>
  <div className="grid min-w-0 gap-3 md:grid-cols-2">{remittances.map(r=><article key={r.id} className="min-w-0 space-y-1 rounded-xl border border-border-color p-4"><strong>Recibido: {money(r.montoRendidoCentavos)}</strong>{r.montoCobrosRendidosCentavos!==undefined&&<><p className="text-sm">Comisión retenida y cancelada: {money(r.comisionRetenidaCentavos??0)}</p><p className="text-sm font-semibold">Total de cobros rendidos: {money(r.montoCobrosRendidosCentavos)}</p></>}<p className="text-sm">{remittanceMethodLabel(r.metodoEntrega)} · {date(r.createdAt)}</p><p className="break-words text-sm">{r.comprobanteReferencia}</p>{r.observaciones&&<p className="break-words text-sm text-text-secondary">{r.observaciones}</p>}</article>)}</div>
  {!remittances.length&&<p className="text-sm text-text-secondary">Todavía no se registraron entregas de efectivo.</p>}
  <details className="rounded-xl border border-border-color p-3"><summary className={`${affiliateButton} cursor-pointer`}>Ver movimientos de efectivo</summary>{movements.slice(-50).reverse().map(m=><p key={m.id} className="my-3 break-words text-sm">{movementLabels[m.tipo]??'Movimiento registrado'} · {money(m.montoCentavos)} · {date(m.createdAt)}{m.motivo?` · ${m.motivo}`:''}</p>)}{movements.length>50&&<p className="text-sm">Últimos 50 movimientos. El saldo incluye todo el historial.</p>}{!movements.length&&<p className="mt-3 text-sm">Sin movimientos de efectivo registrados.</p>}</details>
 </div>;
}
