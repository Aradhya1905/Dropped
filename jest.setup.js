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
