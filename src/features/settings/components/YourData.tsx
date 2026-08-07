/**
 * "Your data" — the trust block on the You screen.
 *
 * Deliberately unlike the settings above it: no playful copy, no wax, plain
 * rows on plain paper. Someone arrives here uneasy, and a section that answers
 * "is it tracking where I live?", "can I make this go away?" and "what happens
 * when I see something awful?" should read like a receipt, not like the rest of
 * the app winking at them.
 */
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../../../design-system/tokens';
import { DATA_CONTACT_EMAIL, PRIVACY_POLICY_URL } from '../legal';

interface Props {
  zoneCount: number;
  reportCount: number;
  onOpenZones: () => void;
  onOpenReports: () => void;
  onErase: () => void;
}

export function YourData({
  zoneCount,
  reportCount,
  onOpenZones,
  onOpenReports,
  onErase,
}: Props) {
  // Narrowed once: both rows stay hidden until `legal.ts` has real values, so
  // this screen can never offer a dead privacy-policy link.
  const policyUrl = PRIVACY_POLICY_URL;
  const contactEmail = DATA_CONTACT_EMAIL;

  return (
    <View style={styles.block}>
      <Text style={styles.kicker}>your data — plainly</Text>

      <View style={styles.list}>
        <Row
          label="Private circles"
          note="Places this app never records, never asks about, and won't let you drop in. They stay on this phone."
          value={zoneCount === 0 ? 'None set' : `${zoneCount} set`}
          onPress={onOpenZones}
        />
        <Row
          label="What you've reported"
          note="Every secret you've flagged for a moderator."
          value={reportCount === 0 ? 'None' : String(reportCount)}
          onPress={onOpenReports}
        />
        {policyUrl && (
          <Row
            label="Privacy policy"
            note="What's stored, for how long, and who can ask for it."
            value="Open"
            onPress={() => Linking.openURL(policyUrl)}
          />
        )}
        {contactEmail && (
          <Row
            label="Ask a human"
            note="Erasure requests, appeals against a removal, anything the app can't do for you."
            value="Email"
            onPress={() =>
              Linking.openURL(
                `mailto:${contactEmail}?subject=Dropped%20%E2%80%94%20data%20request`,
              )
            }
          />
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Erase everything"
          onPress={onErase}
          style={({ pressed }) => [styles.row, styles.eraseRow, pressed && styles.pressed]}
        >
          <View style={styles.labelBlock}>
            <Text style={styles.eraseLabel}>Erase everything</Text>
            <Text style={styles.note}>
              Wipes this phone and this device's history from the server. What
              you dropped stays on the map, with nothing tying it to you.
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function Row({
  label,
  note,
  value,
  onPress,
}: {
  label: string;
  note: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.labelBlock}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.note}>{note}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: 26 },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.24,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  list: { marginTop: 13, gap: 9 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.paperCard,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  eraseRow: { borderColor: 'rgba(140,59,46,0.35)' },
  labelBlock: { flex: 1 },
  label: { fontFamily: fonts.serif, fontSize: 16, color: colors.ink },
  eraseLabel: { fontFamily: fonts.serif, fontSize: 16, color: '#8C3B2E' },
  note: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    lineHeight: 11.5 * 1.4,
    color: colors.inkSoft,
    marginTop: 2,
    paddingRight: 8,
  },
  value: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 11 * 0.04,
    color: colors.accentDeep,
  },
  pressed: { opacity: 0.85 },
});
