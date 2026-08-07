import {
  distanceTo,
  getCurrent,
  isWithinDrop,
  shouldRecordCell,
  shouldRecordFix,
  watch,
} from './index';

const mockGetCurrentPosition = jest.fn();
const mockWatchPosition = jest.fn();
const mockClearWatch = jest.fn();

jest.mock('react-native-geolocation-service', () => ({
  __esModule: true,
  default: {
    getCurrentPosition: (...a: unknown[]) => mockGetCurrentPosition(...a),
    watchPosition: (...a: unknown[]) => mockWatchPosition(...a),
    clearWatch: (...a: unknown[]) => mockClearWatch(...a),
    requestAuthorization: jest.fn(),
  },
}));

const drop = { lat: 12.9756, lng: 77.6094 };
const far = { lat: 12.9759, lng: 77.61 }; // ~70 m away

beforeEach(() => jest.clearAllMocks());

describe('location coordinate mapping', () => {
  it('maps RN position {coords} to our {lat,lng}', async () => {
    mockGetCurrentPosition.mockImplementation((success: Function) =>
      success({ coords: { latitude: 1.5, longitude: 2.5 } }),
    );
    await expect(getCurrent()).resolves.toEqual({ lat: 1.5, lng: 2.5 });
  });
});

describe('location watch', () => {
  it('emits mapped coords with accuracy, and unsubscribe clears the watch', () => {
    mockWatchPosition.mockImplementation((success: Function) => {
      // `accuracy` must beat the cold-start floor or the fix is held back.
      success({ coords: { latitude: 3, longitude: 4, accuracy: 8 } });
      return 99;
    });
    const onFix = jest.fn();
    const stop = watch(onFix);
    expect(onFix).toHaveBeenCalledWith({
      coordinate: { lat: 3, lng: 4 },
      accuracy: 8,
    });
    stop();
    expect(mockClearWatch).toHaveBeenCalledWith(99);
  });

  it('passes accuracy through on streamed fixes, not just the first', () => {
    let emit: Function = () => {};
    mockWatchPosition.mockImplementation((success: Function) => {
      emit = success;
      return 1;
    });
    const onFix = jest.fn();
    watch(onFix);
    emit({ coords: { latitude: 3, longitude: 4, accuracy: 8 } }); // acquires
    emit({ coords: { latitude: 5, longitude: 6, accuracy: 42 } }); // streamed
    expect(onFix).toHaveBeenLastCalledWith({
      coordinate: { lat: 5, lng: 6 },
      accuracy: 42,
    });
  });

  it('reports a missing accuracy as Infinity so gated consumers fail closed', () => {
    let emit: Function = () => {};
    mockWatchPosition.mockImplementation((success: Function) => {
      emit = success;
      return 1;
    });
    const onFix = jest.fn();
    watch(onFix);
    emit({ coords: { latitude: 3, longitude: 4, accuracy: 8 } });
    emit({ coords: { latitude: 5, longitude: 6 } });
    expect(onFix).toHaveBeenLastCalledWith({
      coordinate: { lat: 5, lng: 6 },
      accuracy: Infinity,
    });
  });
});

describe('shouldRecordFix', () => {
  it('accepts fixes at or under the accuracy budget', () => {
    expect(shouldRecordFix(12, 25)).toBe(true);
    expect(shouldRecordFix(25, 25)).toBe(true);
  });

  it('rejects coarse or unknown accuracy', () => {
    expect(shouldRecordFix(40, 25)).toBe(false);
    expect(shouldRecordFix(Infinity, 25)).toBe(false);
    expect(shouldRecordFix(NaN, 25)).toBe(false);
  });
});

describe('location distance helpers delegate to geo', () => {
  it('distanceTo is the haversine distance', () => {
    expect(distanceTo(drop, drop)).toBeCloseTo(0, 5);
    expect(distanceTo(drop, far)).toBeGreaterThan(40);
  });
  it('isWithinDrop uses the 50 m reveal radius by default', () => {
    expect(isWithinDrop(drop, drop)).toBe(true);
    expect(isWithinDrop(drop, far)).toBe(false);
    expect(isWithinDrop(drop, far, 200)).toBe(true);
  });
});

describe('shouldRecordCell — the capture-layer gate', () => {
  const home = { lat: 12.9716, lng: 77.5946 };
  const zones = [{ id: 'z1', centre: home, radiusM: 150, label: 'Home' }];
  const precise = 8;

  it('records a precise fix when there are no zones at all', () => {
    expect(shouldRecordCell({ coordinate: home, accuracy: precise }, 25, [])).toBe(
      true,
    );
  });

  it('records nothing inside a zone, however good the fix is', () => {
    // The whole feature: not recorded-then-hidden, not recorded-then-deleted.
    expect(
      shouldRecordCell({ coordinate: home, accuracy: 1 }, 25, zones),
    ).toBe(false);
  });

  it('resumes the moment you walk out of the zone', () => {
    const away = { lat: home.lat + 0.005, lng: home.lng }; // ~550 m north
    expect(shouldRecordCell({ coordinate: away, accuracy: precise }, 25, zones)).toBe(
      true,
    );
  });

  it('still rejects a coarse fix outside every zone', () => {
    const away = { lat: home.lat + 0.005, lng: home.lng };
    expect(shouldRecordCell({ coordinate: away, accuracy: 90 }, 25, zones)).toBe(
      false,
    );
  });
});
