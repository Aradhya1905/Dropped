/**
 * App shell: providers + navigation. The design's warm-paper theme is fed to
 * the NavigationContainer so transition backgrounds stay on paper.
 */
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { enableFreeze } from 'react-native-screens';

import { colors } from '../design-system/tokens';
import { identifyDevice } from '../services/analytics';
import { initStepCounting } from '../services/pedometer';
import { getDeviceId } from '../services/storage';
import { bootstrapLocation, useLocationStore } from '../store/locationStore';
import { RootNavigator } from './navigation';
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

  // Start the app's single GPS watch as early as possible (silently — this
  // never prompts) so every screen has a fix waiting instead of each one
  // warming its own.
  useEffect(() => {
    bootstrapLocation();
    return () => useLocationStore.getState().stopWatching();
  }, []);

  return (
    <AppProviders>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <NavigationContainer theme={theme}>
        <RootNavigator />
      </NavigationContainer>
    </AppProviders>
  );
}
