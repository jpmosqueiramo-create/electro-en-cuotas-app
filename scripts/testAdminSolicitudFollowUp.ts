import assert from 'node:assert/strict';
import { followUpTransitions, nextFollowUpState, parseFollowUpCommand, formatFollowUpDate, type FollowUpState } from '../src/lib/adminSolicitudFollowUp';
const command = { commandId: 'unit-command-00001', expectedRevision: 0, action: 'ADD_NOTE', note: '  Revisado\ncon documentación.  ', toState: null };
assert.equal(parseFollowUpCommand(command).note, 'Revisado\ncon documentación.');
for (const patch of [{ note: '' }, { note: '  ' }, { note: 'x'.repeat(2001) }, { note: '\u0000' }, { expectedRevision: -1 }, { expectedRevision: 1.5 }, { expectedRevision: Number.MAX_SAFE_INTEGER }, { expectedRevision: '1' }, { action: 'APPROVE' }, { commandId: '../bad' }, { toState: 'APPROVED' }, { montoCuota: 1 }, { actor: 'forged' }, { at: '2020-01-01' }]) {
  assert.throws(() => parseFollowUpCommand({ ...command, ...patch }));
}
for (const from of Object.keys(followUpTransitions) as FollowUpState[]) {
  assert.equal(nextFollowUpState(from, parseFollowUpCommand(command)), from);
  for (const to of Object.keys(followUpTransitions) as FollowUpState[]) {
    const change = parseFollowUpCommand({ ...command, action: 'CHANGE_STATE', toState: to });
    if (followUpTransitions[from].includes(to)) assert.equal(nextFollowUpState(from, change), to);
    else assert.throws(() => nextFollowUpState(from, change));
  }
}
assert.match(formatFollowUpDate('2026-11-24T01:02:00.000Z'), /23.*nov.*2026.*22:02/);
console.log('FOLLOW_UP_VALIDATION_AND_TRANSITIONS = PASS');
