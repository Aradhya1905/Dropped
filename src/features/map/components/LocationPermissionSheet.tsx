/**
 * Location permission nudge — a paper bottom sheet shown when we need (or were
 * denied) device location. Presentational: the permission flow itself lives
 * with the caller (`onEnable` runs the real request / opens Settings).
 *
 * Built on the design system's `Sheet` + `Grabber` + `AppButton`, in the
 * paper/ink/sage palette — the "drop → walk → reveal" promise, restated.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, Grabber, Sheet, WaxSeal } from '../../../design-system/components';
import { AnonLockIcon, PinIcon, WalkIcon } from '../../../design-system/icons';
import { colors, fonts } from '../../../design-system/tokens';

type Props = {
  visible: boolean;
  /** Disables Enable while the system dialog / GPS fix is pending. */
  busy?: boolean;
  /** True after a never-ask-again denial — copy points at Settings. */
  blocked?: boolean;
  /** Tap on the primary CTA — caller runs the real request / opens Settings. */
  onEnable: () => void;
  /** Backdrop / back button / "Maybe later". */
  onClose: () => void;
};

export function LocationPermissionSheet({
  visible,
  busy = false,
  blocked = false,
  onEnable,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      useNativeDriver
      useNativeDriverForBackdrop
      backdropOpacity={0.4}
      backdropColor={colors.ink}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.modal}
    >
      <Sheet style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <Grabber style={styles.grabber} />

        <View style={styles.seal}>
          <WaxSeal size={52} rotate={-7}>
            <PinIcon size={22} color="rgba(255,255,255,0.92)" strokeWidth={1.6} />
          </WaxSeal>
        </View>

        <Text style={styles.kicker}>one quick thing —</Text>
        <Text style={styles.title}>
          {blocked
            ? 'Location is off for Dropped'
            : 'Turn on location to read\nwhat’s near you'}
        </Text>
        <Text style={styles.sub}>
          {blocked
            ? 'Open Settings and allow location so the app can break the seals within 50 m of where you stand.'
            : 'We only peek at where you’re standing — just enough to break the seals within 50 m. It never leaves your device.'}
        </Text>

        <View style={styles.benefits}>
          <Row
            icon={<PinIcon size={19} strokeWidth={1.6} />}
            label="Find secrets dropped around you"
            hint="The map fills in once we know where you are"
          />
          <View style={styles.divider} />
          <Row
            icon={<WalkIcon size={19} strokeWidth={1.6} />}
            label="Walk within 50 m to reveal"
            hint="Get close and the seal breaks open"
          />
          <View style={styles.divider} />
          <Row
            icon={<AnonLockIcon size={19} strokeWidth={1.6} />}
            label="Anonymous by design"
            hint="No name, no profile — never leaves your device"
          />
        </View>

        <View style={styles.actions}>
          <AppButton
            label={
              busy
                ? 'Asking…'
                : blocked
                ? 'Open Settings'
                : 'Allow while using the app'
            }
            dot={!blocked}
            onPress={busy ? undefined : onEnable}
            style={busy ? styles.busy : undefined}
          />
          <AppButton label="Maybe later" variant="ghost" onPress={onClose} />
        </View>
      </Sheet>
    </Modal>
  );
}

function Row({
  icon,
  label,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: 'flex-end', margin: 0 },
  sheet: { paddingHorizontal: 22, paddingTop: 12 },
  grabber: { marginBottom: 18 },
  seal: { alignItems: 'center', marginBottom: 14 },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.22,
    textTransform: 'uppercase',
    color: colors.inkFaint,
    textAlign: 'center',
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 23,
    lineHeight: 28,
    color: colors.ink,
    textAlign: 'center',
    marginTop: 8,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.5,
    color: colors.inkSoft,
    textAlign: 'center',
    maxWidth: 300,
    alignSelf: 'center',
    marginTop: 10,
  },
  benefits: {
    backgroundColor: colors.paper,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    overflow: 'hidden',
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  rowHint: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    lineHeight: 15,
    color: colors.inkFaint,
    marginTop: 1,
  },
  divider: { height: 1, backgroundColor: colors.lineSoft, marginLeft: 67 },
  actions: { marginTop: 20, gap: 4 },
  busy: { opacity: 0.6 },
});
