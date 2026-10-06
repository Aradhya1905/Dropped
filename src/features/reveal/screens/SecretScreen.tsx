/**
 * 07 The secret — the unlocked confession on a spacious taped card, with the
 * "unlocked · here, now" pill, save and heart actions.
 *
 * A fresh reveal (`rub`) starts blank: the words are rubbed up like a pencil
 * over a coin (RubReveal). Under the words, the weather postmark ("left on a
 * rainy Tuesday night"); in the foot, how many steps the walk took.
 *
 * A stop on a trail (chain drops) gets a "the trail goes on" ticket under the
 * note once it's read, with a Follow the trail button to the next stop.
 */
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../app/navigation/types';
import {
  CloseX,
  EmotionTag,
  FadeUp,
  MapTexture,
  MetaFoot,
  PaperScreen,
  Tape,
} from '../../../design-system/components';
import { BookmarkIcon, HeartIcon, PinIcon } from '../../../design-system/icons';
import { colors, fonts } from '../../../design-system/tokens';
import { hydrateDrops, useDropsStore } from '../../../store/dropsStore';
import { useSave, useHeart, useReport } from '../hooks';
import { droppedAgo, postmarkLine, stepsLine } from '../../../utils/format';
import { nextStopStub } from '../../../utils/chains';
import { NextStopTicket } from '../components/NextStopTicket';
import { RubReveal } from '../components/RubReveal';
import { tap } from '../../../services/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Secret'>;

export function SecretScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { secretId, rub } = route.params;
  const secret = useDropsStore(s => s.drops.find(d => d.id === secretId));

  const save = useSave(secretId);
  const heart = useHeart(secretId);
  const { report, reported } = useReport(secretId);
  // The ticket waits until the words are up; until then the page holds still
  // so a rub never turns into a scroll.
  const [rubDone, setRubDone] = useState(!rub);
  const onRubDone = useCallback(() => setRubDone(true), []);

  const chain = secret?.chain;
  const next = chain?.next;

  const followTrail = () => {
    if (!secret) return;
    tap();
    // Seed the next stop so Walk can find it before the nearby list refreshes.
    const stub = nextStopStub(secret);
    if (stub) hydrateDrops([stub]);
    navigation.navigate('Main', {
      screen: 'MapTab',
      params: { screen: 'Walk', params: { secretId: stub?.id ?? secretId } },
    });
  };

  return (
    <PaperScreen>
      <MapTexture dense blur />
      <View
        style={[
          styles.view,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.topbar}>
          <View style={styles.unlockedPill}>
            <View style={styles.frag}>
              <View style={[styles.fragHalf, styles.fragL]} />
              <View style={[styles.fragHalf, styles.fragR]} />
            </View>
            <Text style={styles.unlockedText}>
              {chain
                ? `unlocked · stop ${chain.pos} of ${chain.length}`
                : 'unlocked · here, now'}
            </Text>
          </View>
          <CloseX onPress={() => navigation.goBack()} style={styles.close} />
        </View>

        <ScrollView
          scrollEnabled={rubDone}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          <Pressable
            accessibilityHint="Hold to report this secret"
            onLongPress={() => {
              if (reported) return;
              tap();
              Alert.alert(
                'Report this secret?',
                'It will be reviewed and may be removed.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Report',
                    style: 'destructive',
                    onPress: () => report('inappropriate'),
                  },
                ],
              );
            }}
            style={styles.card}
          >
            <Tape width={74} height={22} rotate={-2.5} style={styles.tape} />
            <View style={styles.cardHead}>
              <View>
                <View style={styles.placeMeta}>
                  <PinIcon size={11} strokeWidth={1.5} />
                  <Text style={styles.placeMetaText}>
                    {secret?.drop.placeLabel ?? ''}
                  </Text>
                </View>
                <Text style={styles.placeName}>
                  {secret?.drop.placeLabel ?? 'Here'}
                </Text>
              </View>
              <EmotionTag label={secret?.mood ?? 'ache'} />
            </View>
            <View style={styles.cardRule} />

            <RubReveal active={!!rub} onDone={onRubDone} style={styles.quote}>
              <Text style={styles.qmark}>"</Text>
              <Text style={styles.quoteText}>{secret?.body ?? ''}</Text>
              {secret && !secret.starter ? (
                <Text style={styles.postmark}>
                  {postmarkLine(secret.drop.createdAt, secret.drop.weather)}
                </Text>
              ) : null}
            </RubReveal>

            <View style={styles.cardFoot}>
              <View style={styles.dash} />
              <View style={styles.footGrid}>
                <View>
                  <Text style={styles.dropped}>
                    — {secret ? droppedAgo(secret.drop.createdAt) : ''}
                  </Text>
                  <Text style={styles.byline}>
                    by someone who{'\n'}stood right here
                  </Text>
                </View>
                <View style={styles.stood}>
                  <Text style={styles.stoodNum}>{secret?.stoodHere ?? 0}</Text>
                  <Text style={styles.stoodLbl}>have stood here too</Text>
                </View>
              </View>
              {stepsLine(secret?.walkSteps) ? (
                <Text style={styles.steps}>{stepsLine(secret?.walkSteps)}</Text>
              ) : null}
            </View>
          </Pressable>

          {chain && next && rubDone ? (
            <FadeUp style={styles.ticket}>
              <NextStopTicket
                stop={chain.pos + 1}
                of={chain.length}
                from={secret.drop.coordinate}
                to={next.coordinate}
                distanceMeters={next.distanceMeters}
                onFollow={followTrail}
              />
            </FadeUp>
          ) : null}
        </ScrollView>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              save.saved
                ? 'Remove from your collection'
                : 'Save to your collection'
            }
            onPress={() => {
              tap();
              save.toggle();
            }}
            disabled={save.isPending}
            style={({ pressed }) => [
              styles.saveBtn,
              save.saved && styles.saveBtnActive,
              pressed && styles.pressed,
            ]}
          >
            <BookmarkIcon
              size={18}
              color={save.saved ? colors.ink : colors.paperCard}
              strokeWidth={1.7}
            />
            <Text
              style={[styles.saveText, save.saved && styles.saveTextActive]}
            >
              {save.saved ? 'Saved' : 'Save to collection'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              heart.hearted ? 'Undo "I feel this"' : 'I feel this'
            }
            onPress={() => {
              tap();
              heart.toggle();
            }}
            disabled={heart.isPending}
            style={({ pressed }) => [
              styles.heartBtn,
              heart.hearted && styles.heartBtnActive,
              pressed && styles.pressed,
            ]}
          >
            <HeartIcon
              size={21}
              color={heart.hearted ? colors.accentDeep : colors.ink}
            />
          </Pressable>
        </View>

        <MetaFoot style={styles.reportHint}>
          {reported
            ? 'reported · thanks for the flag'
            : 'hold the card to report it'}
        </MetaFoot>
      </View>
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  view: { flex: 1, paddingHorizontal: 22, zIndex: 10 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  // Bleeds to the screen edge so the card's shadow and tape aren't clipped.
  scroll: { flex: 1, marginHorizontal: -22 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 18,
  },
  ticket: { marginTop: 22 },
  unlockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 7,
    paddingLeft: 11,
    paddingRight: 14,
    borderRadius: 20,
    backgroundColor: colors.accentTint,
    borderWidth: 1,
    borderColor: 'rgba(118,149,124,0.3)',
  },
  frag: { flexDirection: 'row' },
  fragHalf: { width: 7, height: 12, backgroundColor: colors.accentDeep },
  fragL: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    transform: [{ rotate: '-14deg' }],
  },
  fragR: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    transform: [{ rotate: '14deg' }],
    marginLeft: 1.5,
  },
  unlockedText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.2,
    textTransform: 'uppercase',
    color: colors.accentDeep,
  },
  close: { marginLeft: 'auto' },
  card: {
    flexGrow: 1,
    backgroundColor: colors.paperCard,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingTop: 24,
    paddingHorizontal: 22,
    paddingBottom: 22,
    boxShadow: '0 26px 50px -26px rgba(43,33,20,0.5)',
    transform: [{ rotate: '-0.3deg' }],
  },
  tape: { position: 'absolute', top: -10, left: '50%', marginLeft: -37 },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  placeMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  placeMetaText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.18,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  placeName: {
    fontFamily: fonts.handSemibold,
    fontSize: 25,
    lineHeight: 29,
    color: colors.ink,
    marginTop: 3,
  },
  cardRule: { height: 1, backgroundColor: colors.lineSoft, marginTop: 16 },
  quote: { marginTop: 20, paddingLeft: 2 },
  qmark: {
    position: 'absolute',
    left: -6,
    top: -8,
    fontFamily: fonts.serifItalic,
    fontSize: 54,
    color: colors.accent,
  },
  quoteText: {
    fontFamily: fonts.serif,
    fontSize: 23,
    lineHeight: 23 * 1.46,
    color: colors.ink,
    paddingLeft: 24,
  },
  postmark: {
    fontFamily: fonts.hand,
    fontSize: 18,
    color: colors.inkSoft,
    marginTop: 12,
    paddingLeft: 24,
    transform: [{ rotate: '-1deg' }],
  },
  cardFoot: { marginTop: 'auto', paddingTop: 20 },
  steps: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.16,
    textTransform: 'uppercase',
    color: colors.accentDeep,
    marginTop: 12,
  },
  dash: {
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.line,
    marginBottom: 16,
  },
  footGrid: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 14,
  },
  dropped: {
    fontFamily: fonts.handSemibold,
    fontSize: 17,
    color: colors.accentDeep,
  },
  byline: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 8 * 0.16,
    textTransform: 'uppercase',
    color: colors.inkFaint,
    lineHeight: 8 * 1.5,
    marginTop: 4,
  },
  stood: { alignItems: 'flex-end' },
  stoodNum: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 30 * 0.95,
    color: colors.ink,
  },
  stoodLbl: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 8 * 0.14,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  actions: { flexDirection: 'row', gap: 12 },
  reportHint: { textAlign: 'center', marginTop: 12 },
  saveBtn: {
    flex: 1,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saveBtnActive: { backgroundColor: colors.accentTint },
  saveText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14.5,
    color: colors.paperCard,
  },
  saveTextActive: { color: colors.ink },
  heartBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.accentTint,
    borderWidth: 1,
    borderColor: 'rgba(118,149,124,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBtnActive: { backgroundColor: colors.accentDeep },
  pressed: { opacity: 0.85 },
});
