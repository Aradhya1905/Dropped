/**
 * A collected secret in the scrapbook feed (`.tcard`) — taped or pinned,
 * tilted, with place, mood, the quote, and a dashed footer.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EmotionTag, Tape, WaxSeal } from '../../../design-system/components';
import { colors, fonts } from '../../../design-system/tokens';

export interface TrailCardProps {
  place: string;
  mood: string;
  quote: string;
  footLeft: string;
  footRight: string;
  rotate: number;
  /** How the card is stuck to the page. */
  fastener?: 'tape' | 'tapeRight' | 'pin';
}

export function TrailCard({
  place,
  mood,
  quote,
  footLeft,
  footRight,
  rotate,
  fastener = 'tape',
}: TrailCardProps) {
  return (
    <View style={[styles.card, { transform: [{ rotate: `${rotate}deg` }] }]}>
      {fastener === 'pin' ? (
        <WaxSeal size={13} style={styles.pin} />
      ) : (
        <Tape
          width={50}
          height={17}
          rotate={fastener === 'tapeRight' ? 3 : -4}
          style={fastener === 'tapeRight' ? styles.tapeRight : styles.tape}
        />
      )}
      <View style={styles.top}>
        <Text style={styles.place}>{place}</Text>
        <EmotionTag label={mood} small />
      </View>
      <Text style={styles.quote}>{quote}</Text>
      <View style={styles.foot}>
        <Text style={styles.footText}>{footLeft}</Text>
        <Text style={styles.footText}>{footRight}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paperCard,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingTop: 15,
    paddingHorizontal: 16,
    paddingBottom: 13,
    boxShadow: '0 16px 28px -22px rgba(43,33,20,0.5)',
  },
  tape: { position: 'absolute', top: -8, left: 22 },
  tapeRight: { position: 'absolute', top: -8, right: 22 },
  pin: { position: 'absolute', top: -7, left: '50%', marginLeft: -6.5 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  place: { fontFamily: fonts.handSemibold, fontSize: 18, lineHeight: 22, color: colors.inkSoft },
  quote: {
    fontFamily: fonts.serifItalic,
    fontSize: 15,
    lineHeight: 15 * 1.42,
    color: colors.ink,
    marginTop: 8,
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1.5,
    borderTopColor: colors.line,
    borderStyle: 'dashed',
  },
  footText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 8 * 0.16,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
});
