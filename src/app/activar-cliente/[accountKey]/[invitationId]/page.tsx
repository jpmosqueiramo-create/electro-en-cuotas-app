import {notFound} from 'next/navigation';
import {AccountEmailActivation} from '@/components/AccountEmailActivation';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function Page({params}:{params:Promise<{accountKey:string;invitationId:string}>}){
 const p=await params;if(!/^client_[a-f0-9]{64}$/.test(p.accountKey)||! /^[a-zA-Z0-9_-]{1,100}$/.test(p.invitationId))notFound();
 return <AccountEmailActivation key={`${p.accountKey}:${p.invitationId}`} role="CLIENT" accountId={p.accountKey} invitationId={p.invitationId}/>;
}
