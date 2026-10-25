import { createContext } from 'react';
export type ContractSectionTarget='data'|'employment'|'product'|'terms'|'schedule'|'identity'|'conformity';
const targets:Record<ContractSectionTarget,string>={data:'contract-personal',employment:'contract-employment',product:'contract-product',terms:'contract-economics',schedule:'contract-schedule',identity:'credit-review',conformity:'contract-review'};
export function goToContractSection(section:ContractSectionTarget){
 const target=document.querySelector(`[data-testid="${targets[section]}"]`);
 if(target instanceof HTMLDetailsElement)target.open=true;
 target?.scrollIntoView({behavior:'smooth',block:'start'});
 const focus=target?.querySelector('summary,input,button');if(focus instanceof HTMLElement)focus.focus({preventScroll:true});
}

/** Navigation only: never changes persisted workflow or authorization. */
export const ContractNavigationContext=createContext(goToContractSection);
export function operationStepForTarget(target:ContractSectionTarget){return target==='data'||target==='employment'?'client':target==='identity'?'documents':'contract';}
