import { exact } from '../contractV2';
import { assertPaymentAddressConformity } from '../contractPaymentAddress';
import type { FinalPackage, FinalSnapshot, FinalTemplate } from './catalog';
export const usesClientPaymentAddress = (template: FinalTemplate) => template.blocks?.some(b => b.text.includes('{{client.paymentAddress}}')) ?? false;
export const originalFormalFields = ['originalNetManagementLogistics', 'originalCft', 'originalAllocationConformity', 'dispatchOrigin', 'productSerial'] as const;
/** Explicit presentation classification only: never updates terms, debt or taxes. */
export function originalFormalParameters(p: FinalPackage, formal: Record<string, unknown>, total: number, schedule: readonly { dueDate: string }[]) {
    if (!p.originalsPolicy) return {};
    const f = exact(formal, [...originalFormalFields]);
    const cents = (x: unknown) => {
        if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || !Number.isSafeInteger(Math.round(x * 100)) || Math.abs(x * 100 - Math.round(x * 100)) > 1e-6) throw Error('ORIGINAL_ALLOCATION_REQUIRED');
        return Math.round(x * 100);
    };
    if (cents(f.originalNetManagementLogistics) + cents(f.originalCft) !== cents(total)) throw Error('ORIGINAL_ALLOCATION_TOTAL_MISMATCH');
    for (const field of ['originalAllocationConformity', 'dispatchOrigin', 'productSerial'] as const) {
        const value = f[field];
        if (typeof value !== 'string' || !value.trim() || value.length > 500 || /[\x00-\x1f\x7f]/.test(value)) throw Error('ORIGINAL_FORMAL_EVIDENCE_REQUIRED');
    }
    if (schedule.slice(1).some(r => Number(r.dueDate.slice(8,10)) < 1 || Number(r.dueDate.slice(8,10)) > 10)) throw Error('ORIGINAL_SCHEDULE_OUTSIDE_APPROVED_RANGE');
    return Object.fromEntries(originalFormalFields.map(k => [k, f[k]])) as Record<string, string | number>;
}
export function assertOriginalSnapshot(s: FinalSnapshot, p: FinalPackage) {
    if (usesClientPaymentAddress(p.templates.PAGARE)) assertPaymentAddressConformity(s.personalData, {
        confirmedPaymentAddressHash: s.documentContext.parameters.notePaymentAddressHash as string | undefined,
    });
    if (!p.originalsPolicy) return;
    const params = s.documentContext.parameters;
    originalFormalParameters(p, Object.fromEntries(originalFormalFields.map(k => [k, params[k]])), s.economicTerms.contractTotal, s.paymentSchedule.installments);
}
