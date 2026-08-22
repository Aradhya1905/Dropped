/**
 * The location store is the app's single fix. These cover the transitions the
 * screens depend on: one shared watch, a persisted last-known position at
 * boot, and `live` telling a real fix apart from a remembered one.
 */
const mockRequestPermission = jest.fn();
const mockCheckPermission = jest.fn();
const mockGetCurrent = jest.fn();
const mockWatch = jest.fn();
const mockStopWatch = jest.fn();
const mockSetLastCoord = jest.fn();
const mockGetLastCoord = jest.fn();

jest.mock('../services/location', () => ({
  requestPermission: (...a: unknown[]) => mockRequestPermission(...a),
  checkPermission: (...a: unknown[]) => mockCheckPermission(...a),
  getCurrent: (...a: unknown[]) => mockGetCurrent(...a),
  watch: (...a: unknown[]) => mockWatch(...a),
}));

jest.mock('../services/maps/reverseGeocode', () => ({
  getAddressFromCoords: jest.fn(() => Promise.resolve({ shortAddress: 'A St', parts: {} })),
}));

jest.mock('../services/storage', () => ({
  getLastCoord: () => mockGetLastCoord(),
  setLastCoord: (...a: unknown[]) => mockSetLastCoord(...a),
}));

const HERE = { lat: 12.9756, lng: 77.6094 };

/** Fresh module registry per test — the watch handle is module-level state. */
async function loadStore(lastCoord: { lat: number; lng: number } | null = null) {
  mockGetLastCoord.mockReturnValue(lastCoord);
  let mod!: typeof import('./locationStore');
  jest.isolateModules(() => {
    mod = require('./locationStore');
  });
  return mod;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockWatch.mockReturnValue(mockStopWatch);
});

describe('locationStore', () => {
  it('seeds from the persisted fix so a cold start is not empty', async () => {
    const { useLocationStore } = await loadStore(HERE);
    const state = useLocationStore.getState();
    expect(state.coord).toEqual(HERE);
    // …but it is not a live fix, and screens can tell.
    expect(state.live).toBe(false);
  });

  it('starts at most one watch however many callers ask', async () => {
    const { useLocationStore } = await loadStore();
    useLocationStore.getState().ensureWatching();
    useLocationStore.getState().ensureWatching();
    useLocationStore.getState().ensureWatching();
    expect(mockWatch).toHaveBeenCalledTimes(1);
  });

  it('marks a watch fix live and persists it', async () => {
    const { useLocationStore } = await loadStore();
    useLocationStore.getState().ensureWatching();
    const onFix = mockWatch.mock.calls[0][0] as (c: typeof HERE) => void;
    onFix(HERE);

    const state = useLocationStore.getState();
    expect(state.coord).toEqual(HERE);
    expect(state.live).toBe(true);
    expect(state.fixing).toBe(false);
    expect(mockSetLastCoord).toHaveBeenCalledWith(HERE);
  });

  it('starts watching once permission is granted', async () => {
    const { useLocationStore } = await loadStore();
    mockRequestPermission.mockResolvedValue('granted');

    await expect(useLocationStore.getState().request()).resolves.toBe('granted');
    expect(useLocationStore.getState().status).toBe('granted');
    expect(mockWatch).toHaveBeenCalledTimes(1);
  });

  it('records a denial without starting a watch', async () => {
    const { useLocationStore } = await loadStore();
    mockRequestPermission.mockResolvedValue('denied');

    await useLocationStore.getState().request();
    expect(useLocationStore.getState().status).toBe('denied');
    expect(mockWatch).not.toHaveBeenCalled();
  });

  it('keeps the last known coord when a one-shot refresh fails', async () => {
    const { useLocationStore } = await loadStore(HERE);
    mockGetCurrent.mockRejectedValue(new Error('no fix'));

    await useLocationStore.getState().refresh();
    const state = useLocationStore.getState();
    expect(state.coord).toEqual(HERE);
    expect(state.fixing).toBe(false);
  });

  it('bootstraps from the standing permission without prompting', async () => {
    const { bootstrapLocation, useLocationStore } = await loadStore();
    mockCheckPermission.mockResolvedValue('granted');

    await bootstrapLocation();
    expect(mockRequestPermission).not.toHaveBeenCalled();
    expect(useLocationStore.getState().status).toBe('granted');
    expect(mockWatch).toHaveBeenCalledTimes(1);
  });
});
