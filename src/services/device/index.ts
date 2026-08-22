/**
 * device — the only module that touches `react-native-device-info`. Exposes the
 * native, install-stable unique id and a deterministic mapping of it into a
 * uuid-v4-shaped string. Storage uses this to back the anonymous identity so it
 * survives an app-data-clear (Android `ANDROID_ID`) instead of being a random
 * uuid that the clear would wipe. Features never import the SDK directly.
 */
import DeviceInfo from 'react-native-device-info';

/**
 * The device's native unique id, synchronously. Android → `ANDROID_ID` (stable
 * across app-data-clear and reinstall, resets only on factory reset); iOS →
 * identifierForVendor. Can be `'unknown'`/empty if the platform can't supply one.
 */
export function getNativeUniqueId(): string {
  return DeviceInfo.getUniqueIdSync();
}

/** 32-bit FNV-1a over `salt + input`, returned as 8 lowercase hex chars. */
function fnv1a(salt: string, input: string): string {
  const str = salt + input;
  let hash = 0x811c9dc5;
  /* eslint-disable no-bitwise -- FNV-1a hashing */
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // >>> 0 keeps it an unsigned 32-bit int; pad to a full 8-hex word.
  return (hash >>> 0).toString(16).padStart(8, '0');
  /* eslint-enable no-bitwise */
}

/**
 * Map an arbitrary stable id into a deterministic uuid-v4-shaped string.
 *
 * The backend requires `X-Device-Id` to be uuid-v4 (else 401), but native ids
 * aren't uuid-shaped (`ANDROID_ID` is 16 hex chars). We hash the native id into
 * 32 hex chars (four salted FNV-1a words) and splice them into the 8-4-4-4-12
 * layout, forcing the version nibble to `4` and the variant nibble to `8..b`.
 * Same input → same uuid every call, and the output passes a uuid-v4 check.
 *
 * This is a stable namespace mapping, not cryptographic hashing.
 */
export function nativeIdToUuidV4(raw: string): string {
  const hex = fnv1a('a', raw) + fnv1a('b', raw) + fnv1a('c', raw) + fnv1a('d', raw);
  /* eslint-disable no-bitwise -- uuid-v4 version/variant nibble forcing */
  const version4 = '4' + hex.slice(13, 16); // time_hi_and_version → 4xxx
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20);
  /* eslint-enable no-bitwise */
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${version4}-${variant}-${hex.slice(20, 32)}`;
}
