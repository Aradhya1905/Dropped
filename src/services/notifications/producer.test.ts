import {
  DEFAULT_COOLDOWN_MS,
  EMPTY_PRODUCER_STATE,
  FIRED_ID_CAP,
  decide,
  openGate,
  shouldPoll,
  type GateInput,
  type NotificationGate,
  type ProducerState,
} from './producer';
import type { Coordinate, Secret } from '../../types';

const HERE: Coordinate = { lat: 12.9716, lng: 77.5946 };

/** ~111 m per 0.001° of latitude, which is all this file needs. */
function north(meters: number): Coordinate {
  return { lat: HERE.lat + meters / 111_000, lng: HERE.lng };
}

function secret(id: string, coordinate: Coordinate, over: Partial<Secret> = {}): Secret {
  return {
    id,
    drop: { id, coordinate, createdAt: 0 },
    createdAt: 0,
    mood: 'wonder',
    hearts: 0,
    stoodHere: 0,
    replyCount: 0,
    sealed: true,
    saved: false,
    hearted: false,
    shareable: true,
    ...over,
  };
}

const NOW = 1_700_000_000_000;

function state(over: Partial<ProducerState> = {}): ProducerState {
  return { ...EMPTY_PRODUCER_STATE, ...over };
}

describe('shouldPoll', () => {
  it('polls on the very first fix', () => {
    expect(shouldPoll(HERE, state())).toBe(true);
  });

  it('does not poll again from the same spot', () => {
    expect(shouldPoll(HERE, state({ lastCheckCoord: HERE }))).toBe(false);
  });

  it('polls once the walker has moved far enough', () => {
    expect(shouldPoll(north(100), state({ lastCheckCoord: HERE }))).toBe(true);
  });
});

describe('decide', () => {
  it('returns no-candidates when nothing is nearby', () => {
    const d = decide({ fix: HERE, nearby: [], state: state(), now: NOW, gate: openGate });
    expect(d.fire).toBeNull();
    expect(d.reason).toBe('no-candidates');
  });

  it('ignores drops outside the notify radius', () => {
    const d = decide({
      fix: HERE,
      nearby: [secret('far', north(1_000))],
      state: state(),
      now: NOW,
      gate: openGate,
    });
    expect(d.reason).toBe('no-candidates');
  });

  it('excludes a drop this device has already revealed', () => {
    const d = decide({
      fix: HERE,
      nearby: [secret('read', north(30))],
      state: state(),
      now: NOW,
      gate: openGate,
      revealedIds: ['read'],
    });
    expect(d.reason).toBe('no-candidates');
  });

  it('excludes a drop the server already unsealed for us', () => {
    const d = decide({
      fix: HERE,
      nearby: [secret('open', north(30), { sealed: false, body: 'already read' })],
      state: state(),
      now: NOW,
      gate: openGate,
    });
    expect(d.reason).toBe('no-candidates');
  });

  it('excludes an expired drop', () => {
    const d = decide({
      fix: HERE,
      nearby: [secret('gone', north(30), { expiresAt: NOW - 1 })],
      state: state(),
      now: NOW,
      gate: openGate,
    });
    expect(d.reason).toBe('no-candidates');
  });

  it('fires for a nearby sealed drop', () => {
    const d = decide({
      fix: HERE,
      nearby: [secret('a', north(40))],
      state: state(),
      now: NOW,
      gate: openGate,
    });
    expect(d.fire?.id).toBe('a');
    expect(d.reason).toBe('fire');
    expect(Math.round(d.distanceM ?? 0)).toBe(40);
    expect(d.state.lastFiredAt).toBe(NOW);
    expect(d.state.firedDropIds).toEqual(['a']);
  });

  it('picks the nearer of two candidates', () => {
    const d = decide({
      fix: HERE,
      nearby: [secret('far', north(120)), secret('near', north(20))],
      state: state(),
      now: NOW,
      gate: openGate,
    });
    expect(d.fire?.id).toBe('near');
  });

  it('never hums twice about the same drop — including after a restart', () => {
    // `state` here is what a cold start would have loaded from MMKV.
    const persisted = state({
      lastFiredAt: NOW - DEFAULT_COOLDOWN_MS - 1,
      firedDropIds: ['a'],
    });
    const d = decide({
      fix: HERE,
      nearby: [secret('a', north(40))],
      state: persisted,
      now: NOW,
      gate: openGate,
    });
    expect(d.fire).toBeNull();
    expect(d.reason).toBe('already-fired');
  });

  it('stays silent inside the cooldown, and leaves the state untouched', () => {
    const persisted = state({ lastFiredAt: NOW - 60_000, firedDropIds: ['a'] });
    const d = decide({
      fix: north(500),
      nearby: [secret('b', north(500))],
      state: persisted,
      now: NOW,
      gate: openGate,
    });
    expect(d.reason).toBe('cooldown');
    // Crucially unchanged: a burst of fixes must not keep pushing the cooldown
    // forward and starve the next real hum.
    expect(d.state).toEqual(persisted);
  });

  it('fires again once the cooldown has passed', () => {
    const d = decide({
      fix: HERE,
      nearby: [secret('b', north(40))],
      state: state({ lastFiredAt: NOW - DEFAULT_COOLDOWN_MS, firedDropIds: ['a'] }),
      now: NOW,
      gate: openGate,
    });
    expect(d.fire?.id).toBe('b');
    expect(d.state.firedDropIds).toEqual(['a', 'b']);
  });

  it('returns the gate verdict unmodified — no second gate lives here', () => {
    const gate: NotificationGate = () => ({ allowed: false, reason: 'quiet-hours' });
    const d = decide({
      fix: HERE,
      nearby: [secret('a', north(40))],
      state: state(),
      now: NOW,
      gate,
    });
    expect(d.fire).toBeNull();
    expect(d.reason).toBe('quiet-hours');
    // A blocked hum is not a fired hum: the drop stays eligible for later.
    expect(d.state.firedDropIds).toEqual([]);
    expect(d.state.lastFiredAt).toBeNull();
  });

  it('hands the gate the drop and its distance', () => {
    const seen: GateInput[] = [];
    const gate: NotificationGate = input => {
      seen.push(input);
      return { allowed: true };
    };
    decide({
      fix: HERE,
      nearby: [secret('a', north(40))],
      state: state(),
      now: NOW,
      gate,
    });
    expect(seen).toHaveLength(1);
    expect(seen[0].secret.id).toBe('a');
    expect(Math.round(seen[0].distanceM)).toBe(40);
    expect(seen[0].now).toBe(NOW);
    expect(seen[0].coordinate).toEqual(HERE);
  });

  it('caps the remembered fired ids', () => {
    const full = Array.from({ length: FIRED_ID_CAP }, (_, i) => `old-${i}`);
    const d = decide({
      fix: HERE,
      nearby: [secret('new', north(40))],
      state: state({ firedDropIds: full }),
      now: NOW,
      gate: openGate,
    });
    expect(d.state.firedDropIds).toHaveLength(FIRED_ID_CAP);
    expect(d.state.firedDropIds[FIRED_ID_CAP - 1]).toBe('new');
    expect(d.state.firedDropIds).not.toContain('old-0');
  });

  it('records where it looked even when nothing fires', () => {
    const d = decide({ fix: HERE, nearby: [], state: state(), now: NOW, gate: openGate });
    expect(d.state.lastCheckCoord).toEqual(HERE);
  });
});
