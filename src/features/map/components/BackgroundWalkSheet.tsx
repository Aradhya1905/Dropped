/**
 * The "keep listening while it's closed?" sheet — the in-context ask for
 * background location.
 *
 * The copy is deliberately unflattering about what it costs. This is the
 * scariest permission an anonymous confessions app could hold, and a prompt
 * that undersells it earns a grant now and an uninstall later. It says what is
 * watched, what leaves the device (nothing), and how to stop — before the OS
 * dialog appears, because the OS dialog says none of that.
 *
 * Presentational; the permission flow lives in `useBackgroundWalk`.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, Grabber, Sheet, WaxSeal } from '../../../design-system/components';
import { AnonLockIcon, HumIcon, WalkIcon } from '../../../design-system/icons';
import { colors, fonts } from '../../../design-system/tokens';

type Props = {
  visible: boolean;
  /** Disables the CTA while the system dialog is up. */
  busy?: boolean;
  /** True after a permanent denial — the only route left is app settings. */
  blocked?: boolean;
  onEnable: () => void;
  onClose: () => void;
};

export function BackgroundWalkSheet({
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
          <WaxSeal size={52} rotate={5}>
            <HumIcon size={22} color="rgba(255,255,255,0.92)" strokeWidth={1.6} />
          </WaxSeal>
        </View>

        <Text style={styles.kicker}>only if you want it</Text>
        <Text style={styles.title}>
          {blocked
            ? 'Android won’t ask again'
            : 'Want a hum when you walk\npast a secret?'}
        </Text>
        <Text style={styles.sub}>
          {blocked
            ? 'Open Settings → Permissions → Location and choose “Allow all the time”. Everything else in Dropped keeps working either way.'
            : 'Right now Dropped only notices things while you have it open. To catch the ones you walk past with your phone in your pocket, it needs to keep watching in the background.'}
        </Text>

        <View style={styles.benefits}>
          <Row
            icon={<WalkIcon size={19} strokeWidth={1.6} />}
            label="One quiet hum, at most"
            hint="Never twice for the same secret, and not more than once every half hour"
          />
          <View style={styles.divider} />
          <Row
            icon={<AnonLockIcon size={19} strokeWidth={1.6} />}
            label="Where you walk stays on your phone"
            hint="Nothing about your route is stored anywhere else"
          />
          <View style={styles.divider} />
          <Row
            icon={<HumIcon size={19} strokeWidth={1.6} />}
            label="A notification stays up while it watches"
            hint="Tap it any time to stop — the rest of the app is unaffected"
          />
        </View>

        <Text style={styles.fine}>
          Android will ask separately, in its own dialog. Choosing “Allow all the
          time” there is what turns this on.
        </Text>

        <View style={styles.actions}>
          <AppButton
            label={busy ? 'Asking…' : blocked ? 'Open Settings' : 'Yes, listen while I walk'}
            dot={!blocked}
            onPress={busy ? undefined : onEnable}
            style={busy ? styles.busy : undefined}
          />
          <AppButton label="No, only when it’s open" variant="ghost" onPress={onClose} />
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
    maxWidth: 310,
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
  fine: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.inkFaint,
    textAlign: 'center',
    maxWidth: 300,
    alignSelf: 'center',
    marginTop: 14,
  },
  actions: { marginTop: 18, gap: 4 },
  busy: { opacity: 0.6 },
});
