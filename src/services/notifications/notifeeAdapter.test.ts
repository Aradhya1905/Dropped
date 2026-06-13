import { notifeeAdapter } from './notifeeAdapter';

const mockRequestPermission = jest.fn();
const mockCreateChannel = jest.fn().mockResolvedValue('nearby-secrets');
const mockDisplayNotification = jest.fn().mockResolvedValue('id');
const mockCancelAll = jest.fn().mockResolvedValue(undefined);

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    requestPermission: (...a: unknown[]) => mockRequestPermission(...a),
    createChannel: (...a: unknown[]) => mockCreateChannel(...a),
    displayNotification: (...a: unknown[]) => mockDisplayNotification(...a),
    cancelAllNotifications: (...a: unknown[]) => mockCancelAll(...a),
  },
  AuthorizationStatus: { DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2 },
  AndroidImportance: { LOW: 2, DEFAULT: 3 },
}));

beforeEach(() => jest.clearAllMocks());

describe('notifeeAdapter.requestPermission', () => {
  it('true when authorized', async () => {
    mockRequestPermission.mockResolvedValue({ authorizationStatus: 1 });
    await expect(notifeeAdapter.requestPermission()).resolves.toBe(true);
  });
  it('false when denied', async () => {
    mockRequestPermission.mockResolvedValue({ authorizationStatus: 0 });
    await expect(notifeeAdapter.requestPermission()).resolves.toBe(false);
  });
});

describe('notifeeAdapter.notifyNearbySecret', () => {
  it('ensures the channel and displays a secret-keyed notification', async () => {
    await notifeeAdapter.notifyNearbySecret({
      secretId: 's1',
      distanceM: 84,
      near: { lat: 1, lng: 2 },
    });
    expect(mockCreateChannel).toHaveBeenCalledTimes(1);
    const arg = mockDisplayNotification.mock.calls[0][0];
    expect(arg.id).toBe('nearby-s1');
    expect(arg.body).toContain('80 m away'); // 84 rounds to 80
    expect(arg.android.channelId).toBe('nearby-secrets');
  });
});

describe('notifeeAdapter.cancelAll', () => {
  it('delegates to notifee', async () => {
    await notifeeAdapter.cancelAll();
    expect(mockCancelAll).toHaveBeenCalled();
  });
});
