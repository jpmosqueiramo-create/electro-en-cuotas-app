import { createContext } from 'react';
export type ContractSectionTarget='editor'|'data'|'employment'|'product'|'terms'|'schedule'|'identity'|'conformity'|'intake'|'submissions'|'approval'|'issuance'|'payments'|'fulfillment'|'delivery'|'acceptance';
const targets:Record<ContractSectionTarget,string>={editor:'contract-unified-editor',data:'contract-personal',employment:'contract-employment',product:'contract-product',terms:'contract-economics',schedule:'contract-schedule',identity:'credit-review',conformity:'contract-review',intake:'contract-intake',submissions:'client-data-review',approval:'credit-advanced',issuance:'simple-contract-issuance',payments:'financial-v2',fulfillment:'fulfillment',delivery:'delivery-v2',acceptance:'contract-acceptance'};
export function goToContractSection(section:ContractSectionTarget){
 const target=(section==='submissions'?document.querySelector('[data-testid="client-data-review"][open]'):null)??document.querySelector(`[data-testid="${targets[section]}"]`)??(['editor','terms','schedule','product','issuance','acceptance'].includes(section)?document.querySelector('[data-testid="contract-ready"]')??document.querySelector('[data-testid="contract-unified-editor"]')??document.querySelector('[data-testid="production-operation"]'):null);
 let parent=target?.parentElement;while(parent){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}
 if(target instanceof HTMLDetailsElement)target.open=true;
 target?.scrollIntoView({behavior:'smooth',block:'start'});
 const focus=target?.querySelector('summary,input,button');if(focus instanceof HTMLElement)focus.focus({preventScroll:true});
}

/** Navigation only: never changes persisted workflow or authorization. */
export const ContractNavigationContext=createContext(goToContractSection);
export function operationStepForTarget(target:ContractSectionTarget){return ['data','employment','intake','submissions'].includes(target)?'client':['identity','approval'].includes(target)?'documents':target==='payments'?'payments':['fulfillment','delivery'].includes(target)?'logistics':'contract';}
