import type { Coordinate, Secret } from '../../types';

// jest.setup installs fake timers for the screens' ambient animations; nothing
// here is timer-driven, and fake timers would strand the setImmediate flush
// that lets an async pass settle.
jest.useRealTimers();

// --- doubles -----------------------------------------------------------------

const mockFetchNearby = jest.fn();
jest.mock('../api', () => ({
  fetchNearbyDrops: (...args: unknown[]) => mockFetchNearby(...args),
}));
jest.mock('../api/mappers', () => ({
  apiSecretToSecret: (s: unknown) => s,
}));

/**
 * `humNearbySecret` is the gate *and* the exit to the OS, so the double both
 * records what the engine asked for and hands back the verdict a test wants.
 * `notifyNearbySecret` is here only to assert the engine never reaches for it.
 */
const mockHum = jest.fn(() => Promise.resolve('fire'));
const mockNotify = jest.fn(() => Promise.resolve());
const mockStartService = jest.fn(() => Promise.resolve());
const mockStopService = jest.fn(() => Promise.resolve());
jest.mock('../notifications', () => ({
  humNearbySecret: (...a: unknown[]) => mockHum(...(a as [])),
  notifications: {
    notifyNearbySecret: (...a: unknown[]) => mockNotify(...(a as [])),
    startWalkService: () => mockStartService(),
    stopWalkService: () => mockStopService(),
    onNotificationPress: () => () => {},
    getInitialSecretId: () => Promise.resolve(null),
  },
}));

/** The live watch, replaced by something a test can drive by hand. */
let mockEmit: ((fix: { coordinate: Coordinate; accuracy: number }) => void) | null = null;
const mockEnableBackground = jest.fn();
const mockDisableBackground = jest.fn();
const mockSetCadence = jest.fn();
let mockGranted = true;
jest.mock('../location/backgroundWatch', () => ({
  subscribe: (listener: (f: { coordinate: Coordinate; accuracy: number }) => void) => {
    mockEmit = listener;
    return () => {
      mockEmit = null;
    };
  },
  getLastFix: () => null,
  enableBackground: () => mockEnableBackground(),
  disableBackground: () => mockDisableBackground(),
  isBackgroundEnabled: () => true,
  setCadence: (c: string) => mockSetCadence(c),
  hasBackgroundPermission: () => Promise.resolve(mockGranted),
  requestBackgroundPermission: () => Promise.resolve('granted'),
}));

let mockWalkEnabled = true;
const mockSetWalkEnabled = jest.fn((on: boolean) => {
  mockWalkEnabled = on;
});
let mockProducerState = {
  lastFiredAt: null as number | null,
  firedDropIds: [] as string[],
  lastCheckCoord: null as Coordinate | null,
};
jest.mock('../storage', () => ({
  getBackgroundWalkEnabled: () => mockWalkEnabled,
  setBackgroundWalkEnabled: (on: boolean) => mockSetWalkEnabled(on),
  getMoodFilter: () => [],
  getPrivacyZones: () => [],
  getSeenIds: () => [],
  getProducerState: () => mockProducerState,
  setProducerState: (s: typeof mockProducerState) => {
    mockProducerState = s;
  },
}));

// --- fixtures ----------------------------------------------------------------

const HERE: Coordinate = { lat: 12.9716, lng: 77.5946 };

function secret(id: string, meters: number): Secret {
  const coordinate = { lat: HERE.lat + meters / 111_000, lng: HERE.lng };
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
    distanceMeters: meters,
  };
}

type Engine = typeof import('./index');

function load(): Engine {
  let engine!: Engine;
  jest.isolateModules(() => {
    engine = require('./index');
  });
  return engine;
}

/** Push a fix through the engine and let its async pass settle. */
async function walkTo(coordinate: Coordinate): Promise<void> {
  mockEmit?.({ coordinate, accuracy: 5 });
  await new Promise<void>(resolve => setImmediate(() => resolve()));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEmit = null;
  mockWalkEnabled = true;
  mockGranted = true;
  mockHum.mockResolvedValue('fire');
  mockProducerState = { lastFiredAt: null, firedDropIds: [], lastCheckCoord: null };
  mockFetchNearby.mockResolvedValue({ secrets: [secret('a', 40)], hiddenByFilter: 0 });
});

describe('startWalkEngine', () => {
  it('watches and shows the service notification once it is allowed', async () => {
    const engine = load();
    await engine.startWalkEngine();

    expect(mockEnableBackground).toHaveBeenCalled();
    expect(mockStartService).toHaveBeenCalled();
    expect(mockEmit).not.toBeNull();
  });

  it('does not subscribe at all when the user hasn’t asked for it', async () => {
    mockWalkEnabled = false;
    const engine = load();
    await engine.startWalkEngine();

    // No subscriber means no GPS hold and no /drops/nearby polling for a
    // feature nobody turned on.
    expect(mockEmit).toBeNull();
    expect(mockEnableBackground).not.toHaveBeenCalled();
    expect(mockStopService).toHaveBeenCalled();
  });

  it('forgets the intent when the OS grant was revoked behind our back', async () => {
    mockGranted = false;
    const engine = load();
    await engine.startWalkEngine();

    expect(mockSetWalkEnabled).toHaveBeenCalledWith(false);
    expect(mockEmit).toBeNull();
  });
});

describe('a fix', () => {
  it('hums about the nearest sealed drop, through humNearbySecret only', async () => {
    const engine = load();
    await engine.startWalkEngine();
    await walkTo(HERE);

    expect(mockHum).toHaveBeenCalledTimes(1);
    const [req] = mockHum.mock.calls[0] as unknown as [
      { secretId: string; mood: string; at: { lat: number }; isMoving: boolean },
    ];
    expect(req).toMatchObject({ secretId: 'a', mood: 'wonder' });
    // The gate needs a coordinate to answer the privacy-zone question; without
    // one it fails closed and nothing would ever hum.
    expect(req.at).toEqual(HERE);
    expect(engine.getLastDecisionReason()).toBe('fire');

    // The engine must never reach past the gate to the adapter.
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('reports the gate verdict when the hum is refused', async () => {
    mockHum.mockResolvedValue('quiet-hours');
    const engine = load();
    await engine.startWalkEngine();
    await walkTo(HERE);

    expect(engine.getLastDecisionReason()).toBe('quiet-hours');
  });

  it('does not burn a drop the gate refused', async () => {
    mockHum.mockResolvedValue('quiet-hours');
    const engine = load();
    await engine.startWalkEngine();
    await walkTo(HERE);

    // One silent night must not cost the user every drop they walked past in
    // it — the candidate stays eligible for the next pass.
    expect(mockProducerState.firedDropIds).toEqual([]);
    expect(mockProducerState.lastFiredAt).toBeNull();
  });

  it('burns a drop that actually hummed', async () => {
    const engine = load();
    await engine.startWalkEngine();
    await walkTo(HERE);

    expect(mockProducerState.firedDropIds).toEqual(['a']);
  });

  it('stays silent when the pre-hum filter says no, and says why', async () => {
    const engine = load();
    engine.setNotificationGate(() => ({ allowed: false, reason: 'suppressed' }));
    await engine.startWalkEngine();
    await walkTo(HERE);

    expect(mockHum).not.toHaveBeenCalled();
    expect(engine.getLastDecisionReason()).toBe('suppressed');
  });

  it('sends nothing to the server from inside a privacy zone', async () => {
    const engine = load();
    engine.setPrivacyZoneCheck(() => true);
    await engine.startWalkEngine();
    await walkTo(HERE);

    // The zone has to suppress the *request*, not just the notification —
    // "I am at home, what's near me?" is the leak.
    expect(mockFetchNearby).not.toHaveBeenCalled();
    expect(mockHum).not.toHaveBeenCalled();
    expect(engine.getLastDecisionReason()).toBe('privacy-zone');
  });

  it('does not poll again from the same spot', async () => {
    const engine = load();
    await engine.startWalkEngine();
    await walkTo(HERE);
    await walkTo(HERE);

    expect(mockFetchNearby).toHaveBeenCalledTimes(1);
  });

  it('survives an offline pass without humming', async () => {
    mockFetchNearby.mockRejectedValue(new Error('offline'));
    const engine = load();
    await engine.startWalkEngine();
    await walkTo(HERE);

    expect(mockHum).not.toHaveBeenCalled();
    expect(engine.getLastDecisionReason()).toBe('error');
  });

  it('drives the GPS harder only while something is close', async () => {
    const engine = load();
    await engine.startWalkEngine();
    await walkTo(HERE);
    expect(mockSetCadence).toHaveBeenLastCalledWith('high');

    mockFetchNearby.mockResolvedValue({ secrets: [secret('b', 500)], hiddenByFilter: 0 });
    await walkTo({ lat: HERE.lat + 0.002, lng: HERE.lng });
    expect(mockSetCadence).toHaveBeenLastCalledWith('low');
  });
});

describe('setBackgroundWalk', () => {
  it('stops the service and the hold when switched off', async () => {
    const engine = load();
    await engine.startWalkEngine();
    const result = await engine.setBackgroundWalk(false);

    expect(result.enabled).toBe(false);
    expect(mockSetWalkEnabled).toHaveBeenCalledWith(false);
    expect(mockDisableBackground).toHaveBeenCalled();
    expect(mockStopService).toHaveBeenCalled();
  });
});
