import { PageHeader } from '@/components/PageHeader';
import { CollectionsDashboard } from '@/components/admin/operations/CollectionsDashboard';
import { HistoricalOperationalRecords } from '@/components/admin/operations/HistoricalOperationalRecords';
export default function Page(){return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8"><PageHeader title="Cobranzas" subtitle="Cuotas, vencimientos y seguimiento de clientes"/><CollectionsDashboard/><HistoricalOperationalRecords kind="collections"/></div>;}
