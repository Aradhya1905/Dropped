/**
 * The Trail tab's header: the map you drew with your feet. Fogged everywhere
 * you haven't walked, cleared where you have — the same layer the Map tab uses,
 * pinned to your current area and pared down to a card.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, shadows } from '../../../design-system/tokens';
import { useMaplibreAdapter } from '../../../services/maps';
import { useDeviceLocation } from '../../map/hooks';
import { useFogCoverage } from '../hooks';

/** Pulled back from street level so the header shows a neighbourhood, not a block. */
const HEADER_ZOOM = 14;

export function FogHeader() {
  const { coord } = useDeviceLocation();
  const { cells, label } = useFogCoverage();
  const { MaplibreView } = useMaplibreAdapter(coord ?? undefined, {
    fog: true,
    initialZoom: HEADER_ZOOM,
    // Card-embedded: must composite with the tabs and feed below it.
    embedded: true,
  });

  return (
    <View style={styles.card}>
      <View style={styles.mapWell}>
        {coord ? (
          <MaplibreView />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Waiting for a fix…</Text>
          </View>
        )}
      </View>

      <View style={styles.caption}>
        <Text style={styles.stat}>
          {label} <Text style={styles.statWord}>uncovered</Text>
        </Text>
        <Text style={styles.sub}>
          {cells === 0
            ? 'Walk with the app open to clear the fog.'
            : 'Cleared while walking with the app open.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    marginHorizontal: 2,
    borderRadius: radii.lg,
    backgroundColor: colors.paperCard,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    overflow: 'hidden',
    boxShadow: shadows.chip,
  },
  // The adapter's view is absolutely positioned, so it needs a sized well.
  mapWell: { height: 132, backgroundColor: colors.paperDeep },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 10 * 0.13,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  caption: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  stat: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.accentDeep,
  },
  statWord: { fontFamily: fonts.serifItalic, color: colors.ink },
  sub: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 10 * 0.08,
    color: colors.inkFaint,
    marginTop: 3,
  },
});
