/**
 * What you've reported — proof that the reports went somewhere.
 *
 * Note what a row holds: a date, and a place if the app knew one. Never the
 * words. A local archive of the worst things someone has read on a walk is not
 * something this app should keep, and the moderation verdict isn't the reader's
 * to see anyway — the receipt is the point.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../app/navigation/types';
import {
  CloseX,
  FunKicker,
  MapTexture,
  PaperScreen,
} from '../../../design-system/components';
import { colors, fonts } from '../../../design-system/tokens';
import { getReports } from '../../../services/storage';
import { agoLabel } from '../../../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Reports'>;

export function ReportsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  // Read once on mount: nothing on this screen can add to the list.
  const reports = getReports();

  return (
    <PaperScreen>
      <MapTexture blur />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <FunKicker>you flagged these.</FunKicker>
          <CloseX onPress={() => navigation.goBack()} />
        </View>
        <Text style={styles.title}>What you've reported</Text>
        <Text style={styles.blurb}>
          Each one went to a moderator. Enough reports on the same secret and it
          stops being shown to anyone. Your reports are anonymous, and this list
          is kept on your phone only.
        </Text>

        {reports.length === 0 ? (
          <Text style={styles.empty}>
            Nothing yet — which is the good outcome. If you ever read something
            cruel, "Report this" sits under the secret.
          </Text>
        ) : (
          <View style={styles.list}>
            {reports.map(report => (
              <View key={report.id} style={styles.row}>
                <Text style={styles.rowPlace}>{report.placeLabel ?? 'Somewhere'}</Text>
                <Text style={styles.rowWhen}>reported {agoLabel(report.at)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, zIndex: 10 },
  content: { paddingHorizontal: 24 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: {
    fontFamily: fonts.serif,
    fontSize: 29,
    letterSpacing: 29 * -0.01,
    color: colors.ink,
    marginTop: 6,
  },
  blurb: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 13 * 1.55,
    color: colors.inkSoft,
    marginTop: 9,
  },
  empty: {
    fontFamily: fonts.handMedium,
    fontSize: 19,
    lineHeight: 19 * 1.3,
    color: colors.inkFaint,
    marginTop: 26,
  },
  list: { marginTop: 20, gap: 9 },
  row: {
    backgroundColor: colors.paperCard,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  rowPlace: { fontFamily: fonts.serif, fontSize: 16, color: colors.ink },
  rowWhen: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.16,
    textTransform: 'uppercase',
    color: colors.inkFaint,
    marginTop: 4,
  },
});
