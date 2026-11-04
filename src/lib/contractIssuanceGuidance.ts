import {calendarDate} from './contractV2';
import type {LoopServiceSelection} from './loopContractDisclosure';
import type {ContractSectionTarget} from '../components/admin/contracts/contractSectionNavigation';
export type AcceptanceField='acceptanceChannel'|'proposalSentAt'|'clientAcceptedAt';
export type AcceptanceIssue={field:AcceptanceField;message:string};
/** Presentation only. The existing server validation remains authoritative. */
export function proposalAcceptanceIssues(value:Pick<LoopServiceSelection,AcceptanceField>|null|undefined,quotedAt:string,asOf=Date.now()):AcceptanceIssue[]{
 if(!value)return [];
 const issues:AcceptanceIssue[]=[];
 if(!['WHATSAPP','EMAIL'].includes(value.acceptanceChannel))issues.push({field:'acceptanceChannel',message:'Seleccioná el canal por el que el cliente aceptó la propuesta.'});
 const dates=([['proposalSentAt','envío de la propuesta'],['clientAcceptedAt','aceptación del cliente']] as const).map(([field,label])=>{
  const text=value[field];let timestamp=NaN;
  try{if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)){calendarDate(text.slice(0,10));timestamp=Date.parse(text+'-03:00');}}catch{/* Invalid calendar dates are reported below. */}
  if(!Number.isFinite(timestamp))issues.push({field,message:`Completá una fecha y hora válidas de ${label}.`});
  else if(timestamp>asOf)issues.push({field,message:`La fecha y hora de ${label} está en el futuro. Ingresá cuándo ocurrió realmente (hora de Argentina).`});
  return timestamp;
 });
 if(Number.isFinite(dates[0])&&Number.isFinite(dates[1])&&dates[0]>dates[1])issues.push({field:'clientAcceptedAt',message:'La aceptación no puede ser anterior al envío de la propuesta.'});
 if(Number.isFinite(dates[0])&&dates[0]<Date.parse(quotedAt))issues.push({field:'proposalSentAt',message:'El envío no puede ser anterior a la cotización de esta propuesta.'});
 return issues;
}
export function issuanceCorrectionTarget(message:string):ContractSectionTarget {
 return /fechas reales de envío y aceptación|canal de aceptación/.test(message)?'acceptance':'editor';
}
