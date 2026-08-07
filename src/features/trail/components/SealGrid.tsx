/**
 * The sheet of collected seals — the scrapbook's other page.
 *
 * Deliberately not a scoreboard: no counts per motif, no rarity, nothing
 * sorted by how special a seal is. They sit in the order you walked to them,
 * tilted like things stuck to a page. See FUN_TODOs/11-wax-seal-collection.md.
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WaxSeal } from '../../../design-system/components';
import { colors, fonts } from '../../../design-system/tokens';
import { relTime } from '../../../utils/format';
import type { Secret } from '../../../types';
import { sealsFor } from '../seals';

export interface SealGridProps {
  secrets: Secret[];
  onPress: (secret: Secret) => void;
  /** Shown when the tab has nothing in it yet. */
  emptyLabel: string;
}

/** Tilts, so a grid of circles still reads as a page rather than a table. */
const TILTS = [-4, 2.5, -1.5, 3.5, -2.5, 1.5];

export function SealGrid({ secrets, onPress, emptyLabel }: SealGridProps) {
  // One read of the collection for the whole page.
  const seals = useMemo(() => sealsFor(secrets), [secrets]);

  if (secrets.length === 0) {
    return <Text style={styles.empty}>{emptyLabel}</Text>;
  }

  return (
    <View style={styles.grid}>
      {secrets.map((secret, i) => {
        const seal = seals[secret.id];
        return (
          <Pressable
            key={secret.id}
            onPress={() => onPress(secret)}
            style={styles.cell}
            accessibilityRole="button"
            accessibilityLabel={`${seal.motif} seal, ${secret.mood}, ${
              secret.drop.placeLabel ?? 'somewhere'
            }`}
          >
            <WaxSeal
              size={62}
              rotate={TILTS[i % TILTS.length]}
              motif={seal.motif}
              mood={seal.tint}
              night={seal.night}
              cityLabel={seal.cityLabel}
            />
            <Text style={styles.place} numberOfLines={1}>
              {secret.drop.placeLabel ?? secret.drop.city ?? 'Here'}
            </Text>
            <Text style={styles.when}>{relTime(secret.createdAt)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 20,
    paddingTop: 10,
  },
  cell: { width: '30%', alignItems: 'center', gap: 7 },
  place: {
    fontFamily: fonts.handSemibold,
    fontSize: 13,
    lineHeight: 15,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  when: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 8 * 0.16,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  empty: {
    fontFamily: fonts.handSemibold,
    fontSize: 18,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: 40,
  },
});
