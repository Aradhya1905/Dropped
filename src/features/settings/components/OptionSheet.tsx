/**
 * The You screen's picker: one paper sheet, a list of choices, a dot on the
 * live one. Same shape as the map's `LayerSheet` — deliberately, so a setting
 * behaves the same wherever it's changed — but generic over the value type,
 * because this screen has five pickers and they should not be five components.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Grabber, Sheet } from '../../../design-system/components';
import { colors, fonts } from '../../../design-system/tokens';

export interface SheetOption<T> {
  value: T;
  label: string;
  /** One line under the label — what picking this actually costs you. */
  note?: string;
}

export function OptionSheet<T>({
  visible,
  kicker,
  title,
  options,
  isActive,
  onSelect,
  onClose,
  children,
}: {
  visible: boolean;
  kicker: string;
  title: string;
  options?: readonly SheetOption<T>[];
  /** Compared by the caller, since `T` may be an object (quiet hours). */
  isActive?: (value: T) => boolean;
  onSelect?: (value: T) => void;
  onClose: () => void;
  /** Free-form body instead of a list — used by the mood sheet. */
  children?: React.ReactNode;
}) {
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

        <Text style={styles.kicker}>{kicker}</Text>
        <Text style={styles.title}>{title}</Text>

        {options && options.length > 0 ? (
          <View style={styles.list}>
            {options.map((option, i) => {
              const active = isActive?.(option.value) ?? false;
              return (
                <React.Fragment key={option.label}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={option.label}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                    onPress={() => {
                      onSelect?.(option.value);
                      onClose();
                    }}
                  >
                    <View style={styles.rowText}>
                      <Text style={[styles.label, active && styles.labelActive]}>
                        {option.label}
                      </Text>
                      {option.note ? (
                        <Text style={styles.note}>{option.note}</Text>
                      ) : null}
                    </View>
                    {active && <View style={styles.activeDot} />}
                  </Pressable>
                  {i < options.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              );
            })}
          </View>
        ) : null}

        {children ? <View style={styles.body}>{children}</View> : null}
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowText: { flex: 1 },
  pressed: { opacity: 0.75 },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
  },
  labelActive: { color: colors.accentDeep },
  note: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    lineHeight: 11.5 * 1.4,
    color: colors.inkSoft,
    marginTop: 3,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  divider: { height: 1, backgroundColor: colors.lineSoft, marginLeft: 16 },
  body: { marginTop: 20 },
});
