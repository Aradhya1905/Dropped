/* eslint-env jest */
/* Jest environment shims for native modules used by the screens. */
import 'react-native-gesture-handler/jestSetup';

// The screens run looping ambient animations; fake timers keep them from
// holding the test process open (RN's recommendation for Animated).
jest.useFakeTimers();

// react-native-screens + safe-area need their native parts mocked in tests
jest.mock('react-native-screens', () => {
  const actual = jest.requireActual('react-native-screens');
  actual.enableScreens = jest.fn();
  return actual;
});

jest.mock('react-native-safe-area-context', () => {
  const { SafeAreaProvider, ...rest } = jest.requireActual(
    'react-native-safe-area-context/jest/mock',
  ).default;
  return { SafeAreaProvider, ...rest };
});

// react-native-mmkv is a Nitro native module with no Jest preset; provide an
// in-memory stand-in so any test that transitively imports services/storage
// (e.g. App → pedometer → api → storage) loads without the native binding.
// Tests that assert on storage behaviour mock it locally with their own store.
jest.mock('react-native-mmkv', () => {
  const store = new Map();
  const instance = {
    getString: k => (typeof store.get(k) === 'string' ? store.get(k) : undefined),
    getBoolean: k => (typeof store.get(k) === 'boolean' ? store.get(k) : undefined),
    getNumber: k => (typeof store.get(k) === 'number' ? store.get(k) : undefined),
    set: (k, v) => store.set(k, v),
    delete: k => store.delete(k),
    remove: k => store.delete(k),
    contains: k => store.has(k),
    clearAll: () => store.clear(),
    addOnValueChangedListener: () => ({ remove: () => {} }),
  };
  return { createMMKV: () => instance };
});

// MapLibre has no Jest preset; mock the whole package so tests don't need
// native modules. The useMaplibreAdapter hook is tested via the adapter unit
// tests (which use noopAdapter), not via the real MapLibre implementation.
jest.mock('@maplibre/maplibre-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MapMock = ({ children, style }) => React.createElement(View, { style }, children);
  const CameraMock = React.forwardRef((_props, _ref) => null);
  const PassThrough = ({ children }) => React.createElement(View, null, children);
  return {
    Map: MapMock,
    Camera: CameraMock,
    GeoJSONSource: PassThrough,
    Layer: () => null,
    Marker: PassThrough,
  };
});

// Remaining native bridges pulled in transitively by App → RootNavigator.
// None of them have a Jest preset; the app-level smoke test only needs them to
// import cleanly.
jest.mock('react-native-bootsplash', () => ({
  __esModule: true,
  default: { hide: jest.fn(() => Promise.resolve()), isVisible: jest.fn(() => Promise.resolve(false)) },
}));

jest.mock('react-native-device-info', () => ({
  __esModule: true,
  default: {
    getUniqueId: jest.fn(() => Promise.resolve('test-device')),
    getUniqueIdSync: jest.fn(() => 'test-device'),
  },
  getUniqueIdSync: jest.fn(() => 'test-device'),
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn(() => Promise.resolve({ authorizationStatus: 1 })),
    createChannel: jest.fn(() => Promise.resolve('default')),
    displayNotification: jest.fn(() => Promise.resolve()),
    cancelAllNotifications: jest.fn(() => Promise.resolve()),
  },
  AndroidImportance: { DEFAULT: 3, LOW: 2 },
  AuthorizationStatus: { AUTHORIZED: 1, DENIED: 0 },
}));

jest.mock('@dongminyu/react-native-step-counter', () => ({
  __esModule: true,
  default: {
    isStepCountingSupported: jest.fn(() => Promise.resolve({ granted: false, supported: false })),
    startStepCounterUpdate: jest.fn(),
    stopStepCounterUpdate: jest.fn(),
  },
  isStepCountingSupported: jest.fn(() => Promise.resolve({ granted: false, supported: false })),
  startStepCounterUpdate: jest.fn(),
  stopStepCounterUpdate: jest.fn(),
  parseStepData: jest.fn(() => ({ steps: 0 })),
}));

// Vibration motor bridge — no native module under Jest. The services/haptics
// adapter requires this lazily; tests that assert on haptic calls grab the mock
// with `require('react-native-haptic-feedback').default.trigger`.
jest.mock('react-native-haptic-feedback', () => {
  const trigger = jest.fn();
  return {
    __esModule: true,
    default: { trigger },
    trigger,
  };
});

// Magnetometer bridge — no native module under Jest.
jest.mock('react-native-compass-heading', () => ({
  __esModule: true,
  default: { start: jest.fn(), stop: jest.fn() },
}));

// react-native-config reads its values from the native build; under Jest there
// is no build, so hand back an empty env (the adapters all tolerate undefined).
jest.mock('react-native-config', () => ({ __esModule: true, default: {} }));

// The GPS SDK ships untranspiled and needs a native binding; stub it so any
// test that transitively imports services/location loads. Tests that assert on
// watch behaviour re-mock it locally with their own spies.
jest.mock('react-native-geolocation-service', () => ({
  __esModule: true,
  default: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(() => 0),
    clearWatch: jest.fn(),
    requestAuthorization: jest.fn(),
  },
}));

// Crashlytics reaches for a native module at import time (services/analytics
// runs getCrashlytics() at module scope), which doesn't exist under Jest.
jest.mock('@react-native-firebase/crashlytics', () => ({
  getCrashlytics: () => ({}),
  setUserId: jest.fn(),
  log: jest.fn(),
  recordError: jest.fn(),
  setCrashlyticsCollectionEnabled: jest.fn(),
  crash: jest.fn(),
}));
