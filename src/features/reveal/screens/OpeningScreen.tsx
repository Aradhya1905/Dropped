/**
 * 06 Opening — "It cracks open." Press and HOLD to break the wax: the seal
 * trembles harder and the haptic ticks speed up as you hold; at full hold it
 * cracks, the burst plays once, and the server reveal fires. Let go early and
 * it settles back, nothing recorded. Screen-reader users crack it with a tap.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../app/navigation/types';
import {
  FunKicker,
  MapTexture,
  MetaFoot,
  PaperScreen,
} from '../../../design-system/components';
import { colors, fonts } from '../../../design-system/tokens';
import { BURST_END, CRACK_AT, SealBurst } from '../components/SealBurst';
import { useDropsStore } from '../../../store/dropsStore';
import { useReveal } from '../hooks';
import { NO_FIX } from '../hooks/useReveal';
import { failed, sealBreak, tap } from '../../../services/haptics';
import { paperRustle } from '../../../services/sound';
import type { ApiError } from '../../../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Opening'>;

/** How long the press has to last before the wax gives. */
const HOLD_MS = 1100;
/** The crack: halves fling and the note springs up, once. */
const BURST_MS = 1200;
/** Haptic tick spacing at the start and end of the hold — it builds. */
const TICK_SLOW_MS = 210;
const TICK_FAST_MS = 70;

type Phase = 'idle' | 'holding' | 'let-go' | 'cracking';

export function OpeningScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { secretId } = route.params;
  const secret = useDropsStore(s => s.drops.find(d => d.id === secretId));
  const { reveal, coord } = useReveal();

  const timeline = useRef(new Animated.Value(CRACK_AT)).current;
  const hold = useRef(new Animated.Value(0)).current;
  const holdAnim = useRef<Animated.CompositeAnimation | null>(null);
  const tickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhaseState] = useState<Phase>('idle');
  // Press handlers read the ref: a release landing in the same frame as the
  // crack must not see a stale 'holding' and settle the seal back.
  const phaseRef = useRef<Phase>('idle');
  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);
  const [screenReader, setScreenReader] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => sub.remove();
  }, []);

  const stopTicks = useCallback(() => {
    if (tickTimer.current) clearTimeout(tickTimer.current);
    tickTimer.current = null;
  }, []);

  useEffect(() => stopTicks, [stopTicks]);

  /** A tick chain that speeds up across the hold. */
  const startTicks = useCallback(() => {
    stopTicks();
    const began = Date.now();
    const tick = () => {
      tap();
      const p = Math.min((Date.now() - began) / HOLD_MS, 1);
      tickTimer.current = setTimeout(tick, TICK_SLOW_MS - (TICK_SLOW_MS - TICK_FAST_MS) * p);
    };
    tick();
  }, [stopTicks]);

  const resetSeal = useCallback(() => {
    hold.setValue(0);
    timeline.setValue(CRACK_AT);
    setPhase('idle');
  }, [hold, setPhase, timeline]);

  const handleError = useCallback(
    (err: unknown) => {
      failed();
      resetSeal();
      if (err instanceof Error && err.message === NO_FIX) {
        Alert.alert(
          "Can't place you yet",
          "We need your location to know you're standing here. Check that location is on, then try again.",
        );
        return;
      }
      const apiErr = err as ApiError;
      if (apiErr?.status === 403) {
        Alert.alert(
          'Too far',
          apiErr.distanceMeters != null
            ? `Get within 50 m. You're ${Math.round(apiErr.distanceMeters)} m away.`
            : 'Get within 50 m to reveal this secret.',
        );
      } else if (apiErr?.code === 'network' || apiErr?.code === 'timeout') {
        // This case used to fail completely silently.
        Alert.alert("Couldn't reach it", 'You look offline. Try again in a moment.');
      } else if (apiErr?.status === 404) {
        Alert.alert('It is gone', 'This secret is not here any more.');
      } else {
        Alert.alert("That didn't open", 'Something went wrong. Try again.');
      }
    },
    [resetSeal],
  );

  /**
   * The wax gives. The reveal only starts here — never on press-in — so a
   * cancelled hold can't record a reveal. Navigate once the burst has played
   * AND the server has answered.
   */
  const crack = useCallback(async () => {
    stopTicks();
    setPhase('cracking');
    sealBreak();
    paperRustle();
    hold.setValue(0);
    const burst = new Promise<void>(resolve =>
      Animated.timing(timeline, {
        toValue: BURST_END,
        duration: BURST_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => resolve()),
    );
    try {
      await Promise.all([reveal({ id: secretId }), burst]);
      navigation.replace('Secret', { secretId, rub: true });
    } catch (err) {
      handleError(err);
    }
  }, [handleError, hold, navigation, reveal, secretId, setPhase, stopTicks, timeline]);

  const handlePressIn = () => {
    if (phaseRef.current === 'cracking' || screenReader) return;
    setPhase('holding');
    startTicks();
    holdAnim.current = Animated.timing(hold, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    });
    holdAnim.current.start(({ finished }) => {
      if (finished) crack();
    });
  };

  const handlePressOut = () => {
    if (phaseRef.current !== 'holding') return;
    // Let go too soon: the seal settles back, nothing is sent.
    holdAnim.current?.stop();
    stopTicks();
    setPhase('let-go');
    Animated.spring(hold, { toValue: 0, friction: 5, useNativeDriver: true }).start();
  };

  // Screen readers can't comfortably hold — a double-tap cracks it outright.
  const handlePress = () => {
    if (screenReader && phaseRef.current !== 'cracking') crack();
  };

  const hint =
    phase === 'cracking'
      ? coord
        ? 'opening…'
        : 'finding you first…'
      : phase === 'holding'
        ? 'keep holding…'
        : phase === 'let-go'
          ? 'not yet — hold it down a little longer.'
          : screenReader
            ? 'double-tap to break the seal.'
            : 'press and hold to break the seal.';

  return (
    <PaperScreen>
      <MapTexture dense blur />
      <Pressable
        style={[styles.view, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 30 }]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={phase === 'cracking'}
        accessibilityRole="button"
        accessibilityLabel="Break the seal and read this secret"
        accessibilityHint={screenReader ? undefined : 'Press and hold until the seal cracks'}
      >
        <FunKicker centered style={styles.kicker}>
          you made it all the way here —
        </FunKicker>

        <SealBurst timeline={timeline} hold={hold} />

        <Text style={[styles.title, phase === 'cracking' && styles.dimmed]}>
          {phase === 'cracking' ? 'It cracks open.' : 'Break the seal.'}
        </Text>
        <Text style={styles.meta}>{secret?.drop.placeLabel ?? ''}</Text>
        <Text style={styles.hint}>{hint}</Text>

        <View style={styles.foot}>
          <MetaFoot style={styles.footMeta}>Read it once · then reseal it or let it fade</MetaFoot>
        </View>
      </Pressable>
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  view: { flex: 1, paddingHorizontal: 26, alignItems: 'center', zIndex: 10 },
  kicker: { alignSelf: 'center' },
  title: {
    fontFamily: fonts.serifItalic,
    fontSize: 30,
    color: colors.ink,
    marginTop: 14,
    textAlign: 'center',
  },
  dimmed: { opacity: 0.5 },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.2,
    textTransform: 'uppercase',
    color: colors.inkFaint,
    marginTop: 11,
    textAlign: 'center',
  },
  hint: {
    fontFamily: fonts.handSemibold,
    fontSize: 20,
    lineHeight: 20 * 1.2,
    color: colors.accentDeep,
    marginTop: 18,
    textAlign: 'center',
    maxWidth: 300,
    transform: [{ rotate: '-1.5deg' }],
  },
  foot: { marginTop: 'auto' },
  footMeta: { marginTop: 0 },
});
