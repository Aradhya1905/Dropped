import {
  conditionInvitation,
  conditionTag,
  opensInLabel,
} from './revealCondition';

const NOW = Date.parse('2026-08-07T12:00:00.000Z');
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('conditionTag', () => {
  it('is null for a drop readable at any hour', () => {
    expect(conditionTag(undefined)).toBeNull();
  });

  it('names each gate', () => {
    expect(conditionTag('night')).toBe('waits for dark');
    expect(conditionTag('day')).toBe('daylight only');
  });
});

describe('conditionInvitation', () => {
  it('is null when there is no gate to explain', () => {
    expect(conditionInvitation(undefined)).toBeNull();
  });

  it('leads with the good news — you found it', () => {
    // The refusal is an appointment, not a failure: the walk already worked.
    expect(conditionInvitation('night')).toMatch(/^You found it\./);
    expect(conditionInvitation('day')).toMatch(/^You found it\./);
  });
});

describe('opensInLabel', () => {
  it('is null when the server sent no opensAt', () => {
    // The polar case: the next sunset can be months away, and the server says
    // nothing rather than guessing. The UI shows the invitation alone.
    expect(opensInLabel(undefined, NOW)).toBeNull();
  });

  it('is null once the instant has passed', () => {
    // Better to drop the countdown than to render "in about 0 minutes".
    expect(opensInLabel(NOW - MINUTE, NOW)).toBeNull();
    expect(opensInLabel(NOW, NOW)).toBeNull();
  });

  it('counts in minutes under an hour', () => {
    expect(opensInLabel(NOW + 40 * MINUTE, NOW)).toBe('in about 40 minutes');
  });

  it('never says zero minutes for an instant that has not passed', () => {
    expect(opensInLabel(NOW + 1000, NOW)).toBe('in about 1 minute');
  });

  it('counts in hours under a day', () => {
    expect(opensInLabel(NOW + 4 * HOUR, NOW)).toBe('in about 4 hours');
  });

  it('singularises an hour', () => {
    expect(opensInLabel(NOW + HOUR, NOW)).toBe('in about 1 hour');
  });

  it('counts in days beyond that', () => {
    expect(opensInLabel(NOW + 3 * DAY, NOW)).toBe('in about 3 days');
  });
});
