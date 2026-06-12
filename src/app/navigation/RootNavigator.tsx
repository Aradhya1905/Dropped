/**
 * Root stack: onboarding flow, the main tabs, and the full-screen moments
 * (secret detail, opening → secret, composer → dropped).
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ComposerScreen, DroppedScreen } from '../../features/drop/screens';
import { SecretDetailScreen } from '../../features/nearby/screens';
import {
  HowItWorksScreen,
  LocationScreen,
  WelcomeScreen,
} from '../../features/onboarding/screens';
import { OpeningScreen, SecretScreen } from '../../features/reveal/screens';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="HowItWorks" component={HowItWorksScreen} />
      <Stack.Screen name="Location" component={LocationScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="SecretDetail" component={SecretDetailScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Opening" component={OpeningScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Secret" component={SecretScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Composer" component={ComposerScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Dropped" component={DroppedScreen} options={{ animation: 'fade' }} />
    </Stack.Navigator>
  );
}
