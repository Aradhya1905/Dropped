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
