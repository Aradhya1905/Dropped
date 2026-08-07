import {
  addSavedId,
  addWalkedCells,
  clearAll,
  clearWalkedCells,
  FOG_CELL_CAP,
  getDeviceId,
  getOnboardingComplete,
  getMoodFilter,
  getSavedIds,
  getWalkedCells,
  isSaved,
  removeSavedId,
  setMoodFilter,
  setOnboardingComplete,
} from './index';

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
