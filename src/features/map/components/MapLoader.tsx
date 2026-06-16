/**
 * MapLoader — the "finding where you are…" overlay shown over the map until
 * the first GPS fix lands. Covers the map (which renders at a default center
 * until then) so the wrong default location never flashes.
 *
 * On-theme: paper + faint blurred map texture, sonar-pulse rings around a
 * static user dot, Newsreader serif copy.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MapTexture } from '../../../design-system/components';
import { FadeUp, PulseRing } from '../../../design-system/components/anim';
import { colors, fonts } from '../../../design-system/tokens';

const RING = 240;

export function MapLoader() {
  return (
    <View style={styles.root}>
      <MapTexture blur />

      <FadeUp style={styles.center}>
        <View style={styles.cluster}>
          <PulseRing
            size={RING}
            borderColor={colors.accent}
            peakOpacity={0.45}
            delayMs={0}
          />
          <PulseRing
            size={RING}
            borderColor={colors.accent}
            peakOpacity={0.35}
            delayMs={1400}
          />
          <PulseRing
            size={RING}
            borderColor={colors.accent}
            peakOpacity={0.28}
            dashed
            delayMs={2800}
          />

          {/* static center dot — pulse comes from the rings */}
          <View style={styles.dot}>
            <View style={styles.pip} />
          </View>
        </View>

        <Text style={styles.title}>finding where you are…</Text>
        <Text style={styles.meta}>tuning the map to your spot</Text>
      </FadeUp>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  cluster: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 0 4px ${colors.paperCard}, 0 4px 10px -2px rgba(43,33,20,0.5)`,
  },
  pip: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.accent,
  },
  title: {
    fontFamily: fonts.serifItalic,
    fontSize: 24,
    color: colors.ink,
    marginTop: 18,
    textAlign: 'center',
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.2,
    textTransform: 'uppercase',
    color: colors.inkFaint,
    marginTop: 11,
    textAlign: 'center',
  },
});
