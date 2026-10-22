import { PageHeader } from '@/components/PageHeader';
import { AdminOperationsDirectory } from '@/components/admin/operations/AdminOperationsDirectory';
import { HistoricalOperationalRecords } from '@/components/admin/operations/HistoricalOperationalRecords';
export default function Page(){return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8"><PageHeader title="Cobranzas" subtitle="Seguimiento desde la Ficha de operación"/><AdminOperationsDirectory section="payments"/><HistoricalOperationalRecords kind="collections"/></div>;}
