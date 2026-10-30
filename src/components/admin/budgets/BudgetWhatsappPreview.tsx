"use client";
import {useEffect,useRef,useState} from 'react';
import type {NumberedBudgetClientV2} from '@/lib/budgetSharingV2';
import {budgetPdfFilename,budgetWhatsappMessage,budgetWhatsappUrl} from '@/lib/budgetSharingV2';
const button='inline-flex min-h-11 items-center justify-center rounded-xl border border-border-color bg-surface px-4 py-2 text-sm font-semibold text-brand-primary';
export function BudgetWhatsappPreview({budget}:{budget:NumberedBudgetClientV2}){
 const region=useRef<HTMLElement>(null),[notice,setNotice]=useState('');
 const message=budgetWhatsappMessage(budget),url=budgetWhatsappUrl(budget.cliente.whatsapp,message);
 useEffect(()=>{region.current?.focus({preventScroll:true});region.current?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},[]);
 return <section ref={region} tabIndex={-1} aria-label="Presupuesto preparado para WhatsApp" className="min-w-0 space-y-3 rounded-xl focus-visible:outline-2 focus-visible:outline-brand-primary" data-testid="budget-whatsapp-preview">
 <h3 className="font-heading text-lg font-bold">Presupuesto listo para WhatsApp</h3>
 <p className="text-sm">Este es el mensaje completo que se abrirá en el chat del cliente. Revisalo antes de enviar.</p>
 <pre data-testid="budget-whatsapp" className="whitespace-pre-wrap break-words rounded-xl bg-background-main p-4 font-sans text-sm leading-relaxed [overflow-wrap:anywhere]">{message}</pre>
 <div className="flex flex-wrap gap-3"><button type="button" className={button} onClick={()=>void navigator.clipboard.writeText(message).then(()=>setNotice('Presupuesto copiado.')).catch(()=>setNotice('No se pudo copiar. Seleccioná el mensaje y copialo manualmente.'))}>Copiar presupuesto</button>{url&&<a data-testid="budget-whatsapp-open" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white" target="_blank" rel="noopener noreferrer" href={url}>Abrir WhatsApp con esta propuesta</a>}</div>
 {!url&&<p role="alert" className="text-sm text-red-700">El teléfono del cliente no tiene un formato válido para WhatsApp. Podés copiar el presupuesto y pegarlo en su chat.</p>}
 <p className="text-sm text-text-secondary">WhatsApp abrirá el texto preparado para que confirmes el envío. Si querés acompañarlo con el PDF, descargá «PDF del presupuesto» y adjuntá el archivo <span className="break-all">{budgetPdfFilename(budget)}</span> en el chat.</p>
 {notice&&<p role="status" className="text-sm">{notice}</p>}
 </section>;
}
