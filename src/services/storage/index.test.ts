import {
  addSavedId,
  addWalkedCells,
  clearAll,
  getAccurateCompass,
  setAccurateCompass,
  clearWalkedCells,
  FOG_CELL_CAP,
  getDeviceId,
  getEchoCache,
  getEchoesEnabled,
  getMutedEchoIds,
  getOnboardingComplete,
  getMoodFilter,
  getSavedIds,
  getWalkedCells,
  isEchoMuted,
  isSaved,
  removeSavedId,
  setEchoCache,
  setEchoesEnabled,
  setEchoMuted,
  setMoodFilter,
  setOnboardingComplete,
} from './index';
import { echoCheckDue } from '../../utils/echo';

// Stub the device adapter so storage doesn't reach for the native unique id.
jest.mock('../device', () => ({
  getNativeUniqueId: () => 'fixed-native-id',
  nativeIdToUuidV4: () => 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
}));

// In-memory MMKV stand-in so storage logic is testable without the native module.
jest.mock('react-native-mmkv', () => {
  const store = new Map<string, string | boolean | number>();
  const instance = {
    getString: (k: string) => {
      const v = store.get(k);
      return typeof v === 'string' ? v : undefined;
    },
    getBoolean: (k: string) => {
      const v = store.get(k);
      return typeof v === 'boolean' ? v : undefined;
    },
    set: (k: string, v: string | boolean | number) => {
      store.set(k, v);
    },
    remove: (k: string) => store.delete(k),
    clearAll: () => store.clear(),
    addOnValueChangedListener: () => ({ remove: () => {} }),
  };
  return { createMMKV: () => instance };
});

beforeEach(() => clearAll());

describe('storage device id', () => {
  it('derives a uuid from the native id and stays stable across calls', () => {
    const a = getDeviceId();
    const b = getDeviceId();
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('storage onboarding flag', () => {
  it('defaults false, persists true', () => {
    expect(getOnboardingComplete()).toBe(false);
    setOnboardingComplete(true);
    expect(getOnboardingComplete()).toBe(true);
  });
});

describe('storage walked cells (fog of war)', () => {
  it('round-trips a set of cells', () => {
    expect(getWalkedCells().size).toBe(0);
    addWalkedCells(['1:2', '3:4']);
    expect(getWalkedCells()).toEqual(new Set(['1:2', '3:4']));
  });

  it('does not grow on duplicates', () => {
    addWalkedCells(['1:2']);
    addWalkedCells(['1:2', '1:2']);
    expect(getWalkedCells().size).toBe(1);
  });

  it('clears', () => {
    addWalkedCells(['1:2']);
    clearWalkedCells();
    expect(getWalkedCells().size).toBe(0);
  });

  it('caps the set and evicts the oldest cell first', () => {
    const ids = Array.from({ length: FOG_CELL_CAP + 1 }, (_, i) => `0:${i}`);
    addWalkedCells(ids);
    const cells = getWalkedCells();
    expect(cells.size).toBe(FOG_CELL_CAP);
    expect(cells.has('0:0')).toBe(false); // first inserted, evicted
    expect(cells.has(`0:${FOG_CELL_CAP}`)).toBe(true); // last inserted, kept
  });
});

describe('storage mood filter', () => {
  it('defaults to no filter', () => {
    expect(getMoodFilter()).toEqual([]);
  });

  it('round-trips a selection', () => {
    setMoodFilter(['joy', 'wonder']);
    expect(getMoodFilter()).toEqual(['joy', 'wonder']);
  });

  it('drops a mood it no longer recognizes instead of crashing the map', () => {
    setMoodFilter(['joy', 'dread' as never]);
    expect(getMoodFilter()).toEqual(['joy']);
  });

  it('survives a persisted value that is not a list at all', () => {
    setMoodFilter('joy' as never);
    expect(getMoodFilter()).toEqual([]);
  });
});

describe('storage accurate compass', () => {
  it('defaults to the lying needle and persists the opt-out', () => {
    expect(getAccurateCompass()).toBe(false);
    setAccurateCompass(true);
    expect(getAccurateCompass()).toBe(true);
    setAccurateCompass(false);
    expect(getAccurateCompass()).toBe(false);
  });
});

describe('storage anniversary echoes', () => {
  const memo = {
    secretId: 's1',
    interval: '1yr' as const,
    kind: 'found' as const,
    stoodAt: 1_700_000_000_000,
    placeLabel: 'The bridge',
    mood: 'ache',
  };

  it('is off until asked for', () => {
    // Not a preference like map style — an unrequested reminder about
    // something painful is the risk this whole feature carries.
    expect(getEchoesEnabled()).toBe(false);
    setEchoesEnabled(true);
    expect(getEchoesEnabled()).toBe(true);
  });

  it('forgets the cached echoes when switched off', () => {
    setEchoesEnabled(true);
    setEchoCache({ day: '2026-08-07', lat: 12.97, lng: 77.59, memos: [memo] });
    setEchoesEnabled(false);
    expect(getEchoCache()).toBeNull();
  });

  it('round-trips a mute, and forgets it again', () => {
    expect(isEchoMuted('s1')).toBe(false);
    setEchoMuted('s1', true);
    setEchoMuted('s1', true); // dedupe
    expect(getMutedEchoIds()).toEqual(['s1']);
    setEchoMuted('s1', false);
    expect(isEchoMuted('s1')).toBe(false);
  });

  it('excludes a muted drop from a list of echoes', () => {
    setEchoMuted('s1', true);
    const muted = getMutedEchoIds();
    expect([memo, { ...memo, secretId: 's2' }].filter(m => !muted.includes(m.secretId)))
      .toEqual([{ ...memo, secretId: 's2' }]);
  });

  it('caches the place, the anniversary and the mood — never the body', () => {
    // The confession itself must not be written to disk on a device that only
    // walked past it. This assertion is the guard on that.
    setEchoCache({ day: '2026-08-07', lat: 12.97, lng: 77.59, memos: [memo] });
    const cached = getEchoCache()!;
    expect(cached.memos).toEqual([memo]);
    for (const m of cached.memos) {
      expect(m).not.toHaveProperty('body');
    }
  });

  it('ignores a persisted cache that is not the shape we wrote', () => {
    setEchoCache({ day: 7 } as never);
    expect(getEchoCache()).toBeNull();
  });

  it('is due again the next day, and after a 250 m move — but not a 50 m one', () => {
    // The endpoint-hammering guard, end to end: the checkpoint the app persists
    // and the gate that reads it.
    const here = { lat: 12.9716, lng: 77.5946 };
    setEchoCache({ day: '2026-08-07', lat: here.lat, lng: here.lng, memos: [] });
    const last = getEchoCache()!;

    expect(echoCheckDue(last, here, '2026-08-07')).toBe(false);
    expect(
      echoCheckDue(last, { lat: here.lat + 0.0005, lng: here.lng }, '2026-08-07'),
    ).toBe(false); // ~55 m — a walk around the block
    expect(
      echoCheckDue(last, { lat: here.lat + 0.004, lng: here.lng }, '2026-08-07'),
    ).toBe(true); // ~440 m
    expect(echoCheckDue(last, here, '2026-08-08')).toBe(true);
  });
});

describe('storage saved ids', () => {
  it('round-trips add / remove without duplicates', () => {
    expect(getSavedIds()).toEqual([]);
    addSavedId('s1');
    addSavedId('s1'); // dedupe
    addSavedId('s2');
    expect(getSavedIds()).toEqual(['s1', 's2']);
    expect(isSaved('s1')).toBe(true);
    removeSavedId('s1');
    expect(getSavedIds()).toEqual(['s2']);
    expect(isSaved('s1')).toBe(false);
  });
});
