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
import { initHaptics } from '../services/haptics';
import { initStepCounting } from '../services/pedometer';
import { getDeviceId } from '../services/storage';
import { setSecretOpener, startWalkEngine } from '../services/walkEngine';
import {
  consumePendingSpot,
  navigationRef,
  rememberPendingSpot,
  RootNavigator,
  startSpotLinks,
} from './navigation';
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

  // Catch shared spot links (cold start and every warm tap). Started here, and
  // not inside the container, because a cold-start URL exists before the
  // navigator mounts — see navigation/linking.
  useEffect(() => startSpotLinks(), []);

  // The background walk engine. A tapped hum takes the same route a shared link
  // does — park the id, then let whoever owns the next navigation consume it —
  // so a notification opened from a cold start still lands on the map with the
  // drop on top of it, rather than on a lone screen with nothing behind it.
  //
  // Started, never stopped: the engine deliberately outlives this tree, which
  // is the entire point of it living outside the React tree in the first place.
  useEffect(() => {
    setSecretOpener(secretId => {
      rememberPendingSpot(secretId);
      consumePendingSpot();
    });
    startWalkEngine().catch(() => {});
  }, []);

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
