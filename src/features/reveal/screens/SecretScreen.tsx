/**
 * 07 The secret — the unlocked confession on a spacious taped card, with the
 * "unlocked · here, now" pill, save and heart actions, and the replies left
 * here by other people who stood on this spot.
 *
 * The replies stay readable at this coordinate even after the secret reseals —
 * a place accruing history is the whole point of them.
 */
import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
  MapTexture,
  PaperScreen,
  Tape,
} from '../../../design-system/components';
import { BookmarkIcon, HeartIcon, PinIcon } from '../../../design-system/icons';
import { colors, fonts } from '../../../design-system/tokens';
import { useDropsStore } from '../../../store/dropsStore';
import { ReplyStrips } from '../components';
import { useSave, useHeart, useReport, useReplies, useCreateReply } from '../hooks';

type Props = NativeStackScreenProps<RootStackParamList, 'Secret'>;

export function SecretScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { secretId } = route.params;
  const secret = useDropsStore(s => s.drops.find(d => d.id === secretId));

  const save = useSave(secretId);
  const heart = useHeart(secretId);
  const { report, reported } = useReport(secretId);

  const replies = useReplies(secretId);
  const compose = useCreateReply(secretId);

  return (
    <PaperScreen>
      <MapTexture dense blur />
      <View
        style={[styles.view, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.topbar}>
          <View style={styles.unlockedPill}>
            <View style={styles.frag}>
              <View style={[styles.fragHalf, styles.fragL]} />
              <View style={[styles.fragHalf, styles.fragR]} />
            </View>
            <Text style={styles.unlockedText}>unlocked · here, now</Text>
          </View>
          <CloseX onPress={() => navigation.goBack()} style={styles.close} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollBody}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <Pressable
          onLongPress={() => {
            if (reported) return;
            Alert.alert('Report this secret?', 'It will be reviewed and may be removed.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Report', style: 'destructive', onPress: () => report('inappropriate') },
            ]);
          }}
          style={styles.card}
        >
          <Tape width={74} height={22} rotate={-2.5} style={styles.tape} />
          <View style={styles.cardHead}>
            <View>
              <View style={styles.placeMeta}>
                <PinIcon size={11} strokeWidth={1.5} />
                <Text style={styles.placeMetaText}>
                  {secret ? _coordLabel(secret.drop.coordinate) : ''}
                </Text>
              </View>
              <Text style={styles.placeName}>{secret?.drop.placeLabel ?? 'Here'}</Text>
            </View>
            <EmotionTag label={secret?.mood ?? 'ache'} />
          </View>
          <View style={styles.cardRule} />

          <View style={styles.quote}>
            <Text style={styles.qmark}>"</Text>
            <Text style={styles.quoteText}>
              {secret?.body ?? ''}
            </Text>
          </View>

          <View style={styles.cardFoot}>
            <View style={styles.dash} />
            <View style={styles.footGrid}>
              <View>
                <Text style={styles.dropped}>— {secret ? _yearsAgo(secret.drop.createdAt) : ''}</Text>
                <Text style={styles.byline}>by someone who{'\n'}stood right here</Text>
              </View>
              <View style={styles.stood}>
                <Text style={styles.stoodNum}>{secret?.stoodHere ?? 0}</Text>
                <Text style={styles.stoodLbl}>have stood here too</Text>
              </View>
            </View>
          </View>
        </Pressable>

          <ReplyStrips
            replies={replies.replies}
            total={replies.total}
            isLoading={replies.isLoading}
            gated={replies.gated}
            hasError={replies.error != null}
            onRetry={replies.refetch}
            // The list only loads at all once the gate has opened, so having it
            // is the same proof that lets you write.
            canCompose={!replies.gated && !replies.isLoading && replies.error == null}
            alreadyReplied={replies.replies.some(r => r.mine)}
            // Both rejections are already surfaced through compose.error, so
            // the catches exist only to keep the promise from going unhandled.
            onSubmit={body => {
              compose.submit(body).catch(() => {});
            }}
            onDelete={replyId => {
              compose.remove(replyId).catch(() => {});
            }}
            isSubmitting={compose.isPending}
            submitError={compose.error?.message ?? null}
          />
        </ScrollView>

        <View style={styles.actions}>
          <Pressable
            onPress={save.toggle}
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
            <Text style={[styles.saveText, save.saved && styles.saveTextActive]}>
              {save.saved ? 'Saved' : 'Save to collection'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="I feel this"
            onPress={heart.toggle}
            disabled={heart.isPending}
            style={({ pressed }) => [
              styles.heartBtn,
              heart.hearted && styles.heartBtnActive,
              pressed && styles.pressed,
            ]}
          >
            <HeartIcon size={21} color={heart.hearted ? colors.accentDeep : colors.ink} />
          </Pressable>
        </View>
        </KeyboardAvoidingView>
      </View>
    </PaperScreen>
  );
}

function _coordLabel(c: { lat: number; lng: number }): string {
  const fmt = (n: number, pos: string, neg: string) =>
    `${Math.abs(n).toFixed(4)}° ${n >= 0 ? pos : neg}`;
  return `${fmt(c.lat, 'N', 'S')} · ${fmt(c.lng, 'E', 'W')}`;
}

function _yearsAgo(ms: number): string {
  const years = Math.round((Date.now() - ms) / (365.25 * 24 * 3600 * 1000));
  if (years < 1) return 'just now';
  return `dropped ${years} year${years === 1 ? '' : 's'} ago`;
}

const styles = StyleSheet.create({
  view: { flex: 1, paddingHorizontal: 22, zIndex: 10 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
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
  flex: { flex: 1 },
  // The card used to fill the screen. With replies below it, the card sizes to
  // its content and the pair scroll together; minHeight keeps a short secret
  // from collapsing into a cramped slip.
  scrollBody: { flexGrow: 1, paddingBottom: 4 },
  card: {
    minHeight: 320,
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
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
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
  cardFoot: { marginTop: 'auto', paddingTop: 20 },
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
  dropped: { fontFamily: fonts.handSemibold, fontSize: 17, color: colors.accentDeep },
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
  stoodNum: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 30 * 0.95, color: colors.ink },
  stoodLbl: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 8 * 0.14,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 18 },
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
  saveText: { fontFamily: fonts.sansMedium, fontSize: 14.5, color: colors.paperCard },
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
