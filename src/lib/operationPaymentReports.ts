export type PaymentReportStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'LINKED';
export const paymentReportLabels = { PENDING: 'Pendiente de acreditación', CONFIRMED: 'Acreditado por Administración', REJECTED: 'Informe rechazado', LINKED: 'Vinculado a un pago ya acreditado', REVERSED: 'Acreditación revertida' } as const;
export type PaymentReportRole = 'AFFILIATE' | 'CLIENT';
export interface PaymentReport {
  schemaVersion: 'OPERATION_PAYMENT_REPORT_V1'; id: string; operationId: string;
  budgetId: string; version: number; sourceCollection: string; solicitudId: string;
  clientName: string; revision: number; status: PaymentReportStatus;
  amountCents: number; method: 'EFECTIVO' | 'TRANSFERENCIA'; effectiveDate: string; reference: string;
  cashRecipient: 'ADMIN' | 'AFFILIATE' | null;
  reporter: { uid: string; role: PaymentReportRole };
  affiliate: { uid: string; affiliateId: string } | null;
  createdAt: string; digest: string; paymentId: string | null;
  decidedAt: string | null; decidedBy: string | null; decisionNote: string | null;
}
export type PaymentReportPublic = Pick<PaymentReport, 'id' | 'operationId' | 'budgetId' | 'version' | 'revision' | 'amountCents' | 'method' | 'effectiveDate' | 'cashRecipient' | 'createdAt' | 'decidedAt' | 'paymentId'> & {
  status: PaymentReportStatus | 'REVERSED'; reportedBy: PaymentReportRole;
  reference: string | null; decisionNote: string | null; clientName?: string;
};
/** Parse pesos without rounding fractional cents or accepting exponent notation. */
export function paymentAmountCents(value: string): number {
  const s = value.trim();
  if (!/^\d{1,13}(?:[.,]\d{1,2})?$/.test(s)) throw Error('Ingresá un importe con hasta dos decimales, sin separadores de miles.');
  const [whole, fraction = ''] = s.replace(',', '.').split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result <= 0) throw Error('El importe debe ser positivo y representable en centavos.');
  return result;
}
