/**
 * The Trail tab's doorway to the city constellation: a small, unlabelled
 * drawing of your most recent city, and a tap to open the real one.
 *
 * It sits with the fog header rather than in the feed on purpose — both are the
 * map you made with your feet, and neither is an *entry* in a scrapbook. Stays
 * silent entirely until there is a city to draw, so a new install sees a
 * scrapbook, not a row of empty promises.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../app/navigation/types';
import { colors, fonts, radii, shadows } from '../../../design-system/tokens';
import { Constellation } from '../constellation/Constellation';
import { useCities, useCityPoints } from '../hooks';

/** Small enough to be a caption, big enough to read as a shape. */
const PREVIEW_WIDTH = 112;

export function ConstellationCard() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const cities = useCities();
  const latest = cities.data?.[0];
  const points = useCityPoints(latest?.city);

  if (!latest) return null;

  const count = cities.data?.length ?? 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() =>
        navigation.navigate('Constellation', { city: latest.city })
      }
      accessibilityRole="button"
      accessibilityLabel={`Open your ${latest.city} constellation`}
    >
      <View style={styles.preview}>
        {/* Names off in the preview: this sits on a screen someone may well be
            showing a friend, and the full drawing is one tap away. */}
        <Constellation
          points={points.data ?? []}
          city={latest.city}
          showLabels={false}
          size={PREVIEW_WIDTH}
        />
      </View>

      <View style={styles.text}>
        <Text style={styles.title}>
          <Text style={styles.titleEm}>{latest.city}</Text>, drawn
        </Text>
        <Text style={styles.sub}>
          {count === 1
            ? 'One city so far. Tap to see its shape.'
            : `${count} cities. Tap to see their shapes.`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    marginHorizontal: 2,
    padding: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.paperCard,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    boxShadow: shadows.chip,
  },
  pressed: { opacity: 0.9 },
  preview: {
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.paper,
  },
  text: { flex: 1, paddingRight: 4 },
  title: { fontFamily: fonts.serif, fontSize: 19, color: colors.ink },
  titleEm: { fontFamily: fonts.serifItalic, color: colors.accentDeep },
  sub: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 10 * 0.08,
    color: colors.inkFaint,
    marginTop: 4,
  },
});
