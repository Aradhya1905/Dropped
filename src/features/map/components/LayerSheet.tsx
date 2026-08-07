import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Grabber, Sheet } from '../../../design-system/components';
import { colors, fonts } from '../../../design-system/tokens';
import type { MapStyleChoice, MapStyleOption } from '../../../services/maps';

type Props = {
  visible: boolean;
  activeKey: MapStyleChoice;
  options: MapStyleOption[];
  onSelect: (key: MapStyleChoice) => void;
  onClose: () => void;
};

const SWATCH_COLORS: Record<MapStyleChoice, string> = {
  dropped: colors.paper,
  quiet: colors.accent,
  droppedNight: '#171410', // the night cut's ground
  auto: colors.accentDeep,
  dark: '#1A1A1A',
  grayscale: '#C8C8C8',
};

/** Said on the row, because "Follow the sun" alone doesn't say what it does. */
const NOTES: Partial<Record<MapStyleChoice, string>> = {
  auto: 'Paper by day, after dark at night.',
};

export function LayerSheet({ visible, activeKey, options, onSelect, onClose }: Props) {
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
      <Sheet style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <Grabber style={styles.grabber} />

        <Text style={styles.kicker}>map style</Text>
        <Text style={styles.title}>choose a look</Text>

        <View style={styles.list}>
          {options.map((option, i) => {
            const active = option.key === activeKey;
            const showDivider = i < options.length - 1;
            return (
              <React.Fragment key={option.key}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={option.label}
                  accessibilityHint={NOTES[option.key]}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  onPress={() => {
                    onSelect(option.key);
                    onClose();
                  }}
                >
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: SWATCH_COLORS[option.key] },
                      option.key === 'dropped' && styles.swatchBorder,
                    ]}
                  />
                  <View style={styles.labelBlock}>
                    <Text style={[styles.label, active && styles.labelActive]}>
                      {option.label}
                    </Text>
                    {NOTES[option.key] != null && (
                      <Text style={styles.note}>{NOTES[option.key]}</Text>
                    )}
                  </View>
                  {active && <View style={styles.activeDot} />}
                </Pressable>
                {showDivider && <View style={styles.divider} />}
              </React.Fragment>
            );
          })}
        </View>
      </Sheet>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: 'flex-end', margin: 0 },
  sheet: { paddingHorizontal: 22, paddingTop: 12 },
  grabber: { marginBottom: 18 },
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
    fontSize: 22,
    lineHeight: 28,
    color: colors.ink,
    textAlign: 'center',
    marginTop: 6,
  },
  list: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    overflow: 'hidden',
    marginTop: 20,
    backgroundColor: colors.paper,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    gap: 14,
  },
  pressed: { opacity: 0.75 },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 7,
  },
  swatchBorder: {
    borderWidth: 1,
    borderColor: colors.line,
  },
  labelBlock: { flex: 1 },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
  },
  note: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    lineHeight: 11.5 * 1.4,
    color: colors.inkSoft,
    marginTop: 2,
  },
  labelActive: {
    color: colors.accentDeep,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  divider: { height: 1, backgroundColor: colors.lineSoft, marginLeft: 54 },
});
