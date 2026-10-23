/** Calendar policy for new issuance only; audit instants remain ISO-8601 UTC. */
export const ISSUE_DATE_TIME_ZONE = 'America/Argentina/Buenos_Aires';
export const ISSUE_DATE_POLICY = 'AR_LOCAL_ISSUE_DATE_V1';
export function argentinaBusinessDate(instant: Date = new Date()): string {
    if (!Number.isFinite(instant.getTime())) throw Error('INVALID_BUSINESS_INSTANT');
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: ISSUE_DATE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
    const value = (type: string) => parts.find(p => p.type === type)!.value;
    return `${value('year')}-${value('month')}-${value('day')}`;
}
export function assertCurrentIssueDates(context: { contractIssueDate: string; promissoryNoteIssueDate: string }, instant: Date = new Date()) {
    const today = argentinaBusinessDate(instant);
    if (context.contractIssueDate !== today || context.promissoryNoteIssueDate !== today) throw Error('ACTUAL_ISSUE_DATE_REQUIRED');
}
