import { distanceTo, getCurrent, isWithinDrop, watch } from './index';

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
  it('emits mapped coords and unsubscribe clears the watch', () => {
    mockWatchPosition.mockImplementation((success: Function) => {
      success({ coords: { latitude: 3, longitude: 4 } });
      return 99;
    });
    const onCoord = jest.fn();
    const stop = watch(onCoord);
    expect(onCoord).toHaveBeenCalledWith({ lat: 3, lng: 4 });
    stop();
    expect(mockClearWatch).toHaveBeenCalledWith(99);
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
