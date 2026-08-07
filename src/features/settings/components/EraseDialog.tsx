/**
 * The panic wipe's confirmation — step two of two.
 *
 * The screen names, in two columns, **what dies and what survives**. That
 * second column is the part people get wrong: drops and replies are anonymised
 * rather than deleted, because a confession somebody already walked to and read
 * shouldn't vanish out from under them. A wipe that quietly left content behind
 * while implying otherwise would be a broken promise on the one screen where a
 * broken promise costs the most.
 */
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Grabber, Sheet } from '../../../design-system/components';
import { colors, fonts } from '../../../design-system/tokens';
import type { ApiEraseReceipt } from '../../../services/api';
import type { WipeStage } from '../hooks/usePanicWipe';

interface Props {
  stage: WipeStage;
  receipt: ApiEraseReceipt | null;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  /** Leave the wiped app behind and start over as a stranger. */
  onFinish: () => void;
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export function EraseDialog({
  stage,
  receipt,
  error,
  onConfirm,
  onCancel,
  onFinish,
}: Props) {
  const insets = useSafeAreaInsets();
  const busy = stage === 'wiping';
  const done = stage === 'done';

  return (
    <Modal
      isVisible={stage !== 'idle'}
      // No backdrop dismissal while the request is out: the app is mid-wipe and
      // a stray tap shouldn't leave the user unsure whether it finished.
      onBackdropPress={busy || done ? undefined : onCancel}
      onBackButtonPress={busy ? undefined : done ? onFinish : onCancel}
      useNativeDriver
      useNativeDriverForBackdrop
      backdropOpacity={0.5}
      backdropColor={colors.ink}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.modal}
    >
      <Sheet style={[styles.sheet, { paddingBottom: insets.bottom + 22 }]}>
        <Grabber style={styles.grabber} />

        {done && receipt ? (
          <>
            <Text style={styles.kicker}>done · you are a stranger again</Text>
            <Text style={styles.title}>Erased</Text>
            <Text style={styles.body}>
              This phone carries a new anonymous id. Nothing here connects to
              anything you did before.
            </Text>
            <View style={styles.receipt}>
              <Text style={styles.receiptLine}>
                Gone: {plural(receipt.deleted.reveals, 'reveal', 'reveals')},{' '}
                {plural(receipt.deleted.saves, 'save', 'saves')},{' '}
                {plural(receipt.deleted.hearts, 'heart', 'hearts')},{' '}
                {plural(receipt.deleted.reports, 'report', 'reports')},{' '}
                {plural(receipt.deleted.stepDays, 'day of steps', 'days of steps')}.
              </Text>
              {receipt.anonymised.drops + receipt.anonymised.replies > 0 && (
                <Text style={styles.receiptLine}>
                  Still out there, with nothing linking them to you:{' '}
                  {plural(receipt.anonymised.drops, 'drop', 'drops')} and{' '}
                  {plural(receipt.anonymised.replies, 'reply', 'replies')}.
                </Text>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onFinish}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            >
              <Text style={styles.primaryText}>Start over</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.kicker}>this cannot be undone</Text>
            <Text style={styles.title}>Erase everything?</Text>

            <View style={styles.cols}>
              <View style={styles.col}>
                <Text style={styles.colHead}>gone forever</Text>
                <Text style={styles.colBody}>
                  Every secret you found and saved. Your hearts, your steps, your
                  trail, your seals, your walked map. Your anonymous id — this
                  phone gets a new one.
                </Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.colHead}>stays where you left it</Text>
                <Text style={styles.colBody}>
                  The secrets and replies you dropped. Other people already
                  walked to those. They lose every trace of who wrote them —
                  including ours — but they stay on the map.
                </Text>
              </View>
            </View>

            {error && (
              <Text style={styles.error}>
                {error} Nothing was erased — your secrets are all still here. Try
                again when you have a connection.
              </Text>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Erase everything, permanently"
              onPress={onConfirm}
              disabled={busy}
              style={({ pressed }) => [
                styles.destructive,
                busy && styles.dim,
                pressed && styles.pressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={colors.paperCard} />
              ) : (
                <Text style={styles.destructiveText}>
                  {error ? 'Try again' : 'Yes — erase everything'}
                </Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              disabled={busy}
              style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>Keep my trail</Text>
            </Pressable>
          </>
        )}
      </Sheet>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: 'flex-end', margin: 0 },
  sheet: { paddingTop: 12, paddingHorizontal: 26 },
  grabber: { marginBottom: 14 },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.24,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 27,
    letterSpacing: 27 * -0.01,
    color: colors.ink,
    marginTop: 6,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: colors.inkSoft,
    marginTop: 9,
  },
  cols: { flexDirection: 'row', gap: 16, marginTop: 18 },
  col: { flex: 1 },
  colHead: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 8.5 * 0.18,
    textTransform: 'uppercase',
    color: colors.accentDeep,
  },
  colBody: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 12 * 1.5,
    color: colors.inkSoft,
    marginTop: 7,
  },
  receipt: {
    marginTop: 16,
    gap: 8,
    backgroundColor: colors.accentTint,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(118,149,124,0.3)',
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  receiptLine: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 12 * 1.5,
    color: colors.inkSoft,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 12 * 1.5,
    color: colors.ink,
    marginTop: 16,
  },
  destructive: {
    marginTop: 20,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#8C3B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14.5,
    color: colors.paperCard,
  },
  primary: {
    marginTop: 20,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14.5,
    color: colors.paperCard,
  },
  cancel: { height: 48, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  dim: { opacity: 0.6 },
  pressed: { opacity: 0.85 },
});
