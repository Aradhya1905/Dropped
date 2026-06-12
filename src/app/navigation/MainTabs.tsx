/**
 * Main tabs — Map · Trail · You — rendered with the design's paper tab bar.
 */
import React from 'react';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { TabBar, type TabBarItem } from '../../design-system/components';
import { BookmarkIcon, MapTabIcon, PersonIcon } from '../../design-system/icons';
import { MapScreen, WalkSequenceScreen } from '../../features/map/screens';
import { TrailScreen } from '../../features/trail/screens';
import { YouScreen } from '../../features/settings/screens';
import type { MainTabParamList, MapStackParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const MapStackNav = createNativeStackNavigator<MapStackParamList>();

function MapStack() {
  return (
    <MapStackNav.Navigator screenOptions={{ headerShown: false }}>
      <MapStackNav.Screen name="MapHome" component={MapScreen} />
      <MapStackNav.Screen name="Walk" component={WalkSequenceScreen} />
    </MapStackNav.Navigator>
  );
}

const TAB_ITEMS: TabBarItem[] = [
  { key: 'MapTab', label: 'Map', icon: color => <MapTabIcon size={22} color={color} /> },
  { key: 'TrailTab', label: 'Trail', icon: color => <BookmarkIcon size={22} color={color} /> },
  { key: 'YouTab', label: 'You', icon: color => <PersonIcon size={22} color={color} /> },
];

function renderTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <TabBar
      items={TAB_ITEMS}
      activeKey={state.routes[state.index].name}
      onPress={key => navigation.navigate(key)}
    />
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={renderTabBar}>
      <Tab.Screen name="MapTab" component={MapStack} />
      <Tab.Screen name="TrailTab" component={TrailScreen} />
      <Tab.Screen name="YouTab" component={YouScreen} />
    </Tab.Navigator>
  );
}
