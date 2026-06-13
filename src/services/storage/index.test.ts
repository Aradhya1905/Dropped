import {
  addSavedId,
  clearAll,
  getDeviceId,
  getOnboardingComplete,
  getSavedIds,
  isSaved,
  removeSavedId,
  setOnboardingComplete,
} from './index';

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
    clearAll: () => store.clear(),
  };
  return { createMMKV: () => instance };
});

beforeEach(() => clearAll());

describe('storage device id', () => {
  it('generates once and stays stable across calls', () => {
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
