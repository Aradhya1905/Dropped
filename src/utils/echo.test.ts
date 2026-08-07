import { ECHO_MIN_MOVE_M, dayKey, echoCheckDue } from './echo';

const HERE = { lat: 12.9716, lng: 77.5946 };
/** ~55 m north — a few doors down. */
const NEXT_DOOR = { lat: HERE.lat + 0.0005, lng: HERE.lng };
/** ~440 m north — a different part of the walk. */
const ACROSS_TOWN = { lat: HERE.lat + 0.004, lng: HERE.lng };

const checkpoint = (day: string, at = HERE) => ({
  day,
  lat: at.lat,
  lng: at.lng,
});

describe('dayKey', () => {
  it('is the local calendar day, zero-padded', () => {
    expect(dayKey(new Date(2026, 7, 7, 23, 30))).toBe('2026-08-07');
    expect(dayKey(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });

  it('rolls over at local midnight, not UTC midnight', () => {
    // "Once a day" has to mean once per day as the person walking around
    // experiences it — not one that turns over mid-evening because of where
    // the prime meridian is.
    const lateEvening = new Date(2026, 7, 7, 23, 59);
    const justAfter = new Date(2026, 7, 8, 0, 1);
    expect(dayKey(lateEvening)).not.toBe(dayKey(justAfter));
  });
});

describe('echoCheckDue', () => {
  it('asks the first time, with nothing remembered', () => {
    expect(echoCheckDue(null, HERE, '2026-08-07')).toBe(true);
  });

  it('asks again once the day turns over', () => {
    expect(echoCheckDue(checkpoint('2026-08-06'), HERE, '2026-08-07')).toBe(true);
  });

  it('does NOT ask again for a walk around the block', () => {
    // The whole point of the guard: a 50 m step must cost nothing. Measured
    // from the last checked point rather than by grid cell, so a short step
    // can never trip it just by landing over a boundary.
    expect(echoCheckDue(checkpoint('2026-08-07'), NEXT_DOOR, '2026-08-07')).toBe(
      false,
    );
    expect(echoCheckDue(checkpoint('2026-08-07'), HERE, '2026-08-07')).toBe(false);
  });

  it('asks again after moving more than 250 m', () => {
    expect(
      echoCheckDue(checkpoint('2026-08-07'), ACROSS_TOWN, '2026-08-07'),
    ).toBe(true);
  });

  it('treats exactly the threshold as not far enough', () => {
    // Strictly greater than, so a device parked on the boundary with jittery
    // GPS doesn't alternate between "due" and "not due" every fix.
    const justUnder = { lat: HERE.lat, lng: HERE.lng };
    expect(
      echoCheckDue(checkpoint('2026-08-07'), justUnder, '2026-08-07', 0),
    ).toBe(false);
  });

  it('exposes the threshold it actually uses', () => {
    expect(ECHO_MIN_MOVE_M).toBe(250);
  });
});
