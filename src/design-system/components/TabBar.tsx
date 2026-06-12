/**
 * The paper bottom tab bar (`.tabbar`): Map · Trail · You.
 * Pure presentational — `app/navigation` adapts react-navigation props to it.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '../tokens';

export interface TabBarItem {
  key: string;
  label: string;
  icon: (color: string) => React.ReactNode;
}

export function TabBar({
  items,
  activeKey,
  onPress,
}: {
  items: TabBarItem[];
  activeKey: string;
  onPress: (key: string) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { height: 72 + insets.bottom, paddingBottom: insets.bottom }]}>
      {items.map(item => {
        const color = item.key === activeKey ? colors.accentDeep : colors.inkFaint;
        return (
          <Pressable
            key={item.key}
            onPress={() => onPress(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: item.key === activeKey }}
            style={styles.tab}
          >
            {item.icon(color)}
            <Text style={[styles.label, { color }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: 11,
    backgroundColor: colors.paperCard,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  tab: { alignItems: 'center', gap: 5 },
  label: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 8.5 * 0.14,
    textTransform: 'uppercase',
  },
});
