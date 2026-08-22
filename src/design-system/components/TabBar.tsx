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
    <View
      style={[
        styles.bar,
        { height: 65 + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      {items.map(item => {
        const color =
          item.key === activeKey ? colors.accentDeep : colors.inkFaint;
        return (
          <Pressable
            key={item.key}
            onPress={() => onPress(item.key)}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: item.key === activeKey }}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
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
    alignItems: 'stretch',
    paddingTop: 8,
    backgroundColor: colors.paperCard,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  tab: { flex: 1, alignItems: 'center', gap: 5, marginTop: 7 },
  tabPressed: { opacity: 0.6 },
  label: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 8.5 * 0.14,
    textTransform: 'uppercase',
  },
});
