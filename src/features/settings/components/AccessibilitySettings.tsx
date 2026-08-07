/**
 * The accessibility and polish rows on the You screen (FUN_TODOs/15).
 *
 * Kept as one self-contained block, with its own row styling, deliberately:
 * tickets 13 and 14 are rewriting `YouScreen` around a shared `SettingRow` at
 * the same time, and a component that inserts as a single line is a single line
 * to merge. When those land, these rows should be re-expressed in whatever row
 * primitive wins — the behaviour below is the part worth keeping.
 *
 * Two of these apply on next launch rather than under the finger. That isn't a
 * shortcut: the colour and type tokens are read once, at import, so that a
 * change reaches *every* screen including ones nobody remembered to convert
 * (see `design-system/tokens/colors`). The rows say so rather than pretending.
 */
import React, { useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  HumIcon,
  LayersIcon,
  LocateIcon,
  PersonIcon,
  QuillIcon,
  WalkIcon,
} from '../../../design-system/icons';
import { colors, fonts, useReducedMotion } from '../../../design-system/tokens';
import { setHapticsEnabled } from '../../../services/haptics';
import {
  getBatteryMode,
  getHapticsEnabled,
  getHighContrast,
  getMapStyle,
  getReducedMotion,
  getTextScale,
  setBatteryMode,
  setHighContrast,
  setMapStyle,
  setReducedMotion,
  setTextScale,
  type TextScale,
} from '../../../services/storage';

const TEXT_SCALE_ORDER: TextScale[] = ['system', 'large', 'largest'];
const TEXT_SCALE_LABEL: Record<TextScale, string> = {
  system: 'System',
  large: 'Large',
  largest: 'Largest',
};

/** Applies on next launch — see the module note. */
const RESTART_NOTE = 'Takes effect next time you open the app.';

interface RowProps {
  icon: React.ReactNode;
  label: string;
  note?: string;
  value: string;
  /** Dims the value when the setting is at its "off" end. */
  off?: boolean;
  role: 'switch' | 'button';
  checked?: boolean;
  onPress: () => void;
}

function Row({ icon, label, note, value, off, role, checked, onPress }: RowProps) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === 'switch' ? { checked } : undefined}
      accessibilityLabel={label}
      accessibilityHint={note}
      accessibilityValue={role === 'button' ? { text: value } : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.ico}>{icon}</View>
      <View style={styles.labelBlock}>
        <Text style={styles.label}>{label}</Text>
        {note != null && <Text style={styles.note}>{note}</Text>}
      </View>
      <Text style={[styles.value, off && styles.valueOff]}>{value}</Text>
    </Pressable>
  );
}

export function AccessibilitySettings() {
  // `useReducedMotion` is the OR of the OS setting and ours, which is what the
  // row must reflect — someone whose phone already asks for stillness should
  // see "On" here, not "Off" next to an app that is visibly holding still.
  const effectiveReducedMotion = useReducedMotion();
  const [appReducedMotion, setAppReducedMotion] = useState(getReducedMotion);
  const [osReducedMotion, setOsReducedMotion] = useState(false);
  React.useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(on => {
        if (!cancelled) setOsReducedMotion(on);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const [haptics, setHaptics] = useState(getHapticsEnabled);
  const [contrast, setContrast] = useState(getHighContrast);
  const [scale, setScale] = useState(getTextScale);
  const [battery, setBattery] = useState(getBatteryMode);
  const [followSun, setFollowSun] = useState(() => getMapStyle() === 'auto');

  return (
    <View style={styles.list}>
      <Row
        icon={<WalkIcon size={22} color={effectiveReducedMotion ? colors.accentDeep : colors.inkSoft} />}
        label="Reduced motion"
        note={
          osReducedMotion
            ? 'Following your phone — everything is already still.'
            : 'Stops the drifting map, bobbing notes and pulsing rings. The reveal still opens.'
        }
        value={effectiveReducedMotion ? 'On' : 'Off'}
        off={!effectiveReducedMotion}
        role="switch"
        checked={effectiveReducedMotion}
        onPress={() => {
          // The OS setting outranks this one and cannot be overridden from
          // here: turning it "off" in the app while the phone asks for reduced
          // motion would be the app overruling an accessibility preference.
          if (osReducedMotion) return;
          const next = !appReducedMotion;
          setReducedMotion(next);
          setAppReducedMotion(next);
        }}
      />

      <Row
        icon={<HumIcon size={22} color={haptics ? colors.accentDeep : colors.inkSoft} />}
        label="Warmth haptics"
        note="The buzz that gets closer together as you near a secret."
        value={haptics ? 'On' : 'Off'}
        off={!haptics}
        role="switch"
        checked={haptics}
        onPress={() => {
          const next = !haptics;
          // One call persists *and* applies — never set the flag without going
          // through the adapter, or its in-memory gate drifts from storage.
          setHapticsEnabled(next);
          setHaptics(next);
        }}
      />

      <Row
        icon={<PersonIcon size={22} color={contrast ? colors.accentDeep : colors.inkSoft} />}
        label="High contrast"
        note={`Darker ink, firmer edges. ${RESTART_NOTE}`}
        value={contrast ? 'On' : 'Off'}
        off={!contrast}
        role="switch"
        checked={contrast}
        onPress={() => {
          const next = !contrast;
          setHighContrast(next);
          setContrast(next);
        }}
      />

      <Row
        icon={<QuillIcon size={22} color={colors.inkSoft} />}
        label="Text size"
        note={`On top of your phone's own text size. ${RESTART_NOTE}`}
        value={TEXT_SCALE_LABEL[scale]}
        off={scale === 'system'}
        role="button"
        onPress={() => {
          const next =
            TEXT_SCALE_ORDER[
              (TEXT_SCALE_ORDER.indexOf(scale) + 1) % TEXT_SCALE_ORDER.length
            ];
          setTextScale(next);
          setScale(next);
        }}
      />

      <Row
        icon={<LayersIcon size={22} color={followSun ? colors.accentDeep : colors.inkSoft} />}
        label="Map follows the sun"
        note="Paper by day, the same map after dark at night. Other styles live under Layers on the map."
        value={followSun ? 'On' : 'Off'}
        off={!followSun}
        role="switch"
        checked={followSun}
        onPress={() => {
          const next = !followSun;
          // Off returns to the day cut rather than to whatever exotic style was
          // set before — one remembered value here isn't worth the surprise.
          setMapStyle(next ? 'auto' : 'dropped');
          setFollowSun(next);
        }}
      />

      <Row
        icon={<LocateIcon size={22} color={battery ? colors.accentDeep : colors.inkSoft} />}
        label="Battery mode"
        note="Checks where you are less often. Fog and warmth still work, they just catch up in bigger steps."
        value={battery ? 'On' : 'Off'}
        off={!battery}
        role="switch"
        checked={battery}
        onPress={() => {
          const next = !battery;
          setBatteryMode(next);
          setBattery(next);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 9, gap: 9 },
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
    boxShadow: '0 10px 20px -18px rgba(43,33,20,0.45)',
  },
  pressed: { opacity: 0.85 },
  ico: { width: 22, height: 22 },
  labelBlock: { flex: 1 },
  label: { fontFamily: fonts.serif, fontSize: 16, color: colors.ink },
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
  valueOff: { color: colors.inkFaint },
});
