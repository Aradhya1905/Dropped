/**
 * App shell: providers + navigation. The design's warm-paper theme is fed to
 * the NavigationContainer so transition backgrounds stay on paper.
 */
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { enableFreeze } from 'react-native-screens';

import { colors, initMotion } from '../design-system/tokens';
import { identifyDevice } from '../services/analytics';
import { initHaptics } from '../services/haptics';
import { initStepCounting } from '../services/pedometer';
import { getDeviceId } from '../services/storage';
import { navigationRef, RootNavigator, startSpotLinks } from './navigation';
import { AppProviders } from './providers';

// Inactive tab screens stop re-rendering while blurred → cheaper switches.
enableFreeze(true);

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accentDeep,
    background: colors.paper,
    card: colors.paperCard,
    text: colors.ink,
    border: colors.line,
  },
};

export default function App(): React.JSX.Element {
  // Tag crash reports with the anonymous device id (no PII).
  useEffect(() => identifyDevice(getDeviceId()), []);

  // Count steps for the Trail's "steps this month" stat while the app is open.
  useEffect(() => initStepCounting(), []);

  // Apply the persisted haptics preference before any walk can buzz.
  useEffect(() => initHaptics(), []);

  // Track the OS reduce-motion setting. Started here so the value is warm
  // before the first screen mounts — `isReduceMotionEnabled` is a promise, and
  // an ambient loop that runs for one frame before stopping is exactly what the
  // setting exists to prevent.
  useEffect(() => initMotion(), []);

  // Catch shared spot links (cold start and every warm tap). Started here, and
  // not inside the container, because a cold-start URL exists before the
  // navigator mounts — see navigation/linking.
  useEffect(() => startSpotLinks(), []);

  return (
    <AppProviders>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <NavigationContainer ref={navigationRef} theme={theme}>
        <RootNavigator />
      </NavigationContainer>
    </AppProviders>
  );
}
