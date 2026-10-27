import { PageHeader } from '@/components/PageHeader';
import { LogisticsDashboard } from '@/components/admin/operations/LogisticsDashboard';
import { HistoricalOperationalRecords } from '@/components/admin/operations/HistoricalOperationalRecords';
export default function Page(){return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8"><PageHeader title="Logística" subtitle="Productos encargados, fechas y entregas"/><LogisticsDashboard/><HistoricalOperationalRecords kind="logistics"/></div>;}
