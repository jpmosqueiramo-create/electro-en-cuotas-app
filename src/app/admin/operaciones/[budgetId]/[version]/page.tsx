import { notFound } from 'next/navigation';
import { ContractV2Composer } from '@/components/admin/contracts/ContractV2Composer';
export default async function OperationPage({params,searchParams}:{params:Promise<{budgetId:string;version:string}>;searchParams:Promise<{section?:string}>}) {
  const {budgetId,version}=await params;const {section}=await searchParams;const initialSection=section==='documents'||section==='client'||section==='budget'||section==='contract'||section==='logistics'||section==='payments'||section==='affiliate'?section:'documents';
  if(!/^[1-9]\d*$/.test(version)||!Number.isSafeInteger(Number(version))||!budgetId||budgetId.includes('/'))notFound();
  return <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6"><h1 className="sr-only">Ficha de operación</h1><ContractV2Composer key={`${budgetId}:${version}:${initialSection}`} budgetId={budgetId} version={Number(version)} initialSection={initialSection}/></div>;
}
