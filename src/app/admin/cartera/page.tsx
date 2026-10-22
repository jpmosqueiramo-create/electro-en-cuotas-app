import { redirect } from 'next/navigation';
import { legacyAdminDestination,type LegacyAdminQuery } from '@/lib/adminCanonicalNavigation';
export default async function Page({searchParams}:{searchParams:Promise<LegacyAdminQuery>}){redirect(legacyAdminDestination('collections',await searchParams));}
