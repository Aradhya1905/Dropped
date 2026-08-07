import { humNearbySecret } from './hum';
import { notifications } from './active';
import {
  setHumLastFiredAt,
  setNotificationMode,
  setNotifyRadiusM,
  setOnlyWhenMoving,
  setQuietHours,
  setSubscribedMoods,
  setPrivacyZones,
  getHumLastFiredAt,
  clearAll,
} from '../storage';

jest.mock('./active', () => ({
  notifications: {
    requestPermission: jest.fn(),
    notifyNearbySecret: jest.fn().mockResolvedValue(undefined),
    cancelAll: jest.fn(),
  },
}));

jest.mock('../device', () => ({
  getNativeUniqueId: () => 'fixed-native-id',
  nativeIdToUuidV4: () => 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
}));

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

const notify = notifications.notifyNearbySecret as jest.Mock;

/** Midday, so the default 22:00–08:00 quiet hours are not in the way. */
const NOON = new Date(2026, 7, 7, 12, 0).getTime();

const near = {
  secretId: 's1',
  distanceM: 120,
  near: { lat: 12.9716, lng: 77.5946 },
  mood: 'ache' as const,
  isMoving: true,
  now: NOON,
};

beforeEach(() => {
  clearAll();
  notify.mockClear();
});

describe('humNearbySecret', () => {
  it('fires, and stamps the cooldown clock', () => {
    return humNearbySecret(near).then(verdict => {
      expect(verdict).toBe('fire');
      expect(notify).toHaveBeenCalledWith({
        secretId: 's1',
        distanceM: 120,
        near: near.near,
      });
      expect(getHumLastFiredAt()).toBe(NOON);
    });
  });

  it('never touches the adapter when a lever says no', async () => {
    // The point of routing through one function: no call site can schedule a
    // notification without the gate having agreed to it first.
    setNotificationMode('off');
    await expect(humNearbySecret(near)).resolves.toBe('muted');
    expect(notify).not.toHaveBeenCalled();
  });

  it('does not spend the cooldown on a hum it suppressed', async () => {
    // A hum swallowed by quiet hours must not cost the user the next few hours
    // of eligibility — otherwise a night indoors silences the next morning.
    setQuietHours({ startMin: 11 * 60, endMin: 13 * 60 });
    await expect(humNearbySecret(near)).resolves.toBe('quiet-hours');
    expect(getHumLastFiredAt()).toBeNull();
  });

  it('stays silent inside a privacy zone, whatever the levers say', async () => {
    // Deliberately the loudest possible configuration. A zone still wins: it
    // is a promise about where someone lives, not a preference.
    setNotificationMode('always');
    setPrivacyZones([{ id: 'z1', centre: near.near, radiusM: 150, label: 'Home' }]);

    await expect(humNearbySecret({ ...near, at: near.near })).resolves.toBe(
      'privacy-zone',
    );
    expect(notify).not.toHaveBeenCalled();
    expect(getHumLastFiredAt()).toBeNull();
  });

  it('suppresses the hum when the caller cannot say where you are', async () => {
    // No coordinate = no proof you are not at home. With zones set, that has
    // to fail closed.
    setPrivacyZones([
      { id: 'z1', centre: { lat: 0, lng: 0 }, radiusM: 150, label: 'Home' },
    ]);
    await expect(humNearbySecret(near)).resolves.toBe('privacy-zone');
    expect(notify).not.toHaveBeenCalled();
  });

  it('hums normally once you have walked out of the zone', async () => {
    setPrivacyZones([{ id: 'z1', centre: near.near, radiusM: 150, label: 'Home' }]);
    const away = { lat: near.near.lat + 0.005, lng: near.near.lng }; // ~550 m
    await expect(humNearbySecret({ ...near, at: away })).resolves.toBe('fire');
    expect(notify).toHaveBeenCalled();
  });

  it('reads each lever from storage', async () => {
    setOnlyWhenMoving(true);
    await expect(humNearbySecret({ ...near, isMoving: false })).resolves.toBe(
      'not-moving',
    );

    setOnlyWhenMoving(false);
    setNotifyRadiusM(200);
    await expect(humNearbySecret({ ...near, distanceM: 400 })).resolves.toBe(
      'too-far',
    );

    setSubscribedMoods(['joy']);
    await expect(humNearbySecret(near)).resolves.toBe('mood');

    setSubscribedMoods(['ache']);
    setHumLastFiredAt(NOON - 60_000);
    await expect(humNearbySecret(near)).resolves.toBe('cooldown');

    expect(notify).not.toHaveBeenCalled();
  });
});
