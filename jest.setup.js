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

// react-native-geolocation-service ships untranspiled ESM and has no native
// binding under Jest; App -> locationStore -> services/location pulls it in.
jest.mock('react-native-geolocation-service', () => ({
  __esModule: true,
  default: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(() => 1),
    clearWatch: jest.fn(),
    requestAuthorization: jest.fn(() => Promise.resolve('denied')),
  },
}));

// Native modules with no Jest binding, pulled in transitively by the screens.
jest.mock('react-native-compass-heading', () => ({
  __esModule: true,
  default: { start: jest.fn(), stop: jest.fn() },
}));

jest.mock('react-native-config', () => ({
  __esModule: true,
  default: {},
  Config: {},
}));

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
  return {
    Map: MapMock,
    Camera: CameraMock,
  };
});

// Firebase Crashlytics ships untranspiled ESM and needs a native binding;
// services/analytics pulls it in from App. Stub the modular API surface.
jest.mock('@react-native-firebase/crashlytics', () => ({
  __esModule: true,
  getCrashlytics: jest.fn(() => ({})),
  setUserId: jest.fn(),
  log: jest.fn(),
  recordError: jest.fn(),
  setCrashlyticsCollectionEnabled: jest.fn(),
  crash: jest.fn(),
}));

// react-native-bootsplash is native-only; App hides the splash on mount.
jest.mock('react-native-bootsplash', () => ({
  __esModule: true,
  default: { hide: jest.fn(() => Promise.resolve()), isVisible: jest.fn(() => Promise.resolve(false)) },
  hide: jest.fn(() => Promise.resolve()),
}));
