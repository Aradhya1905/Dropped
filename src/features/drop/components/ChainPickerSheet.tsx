/**
 * "Which drop does this follow?" — the chain-drops picker. Lists your own
 * drops from the last 24 h within 2 km, newest first; ones that already lead
 * on (or whose trail is full) are greyed out. Pick one, then Continue.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, FunKicker, Grabber, Sheet, WaxSeal } from '../../../design-system/components';
import { colors, fonts } from '../../../design-system/tokens';
import type { ChainCandidate, Coordinate } from '../../../types';
import { CHAIN_MAX_STOPS } from '../../../types';
import { formatDistance, relativeTime } from '../../../utils/format';
import { useChainCandidates } from '../hooks';
import type { ChainPick } from './ChainRow';

const shortPlace = (c: ChainCandidate) => (c.placeLabel ?? 'an unnamed spot').split(',')[0];

export function ChainPickerSheet({
  visible,
  coord,
  current,
  onPick,
  onClear,
  onClose,
}: {
  visible: boolean;
  /** Where the new drop is being made (distances are from here). */
  coord: Coordinate | null;
  current: ChainPick | null;
  onPick: (pick: ChainPick) => void;
  /** "Not part of a trail". */
  onClear: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useChainCandidates(coord, visible);
  const [selected, setSelected] = useState<string | null>(current?.id ?? null);

  // Each open starts from the current pick; once the list lands with nothing
  // picked, default to the newest pickable drop. A refetch keeps your choice.
  useEffect(() => {
    if (visible) setSelected(current?.id ?? null);
  }, [visible, current]);
  useEffect(() => {
    if (!visible || !data) return;
    setSelected(sel => sel ?? data.find(c => !c.blocked)?.id ?? null);
  }, [visible, data]);

  const picked = data?.find(c => c.id === selected && !c.blocked);

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      useNativeDriver
      useNativeDriverForBackdrop
      backdropOpacity={0.42}
      backdropColor={colors.ink}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.modal}
    >
      <Sheet style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <Grabber style={styles.grabber} />
        <FunKicker>pick up where you left off —</FunKicker>
        <Text style={styles.title}>Which drop does this follow?</Text>
        <Text style={styles.sub}>
          Only your own drops from the last 24 hours, within 2 km. Whoever reads that one gets
          sent here next.
        </Text>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {isLoading ? (
            <ActivityIndicator color={colors.accent} style={styles.loader} />
          ) : isError ? (
            <Text accessibilityRole="button" style={styles.empty} onPress={() => refetch()}>
              Couldn't load your drops.{'\n'}Tap to try again.
            </Text>
          ) : !data || data.length === 0 ? (
            <Text style={styles.empty}>
              Nothing of yours nearby from the last day. Drop the first stop, walk on, then
              continue it from the next spot.
            </Text>
          ) : (
            data.map(c => {
              const meta = `${c.mood} · ${relativeTime(c.createdAt)} · ${formatDistance(c.distanceMeters)}`;
              if (c.blocked) {
                return (
                  <View
                    key={c.id}
                    accessible
                    accessibilityState={{ disabled: true }}
                    style={[styles.row, styles.rowBlocked]}
                  >
                    <View style={styles.greySeal} />
                    <View style={styles.rowText}>
                      <Text style={styles.place} numberOfLines={1}>
                        {c.placeLabel ?? 'an unnamed spot'}
                      </Text>
                      <Text style={styles.meta}>
                        {c.blocked === 'full'
                          ? `trail is full (${CHAIN_MAX_STOPS} stops)`
                          : 'already leads on'}{' '}
                        · {meta}
                      </Text>
                    </View>
                  </View>
                );
              }
              const on = c.id === selected;
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setSelected(c.id)}
                  style={({ pressed }) => [
                    styles.row,
                    on ? styles.rowOn : styles.rowOff,
                    pressed && styles.pressed,
                  ]}
                >
                  <WaxSeal size={26} />
                  <View style={styles.rowText}>
                    <Text style={styles.place} numberOfLines={1}>
                      {c.placeLabel ?? 'an unnamed spot'}
                    </Text>
                    <Text style={styles.meta}>{meta}</Text>
                  </View>
                  <View style={[styles.radio, on && styles.radioOn]} />
                </Pressable>
              );
            })
          )}
        </ScrollView>

        <View style={styles.footer}>
          <AppButton
            label={picked ? `Continue from "${shortPlace(picked)}"` : 'Pick a drop to continue'}
            disabled={!picked}
            onPress={() => {
              if (!picked) return;
              onPick({ id: picked.id, placeLabel: picked.placeLabel, stop: picked.nextStopNumber });
            }}
            style={!picked && styles.dim}
          />
          <Pressable
            accessibilityRole="button"
            onPress={onClear}
            style={({ pressed }) => [styles.notTrail, pressed && styles.pressed]}
          >
            <Text style={styles.notTrailText}>Not part of a trail</Text>
          </Pressable>
        </View>
      </Sheet>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: 'flex-end', margin: 0 },
  sheet: { maxHeight: '78%', paddingTop: 12, paddingHorizontal: 22 },
  grabber: { alignSelf: 'center', marginBottom: 14 },
  title: {
    fontFamily: fonts.serif,
    fontSize: 26,
    lineHeight: 26 * 1.1,
    color: colors.ink,
    marginTop: 4,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 13 * 1.45,
    color: colors.inkSoft,
    marginTop: 6,
  },
  list: { marginTop: 16, flexGrow: 0 },
  listContent: { gap: 10, paddingBottom: 4 },
  loader: { marginVertical: 24 },
  empty: {
    fontFamily: fonts.hand,
    fontSize: 18,
    lineHeight: 22,
    color: colors.inkSoft,
    textAlign: 'center',
    marginVertical: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  rowOn: { backgroundColor: colors.accentTint, borderColor: 'rgba(118,149,124,0.45)' },
  rowOff: { backgroundColor: colors.paperBright, borderColor: colors.lineSoft },
  rowBlocked: { borderColor: colors.lineSoft, opacity: 0.55 },
  greySeal: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.inkFaint },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  place: { fontFamily: fonts.handSemibold, fontSize: 19, lineHeight: 21, color: colors.ink },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 8.5 * 0.16,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(33,29,23,0.3)',
  },
  radioOn: { borderWidth: 5, borderColor: colors.accentDeep, backgroundColor: colors.paperCard },
  footer: { marginTop: 16, gap: 6 },
  dim: { opacity: 0.5 },
  notTrail: { height: 44, alignItems: 'center', justifyContent: 'center' },
  notTrailText: { fontFamily: fonts.sans, fontSize: 13.5, color: colors.inkSoft },
  pressed: { opacity: 0.85 },
});
