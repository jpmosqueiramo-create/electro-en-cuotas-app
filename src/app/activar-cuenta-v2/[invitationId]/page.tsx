import { notFound } from 'next/navigation';
import { ClientActivationV2 } from '@/components/operations/ClientActivationV2';
export const metadata={robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{invitationId:string}>}) {const p=await params;if(!/^invite_[a-f0-9]{64}$/.test(p.invitationId))notFound();return <ClientActivationV2 key={p.invitationId} invitationId={p.invitationId}/>;}
