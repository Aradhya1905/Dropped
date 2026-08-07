import {
  ALWAYS_COOLDOWN_MS,
  RARE_COOLDOWN_MS,
  inQuietHours,
  minutesOfDay,
  shouldNotify,
  type GateInput,
} from './gate';

const NOON = 12 * 60;

/** Everything open: the gate says 'fire' unless a test closes something. */
const open: GateInput = {
  inPrivacyZone: false,
  mode: 'rare',
  onlyWhenMoving: true,
  isMoving: true,
  quietHours: { startMin: 22 * 60, endMin: 8 * 60 },
  nowMin: NOON,
  distanceM: 120,
  notifyRadiusM: 500,
  subscribedMoods: ['joy', 'ache', 'trouble', 'wonder'],
  dropMood: 'ache',
  lastFiredAt: null,
  now: 1_700_000_000_000,
};

describe('shouldNotify', () => {
  it('fires when every lever agrees', () => {
    expect(shouldNotify(open)).toBe('fire');
  });

  it('says nothing at all inside a privacy zone, whatever the levers say', () => {
    // Every other gate wide open, including the mode a user picks when they
    // want to hear about everything. A privacy zone still wins.
    expect(
      shouldNotify({
        ...open,
        inPrivacyZone: true,
        mode: 'always',
        quietHours: null,
        distanceM: 0,
        lastFiredAt: null,
      }),
    ).toBe('privacy-zone');
  });

  it('is muted by the master switch regardless of everything else', () => {
    expect(
      shouldNotify({
        ...open,
        mode: 'off',
        isMoving: true,
        distanceM: 0,
        quietHours: null,
      }),
    ).toBe('muted');
  });

  it('stays silent while the walker is sitting still', () => {
    // The single check this whole feature exists for.
    expect(shouldNotify({ ...open, isMoving: false })).toBe('not-moving');
  });

  it('ignores stillness when the moving-only lever is off', () => {
    expect(
      shouldNotify({ ...open, isMoving: false, onlyWhenMoving: false }),
    ).toBe('fire');
  });

  it('refuses a drop beyond the notification radius', () => {
    expect(shouldNotify({ ...open, distanceM: 501 })).toBe('too-far');
  });

  it('fires for a drop exactly at the radius — "within" is inclusive', () => {
    expect(shouldNotify({ ...open, distanceM: 500 })).toBe('fire');
  });

  it('refuses a mood the user unsubscribed from', () => {
    expect(
      shouldNotify({ ...open, subscribedMoods: ['joy', 'wonder'] }),
    ).toBe('mood');
  });

  it('goes fully silent when no mood is subscribed', () => {
    expect(shouldNotify({ ...open, subscribedMoods: [] })).toBe('mood');
  });
});

describe('shouldNotify quiet hours', () => {
  // 22:00–08:00 wraps midnight — the classic off-by-one, pinned here.
  const night = { startMin: 22 * 60, endMin: 8 * 60 };

  it('is quiet at 23:30, before midnight', () => {
    expect(shouldNotify({ ...open, quietHours: night, nowMin: 23 * 60 + 30 }))
      .toBe('quiet-hours');
  });

  it('is quiet at 02:00, after midnight', () => {
    expect(shouldNotify({ ...open, quietHours: night, nowMin: 2 * 60 })).toBe(
      'quiet-hours',
    );
  });

  it('is awake again at 09:00', () => {
    expect(shouldNotify({ ...open, quietHours: night, nowMin: 9 * 60 })).toBe(
      'fire',
    );
  });

  it('treats the window as half-open at both edges', () => {
    expect(inQuietHours(22 * 60, night)).toBe(true); // 22:00 — already quiet
    expect(inQuietHours(8 * 60, night)).toBe(false); // 08:00 — already over
  });

  it('handles a window that does not cross midnight', () => {
    const lunch = { startMin: 13 * 60, endMin: 14 * 60 };
    expect(inQuietHours(13 * 60 + 30, lunch)).toBe(true);
    expect(inQuietHours(12 * 60 + 59, lunch)).toBe(false);
    expect(inQuietHours(14 * 60, lunch)).toBe(false);
  });

  it('never silences the whole day on a degenerate window', () => {
    // A start === end window means "no quiet hours", not "always quiet" — a
    // setting that could mute the app forever has to fail towards noise.
    expect(inQuietHours(3 * 60, { startMin: 60, endMin: 60 })).toBe(false);
  });

  it('is never quiet when quiet hours are switched off', () => {
    expect(inQuietHours(3 * 60, null)).toBe(false);
  });
});

describe('shouldNotify cooldown', () => {
  it('holds a rare hum back until the interval has passed', () => {
    const justFired = { ...open, lastFiredAt: open.now - 60_000 };
    expect(shouldNotify(justFired)).toBe('cooldown');

    const longAgo = { ...open, lastFiredAt: open.now - RARE_COOLDOWN_MS };
    expect(shouldNotify(longAgo)).toBe('fire');
  });

  it('throttles "always" too, so a dense street is one ping not ten', () => {
    const mode = 'always' as const;
    expect(
      shouldNotify({ ...open, mode, lastFiredAt: open.now - 60_000 }),
    ).toBe('cooldown');
    expect(
      shouldNotify({ ...open, mode, lastFiredAt: open.now - ALWAYS_COOLDOWN_MS }),
    ).toBe('fire');
  });

  it('lets "always" through where "rare" would still be cooling down', () => {
    const lastFiredAt = open.now - 30 * 60 * 1000; // half an hour ago
    expect(shouldNotify({ ...open, mode: 'rare', lastFiredAt })).toBe('cooldown');
    expect(shouldNotify({ ...open, mode: 'always', lastFiredAt })).toBe('fire');
  });
});

describe('shouldNotify precedence', () => {
  // With several gates shut at once the reported reason is fixed, so "why was
  // I not notified" has one answer rather than whichever branch ran first.
  const allShut: GateInput = {
    ...open,
    mode: 'off',
    nowMin: 23 * 60,
    isMoving: false,
    distanceM: 5_000,
    subscribedMoods: [],
    lastFiredAt: open.now,
  };

  it('reports the master switch before anything else', () => {
    expect(shouldNotify(allShut)).toBe('muted');
  });

  it('then quiet hours, then stillness, then distance, then mood', () => {
    expect(shouldNotify({ ...allShut, mode: 'rare' })).toBe('quiet-hours');
    expect(shouldNotify({ ...allShut, mode: 'rare', nowMin: NOON })).toBe(
      'not-moving',
    );
    expect(
      shouldNotify({ ...allShut, mode: 'rare', nowMin: NOON, isMoving: true }),
    ).toBe('too-far');
    expect(
      shouldNotify({
        ...allShut,
        mode: 'rare',
        nowMin: NOON,
        isMoving: true,
        distanceM: 10,
      }),
    ).toBe('mood');
  });

  it('reports the cooldown last — it is the one that fixes itself', () => {
    expect(
      shouldNotify({
        ...allShut,
        mode: 'rare',
        nowMin: NOON,
        isMoving: true,
        distanceM: 10,
        subscribedMoods: ['ache'],
      }),
    ).toBe('cooldown');
  });
});

describe('minutesOfDay', () => {
  it('reads local wall-clock minutes off an instant', () => {
    const at = new Date(2026, 7, 7, 22, 30).getTime();
    expect(minutesOfDay(at)).toBe(22 * 60 + 30);
  });
});
