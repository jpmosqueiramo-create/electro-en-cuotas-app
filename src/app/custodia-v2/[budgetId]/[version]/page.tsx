import { notFound } from 'next/navigation';
import { CustodyConfirmation } from '@/components/operations/CustodyConfirmation';
export default async function Page({params}:{params:Promise<{budgetId:string;version:string}>}) {
 const p=await params;if(!/^[a-zA-Z0-9_-]{1,100}$/.test(p.budgetId)||! /^[1-9]\d*$/.test(p.version)||!Number.isSafeInteger(Number(p.version)))notFound();
 return <CustodyConfirmation budgetId={p.budgetId} version={Number(p.version)}/>;
}
