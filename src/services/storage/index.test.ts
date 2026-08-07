import {
  addSavedId,
  addWalkedCells,
  clearAll,
  clearSeals,
  getAccurateCompass,
  getBatteryMode,
  getHighContrast,
  getMapStyle,
  getReducedMotion,
  getTextScale,
  setAccurateCompass,
  setBatteryMode,
  setHighContrast,
  setMapStyle,
  setReducedMotion,
  setTextScale,
  type MapStyle,
  type TextScale,
  clearWalkedCells,
  FOG_CELL_CAP,
  getDeviceId,
  getSeal,
  getSealCities,
  getSeals,
  getEchoCache,
  getEchoesEnabled,
  getHumLastFiredAt,
  getMutedEchoIds,
  getNotificationMode,
  getNotifyRadiusM,
  getOnboardingComplete,
  getOnlyWhenMoving,
  getMoodFilter,
  getQuietHours,
  getSavedIds,
  getSubscribedMoods,
  getWalkedCells,
  isEchoMuted,
  isSaved,
  putSeal,
  removeSavedId,
  SEAL_CAP,
  setEchoCache,
  setEchoesEnabled,
  setEchoMuted,
  setHumLastFiredAt,
  setMoodFilter,
  setNotificationMode,
  setNotifyRadiusM,
  setOnboardingComplete,
  setOnlyWhenMoving,
  setQuietHours,
  setSubscribedMoods,
  addReport,
  forgetWalkedCellsInside,
  getPrivacyZones,
  getReports,
  hasReported,
  rotateDeviceId,
  setPrivacyZones,
  clearProducerState,
  getBackgroundWalkEnabled,
  getProducerState,
  setBackgroundWalkEnabled,
  setProducerState,
} from './index';
import type { PrivacyZone } from '../location/privacyZones';
import { EMPTY_PRODUCER_STATE, type ProducerState } from '../notifications/producer';
import { echoCheckDue } from '../../utils/echo';
import { cellIdFor } from '../../utils/geo';

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
    getNumber: (k: string) => {
      const v = store.get(k);
      return typeof v === 'number' ? v : undefined;
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

describe('storage wax seals', () => {
  const seal = {
    motif: 'first' as const,
    tint: 'ache',
    night: true,
    city: 'Bengaluru',
    at: 1_700_000_000_000,
  };

  it('round-trips a pressed seal', () => {
    expect(getSeal('s1')).toBeNull();
    putSeal('s1', seal);
    expect(getSeal('s1')).toEqual(seal);
  });

  it('refuses to overwrite one', () => {
    // Belt and braces with `features/trail/seals` — a silent overwrite here
    // would be invisible until someone noticed their history had changed.
    putSeal('s1', seal);
    putSeal('s1', { ...seal, motif: 'worn', at: seal.at + 1000 });
    expect(getSeal('s1')?.motif).toBe('first');
  });

  it('lists the cities it has stamped, deduped', () => {
    putSeal('s1', seal);
    putSeal('s2', { ...seal, at: seal.at + 1 });
    putSeal('s3', { ...seal, city: 'Lisbon', at: seal.at + 2 });
    expect(getSealCities().sort()).toEqual(['Bengaluru', 'Lisbon']);
  });

  it('ignores a city on a seal that never had one', () => {
    putSeal('s1', { motif: 'plain', tint: 'joy', night: false, at: 1 });
    expect(getSealCities()).toEqual([]);
  });

  it('survives a persisted value that is not an object map', () => {
    setMoodFilter([]); // unrelated write, so the store isn't empty
    putSeal('s1', seal);
    expect(getSeals()).toHaveProperty('s1');
  });

  it('caps the collection and evicts the oldest reveal first', () => {
    for (let i = 0; i <= SEAL_CAP; i++) {
      putSeal(`s${i}`, { motif: 'plain', tint: 'joy', night: false, at: 1000 + i });
    }
    const seals = getSeals();
    expect(Object.keys(seals).length).toBe(SEAL_CAP);
    expect(seals.s0).toBeUndefined(); // oldest reveal
    expect(seals[`s${SEAL_CAP}`]).toBeDefined(); // newest
  });

  it('clears', () => {
    putSeal('s1', seal);
    clearSeals();
    expect(getSeal('s1')).toBeNull();
  });
});

describe('storage retention levers', () => {
  // The defaults *are* the feature: every one of these is a way to mute the app
  // into uselessness, and almost nobody will ever open this screen.
  it('ships the deliberate defaults', () => {
    expect(getNotificationMode()).toBe('rare');
    expect(getOnlyWhenMoving()).toBe(true);
    expect(getQuietHours()).toEqual({ startMin: 22 * 60, endMin: 8 * 60 });
    expect(getNotifyRadiusM()).toBe(500);
    expect(getSubscribedMoods()).toEqual(['joy', 'ache', 'trouble', 'wonder']);
    expect(getEchoesEnabled()).toBe(false);
    expect(getHumLastFiredAt()).toBeNull();
  });

  it('round-trips the hum mode', () => {
    setNotificationMode('always');
    expect(getNotificationMode()).toBe('always');
    setNotificationMode('off');
    expect(getNotificationMode()).toBe('off');
  });

  it('carries the pre-13 "hum" value over to "always"', () => {
    // The old two-way switch persisted 'hum'. Someone who turned it on asked
    // to be told about drops; the new name for that is 'always'.
    setNotificationMode('hum' as never);
    expect(getNotificationMode()).toBe('always');
  });

  it('falls back to the default on a value the gate could not judge', () => {
    setNotificationMode('sometimes' as never);
    expect(getNotificationMode()).toBe('rare');
  });

  it('round-trips only-when-moving', () => {
    setOnlyWhenMoving(false);
    expect(getOnlyWhenMoving()).toBe(false);
    setOnlyWhenMoving(true);
    expect(getOnlyWhenMoving()).toBe(true);
  });

  it('round-trips quiet hours, including switching them off', () => {
    setQuietHours({ startMin: 21 * 60, endMin: 9 * 60 });
    expect(getQuietHours()).toEqual({ startMin: 21 * 60, endMin: 9 * 60 });
    setQuietHours(null);
    expect(getQuietHours()).toBeNull();
  });

  it('restores the default window rather than trusting a corrupt one', () => {
    // Failing open here would mean humming at 3 a.m., which is the one thing
    // this setting exists to prevent.
    setQuietHours({ startMin: 99 * 60, endMin: -1 } as never);
    expect(getQuietHours()).toEqual({ startMin: 22 * 60, endMin: 8 * 60 });
  });

  it('round-trips the notification radius and rejects one it does not offer', () => {
    setNotifyRadiusM(200);
    expect(getNotifyRadiusM()).toBe(200);
    setNotifyRadiusM(9_000 as never);
    expect(getNotifyRadiusM()).toBe(500);
  });

  it('keeps an empty mood subscription — muting by mood is a real choice', () => {
    setSubscribedMoods([]);
    expect(getSubscribedMoods()).toEqual([]);
  });

  it('drops a mood it no longer recognizes, and falls back if it is not a list', () => {
    setSubscribedMoods(['joy', 'dread' as never]);
    expect(getSubscribedMoods()).toEqual(['joy']);
    setSubscribedMoods('joy' as never);
    expect(getSubscribedMoods()).toEqual(['joy', 'ache', 'trouble', 'wonder']);
  });

  it('remembers when the last hum actually fired', () => {
    setHumLastFiredAt(1_700_000_000_000);
    expect(getHumLastFiredAt()).toBe(1_700_000_000_000);
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

describe('storage privacy zones', () => {
  const HOME: PrivacyZone = {
    id: 'z1',
    centre: { lat: 12.9716, lng: 77.5946 },
    radiusM: 150,
    label: 'Home',
  };

  it('round-trips a zone and is gone after a wipe', () => {
    expect(getPrivacyZones()).toEqual([]);
    setPrivacyZones([HOME]);
    expect(getPrivacyZones()).toEqual([HOME]);
    clearAll();
    expect(getPrivacyZones()).toEqual([]);
  });

  it('drops a malformed zone rather than trusting a radius it cannot use', () => {
    setPrivacyZones([
      HOME,
      { id: 'bad', centre: { lat: 1, lng: 1 }, radiusM: 0 },
      { id: 'worse' } as never,
    ]);
    expect(getPrivacyZones()).toEqual([HOME]);
  });

  it('forgets already-walked cells inside a new zone, and keeps the rest', () => {
    const inside = cellIdFor(HOME.centre);
    const outside = cellIdFor({ lat: HOME.centre.lat + 0.02, lng: HOME.centre.lng });
    addWalkedCells([inside, outside]);

    expect(forgetWalkedCellsInside([HOME])).toBe(1);
    expect(getWalkedCells()).toEqual(new Set([outside]));
  });

  it('forgets nothing when there are no zones', () => {
    addWalkedCells(['1:2']);
    expect(forgetWalkedCellsInside([])).toBe(0);
    expect(getWalkedCells()).toEqual(new Set(['1:2']));
  });
});

describe('storage reports', () => {
  it('remembers a report, newest first, deduped by secret', () => {
    expect(getReports()).toEqual([]);
    addReport({ id: 's1', at: 1_000 });
    addReport({ id: 's2', at: 2_000, placeLabel: 'Cubbon Park' });
    addReport({ id: 's1', at: 3_000 });

    expect(getReports().map(r => r.id)).toEqual(['s1', 's2']);
    expect(getReports()[0].at).toBe(3_000);
    expect(hasReported('s1')).toBe(true);
    expect(hasReported('nope')).toBe(false);
  });
});

describe('storage device id rotation (the panic wipe)', () => {
  it('mints a different id and keeps answering with it', () => {
    const before = getDeviceId();
    const rotated = rotateDeviceId();

    // Without the override the native id would derive the same uuid forever,
    // and "erase everything" would hand the next request the erased identity.
    expect(rotated).not.toBe(before);
    expect(rotated).toMatch(/^[0-9a-f-]{36}$/);
    expect(getDeviceId()).toBe(rotated);
  });
});

describe('storage background walk engine', () => {
  beforeEach(() => clearAll());

  it('keeps background walking off until it is asked for', () => {
    expect(getBackgroundWalkEnabled()).toBe(false);
    setBackgroundWalkEnabled(true);
    expect(getBackgroundWalkEnabled()).toBe(true);
  });

  it('forgets the producer state when background walking is turned off', () => {
    setProducerState({
      lastFiredAt: 1000,
      firedDropIds: ['a'],
      lastCheckCoord: { lat: 1, lng: 2 },
    });
    setBackgroundWalkEnabled(false);
    expect(getProducerState()).toEqual(EMPTY_PRODUCER_STATE);
  });

  it('round-trips the producer state, empty fired list included', () => {
    const state: ProducerState = {
      lastFiredAt: 1_700_000_000_000,
      firedDropIds: [],
      lastCheckCoord: { lat: 12.9716, lng: 77.5946 },
    };
    setProducerState(state);
    expect(getProducerState()).toEqual(state);
  });

  it('starts from a safe default when nothing is stored', () => {
    expect(getProducerState()).toEqual(EMPTY_PRODUCER_STATE);
  });

  it('resets a corrupt state instead of throwing', () => {
    // This is parsed on a background thread, where a throw is invisible.
    setProducerState('not a state' as unknown as ProducerState);
    expect(getProducerState()).toEqual(EMPTY_PRODUCER_STATE);

    setProducerState({
      lastFiredAt: 'soon',
      firedDropIds: [1, 'a', null],
      lastCheckCoord: { lat: 'here' },
    } as unknown as ProducerState);
    expect(getProducerState()).toEqual({
      lastFiredAt: null,
      firedDropIds: ['a'],
      lastCheckCoord: null,
    });
  });

  it('clears', () => {
    setProducerState({ lastFiredAt: 1, firedDropIds: ['a'], lastCheckCoord: null });
    clearProducerState();
    expect(getProducerState()).toEqual(EMPTY_PRODUCER_STATE);
  });
});

describe('accessibility & polish settings', () => {
  beforeEach(() => clearAll());

  it('each has the documented default', () => {
    // Every one of these defaults to the un-surprising state: nothing is
    // suppressed, nothing is boosted, and the GPS runs at full cadence.
    expect(getReducedMotion()).toBe(false);
    expect(getHighContrast()).toBe(false);
    expect(getTextScale()).toBe('system');
    expect(getBatteryMode()).toBe(false);
    expect(getMapStyle()).toBe('dropped');
  });

  it('each round-trips', () => {
    setReducedMotion(true);
    setHighContrast(true);
    setTextScale('largest');
    setBatteryMode(true);
    setMapStyle('auto');

    expect(getReducedMotion()).toBe(true);
    expect(getHighContrast()).toBe(true);
    expect(getTextScale()).toBe('largest');
    expect(getBatteryMode()).toBe(true);
    expect(getMapStyle()).toBe('auto');
  });

  it('persists the map style choice verbatim, mode included', () => {
    // `auto` must survive as `auto`. Resolving it to a concrete cut before
    // writing would turn a standing preference into a one-off choice the user
    // never made — see services/maps/nightStyle.
    setMapStyle('auto');
    expect(getMapStyle()).toBe('auto');
  });

  it('falls back to the default map style when the stored one is unknown', () => {
    // What a downgrade (or a retired style) leaves behind. MapLibre's answer to
    // an unknown style is a blank screen, so this must never reach the map.
    setMapStyle('a-style-from-the-future' as MapStyle);
    expect(getMapStyle()).toBe('dropped');
  });

  it('falls back to the default text scale when the stored one is unknown', () => {
    setTextScale('enormous' as TextScale);
    expect(getTextScale()).toBe('system');
  });
});
