import { notFound } from 'next/navigation';
import { AffiliateActivation } from '@/components/AffiliateActivation';
export const metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default async function Page({ params }: { params: Promise<{ vendorId: string; invitationId: string }> }) {
 const p = await params;
 if (![p.vendorId, p.invitationId].every(s => /^[a-zA-Z0-9_-]{1,100}$/.test(s))) notFound();
 return <AffiliateActivation key={`${p.vendorId}:${p.invitationId}`} {...p} />;
}
