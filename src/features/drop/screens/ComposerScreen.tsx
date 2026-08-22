/**
 * 08 Composer — "What happened here?" Pin your spot, write the confession on
 * ruled paper, pick a mood, drop it forever.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../app/navigation/types';
import type { Mood } from '../../../types';
import {
  AppButton,
  CloseX,
  FunKicker,
  Grabber,
  MapTexture,
  PaperScreen,
  PulseRing,
  Sheet,
  WaxSeal,
} from '../../../design-system/components';
import { PinIcon, SealPinIcon } from '../../../design-system/icons';
import { colors, fonts, shadows } from '../../../design-system/tokens';
import { MoodChips } from '../components/MoodChips';
import { WriteCard } from '../components/WriteCard';
import { useDeviceLocation } from '../../map/hooks';
import { useCreateDrop } from '../hooks';
import {
  clearComposerDraft,
  DROP_MAX_CHARS,
  getComposerDraft,
  setComposerDraft,
} from '../../../services/storage';
import { dropped as hapticDropped, failed as hapticFailed } from '../../../services/haptics';
import type { ApiError } from '../../../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Composer'>;

export function ComposerScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  // Restore an unsent confession — the app dying (or a stray back tap) used to
  // take the whole thing with it.
  const restored = useRef(getComposerDraft()).current;
  const [mood, setMood] = useState<Mood>((restored?.mood as Mood) ?? 'joy');
  const [body, setBody] = useState(restored?.body ?? '');
  const { coord, shortAddress, city } = useDeviceLocation();
  const { create, isPending } = useCreateDrop();

  // Autosave every keystroke; MMKV writes are synchronous and tiny.
  useEffect(() => {
    if (body.trim().length === 0) {
      clearComposerDraft();
      return;
    }
    setComposerDraft({ body, mood, updatedAt: Date.now() });
  }, [body, mood]);

  const canDrop = !!coord && body.trim().length > 0 && !isPending;

  // Set once the drop succeeded, so the confirm below doesn't fire on the
  // navigation that *is* the success.
  const submittedRef = useRef(false);

  /**
   * Leaving with words on the page asks first — this covers the close button,
   * the Android back button and the swipe-back gesture in one place.
   */
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (submittedRef.current || body.trim().length === 0) return;
      e.preventDefault();
      Alert.alert('Leave this here?', "We'll keep what you wrote for next time.", [
        { text: 'Keep writing', style: 'cancel' },
        { text: 'Leave', onPress: () => navigation.dispatch(e.data.action) },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            clearComposerDraft();
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
    return unsubscribe;
  }, [body, navigation]);

  const handleDrop = async () => {
    if (!canDrop) return;
    try {
      const secret = await create({
        body: body.trim(),
        mood,
        coordinate: coord,
        placeLabel: shortAddress ?? undefined,
        city: city ?? undefined,
      });
      clearComposerDraft();
      submittedRef.current = true;
      hapticDropped();
      navigation.replace('Dropped', { secretId: secret.id });
    } catch (err) {
      hapticFailed();
      const apiErr = err as ApiError;
      // The draft stays on disk, so nothing is lost by failing here.
      Alert.alert(
        'Could not drop',
        apiErr?.code === 'network' || apiErr?.code === 'timeout'
          ? "You look offline. What you wrote is saved — try again in a moment."
          : (apiErr?.message ?? 'Check your connection and try again.'),
      );
    }
  };

  const dropLabel = isPending
    ? 'Dropping…'
    : !coord
      ? 'Finding your spot…'
      : 'Drop here · forever';

  return (
    <PaperScreen>
      <MapTexture dense />

      <CloseX
        label="Close without dropping"
        onPress={() => navigation.goBack()}
        style={[styles.close, { top: insets.top + 54 }]}
      />
      <View style={[styles.spotPill, { top: insets.top + 10 }]}>
        <PinIcon size={13} strokeWidth={1.6} dotColor={colors.accent} />
        <Text style={styles.spotPillText}>Dropping at this spot</Text>
      </View>
      <Text style={[styles.placeLbl, { top: insets.top + 62 }]}>
        {shortAddress?.toUpperCase() ?? (coord ? 'THIS SPOT' : 'LOCATING…')}
      </Text>
      <View style={[styles.marker, { top: insets.top + 58 }]}>
        <PulseRing
          size={24}
          fromScale={1}
          toScale={2.6}
          peakOpacity={0.6}
          durationMs={3200}
          borderWidth={1.6}
          borderColor={colors.accent}
        />
        <WaxSeal size={24} />
      </View>

      <Sheet style={[styles.sheet, { top: insets.top + 96 }]}>
        <View style={[styles.inner, { paddingBottom: insets.bottom + 24 }]}>
          <Grabber style={styles.grabber} />
          <FunKicker>go on — out with it.</FunKicker>
          <Text style={styles.title}>What happened here?</Text>
          <Text style={styles.sub}>
            Anonymous. Nobody reads this unless they walk within 50m of where
            you're standing.
          </Text>

          <WriteCard
            value={body}
            onChangeText={setBody}
            sign="— anonymous, here, now"
            count={body.length}
            maxLength={DROP_MAX_CHARS}
          />

          <MoodChips
            moods={['joy', 'ache', 'trouble', 'wonder']}
            selected={mood}
            onSelect={v => setMood(v as Mood)}
          />

          <AppButton
            label={dropLabel}
            iconLeft={
              <SealPinIcon
                size={18}
                color={colors.paperCard}
                dotColor={colors.paperCard}
              />
            }
            onPress={handleDrop}
            style={[styles.dropBtn, !canDrop && styles.dropBtnDim]}
          />
        </View>
      </Sheet>
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  close: { position: 'absolute', right: 18, zIndex: 25 },
  spotPill: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.paperCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 15,
    boxShadow: shadows.chip,
  },
  spotPillText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.2,
    textTransform: 'uppercase',
    color: colors.accentDeep,
  },
  placeLbl: {
    position: 'absolute',
    left: 30,
    zIndex: 12,
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.3,
    color: 'rgba(86,110,91,0.6)',
  },
  marker: {
    position: 'absolute',
    alignSelf: 'center',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 14,
  },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 18 },
  inner: { flex: 1, paddingTop: 18, paddingHorizontal: 26 },
  grabber: { marginBottom: 12 },
  title: {
    fontFamily: fonts.serif,
    fontSize: 29,
    letterSpacing: 29 * -0.01,
    color: colors.ink,
    marginTop: 2,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.5,
    color: colors.inkSoft,
    marginTop: 8,
    maxWidth: 284,
  },
  dropBtn: { marginTop: 18 },
  dropBtnDim: { opacity: 0.5 },
});
