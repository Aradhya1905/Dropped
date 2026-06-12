/**
 * App shell: providers + navigation. The design's warm-paper theme is fed to
 * the NavigationContainer so transition backgrounds stay on paper.
 */
import React from 'react';
import { StatusBar } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';

import { colors } from '../design-system/tokens';
import { RootNavigator } from './navigation';
import { AppProviders } from './providers';

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
  return (
    <AppProviders>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <NavigationContainer theme={theme}>
        <RootNavigator />
      </NavigationContainer>
    </AppProviders>
  );
}
