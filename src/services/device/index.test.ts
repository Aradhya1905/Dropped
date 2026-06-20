import { nativeIdToUuidV4 } from './index';

// react-native-device-info is native; only nativeIdToUuidV4 is pure, so stub the
// module so importing the adapter doesn't pull the native binding under Jest.
jest.mock('react-native-device-info', () => ({
  getUniqueIdSync: () => 'unknown',
}));

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('nativeIdToUuidV4', () => {
  it('produces a well-formed uuid-v4 string', () => {
    expect(nativeIdToUuidV4('a1b2c3d4e5f60718')).toMatch(UUID_V4);
  });

  it('is deterministic for the same input', () => {
    const raw = 'a1b2c3d4e5f60718';
    expect(nativeIdToUuidV4(raw)).toBe(nativeIdToUuidV4(raw));
  });

  it('maps different inputs to different ids', () => {
    expect(nativeIdToUuidV4('device-one')).not.toBe(nativeIdToUuidV4('device-two'));
  });
});
